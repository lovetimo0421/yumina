/**
 * BetterTavern Sidebar Module
 *
 * This module handles the sidebar functionality:
 * - Populates "Recent Worlds" with characters sorted by last chat date
 * - Handles character selection from sidebar
 * - Updates user profile status
 */

import { online_status, getThumbnailUrl, default_avatar, name1, getCurrentChatId, isChatSaving } from '../script.js';

import { eventSource, event_types } from './events.js';
import { translate } from './i18n.js';
import { closeFullPagePanels, getCurrentOpenPanel, closeCurrentPanel } from './bettertavern-panels.js';
import { user_avatar } from './personas.js';
import {
    getRecentChats,
    openRecentChatContextMenu,
    openRecentCharacterChat,
    openRecentGroupChat,
} from './welcome-screen.js';

const RECENT_WORLDS_CONTAINER = '#sidebar-recent-worlds-list';
const MAX_RECENT_WORLDS = 75; // Request extra from backend to compensate for post-filtering
const SIDEBAR_COLLAPSED_KEY = 'bettertavern_sidebar_collapsed';
const AVATAR_CACHE_BUST_KEY = 'bt_user_avatar_cache_bust';

// Track initialization to prevent duplicate setup
let sidebarInitialized = false;
let statusUpdateInterval = null;
let populateInFlight = false; // Concurrency guard for populateRecentWorlds
let populateDebounceTimer = null; // Deduplication timer for event-driven updates
let isSwitchingChat = false; // Blocks sidebar interactions and refreshes during chat switch

/**
 * Check if sidebar is currently collapsed
 * @returns {boolean} True if collapsed
 */
export function isSidebarCollapsed() {
    return document.body.classList.contains('sidebar-collapsed');
}

/**
 * Set sidebar collapsed state
 * @param {boolean} collapsed - Whether to collapse the sidebar
 * @param {boolean} save - Whether to save to localStorage (default true)
 */
export function setSidebarCollapsed(collapsed, save = true) {
    if (collapsed) {
        document.body.classList.add('sidebar-collapsed');
    } else {
        document.body.classList.remove('sidebar-collapsed');
    }

    // Update button title
    const btn = document.getElementById('sidebar-collapse-btn');
    if (btn) {
        btn.title = collapsed ? translate('Expand sidebar') : translate('Collapse sidebar');
    }

    // Save preference
    if (save) {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? 'true' : 'false');
    }
}

/**
 * Toggle sidebar collapsed state
 */
export function toggleSidebarCollapsed() {
    setSidebarCollapsed(!isSidebarCollapsed());
}

/**
 * Initialize sidebar collapse state - always expanded on page load
 */
function initSidebarCollapseState() {
    // Always start expanded on refresh - don't restore collapsed state from localStorage
    // Users can still collapse the sidebar, but it will expand again on next page load
    setSidebarCollapsed(false, false);

    // Set up collapse button click handler
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', toggleSidebarCollapsed);
    }
}

/**
 * Format a date for display in the sidebar
 * @param {number|string} timestamp - The timestamp to format
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return translate('Today');
    } else if (diffDays === 1) {
        return translate('Yesterday');
    } else if (diffDays < 7) {
        return date.toLocaleDateString(undefined, { weekday: 'long' });
    } else {
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
    }
}

/**
 * Create a sidebar world item element
 * @param {object} chat - Recent chat data object
 * @returns {HTMLElement} The world item element
 */
function createWorldItem(chat) {
    const item = document.createElement('div');
    item.className = 'sidebar-world-item';
    item.dataset.avatar = chat.avatar || '';
    item.dataset.group = chat.group || '';
    item.dataset.file = chat.chat_name || '';

    if (chat.pinned) {
        item.classList.add('pinned');
    }

    const avatar = document.createElement('div');
    avatar.className = 'sidebar-world-avatar';

    const img = document.createElement('img');
    img.src = chat.char_thumbnail || default_avatar;
    img.alt = chat.char_name;
    img.onerror = () => { img.src = default_avatar; };
    avatar.appendChild(img);

    const info = document.createElement('div');
    info.className = 'sidebar-world-info';

    const name = document.createElement('span');
    name.className = 'sidebar-world-name';
    name.textContent = chat.char_name;
    name.title = chat.char_name;

    const date = document.createElement('span');
    date.className = 'sidebar-world-date';
    date.textContent = chat.date_short ? chat.date_short : formatDate(chat.last_mes);

    info.appendChild(name);
    info.appendChild(date);

    item.appendChild(avatar);
    item.appendChild(info);

    // Click handler to select this character
    item.addEventListener('click', () => {
        if (isSwitchingChat || isChatSaving) return;
        isSwitchingChat = true;

        const container = document.querySelector(RECENT_WORLDS_CONTAINER);
        container?.classList.add('loading');

        // Close full-page panels (Extensions, World Info) so user sees the chat
        closeFullPagePanels();

        const switchPromise = chat.is_group && chat.group && chat.chat_name
            ? openRecentGroupChat(chat.group, chat.chat_name)
            : chat.avatar && chat.chat_name
                ? openRecentCharacterChat(chat.avatar, chat.chat_name)
                : Promise.resolve();

        switchPromise.finally(() => {
            isSwitchingChat = false;
            container?.classList.remove('loading');
            // One clean refresh after switch completes with correct data
            populateRecentWorlds();
        });
    });

    item.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openRecentChatContextMenu(event, item);
    });

    return item;
}

/**
 * Populate the recent worlds list in the sidebar.
 * Guarded against concurrent calls to prevent race conditions.
 */
export async function populateRecentWorlds() {
    if (populateInFlight) {
        return;
    }
    populateInFlight = true;

    try {
        const container = document.querySelector(RECENT_WORLDS_CONTAINER);
        if (!container) {
            console.warn('[BetterTavern] Recent worlds container not found');
            return;
        }

        let chats;
        try {
            chats = await getRecentChats(MAX_RECENT_WORLDS, { applyHidden: false });
        } catch (error) {
            console.error('[BetterTavern] Failed to fetch recent worlds:', error);
            container.innerHTML = '';
            const errorMsg = document.createElement('div');
            errorMsg.className = 'sidebar-world-item';
            errorMsg.style.opacity = '0.5';
            errorMsg.style.cursor = 'default';
            errorMsg.innerHTML = `<span style="font-size: 12px;">${translate('Failed to load worlds')}</span>`;
            container.appendChild(errorMsg);
            return;
        }

        // Clear only after data is ready to minimize empty-state flash
        container.innerHTML = '';

        if (!chats || chats.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'sidebar-world-item';
            emptyMsg.style.opacity = '0.5';
            emptyMsg.style.cursor = 'default';
            emptyMsg.innerHTML = `<span style="font-size: 12px;">${translate('No worlds yet')}</span>`;
            container.appendChild(emptyMsg);
            return;
        }

        // Create and append world items
        for (const chat of chats) {
            const item = createWorldItem(chat);
            container.appendChild(item);
        }

        // Highlight the currently active world
        updateActiveWorldItem();

        // Re-apply loading state if a switch is still in progress
        if (isSwitchingChat) {
            container.classList.add('loading');
        }
    } finally {
        populateInFlight = false;
    }
}

/**
 * Update the active state of world items in the sidebar
 * to highlight which chat is currently open.
 */
export function updateActiveWorldItem() {
    const container = document.querySelector(RECENT_WORLDS_CONTAINER);
    if (!container) return;

    const currentChatId = getCurrentChatId();
    container.querySelectorAll('.sidebar-world-item').forEach(item => {
        const fileName = item.dataset.file;
        item.classList.toggle('active', !!fileName && fileName === currentChatId);
    });
}

/**
 * Update the user profile section in the sidebar
 */
export function updateUserProfile() {
    const nameElement = document.querySelector('.sidebar-user-name');
    const statusElement = document.querySelector('.sidebar-user-status');
    const statusDot = document.querySelector('.status-dot');
    const avatarImg = document.querySelector('.sidebar-user-avatar img');

    if (nameElement) {
        nameElement.textContent = name1 || 'User';
    }

    // Update sidebar avatar from current persona
    if (avatarImg) {
        let avatarSrc = user_avatar
            ? getThumbnailUrl('persona', user_avatar)
            : 'img/user-default.png';
        const cacheBust = localStorage.getItem(AVATAR_CACHE_BUST_KEY);
        if (cacheBust && user_avatar) {
            avatarSrc += (avatarSrc.includes('?') ? '&' : '?') + 't=' + cacheBust;
        }
        // Only update if different to avoid flicker
        if (avatarImg.src !== avatarSrc && !avatarImg.src.includes(user_avatar)) {
            avatarImg.src = avatarSrc;
        }
    }

    if (statusElement && statusDot) {
        const isConnected = online_status !== 'no_connection';
        statusDot.className = 'status-dot ' + (isConnected ? 'connected' : 'disconnected');

        // Update status text (keep the dot, update text)
        const textNode = statusElement.childNodes[statusElement.childNodes.length - 1];
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = isConnected ? translate('Connected') : translate('Disconnected');
        }
    }
}

/**
 * Initialize the sidebar module
 */
export function initSidebar() {
    // Prevent duplicate initialization
    if (sidebarInitialized) {
        console.log('[BetterTavern] Sidebar already initialized, skipping');
        return;
    }
    sidebarInitialized = true;

    console.log('[BetterTavern] Initializing sidebar...');

    // Initialize collapse state
    initSidebarCollapseState();

    // Initial population
    populateRecentWorlds();
    updateUserProfile();

    // Subscribe to events for updates
    eventSource.on(event_types.CHARACTER_PAGE_LOADED, () => {
        if (isSwitchingChat) return;
        populateRecentWorlds();
    });

    // Debounced wrapper: cancels previous timer to prevent redundant API calls
    // when multiple events fire in rapid succession
    function schedulePopulateRecentWorlds(delay = 500) {
        if (isSwitchingChat) return;
        clearTimeout(populateDebounceTimer);
        populateDebounceTimer = setTimeout(populateRecentWorlds, delay);
    }

    // Update recent worlds only on specific events that affect the list
    // (not on every CHAT_CHANGED which fires too frequently)
    const recentWorldsUpdateEvents = [
        event_types.MESSAGE_SENT,
        event_types.CHAT_CREATED,
        event_types.CHAT_DELETED,
        event_types.GROUP_CHAT_CREATED,
        event_types.GROUP_CHAT_DELETED,
    ];
    for (const event of recentWorldsUpdateEvents) {
        eventSource.on(event, () => {
            schedulePopulateRecentWorlds(500);
        });
    }

    // CHARACTER_DELETED needs a longer delay because getCharacters() must complete
    // before the characters array is updated and filtering can work correctly
    eventSource.on(event_types.CHARACTER_DELETED, () => {
        schedulePopulateRecentWorlds(1500);
    });

    eventSource.on(event_types.SETTINGS_LOADED, () => {
        updateUserProfile();
        if (!isSwitchingChat) populateRecentWorlds();
    });

    // Listen for sidebar-specific refresh events (e.g. pin toggle)
    document.addEventListener('recent-worlds-updated', () => {
        if (isSwitchingChat) return;
        void populateRecentWorlds();
    });

    // Update active highlight when switching chats
    eventSource.on(event_types.CHAT_CHANGED, () => {
        updateActiveWorldItem();
    });

    // Update connection status periodically
    if (!statusUpdateInterval) {
        statusUpdateInterval = setInterval(() => {
            updateUserProfile();
        }, 5000);

        // Clean up interval when page unloads to prevent memory leaks
        window.addEventListener('beforeunload', () => {
            if (statusUpdateInterval) {
                clearInterval(statusUpdateInterval);
                statusUpdateInterval = null;
            }
        });
    }

    // Initialize mobile sidebar (hamburger + slide-out)
    initMobileSidebar();

    // Inject "Assistant" label spans on assistant avatars
    initAssistantAvatarLabels();

    console.log('[BetterTavern] Sidebar initialized');
}

/**
 * Initialize mobile sidebar: hamburger button, slide-out toggle, backdrop close.
 * Only active at phone breakpoint (<600px).
 */
function initMobileSidebar() {
    // Create hamburger button
    const hamburger = document.createElement('button');
    hamburger.id = 'bt-mobile-hamburger';
    hamburger.setAttribute('aria-label', 'Open sidebar');
    hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
    document.body.appendChild(hamburger);

    /**
     * Update hamburger icon based on whether a panel is open.
     * When a panel is open, show back arrow; otherwise show hamburger bars.
     */
    function updateHamburgerIcon() {
        const panelOpen = getCurrentOpenPanel();
        const icon = hamburger.querySelector('i');
        if (!icon) return;
        if (panelOpen) {
            icon.className = 'fa-solid fa-arrow-left';
            hamburger.setAttribute('aria-label', 'Close panel');
        } else {
            icon.className = 'fa-solid fa-bars';
            hamburger.setAttribute('aria-label', 'Open sidebar');
        }
    }

    // Watch for panel open/close to update hamburger icon
    const panelIds = ['left-nav-panel', 'right-nav-panel', 'WorldInfo', 'rm_extensions_block'];
    const iconObserver = new MutationObserver(() => updateHamburgerIcon());
    panelIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) iconObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
    });

    // Context-aware click: close panel if one is open, otherwise open sidebar
    hamburger.addEventListener('click', () => {
        const panelOpen = getCurrentOpenPanel();
        if (panelOpen) {
            closeCurrentPanel();
            updateHamburgerIcon();
            return;
        }
        document.body.classList.add('mobile-sidebar-open');
    });

    // Close sidebar when clicking backdrop (the ::after pseudo-element)
    // We listen on body and check if click is outside the sidebar
    document.body.addEventListener('click', (e) => {
        if (!document.body.classList.contains('mobile-sidebar-open')) return;
        const sidebar = document.getElementById('top-settings-holder');
        if (sidebar && !sidebar.contains(e.target) && e.target !== hamburger && !hamburger.contains(e.target)) {
            document.body.classList.remove('mobile-sidebar-open');
        }
    });

    // Close sidebar when a drawer panel opens (user tapped a nav item)
    const observer = new MutationObserver(() => {
        if (!document.body.classList.contains('mobile-sidebar-open')) return;
        const openDrawer = document.querySelector('#top-settings-holder .openDrawer');
        if (openDrawer) {
            document.body.classList.remove('mobile-sidebar-open');
        }
    });
    const sidebar = document.getElementById('top-settings-holder');
    if (sidebar) {
        observer.observe(sidebar, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    // Clean up state on resize (if user rotates phone to tablet width)
    const mql = window.matchMedia('(max-width: 599px)');
    mql.addEventListener('change', (e) => {
        if (!e.matches) {
            document.body.classList.remove('mobile-sidebar-open');
        }
    });

    // Fix: Reset scroll position when virtual keyboard closes.
    // On mobile, the browser may scroll <html> or <body> to keep the textarea
    // visible when the keyboard opens. When the keyboard closes (textarea blur),
    // the scroll position may not reset, causing the hamburger and reply bar
    // to appear shifted. This listener forces a reset.
    const textarea = document.getElementById('send_textarea');
    if (textarea) {
        textarea.addEventListener('blur', () => {
            if (!window.matchMedia('(max-width: 599px)').matches) return;
            // Small delay to let the keyboard fully close
            setTimeout(() => {
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            }, 100);
        });
    }
}

/**
 * Observe the DOM for .assistant-avatar elements and inject a translatable label span
 * (replaces the CSS ::after pseudo-element which cannot be translated via data-i18n)
 */
function initAssistantAvatarLabels() {
    function injectLabels() {
        document.querySelectorAll('.assistant-avatar').forEach(avatar => {
            if (avatar.querySelector('.assistant-avatar-label')) return;
            const label = document.createElement('span');
            label.className = 'assistant-avatar-label';
            label.textContent = translate('Assistant');
            avatar.appendChild(label);
        });
    }

    // Initial pass
    injectLabels();

    // Observe for dynamically added avatars (character list re-renders)
    const observer = new MutationObserver(() => injectLabels());
    observer.observe(document.body, { childList: true, subtree: true });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
} else {
    // DOM already loaded, wait a bit for SillyTavern to initialize
    setTimeout(initSidebar, 1000);
}
