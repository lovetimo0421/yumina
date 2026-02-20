/**
 * BetterTavern API Module
 * Defaults the API selection to Chat Completion for simplified UX.
 * Settings defaults are handled by the YuminaDefault preset in settings.json.
 */

import { eventSource, event_types } from './events.js';

// Track initialization to prevent duplicate event handlers
let apiModuleInitialized = false;

/**
 * Ensures the API is set to Chat Completion (openai) on page load
 */
function ensureChatCompletionAPI() {
    const mainApiSelect = document.getElementById('main_api');

    if (!mainApiSelect) {
        console.warn('[BetterTavern] main_api selector not found');
        return;
    }

    // Check if current value is Chat Completion
    if (mainApiSelect.value !== 'openai') {
        console.log('[BetterTavern] Switching to Chat Completion API');
        mainApiSelect.value = 'openai';

        // Trigger the change event to update UI
        mainApiSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    console.log('[BetterTavern] API module initialized - Chat Completion active');
}

/**
 * Initialize the API module
 */
function initAPI() {
    // Prevent duplicate initialization
    if (apiModuleInitialized) {
        console.log('[BetterTavern] API module already initialized, skipping');
        return;
    }
    apiModuleInitialized = true;

    // Wait for SillyTavern settings to fully load, then ensure correct API type
    eventSource.on(event_types.SETTINGS_LOADED, () => {
        console.log('[BetterTavern] Settings loaded event received');
        ensureChatCompletionAPI();
    });

    console.log('[BetterTavern] API module registered for SETTINGS_LOADED event');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAPI);
} else {
    initAPI();
}
