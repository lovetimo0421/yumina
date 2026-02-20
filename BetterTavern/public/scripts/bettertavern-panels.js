/**
 * BetterTavern Panels Module
 *
 * Handles panel display behavior:
 * - Single panel open at a time (mutually exclusive)
 * - Floating panels that don't push content (no backdrop, no darkening)
 * - Panels stay open until user clicks same icon or opens another panel
 * - Mobile (<600px): injects a close-button header bar at the top of each panel
 */

// All drawer panel IDs and their human-readable titles
const PANEL_CONFIG = {
    'left-nav-panel':      'AI Configuration',
    'right-nav-panel':     'Characters',
    'WorldInfo':           'World Info',
    'rm_extensions_block': 'Extensions',
};

const ALL_PANEL_IDS = Object.keys(PANEL_CONFIG);

// State
let currentOpenPanel = null;
let panelsInitialized = false;
let panelObserver = null;

/**
 * Close a specific panel by ID
 * @param {string} panelId - The panel ID to close
 */
function closePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    if (panel.classList.contains('openDrawer')) {
        panel.classList.remove('openDrawer');
        panel.classList.add('closedDrawer');
        panel.classList.remove('pinnedOpen');

        // Update the drawer icon
        const drawer = panel.closest('.drawer');
        if (drawer) {
            const icon = drawer.querySelector('.drawer-icon');
            if (icon) {
                icon.classList.remove('openIcon');
                icon.classList.add('closedIcon');
            }
        }
    }
}

/**
 * Close all open panels
 */
function closeAllPanels() {
    ALL_PANEL_IDS.forEach(panelId => closePanel(panelId));
    currentOpenPanel = null;
}

/**
 * Close full-page panels (Extensions, World Info)
 * These are the panels that cover the entire screen
 * Used when user clicks on a recent world to ensure they see the chat
 */
export function closeFullPagePanels() {
    const fullPagePanels = ['WorldInfo', 'rm_extensions_block'];
    fullPagePanels.forEach(panelId => {
        if (isPanelOpen(panelId)) {
            closePanel(panelId);
            onPanelClosed(panelId);
            console.log('[BetterTavern] Closed full-page panel:', panelId);
        }
    });
}

/**
 * Get the currently open panel ID (if any)
 * @returns {string|null} The panel ID or null
 */
export function getCurrentOpenPanel() {
    return currentOpenPanel;
}

/**
 * Close the currently open panel (used by hamburger context-aware logic)
 */
export function closeCurrentPanel() {
    if (currentOpenPanel) {
        closePanel(currentOpenPanel);
        onPanelClosed(currentOpenPanel);
    }
}

/**
 * Handle when a panel is opened
 * @param {string} panelId - The panel that was opened
 */
function onPanelOpened(panelId) {
    // Close any other open panel first
    if (currentOpenPanel && currentOpenPanel !== panelId) {
        closePanel(currentOpenPanel);
    }

    currentOpenPanel = panelId;

    // Add class to push chat content to the right
    document.body.classList.add('panel-open');

    // Add pinnedOpen class to prevent click-outside auto-close
    // This tells script.js to not close this panel when clicking elsewhere
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.add('pinnedOpen');
    }
}

/**
 * Handle when a panel is closed
 * @param {string} panelId - The panel that was closed
 */
function onPanelClosed(panelId) {
    if (currentOpenPanel === panelId) {
        currentOpenPanel = null;

        // Remove class to restore chat content position
        document.body.classList.remove('panel-open');

        // Remove pinnedOpen class
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.remove('pinnedOpen');
        }

        // Optionally restore sidebar state when all panels closed
        // (keeping collapsed for now as per user preference)
    }
}

/**
 * Check if a panel is currently open
 * @param {string} panelId - The panel ID to check
 * @returns {boolean} True if open
 */
function isPanelOpen(panelId) {
    const panel = document.getElementById(panelId);
    return panel && panel.classList.contains('openDrawer');
}

/**
 * Inject mobile close-button headers into each panel.
 * These are hidden by default and shown only at <600px via CSS.
 * Each header has a back arrow and the panel title.
 */
function injectMobilePanelHeaders() {
    ALL_PANEL_IDS.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        // Skip if already injected
        if (panel.querySelector('.bt-mobile-panel-header')) return;

        const title = PANEL_CONFIG[panelId] || 'Panel';

        const header = document.createElement('div');
        header.className = 'bt-mobile-panel-header';
        header.innerHTML = `
            <button class="bt-mobile-panel-back" aria-label="Close panel">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <span class="bt-mobile-panel-title">${title}</span>
        `;

        // Insert at the very top of the panel
        panel.insertBefore(header, panel.firstChild);

        // Wire up close handler
        header.querySelector('.bt-mobile-panel-back').addEventListener('click', (e) => {
            e.stopPropagation();
            closePanel(panelId);
            onPanelClosed(panelId);

            // On mobile, auto-show the sidebar so user can navigate to another panel
            if (window.matchMedia('(max-width: 599px)').matches) {
                document.body.classList.add('mobile-sidebar-open');
            }

            console.log('[BetterTavern] Mobile panel closed via back button:', panelId);
        });
    });

    console.log('[BetterTavern] Mobile panel headers injected');
}

/**
 * Initialize panel management with MutationObserver
 * This watches for class changes on panels to detect open/close
 */
function initPanelObserver() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;

            const target = mutation.target;
            if (!target.classList.contains('drawer-content')) continue;

            const panelId = target.id;
            if (!ALL_PANEL_IDS.includes(panelId)) continue;

            const isNowOpen = target.classList.contains('openDrawer');
            const wasOpen = mutation.oldValue && mutation.oldValue.includes('openDrawer');

            if (isNowOpen && !wasOpen) {
                // Panel just opened
                onPanelOpened(panelId);
            } else if (!isNowOpen && wasOpen) {
                // Panel just closed
                onPanelClosed(panelId);
            }
        }
    });

    // Observe all panels
    ALL_PANEL_IDS.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            observer.observe(panel, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['class']
            });
        }
    });

    return observer;
}

/**
 * Set up click handlers on drawer toggles for single-panel logic
 */
function initDrawerToggleHandlers() {
    document.querySelectorAll('#top-settings-holder .drawer-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const drawer = toggle.closest('.drawer');
            if (!drawer) return;

            const panel = drawer.querySelector('.drawer-content');
            if (!panel) return;

            const panelId = panel.id;
            if (!ALL_PANEL_IDS.includes(panelId)) return;

            // Check if this panel is currently open
            const isCurrentlyOpen = panel.classList.contains('openDrawer');

            if (!isCurrentlyOpen) {
                // Panel is being opened - close others first
                ALL_PANEL_IDS.forEach(otherId => {
                    if (otherId !== panelId) {
                        closePanel(otherId);
                    }
                });
            }
        }, true); // Use capture phase to run before default handler
    });
}

/**
 * Initialize the panels module
 */
export function initPanels() {
    // Prevent duplicate initialization
    if (panelsInitialized) {
        console.log('[BetterTavern] Panel management already initialized, skipping');
        return;
    }
    panelsInitialized = true;

    console.log('[BetterTavern] Initializing panel management...');

    // Set up the MutationObserver (store reference)
    panelObserver = initPanelObserver();

    // Set up click handlers for single-panel logic
    initDrawerToggleHandlers();

    // Inject mobile panel close-button headers
    injectMobilePanelHeaders();

    console.log('[BetterTavern] Panel management initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initPanels, 500);
    });
} else {
    setTimeout(initPanels, 500);
}
