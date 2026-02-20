# BetterTavern Changelog

---

## Development Rules & Lessons Learned

> **IMPORTANT: Follow these rules when working on BetterTavern**

### 1. Investigate Before Coding
Always investigate and understand the codebase clearly before proceeding. The original SillyTavern codebase is complex and easy to break. Use the Explore agent or grep/read tools to understand:
- How existing features work
- What event binding patterns are used (jQuery delegation vs direct binding)
- What CSS rules affect the elements you're modifying

### 2. Don't Break the Backend
When enabling new functions or moving DOM elements around, always ensure it doesn't break existing functionality. Key considerations:
- jQuery event handlers attached via `$('#id').on()` survive DOM moves
- Document-level delegation `$(document).on('click', '.class', handler)` works anywhere
- CSS classes like `closedDrawer` vs `openDrawer` control visibility
- Panels need proper class management when moved between containers

### 3. Ask Clarification Questions
If you don't understand the requirements or the existing code behavior, ask clarification questions before proceeding. Don't assume.

### 4. Think Deeply for Best Solutions
Always think deeply about the best way to solve a problem. Investigate root causes thoroughly before implementing fixes. Example: The Settings panel issue was initially thought to be event handler loss, but investigation revealed it was actually CSS visibility (`height: 0` from `closedDrawer` class).

### 5. Document Architecture Changes
When making architecture differences or updates, always document them in this changelog so future developers (or AI) can refer back. Include:
- What was changed and why
- Key technical insights discovered
- Files modified and their purpose
- Any gotchas or things to watch out for

This documentation is critical for maintaining the codebase and avoiding repeated mistakes.

---

## Work In Progress / Known Issues

### Panel Layout When AI Config/Characters Open (FAILED - Needs Future Work)

**Goal:** When AI Config or Characters panel opens, push the chat area to the right so it's never blocked by the panel. Similar to how the sidebar expand/collapse works correctly.

**What was attempted:**
1. Added `body.panel-open` class when panels open via `bettertavern-panels.js`
2. CSS rules to push `#sheld` and `#form_sheld` to the right using:
   - `left: calc(var(--sidebar-width) + var(--panel-width) + 5px)`
   - `right: 0`
   - `width: auto`
3. Auto-collapse sidebar when panel opens (temporary, not saved to localStorage)
4. Added `pinnedOpen` class to prevent click-outside auto-close

**Current state:**
- CSS computed values show correct positioning (`left: 415px`, etc.)
- However, the chat content (avatar, message text, input bar) is still being visually blocked by the panel
- The root cause is unclear - possibly related to z-index layering, overflow properties, or the original SillyTavern centering logic conflicting with our positioning

**Files involved:**
- `public/css/bettertavern-ui.css` (lines 361-385) - panel-open positioning rules
- `public/scripts/bettertavern-panels.js` - panel state management, body.panel-open class toggle

**What works correctly:**
- Sidebar expand/collapse does NOT block chat content
- Single-panel logic (only one panel open at a time)
- Auto-collapse sidebar when panel opens
- Panels don't close when clicking elsewhere (pinnedOpen)

**What doesn't work:**
- Chat area content blocked by panel despite CSS showing correct left position
- Need to investigate why the same pattern that works for sidebar doesn't work for panels

**Recommendation for future work:**
1. Deeply analyze why sidebar margin-left works but panel left positioning doesn't
2. Consider restructuring the DOM so panels are siblings of chat, not inside sidebar
3. May need to modify original SillyTavern layout structure rather than just CSS overrides

---

## Completed Features

### Feb 3, 2026 - Chat App Layout & Final Branding

**Goal:** Implement chat app-style message layout and complete all branding updates.

**Branding Finalization:**
1. **Page Titles Updated:**
   - `index.html` title: SillyTavern → Yumina
   - `login.html` title: SillyTavern → Yumina
   - `manifest.json` name/short_name: SillyTavern → Yumina
   - Welcome message: "Welcome to Yumina!"
   - Onboarding text updated to reference Yumina

2. **Favicon Updated:**
   - Changed from old `favicon.ico` to `img/logo.png` (Yumina logo)
   - Updated in both `index.html` and `login.html`

3. **Logos Enlarged by 10%:**
   - Sidebar: logo 35px → 38px, wordmark 22px → 24px
   - Login page: logo 53px → 58px, wordmark 31px → 34px

**Settings Logout Button Fixed:**
1. Removed placeholder Login button from Settings > Account
2. Wired Logout button to call actual `logout()` function from `user.js`
3. Exported `logout()` function from `user.js` for import

**Chat App Layout (User Right, AI Left):**
Implemented iMessage/WhatsApp-style message layout:

1. **User Messages on Right:**
   - Avatar moves to right side via `flex-direction: row-reverse`
   - Name/timestamp aligned to right
   - Message bubble shrinks to fit content (`width: fit-content`)
   - Max-width 92% to prevent overlap with avatar

2. **Text Alignment:**
   - User message text stays LEFT-aligned for readability
   - The bubble itself floats to the right, but text reads normally

3. **Timestamp Visibility:**
   - Hidden on user messages (cleaner look)
   - Only shown on AI messages

**CSS Implementation:**
```css
/* User messages: Reverse layout */
.mes[is_user="true"] {
    flex-direction: row-reverse;
}

/* Shrink bubble to fit content */
.mes[is_user="true"] .mes_block {
    width: fit-content;
    max-width: 92%;
}

/* Keep text left-aligned for readability */
.mes[is_user="true"] .mes_text {
    text-align: left;
}

/* Hide timestamp on user messages */
.mes[is_user="true"] .timestamp {
    display: none !important;
}
```

**Files Modified:**
- `public/index.html` - Title, favicon, welcome text, removed Login button
- `public/login.html` - Title, favicon
- `public/manifest.json` - name, short_name
- `public/css/bettertavern-ui.css` - Chat layout CSS, logo sizes
- `public/css/login.css` - Logo sizes
- `public/scripts/bettertavern-settings.js` - Logout button handler
- `public/scripts/user.js` - Exported logout function

**Status:** IMPLEMENTED

---

### Feb 2, 2026 - Yumina Branding & UI Polish

**Goal:** Complete rebranding from SillyTavern to Yumina and polish various UI elements.

**Branding Changes:**
1. **Logo Replacement:**
   - Replaced main logo (`public/img/logo.png`) with Yumina anchor+flame graphic
   - Replaced wordmark (`public/img/logo-word.png`) with gradient "Yumina" text
   - Applied to sidebar, login page, and welcome panel
   - Enlarged logos by 10% and increased wordmark brightness

2. **Welcome Panel Updates:**
   - Removed API Connections, Character Management, Extensions shortcuts
   - Changed "Temporary Chat" button to "Visit Website" linking to https://yumina.io

3. **Default User Avatar:**
   - Replaced default avatar (`public/img/user-default.png`, `default/content/user-default.png`) with "我" character on gradient background
   - Fixed sidebar avatar (`index.html`) to use `user-default.png` instead of hardcoded `ai4.png`

**UI Fixes:**
1. **Sidebar Menu:**
   - Fixed alignment and color consistency (all menu items now white, icons properly aligned)

2. **Message Action Icons:**
   - Fixed Copy, Edit, Regenerate, Revert buttons to appear below messages instead of overlapping content
   - Added conditional logic to hide Regenerate button for user messages and first messages

3. **Reply Bar:**
   - Fixed z-index issues so menu doesn't get blocked
   - Unified styling (textarea background matches container, placeholder left-aligned)
   - Adjusted send button size to 36px for visual balance

**Files Modified:**
- `public/img/logo.png` - Main Yumina logo
- `public/img/logo-word.png` - Yumina wordmark
- `public/img/user-default.png` - Default user avatar
- `default/content/user-default.png` - Default user avatar (content folder)
- `public/index.html` - Sidebar avatar source fix
- `public/css/bettertavern-ui.css` - Reply bar styling, send button size
- `public/scripts/templates/welcomePrompt.html` - Welcome panel modifications

**Status:** IMPLEMENTED

---

### Message Action Icons - Bottom Left & Hover Only (NEW)

**Goal:** Improve message UI by moving action icons to a less intrusive position and showing only on hover.

**Changes:**
- Repositioned `.mes_buttons` from message header (top right) to **bottom-left** of message
- Hidden by default (`opacity: 0`, `visibility: hidden`)
- Shows on hover over the message (`.mes:hover`)
- Buttons remain visible when message is in edit mode (`.mes.selected`)
- Added subtle background styling for better visibility

**CSS Implementation:**
```css
.mes .mes_block {
    position: relative !important;
}

.mes .mes_buttons {
    position: absolute !important;
    bottom: 5px !important;
    left: 0 !important;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s ease, visibility 0.15s ease;
    background: var(--SmartThemeBlurTintColor);
    padding: 4px 8px;
    border-radius: 6px;
}

.mes:hover .mes_buttons {
    opacity: 1;
    visibility: visible;
}
```

**Files Modified:**
- `public/css/bettertavern-ui.css` - Message button positioning and hover styles

**Status:** IMPLEMENTED

### Hide Unused UI Elements (NEW)

**Goal:** Simplify the UI by hiding elements that are not needed for the BetterTavern workflow.

**1. Main API Selector (`#main-API-selector-block`):**
- Hidden because only Chat Completion is used
- Other options (Text Completion, NovelAI, AI Horde, KoboldAI) were already hidden
- The "Chat Completion Source" dropdown remains visible for provider selection (OpenAI, Claude, etc.)

**2. Deprecated Extras API Section:**
- Hidden the entire "(DEPRECATED) Extras API" section in Extensions panel
- Includes: `<hr>` separator, header row, URL/API key inputs, Connect button
- Uses `:has()` selector with fallback for browser compatibility

**CSS Implementation:**
```css
/* Hide main API type selector */
#main-API-selector-block {
    display: none !important;
}

/* Hide deprecated Extras API section */
#rm_extensions_block .alignitemscenter.flex-container:has(#extensions_status) {
    display: none !important;
}
#rm_extensions_block .alignitemsflexstart.flex-container:has(#extensions_url) {
    display: none !important;
}
```

**Files Modified:**
- `public/css/bettertavern-ui.css` - Added hide rules in Phase 1 section

**Status:** IMPLEMENTED

### Panel Flash/Resize Bug Fix (NEW)

**Problem:** When switching between panels (e.g., AI Config → Characters), the panel would briefly flash or expand to a larger size before loading the new content.

**Root Cause:**
- Panel width was inconsistent between states:
  - Base `.drawer-content` had `width: 450px`
  - `.openDrawer` state had `width: 400px` (different!)
  - Original SillyTavern `.fillRight`/`.fillLeft` had dynamic width calculation
- During panel switches, brief state transitions caused visible width changes

**Solution:**
1. Consolidated `--panel-width` to single `:root` definition (`550px` - wider as user preferred)
2. Applied consistent width to ALL drawer-content states (base, open, closed)
3. Added explicit override for `.fillLeft`/`.fillRight` classes
4. Set `transition: opacity, visibility` only (no width transition)

**CSS Variables Updated:**
```css
:root {
    --sidebar-width: 260px;
    --sidebar-collapsed-width: 60px;
    --chat-max-width: 1200px;
    --panel-width: 550px;  /* Consistent panel width */
}
```

**Files Modified:**
- `public/css/bettertavern-ui.css` - Consolidated width definitions

**Status:** IMPLEMENTED

### Menu Tab Order Change (NEW)

**Goal:** Reorder sidebar menu tabs to prioritize Characters over World Info.

**Old Order:** AI Config → World Info → Extensions → Characters
**New Order:** AI Config → **Characters** → World Info → Extensions

**Implementation:** Used CSS flexbox `order` property (safer than moving HTML):
```css
#sidebar-nav #ai-config-button { order: 1; }
#sidebar-nav #rightNavHolder { order: 2; }
#sidebar-nav #WI-SP-button { order: 3; }
#sidebar-nav #extensions-settings-button { order: 4; }
```

**Files Modified:**
- `public/css/bettertavern-ui.css` - Added order properties to sidebar-nav drawers

**Status:** IMPLEMENTED

### World Info Default Settings (NEW)

**Goal:** Change default World Info settings for new users.

**Changes to `default/content/settings.json`:**
- `world_info_budget`: 25 → **100** (Context %)
- Added `world_info_max_recursion_steps`: **5**
- `world_info_depth` remains at **2** (already correct)

**Files Modified:**
- `default/content/settings.json` - Updated world_info_settings section

**Status:** IMPLEMENTED

### Settings Modal Panel UI Improvements (NEW)

**Problem:** Embedded panels (API, Backgrounds) in Settings modal looked "ugly, cluttered together."

**Solution:**
1. Rewrote embedded panel styles for proper flex layout
2. Backgrounds panel uses `display: flex` with scrollable grid
3. Added better spacing, padding, and visual hierarchy
4. Fixed grid layout for background thumbnails (140px min-width)
5. API panel sections have cleaner visual grouping with subtle backgrounds

**Key CSS Changes:**
```css
#Backgrounds.settings-embedded-panel {
    display: flex !important;
    flex-direction: column !important;
}

#Backgrounds.settings-embedded-panel #bg_menu_content {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
    gap: 12px !important;
}
```

**Files Modified:**
- `public/css/bettertavern-settings.css` - Rewrote embedded panel section

**Status:** IMPLEMENTED

### Reply Bar Width Alignment Fix (NEW)

**Problem:** Reply bar (`#form_sheld`) width didn't match chat area (`#sheld`) width.

**Solution:** Simplified positioning approach:
- Set `left: var(--sidebar-width)` and `right: 0` to define available space
- Use `width: auto` with `max-width: 1200px`
- Use `margin: 0 auto` to center within available space

Both `#sheld` and `#form_sheld` now use identical positioning logic.

**Files Modified:**
- `public/css/bettertavern-ui.css` - Simplified centering logic

**Status:** IMPLEMENTED

### Phase 1-9: UI Simplification
- Hidden unused panels (AI Response Formatting, User Settings, etc.)
- Vertical sidebar with navigation
- Message button simplification (copy, edit, regenerate, revert only)
- Start New chat modal
- Recent chats in sidebar
- User profile display
- Sidebar collapse/expand functionality

### Centered Chat Layout with Max-Width

**Goal:** Improve chat readability by constraining text width, and create space for panels to overlay without shifting chat.

**Implementation:**
- Chat content (`#sheld`, `#form_sheld`) has `max-width: 1200px`
- Centered in available space using: `left: 50%` + `transform: translateX(-50% + sidebar/2)`
- Panels overlay the blank space instead of pushing chat
- Responsive fallback: fills available space on narrow screens (<1200px)

**CSS Variables:**
```css
:root {
    --chat-max-width: 1200px;
    --sidebar-width: 260px;
    --sidebar-collapsed-width: 60px;
    --panel-width: 400px;
}
```

**Benefits:**
- Better readability (narrower text column)
- No jarring layout shifts when panels open/close
- Panels can be wider without affecting chat

**Files Modified:**
- `public/css/bettertavern-ui.css` - Centered chat layout CSS

### Settings Modal
- Created unified Settings modal accessible from sidebar
- Moved Background Images, API Connections, Persona Management to Settings modal

### Character Profile Card (Complete Replacement for Old Character Panel)

**Goal:** Implement a full-featured character profile card that completely replaces the old character info panel (`#rm_ch_create_block`). Features:
1. View and edit all character fields directly
2. Avatar upload
3. All management features (Favorite, World/Lorebook, Export, Duplicate, Delete)
4. Start Chat button to begin conversation

**Implementation:**

#### 1. Profile Card Structure

```
┌─────────────────────────────────────────────────┐
│  [X] Close                                       │
│                                                  │
│         ┌─────────┐                              │
│         │ Avatar  │  ← Click to change           │
│         │ 📷      │                              │
│         └─────────┘                              │
│    [Editable Name Input]                         │
│    by [Editable Creator Input]                   │
│         [tags]                                   │
│                                                  │
│  ⭐  🌐  📘  📤  📋  🗑️                         │
│  Fav World Chat Export Dupe Delete               │
│                                                  │
│  ▸ Creator's Notes        (collapsed, editable) │
│  ▸ Description            (collapsed, editable) │
│  ▸ First Message          (collapsed, editable) │
│  ▸ Advanced Definition    (collapsed)           │
│     ├ Personality         (editable)            │
│     ├ Scenario            (editable)            │
│     └ Example Messages    (editable)            │
│                                                  │
│       [Save]           [Start Chat]             │
└─────────────────────────────────────────────────┘
```

#### 2. Key Features

**Editable Fields:**
- Character name and creator (in header)
- Creator's Notes, Description, First Message
- Advanced Definition section: Personality, Scenario, Example Messages
- All sections collapsed by default, expand to edit

**Header Toolbar Buttons:**
- ⭐ Favorite - Toggle character favorite status
- 🌐 World/Lorebook - Open character's linked lorebook
- 📘 Chat Lore - Assign lorebook to current chat
- 📤 Export - Export character (PNG/JSON format)
- 📋 Duplicate - Create a copy of the character
- 🗑️ Delete - Delete character (with confirmation)

**Avatar Upload:**
- Click avatar to select new image
- Camera icon overlay on hover
- Preview updates immediately
- Saved with character data on Save

**Save Button:**
- Shows green glow animation when there are unsaved changes
- Direct API call to `/api/characters/edit`
- Shows success toast on save

#### 3. Technical Implementation

**Capture Phase Event Interception:**
```javascript
// Intercept character selection clicks BEFORE jQuery handlers
document.addEventListener('click', function(e) {
    const characterSelect = e.target.closest('.character_select');
    if (!characterSelect) return;

    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();

    showCharacterProfile(characterSelect.getAttribute('data-chid'));
}, true);  // true = capture phase
```

**Panel Redirect Interceptor:**
When the system tries to show the old character panel (`#rm_ch_create_block`), we intercept and redirect to the character list:
```javascript
// MutationObserver detects when old panel would be shown
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.attributeName === 'style') {
            const inlineDisplay = oldPanel.style.display;
            if (inlineDisplay && inlineDisplay !== 'none') {
                // Redirect to character list instead
                oldPanel.style.display = '';
                charListPanel.style.display = 'flex';
            }
        }
    }
});
observer.observe(oldPanel, { attributes: true, attributeFilter: ['style'] });
```

**Permanently Hide Old Panel (CSS):**
```css
#rm_ch_create_block {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    position: absolute !important;
    left: -99999px !important;
}
```

#### 4. Backend Integration

**Character Save:**
- Uses `/api/characters/edit` endpoint directly
- Sends FormData with all character fields
- Preserves existing data (tags, world info, alternate greetings, extensions)
- Handles avatar file upload

**Character Export:**
- Uses `/api/characters/export` endpoint
- Supports PNG and JSON formats
- Downloads file automatically

**Character Duplicate:**
- Uses `/api/characters/duplicate` endpoint
- Shows confirmation dialog
- Refreshes character list after duplication

**Character Delete:**
- Uses existing `deleteCharacter()` function
- Two-step confirmation (delete character + delete chats option)

#### 5. User Flow

```
Characters Icon → Character List → Click Character → Profile Card
                                                      ↓
                                   [Edit fields, change avatar, etc.]
                                                      ↓
                                   [Save] → Success toast, stay on card
                                                      ↓
                                   [Start Chat] → Close card, start chat
```

**Files:**
- `public/css/bettertavern-character-profile.css` - Complete profile card styles
- `public/scripts/bettertavern-character-profile.js` - Profile card logic, editing, API integration

**Status:** IMPLEMENTED

### Auto-Close Full-Page Panels on Recent Chat Click

**Goal:** When user clicks on a recent chat in the sidebar, automatically close any full-page panels (Extensions, World Info) so they can see the chat.

**Implementation:**
```javascript
// In bettertavern-panels.js
export function closeFullPagePanels() {
    const fullPagePanels = ['WorldInfo', 'rm_extensions_block'];
    fullPagePanels.forEach(panelId => {
        if (isPanelOpen(panelId)) {
            closePanel(panelId);
            onPanelClosed(panelId);
        }
    });
}

// In bettertavern-sidebar.js - click handler for recent chat items
item.addEventListener('click', () => {
    closeFullPagePanels();  // Close full-page panels first
    selectCharacterById(String(index));
});
```

**Files:**
- `public/scripts/bettertavern-panels.js` - Added `closeFullPagePanels()` export
- `public/scripts/bettertavern-sidebar.js` - Calls `closeFullPagePanels()` on recent chat click

**Status:** IMPLEMENTED

### Settings Modal - Panel Embedding Fix (RESOLVED)

**Problem:** Background Images and API Connections panels were not functional when embedded in the Settings modal.

**Root Cause Investigation:**
1. Initial hypothesis: jQuery event handlers lost when elements moved/cloned
2. Investigation revealed: Event handlers attached via `$('#id').on()` DO survive DOM moves
3. **Actual root cause:** CSS visibility issue
   - `.drawer-content` has `height: 0` by default
   - Panels need `openDrawer` class (not `closedDrawer`) to be visible
   - When panels were moved, they kept `closedDrawer` class = invisible

**Solution Implemented:**
1. **CSS** (`public/css/bettertavern-settings.css`):
   - Added high-specificity selectors targeting `.settings-embedded-panel.closedDrawer`
   - Force visibility with `height: auto`, `display: block`, `visibility: visible`
   - Added `pointer-events: auto` to ensure interactivity
   - Set `min-height: 200px` as safety measure

2. **JavaScript** (`public/scripts/bettertavern-settings.js`):
   - Store original `className` before moving panels
   - When moving: remove `closedDrawer`, add `openDrawer`, add `settings-embedded-panel`
   - When restoring: restore original `className` exactly
   - Added console logging for debugging

**Key Technical Insight:**
```javascript
// jQuery event handlers survive DOM moves because they're stored on the element itself
$('#main_api').on('change', handler);  // Handler moves with element

// Document delegation works anywhere in DOM
$(document).on('click', '.bg_example', handler);  // Always works

// The issue was CSS, not JavaScript:
.drawer-content { height: 0; }  // Hidden by default
.drawer-content.openDrawer { height: auto; }  // Visible when open
```

**Files Modified:**
- `public/css/bettertavern-settings.css` - Added embedded panel visibility styles
- `public/scripts/bettertavern-settings.js` - Added class management for panel moves

**Status:** RESOLVED - Panels now display and function correctly in Settings modal

---

## Architecture Notes

### SillyTavern Event Binding Patterns

The original codebase uses two main jQuery event binding patterns:

1. **Document Delegation** (survives DOM moves):
   ```javascript
   $(document).on('click', '.bg_example', onSelectBackgroundClick);
   ```

2. **Direct Element Binding** (survives DOM moves, but may seem lost if element hidden):
   ```javascript
   $('#main_api').on('change', function() { ... });
   ```

### Drawer Panel System

Panels use a drawer system with these key classes:
- `drawer-content` - Base class for panel content
- `closedDrawer` - Panel is closed (height: 0, hidden)
- `openDrawer` - Panel is open (height: auto, visible)
- `pinnedOpen` - Prevents auto-close on outside click

### CSS Specificity Considerations

When overriding SillyTavern styles, use high-specificity selectors:
```css
/* May not work - too low specificity */
.my-class { height: auto; }

/* Better - combine with existing classes */
#rm_api_block.settings-embedded-panel.drawer-content { height: auto !important; }
```
