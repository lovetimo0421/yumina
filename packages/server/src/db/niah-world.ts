import type { WorldDefinition } from "@yumina/engine";

// ── Custom HUD Component TSX ─────────────────────────────────────────
const NIAH_HUD_TSX = [
  'const { Heart, Zap, Moon, Sun, Shield, FileText, Cat, Eye, Home, AlertTriangle, Coffee, Beer, Cigarette } = Icons;',
  '',
  'function Bar({ value, max, color, icon, label }) {',
  '  var pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;',
  '  return (',
  '    <div className="flex items-center gap-2">',
  '      {icon}',
  '      <div className="flex-1">',
  '        <div className="flex justify-between text-xs mb-0.5">',
  '          <span className="text-zinc-400">{label}</span>',
  '          <span className="text-zinc-300 font-mono">{value + "/" + max}</span>',
  '        </div>',
  '        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">',
  '          <div className={"h-full rounded-full transition-all duration-500 " + color} style={{ width: pct + "%" }} />',
  '        </div>',
  '      </div>',
  '    </div>',
  '  );',
  '}',
  '',
  'function RoomSlot({ name, occupant }) {',
  '  var empty = !occupant || occupant === "empty";',
  '  return (',
  '    <div className={"flex items-center justify-between px-2 py-1 rounded text-xs " + (empty ? "text-zinc-600" : "text-zinc-200 bg-zinc-800/60")}>',
  '      <span>{name}</span>',
  '      <span className={empty ? "text-zinc-700" : "text-emerald-400 font-medium"}>{empty ? "\\u2014" : occupant}</span>',
  '    </div>',
  '  );',
  '}',
  '',
  'function MyComponent() {',
  '  var { variables } = useYumina();',
  '  var energy = Number(variables.energy) || 0;',
  '  var energyMax = Number(variables.energy_max) || 3;',
  '  var hp = Number(variables.hp) || 3;',
  '  var day = Number(variables.day) || 1;',
  '  var phase = String(variables.phase || "night");',
  '  var armed = variables.armed === true || variables.armed === "true";',
  '  var fema = Number(variables.fema_notices) || 0;',
  '  var hasCat = variables.has_cat === true || variables.has_cat === "true";',
  '  var traits = String(variables.known_traits || "Excessively perfect teeth");',
  '',
  '  var isNight = phase === "night";',
  '',
  '  return (',
  '    <div className="flex flex-col gap-3 p-4 h-full bg-zinc-950 text-zinc-100 overflow-y-auto">',
  '      {/* Header */}',
  '      <div className="flex items-center justify-between">',
  '        <div className="flex items-center gap-2">',
  '          {isNight',
  '            ? <Moon className="w-4 h-4 text-indigo-400" />',
  '            : <Sun className="w-4 h-4 text-amber-400" />}',
  '          <span className="text-sm font-bold tracking-wide">{(isNight ? "NIGHT " : "DAY ") + day}</span>',
  '        </div>',
  '        <span className={"text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full " + (isNight ? "bg-indigo-950 text-indigo-300 border border-indigo-800/40" : "bg-amber-950 text-amber-300 border border-amber-800/40")}>{phase}</span>',
  '      </div>',
  '',
  '      {/* Stats */}',
  '      <div className="space-y-2">',
  '        <Bar icon={<Zap className="w-4 h-4 text-yellow-400 shrink-0" />} label="Energy" value={energy} max={energyMax} color="bg-yellow-500" />',
  '        <Bar icon={<Heart className="w-4 h-4 text-red-400 shrink-0" />} label="HP" value={hp} max={3} color="bg-red-500" />',
  '      </div>',
  '',
  '      {/* Status badges */}',
  '      <div className="flex flex-wrap gap-2">',
  '        <div className={"flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border " + (armed ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300" : "bg-red-950/40 border-red-800/40 text-red-400")}>',
  '          <Shield className="w-3 h-3" />',
  '          <span>{armed ? "Armed" : "Unarmed"}</span>',
  '        </div>',
  '        {fema > 0 && (',
  '          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-blue-950/40 border-blue-800/40 text-blue-300">',
  '            <FileText className="w-3 h-3" />',
  '            <span>{"FEMA: " + fema}</span>',
  '          </div>',
  '        )}',
  '        {hasCat && (',
  '          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-orange-950/40 border-orange-800/40 text-orange-300">',
  '            <Cat className="w-3 h-3" />',
  '            <span>Cat</span>',
  '          </div>',
  '        )}',
  '      </div>',
  '',
  '      {/* Visitor Traits */}',
  '      <div className="border-t border-zinc-800 pt-3">',
  '        <div className="flex items-center gap-1.5 mb-1.5">',
  '          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />',
  '          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Known Visitor Traits</span>',
  '        </div>',
  '        <p className="text-xs text-zinc-400 leading-relaxed">{traits}</p>',
  '      </div>',
  '',
  '      {/* Room Map */}',
  '      <div className="border-t border-zinc-800 pt-3">',
  '        <div className="flex items-center gap-1.5 mb-1.5">',
  '          <Home className="w-3.5 h-3.5 text-zinc-500" />',
  '          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">House Rooms</span>',
  '        </div>',
  '        <div className="grid gap-1">',
  '          <RoomSlot name="\\ud83d\\udecb\\ufe0f Living Room" occupant={String(variables.room_living || "empty")} />',
  '          <RoomSlot name="\\ud83c\\udf73 Kitchen" occupant={String(variables.room_kitchen || "empty")} />',
  '          <RoomSlot name="\\ud83d\\udecf\\ufe0f Bedroom" occupant={String(variables.room_bedroom || "empty")} />',
  '          <RoomSlot name="\\ud83d\\udebf Bathroom" occupant={String(variables.room_bathroom || "empty")} />',
  '          <RoomSlot name="\\ud83d\\udcbc Office" occupant={String(variables.room_office || "empty")} />',
  '          <RoomSlot name="\\ud83d\\udce6 Storage" occupant={String(variables.room_storage || "empty")} />',
  '        </div>',
  '      </div>',
  '    </div>',
  '  );',
  '}',
  '',
  'export default MyComponent;',
].join("\n");

// ── Initial YAML game state ──────────────────────────────────────────
const INITIAL_GAME_STATE = `night: 1
phase: night_knock
guests_inside: 0
guest_profiles: []
visitors_identified: 0
tonight_knock_index: 1
tonight_total_knocks: 3
statistics:
  indoor_humans: 0
  indoor_visitors: 0
  dead_humans: 0
  total_shot: 0
  tonight_visitor_killed: false
player:
  location: hallway
  enerjeka_stock: 1
  bober_stock: 1
  cigarette_stock: 0
  coffee_stock: 0
  cat_food_stock: 0`;

// ── Peephole image URLs from the original card ──────────────────────
const PEEP_IMAGES: Record<string, string> = {
  Sarah: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/a/ab/Cashier_gal.png/revision/latest?cb=20251102110230",
  Marcus: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/4/42/Suitguy1.png/revision/latest?cb=20251102105426",
  Elena: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/7/77/The_Nun_%28close_up%29.png/revision/latest?cb=20250916221341",
  Smith: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/4/41/Glasses_Woman.png/revision/latest?cb=20251210010343",
  Lina: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/0/0f/Noimnotahumancharacter1-full.png/revision/latest?cb=20250916013754",
  James: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/8/8f/TouristGuyCloseUp.jpg/revision/latest?cb=20251218151134",
  Rosa: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/6/67/Bpaclose.jpg/revision/latest?cb=20250921212853",
  OldManChen: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/0/01/SurgeonCloseUp.jpg/revision/latest?cb=20251109222540",
  Jake: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/8/8a/Deliveryman.jpg/revision/latest?cb=20250917005118",
  Lily: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/7/7a/Girlie.png/revision/latest?cb=20251115110420",
  Robert: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/c/cf/BeardedGuyCloseUp.jpg/revision/latest?cb=20251108072953",
  Diana: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/5/5f/Seductive_Woman_-_close_up.jpg/revision/latest?cb=20250701142420",
  Thomas: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/7/7f/Neighbour1.jpg/revision/latest?cb=20251121085108",
  FEMA: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/6/69/Fake_gasmask.png/revision/latest?cb=20241005204535",
  Timmy: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/e/ee/Raincoatchild.jpg/revision/latest?cb=20250917010908",
  PaleStranger: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/c/c0/PaleVisitor.png/revision/latest?cb=20251028135209",
  CatLady: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/7/77/The_Nun_%28close_up%29.png/revision/latest?cb=20250916221341",
  Wilson: "https://static.wikia.nocookie.net/no-i-am-not-a-human/images/6/69/Fake_gasmask.png/revision/latest?cb=20241005204535",
  Jefray: "https://github.com/Cpjjason/shabicpj/blob/main/a866527af9b530765f91c7ebc0ddaeb.jpg?raw=true",
  Who: "https://github.com/Cpjjason/shabicpj/blob/main/Weixin%20Image_20260212192604.jpg?raw=true",
};

/** Build peephole HTML for a named character. Uses actual portrait if available, falls back to generic. */
function peepholeHtml(name: string, imgUrl: string): string {
  return `<div style="text-align:center;margin:12px 0"><div style="display:inline-block;width:160px;height:160px;border-radius:50%;border:6px solid #1a1a1a;overflow:hidden;box-shadow:inset 0 0 40px rgba(0,0,0,0.9),0 0 20px rgba(0,0,0,0.5);position:relative"><img src="${imgUrl}" alt="${name}" style="width:100%;height:100%;object-fit:cover;filter:grayscale(100%) brightness(0.8) contrast(2.5) sepia(1) hue-rotate(80deg) saturate(3)" /><div style="position:absolute;inset:0;background:radial-gradient(circle,transparent 50%,rgba(0,0,0,0.95) 100%);pointer-events:none"></div><div style="position:absolute;inset:0;box-shadow:inset 0 0 60px rgba(0,255,0,0.15);pointer-events:none"></div></div><div style="margin-top:4px;font-size:10px;letter-spacing:2px;color:#4ade80;text-transform:uppercase">Peephole View</div></div>`;
}

/** Build all character-specific peephole display transforms. */
function buildPeepholeTransforms(): WorldDefinition["displayTransforms"] {
  return Object.entries(PEEP_IMAGES).map(([name, url], i) => ({
    id: `dt-peep-${name.toLowerCase()}`,
    name: `Peephole: ${name}`,
    pattern: `\\[PEEP:${name}\\]`,
    replacement: peepholeHtml(name, url),
    flags: "g",
    order: 20 + i,
    enabled: true,
  }));
}

// ── World Definition ─────────────────────────────────────────────────
export const NIAH_WORLD_DEFINITION: WorldDefinition = {
  id: "niah-visitors",
  version: "5.0.0",
  name: "No, I'm Not a Human",
  description:
    "A horror survival game. Visitors knock on your door each night — some are human, some are monsters in disguise. You have 14 nights to survive. Identify the Visitors before they get inside.",
  author: "Ported to Yumina",
  entries: [
    // ─── Entry 1: System Prompt ──────────────────────────────────────
    {
      id: "niah-system",
      name: "System Prompt",
      content: `You are the Game Master of "No, I'm not a Human" — a horror survival game set during a Visitor invasion. The player is barricaded in a single-story house for 14 nights. Each night, people knock on the front door — some are real humans seeking shelter, some are Visitors (monsters who mimic humans with uncanny precision but have subtle physiological anomalies).

The house has a Hallway connecting all rooms in a loop: 🚿 Bathroom → 🛋️ Living Room → 🛏️ Bedroom → 💼 Office → 🍳 Kitchen → 📦 Storage Room. The front door has a Peephole and chain lock.

CORE RULES:
- You control all NPCs, the environment, weather, and events
- Never break character or acknowledge this is a game
- Maintain tension and atmosphere at all times — this is horror survival
- The player has Energy per phase (resets each phase) — most actions cost 1 Energy
- The player has 3 HP — Visitors inside the house deal damage, bad decisions cost HP
- The game lasts 14 nights — surviving to Day 15 means rescue arrives
- Must exhaust all energy before sleeping (if energy > 0, prompt "I still have energy, I don't want to sleep yet")

VARIABLE UPDATE FORMAT:
After EVERY response, output state changes using this format:
[energy: subtract 1] — when the player uses energy for an action
[hp: subtract 1] — when the player takes damage
[day: set X] — when advancing to a new day/night
[phase: set "night"] or [phase: set "day"] — for phase transitions
[armed: set true/false] — when gun status changes
[fema_notices: add 1] — when a FEMA notice is found
[has_cat: set true] — when the cat is acquired
[room_living: set "Name"] or [room_living: set "empty"] — when guests move rooms
[room_kitchen: set "Name"] etc. for all 6 rooms
[known_traits: set "trait1, trait2, trait3"] — when new visitor traits are discovered
[game_state: set "..."] — update the YAML game state summary EVERY turn

IMPORTANT: You MUST output [game_state: set "..."] at the end of EVERY response to keep the game state synchronized.`,
      role: "system",
      position: "top",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 100,
      enabled: true,
    },

    // ─── Entry 2: Variable Output Format ─────────────────────────────
    {
      id: "niah-var-format",
      name: "Variable Output Format",
      content: `VARIABLE DIRECTIVE REFERENCE:
Use [variable: operation value] syntax at the end of your response.

Available directives:
[energy: subtract 1] — costs 1 energy point
[energy: set 3] — reset energy (new phase)
[energy_max: set X] — change max energy capacity
[hp: subtract 1] — player takes damage
[hp: add 1] — player heals (max 3)
[day: set X] — set current day number
[phase: set "night"] or [phase: set "day"] — phase transitions
[armed: set true] / [armed: set false] — gun status
[fema_notices: add 1] — collect FEMA notice
[fema_notices: subtract 1] — use FEMA notice
[has_cat: set true] — acquire cat
[room_living: set "Sarah"] — assign guest to living room
[room_living: set "empty"] — clear room
(same for room_kitchen, room_bedroom, room_bathroom, room_office, room_storage)
[known_traits: set "Excessively perfect teeth, eyes with dark sheen"] — update known traits list
[coffee_remaining_days: subtract 1] — decrement coffee buff timer each day
[coffee_remaining_days: set 4] — start coffee buff (4 days)
[total_smokes: add 1] — track permanent smoking penalty
[enerjeka_stock: subtract 1] — use EnerJeka drink
[bober_stock: subtract 1] — use Bober Černý beer
[cigarette_stock: add 1] — find cigarettes
[coffee_stock: add 1] — find coffee
[cat_food_stock: subtract 1] — use cat food
[game_state: set "YAML state here"] — MUST update every turn

ENERGY CAPACITY RULES:
- Base capacity: 3. Each Human let inside → base +1. Each Visitor let inside → base -1. Min 1, max 8.
- Coffee: after use, capacity temporarily +1 for 4 days
- Smoking: instantly fills energy to capacity, but permanently reduces base capacity by 1, yellows teeth
- EnerJeka energy drink: energy +1 (cannot exceed capacity)
- Bober Černý dark beer: forces energy to 0, immediately ends the day and enters sleep

Example end of response:
[energy: subtract 1]
[room_living: set "Sarah"]
[game_state: set "night: 1\\nphase: night_interaction\\nguests_inside: 1\\nguest_profiles:\\n  - name: Sarah\\n    room: living\\n    suspicion: low"]`,
      role: "system",
      position: "post_history",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 95,
      enabled: true,
    },

    // ─── Entry 3: Current State ──────────────────────────────────────
    {
      id: "niah-state",
      name: "Current State",
      content: `CURRENT GAME STATE:
Night: {{day}} | Phase: {{phase}} | Energy: {{energy}}/{{energy_max}} | HP: {{hp}}/3
Armed: {{armed}} | FEMA Notices: {{fema_notices}} | Cat: {{has_cat}}
Known Visitor Traits: {{known_traits}}

Rooms:
- 🛋️ Living Room: {{room_living}}
- 🍳 Kitchen: {{room_kitchen}}
- 🛏️ Bedroom: {{room_bedroom}}
- 🚿 Bathroom: {{room_bathroom}}
- 💼 Office: {{room_office}}
- 📦 Storage: {{room_storage}}

Full State:
{{game_state}}`,
      role: "system",
      position: "post_history",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 90,
      enabled: true,
    },

    // ─── Entry 4: Core Game Rules ────────────────────────────────────
    {
      id: "niah-rules",
      name: "Core Game Rules",
      content: `CORE GAME MECHANICS:

GAME FLOW:
Night Phase → Sleep → News Broadcast → Day Phase → Exhaust Energy → Sleep → Next Night Phase

NIGHT PHASE — People knock on your door (2-5 knockers per night, increasing with difficulty):
1. KNOCK: Describe the knock and who you see through the peephole. Output [PEEP:Name] for the peephole portrait.
2. PLAYER ACTIONS (each costs 1 Energy unless noted):
   - Open the door (let them in — FREE, no energy cost)
   - Talk through the door (ask questions — costs 1 Energy)
   - Use peephole (study them closely — costs 1 Energy)
   - Check body part (examine teeth/eyes/nails/skin/etc — costs 1 Energy)
   - Check FEMA notice (compare descriptions — costs 1 Energy)
   - Refuse entry (turn them away — FREE)
   - Shoot through door (if armed — kills them, reveals identity)
3. After the player decides, resolve the outcome.
4. When all knocks for the night are done, transition to Sleep → News → Day.

DAY PHASE — Player gets Energy actions:
- Search rooms (may find items, FEMA notices, evidence)
- Talk to guest (interrogate, observe behavior, check body parts)
- Assign rooms (move guests between the 6 rooms)
- Board up windows (costs 1 energy, improves defense)
- Kick someone out (free action — remove a suspicious guest)
- Use items (EnerJeka, Bober Černý, coffee, cigarettes, cat food)
- Use telephone (call services — costs 1 energy)
- Sleep early (skip remaining energy, recover 1 HP, advance to next night)

IDENTIFICATION SYSTEM — 7 checkable body parts (each check costs 1 Energy):
| Body Part | Visitor Sign | Hit Rate |
|-----------|-------------|----------|
| Teeth | Excessively perfect and uniform, no wear | 80% |
| Eyes | Black or red sheen in darkness/flashlight | 70% |
| Nails | Abnormally hard, slightly retractable | 65% |
| Skin | Fungal-like patterns beneath surface, waxy/cold texture | 60% |
| Armpits | Abnormal biological tissue/growths | 55% |
| Temperature | 3-5 degrees below normal human body temp | 50% |
| Tears | Cannot produce real tears when crying | 45% |
(Later traits): Tiny non-human structures inside ears, Aura distortion

SHOOTING SYSTEM:
- Shooting a Visitor: kills it, confirms identity. Other Visitors may become more cautious.
- Shooting a Human: kills an innocent. HP -1 (psychological damage). Severe story consequences.
- Gun can be lost or taken in events.

VISITOR BEHAVIOR WHEN INSIDE:
- Kill threshold: If 2+ Visitors are inside at night AND no cat protection, they coordinate and kill 1 human guest (or attack the player if no other humans).
- Single Visitor: sabotages, steals, poisons food, creates paranoia, but cannot kill alone.
- Cat prevention: If player has the cat, Visitors won't kill at night (cat senses them).

FEMA SYSTEM:
- FEMA agents visit on specific days (4, 5, 8, 10) — they knock like normal visitors.
- Real FEMA agents wear gas masks, show credentials, and may take away guests they identify as Visitors.
- FEMA Notices: physical descriptions of confirmed Visitors — very valuable investigation tools.
- Using a Notice costs 1 Energy and consumes the Notice.

PHONE SYSTEM (Office telephone — costs 1 Energy per call):
1. FEMA Hotline — report suspicious guests, request pickup
2. Emergency Services — limited help, may not come
3. Neighbor Check — ask about other survivors
4. Radio Station — get news, trait information
5. Hospital — medical advice if HP low
6. Mystery Number — ???

MEDIA SYSTEM:
- TV: Evening news broadcasts reveal new Visitor traits each night
- Radio: Background information, survivor reports, sometimes hints

VISITOR TRAIT REVELATION SCHEDULE (via news broadcasts):
- Night 1: Teeth excessively perfect and uniform
- Night 2: Eyes exhibit black or red sheen in darkness
- Night 3: Nails abnormally hard and retractable
- Night 4: Fungal-like patterns visible beneath the skin
- Night 5: Abnormal biological tissue in the armpit area
- Night 6: Abnormally low body temperature (3-5°F below normal)
- Night 7: Unable to produce real tears
- Night 8: Tiny non-human structures inside the ears
- Night 9: Aura photos display distorted silhouettes
- Night 10+: In-depth reports combining all traits

CRITICAL NIGHTS (must shelter, extra dangerous): 3, 5, 9, 11

DIFFICULTY PROGRESSION:
- Nights 1-3: 2-3 knockers, Visitors have obvious tells
- Nights 4-7: 3-4 knockers, tells become subtle, FEMA visits begin
- Nights 8-11: 3-5 knockers, Visitors actively deceive, coordinate attacks
- Nights 12-14: 4-5 knockers, Visitors are nearly perfect mimics, desperate

OUTPUT FORMAT:
- Phase headers: 🌑 **NIGHT X** or ☀️ **DAY X**
- Knock descriptions with [PEEP:Name] for peephole portraits
- Choices at the end: **Suggested Choices:** then A. B. C. D. E.
- HUD in EVERY response between --- separators: ⚡ **Energy: X/X** | ❤️ **HP: X** | 🔫 Armed | 📋 FEMA Notice: X etc.
- System notes in <sum> tags (hidden from player)
- Variable directives at the very end (hidden from player)`,
      role: "lore",
      position: "after_char",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 80,
      enabled: true,
    },

    // ─── Entry 5: NPC Database ───────────────────────────────────────
    {
      id: "niah-npcs",
      name: "NPC Database",
      content: `NPC DATABASE — Characters and their true identities. Maintain consistency throughout the game.

HUMANS (8):
1. Sarah Chen — Early 20s, convenience store cashier. Terrified, red-rimmed eyes, messy ponytail, store uniform with "Sarah" name tag. Was working when it started, saw coworker eaten. Genuine, scared, helpful. Assigned room: Living Room.
2. Marcus Webb — 40s, quiet and stoic. Wears a worn jacket. Lost his family early in the invasion. Keeps to himself, practical, distrustful but fundamentally decent. Assigned room: Storage.
3. Elena Kovac — 50s, former military/nurse. Commanding presence. Claims expertise in identifying Visitors. Actually useful — her tips are real. Assigned room: Office.
4. Smith (real name David Park) — 30s, wears glasses. Uses a fake name because she's paranoid. Nervous, intellectual. Has medical supplies. Assigned room: Bedroom.
5. Lina Torres — 20s, university student. Brave despite being young. Carries a backpack with supplies. Helpful, optimistic. Assigned room: Kitchen.
6. James Miller — 50s, tourist caught in the invasion. Friendly, tells stories. Has a camera. Observant. Assigned room: Living Room (late arrival).
7. Rosa Hernandez — 40s, mother looking for her children. Emotional but strong. Brings food supplies. Will protect others fiercely. Assigned room: Kitchen (late arrival).
8. Old Man Chen — 70s, retired surgeon. Frail but sharp-minded. Can provide medical care (+1 HP). Carries a surgical kit. Wise and calm. Assigned room: Office (late arrival).

VISITORS (7):
9. Jake Morrison — "Delivery man." 30s, friendly smile, carries a package. Too eager to get inside. Teeth are suspiciously perfect. Assigned room: Bedroom.
10. Lily — "Lost girl." Teens, appears innocent and scared. But her crying produces no real tears. Occasionally stares blankly at walls. Hums an unusual tune. Assigned room: Bathroom.
11. Robert Hayes — "Old neighbor." 60s, claims to live nearby. Bearded, friendly. But his skin feels waxy/cold on contact. Knows too much about the house layout. Assigned room: Storage.
12. Diana Cross — "Businesswoman." 30s, attractive, composed. Too calm for the situation. Eyes occasionally flash with a dark sheen. Nails are unusually hard. Assigned room: Living Room.
13. Thomas Reed — "Friendly neighbor." 40s, brings supplies and tools. Almost too helpful. Repeats phrases he's heard from other guests. Fungal patterns under skin. Assigned room: Kitchen.
14. Officer Wilson — "Police officer" or disguised as FEMA. Has a uniform/badge. But doesn't follow proper procedure. Body temperature runs cold. Assigned room: Office.
15. Little Timmy — "Lost boy." 8, in a raincoat, claims mom sent him. Pitiable but unsettling. Eyes reflect light wrong. Cannot produce tears. Carries a stuffed animal. Assigned room: Bedroom.

ADDITIONAL HUMANS (1):
16. Jefray Ding — Human. 20s, college student. Nervous but genuine. Wears a hoodie with university logo. Carries a backpack with textbooks and snacks. Speaks with slight accent. Fixed: appears Night 1 as 3rd knocker.

SPECIAL CHARACTERS (4):
17. The Pale Stranger — Not human, not a normal Visitor. Appears as an unnaturally pale figure. If let inside, does NOT harm anyone but creates intense unease. Offers cryptic but truthful information about who is a Visitor. Disappears at dawn.
18. Cat Lady (Mrs. Whiskers) — Elderly woman with a cat. She herself may be human or Visitor (GM decides). But her cat, Penny, is the key — if the player acquires the cat, Visitors cannot kill at night.
19. FEMA Agents (Brooks/Chen/Davis) — Real government agents. Wear gas masks. Visit on Days 4, 5, 8, 10. May take away identified Visitors. Can provide FEMA Notices.
20. Who (???) — Mysterious entity. Neither human nor Visitor. Appears on fixed nights (3, 5, 8). Leaves supplies at the door: Night 3 = coffee, Night 5 = EnerJeka, Night 8 = camera (enables Aura Photo checks). Does not enter the house. Vanishes if the player opens the door.

VISIT SCHEDULE GUIDE (GM should adapt as needed):
- Night 1: Sarah (H), Jefray Ding (H), then Jake (V) — ease player in
- Night 2: Marcus (H), Lily (V) — child Visitor to test sympathy
- Night 3: Elena (H), Thomas (V) — CRITICAL NIGHT, must shelter
- Night 4: Smith (H), FEMA visit during day, Robert (V) at night
- Night 5: Lina (H), Diana (V) — CRITICAL, FEMA during day
- Night 6-7: Cat Lady, Little Timmy (V), various returns
- Night 8-10: James (H), Rosa (H), Officer Wilson (V), Pale Stranger — escalation
- Night 11-14: Old Man Chen (H), remaining characters, desperate Visitor attacks, endgame

RULES:
- Once an NPC appears, their identity (Human/Visitor/Special) is FIXED
- Visitors have subtle tells matching the identification system
- NPCs remember previous conversations and events
- Dead NPCs stay dead. Turned-away NPCs may return later (more desperate or angry).
- Humans interact naturally. Visitors mimic normalcy but are subtly off.`,
      role: "lore",
      position: "after_char",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 75,
      enabled: true,
    },

    // ─── Entry 6: Night Phase Rules ──────────────────────────────────
    {
      id: "niah-night",
      name: "Night Phase Rules",
      content: `NIGHT PHASE PROCEDURE:
1. Open with 🌑 **NIGHT X** header
2. Describe atmosphere (weather, sounds, tension level, time of night)
3. First knock arrives — describe the sound, timing, urgency
4. Show [PEEP:Name] for the peephole portrait view
5. Present choices to the player (A. B. C. D. E.)
6. After player acts, resolve and present next knocker (if any)
7. When all knocks are resolved, describe the house settling for the night
8. Visitor behavior overnight: if 2+ Visitors inside and no cat, they kill a human guest
9. Transition: Sleep → News broadcast (reveal new trait) → Day phase

KNOCK EVENTS should escalate with difficulty:
- Early nights: polite knocking, single person, reasonable stories
- Mid nights: desperate pounding, groups, conflicting stories
- Late nights: scratching, silence then sudden banging, coordinated attempts

PEEPHOLE OBSERVATION:
- Output [PEEP:Name] — renders character portrait through night-vision peephole filter
- Describe appearance, clothes, expression, anything visible (but NOT definitive tells unless player spends Energy to check)

CONVERSATION STRATEGY:
- Players can ask questions through the door (costs 1 Energy each time)
- Visitors have consistent backstories but may slip up if pressed on details
- Humans have imperfect, genuine stories — they contradict themselves naturally from stress
- Key questions: "Where were you when it started?", "Do you know anyone else?", "Show me your teeth/hands"

AFTER LETTING A GUEST IN:
- Describe them entering, their immediate behavior
- Assign them a room: [room_NAME: set "GuestName"]
- They interact with existing guests — describe dynamics

PALE STRANGER SPECIAL:
- Appears as an extremely pale figure. Unsettling but calm.
- If let in: offers cryptic warnings about specific guests. Always truthful but vague.
- Disappears at dawn. Does not harm anyone. Does not count as human or Visitor for mechanics.`,
      role: "lore",
      position: "depth",
      depth: 2,
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 70,
      enabled: true,
    },

    // ─── Entry 7: Day Phase Rules ────────────────────────────────────
    {
      id: "niah-day",
      name: "Day Phase Rules",
      content: `DAY PHASE PROCEDURE:
1. Open with ☀️ **DAY X** header
2. NEWS BROADCAST: TV/Radio reveals the night's new Visitor trait (follow the revelation schedule)
3. Summarize overnight events: guest behavior, any Visitor attacks, items found
4. Present day actions:

AVAILABLE ACTIONS (each costs 1 Energy unless noted):
A. Search rooms — may find: FEMA notices, supplies (EnerJeka, coffee, cigarettes, cat food), evidence of Visitor activity
B. Talk to [Guest Name] — interrogate or bond. Can check body parts during conversation (teeth, eyes, nails, skin, armpits, temperature, tears)
C. Assign rooms — move guests between rooms (FREE)
D. Board up windows — costs 1 energy, narrative defense improvement
E. Kick out [Guest Name] — remove a guest (FREE). They may return later.
F. Use item — EnerJeka (+1 energy), coffee (capacity +1 for 4 days), cigarettes (fill energy but permanent capacity -1 and yellowed teeth), Bober Černý (energy → 0, skip to sleep), cat food (feed Penny)
G. Use telephone — call from the Office phone (6 services available)
H. Sleep early — skip remaining energy, recover 1 HP, advance to next night

FEMA VISITS (Days 4, 5, 8, 10):
- Agents arrive during the day. Show credentials, wear gas masks.
- They may inspect guests and take away anyone they identify as a Visitor.
- They may leave FEMA Notices — physical descriptions of confirmed Visitors.
- Using a FEMA Notice: costs 1 Energy, compare description against a specific guest. Consumes the Notice.

GUEST BEHAVIOR DURING DAY:
- Humans: argue, get scared, help cook, form alliances, share information, show genuine emotions
- Visitors: act normal but — stare at walls, hum unusual tunes, move silently, found in wrong rooms, repeat others' phrases, are oddly helpful or oddly withdrawn
- Guests interact with each other. Track who gravitates toward whom.

END OF DAY:
- Player must exhaust all energy before sleeping
- If energy > 0: "I still have energy, I don't want to sleep yet" — present more action options
- When ready: transition to next Night Phase [phase: set "night"] [day: set X+1] [energy: set energy_max]`,
      role: "lore",
      position: "depth",
      depth: 2,
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 65,
      enabled: true,
    },

    // ─── Entry 8: Variable Update Rules ──────────────────────────────
    {
      id: "niah-var-rules",
      name: "Variable Update Rules",
      content: `VARIABLE UPDATE TRIGGERS:

ENERGY:
- Talking through door: [energy: subtract 1]
- Using peephole for extended look: [energy: subtract 1]
- Checking body part: [energy: subtract 1]
- Checking FEMA notice: [energy: subtract 1]
- Searching rooms (day): [energy: subtract 1]
- Boarding windows (day): [energy: subtract 1]
- Talking to guest (day): [energy: subtract 1]
- Using telephone: [energy: subtract 1]
- Opening/refusing door: FREE
- Kicking someone out: FREE
- Assigning rooms: FREE
- EnerJeka drink: [energy: add 1] (cannot exceed capacity)
- Cigarette: [energy: set energy_max] (instant fill) + [energy_max: subtract 1] (permanent)
- Bober Černý beer: [energy: set 0] (instant sleep)
- Sleeping early: skips remaining energy, [hp: add 1] (max 3)
- New phase: [energy: set energy_max]

ENERGY CAPACITY:
- Base: 3. Each Human let inside → [energy_max: add 1]. Each Visitor let inside → [energy_max: subtract 1]
- Minimum 1, maximum 8
- Coffee effect: temporarily +1 capacity for 4 days (track in game_state)

HP:
- Visitor overnight attack: [hp: subtract 1]
- Shooting a human: [hp: subtract 1] (psychological)
- Bad event/trap: [hp: subtract 1]
- Sleeping early: [hp: add 1] (max 3)
- Old Man Chen medical care: [hp: add 1] (max 3)

PHASE:
- Night ends → Sleep → News → [phase: set "day"]
- Day ends → [phase: set "night"] [day: add 1] [energy: set energy_max]

ROOMS:
- Guest enters: [room_NAME: set "GuestName"]
- Guest leaves/kicked/taken/dead: [room_NAME: set "empty"]
- 6 rooms, 1 guest per room

TRAITS:
- After each news broadcast, add new trait to known_traits
- [known_traits: set "Excessively perfect teeth, eyes with dark sheen, hard retractable nails"]

GUN:
- Shooting: [armed: set false] if gun is lost/out of ammo
- Finding weapon: [armed: set true]

GAME STATE:
- [game_state: set "YAML"] — update EVERY turn with complete game state summary
- Include: night number, phase, guest profiles (name, room, identity, suspicion), statistics, inventory, any ongoing effects`,
      role: "lore",
      position: "depth",
      depth: 1,
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 60,
      enabled: true,
    },

    // ─── Entry 9: Endings & Achievements ─────────────────────────────
    {
      id: "niah-endings",
      name: "Endings & Achievements",
      content: `ENDINGS:

PERFECT ENDING: Survive 14 nights, correctly identified all Visitors, saved all humans. Military rescue. Emotional reunion. "You did what no one else could — you saw through them all."

GOOD ENDING: Survive 14 nights with most humans alive. Some mistakes made. Bittersweet rescue. The faces of those you couldn't save haunt you.

NORMAL ENDING: Survive 14 nights. Mixed results — some humans saved, some lost. "It's over. You survived. That has to be enough."

FAILURE ENDING: Too many Visitors inside — they coordinate a final attack. The house falls. "They were always patient. You just couldn't tell."

DEATH ENDING: HP reaches 0. Describe the final attack or collapse. Flashback to key moments. "The door falls silent. Nobody knocks anymore."

CAT ENDING: Survive with Penny the cat. Special heartwarming scene of rescue with cat in arms.

PARANOIA ENDING: Survive but turned away or killed too many humans. Alone in the house on Day 15. Military finds you in the corner. "You're safe. But at what cost?"

ACHIEVEMENTS (mention at game end if earned):
- "Perfect Eye" — correctly identified every Visitor
- "No One Left Behind" — saved all humans who knocked
- "Clean Hands" — never fired the gun
- "Cat Person" — kept Penny alive through all 14 nights
- "The Scholar" — collected all FEMA notices
- "Pacifist" — never killed anyone
- "Paranoid" — turned away more humans than Visitors
- "Bleeding Heart" — let in more Visitors than humans
- "Smoker" — used 3+ cigarettes (yellowed teeth like a Visitor)
- "The Surgeon" — Old Man Chen healed the player

GM PACING TIPS:
- Early nights: let the player learn the systems. First knocker should be clearly human or clearly suspicious.
- Mid game: introduce moral dilemmas. Child Visitor (Timmy), sympathetic Visitor stories.
- Late game: desperate scenarios. Multiple knockers at once. Visitors pretending to be returning guests.
- Final night: maximum tension. Reveal remaining identities through action.`,
      role: "lore",
      position: "depth",
      depth: 4,
      alwaysSend: false,
      keywords: ["ending", "end", "final", "survive", "death", "die", "dead", "day 15", "night 14", "achievement", "rescue", "helicopter"],
      conditions: [],
      conditionLogic: "all",
      priority: 50,
      enabled: true,
    },

    // ─── Entry 10: Display Format Rules ──────────────────────────────
    {
      id: "niah-display",
      name: "Display Format Rules",
      content: `DISPLAY FORMAT — follow this structure in all responses:

HEADERS:
- Night phase: 🌑 **NIGHT X** (exactly this format — the display system styles it)
- Day phase: ☀️ **DAY X**

NARRATIVE: Use markdown. *Italics* for atmosphere and internal monologue, **bold** for emphasis, ***bold italic*** for intense moments (knocking sounds, attacks).

PEEPHOLE: When the player looks through the peephole or a new knocker arrives:
[PEEP:FirstName]
Use the character's first name exactly as listed in the NPC database (Sarah, Marcus, Jake, Lily, etc.)
Then describe what the player sees in detail.

KNOCKING: Use ***bold italic*** for knock sounds:
***KNOCK KNOCK KNOCK***
***Thud... thud... thud...***

CHOICES: End with exactly this format when the player needs to act:
**Suggested Choices:**
A. First option
B. Second option
C. Third option
D. Fourth option
E. Other — type anything you want to do

HUD (MUST include in EVERY response, between --- separators):
---
⚡ **Energy: X/X** | ❤️ **HP: X** | 🔫 Armed | 📋 FEMA Notice: X
📰 **Known Visitor Traits:** comma-separated list
🏠 **Room summary**
---

ATMOSPHERE: Use *"quoted italics"* for ambient sounds and quotes:
*"The wind howls through the cracks in the boards..."*

SYSTEM NOTES: Wrap internal GM logic in <sum> tags — hidden from the player:
<sum>Visitor check: Sarah is human, telling the truth about the store</sum>

Variable directives go at the very end — also hidden from the player.`,
      role: "style",
      position: "depth",
      depth: 0,
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 85,
      enabled: true,
    },

    // ─── Entry 11: Peephole Format ───────────────────────────────────
    {
      id: "niah-peephole",
      name: "Peephole Format",
      content: `PEEPHOLE OUTPUT:
When the player looks through the peephole, output the tag using the character's first name:
[PEEP:Sarah] — for Sarah Chen
[PEEP:Jake] — for Jake Morrison
[PEEP:Marcus] — for Marcus Webb
[PEEP:Elena] — for Elena Kovac
[PEEP:Smith] — for Smith/David Park
[PEEP:Lily] — for Lily
[PEEP:Robert] — for Robert Hayes
[PEEP:Diana] — for Diana Cross
[PEEP:Thomas] — for Thomas Reed
[PEEP:FEMA] — for FEMA agents
[PEEP:Timmy] — for Little Timmy
[PEEP:PaleStranger] — for the Pale Stranger
[PEEP:CatLady] — for Cat Lady
[PEEP:Wilson] — for Officer Wilson
[PEEP:Lina] — for Lina Torres
[PEEP:James] — for James Miller
[PEEP:Rosa] — for Rosa Hernandez
[PEEP:OldManChen] — for Old Man Chen
[PEEP:Jefray] — for Jefray Ding (also accepts [PEEP:Jefray Ding])
[PEEP:Who] — for the mysterious ??? entity

The display system renders a night-vision peephole portrait with the character's image.
After the tag, describe what the player sees through the narrow peephole: face, clothes, posture, expression, anything they're carrying, and background details.`,
      role: "style",
      position: "depth",
      depth: 1,
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 55,
      enabled: true,
    },

    // ─── Entry 12: Greeting ──────────────────────────────────────────
    {
      id: "niah-greeting",
      name: "Greeting",
      content: `🌑 **NIGHT 1**

*"Emergency evening bulletin — FEMA issues a highest-level alert to all citizens. Over the past 72 hours, multiple locations have confirmed the appearance of unidentified entities closely resembling humans, which authorities are calling 'Visitors.' These entities possess highly advanced mimicry capabilities but exhibit identifiable physiological anomalies. All citizens are urged to immediately lock all doors and windows. Do not allow anyone into your residence without confirming their identity."*

*"The first confirmed Visitor identification trait: some individuals have teeth that are excessively perfect and uniform, inconsistent with normal human tooth wear patterns. Stay vigilant. This is your FEMA. Stay safe."*

📺 The TV screen flickers a few times, then goes dark.

You are alone in this single-story house. The **Hallway** connects all rooms — exiting the bedroom and going clockwise:
🚿 **Bathroom** → 🛋️ **Living Room** → 🛏️ **Bedroom** → 💼 **Office** → 🍳 **Kitchen** → 📦 **Storage Room**

The front door has a **Peephole**. There is a **handgun** in the Storage Room. The kitchen fridge holds a can of **EnerJeka** energy drink and a bottle of **Bober Černý** dark beer. The Office has a **telephone**. The Bathroom has a **mirror**.

---
⚡ **Energy: 3/3** | ❤️ **HP: 3** | 🔫 Armed | 📋 FEMA Notice: 0
📰 **Known Visitor Traits:** Excessively perfect teeth
🏠 **All Rooms: Empty**
---

Night has fully fallen. Dead silence outside.

Then —

***Thud... thud... thud.***

Someone is knocking on your door. You peer through the peephole —

[PEEP:Sarah]

A young woman stands outside, early twenties, with a messy ponytail, wearing a convenience store uniform apron with a "Sarah" name tag pinned to it. She looks absolutely terrified, constantly glancing back at the dark street behind her.

"P-please, please open the door... I'm the cashier at the convenience store on the corner, my name is Sarah... those things... they're out there... I saw them eat my coworker... please..."

Her voice is trembling. Her eyes are red-rimmed, as if she has been crying for a long time.

*She looks human. But then, they all do.*

**Suggested Choices:**
A. Open the door and let her in
B. Talk to her through the door — ask more questions
C. Refuse to open the door, tell her to leave
D. Carefully observe her appearance through the peephole
E. Other — type anything you want to do

<sum>Night 1 begins. TV news reveals first Visitor trait: excessively perfect teeth. First knocker: Sarah Chen (HUMAN — convenience store cashier). Tonight's knockers: Sarah (H), Jefray Ding (H), then Jake Morrison (V).</sum>

[phase: set "night"]
[day: set 1]
[energy: set 3]
[energy_max: set 3]
[hp: set 3]
[armed: set true]
[known_traits: set "Excessively perfect teeth"]
[game_state: set "night: 1\\nphase: night_knock\\ntonight_knock_index: 1\\ntonight_total_knocks: 2\\nguests_inside: 0\\nguest_profiles: []\\nfirst_knocker: Sarah Chen (Human)\\nsecond_knocker: Jake Morrison (Visitor)\\nstatus: awaiting_player_decision\\nplayer:\\n  location: front_door\\n  enerjeka_stock: 1\\n  bober_stock: 1"]`,
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
    { id: "phase", name: "Phase", type: "string", defaultValue: "night", description: "Current game phase (night/day)" },
    { id: "day", name: "Day", type: "number", defaultValue: 1, description: "Current day/night number", min: 1, max: 15 },
    { id: "energy", name: "Energy", type: "number", defaultValue: 3, description: "Actions remaining this phase", min: 0, max: 8 },
    { id: "energy_max", name: "Energy Max", type: "number", defaultValue: 3, description: "Maximum energy per phase", min: 1, max: 8 },
    { id: "hp", name: "HP", type: "number", defaultValue: 3, description: "Player health points", min: 0, max: 3 },
    { id: "armed", name: "Armed", type: "boolean", defaultValue: true, description: "Player has a gun" },
    { id: "fema_notices", name: "FEMA Notices", type: "number", defaultValue: 0, description: "Number of FEMA notices collected", min: 0 },
    { id: "has_cat", name: "Has Cat", type: "boolean", defaultValue: false, description: "Penny the cat is with the player" },
    { id: "room_living", name: "Living Room", type: "string", defaultValue: "empty", description: "Living room occupant" },
    { id: "room_kitchen", name: "Kitchen", type: "string", defaultValue: "empty", description: "Kitchen occupant" },
    { id: "room_bedroom", name: "Bedroom", type: "string", defaultValue: "empty", description: "Bedroom occupant" },
    { id: "room_bathroom", name: "Bathroom", type: "string", defaultValue: "empty", description: "Bathroom occupant" },
    { id: "room_office", name: "Office", type: "string", defaultValue: "empty", description: "Office occupant" },
    { id: "room_storage", name: "Storage", type: "string", defaultValue: "empty", description: "Storage room occupant" },
    { id: "known_traits", name: "Known Traits", type: "string", defaultValue: "Excessively perfect teeth", description: "Known Visitor identifying traits" },
    { id: "coffee_remaining_days", name: "Coffee Buff Days", type: "number", defaultValue: 0, description: "Days remaining for coffee energy capacity buff", min: 0 },
    { id: "total_smokes", name: "Total Smokes", type: "number", defaultValue: 0, description: "Cumulative cigarette uses (permanent capacity reduction)", min: 0 },
    { id: "enerjeka_stock", name: "EnerJeka Stock", type: "number", defaultValue: 1, description: "EnerJeka energy drink inventory", min: 0 },
    { id: "bober_stock", name: "Bober Stock", type: "number", defaultValue: 1, description: "Bober Černý dark beer inventory", min: 0 },
    { id: "cigarette_stock", name: "Cigarette Stock", type: "number", defaultValue: 0, description: "Cigarette inventory", min: 0 },
    { id: "coffee_stock", name: "Coffee Stock", type: "number", defaultValue: 0, description: "Coffee inventory", min: 0 },
    { id: "cat_food_stock", name: "Cat Food Stock", type: "number", defaultValue: 0, description: "Cat food inventory", min: 0 },
    { id: "game_state", name: "Game State", type: "string", defaultValue: INITIAL_GAME_STATE, description: "Full YAML game state maintained by AI" },
  ],

  rules: [
    {
      id: "niah-death",
      name: "Death",
      description: "Game over when HP reaches 0",
      conditions: [{ variableId: "hp", operator: "lte", value: 0 }],
      conditionLogic: "all",
      effects: [],
      priority: 100,
    },
    {
      id: "niah-no-energy",
      name: "No Energy Warning",
      description: "Player has no energy remaining — can only open/refuse door or sleep",
      conditions: [{ variableId: "energy", operator: "lte", value: 0 }],
      conditionLogic: "all",
      effects: [],
      priority: 50,
    },
  ],

  components: [],
  audioTracks: [],

  customComponents: [
    {
      id: "niah-hud",
      name: "Survivor HUD",
      tsxCode: NIAH_HUD_TSX,
      description: "Game state sidebar showing energy, HP, room occupancy, visitor traits",
      order: 0,
      visible: true,
      updatedAt: new Date().toISOString(),
    },
  ],

  displayTransforms: [
    // ── Strip system blocks ────────────────────────────────────────
    {
      id: "dt-strip-update",
      name: "Strip UpdateVariable",
      pattern: "&lt;UpdateVariable&gt;[\\s\\S]*?&lt;/UpdateVariable&gt;",
      replacement: "",
      flags: "g",
      order: 0,
      enabled: true,
    },
    {
      id: "dt-game-log",
      name: "Game log",
      pattern: "&lt;sum&gt;\\s*([\\s\\S]*?)\\s*&lt;/sum&gt;",
      replacement: '<div style="background:linear-gradient(135deg,#06100c,#0a1a14);border:1px solid rgba(45,180,120,0.1);border-left:3px solid rgba(45,180,120,0.35);border-radius:0 4px 4px 0;padding:14px 20px;margin:18px 0;box-shadow:0 3px 18px rgba(0,0,0,0.45)"><div style="font-size:10px;letter-spacing:4px;color:rgba(45,180,120,0.5);margin-bottom:8px;text-transform:uppercase">SYSTEM LOG</div><div style="color:rgba(155,200,168,0.8);font-size:13px;line-height:1.7">$1</div></div>',
      flags: "g",
      order: 5,
      enabled: true,
    },
    {
      id: "dt-strip-directives",
      name: "Strip variable directives",
      pattern: "\\[(?:energy|energy_max|hp|day|phase|armed|fema_notices|has_cat|room_\\w+|known_traits|coffee_remaining_days|total_smokes|enerjeka_stock|bober_stock|cigarette_stock|coffee_stock|cat_food_stock):[^\\]]+\\]",
      replacement: "",
      flags: "g",
      order: 6,
      enabled: true,
    },
    {
      id: "dt-strip-gamestate",
      name: "Strip game_state directive",
      pattern: "\\[game_state: set &quot;[\\s\\S]*?&quot;\\]",
      replacement: "",
      flags: "g",
      order: 7,
      enabled: true,
    },

    // ── Headers ────────────────────────────────────────────────────
    {
      id: "dt-night-header",
      name: "Night header",
      pattern: "🌑\\s*<strong>\\s*NIGHT\\s+(\\d+)\\s*</strong>",
      replacement: '<div style="text-align:center;padding:16px 0 10px;font-size:20px;font-weight:bold;letter-spacing:6px;color:#4ade80;text-shadow:0 0 20px rgba(74,222,128,0.4),0 0 40px rgba(74,222,128,0.2);text-transform:uppercase">🌑 N I G H T &nbsp; $1</div>',
      flags: "gi",
      order: 10,
      enabled: true,
    },
    {
      id: "dt-day-header",
      name: "Day header",
      pattern: "☀️\\s*<strong>\\s*DAY\\s+(\\d+)\\s*</strong>",
      replacement: '<div style="text-align:center;padding:16px 0 10px;font-size:20px;font-weight:bold;letter-spacing:6px;color:#fbbf24;text-shadow:0 0 20px rgba(251,191,36,0.4),0 0 40px rgba(251,191,36,0.2);text-transform:uppercase">☀️ D A Y &nbsp; $1</div>',
      flags: "g",
      order: 11,
      enabled: true,
    },

    // ── Character-specific peepholes (with actual portrait images) ──
    ...buildPeepholeTransforms(),

    // ── Special peephole for multi-word names ──────────────────────
    {
      id: "dt-peep-jefray-ding",
      name: "Peephole: Jefray Ding",
      pattern: "\\[PEEP:Jefray Ding\\]",
      replacement: peepholeHtml("Jefray Ding", PEEP_IMAGES.Jefray!),
      flags: "g",
      order: 38,
      enabled: true,
    },

    // ── Fallback peephole for unknown characters ───────────────────
    {
      id: "dt-peephole-fallback",
      name: "Peephole fallback",
      pattern: "\\[PEEP:([\\w ]+)\\]",
      replacement: '<div style="text-align:center;margin:12px 0"><div style="display:inline-block;width:140px;height:140px;border-radius:50%;border:6px solid #1a1a1a;background:radial-gradient(circle,#1f2937 60%,#000 100%);box-shadow:inset 0 0 40px rgba(0,0,0,0.9),0 0 20px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><span style="font-size:40px;filter:hue-rotate(80deg) saturate(3)">👁️</span></div><div style="margin-top:4px;font-size:10px;letter-spacing:2px;color:#4ade80;text-transform:uppercase">Peephole — $1</div></div>',
      flags: "g",
      order: 39,
      enabled: true,
    },

    // ── Choices ────────────────────────────────────────────────────
    {
      id: "dt-choices-header",
      name: "Choices header",
      pattern: "<strong>Suggested Choices:</strong>",
      replacement: '<div style="margin-top:16px;padding-top:10px;border-top:1px solid #374151;font-size:10px;letter-spacing:3px;color:#4ade80;text-transform:uppercase;font-weight:700">Your Choice</div>',
      flags: "g",
      order: 40,
      enabled: true,
    },
    {
      id: "dt-choice-cards",
      name: "Choice buttons",
      pattern: "^([A-E])\\. (.+)$",
      replacement: '<button data-yumina-choice="$1. $2" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;margin:4px 0;border:1px solid #374151;border-radius:8px;background:#111827;color:#d1d5db;font-size:13px;cursor:pointer;text-align:left;transition:all 0.15s"><span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:#1f2937;border:1px solid #4ade80;color:#4ade80;font-weight:bold;font-size:12px;flex-shrink:0">$1</span><span>$2</span></button>',
      flags: "gm",
      order: 41,
      enabled: true,
    },

    // ── HUD elements ───────────────────────────────────────────────
    {
      id: "dt-energy",
      name: "Energy HUD",
      pattern: "⚡ <strong>(Energy: \\d+/\\d+)</strong>",
      replacement: '<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:#1a2e05;border:1px solid #365314;color:#86efac;font-size:12px;font-weight:600">⚡ $1</span>',
      flags: "g",
      order: 50,
      enabled: true,
    },
    {
      id: "dt-hp",
      name: "HP HUD",
      pattern: "❤️ <strong>(HP: \\d+)</strong>",
      replacement: '<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:#450a0a;border:1px solid #7f1d1d;color:#fca5a5;font-size:12px;font-weight:600">❤️ $1</span>',
      flags: "g",
      order: 51,
      enabled: true,
    },
    {
      id: "dt-gun",
      name: "Gun HUD",
      pattern: "🔫 (Armed|Unarmed)",
      replacement: '<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:#422006;border:1px solid #854d0e;color:#fde68a;font-size:12px;font-weight:600">🔫 $1</span>',
      flags: "g",
      order: 52,
      enabled: true,
    },
    {
      id: "dt-fema",
      name: "FEMA HUD",
      pattern: "📋 FEMA Notice: (\\d+)",
      replacement: '<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:#172554;border:1px solid #1e40af;color:#93c5fd;font-size:12px;font-weight:600">📋 FEMA: $1</span>',
      flags: "g",
      order: 53,
      enabled: true,
    },
    {
      id: "dt-traits",
      name: "Visitor traits HUD",
      pattern: "📰 <strong>(Known Visitor Traits:)</strong> (.+)",
      replacement: '<div style="margin-top:6px;padding:8px 12px;border-radius:6px;border:1px solid #991b1b;background:#450a0a;color:#fca5a5;font-size:12px">⚠️ <strong>$1</strong> $2</div>',
      flags: "g",
      order: 54,
      enabled: true,
    },
    {
      id: "dt-rooms",
      name: "Room status HUD",
      pattern: "🏠 (.+)",
      replacement: '<div style="padding:3px 10px;border-radius:4px;background:#1c1917;border:1px solid #292524;color:#a8a29e;font-size:12px">🏠 $1</div>',
      flags: "g",
      order: 55,
      enabled: true,
    },

    // ── Statistics ────────────────────────────────────────────────
    {
      id: "dt-statistics",
      name: "Statistics HUD",
      pattern: "📊 <strong>([^<]+)</strong> (.+)",
      replacement: '<div style="padding:3px 10px;border-radius:4px;background:#0e1218;border:1px solid rgba(90,110,160,0.1);color:#9baac3;font-size:12px">📊 <strong>$1</strong> $2</div>',
      flags: "g",
      order: 56,
      enabled: true,
    },

    // ── Atmospheric ────────────────────────────────────────────────
    {
      id: "dt-knock",
      name: "Knock effect",
      pattern: "<strong><em>([^<]+)</em></strong>",
      replacement: '<div style="text-align:center;padding:10px 0;font-size:18px;font-weight:bold;letter-spacing:6px;color:#ef4444;text-shadow:0 0 15px rgba(239,68,68,0.4),0 0 30px rgba(239,68,68,0.2)">$1</div>',
      flags: "g",
      order: 60,
      enabled: true,
    },
    {
      id: "dt-atmosphere",
      name: "Atmosphere quote",
      pattern: '<em>&quot;([^&]+)&quot;</em>',
      replacement: '<div style="text-align:center;padding:8px 20px;margin:10px 0;font-style:italic;color:#6b7280;border-left:2px solid #4ade80">"$1"</div>',
      flags: "g",
      order: 70,
      enabled: true,
    },

    // ── HUD separator ──────────────────────────────────────────────
    {
      id: "dt-separator",
      name: "HUD separator",
      pattern: "^---$",
      replacement: '<hr style="border:none;height:1px;background:linear-gradient(90deg,transparent,#4ade80,transparent);margin:12px 0" />',
      flags: "gm",
      order: 45,
      enabled: true,
    },

    // ── Clean up empty lines from stripped content ──────────────────
    {
      id: "dt-cleanup",
      name: "Clean empty lines",
      pattern: "(<br />\\s*){3,}",
      replacement: "<br /><br />",
      flags: "g",
      order: 100,
      enabled: true,
    },
  ],

  settings: {
    maxTokens: 16000,
    maxContext: 200000,
    temperature: 0.9,
    topP: 0.95,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
    playerName: "Survivor",
    structuredOutput: false,
    lorebookScanDepth: 4,
    lorebookRecursionDepth: 0,
  },
};
