# SillyTavern UI/UX Architecture Analysis

**Analysis Date:** January 2026
**Purpose:** Pre-redesign architecture documentation
**Codebase:** BetterTavern (SillyTavern clone)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [State Management](#3-state-management)
4. [Event System](#4-event-system)
5. [Backend Integration](#5-backend-integration)
6. [Key Files Reference](#6-key-files-reference)
7. [Recommended Redesign Approach](#7-recommended-redesign-approach)
8. [Potential Challenges & Solutions](#8-potential-challenges--solutions)
9. [Files NOT to Modify](#9-files-not-to-modify)

---

## 1. Architecture Overview

### High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                              SILLYTAVERN ARCHITECTURE                              |
+-----------------------------------------------------------------------------------+

+----------------------------------+     +----------------------------------+
|          FRONTEND (Browser)       |     |          BACKEND (Node.js)        |
+----------------------------------+     +----------------------------------+
|                                  |     |                                  |
|  +--------------------------+    |     |  +---------------------------+   |
|  |     index.html (710KB)   |    |     |  |    server.js (entry)      |   |
|  |  - Single Page App       |    |     |  |           |               |   |
|  |  - All UI components     |    |     |  |    server-main.js         |   |
|  |  - Drawer/Panel system   |    |     |  |           |               |   |
|  +--------------------------+    |     |  +---------------------------+   |
|              |                   |     |              |                   |
|              v                   |     |              v                   |
|  +--------------------------+    |     |  +---------------------------+   |
|  |    script.js (480KB)     |    |     |  |    Express Middleware     |   |
|  |  - Main app logic        |    |     |  |  - CSRF Protection        |   |
|  |  - State management      |    |     |  |  - Session (Cookie)       |   |
|  |  - Event coordination    |    |     |  |  - Body Parser            |   |
|  |  - API communication     |    |     |  |  - Compression            |   |
|  +--------------------------+    |     |  +---------------------------+   |
|              |                   |     |              |                   |
|              v                   |     |              v                   |
|  +--------------------------+    |     |  +---------------------------+   |
|  |   public/scripts/ (79+)  |    |     |  |  src/endpoints/ (45+)     |   |
|  |  - Feature modules       |    |     |  |  - /api/characters/*      |   |
|  |  - Extensions (17)       |    |     |  |  - /api/chats/*           |   |
|  |  - Slash commands        |    |     |  |  - /api/settings/*        |   |
|  |  - Autocomplete          |    |     |  |  - /api/worldinfo/*       |   |
|  +--------------------------+    |     |  |  - AI backend proxies     |   |
|              |                   |     |  +---------------------------+   |
|              v                   |     |              |                   |
|  +--------------------------+    |     |              v                   |
|  |    public/css/ (35+)     |    |     |  +---------------------------+   |
|  |  - style.css (6262 ln)   |    |     |  |    Data Storage (Disk)    |   |
|  |  - Feature CSS modules   |    |     |  |  - characters/*.png       |   |
|  |  - CSS custom properties |    |     |  |  - chats/*.jsonl          |   |
|  |  - Theming system        |    |     |  |  - settings.json          |   |
|  +--------------------------+    |     |  |  - themes/*.json          |   |
|                                  |     |  +---------------------------+   |
+----------------------------------+     +----------------------------------+
              |                                        |
              |    HTTP/Fetch (JSON + CSRF Token)      |
              +----------------------------------------+

+-----------------------------------------------------------------------------------+
|                              COMMUNICATION FLOW                                    |
+-----------------------------------------------------------------------------------+

  User Action
       |
       v
  [UI Event Handler]
       |
       v
  [eventSource.emit()]  ──────>  [Subscribed Modules]
       |                              |
       v                              v
  [State Update]              [Side Effects]
       |                         (TTS, SD, etc.)
       v
  [API Call with CSRF]
       |
       v
  [Backend Processing]
       |
       v
  [Disk I/O]
       |
       v
  [Response to Frontend]
       |
       v
  [UI Update via jQuery/DOM]
```

### Technology Stack Summary

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend Framework** | None (Vanilla JS + jQuery) | No React/Vue/Angular |
| **Templating** | Handlebars.js | Server-side compilation |
| **Styling** | Custom CSS + Custom Properties | No Bootstrap/Tailwind |
| **State** | Global Variables + EventEmitter | No Redux/Vuex |
| **HTTP Client** | Fetch API + jQuery AJAX | CSRF protected |
| **Backend** | Express.js (Node.js) | ES Modules |
| **Data Storage** | File System | PNG, JSONL, JSON |
| **Auth** | Cookie Session + CSRF | csrf-sync library |

---

## 2. Frontend Architecture

### 2.1 HTML Structure

**Main Entry:** `public/index.html` (~710KB)

```
<body>
├── #preloader              // Loading screen
├── #bg1                    // Background image container
├── #character_context_menu // Right-click menu
├── #top-bar                // Header with navigation
│   ├── #top-presets-button
│   ├── #api_button_openai
│   ├── #api_button_novel
│   ├── [other API buttons]
│   └── #send_but_sheld
│
├── #top-settings-holder    // Main panel container
│   ├── #left-nav-panel     // Left navigation drawers
│   │   ├── #ai-config-button (drawer)
│   │   ├── #sys-settings-button (drawer)
│   │   ├── #advanced-formatting-button (drawer)
│   │   ├── #WI-SP-button (drawer)
│   │   └── #user-settings-button (drawer)
│   │
│   ├── #sheld              // Central content area
│   │   ├── #chat           // Message display
│   │   └── #character_popup // Character details
│   │
│   └── #right-nav-panel    // Right navigation drawers
│       ├── #backgrounds-button (drawer)
│       ├── #extensions-settings-button (drawer)
│       ├── #persona-management-button (drawer)
│       └── #rightNavHolder (character list)
│
├── #form_sheld             // Message input area
│   ├── #dialogue_del_mes   // Delete confirmation
│   └── #send_form          // Input form
│       ├── #file_form      // File attachments
│       ├── #send_textarea  // Message input
│       └── #send_but       // Send button
│
├── #options                // Context menu popup
└── #message_template       // Message clone template
```

### 2.2 Drawer/Panel System

**How Drawers Work:**

```html
<!-- Drawer Structure Pattern -->
<div id="drawer-id" class="drawer">
    <div class="drawer-toggle drawer-header">
        <div class="drawer-icon fa-solid fa-icon closedIcon"></div>
    </div>
    <div id="panel-id" class="drawer-content closedDrawer">
        <div class="drawer-header">Header</div>
        <div class="scrollableInner">Content</div>
    </div>
</div>
```

**Key CSS Classes:**
- `.drawer` - Container wrapper
- `.drawer-toggle` - Clickable header
- `.drawer-content` - Panel body
- `.openDrawer` / `.closedDrawer` - State classes
- `.fillLeft` / `.fillRight` - Side positioning

**CSS Implementation:**
```css
/* From style.css */
.drawer-content {
    position: absolute;
    top: var(--topBarBlockSize);
    min-width: 450px;
    width: var(--sheldWidth);
    height: 0;
    display: none;
    transition-property: height, display;
    transition-duration: var(--animation-duration-2x);
}

.drawer-content.openDrawer {
    display: block;
    height: auto;
    height: calc-size(auto, size);
}
```

### 2.3 JavaScript Module Organization

**Module Pattern:** ES Modules (import/export)

```
public/scripts/
├── script.js              // Main entry (480KB, 70K+ lines total)
├── events.js              // Event types & eventSource singleton
├── st-context.js          // getContext() API
├── templates.js           // Handlebars rendering
├── popup.js               // Modal/dialog system
├── power-user.js          // Advanced user settings
├── char-data.js           // Character data structures
├── chats.js               // Chat utilities
├── openai.js              // OpenAI API integration
├── textgen-settings.js    // Text generation settings
├── world-info.js          // Lore/world building
├── group-chats.js         // Group conversation logic
├── tags.js                // Tag management
├── personas.js            // User persona management
├── secrets.js             // API key management
├── extensions.js          // Extension loader
│
├── extensions/            // 17 extension subdirectories
│   ├── tts/
│   ├── stable-diffusion/
│   ├── vectors/
│   ├── memory/
│   ├── translate/
│   ├── quick-reply/
│   └── [11 more...]
│
├── slash-commands/        // Slash command system
├── autocomplete/          // Input autocomplete
├── macros/                // Macro engine
├── templates/             // Handlebars templates (58+)
└── util/                  // Utility modules
```

### 2.4 CSS Architecture

**Organization:**
```
public/css/
├── style.css              // Main (6262 lines, @imports others)
├── st-tailwind.css        // Utility classes (custom, not Tailwind)
├── animations.css         // Keyframe animations
├── popup.css              // Dialog styling
├── mobile-styles.css      // Responsive breakpoints
├── world-info.css         // Lore UI
├── extensions-panel.css   // Extension panel
├── toggle-dependent.css   // Conditional visibility
└── [25+ more modules]
```

**Theme System - CSS Custom Properties:**
```css
:root {
    /* Colors */
    --SmartThemeBodyColor: rgb(220, 220, 210);
    --SmartThemeEmColor: rgb(255, 255, 255);
    --SmartThemeQuoteColor: rgb(173, 216, 230);
    --SmartThemeBlurTintColor: rgba(23, 23, 23, 1);
    --SmartThemeBorderColor: rgba(55, 55, 55, 1);

    /* Sizing */
    --fontScale: 1;
    --mainFontSize: calc(var(--fontScale) * 15px);
    --sheldWidth: 50vw;
    --blurStrength: 10;

    /* Animation */
    --animation-duration: 125ms;
    --animation-duration-slow: 375ms;
}
```

**Runtime Theme Application:**
```javascript
// Themes modify CSS variables at runtime
document.documentElement.style.setProperty('--SmartThemeBodyColor', color);
document.documentElement.style.setProperty('--fontScale', scale);
```

---

## 3. State Management

### 3.1 Global State Variables

**Location:** `public/script.js` (exported)

```javascript
// Core State
export let characters = [];           // All loaded characters
export let chat = [];                 // Current chat messages
export let chat_metadata = {};        // Chat metadata
export let this_chid;                 // Current character index
export let name1 = 'User';            // User's display name
export let name2 = 'Assistant';       // Character's name

// Settings
export let settings;                  // Main settings object
export let power_user;                // Advanced settings
export let amount_gen = 80;           // Response length
export let max_context = 2048;        // Context window
export let main_api;                  // Current API ('openai', 'kobold', etc.)

// UI State
export let menu_type = '';            // Current menu ('character', 'create', etc.)
export let is_send_press = false;     // Generation in progress
export let active_character = '';     // Active character tag
export let active_group = '';         // Active group ID
```

### 3.2 Character Data Structure

```javascript
// Character Object (v1CharData)
{
    name: string,                     // Display name
    avatar: string,                   // Filename (unique ID)
    description: string,              // Character description
    personality: string,              // Short personality
    first_mes: string,                // Greeting message
    mes_example: string,              // Example dialogue
    scenario: string,                 // Scene setting
    chat: string,                     // Current chat filename

    data: {
        system_prompt: string,        // System message
        post_history_instructions: string,
        alternate_greetings: string[],
        tags: string[],
        creator: string,
        character_version: string,
        extensions: {
            world: string,            // Associated lore
            depth_prompt: { ... },
            // Extension-specific data
        }
    },

    // Server-added
    create_date: string,              // ISO timestamp
    date_last_chat: number            // Last activity
}
```

### 3.3 Chat Message Structure

```javascript
// Message Object
{
    name: string,                     // Sender name
    mes: string,                      // Message content
    is_user: boolean,                 // User or character
    is_system: boolean,               // System message
    send_date: number,                // Timestamp

    // Swipe support
    swipes: string[],                 // Alternative responses
    swipe_id: number,                 // Current swipe index

    // Generation metadata
    gen_started: number,
    gen_finished: number,
    extra: {
        api: string,                  // API used
        model: string,                // Model name
        token_count: number,
        // Extension data
    }
}
```

### 3.4 Settings Persistence Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Settings Load Flow                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │   POST /api/settings/get      │
              └───────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │  Server reads settings.json   │
              └───────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │  eventSource.emit(            │
              │    SETTINGS_LOADED_BEFORE)    │
              └───────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │  Apply to global variables    │
              │  and UI elements              │
              └───────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │  eventSource.emit(            │
              │    SETTINGS_LOADED_AFTER)     │
              └───────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    Settings Save Flow                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │  User changes setting         │
              └───────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │  saveSettingsDebounced()      │
              │  (1 second delay)             │
              └───────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │  Collect all state into       │
              │  single settings object       │
              └───────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │  POST /api/settings/save      │
              └───────────────────────────────┘
                              │
                              v
              ┌───────────────────────────────┐
              │  eventSource.emit(            │
              │    SETTINGS_UPDATED)          │
              └───────────────────────────────┘
```

### 3.5 The getContext() API

**Location:** `public/scripts/st-context.js`

This is the primary API for extensions to access application state:

```javascript
getContext() returns {
    // State Access
    chat,                      // Current messages array
    characters,                // All characters
    groups,                    // All groups
    name1, name2,              // User/character names
    characterId: this_chid,    // Current character index
    groupId: selected_group,
    chatMetadata: chat_metadata,

    // Message Functions
    addOneMessage(mes, opts),
    deleteLastMessage(),
    deleteMessage(mesId),

    // Generation
    generate(),
    sendStreamingRequest(),
    stopGeneration(),

    // Chat Management
    getCurrentChatId(),
    reloadCurrentChat(),
    saveChat(),
    clearChat(),

    // Tokenization
    getTextTokens(),
    getTokenCountAsync(),

    // Extensions
    extensionPrompts,
    setExtensionPrompt(),

    // Slash Commands
    SlashCommandParser,
    registerSlashCommand(),
    executeSlashCommands(),

    // Variables
    variables: {
        local: { get, set, del },
        global: { get, set, del }
    },

    // Utility
    substituteParams(),
    t(),  // translate
    uuidv4()
}
```

---

## 4. Event System

### 4.1 Implementation

**Custom EventEmitter:** `public/lib/eventemitter.js` (197 lines)

```javascript
// Core Methods
eventSource.on(event, listener)      // Subscribe
eventSource.once(event, listener)    // Subscribe once
eventSource.emit(event, ...args)     // Emit async
eventSource.removeListener(event, fn) // Unsubscribe

// Priority Methods
eventSource.makeFirst(event, fn)     // Run first
eventSource.makeLast(event, fn)      // Run last
```

### 4.2 Key Event Types (93 Total)

**Application Lifecycle:**
```javascript
APP_READY                    // App initialized (auto-fire)
SETTINGS_LOADED_BEFORE       // Before settings apply
SETTINGS_LOADED              // Settings loaded
SETTINGS_LOADED_AFTER        // After settings apply
SETTINGS_UPDATED             // Settings saved
```

**Message Events:**
```javascript
MESSAGE_SENT                 // User message added
MESSAGE_RECEIVED             // AI response received
MESSAGE_EDITED               // Message modified
MESSAGE_DELETED              // Message removed
MESSAGE_SWIPED               // Swipe changed
USER_MESSAGE_RENDERED        // User message displayed
CHARACTER_MESSAGE_RENDERED   // AI message displayed
```

**Generation Events:**
```javascript
GENERATION_STARTED           // Generation began
GENERATION_STOPPED           // User cancelled
GENERATION_ENDED             // Generation complete
STREAM_TOKEN_RECEIVED        // Token streamed
```

**Chat Events:**
```javascript
CHAT_CHANGED                 // Chat switched
CHAT_CREATED                 // New chat
CHAT_DELETED                 // Chat removed
```

**Character Events:**
```javascript
CHARACTER_DELETED
CHARACTER_EDITED
CHARACTER_DUPLICATED
CHARACTER_PAGE_LOADED
```

### 4.3 Event Usage Patterns

```javascript
// Subscribe to events
import { eventSource, event_types } from '../script.js';

eventSource.on(event_types.CHAT_CHANGED, async (chatId) => {
    // Handle chat change
});

// Emit events
await eventSource.emit(event_types.MESSAGE_RECEIVED, messageId);

// Priority ordering (translation runs first, TTS runs last)
eventSource.makeFirst(event_types.CHARACTER_MESSAGE_RENDERED, translateFn);
eventSource.makeLast(event_types.CHARACTER_MESSAGE_RENDERED, ttsFn);
```

### 4.4 Common Event Chains

```
Generation Flow:
GENERATION_STARTED
  → GENERATE_BEFORE_COMBINE_PROMPTS
  → GENERATE_AFTER_COMBINE_PROMPTS
  → STREAM_TOKEN_RECEIVED (repeating)
  → MESSAGE_RECEIVED
  → CHARACTER_MESSAGE_RENDERED
  → GENERATION_ENDED

Chat Loading Flow:
CHAT_CHANGED
  → WORLDINFO_SCAN_DONE
  → MESSAGE_RECEIVED (per message)
  → CHARACTER_MESSAGE_RENDERED (per message)
```

---

## 5. Backend Integration

### 5.1 Communication Method

**Primary:** Fetch API with JSON payloads

```javascript
// Standard API call pattern
const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: getRequestHeaders(),  // Includes CSRF token
    body: JSON.stringify(data),
});

if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
}

const result = await response.json();
```

**CSRF Token Handling:**
```javascript
// Token fetched at startup
const tokenResponse = await fetch('/csrf-token');
const tokenData = await tokenResponse.json();
token = tokenData.token;

// Included in all requests
function getRequestHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
    };
}
```

### 5.2 Main API Endpoints

**Characters:**
```
POST /api/characters/all       // List all characters
POST /api/characters/get       // Get single character
POST /api/characters/create    // Create character
POST /api/characters/edit      // Edit character
POST /api/characters/delete    // Delete character
POST /api/characters/chats     // Get character's chats
```

**Chats:**
```
POST /api/chats/get           // Load chat
POST /api/chats/save          // Save chat
POST /api/chats/delete        // Delete chat
POST /api/chats/rename        // Rename chat
POST /api/chats/export        // Export chat
POST /api/chats/search        // Search chats
```

**Settings:**
```
POST /api/settings/get        // Load settings
POST /api/settings/save       // Save settings
```

**Other:**
```
GET  /csrf-token              // Get CSRF token
POST /api/worldinfo/*         // Lore/world info
POST /api/presets/*           // Presets
POST /api/secrets/*           // API keys
POST /api/extensions/*        // Extensions
```

### 5.3 Data Storage Formats

| Data Type | Format | Location |
|-----------|--------|----------|
| Characters | PNG with JSON metadata | `data/characters/*.png` |
| Chats | JSONL (one message per line) | `data/chats/{char}/*.jsonl` |
| Settings | JSON | `data/settings.json` |
| Themes | JSON | `data/themes/*.json` |
| World Info | JSON | `data/worlds/*.json` |

---

## 6. Key Files Reference

### 6.1 Critical Frontend Files

| File | Purpose | Lines | Risk Level |
|------|---------|-------|------------|
| `public/index.html` | Main UI structure | ~15000 | **HIGH** - All UI |
| `public/script.js` | Core application logic | ~11000 | **CRITICAL** |
| `public/style.css` | Main styles | 6262 | **HIGH** |
| `public/scripts/events.js` | Event system | 98 | **CRITICAL** |
| `public/scripts/st-context.js` | Extension API | ~400 | **HIGH** |
| `public/scripts/templates.js` | Template rendering | ~150 | MEDIUM |
| `public/scripts/popup.js` | Dialog system | ~800 | MEDIUM |
| `public/scripts/power-user.js` | Theme/settings | ~2500 | MEDIUM |

### 6.2 Files By Feature Area

**Chat System:**
- `public/script.js` (chat[], sendMessage, Generate)
- `public/scripts/chats.js`
- `public/scripts/chat-templates.js`
- `src/endpoints/chats.js`

**Character System:**
- `public/script.js` (characters[], this_chid)
- `public/scripts/char-data.js`
- `src/endpoints/characters.js`

**Settings/Themes:**
- `public/scripts/power-user.js`
- `public/style.css` (CSS variables)
- `src/endpoints/settings.js`

**Extensions:**
- `public/scripts/extensions.js`
- `public/scripts/extensions/*/index.js`

### 6.3 Template Files (58+)

Located in `public/scripts/templates/`:
- `admin.html` - User management
- `help.html` - Help topics
- `hotkeys.html` - Keyboard shortcuts
- `itemizationChat.html` - Token breakdown
- `deleteConfirm.html` - Confirmation dialogs
- `masterImport.html` / `masterExport.html`

---

## 7. Recommended Redesign Approach

### 7.1 Strategy: CSS-First Overlay Approach

Given the tightly coupled nature of the codebase, I recommend a **CSS-First Overlay** strategy:

```
┌─────────────────────────────────────────────────────────────┐
│                    REDESIGN STRATEGY                         │
│                  (Minimal Code Changes)                      │
└─────────────────────────────────────────────────────────────┘

Phase 1: CSS Override Layer
├── Create new-theme.css with higher specificity
├── Override existing styles without modifying originals
├── Use CSS custom properties for easy theming
└── Hide unwanted elements via display: none

Phase 2: Component Wrapper System
├── Add wrapper divs around existing structures
├── Use position: absolute overlays for new UI
├── Intercept events before they reach original handlers
└── Proxy state through new clean interfaces

Phase 3: Progressive Enhancement
├── Replace components one at a time
├── Keep original as fallback
├── Feature flag new vs old UI
└── Maintain backward compatibility

Phase 4: Deep Integration (Optional)
├── Only modify script.js if absolutely necessary
├── Use event system for communication
├── Extend rather than replace
└── Document all changes thoroughly
```

### 7.2 Specific Techniques

**1. CSS Override Without Touching Original Files:**

```css
/* new-theme.css - loaded after style.css */

/* Increase specificity with :where() or double class */
body .drawer-content.drawer-content {
    /* New styles override old */
    background: var(--new-bg);
    border-radius: 16px;
}

/* Hide elements without removing from DOM */
.element-to-hide {
    display: none !important;
}

/* New UI layer */
.new-ui-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10000;
    pointer-events: none;
}

.new-ui-overlay > * {
    pointer-events: auto;
}
```

**2. JavaScript Event Interception:**

```javascript
// new-ui.js - loaded after script.js

import { eventSource, event_types, getContext } from './script.js';

// Intercept events without modifying original
eventSource.makeFirst(event_types.MESSAGE_RECEIVED, async (messageId) => {
    // Pre-process before original handlers
    await renderInNewUI(messageId);
});

// Add new events for new UI
const newUIEvents = new EventEmitter();
export { newUIEvents };
```

**3. Component Shadowing (Replace Without Modifying):**

```javascript
// Hide original component
document.querySelector('#original-component').style.display = 'none';

// Create new component in same parent
const newComponent = document.createElement('div');
newComponent.id = 'new-component';
newComponent.innerHTML = await renderTemplateAsync('new-template');

// Insert in same location
document.querySelector('#parent').insertBefore(
    newComponent,
    document.querySelector('#original-component')
);

// Sync state between old and new
const ctx = getContext();
// Use ctx to read state, eventSource to react to changes
```

### 7.3 Implementation Order

```
Week 1-2: Foundation
├── Create new CSS file with base overrides
├── Set up CSS custom properties for new theme
├── Hide non-essential UI elements
└── Create basic new layout structure

Week 3-4: Core Chat UI
├── New message display component
├── New message input area
├── Integrate with existing chat[] state
└── Use MESSAGE_RECEIVED events

Week 5-6: Character/Settings Panels
├── New drawer/panel system
├── Character selection UI
├── Settings interface
└── Theme selector

Week 7-8: Polish & Testing
├── Responsive design
├── Animation polish
├── Cross-browser testing
└── Performance optimization
```

### 7.4 New File Structure

```
public/
├── new-ui/
│   ├── new-ui.js           // New UI entry point
│   ├── components/
│   │   ├── chat-message.js
│   │   ├── chat-input.js
│   │   ├── sidebar.js
│   │   └── modal.js
│   ├── styles/
│   │   ├── new-theme.css   // Main override styles
│   │   ├── components.css
│   │   └── animations.css
│   └── templates/
│       ├── message.html
│       └── sidebar.html
```

---

## 8. Potential Challenges & Solutions

### 8.1 Challenge: Monolithic HTML File (710KB)

**Problem:** `index.html` contains all UI in a single file.

**Solutions:**
1. **CSS Hiding:** Use `display: none` to hide unwanted sections
2. **DOM Manipulation:** Remove elements after page load
3. **Component Replacement:** Replace specific sections with new components

```javascript
// Hide entire sections without removing
document.querySelectorAll('[data-old-ui]').forEach(el => {
    el.style.display = 'none';
});

// Or remove from DOM if not needed
document.querySelector('#old-sidebar').remove();
```

### 8.2 Challenge: Global State Coupling

**Problem:** Many modules directly modify global variables.

**Solutions:**
1. **Read-Only Access:** Use `getContext()` for reading state
2. **Event-Based Updates:** Subscribe to events rather than watching variables
3. **Proxy Pattern:** Create read-only proxies to state

```javascript
// Instead of directly modifying chat[]
// Use the API
const ctx = getContext();
ctx.addOneMessage(newMessage);

// Instead of watching variables
// Subscribe to events
eventSource.on(event_types.CHAT_CHANGED, updateUI);
```

### 8.3 Challenge: jQuery Dependencies

**Problem:** Much of the codebase uses jQuery selectors and methods.

**Solutions:**
1. **Coexistence:** New UI can use vanilla JS alongside jQuery
2. **Bridge Layer:** Create wrapper functions that work with both
3. **Gradual Migration:** Replace jQuery with vanilla JS in touched areas

```javascript
// Bridge function
function $(selector) {
    if (typeof selector === 'string') {
        return document.querySelectorAll(selector);
    }
    return selector;
}
```

### 8.4 Challenge: Tightly Coupled CSS

**Problem:** Styles are interdependent and use same class names.

**Solutions:**
1. **BEM Naming:** Use new naming convention for new components
2. **Scoped Styles:** Use CSS modules or Shadow DOM
3. **Higher Specificity:** Override with more specific selectors

```css
/* Original */
.mes { /* styles */ }

/* New UI - scoped with parent */
.new-ui .mes { /* new styles */ }

/* Or use BEM */
.new-message__container { /* styles */ }
.new-message__text { /* styles */ }
```

### 8.5 Challenge: Breaking Existing Extensions

**Problem:** Extensions depend on specific DOM structure.

**Solutions:**
1. **Keep Original Structure:** Hide rather than remove
2. **Event Compatibility:** Maintain event emissions
3. **API Compatibility:** Ensure `getContext()` still works

```javascript
// Keep elements hidden but functional
element.style.visibility = 'hidden';
element.style.position = 'absolute';
element.style.pointerEvents = 'none';

// Events still fire, extensions still work
```

### 8.6 Challenge: Dynamic Content

**Problem:** Content is generated dynamically via Handlebars.

**Solutions:**
1. **Template Override:** Create new templates with same IDs
2. **Post-Render Hook:** Modify content after rendering
3. **Custom Render:** Bypass templates for new UI

```javascript
// Override template
TEMPLATE_CACHE.set('old-template', Handlebars.compile(newTemplate));

// Post-render modification
eventSource.makeLast(event_types.CHARACTER_MESSAGE_RENDERED, (msgId) => {
    const el = document.querySelector(`[mesid="${msgId}"]`);
    // Modify rendered content
});
```

---

## 9. Files NOT to Modify

### 9.1 Critical Backend Files (DO NOT TOUCH)

```
src/
├── server.js                    // Server entry point
├── server-main.js               // Express setup
├── server-startup.js            // Route registration
├── server-events.js             // Server-side events
├── users.js                     // Authentication
├── endpoints/
│   ├── characters.js            // Character CRUD
│   ├── chats.js                 // Chat CRUD
│   ├── settings.js              // Settings CRUD
│   ├── secrets.js               // API keys
│   └── [all backend endpoints]
└── middleware/
    └── [all middleware]
```

**Reason:** Backend handles data persistence, authentication, and API proxying. Changes could corrupt data or break authentication.

### 9.2 Core State Management (CAUTION)

```
public/
├── script.js                    // Only if absolutely necessary
│   └── Specific areas:
│       - chat[] array management
│       - characters[] array management
│       - Generation logic (Generate function)
│       - API communication functions
│
├── scripts/
│   ├── events.js                // Event type definitions
│   ├── st-context.js            // getContext() API
│   └── extensions.js            // Extension loading
```

**Reason:** These manage core state that all features depend on. Modifications can have cascading effects.

### 9.3 Extension System (DO NOT MODIFY)

```
public/scripts/extensions/
├── [all extension directories]   // Extension code
└── shared.js                     // Shared utilities
```

**Reason:** Extensions are designed to be independent. Modifying them breaks the plugin architecture.

### 9.4 Library Files (NEVER MODIFY)

```
public/lib/
├── jquery-3.5.1.min.js
├── handlebars.min.js
├── dompurify.min.js
└── [all third-party libraries]
```

**Reason:** These are vendored libraries. Modifications will be lost on updates.

### 9.5 Files Safe to Modify

```
public/
├── css/                         // Safe to add new CSS files
│   └── [new-theme.css]          // Create new files
│
├── scripts/
│   └── [new-ui/]                // Create new directory
│
└── index.html                   // Only for adding new script/css includes
    └── Add new <link> and <script> tags at end
```

---

## Appendix: Quick Reference

### A. Import Patterns

```javascript
// Core imports
import {
    eventSource,
    event_types,
    chat,
    characters,
    this_chid,
    getRequestHeaders,
    saveSettingsDebounced,
} from '../script.js';

// Context API
import { getContext } from './st-context.js';

// Templates
import { renderTemplateAsync } from './templates.js';

// Popups
import { Popup, POPUP_TYPE } from './popup.js';
```

### B. Common Operations

```javascript
// Get current character
const char = characters[this_chid];

// Get current chat
const messages = chat;

// Add message to UI
const ctx = getContext();
ctx.addOneMessage(message);

// Save chat
await ctx.saveChat();

// Show popup
await Popup.show.confirm('Title', 'Are you sure?');

// Render template
const html = await renderTemplateAsync('templateName', { data });

// Subscribe to event
eventSource.on(event_types.CHAT_CHANGED, handler);

// Get CSRF headers
const headers = getRequestHeaders();
```

### C. CSS Variable Reference

```css
/* Colors */
--SmartThemeBodyColor        /* Main text */
--SmartThemeEmColor          /* Emphasis/italic */
--SmartThemeQuoteColor       /* Quotes */
--SmartThemeBlurTintColor    /* Panel background */
--SmartThemeBorderColor      /* Borders */

/* Sizing */
--fontScale                  /* Font multiplier */
--mainFontSize              /* Base font size */
--sheldWidth                /* Panel width */
--blurStrength              /* Backdrop blur */

/* Animation */
--animation-duration        /* Base animation */
--animation-duration-slow   /* Slow animation */
```

---

*Document generated for UI/UX redesign planning. Last updated: January 2026*
