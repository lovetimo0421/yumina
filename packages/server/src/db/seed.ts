import { config } from "dotenv";
config({ path: "../../.env" });
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { worlds, user } from "./schema.js";
import { eq } from "drizzle-orm";
import type { WorldDefinition } from "@yumina/engine";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

const DEMO_WORLD_DEFINITION: WorldDefinition = {
  id: "demo-tavern",
  version: "1.0.0",
  name: "The Tavern",
  description:
    "A cozy fantasy tavern where adventurers gather. Chat with the tavern keeper, manage your resources, and see how your reputation grows.",
  author: "Yumina",
  variables: [
    {
      id: "health",
      name: "Health",
      type: "number",
      defaultValue: 100,
      description: "Your current health points",
      min: 0,
      max: 100,
    },
    {
      id: "gold",
      name: "Gold",
      type: "number",
      defaultValue: 50,
      description: "Gold coins in your purse",
      min: 0,
    },
    {
      id: "reputation",
      name: "Reputation",
      type: "number",
      defaultValue: 0,
      description: "Your standing with the locals",
      min: -100,
      max: 100,
    },
  ],
  rules: [
    {
      id: "low-health-warning",
      name: "Low Health Warning",
      description: "Warn when health drops below 30",
      conditions: [{ variableId: "health", operator: "lt", value: 30 }],
      conditionLogic: "all",
      effects: [],
      priority: 10,
    },
    {
      id: "high-reputation",
      name: "High Reputation Unlock",
      description: "Unlock special dialogue at high reputation",
      conditions: [{ variableId: "reputation", operator: "gte", value: 50 }],
      conditionLogic: "all",
      effects: [],
      priority: 5,
    },
  ],
  characters: [
    {
      id: "tavern-keeper",
      name: "Mira the Tavern Keeper",
      description:
        "A warm, middle-aged woman with kind eyes and a sharp wit. She runs The Golden Tankard, the most popular tavern in the village of Elderbrook. She knows everyone's secrets and has a tale for every occasion.",
      systemPrompt: `You are Mira, the tavern keeper of The Golden Tankard in Elderbrook village. You are warm, witty, and perceptive. You serve drinks, share gossip, and occasionally offer quests to adventurers.

The player currently has {{health}} health, {{gold}} gold, and {{reputation}} reputation.

Guidelines:
- Stay in character as Mira at all times
- Reference the player's stats naturally in conversation (e.g., "You look a bit pale" if health is low)
- Offer to sell food/drinks that cost gold
- Reward good deeds with reputation
- Use state change directives when appropriate: [gold: -5] for purchases, [reputation: +10] for good deeds, etc.
- Keep responses to 2-3 paragraphs
- Be descriptive and immersive`,
      avatar: undefined,
      variables: [],
    },
  ],
  components: [
    {
      id: "health-bar",
      type: "stat-bar",
      name: "Health",
      order: 0,
      visible: true,
      config: {
        variableId: "health",
        color: "hsl(0, 72%, 51%)",
        showValue: true,
        showLabel: true,
      },
    },
    {
      id: "gold-bar",
      type: "stat-bar",
      name: "Gold",
      order: 1,
      visible: true,
      config: {
        variableId: "gold",
        color: "hsl(45, 93%, 47%)",
        showValue: true,
        showLabel: true,
      },
    },
    {
      id: "reputation-display",
      type: "text-display",
      name: "Reputation",
      order: 2,
      visible: true,
      config: {
        variableId: "reputation",
        format: "Reputation: {{value}}",
        fontSize: "sm",
      },
    },
  ],
  settings: {
    maxTokens: 2048,
    temperature: 0.8,
    systemPrompt:
      "This is a fantasy RPG set in a medieval tavern. The player is an adventurer visiting The Golden Tankard tavern.",
    greeting: `*The heavy oak door creaks as you push it open, letting in a gust of cold evening air. The warm glow of the hearth washes over you as you step into The Golden Tankard.*

A stout woman with auburn hair tied back in a braid looks up from behind the bar, her face breaking into a welcoming smile.

"Well now, another traveler seeking warmth on this chilly night! Come in, come in — find yourself a seat by the fire. I'm Mira, and this is my tavern."

*She reaches for a tankard, polishing it with a cloth.*

"What'll it be, friend? A warm meal? A cold ale? Or perhaps... you're looking for something more than just refreshment?"`,
  },
};

async function seed() {
  console.log("Seeding database...");

  // Create a system user for demo content if it doesn't exist
  const existingUsers = await db
    .select()
    .from(user)
    .where(eq(user.email, "system@yumina.app"));

  let systemUserId: string;

  if (existingUsers.length === 0) {
    // We'll use a placeholder - in production, the demo world would be created by admin
    // For now, we'll check if any user exists and use the first one
    const anyUser = await db.select().from(user).limit(1);
    if (anyUser.length === 0) {
      console.log(
        "No users found. Please register a user first, then run seed again."
      );
      await pool.end();
      return;
    }
    systemUserId = anyUser[0]!.id;
  } else {
    systemUserId = existingUsers[0]!.id;
  }

  // Check if demo world already exists
  const existing = await db
    .select()
    .from(worlds)
    .where(eq(worlds.name, "The Tavern"));

  if (existing.length > 0) {
    console.log("Demo world 'The Tavern' already exists. Updating...");
    await db
      .update(worlds)
      .set({
        schema: DEMO_WORLD_DEFINITION as unknown as Record<string, unknown>,
        description: DEMO_WORLD_DEFINITION.description,
        isPublished: true,
        updatedAt: new Date(),
      })
      .where(eq(worlds.id, existing[0]!.id));
    console.log("Demo world updated.");
  } else {
    await db.insert(worlds).values({
      creatorId: systemUserId,
      name: DEMO_WORLD_DEFINITION.name,
      description: DEMO_WORLD_DEFINITION.description,
      schema: DEMO_WORLD_DEFINITION as unknown as Record<string, unknown>,
      isPublished: true,
    });
    console.log("Demo world 'The Tavern' created.");
  }

  await pool.end();
  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
