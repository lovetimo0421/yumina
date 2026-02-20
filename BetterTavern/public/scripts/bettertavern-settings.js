/**
 * BetterTavern Settings Module
 * Handles the full-screen settings modal with Account, Backgrounds, Data, and Subscription sections
 */

import {
    name1,
    setUserName,
    getThumbnailUrl,
    getRequestHeaders,
    saveSettingsDebounced,
    default_avatar,
} from '../script.js';

import { power_user } from './power-user.js';
import { getUserAvatars, setUserAvatarFromSettings, syncUserMessagesToCurrentIdentity, user_avatar } from './personas.js';
import { getBackgrounds, initBackgrounds } from './backgrounds.js';
import { eventSource, event_types } from './events.js';
import { logout } from './user.js';
import { translate } from './i18n.js';

// Module state
let isSettingsOpen = false;
let currentSection = 'account';
let languagesData = null;
const AVATAR_CACHE_BUST_KEY = 'bt_user_avatar_cache_bust';

// Store original panel locations and state for restoration
const panelOriginalParents = {
    api: null,
    backgrounds: null,
};
const panelOriginalNextSiblings = {
    api: null,
    backgrounds: null,
};

/**
 * Opens the settings modal
 */
export function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    // Remove hidden class first, then trigger animation
    modal.classList.remove('hidden');
    // Force reflow to ensure transition works
    modal.offsetHeight;
    modal.classList.add('open');
    isSettingsOpen = true;

    // Populate data
    populateAccountSection();
    populateLanguageSelector();

    // Switch to account section by default
    switchSection('account');
}

/**
 * Closes the settings modal
 */
export function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.classList.remove('open');
    isSettingsOpen = false;

    // Restore panels to their original locations
    restoreAllPanels();

    // Wait for animation to finish before hiding
    setTimeout(() => {
        if (!isSettingsOpen) {
            modal.classList.add('hidden');
        }
    }, 300);
}

/**
 * Restores all moved panels to their original locations
 */
function restoreAllPanels() {
    // Restore API panel
    restorePanel('api', 'rm_api_block');

    // Restore Backgrounds panel
    restorePanel('backgrounds', 'Backgrounds');
}

/**
 * Restores a single panel to its original location
 * @param {string} key - The panel key (api, backgrounds)
 * @param {string} panelId - The panel element ID
 */
function restorePanel(key, panelId) {
    const panel = document.getElementById(panelId);
    const originalParent = panelOriginalParents[key];

    if (panel && originalParent) {
        // Only remove the class we added — preserve any runtime class changes
        // that SillyTavern made while the panel was inside the settings modal
        // (e.g., toggleChatCompletionForms(), onModelChange() visibility toggles)
        panel.classList.remove('settings-embedded-panel');

        // Restore to original location
        const nextSibling = panelOriginalNextSiblings[key];
        if (nextSibling && nextSibling.parentNode === originalParent) {
            originalParent.insertBefore(panel, nextSibling);
        } else {
            originalParent.appendChild(panel);
        }

        // Clear stored references
        panelOriginalParents[key] = null;
        panelOriginalNextSiblings[key] = null;
    }
}

/**
 * Toggles the settings modal
 */
export function toggleSettings() {
    if (isSettingsOpen) {
        closeSettings();
    } else {
        openSettings();
    }
}

/**
 * Switches to a different settings section
 * @param {string} sectionName - The section to switch to (account, backgrounds, data, privacy)
 */
export async function switchSection(sectionName) {
    currentSection = sectionName;

    // Update menu items
    document.querySelectorAll('.settings-menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });

    // Update sections
    document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.toggle('active', section.id === `settings-${sectionName}`);
    });

    // Special handling for sections that need dynamic content
    if (sectionName === 'api') {
        await initApiSection();
    } else if (sectionName === 'backgrounds') {
        await initBackgroundsSection();
    }
}

/**
 * Populates the account section with current user data
 */
function populateAccountSection() {
    // User name
    const nameInput = document.getElementById('settings-user-name');
    if (nameInput) {
        nameInput.value = name1 || 'User';
    }

    // User avatar
    updateAvatarDisplay();

    // Persona description
    const descriptionTextarea = document.getElementById('settings-persona-description');
    if (descriptionTextarea) {
        descriptionTextarea.value = power_user.persona_description || '';
    }
}

/**
 * Updates the avatar display in settings
 * @param {number} [cacheBust] - Optional timestamp to bust browser cache
 */
function updateAvatarDisplay(cacheBust) {
    const avatarContainer = document.getElementById('settings-avatar-display');
    if (!avatarContainer) return;

    let avatarSrc = user_avatar
        ? getThumbnailUrl('persona', user_avatar)
        : default_avatar;
    const storedCacheBust = localStorage.getItem(AVATAR_CACHE_BUST_KEY);

    // Add cache-busting parameter if provided
    const cacheToken = cacheBust || storedCacheBust;
    if (cacheToken && user_avatar) {
        avatarSrc += (avatarSrc.includes('?') ? '&' : '?') + 't=' + cacheToken;
    }

    avatarContainer.innerHTML = `<img src="${avatarSrc}" alt="User Avatar">`;
}

/**
 * Populates the language selector with available languages
 */
async function populateLanguageSelector() {
    const selector = document.getElementById('settings-language');
    if (!selector) return;

    // Fetch languages if not cached
    if (!languagesData) {
        try {
            const response = await fetch('/locales/lang.json');
            languagesData = await response.json();
        } catch (error) {
            console.error('Failed to fetch languages:', error);
            return;
        }
    }

    // Clear existing options
    selector.innerHTML = '';

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = translate('Browser Default');
    selector.appendChild(defaultOption);

    // Add language options
    for (const lang of languagesData) {
        const option = document.createElement('option');
        option.value = lang.lang;
        option.textContent = lang.display;
        selector.appendChild(option);
    }

    // Set current value
    const currentLang = localStorage.getItem('language') || '';
    selector.value = currentLang;
}

/**
 * Initializes the API connections section by MOVING the original API panel
 * This preserves all event handlers and functionality
 */
async function initApiSection() {
    const container = document.getElementById('settings-api-container');
    if (!container) return;

    // Get the original API panel
    const originalApiPanel = document.getElementById('rm_api_block');
    if (!originalApiPanel) {
        container.innerHTML = '<div class="placeholder-content"><p>API panel not found</p></div>';
        return;
    }

    // Check if panel is already in settings container
    if (originalApiPanel.parentNode === container) {
        return; // Already moved
    }

    // Store original location for later restoration
    panelOriginalParents.api = originalApiPanel.parentNode;
    panelOriginalNextSiblings.api = originalApiPanel.nextSibling;

    // Clear container and move the original panel into it
    container.innerHTML = '';

    // Add settings class - CSS handles visibility without needing openDrawer
    // Avoid changing drawer classes to prevent side effects from drawer system
    originalApiPanel.classList.add('settings-embedded-panel');

    container.appendChild(originalApiPanel);

    console.log('[BetterTavern] API panel moved to settings');
}

/**
 * Initializes the backgrounds section by MOVING the original backgrounds panel
 * This preserves all event handlers and functionality
 */
async function initBackgroundsSection() {
    const container = document.getElementById('settings-backgrounds-container');
    if (!container) return;

    // Get the original backgrounds panel
    const originalBackgrounds = document.getElementById('Backgrounds');
    if (!originalBackgrounds) {
        container.innerHTML = '<div class="placeholder-content"><p>Backgrounds panel not found</p></div>';
        return;
    }

    // Check if panel is already in settings container
    if (originalBackgrounds.parentNode === container) {
        return; // Already moved
    }

    // Ensure backgrounds are loaded
    await getBackgrounds();

    // Store original location for later restoration
    panelOriginalParents.backgrounds = originalBackgrounds.parentNode;
    panelOriginalNextSiblings.backgrounds = originalBackgrounds.nextSibling;

    // Clear container and move the original panel into it
    container.innerHTML = '';

    // Add settings class - CSS handles visibility without needing openDrawer
    // Avoid changing drawer classes to prevent side effects from drawer system
    originalBackgrounds.classList.add('settings-embedded-panel');

    container.appendChild(originalBackgrounds);

    console.log('[BetterTavern] Backgrounds panel moved to settings');
}

/**
 * Handles user name change
 * @param {string} newName - The new user name
 */
async function handleNameChange(newName) {
    if (!newName || newName === name1) return;

    setUserName(newName);
    saveSettingsDebounced();
    await syncUserMessagesToCurrentIdentity({ updateAvatar: false, save: true });

    // Update sidebar display
    const sidebarName = document.querySelector('.sidebar-user-name');
    if (sidebarName) {
        sidebarName.textContent = newName;
    }
}

/**
 * Handles persona description change
 * @param {string} description - The new description
 */
function handleDescriptionChange(description) {
    power_user.persona_description = description;

    // Also update the persona description for current avatar.
    // Create the entry if it doesn't exist yet (e.g., new persona that was
    // never edited through SillyTavern's own Persona Management UI).
    if (user_avatar) {
        if (!power_user.persona_descriptions[user_avatar]) {
            power_user.persona_descriptions[user_avatar] = { description: '', position: 0 };
        }
        power_user.persona_descriptions[user_avatar].description = description;
    }

    saveSettingsDebounced();
}

/**
 * Handles language change
 * @param {string} language - The new language code
 */
function handleLanguageChange(language) {
    if (language) {
        localStorage.setItem('language', language);
    } else {
        localStorage.removeItem('language');
    }

    // Reload page to apply language change
    location.reload();
}

/**
 * Handles avatar file upload
 * @param {File} file - The uploaded file
 */
async function handleAvatarUpload(file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    // If there's a current avatar, overwrite it
    if (user_avatar) {
        formData.append('overwrite_name', user_avatar);
    }

    try {
        const response = await fetch('/api/avatars/upload', {
            method: 'POST',
            headers: getRequestHeaders({ omitContentType: true }),
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Failed to upload avatar: ${response.statusText}`);
        }

        const data = await response.json();
        const newAvatarPath = data?.path || user_avatar;

        // Refresh avatars and update display
        await getUserAvatars(true, newAvatarPath);

        // Set the uploaded avatar as the current one (settings-driven)
        if (newAvatarPath) {
            setUserAvatarFromSettings(newAvatarPath, { forceReload: true });
        }

        // Use cache-busting timestamp to force browser to reload the image
        const cacheBust = Date.now();
        localStorage.setItem(AVATAR_CACHE_BUST_KEY, String(cacheBust));

        // Update the display in settings modal
        updateAvatarDisplay(cacheBust);

        // Also update sidebar avatar with cache-busting
        const sidebarAvatar = document.querySelector('.sidebar-user-avatar img');
        if (sidebarAvatar) {
            let sidebarSrc = getThumbnailUrl('persona', newAvatarPath);
            sidebarSrc += (sidebarSrc.includes('?') ? '&' : '?') + 't=' + cacheBust;
            sidebarAvatar.src = sidebarSrc;
        }

        await syncUserMessagesToCurrentIdentity({ updateAvatar: true, save: true });
        saveSettingsDebounced();
    } catch (error) {
        console.error('Failed to upload avatar:', error);
        alert(translate('Failed to upload avatar. Please try again.'));
    }
}

/**
 * Initializes the settings module
 */
export function initSettings() {
    // Close button
    const closeBtn = document.querySelector('.settings-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettings);
    }

    // Click outside to close
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSettings();
            }
        });
    }

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isSettingsOpen) {
            closeSettings();
        }
    });

    // Menu item clicks
    document.querySelectorAll('.settings-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            if (section) {
                switchSection(section);
            }
        });
    });

    // User name change (debounced)
    const nameInput = document.getElementById('settings-user-name');
    if (nameInput) {
        let nameTimeout;
        nameInput.addEventListener('input', (e) => {
            clearTimeout(nameTimeout);
            nameTimeout = setTimeout(() => {
                handleNameChange(e.target.value);
            }, 500);
        });
    }

    // Persona description change (debounced)
    const descriptionTextarea = document.getElementById('settings-persona-description');
    if (descriptionTextarea) {
        let descTimeout;
        descriptionTextarea.addEventListener('input', (e) => {
            clearTimeout(descTimeout);
            descTimeout = setTimeout(() => {
                handleDescriptionChange(e.target.value);
            }, 500);
        });
    }

    // Language change
    const languageSelector = document.getElementById('settings-language');
    if (languageSelector) {
        languageSelector.addEventListener('change', (e) => {
            handleLanguageChange(e.target.value);
        });
    }

    // Avatar upload
    const avatarUpload = document.getElementById('settings-avatar-upload');
    if (avatarUpload) {
        const fileInput = avatarUpload.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                handleAvatarUpload(e.target.files[0]);
                e.target.value = ''; // Reset for same file upload
            });
        }
    }

    // Sidebar user profile click
    const sidebarProfile = document.getElementById('sidebar-user-profile');
    if (sidebarProfile) {
        sidebarProfile.addEventListener('click', () => {
            openSettings();
        });
        sidebarProfile.style.cursor = 'pointer';
    }

    // Logout button in settings
    const logoutBtn = document.getElementById('settings-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
        });
    }

    // Listen for settings loaded to refresh data
    eventSource.on(event_types.SETTINGS_LOADED, () => {
        if (isSettingsOpen) {
            populateAccountSection();
        }
    });

    console.log('BetterTavern Settings module initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
} else {
    initSettings();
}
