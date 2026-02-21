# Yumina — Project Vision

## 1. What Yumina Is

Yumina is the next generation of AI interactive fiction / roleplay platforms. It replaces the fragile SillyTavern + JS-Slash-Runner + ST-Prompt-Template stack with a unified platform where:
- **Players** discover and play interactive AI worlds with reactive game UI (stat bars, inventories, maps, dialogue choices) alongside chat
- **Creators** build worlds visually — no Node.js, no Git, no regex hacks, no extension coordination
- **The engine** handles all game mechanics natively — state management, rules, UI components, audio, structured AI output

## 2. The Three Products

1. **The Engine** (open-source) — Framework-agnostic TypeScript SDK for building interactive AI narrative experiences. Provides: reactive state system, prompt templates, rules engine, response parser, audio system, component library, LLM client adapters. Community can extend it.

2. **The App** (offline + hosted) — Two versions from one codebase:
   - **Offline**: Desktop app (Tauri), BYOK (bring your own key), no server needed, all data local
   - **Hosted**: Web app with accounts, cloud save, credit-based API, content hub
   - Both run the same engine. A world works identically in both.

3. **The Content Hub** (hosted only, future) — Social discovery platform for worlds. Feed, trending, follow creators, comments, ratings. NOT a marketplace — content is free. Credits are for AI usage, not buying content.

## 3. What We're Replacing

### SillyTavern (base app)
- Node.js + Express backend, vanilla JS + jQuery frontend
- Characters as PNG files with embedded JSON metadata (TavernAI V2/V3 spec)
- Event-driven extension system (CHAT_CHANGED, MESSAGE_RECEIVED events)
- Prompt assembly: context → World Info → PromptManager token budgeting → extension interception → API conversion
- JSONL chat storage, per-user filesystem isolation
- No game mechanics natively — relies entirely on extensions

### JS-Slash-Runner (game engine extension)
- iframe sandbox for executing arbitrary JavaScript
- postMessage bridge for communication with parent SillyTavern
- Variable management (character, global, temporary scopes)
- Can render HTML/CSS/JS interfaces embedded in chat messages
- Event listening system, slash command triggers
- Socket.io for external connectivity (websocket rendering like Shelter card)
- Security via sandbox attributes + origin verification

### ST-Prompt-Template (prompt templating)
- EJS syntax (`<% %>`, `<%- %>`) embedded in prompts, character cards, World Info
- Variable scopes: global, chat-local, message-specific
- Can read/write persistent state, getvar/setvar API
- Processes templates BEFORE sending to LLM and AFTER receiving responses
- Enables conditional prompt assembly based on game state

### MVU Zod StatusMenuBuilder (UI builder)
- Drag-and-drop visual builder for status menus
- MVU (Model-View-Update) pattern with persistent JSON state
- Zod schemas for runtime validation + teaching AI output format
- JSONPatch auto-generation for instructing AI on stat mutations
- Depends on BOTH Tavern Helper AND ST-Prompt-Template

### The Pain Today (creator workflow)
1. Install Node.js, pnpm, Git, Cursor/VSCode
2. Clone template repo, configure symlinks
3. Learn two extension APIs + EJS syntax
4. Write characters/world/variables manually (or external AI + copy-paste)
5. Write HTML/CSS/JS for status bars, choices, styling
6. Configure ZOD/MVU scripts, import external bundles via jsdelivr
7. Create world info entries with specific "lamp" configurations
8. Wire world info → regex replacements → frontend rendering
9. Debug across three uncoordinated systems
10. Host on GitHub, share via jsdelivr links

### Our Target (creator workflow)
1. Open world in Simple Editor for quick tweaks, or click "Enter Studio" for full creator studio
2. In Studio: describe what you want to the AI chat, or click canvas elements to modify them
3. AI generates characters, entries, components, rules from natural language
4. Drag components from community library onto canvas, or let AI vibe-code custom ones
5. Click any element on canvas → ask AI to modify it, or view/edit the code directly
6. Panels (Lorebook, Variables, Rules, Audio) dock anywhere — fully customizable layout
7. Play-test instantly within the studio
8. Publish to content hub

## 4. BetterTavern Fork (UI reference)

The `BetterTavern/` folder is our UI/UX reference — a production SillyTavern fork deployed on Railway. Key design decisions we adopted:
- **Vertical sidebar** (260px, collapsible to 60px) instead of horizontal top nav
- **70% chat-centric layout** with side panels overlaying blank space
- **Dark theme** with blur/glass effects (SmartTheme variables, warm orange accent #E18A24)
- **iMessage-style** user messages right-aligned
- **Modal-based editors** for character profiles, settings
- **Simplified message actions** (copy, edit, regenerate, revert — 4 only)
- **Model selector** in the reply bar
- **Responsive**: desktop full sidebar, tablet narrower, phone slide-out overlay
- **~4000+ lines** of custom CSS overrides over base SillyTavern
- Preloaded character cards (Shelter, DND, Chinese IP cards)
- YuminaDefault preset for OpenAI

## 5. What Yumina Has Built (Phases 1-5)

| Layer | What Exists | Status |
|-------|------------|--------|
| **Engine** | GameStateManager (reactive state, 6 effect ops, observer pattern, snapshot/restore, metadata get/set), RulesEngine (priority-based, AND/OR, 7 operators, returns effects + audioEffects), PromptBuilder (system prompt + history + greeting with `{{var}}` interpolation + structured output mode + audio track instructions), ResponseParser (regex `[var: op value]` + `[audio: trackId action]`), StructuredResponseParser (JSON mode with `{ narrative, stateChanges, choices, audioTriggers }`), Component system (6 types: stat-bar, text-display, choice-list, image-panel, inventory-grid, toggle-switch), resolveComponents() pure resolver, Audio types (AudioTrack, AudioEffect) + schemas | Core complete |
| **Server** | Hono + Drizzle/PostgreSQL + Better Auth. Full CRUD for worlds, sessions, messages. SSE streaming with audio effects in done events. Swipe support. Model caching (5-min TTL, curated + all, multi-provider aggregation). Encrypted API keys. Multi-provider LLM (OpenRouter, Anthropic, OpenAI, Ollama) with provider factory and model ID prefix routing. JSON `response_format` passthrough. Structured output parsing with regex fallback. | Core complete |
| **App** | React 19 + Vite 6 + Tailwind 4 + shadcn/ui + TanStack Router + Zustand. Auth (login/register). Chat (streaming, swipes, GamePanel with 6 component renderers, choice buttons, AudioControls). World editor (8 sections: overview, characters, variables, components, audio, rules, settings, preview). Model browser (search, filters, recently used). World browser (create, edit, play). Multi-provider API key settings. Audio playback store (fade in/out, crossfade, mute, session resume). | Core complete |
| **Shared** | Types (World, User, API), Zod validation schemas, constants (LLM_PROVIDERS, AUDIO_TRACK_TYPES) | Minimal |

## 6. Critical Gaps (What's NOT Built)

### Tier 1 — Core Platform Gaps (blocks the product vision)
- ~~**Component Library**~~: DONE (Phase 4)
- ~~**Structured Output / Function Calling**~~: DONE (Phase 4)
- ~~**In-Chat Reactive UI**~~: DONE (Phase 4)
- ~~**Audio System**~~: DONE (Phase 5)
- ~~**Multi-Provider LLM**~~: DONE (Phase 5)
- **Creator Studio**: No visual editor, no AI-powered creation, no vibe-coding components
- **Lorebook / Entries System**: No World Info entries, no keyword/state-based context injection
- **Multiple Gameplay Templates**: No templates for single character chat vs. open world vs. dungeon/linear

### Tier 2 — Creator Experience Gaps
- **AI-Assisted Creation**: No AI helpers for generating characters, worlds, variables, rules from natural language (deferred until studio UX is finalized)
- **Visual Rule Builder**: Rules section is form-based, not visual/node-based
- **Character Card Import**: No import of standard TavernAI V2 PNG cards
- **Token Counter**: No real-time token budget display
- **Image/Asset Upload**: Thumbnail and avatar are URL-only, no file upload
- **Undo/Redo**: No undo stack in editor

### Tier 3 — Platform & Distribution Gaps
- **Desktop App**: No Tauri wrapper for offline mode
- **Content Hub**: No discovery, trending, ratings, comments, creator profiles
- **Component Marketplace**: No sharing/importing community components
- **Usage Tracking**: No token/cost tracking per user or session
- **World Export/Import**: No JSON/file-based world sharing
- **Smart Memory / RAG**: No vector search or intelligent context retrieval for entries

### Tier 4 — Polish & Production Gaps
- **Error Handling**: Silent `catch {}` everywhere — no user feedback on failures
- **Toast/Notification System**: No feedback mechanism
- **Chat Export**: No conversation export (markdown/JSON)
- **Session Management**: No search, archive, favorites in sidebar
- **Home Dashboard**: Placeholder cards, no real stats or quick actions

## 7. Recommended Phase Roadmap

### Phase 4: Component System + Reactive Game UI ✅
COMPLETED. 6 typed components (stat-bar, text-display, choice-list, image-panel, inventory-grid, toggle-switch), discriminated unions + Zod schemas, resolveComponents() pure resolver, GamePanel replaces StatePanel, editor "Components" section, structured output (JSON mode) with regex fallback, choice system, demo world updated.

### Phase 5: Audio System + Multi-Provider LLM ✅
COMPLETED. Direct Anthropic, OpenAI, Ollama providers alongside OpenRouter. Provider factory with model ID prefix routing. Audio system with engine types (AudioTrack, AudioEffect), server pipeline (SSE done events), browser playback (Zustand store, HTMLAudioElement, fade in/out), editor Audio section, rules audio effects. Provider selection UI with per-provider verification.

### Phase 6: Creator Studio — Visual World Editor

**AI-assisted creation wizards (auto-generate characters, worlds, rules) are DEFERRED until the studio UX is finalized. Component library/marketplace and node graph are also deferred.**

#### 6.1 Design Philosophy

The Creator Studio is Yumina's defining feature — an AI-first visual world editor inspired by game engines (Unity/Unreal) and AI design tools (FigmaMake/Lovart). The AI is the primary creation tool; the canvas is the live viewport.

Two distinct editing experiences coexist:
- **Simple Editor** (in-app) — The current form-based editor, kept as-is or simplified further. For quick tweaks, basic setup. Lives at the existing `/app/editor/:id` route.
- **Creator Studio** (separate mode) — Full visual engine entered via "Enter Studio" button from the simple editor. A completely different experience: flexible dockable panels, live canvas, AI chat, code view. New route: `/app/studio/:id`.

#### 6.2 Studio Layout — Fully Flexible Windowing

No fixed panels. Everything is dockable, draggable, resizable, collapsible. Users customize their workspace like Unity's panel system.

Default layout (can be rearranged by user):
```
┌──────────────────────────────────────────────────────────────┐
│  ☰ Studio    World Name     [▶ Play] [<> Code] [💾 Save]    │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│   AI Chat    │  Tabbed Workspace                             │
│              │  ┌─[Canvas]──[Lorebook]──[Code]─────────┐    │
│  Context-    │  │                                      │    │
│  aware:      │  │  Live game preview                   │    │
│  knows what  │  │  Click elements to select            │    │
│  is selected │  │  Drag to reposition                  │    │
│  on canvas   │  │  Circle/lasso to multi-select        │    │
│              │  │                                      │    │
│  [prompt...] │  └──────────────────────────────────────┘    │
│              │                                               │
│              │  Panels dock here as tabs or split views:     │
│              │  Variables | Rules | Audio | Settings          │
└──────────────┴───────────────────────────────────────────────┘
```

Key behaviors:
- **AI Chat** (left, default) — Primary creation tool. Always accessible. Context-aware: knows what element is selected, what panel is open. Can create/modify anything: components, characters, entries, rules, variables.
- **Canvas tab** — Live WYSIWYG preview of the game as players see it. Click any element to select it (shows bounding box + floating toolbar). Drag to reposition. Circle/lasso tool for area selection. Selected element context flows to AI chat.
- **Panels as dockable tabs** — Lorebook, Variables, Rules, Audio, Settings are all dockable windows. They can: appear as tabs in the center workspace (replacing/splitting with canvas), float as separate windows, dock to any edge, or collapse to icons. Multiple can be open simultaneously.
- **Code tab** — File explorer + code editor (like FigmaMake). View/edit AI-generated component code (React TSX). Manual edits are supported for power users.
- **Play-test** — Instant play-test within the studio. Toggle between edit mode and play mode without leaving the studio.

#### 6.3 AI-Powered Component System

Components are the visual building blocks of the game UI. AI generates them from natural language.

- **AI generates React (TSX) components** from descriptions ("a medieval health bar that glows red when low")
- Components receive game state as props (`variables`, `audioTracks`, `metadata`) via a standard interface
- Components render in sandboxed containers on the canvas with error boundaries
- **Built-in typed components** (stat-bar, text-display, etc.) still work as before — they're the "starter kit"
- **Custom AI components** are a new type that stores TSX code in the world definition
- **Code view** lets creators see and hand-edit the generated TSX
- **Interaction**: click component on canvas → floating toolbar (move/delete/ask AI) + AI chat auto-focuses with context → describe modification → AI updates code → canvas re-renders live

#### 6.4 Lorebook / Entries System

Replaces SillyTavern's single-bucket World Info with a typed, visually organized entry system. Characters and entries are unified — same underlying data model, visually categorized.

- **Single "Lorebook" panel** with sub-tabs: Characters, Lore, Plot, Style, Custom
- **Character entries** = what we currently call "characters" (name, description, system prompt, avatar) but stored as lorebook entries with type "character"
- **Other entry types**: Lore (world-building facts), Plot (story beats/arcs), Style (writing instructions), Custom (freeform)
- **Trigger system**: keyword-based (when keywords appear in recent messages, entry injects into context) AND state-based (when game variable meets condition, entry activates)
- **Priority + position**: entries have priority (higher = more important when token budget is tight) and position (before/after character definition in prompt)
- On the API side, all entries are the same — context text injected into the LLM prompt. The categories are purely for creator organization.

#### 6.5 Phase 6 Scope (what we build NOW)

**In scope:**
- Studio shell (new route, flexible windowing/docking system, toolbar)
- AI Chat panel (prompt input, conversation history, context awareness)
- Canvas (live game preview, click-to-select, drag-to-move, selection tools)
- AI component generation pipeline (prompt → LLM generates TSX → compile → render on canvas)
- Code view (file explorer, code editor, manual editing)
- Lorebook system (data model, engine integration, prompt injection, editor panel with typed categories)
- Compact panel views for Variables, Rules, Audio, Settings (dockable)
- "Enter Studio" button from simple editor
- Play-test mode within studio

**Deferred to later phases:**
- Component library / marketplace (community sharing, import/export)
- Node graph for visual rule editing
- AI-assisted creation wizards (auto-generate characters, worlds, rules from high-level descriptions)
- Gameplay templates (single chat, open world, dungeon starters)
- Undo/redo system
- Circle/lasso selection tool (start with click-to-select, add lasso later)

### Phase 7 (future): Smart Memory + RAG
- RAG-based context retrieval for entries (replace naive keyword matching)
- SQLite/vector DB for efficient entry search and relevance scoring
- Better long-term memory system across sessions
- Token-aware context budgeting with entry priority

### Phase 8: Desktop App + Character Import
- Tauri wrapper for offline mode (BYOK, local data, no server)
- TavernAI V2 PNG character card import
- World export/import (JSON packages)

### Phase 9: Content Hub + Social
- World discovery (search, tags, trending, featured)
- Creator profiles, ratings, comments, follow creators
- Component marketplace (share/import community components)
- Usage tracking + credit system

### Phase 10: Polish + Production
- Toast/notification system
- Error handling audit
- Chat export
- Session management (search, archive, favorites)
- Home dashboard with real stats
- Token counter in editor
- Performance optimization (code splitting, lazy loading)

## 8. Hard Requirements

- **Engine core MUST be framework-agnostic TypeScript** — no React/Vue dependency in engine logic
- **AI never executes game logic** — state changes (inventory, health, gold, etc.) are always applied by the engine from structured data, never by AI-executed code. However, AI CAN generate UI component code (React TSX) for the visual layer — this is just rendering, not game logic.
- **Three-layer state model**: deterministic rules → structured output → optional secondary agent
- **Character card compatibility** — import standard TavernAI V2 PNG format
- **Two app versions from one codebase** — offline (Tauri) + hosted (web)
