import { config } from "dotenv";
config({ path: "../../.env" });
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { worlds, user } from "./schema.js";
import { eq } from "drizzle-orm";
import type { WorldDefinition } from "@yumina/engine";
import { NIAH_WORLD_DEFINITION } from "./niah-world.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

const DEMO_WORLD_DEFINITION: WorldDefinition = {
  id: "demo-tavern",
  version: "5.0.0",
  name: "The Tavern",
  description:
    "A cozy fantasy tavern where adventurers gather. Chat with the tavern keeper, manage your resources, and see how your reputation grows.",
  author: "Yumina",
  entries: [
    {
      id: "system-prompt",
      name: "System Prompt",
      content:
        "This is a fantasy RPG set in a medieval tavern. The player is an adventurer visiting The Golden Tankard tavern.",
      role: "system",
      position: "top",

      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 100,
      enabled: true,
    },
    {
      id: "tavern-keeper",
      name: "Mira the Tavern Keeper",
      content: `You are Mira, the tavern keeper of The Golden Tankard in Elderbrook village. You are warm, witty, and perceptive. A warm, middle-aged woman with kind eyes and a sharp wit. She runs The Golden Tankard, the most popular tavern in the village of Elderbrook. She knows everyone's secrets and has a tale for every occasion. You serve drinks, share gossip, and occasionally offer quests to adventurers.

The player currently has {{health}} health, {{gold}} gold, and {{reputation}} reputation.

Guidelines:
- Stay in character as Mira at all times
- Reference the player's stats naturally in conversation (e.g., "You look a bit pale" if health is low)
- Offer to sell food/drinks that cost gold
- Reward good deeds with reputation
- Use state change directives when appropriate: [gold: -5] for purchases, [reputation: +10] for good deeds, etc.
- Keep responses to 2-3 paragraphs
- Be descriptive and immersive`,
      role: "character",
      position: "character",

      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 90,
      enabled: true,
    },
    {
      id: "elderbrook-basics",
      name: "Elderbrook Village",
      content:
        "Elderbrook is a small village nestled at the edge of the Whispering Woods. It has about 200 residents, mostly farmers and craftspeople. The village has a blacksmith, a general store, a small temple to the harvest goddess, and The Golden Tankard tavern. The village elder is a retired adventurer named Theron.",
      role: "lore",
      position: "after_char",

      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 0,
      enabled: true,
    },
    {
      id: "tavern-lore",
      name: "The Golden Tankard",
      content:
        "The Golden Tankard was founded 50 years ago by Mira's grandmother, Old Bess. The tavern sits at the crossroads of the King's Road and the Forest Path, making it a natural gathering point for travelers. Its famous specialty is Bess's Honeymead, brewed from a secret recipe. The cellar is rumored to connect to old mine tunnels beneath Elderbrook.",
      role: "lore",
      position: "after_char",

      alwaysSend: false,
      keywords: ["tavern", "tankard", "golden", "inn", "bess"],
      conditions: [],
      conditionLogic: "all",
      priority: 5,
      enabled: true,
    },
    {
      id: "missing-merchant",
      name: "The Missing Merchant",
      content:
        "A wealthy merchant named Aldric has gone missing on the Forest Path three days ago. His wife has posted a reward of 100 gold for information. Mira knows that Aldric was carrying a mysterious locked chest, and she's seen suspicious hooded figures asking about him. She will share this information if the player's reputation is high enough.",
      role: "plot",
      position: "after_char",

      alwaysSend: false,
      keywords: ["merchant", "aldric", "missing", "reward", "forest"],
      conditions: [
        { variableId: "reputation", operator: "gte" as const, value: 20 },
      ],
      conditionLogic: "all",
      priority: 10,
      enabled: true,
    },
    {
      id: "greeting",
      name: "Greeting",
      content: `*The heavy oak door creaks as you push it open, letting in a gust of cold evening air. The warm glow of the hearth washes over you as you step into The Golden Tankard.*

A stout woman with auburn hair tied back in a braid looks up from behind the bar, her face breaking into a welcoming smile.

"Well now, another traveler seeking warmth on this chilly night! Come in, come in — find yourself a seat by the fire. I'm Mira, and this is my tavern."

*She reaches for a tankard, polishing it with a cloth.*

"What'll it be, friend? A warm meal? A cold ale? Or perhaps... you're looking for something more than just refreshment?"`,
      role: "greeting",
      position: "greeting",

      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 0,
      enabled: true,
    },
  ],
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
      conditions: [
        { variableId: "reputation", operator: "gte", value: 50 },
      ],
      conditionLogic: "all",
      effects: [],
      priority: 5,
    },
  ],
  audioTracks: [],
  customComponents: [],
  displayTransforms: [],
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
    maxTokens: 12000,
    maxContext: 200000,
    temperature: 1.0,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    playerName: "User",
    structuredOutput: false,
    lorebookScanDepth: 2,
  },
};

// ── Immersive Demo: Dungeon Delver ──────────────────────────────────

const DUNGEON_DELVER_TSX = [
  'const { Heart, Flame, Coins, Package, Droplets, Key, Sun, Send, AlertTriangle, Sword, Shield, ChevronRight } = Icons;',
  '',
  'function StatBar({ icon, label, value, max, color }) {',
  '  return (',
  '    <div className="flex items-center gap-2">',
  '      {icon}',
  '      <div className="flex-1">',
  '        <div className="flex justify-between text-xs mb-0.5">',
  '          <span className="text-zinc-400">{label}</span>',
  '          <span className="text-zinc-300 font-mono">{value + "/" + max}</span>',
  '        </div>',
  '        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">',
  '          <div',
  '            className={"h-full rounded-full transition-all duration-500 " + color}',
  '            style={{ width: Math.min(100, (value / max) * 100) + "%" }}',
  '          />',
  '        </div>',
  '      </div>',
  '    </div>',
  '  );',
  '}',
  '',
  'function InventoryItem({ icon, label, count, onClick, hint }) {',
  '  var disabled = count <= 0;',
  '  return (',
  '    <button',
  '      onClick={disabled ? undefined : onClick}',
  '      className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all select-none "',
  '        + (disabled',
  '          ? "border-zinc-800/60 bg-zinc-900/30 opacity-30 cursor-not-allowed"',
  '          : "border-zinc-700/80 bg-zinc-800/40 hover:bg-zinc-700/50 hover:border-zinc-500/60 cursor-pointer active:scale-95")}',
  '      title={hint}',
  '    >',
  '      <div className="relative">',
  '        {icon}',
  '        {count > 0 && (',
  '          <span className="absolute -top-1.5 -right-2.5 text-[10px] font-bold text-zinc-200 bg-zinc-600 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">',
  '            {count}',
  '          </span>',
  '        )}',
  '      </div>',
  '      <span className="text-[11px] text-zinc-400 font-medium">{label}</span>',
  '    </button>',
  '  );',
  '}',
  '',
  'function ActionButton({ icon, label, onClick, variant }) {',
  '  var base = "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ";',
  '  var styles = variant === "primary"',
  '    ? "bg-indigo-600/80 hover:bg-indigo-500/80 text-indigo-100 border border-indigo-500/40"',
  '    : "bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 border border-zinc-700/60";',
  '  return (',
  '    <button onClick={onClick} className={base + styles}>',
  '      {icon}',
  '      <span>{label}</span>',
  '    </button>',
  '  );',
  '}',
  '',
  'function MyComponent() {',
  '  var { variables, sendMessage, setVariable } = useYumina();',
  '  var ref = React.useState("");',
  '  var message = ref[0];',
  '  var setMessage = ref[1];',
  '',
  '  var health = Number(variables.health) || 0;',
  '  var maxHp = 100;',
  '  var energy = Number(variables.energy) || 0;',
  '  var maxEn = 100;',
  '  var gold = Number(variables.gold) || 0;',
  '  var apples = Number(variables.apples) || 0;',
  '  var potions = Number(variables.potions) || 0;',
  '  var keys = Number(variables.keys) || 0;',
  '  var torches = Number(variables.torches) || 0;',
  '',
  '  function eatApple() {',
  '    if (apples <= 0) return;',
  '    setVariable("apples", apples - 1);',
  '    setVariable("health", Math.min(maxHp, health + 15));',
  '    sendMessage("*bites into a crisp apple, recovering some health*");',
  '  }',
  '',
  '  function drinkPotion() {',
  '    if (potions <= 0) return;',
  '    setVariable("potions", potions - 1);',
  '    setVariable("health", Math.min(maxHp, health + 40));',
  '    setVariable("energy", Math.min(maxEn, energy + 25));',
  '    sendMessage("*uncorks a healing potion and drinks deeply \u2014 warmth floods through every vein*");',
  '  }',
  '',
  '  function lightTorch() {',
  '    if (torches <= 0) return;',
  '    setVariable("torches", torches - 1);',
  '    sendMessage("*strikes a torch against the stone wall \u2014 flickering light pushes back the darkness*");',
  '  }',
  '',
  '  function useKey() {',
  '    if (keys <= 0) return;',
  '    sendMessage("*examines the iron key, looking for a lock to use it on*");',
  '  }',
  '',
  '  function handleSend() {',
  '    if (!message.trim()) return;',
  '    sendMessage(message.trim());',
  '    setMessage("");',
  '  }',
  '',
  '  function handleKeyDown(e) {',
  '    if (e.key === "Enter" && !e.shiftKey) {',
  '      e.preventDefault();',
  '      handleSend();',
  '    }',
  '  }',
  '',
  '  return (',
  '    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">',
  '      {/* Stats header */}',
  '      <div className="shrink-0 p-4 pb-3 border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/80 to-zinc-950">',
  '        <div className="flex items-center justify-between mb-3">',
  '          <div className="flex items-center gap-2">',
  '            <Sword className="w-4 h-4 text-indigo-400" />',
  '            <h1 className="text-sm font-semibold tracking-wide text-zinc-200">Dungeon Delver</h1>',
  '          </div>',
  '          <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/30 rounded-full px-2.5 py-1">',
  '            <Coins className="w-3.5 h-3.5 text-amber-400" />',
  '            <span className="text-xs font-mono font-bold text-amber-300">{gold}</span>',
  '          </div>',
  '        </div>',
  '        <div className="space-y-2">',
  '          <StatBar icon={<Heart className="w-4 h-4 text-red-400 shrink-0" />} label="Health" value={health} max={maxHp} color="bg-red-500" />',
  '          <StatBar icon={<Flame className="w-4 h-4 text-orange-400 shrink-0" />} label="Energy" value={energy} max={maxEn} color="bg-orange-500" />',
  '        </div>',
  '      </div>',
  '',
  '      {/* Scrollable content area */}',
  '      <div className="flex-1 overflow-y-auto p-4 space-y-4">',
  '        {/* Inventory */}',
  '        <div>',
  '          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2.5">Inventory</h2>',
  '          <div className="grid grid-cols-4 gap-2">',
  '            <InventoryItem',
  '              icon={<Package className="w-6 h-6 text-red-400" />}',
  '              label="Apple"',
  '              count={apples}',
  '              onClick={eatApple}',
  '              hint="Eat to restore 15 HP"',
  '            />',
  '            <InventoryItem',
  '              icon={<Droplets className="w-6 h-6 text-sky-400" />}',
  '              label="Potion"',
  '              count={potions}',
  '              onClick={drinkPotion}',
  '              hint="Drink to restore 40 HP + 25 energy"',
  '            />',
  '            <InventoryItem',
  '              icon={<Sun className="w-6 h-6 text-yellow-400" />}',
  '              label="Torch"',
  '              count={torches}',
  '              onClick={lightTorch}',
  '              hint="Light to see in the dark"',
  '            />',
  '            <InventoryItem',
  '              icon={<Key className="w-6 h-6 text-amber-300" />}',
  '              label="Key"',
  '              count={keys}',
  '              onClick={useKey}',
  '              hint="Opens locked doors"',
  '            />',
  '          </div>',
  '        </div>',
  '',
  '        {/* Quick actions */}',
  '        <div>',
  '          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2.5">Actions</h2>',
  '          <div className="flex flex-wrap gap-2">',
  '            <ActionButton',
  '              icon={<Sword className="w-4 h-4" />}',
  '              label="Search area"',
  '              onClick={function() { sendMessage("*carefully searches the surrounding area for anything useful*"); }}',
  '              variant="primary"',
  '            />',
  '            <ActionButton',
  '              icon={<Shield className="w-4 h-4" />}',
  '              label="Defend"',
  '              onClick={function() { sendMessage("*raises guard and prepares to defend against any threats*"); }}',
  '            />',
  '            <ActionButton',
  '              icon={<ChevronRight className="w-4 h-4" />}',
  '              label="Move forward"',
  '              onClick={function() { sendMessage("*presses deeper into the dungeon corridors*"); }}',
  '            />',
  '          </div>',
  '        </div>',
  '',
  '        {/* Warnings */}',
  '        {health <= 30 && (',
  '          <div className="flex items-center gap-2 text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg p-3 animate-pulse">',
  '            <AlertTriangle className="w-4 h-4 shrink-0" />',
  '            <span className="text-xs font-medium">Health critical! Eat an apple or drink a potion.</span>',
  '          </div>',
  '        )}',
  '        {energy <= 20 && (',
  '          <div className="flex items-center gap-2 text-orange-400 bg-orange-950/30 border border-orange-900/40 rounded-lg p-3">',
  '            <Flame className="w-4 h-4 shrink-0" />',
  '            <span className="text-xs font-medium">Running low on energy. Rest or drink a potion.</span>',
  '          </div>',
  '        )}',
  '      </div>',
  '',
  '      {/* Chat input */}',
  '      <div className="shrink-0 p-3 border-t border-zinc-800/80 bg-zinc-900/30">',
  '        <div className="flex gap-2">',
  '          <input',
  '            type="text"',
  '            value={message}',
  '            onChange={function(e) { setMessage(e.target.value); }}',
  '            onKeyDown={handleKeyDown}',
  '            placeholder="What do you do?"',
  '            className="flex-1 bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"',
  '          />',
  '          <button',
  '            onClick={handleSend}',
  '            className="bg-indigo-600/80 hover:bg-indigo-500/80 border border-indigo-500/40 rounded-lg px-3 py-2 text-indigo-100 transition-colors active:scale-95"',
  '          >',
  '            <Send className="w-4 h-4" />',
  '          </button>',
  '        </div>',
  '        <p className="text-[10px] text-zinc-600 mt-1.5 text-center">Press Esc to exit immersive mode</p>',
  '      </div>',
  '    </div>',
  '  );',
  '}',
  '',
  'export default MyComponent;',
].join("\n");

const DUNGEON_DELVER_DEFINITION: WorldDefinition = {
  id: "demo-dungeon-delver",
  version: "5.0.0",
  name: "Dungeon Delver",
  description:
    "An immersive dungeon-crawling experience with a full game HUD. Showcases custom components, Lucide icons, inventory management, and immersive layout mode.",
  author: "Yumina",
  entries: [
    {
      id: "system-prompt",
      name: "System Prompt",
      content: `You are the narrator of a dark fantasy dungeon-crawling adventure. The player is exploring an ancient underground labyrinth filled with traps, treasures, and lurking dangers.

Current player state: {{health}}/100 HP, {{energy}}/100 energy, {{gold}} gold.
Inventory: {{apples}} apples, {{potions}} potions, {{torches}} torches, {{keys}} keys.

Guidelines:
- Narrate in second person ("You step into...")
- Be atmospheric: describe sounds, smells, flickering torchlight, echoing footsteps
- When the player searches, occasionally reward them with items: [apples: +1], [gold: +5], [keys: +1], etc.
- Combat and traps cost health: [health: -15] and energy: [energy: -10]
- Walking costs energy: [energy: -5]
- Mention the player's physical state if health or energy is low
- Keep responses to 2-3 vivid paragraphs
- Use state change directives like [gold: +10] or [health: -20] when appropriate`,
      role: "system",
      position: "top",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 100,
      enabled: true,
    },
    {
      id: "dungeon-lore",
      name: "The Labyrinth of Echoes",
      content:
        "The Labyrinth of Echoes was built centuries ago by a mad wizard to guard a legendary artifact. Its corridors shift and change, and strange echoes carry whispers of those who perished within. The deeper levels are said to hold greater treasure but also deadlier traps. Glowing runes on the walls sometimes reveal hidden passages.",
      role: "lore",
      position: "after_char",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 50,
      enabled: true,
    },
    {
      id: "dark-corridors",
      name: "Darkness Without Torches",
      content:
        "The player has no torches. The corridors are pitch black. Describe the oppressive darkness, the player stumbling and feeling along cold stone walls. There is a much higher chance of traps and ambushes in the dark. Encourage the player to find a light source.",
      role: "lore",
      position: "after_char",
      alwaysSend: false,
      keywords: [],
      conditions: [{ variableId: "torches", operator: "lte" as const, value: 0 }],
      conditionLogic: "all",
      priority: 60,
      enabled: true,
    },
    {
      id: "locked-door",
      name: "Locked Door Encounters",
      content:
        "When the player encounters a locked door and has a key, let them use it: [keys: -1]. Behind locked doors are usually treasure rooms with gold [gold: +20] and sometimes rare items. Without a key, describe the heavy iron-bound door refusing to budge.",
      role: "lore",
      position: "after_char",
      alwaysSend: false,
      keywords: ["door", "locked", "lock", "key", "open"],
      conditions: [],
      conditionLogic: "all",
      priority: 40,
      enabled: true,
    },
    {
      id: "greeting",
      name: "Greeting",
      content: `*The iron gate groans shut behind you. There is no turning back.*

You stand at the entrance of the Labyrinth of Echoes, torch held high. The flame flickers against damp stone walls covered in ancient runes that pulse with a faint blue light. The air is cold and heavy with the scent of earth and something older — something that has been waiting.

Three passages stretch before you: the left corridor slopes downward into darkness, the center path continues straight ahead where you can hear the distant sound of dripping water, and the right passage is narrower, lined with strange carvings.

Your supplies are meager — a few apples, a single healing potion, and a pair of torches. Whatever treasure lies within this place, you'll need your wits to claim it.

*The torch crackles. Something skitters in the darkness ahead.*

What do you do?`,
      role: "greeting",
      position: "greeting",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 0,
      enabled: true,
    },
  ],
  variables: [
    { id: "health", name: "Health", type: "number", defaultValue: 80, min: 0, max: 100, description: "Your hit points" },
    { id: "energy", name: "Energy", type: "number", defaultValue: 90, min: 0, max: 100, description: "Physical stamina" },
    { id: "gold", name: "Gold", type: "number", defaultValue: 10, min: 0, description: "Gold coins found" },
    { id: "apples", name: "Apples", type: "number", defaultValue: 3, min: 0, description: "Restores 15 HP when eaten" },
    { id: "potions", name: "Potions", type: "number", defaultValue: 1, min: 0, description: "Restores 40 HP + 25 energy" },
    { id: "torches", name: "Torches", type: "number", defaultValue: 2, min: 0, description: "Light source for dark areas" },
    { id: "keys", name: "Keys", type: "number", defaultValue: 0, min: 0, description: "Opens locked doors" },
  ],
  rules: [
    {
      id: "exhaustion",
      name: "Exhaustion",
      description: "Player collapses from exhaustion when energy hits 0",
      conditions: [{ variableId: "energy", operator: "lte", value: 0 }],
      conditionLogic: "all",
      effects: [{ variableId: "health", operation: "subtract", value: 10 }],
      priority: 20,
    },
    {
      id: "death",
      name: "Death",
      description: "The adventure ends when health reaches 0",
      conditions: [{ variableId: "health", operator: "lte", value: 0 }],
      conditionLogic: "all",
      effects: [],
      priority: 100,
    },
  ],
  components: [],
  audioTracks: [],
  displayTransforms: [],
  customComponents: [
    {
      id: "dungeon-hud",
      name: "Dungeon HUD",
      tsxCode: DUNGEON_DELVER_TSX,
      description: "Full immersive game HUD with stats, inventory, actions, and chat input",
      order: 0,
      visible: true,
      updatedAt: new Date().toISOString(),
    },
  ],
  settings: {
    maxTokens: 12000,
    maxContext: 200000,
    temperature: 1.0,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    playerName: "Adventurer",
    structuredOutput: false,
    lorebookScanDepth: 2,
    fullScreenComponent: true,
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

  // Seed Dungeon Delver (immersive demo)
  const existingDungeon = await db
    .select()
    .from(worlds)
    .where(eq(worlds.name, "Dungeon Delver"));

  if (existingDungeon.length > 0) {
    console.log("Demo world 'Dungeon Delver' already exists. Updating...");
    await db
      .update(worlds)
      .set({
        schema: DUNGEON_DELVER_DEFINITION as unknown as Record<string, unknown>,
        description: DUNGEON_DELVER_DEFINITION.description,
        isPublished: true,
        updatedAt: new Date(),
      })
      .where(eq(worlds.id, existingDungeon[0]!.id));
    console.log("Demo world 'Dungeon Delver' updated.");
  } else {
    await db.insert(worlds).values({
      creatorId: systemUserId,
      name: DUNGEON_DELVER_DEFINITION.name,
      description: DUNGEON_DELVER_DEFINITION.description,
      schema: DUNGEON_DELVER_DEFINITION as unknown as Record<string, unknown>,
      isPublished: true,
    });
    console.log("Demo world 'Dungeon Delver' created.");
  }

  // Seed NIAH: No, I'm Not a Human
  const existingNiah = await db
    .select()
    .from(worlds)
    .where(eq(worlds.name, "No, I'm Not a Human"));

  if (existingNiah.length > 0) {
    console.log("Demo world 'No, I'm Not a Human' already exists. Updating...");
    await db
      .update(worlds)
      .set({
        schema: NIAH_WORLD_DEFINITION as unknown as Record<string, unknown>,
        description: NIAH_WORLD_DEFINITION.description,
        isPublished: true,
        updatedAt: new Date(),
      })
      .where(eq(worlds.id, existingNiah[0]!.id));
    console.log("Demo world 'No, I'm Not a Human' updated.");
  } else {
    await db.insert(worlds).values({
      creatorId: systemUserId,
      name: NIAH_WORLD_DEFINITION.name,
      description: NIAH_WORLD_DEFINITION.description,
      schema: NIAH_WORLD_DEFINITION as unknown as Record<string, unknown>,
      isPublished: true,
    });
    console.log("Demo world 'No, I'm Not a Human' created.");
  }

  await pool.end();
  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
