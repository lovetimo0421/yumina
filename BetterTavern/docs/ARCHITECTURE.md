# BetterTavern Architecture Analysis

**Analysis Date:** January 2026
**Last Updated:** January 28, 2026
**Purpose:** Architecture documentation for UI/UX redesign
**Codebase:** BetterTavern (SillyTavern fork)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [State Management](#3-state-management)
4. [Event System](#4-event-system)
5. [Backend Integration](#5-backend-integration)
6. [Key Files Reference](#6-key-files-reference)
7. [BetterTavern UI Changes](#7-bettertavern-ui-changes)
8. [Development Guidelines](#8-development-guidelines)
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
|  |  - bettertavern-ui.css   |    |     |  |  - characters/*.png       |   |
|  |  - Feature CSS modules   |    |     |  |  - chats/*.jsonl          |   |
|  +--------------------------+    |     |  |  - settings.json          |   |
|                                  |     |  +---------------------------+   |
+----------------------------------+     +----------------------------------+
              |                                        |
              |    HTTP/Fetch (JSON + CSRF Token)      |
              +----------------------------------------+
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
├── #top-bar                // Header (HIDDEN in BetterTavern)
│
├── #top-settings-holder    // LEFT SIDEBAR (transformed in BetterTavern)
│   ├── #sidebar-logo       // NEW: Logo section
│   │   ├── .sidebar-logo-icon
│   │   └── .sidebar-logo-text
│   │
│   ├── #sidebar-nav        // NEW: Navigation wrapper
│   │   ├── #ai-config-button (drawer)
│   │   ├── #API-status (drawer)
│   │   ├── #WI-SP-button (drawer)
│   │   ├── #backgrounds-button (drawer)
│   │   ├── #extensions-settings-button (drawer)
│   │   └── #persona-management-button (drawer)
│   │
│   ├── #sidebar-recent-chats   // NEW: Recent chats section
│   │   ├── .sidebar-section-header
│   │   └── #sidebar-recent-chats-list
│   │
│   └── #sidebar-user-profile   // NEW: User profile section
│       ├── .sidebar-user-avatar
│       └── .sidebar-user-info
│
├── #sheld                  // Central content area (shifted right)
│   ├── #chat               // Message display
│   └── #character_popup    // Character details
│
├── #form_sheld             // Message input area (shifted right)
│   ├── #send_form
│   └── #send_but
│
└── #options                // Context menu popup
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

### 2.3 JavaScript Module Organization

```
public/scripts/
├── script.js                  // Main entry (480KB)
├── bettertavern-sidebar.js    // NEW: BetterTavern sidebar logic
├── events.js                  // Event types & eventSource
├── st-context.js              // getContext() API
├── templates.js               // Handlebars rendering
├── popup.js                   // Modal/dialog system
├── power-user.js              // Advanced user settings
├── char-data.js               // Character data structures
├── chats.js                   // Chat utilities
├── openai.js                  // OpenAI API integration
├── textgen-settings.js        // Text generation settings
├── world-info.js              // Lore/world building
├── group-chats.js             // Group conversation logic
├── tags.js                    // Tag management
├── personas.js                // User persona management
├── secrets.js                 // API key management
├── extensions.js              // Extension loader
│
├── extensions/                // 17 extension subdirectories
│   ├── tts/
│   ├── stable-diffusion/
│   └── [15 more...]
│
├── slash-commands/            // Slash command system
├── autocomplete/              // Input autocomplete
├── macros/                    // Macro engine
├── templates/                 // Handlebars templates (58+)
└── util/                      // Utility modules
```

### 2.4 CSS Architecture

```
public/css/
├── style.css              // Original main (6262 lines)
├── bettertavern-ui.css    // NEW: BetterTavern overrides (540 lines)
├── st-tailwind.css        // Utility classes
├── animations.css         // Keyframe animations
├── popup.css              // Dialog styling
├── mobile-styles.css      // Responsive breakpoints
├── world-info.css         // Lore UI
├── extensions-panel.css   // Extension panel
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

    /* BetterTavern Variables */
    --sidebar-width: 260px;
    --sidebar-collapsed-width: 60px;

    /* Sizing */
    --fontScale: 1;
    --mainFontSize: calc(var(--fontScale) * 15px);
    --sheldWidth: 50vw;
}
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
export let main_api;                  // Current API ('openai', 'kobold', etc.)
export let online_status;             // Connection status

// UI State
export let menu_type = '';            // Current menu
export let is_send_press = false;     // Generation in progress
export let active_character = '';     // Active character tag
export let active_group = '';         // Active group ID
```

### 3.2 Character Data Structure

```javascript
{
    name: string,                     // Display name
    avatar: string,                   // Filename (unique ID)
    description: string,              // Character description
    personality: string,              // Short personality
    first_mes: string,                // Greeting message
    mes_example: string,              // Example dialogue
    scenario: string,                 // Scene setting
    chat: string,                     // Current chat filename
    date_last_chat: number,           // Last activity timestamp

    data: {
        system_prompt: string,
        post_history_instructions: string,
        alternate_greetings: string[],
        tags: string[],
        creator: string,
        extensions: {
            world: string,            // Associated lore
            depth_prompt: { ... },
        }
    }
}
```

### 3.3 The getContext() API

**Location:** `public/scripts/st-context.js`

```javascript
getContext() returns {
    // State Access
    chat,                      // Current messages array
    characters,                // All characters
    groups,                    // All groups
    name1, name2,              // User/character names
    characterId: this_chid,    // Current character index
    chatMetadata: chat_metadata,

    // Message Functions
    addOneMessage(mes, opts),
    deleteLastMessage(),
    deleteMessage(mesId),

    // Generation
    generate(),
    stopGeneration(),

    // Chat Management
    getCurrentChatId(),
    reloadCurrentChat(),
    saveChat(),

    // Tokenization
    getTextTokens(),
    getTokenCountAsync(),

    // Extensions
    extensionPrompts,
    setExtensionPrompt(),

    // Slash Commands
    SlashCommandParser,
    registerSlashCommand(),
}
```

---

## 4. Event System

### 4.1 Implementation

**Custom EventEmitter:** `public/lib/eventemitter.js`

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

### 4.2 Key Event Types (Used by BetterTavern)

```javascript
// Character Events
CHARACTER_PAGE_LOADED        // Characters array populated
CHAT_CHANGED                 // Chat switched (update active state)
SETTINGS_LOADED              // Settings loaded (update user profile)

// Message Events
MESSAGE_SENT                 // User message added
MESSAGE_RECEIVED             // AI response received
MESSAGE_EDITED               // Message modified
CHARACTER_MESSAGE_RENDERED   // AI message displayed
```

### 4.3 BetterTavern Event Subscriptions

```javascript
// From bettertavern-sidebar.js
eventSource.on(event_types.CHARACTER_PAGE_LOADED, () => {
    populateRecentChats();
});

eventSource.on(event_types.CHAT_CHANGED, () => {
    updateActiveChatItem();
    setTimeout(populateRecentChats, 500);  // Update last chat dates
});

eventSource.on(event_types.SETTINGS_LOADED, () => {
    updateUserProfile();
    populateRecentChats();
});
```

---

## 5. Backend Integration

### 5.1 Main API Endpoints

**Characters:**
```
POST /api/characters/all       // List all characters
POST /api/characters/get       // Get single character
POST /api/characters/create    // Create character
POST /api/characters/edit      // Edit character
POST /api/characters/delete    // Delete character
```

**Chats:**
```
POST /api/chats/get           // Load chat
POST /api/chats/save          // Save chat
POST /api/chats/delete        // Delete chat
```

**Settings:**
```
POST /api/settings/get        // Load settings
POST /api/settings/save       // Save settings
```

### 5.2 Data Storage Formats

| Data Type | Format | Location |
|-----------|--------|----------|
| Characters | PNG with JSON metadata | `data/characters/*.png` |
| Chats | JSONL (one message per line) | `data/chats/{char}/*.jsonl` |
| Settings | JSON | `data/settings.json` |
| Themes | JSON | `data/themes/*.json` |
| World Info | JSON | `data/worlds/*.json` |

---

## 6. Key Files Reference

### 6.1 BetterTavern-Specific Files

| File | Purpose | Lines |
|------|---------|-------|
| `public/css/bettertavern-ui.css` | UI redesign CSS overrides | ~560 |
| `public/css/bettertavern-settings.css` | Settings modal styling | ~350 |
| `public/scripts/bettertavern-sidebar.js` | Sidebar functionality | ~230 |
| `public/scripts/bettertavern-settings.js` | Settings modal logic | ~380 |

### 6.2 Critical Original Files

| File | Purpose | Risk Level |
|------|---------|------------|
| `public/index.html` | Main UI structure | **HIGH** |
| `public/script.js` | Core application logic | **CRITICAL** |
| `public/style.css` | Main styles | **HIGH** |
| `public/scripts/events.js` | Event system | **CRITICAL** |
| `public/scripts/st-context.js` | Extension API | **HIGH** |

---

## 7. BetterTavern UI Changes

### 7.1 Overview

BetterTavern uses a **CSS-First Overlay Approach** - all changes are additive CSS overrides and new JavaScript modules. The original SillyTavern files are NOT modified (except for adding script/CSS imports to index.html).

**Rollback:** Simply remove the CSS import and script tag from index.html.

### 7.2 Phase 1: Hide Unused Panels

**Status:** Complete

Hidden elements via `display: none`:
- `#advanced-formatting-button` - AI Response Formatting (text completion not needed for chat)
- `#user-settings-button` - User Settings panel (keeping defaults, may relocate later)
- `#persona-management-button` - Persona Management (now in Settings modal)
- `#backgrounds-button` - Backgrounds (now in Settings modal)

```css
/* bettertavern-ui.css */
#advanced-formatting-button,
#user-settings-button,
#persona-management-button,
#backgrounds-button {
    display: none !important;
}
```

### 7.3 Phase 2: Vertical Left Sidebar Layout

**Status:** Complete

Transformed the horizontal top navigation into a vertical left sidebar:

**Changes:**
1. Body uses CSS Grid with sidebar + main content areas
2. `#top-settings-holder` becomes fixed left sidebar (260px wide)
3. Navigation icons stack vertically with text labels
4. Drawer panels open to the RIGHT of sidebar
5. Main content area shifts right to accommodate sidebar
6. `#top-bar` hidden (integrated into sidebar)
7. Responsive: collapses to icons-only on mobile (<768px)

**CSS Variables:**
```css
:root {
    --sidebar-width: 260px;
    --sidebar-collapsed-width: 60px;
}
```

**Key Selectors:**
```css
body {
    display: grid !important;
    grid-template-columns: var(--sidebar-width) 1fr;
}

#top-settings-holder {
    position: fixed !important;
    left: 0; top: 0; bottom: 0;
    width: var(--sidebar-width) !important;
    flex-direction: column !important;
}

#sheld, #form_sheld, #chat {
    margin-left: var(--sidebar-width) !important;
}
```

### 7.4 Phase 3: Sidebar Structure

**Status:** Complete

Added new sidebar components to `index.html`:

```
#top-settings-holder
├── #sidebar-logo               // Logo section
│   ├── .sidebar-logo-icon      // "T" icon
│   └── .sidebar-logo-text      // "Tavern Lite"
│
├── #sidebar-nav                // Navigation wrapper
│   └── [existing drawer menus moved here]
│
├── #sidebar-recent-chats       // Recent chats section
│   ├── .sidebar-section-header // "RECENT CHATS"
│   └── #sidebar-recent-chats-list
│       └── .sidebar-chat-item  // Generated dynamically
│           ├── .sidebar-chat-avatar
│           └── .sidebar-chat-info
│               ├── .sidebar-chat-name
│               └── .sidebar-chat-date
│
└── #sidebar-user-profile       // User profile section
    ├── .sidebar-user-avatar
    └── .sidebar-user-info
        ├── .sidebar-user-name
        └── .sidebar-user-status
            └── .status-dot     // .connected / .disconnected
```

**JavaScript Module:** `bettertavern-sidebar.js`

Functions:
- `populateRecentChats()` - Populates recent chats from characters array, sorted by `date_last_chat`
- `updateActiveChatItem()` - Updates active state when chat changes
- `updateUserProfile()` - Updates connection status display
- `initSidebar()` - Initializes module and subscribes to events

### 7.5 Phase 4: Settings Modal

**Status:** Complete

Created a full-screen settings modal that opens when clicking the sidebar user profile.

**Features:**
- **Account Section**: User name, avatar upload, language selector, persona description
- **Backgrounds Section**: Embedded backgrounds panel functionality
- **Data Section**: Placeholder (coming soon)
- **Subscription Section**: Placeholder (coming soon)

**Files:**
- `public/css/bettertavern-settings.css` - Modal styling
- `public/scripts/bettertavern-settings.js` - Modal logic

**HTML Structure:**
```html
<div id="settings-modal" class="settings-modal">
    <div class="settings-container">
        <div class="settings-menu">
            <!-- Left navigation: Account, Backgrounds, Data, Subscription -->
        </div>
        <div class="settings-content">
            <!-- Section content panels -->
        </div>
    </div>
</div>
```

**Key Functions:**
- `openSettings()` / `closeSettings()` - Modal control
- `switchSection(name)` - Navigate between sections
- `populateAccountSection()` - Load user data
- `handleNameChange()`, `handleDescriptionChange()` - Auto-save changes
- `handleAvatarUpload()` - Upload new avatar
- `initBackgroundsSection()` - Initialize backgrounds in modal

**Integration:**
- Click handler on `#sidebar-user-profile` opens settings
- Escape key closes modal
- Click outside modal closes it
- Changes auto-save via `saveSettingsDebounced()`

### 7.6 Additional Fixes

**World Info & Extensions Panels - Full Width:**
```css
#WorldInfo,
#rm_extensions_block {
    --sheldWidth: calc(100vw - var(--sidebar-width)) !important;
    width: calc(100vw - var(--sidebar-width)) !important;
}
```

---

## 8. Development Guidelines

### 8.1 Adding New UI Components

1. **CSS-Only Changes:** Add to `bettertavern-ui.css`
2. **New Elements:** Add to `index.html` within appropriate section
3. **JavaScript Logic:** Create new module in `public/scripts/bettertavern-*.js`
4. **Import in index.html:** Add `<script type="module" src="scripts/bettertavern-*.js"></script>`

### 8.2 Accessing State

```javascript
// Import from script.js
import {
    characters,
    this_chid,
    selectCharacterById,
    online_status,
    getThumbnailUrl,
    default_avatar,
    name1,
} from '../script.js';

// Import events
import { eventSource, event_types } from './events.js';
```

### 8.3 Subscribing to Events

```javascript
eventSource.on(event_types.CHAT_CHANGED, () => {
    // React to chat change
});

eventSource.on(event_types.CHARACTER_PAGE_LOADED, () => {
    // React to characters loaded
});
```

### 8.4 CSS Override Strategy

Use higher specificity or `!important` to override original styles:

```css
/* Override with higher specificity */
#top-settings-holder .drawer-toggle {
    /* new styles */
}

/* Or use !important for critical overrides */
body {
    display: grid !important;
}
```

### 8.5 Responsive Design

```css
@media (max-width: 768px) {
    :root {
        --sidebar-width: var(--sidebar-collapsed-width);
    }

    /* Hide text labels, show only icons */
    .sidebar-logo-text,
    .sidebar-section-header,
    .sidebar-chat-info,
    .sidebar-user-info {
        display: none;
    }
}
```

---

## 9. Files NOT to Modify

### 9.1 Critical Backend Files (DO NOT TOUCH)

```
src/
├── server.js                    // Server entry point
├── server-main.js               // Express setup
├── endpoints/                   // All API endpoints
└── middleware/                  // All middleware
```

### 9.2 Core State Management (EXTREME CAUTION)

```
public/
├── script.js                    // Core app logic
├── scripts/
│   ├── events.js                // Event definitions
│   ├── st-context.js            // getContext() API
│   └── extensions.js            // Extension loading
```

### 9.3 Extension System (DO NOT MODIFY)

```
public/scripts/extensions/       // All extension directories
```

### 9.4 Library Files (NEVER MODIFY)

```
public/lib/                      // All third-party libraries
```

### 9.5 Files SAFE to Modify

```
public/
├── css/bettertavern-ui.css      // BetterTavern CSS
├── scripts/bettertavern-*.js    // BetterTavern modules
└── index.html                   // Only for adding imports/new elements
```

---

## Appendix: Quick Reference

### A. Import Patterns

```javascript
// Core imports from script.js
import {
    characters,
    this_chid,
    selectCharacterById,
    online_status,
    getThumbnailUrl,
    default_avatar,
    name1,
    getRequestHeaders,
} from '../script.js';

// Events
import { eventSource, event_types } from './events.js';

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

// Select a character by index
selectCharacterById(String(index));

// Get avatar URL
const avatarUrl = getThumbnailUrl('avatar', character.avatar);

// Check connection status
const isConnected = online_status !== 'no_connection';

// Subscribe to event
eventSource.on(event_types.CHAT_CHANGED, handler);
```

### C. CSS Variable Reference

```css
/* BetterTavern Layout */
--sidebar-width: 260px;
--sidebar-collapsed-width: 60px;
--chat-max-width: 1200px;      /* Max width for centered chat */
--panel-width: 550px;          /* Consistent drawer panel width */

/* Theme Colors */
--SmartThemeBodyColor         /* Main text */
--SmartThemeEmColor           /* Emphasis */
--SmartThemeQuoteColor        /* Quotes */
--SmartThemeBlurTintColor     /* Panel background */
--SmartThemeBorderColor       /* Borders */

/* Sizing */
--fontScale                   /* Font multiplier */
--sheldWidth                  /* Panel width */
```

### D. BetterTavern File Locations

| Purpose | File |
|---------|------|
| CSS Overrides | `public/css/bettertavern-ui.css` |
| Settings Modal CSS | `public/css/bettertavern-settings.css` |
| Start New Page CSS | `public/css/bettertavern-startnew.css` |
| Sidebar Logic | `public/scripts/bettertavern-sidebar.js` |
| Settings Modal Logic | `public/scripts/bettertavern-settings.js` |
| Input Menu Logic | `public/scripts/bettertavern-input.js` |
| API Default Logic | `public/scripts/bettertavern-api.js` |
| AI Config Tabs Logic | `public/scripts/bettertavern-ai-config.js` |
| Start New Page Logic | `public/scripts/bettertavern-startnew.js` |
| Message Actions Logic | `public/scripts/bettertavern-message-actions.js` |
| Panel Management Logic | `public/scripts/bettertavern-panels.js` |
| Architecture Docs | `docs/ARCHITECTURE.md` |

---

## Changelog

### February 3, 2026 (Session 12)
- **Branding Finalization:**
  - Page titles changed from "SillyTavern" to "Yumina" (index.html, login.html)
  - manifest.json name/short_name updated to "Yumina"
  - Favicon changed from favicon.ico to img/logo.png (Yumina logo)
  - Welcome messages updated to reference Yumina

- **Logo Sizes Increased by 10%:**
  - Sidebar: logo 35px → 38px, wordmark 22px → 24px
  - Login page: logo 53px → 58px, wordmark 31px → 34px

- **Settings Logout Button Fixed:**
  - Removed placeholder Login button from Settings > Account
  - Wired Logout button to actual `logout()` function
  - Exported `logout()` from user.js for module import

- **Chat App Layout (User Right, AI Left):**
  - User messages use `flex-direction: row-reverse` to put avatar on right
  - User message bubbles shrink to fit content (`width: fit-content`)
  - Max-width 92% prevents overlap with avatar
  - Text inside bubbles stays left-aligned for readability
  - Timestamps hidden on user messages (only shown on AI)
  - Name/header aligned to right for user messages

### January 30, 2026 (Session 11)
- **UI Improvements:**
  1. **Message Action Icons - Bottom Left & Hover Only**
     - Moved `.mes_buttons` from header (top right) to bottom-left of message
     - Hidden by default, shown on hover (`.mes:hover`)
     - CSS: Position absolute, opacity transitions

  2. **Hide Main API Selector**
     - Hidden `#main-API-selector-block` (only Chat Completion is used)
     - "Chat Completion Source" dropdown remains visible

  3. **Hide Deprecated Extras API**
     - Hidden "(DEPRECATED) Extras API" section in Extensions panel
     - Uses `:has()` selector with fallback for browser compatibility

  4. **Panel Flash/Resize Bug Fix**
     - Consolidated `--panel-width` to single definition (550px)
     - Applied consistent width to ALL drawer states
     - Eliminated width changes during panel transitions

  5. **Menu Tab Order Change**
     - New order: AI Config → Characters → World Info → Extensions
     - Used CSS flexbox `order` property

  6. **World Info Default Settings**
     - `world_info_budget`: 25 → 100 (Context %)
     - Added `world_info_max_recursion_steps`: 5

  7. **Settings Modal Panel UI Improvements**
     - Rewrote embedded panel styles for Backgrounds/API
     - Fixed grid layout, spacing, visual hierarchy

  8. **Reply Bar Width Alignment**
     - Simplified positioning with `margin: 0 auto`
     - `#sheld` and `#form_sheld` now use identical logic

### January 29, 2026 (Session 10)
- **Phase 10:** Major UI/UX Improvements

  **1. API Connections moved to Settings Panel**
  - Removed API button from left sidebar
  - Added "API Connections" section to Settings modal (above Backgrounds)
  - CSS: Hidden `#sys-settings-button` in sidebar
  - JS: Added `initApiSection()` to `bettertavern-settings.js`
  - Full API functionality preserved with bidirectional sync

  **2. Sidebar Collapse/Expand**
  - Added collapse button (<<) to sidebar header
  - Collapsed state: 60px wide, icons only
  - Expanded state: 260px wide, icons + text labels
  - User preference saved to localStorage
  - CSS: Added `.sidebar-collapsed` styles
  - JS: Added `setSidebarCollapsed()`, `toggleSidebarCollapsed()` to `bettertavern-sidebar.js`

  **3. Fixed Panel Display (AI Config & Characters)**
  - When AI Config or Characters panel opens:
    - Panel displays alongside chat (not overlay)
    - Sidebar auto-collapses to 60px
    - Chat area shrinks to accommodate panel
  - CSS: Added `body.panel-open` styles and layout adjustments
  - New file: `public/scripts/bettertavern-panels.js`

  **4. Single Panel Open Logic**
  - Only one drawer panel can be open at a time
  - Opening a new panel automatically closes the previous one
  - Clicking the same icon again closes the panel
  - Implemented via MutationObserver in `bettertavern-panels.js`

### January 29, 2026 (Session 9)
- **Phase 9:** Simplified Message UI
  - Removed "Save checkpoint" from + menu (input bar)
    - Modified `public/index.html` - removed checkpoint menu item
    - Modified `public/scripts/bettertavern-input.js` - removed checkpoint handler
    - + menu now only has: Attach file, Restart chat
  - Simplified message buttons to only show essential actions
    - Hidden buttons: translate, generate image, narrate, prompt, hide/unhide, media gallery/list, embed, create checkpoint, create branch, swipe left/right
    - Visible buttons: Copy, Edit, Regenerate, Revert
    - CSS added to `bettertavern-ui.css` (Phase 9 section)
  - Added new Regenerate and Revert buttons
    - **Regenerate** (🔄) - Regenerates the AI response for that message
    - **Revert** (⏪) - Backtrack to this message, deleting all messages after it
    - New file: `public/scripts/bettertavern-message-actions.js`
  - User feedback: checkpoint/branch features were confusing and not useful for average users

- **Config:** Increased default AI limits
  - `openai_max_context`: 32768 → 200000 (200K context)
  - `openai_max_tokens`: 1200 → 20000 (20K max response)
  - Reason: Previous limits were causing silent generation failures

### January 29, 2026 (Session 8)
- **Feature:** Multi-User Login System Enabled
  - Enabled SillyTavern's built-in user accounts system
  - Configuration in `default/config.yaml`:
    - `enableUserAccounts: true` - Enables login page and per-user data isolation
    - `enableDiscreetLogin: true` - Hides user list on login screen for privacy
    - `basicAuthMode: false` - Disabled (login page replaces browser popup)
  - Features:
    - Each user gets isolated data directory (`data/[username]/`)
    - Separate characters, chats, settings per user
    - Admin can manage users through admin panel
  - **Fixed:** `docker/docker-entrypoint.sh` now supports user accounts mode
    - New env var: `ST_ENABLE_ACCOUNTS=true` enables multi-user login
    - Takes priority over basic auth (`ST_AUTH_USER`/`ST_AUTH_PASS`)
  - **Added:** `docker/init-users.js` - Creates users from `docker/users.json` on startup
    - User list in `docker/users.json` — simple JSON array of handle strings
    - To add users: append handles to `users.json` and redeploy
    - Password = username for all accounts, `timo` is the only admin
    - Skips users that already exist (safe to redeploy)

  **Railway Deployment Instructions:**
  1. In Railway dashboard, go to your service's Variables
  2. Add: `ST_ENABLE_ACCOUNTS=true`
  3. Remove: `ST_AUTH_USER` and `ST_AUTH_PASS` (no longer needed)
  4. Add users to `docker/users.json` and push
  5. Login with username/username (e.g. timo/timo)

- **Feature:** Default Settings Applied to All Users
  - Modified `default/content/settings.json` to set BetterTavern defaults for ALL new users
  - Previous approach (localStorage-based) only worked per-browser, not per-user
  - Changes to default settings.json:
    - `main_api: "openai"` (was "koboldhorde") - Chat Completion API by default
    - `oai_settings.openai_max_context: 32768` (was 4095) - 32K context
    - `oai_settings.openai_max_tokens: 1200` (was 300) - longer responses
    - `oai_settings.temp_openai: 0.9` (was 1.0) - better for roleplay
    - `oai_settings.stream_openai: true` (already correct) - streaming enabled
  - Now every new user gets these optimal defaults from first login

- **Feature:** Auto Continue Enabled by Default
  - Added `power_user.auto_continue` to `default/content/settings.json`
  - Settings:
    - `enabled: true` - Auto-continue is ON
    - `allow_chat_completions: true` - Works with OpenAI/Claude APIs
    - `target_length: 400` - Continues if response is under 400 tokens
  - Behavior: If AI response is shorter than target, automatically triggers "Continue"
  - Location in UI: User Settings panel → Auto-Continue section (hidden in BetterTavern)

### January 29, 2026 (Session 7)
- **Bug Fix:** AI Config Simple Tab - Prompt Manager Not Showing
  - Fixed CSS issue where `#openai_settings` was hidden entirely with `display: none`
  - Problem: When parent has `display: none`, children cannot be shown
  - Solution: Hide all CHILDREN of `#openai_settings` individually (`> *`), then show only the Prompt Manager
  - Now Simple tab correctly shows: Context Size, Max Response, Temperature, AND Prompt Manager

- **Bug Fix:** Default Settings Not Being Applied (Fixed Properly)
  - **Root cause:** Script ran at 1500ms timeout, but SillyTavern's SETTINGS_LOADED event fires later and overwrote our values
  - **Solution:** Now uses `eventSource.on(event_types.SETTINGS_LOADED)` to apply defaults AFTER SillyTavern loads settings
  - Also directly modifies `oai_settings` object (not just UI elements)
  - Changed localStorage key to `bettertavern_defaults_applied_v2` to force re-application for existing users
  - Default values:
    - Context Size: 32768 (32K) - good for all premium APIs
    - Max Response: 1200 tokens - longer, detailed roleplay responses
    - Temperature: 0.9 - good for creative writing
    - Streaming: ON - better UX

- **Removed:** Smart World Info Popup (unnecessary feature)
  - Deleted `bettertavern-worldinfo.js` - the popup was redundant
  - **Reason:** SillyTavern already handles character-linked world info automatically:
    - On import: SillyTavern asks "Would you like to import it?" and links it to the character
    - On chat: `getCharacterLore()` automatically loads the character's linked world info
    - No manual activation needed - switching characters automatically uses the correct world info
  - Removed script import from `index.html`

- **UI Cleanup:** Hide "Assistant" character from UI
  - The default `default_Assistant.png` system character is now hidden from:
    - Sidebar recent chats (filtered in `bettertavern-sidebar.js`)
    - Main character list (CSS selector hiding `[title*="default_Assistant.png"]`)
    - Start New modal library grid (filtered in `bettertavern-startnew.js`)
    - **Welcome screen chat area** (CSS: `.mes[ch_name="Assistant"]` hidden)
  - Character still exists on backend (not deleted) to avoid breaking any dependencies
  - Can be controlled via `HIDDEN_AVATARS` array in sidebar/startnew modules

### January 29, 2026 (Session 6 - continued)
- **Phase 9:** Start New Page
  - **Start New Page** - Unified entry point for starting chats
    - Three options: Import Card, Your Library, Quick Start
    - Drag-and-drop character card import
    - Grid view of existing characters for quick selection
    - Quick start for chatting without a character
    - Accessible via "Start New" button in sidebar
    - New files: `bettertavern-startnew.js`, `bettertavern-startnew.css`
    - Added modal HTML to `index.html`
  - **Phase 8 Bug Fix** - Fixed Simple tab showing extra settings
    - Changed CSS selector from descendant (`.range-block`) to direct child (`> *`)
    - Now properly hides ALL settings except essentials in Simple view

### January 29, 2026 (Session 6)
- **Phase 8:** Two-Tab AI Config Panel
  - Added Simple/Advanced tab system to AI Config panel
  - Simple tab shows only: Context Size, Max Response Length, Temperature, Prompt Manager
  - Advanced tab shows full original SillyTavern AI Config
  - Both tabs control the SAME underlying settings (not separate copies)
  - New file: `bettertavern-ai-config.js` - Tab switching logic
  - CSS added to `bettertavern-ui.css` (Phase 8 section)

- **Phase 7:** Simplified API Page - Chat Completion Only
  - Hidden non-Chat Completion API options from the main API selector dropdown
    - Text Completion (textgenerationwebui) - hidden
    - NovelAI (novel) - hidden
    - AI Horde (koboldhorde) - hidden
    - KoboldAI Classic (kobold) - hidden
  - Hidden API connector blocks for non-Chat Completion APIs
  - Hidden settings/presets blocks for non-Chat Completion APIs
  - Hidden AI Config sections for non-Chat Completion APIs
  - New file: `bettertavern-api.js` - Defaults to Chat Completion API on page load
  - CSS added to `bettertavern-ui.css` (Phase 7 section)

### January 28, 2026 (Session 5)
- **Phase 6:** UI Polish & Bug Fixes
  - Fixed backgrounds loading bug in Settings modal (was looking for non-existent `.scrollableInner`)
  - Added simplified input menu with plus (+) button
    - Merged original two icons (`#options_button`, `#extensionsMenuButton`) into one
    - Three options only: Attach file, Save checkpoint, Restart chat
  - Renamed "Subscription" to "Privacy" in Settings menu
  - New file: `bettertavern-input.js` for input menu logic

### January 28, 2026 (Session 4)
- **Revert:** Removed World Card Panel (Phase 5)
  - Deleted `bettertavern-worldcard.css` and `bettertavern-worldcard.js`
  - Removed World Card HTML from index.html
  - Restored World Info button visibility in sidebar
  - Sidebar Recent Chats now go directly to chat (no panel auto-open)
  - Decision: Keep Character and World Info panels separate (original SillyTavern architecture)

### January 28, 2026 (Session 2)
- **Phase 4:** Settings Modal
  - Created full-screen settings modal (`bettertavern-settings.css`, `bettertavern-settings.js`)
  - Account section: name, avatar upload, language, persona description
  - Backgrounds section: embedded backgrounds functionality
  - Data & Subscription placeholders
  - Hidden persona-management and backgrounds buttons from sidebar
  - Click sidebar user profile to open settings

### January 28, 2026 (Session 1)
- **Phase 1:** Hidden AI Response Formatting and User Settings buttons
- **Phase 2:** Transformed horizontal nav to vertical left sidebar
- **Phase 3:** Added sidebar structure (logo, nav wrapper, recent chats, user profile)
- **Fix:** World Info and Extensions panels now full-width

---

*Document maintained for BetterTavern UI/UX development. See git history for detailed changes.*
