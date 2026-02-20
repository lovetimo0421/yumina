/**
 * BetterTavern Auto-Connect Module
 *
 * Automatically connects to the API when a server-provided key is available.
 * This removes the need for users to manually click "Connect" on page load.
 *
 * Listens for the SETTINGS_LOADED event to ensure user settings (including the
 * correct chat_completion_source) are fully loaded before attempting connection.
 */

import { secret_state, SECRET_KEYS, readSecretState } from './secrets.js';
import { oai_settings, chat_completion_sources } from './openai.js';
import { eventSource, event_types } from './events.js';

// Track initialization to prevent duplicate auto-connect attempts
let autoConnectAttempted = false;

// Map chat completion sources to their secret keys (defined once)
const SOURCE_TO_SECRET_KEY = {
    [chat_completion_sources.OPENROUTER]: SECRET_KEYS.OPENROUTER,
    [chat_completion_sources.OPENAI]: SECRET_KEYS.OPENAI,
    [chat_completion_sources.CLAUDE]: SECRET_KEYS.CLAUDE,
    [chat_completion_sources.MAKERSUITE]: SECRET_KEYS.MAKERSUITE,
    [chat_completion_sources.MISTRALAI]: SECRET_KEYS.MISTRALAI,
};

/**
 * Gets secrets for the current API source
 * @returns {Array|null} The secrets array or null if not available
 */
function getSecretsForCurrentSource() {
    const source = oai_settings?.chat_completion_source;
    const secretKey = SOURCE_TO_SECRET_KEY[source];

    if (!secretKey) {
        return null;
    }

    const secrets = secret_state[secretKey];
    return Array.isArray(secrets) ? secrets : null;
}

/**
 * Checks if any API key exists (user's own or server-provided)
 * @returns {boolean}
 */
function hasAnyApiKey() {
    const secrets = getSecretsForCurrentSource();
    return secrets !== null && secrets.length > 0;
}

/**
 * Triggers the API connection
 */
async function triggerConnect() {
    const connectButton = document.getElementById('api_button_openai');
    if (!connectButton) {
        console.warn('[BetterTavern] Connect button not found');
        return;
    }

    console.log('[BetterTavern] Auto-connecting to API...');
    connectButton.click();
}

/**
 * Checks if the API is currently connected
 * @returns {boolean}
 */
function isApiConnected() {
    // Use CSS class check — text-based checks break with non-English locales
    const statusIndicator = document.querySelector('.online_status_indicator');
    if (statusIndicator) {
        return statusIndicator.classList.contains('success');
    }
    return false;
}

/**
 * Checks connection status and auto-connects if needed.
 * Called after SETTINGS_LOADED so oai_settings.chat_completion_source is correct.
 */
async function checkAndAutoConnect() {
    if (autoConnectAttempted) {
        return;
    }
    autoConnectAttempted = true;

    // Refresh secrets in case they weren't loaded yet when settings loaded
    await readSecretState();

    const source = oai_settings?.chat_completion_source;
    console.log(`[BetterTavern] Auto-connect check: source=${source}`);

    if (!hasAnyApiKey()) {
        console.log('[BetterTavern] No API key available for current source, skipping auto-connect');
        return;
    }

    if (isApiConnected()) {
        console.log('[BetterTavern] Already connected, skipping auto-connect');
        return;
    }

    await triggerConnect();
}

// Wait for settings to be fully loaded (including the correct chat_completion_source),
// then attempt auto-connect.
eventSource.on(event_types.SETTINGS_LOADED, () => {
    checkAndAutoConnect();
});

console.log('[BetterTavern] Auto-connect module loaded');
