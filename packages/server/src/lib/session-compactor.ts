import { eq, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { messages, playSessions } from "../db/schema.js";
import { createProvider, inferProvider } from "./llm/provider-factory.js";
import type { ProviderName } from "./llm/provider-factory.js";

/** Rough token estimate: 1 token ≈ 4 chars */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const COMPACTION_THRESHOLD = 0.8; // 80% of context window
const SUMMARY_MODEL = "openai/gpt-4o-mini"; // cheap, fast model for summarization
const KEEP_RECENT_MESSAGES = 10; // always keep the last N messages in full

const SUMMARIZATION_PROMPT = `You are a session summarizer for an interactive fiction game. Analyze the conversation and produce a structured summary that preserves all narratively important information.

Respond with ONLY this format:

## Timeline
(Numbered list of key events in chronological order)

## Active Plot Threads
(Bullet list of unresolved storylines, quests, or goals)

## Character Relationships
(Bullet list: character name — relationship status and key interactions)

## Important Decisions
(Bullet list of choices the player made and their consequences)

## World State Notes
(Any important facts about the current state of the world)

Be concise but preserve all information needed for narrative continuity. Do NOT include meta-commentary.`;

interface CompactionResult {
  compacted: boolean;
  summary?: string;
  messagesRemoved?: number;
}

/**
 * Check if a session needs compaction and perform it if so.
 * Call this BEFORE building the prompt for a new message.
 */
export async function compactSessionIfNeeded(
  sessionId: string,
  contextWindowTokens: number,
  apiKey: string
): Promise<CompactionResult> {
  // Load session
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(eq(playSessions.id, sessionId));

  if (sessionRows.length === 0) {
    return { compacted: false };
  }

  const session = sessionRows[0]!;

  // Load all messages
  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  if (allMessages.length <= KEEP_RECENT_MESSAGES) {
    return { compacted: false };
  }

  // Estimate total token usage (messages + existing summary)
  let totalTokens = 0;
  if (session.summary) {
    totalTokens += estimateTokens(session.summary);
  }
  for (const msg of allMessages) {
    totalTokens += estimateTokens(msg.content);
  }

  const threshold = contextWindowTokens * COMPACTION_THRESHOLD;
  if (totalTokens < threshold) {
    return { compacted: false };
  }

  // Need to compact. Messages to summarize = all except the most recent N.
  const toSummarize = allMessages.slice(0, -KEEP_RECENT_MESSAGES);

  if (toSummarize.length === 0) {
    return { compacted: false };
  }

  // Build the text to summarize
  const existingSummary = session.summary
    ? `Previous summary:\n${session.summary}\n\n---\n\nNew messages to incorporate:\n`
    : "";

  const messageText = toSummarize
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const fullText = existingSummary + messageText;

  // Call the summarization model
  try {
    const providerName = inferProvider(SUMMARY_MODEL);
    const provider = createProvider(providerName as ProviderName, apiKey);

    let summary = "";
    for await (const chunk of provider.generateStream({
      model: SUMMARY_MODEL,
      messages: [
        { role: "system", content: SUMMARIZATION_PROMPT },
        { role: "user", content: fullText },
      ],
      maxTokens: 1024,
      temperature: 0.3,
    })) {
      if (chunk.type === "text") {
        summary += chunk.content;
      }
    }

    if (!summary.trim()) {
      return { compacted: false };
    }

    // Delete the old messages from DB by ID
    for (const msg of toSummarize) {
      await db.delete(messages).where(eq(messages.id, msg.id));
    }

    // Update session with new summary
    await db
      .update(playSessions)
      .set({ summary: summary.trim(), updatedAt: new Date() })
      .where(eq(playSessions.id, sessionId));

    return {
      compacted: true,
      summary: summary.trim(),
      messagesRemoved: toSummarize.length,
    };
  } catch {
    // Summarization failed — don't compact, just continue
    return { compacted: false };
  }
}
