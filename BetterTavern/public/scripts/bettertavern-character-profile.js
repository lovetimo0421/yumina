/**
 * BetterTavern Character Profile Card Module
 *
 * Implements a full-featured character profile card that completely replaces
 * the old character info panel. Features:
 * - View and edit all character fields
 * - Avatar upload
 * - Favorite, World Info, Chat Lore, Export, Duplicate, Delete buttons
 * - Start Chat functionality
 *
 * Flow: Character List → Profile Card → Edit/Start Chat
 */

import {
    characters,
    duplicateCharacterByAvatar,
    getRequestHeaders,
    getThumbnailUrl,
    selectCharacterById,
    deleteCharacter,
    getCharacters,
    selected_button,
    is_send_press,
    openCharacterWorldPopup,
} from '../script.js';

import { is_group_generating } from './group-chats.js';

import { getPermanentAssistantAvatar, returnToWelcomeScreen } from './welcome-screen.js';

import {
    checkEmbeddedWorld,
    openWorldInfoEditor,
    assignLorebookToChat,
    world_names,
} from './world-info.js';

import { debounceAsync, getBase64Async } from './utils.js';
import { translate } from './i18n.js';
import { closeCurrentPanel } from './bettertavern-panels.js';

// Module state
let isProfileOpen = false;
let currentProfileCharId = null;
let hasUnsavedChanges = false;
let avatarFile = null; // Store file for upload
let cropData = undefined;
let profileGreetings = ['']; // Array: [first_mes, ...alternate_greetings]
let profileActiveGreetingIndex = 0;
let expandTargetId = null; // ID of textarea being expanded in fullscreen
const autosaveDelay = 800;
const scheduleAutosave = debounceAsync(async () => {
    if (!hasUnsavedChanges) {
        return;
    }
    await saveCharacter({ reason: 'autosave' });
}, autosaveDelay);

/**
 * Creates the profile card overlay HTML and appends to body
 */
function createProfileOverlay() {
    // Check if already exists
    if (document.getElementById('character-profile-overlay')) {
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'character-profile-overlay';
    overlay.className = 'character-profile-overlay';
    overlay.innerHTML = `
        <div class="character-profile-card">
            <button class="profile-close-btn" title="${translate('Close')}">
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="profile-content">
                <div class="profile-header">
                    <!-- Avatar with upload capability -->
                    <label class="profile-avatar" for="profile-avatar-input" title="${translate('Click to change avatar')}">
                        <img id="profile-avatar-img" src="" alt="Character Avatar">
                        <div class="profile-avatar-overlay">
                            <i class="fa-solid fa-camera"></i>
                        </div>
                        <input type="file" id="profile-avatar-input" accept="image/*" hidden>
                    </label>

                    <!-- Editable Name -->
                    <input type="text" class="profile-name-input" id="profile-char-name" placeholder="${translate('Character Name')}">

                    <!-- Editable Creator -->
                    <div class="profile-creator-row">
                        <span class="profile-creator-label">by</span>
                        <input type="text" class="profile-creator-input" id="profile-char-creator" placeholder="${translate('Creator')}">
                    </div>

                    <!-- Tags (read-only for now) -->
                    <div class="profile-tags" id="profile-char-tags"></div>

                    <!-- Action Toolbar -->
                    <div class="profile-toolbar">
                        <button class="profile-tool-btn" id="profile-btn-favorite" title="${translate('Favorite')}">
                            <i class="fa-solid fa-star"></i>
                        </button>
                        <button class="profile-tool-btn" id="profile-btn-world" title="${translate('Character Lorebook')}">
                            <i class="fa-solid fa-globe"></i>
                        </button>
                        <button class="profile-tool-btn" id="profile-btn-chatlore" title="${translate('Chat Lore')}">
                            <i class="fa-solid fa-passport"></i>
                        </button>
                        <button class="profile-tool-btn" id="profile-btn-export" title="${translate('Export')}">
                            <i class="fa-solid fa-file-export"></i>
                        </button>
                        <button class="profile-tool-btn profile-tool-btn-danger" id="profile-btn-delete" title="${translate('Delete')}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>

                    <!-- Export Format Popup -->
                    <div class="profile-export-popup" id="profile-export-popup">
                        <div class="profile-export-option" data-format="png">PNG</div>
                        <div class="profile-export-option" data-format="json">JSON</div>
                    </div>
                </div>
                <!-- Creator's Notes -->
                <details class="profile-section" id="profile-section-notes">
                    <summary>
                        <span class="profile-section-icon"><i class="fa-solid fa-sticky-note"></i></span>
                        <span class="profile-section-title">${translate("Creator's Notes")}</span>
                        <button class="profile-expand-btn" data-target="profile-creator-notes" data-title="${translate("Creator's Notes")}" title="${translate('Expand editor')}">
                            <i class="fa-solid fa-maximize"></i>
                        </button>
                    </summary>
                    <div class="profile-section-content">
                        <textarea class="profile-textarea" id="profile-creator-notes" placeholder="${translate("Creator's notes for users...")}"></textarea>
                    </div>
                </details>

                <!-- Description -->
                <details class="profile-section" id="profile-section-description">
                    <summary>
                        <span class="profile-section-icon"><i class="fa-solid fa-user"></i></span>
                        <span class="profile-section-title">${translate('Description')}</span>
                        <button class="profile-expand-btn" data-target="profile-description" data-title="${translate('Description')}" title="${translate('Expand editor')}">
                            <i class="fa-solid fa-maximize"></i>
                        </button>
                    </summary>
                    <div class="profile-section-content">
                        <textarea class="profile-textarea" id="profile-description" placeholder="${translate('Character description...')}"></textarea>
                    </div>
                </details>

                <!-- First Message (with greeting tabs) -->
                <details class="profile-section" id="profile-section-first-message">
                    <summary>
                        <span class="profile-section-icon"><i class="fa-solid fa-comment"></i></span>
                        <span class="profile-section-title">${translate('First Message')}</span>
                        <button class="profile-expand-btn" data-target="profile-greeting-textarea" data-title="${translate('First Message')}" title="${translate('Expand editor')}">
                            <i class="fa-solid fa-maximize"></i>
                        </button>
                    </summary>
                    <div class="profile-section-content profile-greetings-content">
                        <div class="profile-greetings">
                            <div class="profile-greetings-tabs">
                                <button class="profile-greeting-add" id="profile-greeting-add" title="${translate('Add new dialogue')}">+</button>
                            </div>
                            <div class="profile-greeting-textarea-container"></div>
                        </div>
                    </div>
                </details>

                <!-- Advanced Definition (collapsed parent) -->
                <details class="profile-section profile-section-advanced" id="profile-section-advanced">
                    <summary>
                        <span class="profile-section-icon"><i class="fa-solid fa-cog"></i></span>
                        <span class="profile-section-title">${translate('Advanced Definition')}</span>
                    </summary>
                    <div class="profile-section-content profile-advanced-content">
                        <!-- Personality -->
                        <details class="profile-subsection" id="profile-subsection-personality">
                            <summary>
                                <span class="profile-section-icon"><i class="fa-solid fa-brain"></i></span>
                                <span class="profile-section-title">${translate('Personality')}</span>
                                <button class="profile-expand-btn" data-target="profile-personality" data-title="${translate('Personality')}" title="${translate('Expand editor')}">
                                    <i class="fa-solid fa-maximize"></i>
                                </button>
                            </summary>
                            <div class="profile-section-content">
                                <textarea class="profile-textarea" id="profile-personality" placeholder="${translate('Personality traits...')}"></textarea>
                            </div>
                        </details>

                        <!-- Scenario -->
                        <details class="profile-subsection" id="profile-subsection-scenario">
                            <summary>
                                <span class="profile-section-icon"><i class="fa-solid fa-book"></i></span>
                                <span class="profile-section-title">${translate('Scenario')}</span>
                                <button class="profile-expand-btn" data-target="profile-scenario" data-title="${translate('Scenario')}" title="${translate('Expand editor')}">
                                    <i class="fa-solid fa-maximize"></i>
                                </button>
                            </summary>
                            <div class="profile-section-content">
                                <textarea class="profile-textarea" id="profile-scenario" placeholder="${translate('Scenario and context...')}"></textarea>
                            </div>
                        </details>

                        <!-- Example Messages -->
                        <details class="profile-subsection" id="profile-subsection-examples">
                            <summary>
                                <span class="profile-section-icon"><i class="fa-solid fa-comments"></i></span>
                                <span class="profile-section-title">${translate('Example Messages')}</span>
                                <button class="profile-expand-btn" data-target="profile-examples" data-title="${translate('Example Messages')}" title="${translate('Expand editor')}">
                                    <i class="fa-solid fa-maximize"></i>
                                </button>
                            </summary>
                            <div class="profile-section-content">
                                <textarea class="profile-textarea profile-textarea-large" id="profile-examples" placeholder="${translate('Example dialogue...')}"></textarea>
                            </div>
                        </details>
                    </div>
                </details>
            </div>

            <div class="profile-actions">
                <button class="profile-btn profile-btn-secondary" id="profile-btn-back">
                    <i class="fa-solid fa-arrow-left"></i>
                    ${translate('Back')}
                </button>
                <button class="profile-btn profile-btn-primary" id="profile-btn-continue-chat">
                    <i class="fa-solid fa-comment-dots"></i>
                    ${translate('Open')}
                </button>
                <button class="profile-btn profile-btn-secondary" id="profile-btn-start-new-chat">
                    <i class="fa-solid fa-clone"></i>
                    ${translate('Clone')}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Set up event listeners
    setupProfileEventListeners();

    console.log('[BetterTavern] Character profile overlay created');
}

/**
 * Sets up event listeners for the profile card
 */
function setupProfileEventListeners() {
    const overlay = document.getElementById('character-profile-overlay');
    if (!overlay) return;

    // Close button (X in header)
    overlay.querySelector('.profile-close-btn').addEventListener('click', closeProfile);

    // Continue Chat button
    overlay.querySelector('#profile-btn-continue-chat').addEventListener('click', continueChatWithCharacter);

    // Back button
    overlay.querySelector('#profile-btn-back').addEventListener('click', closeProfile);

    // Start New Chat button
    overlay.querySelector('#profile-btn-start-new-chat').addEventListener('click', startNewChatWithCharacter);

    // Escape key to close (expand overlay first, then profile)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const expandOverlay = document.getElementById('profile-expand-overlay');
            if (expandOverlay && expandOverlay.classList.contains('open')) {
                closeExpandOverlay();
                return;
            }
            if (isProfileOpen) {
                closeProfile();
            }
        }
    });

    // Avatar upload
    overlay.querySelector('#profile-avatar-input').addEventListener('change', handleAvatarUpload);

    // Toolbar buttons
    overlay.querySelector('#profile-btn-favorite').addEventListener('click', toggleFavorite);
    overlay.querySelector('#profile-btn-world').addEventListener('click', handleWorldInfo);
    overlay.querySelector('#profile-btn-chatlore').addEventListener('click', handleChatLore);
    overlay.querySelector('#profile-btn-export').addEventListener('click', toggleExportPopup);
    overlay.querySelector('#profile-btn-delete').addEventListener('click', handleDelete);

    // Export format options
    overlay.querySelectorAll('.profile-export-option').forEach(option => {
        option.addEventListener('click', handleExport);
    });

    // Close export popup when clicking outside
    document.addEventListener('click', (e) => {
        const exportPopup = document.getElementById('profile-export-popup');
        const exportBtn = document.getElementById('profile-btn-export');
        if (exportPopup && !exportPopup.contains(e.target) && !exportBtn.contains(e.target)) {
            exportPopup.classList.remove('open');
        }
    });

    // Track changes in form fields (static textareas only; greeting textarea has its own handler)
    const inputs = overlay.querySelectorAll('input[type="text"], textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            hasUnsavedChanges = true;
            updateSaveButtonState();
            scheduleAutosave();
        });
    });

    // Expand button click delegation
    overlay.addEventListener('click', (e) => {
        const expandBtn = e.target.closest('.profile-expand-btn');
        if (expandBtn) {
            e.preventDefault();
            e.stopPropagation(); // Prevent <details> toggle
            const targetId = expandBtn.dataset.target;
            const title = expandBtn.dataset.title;
            // Ensure the details section is open so textarea exists
            const details = expandBtn.closest('details');
            if (details && !details.open) details.open = true;
            // Small delay to let the details open and textarea render
            requestAnimationFrame(() => {
                openExpandOverlay(targetId, title);
            });
        }
    });

    // Greeting add button
    const greetingAddBtn = overlay.querySelector('#profile-greeting-add');
    if (greetingAddBtn) {
        greetingAddBtn.addEventListener('click', addProfileGreeting);
    }
}

function isSystemAgentCharacter(character) {
    return character?.avatar === getPermanentAssistantAvatar();
}

function applySystemAgentProfileMode(overlay, isSystemAgent) {
    overlay.classList.toggle('assistant-profile', isSystemAgent);

    const toggleDisplay = (selector, shouldShow) => {
        const element = overlay.querySelector(selector);
        if (element) {
            element.style.display = shouldShow ? '' : 'none';
        }
    };

    // Show only for assistant
    toggleDisplay('#profile-btn-back', isSystemAgent);

    // Hide for assistant - toolbar buttons
    toggleDisplay('#profile-btn-favorite', !isSystemAgent);
    toggleDisplay('#profile-btn-start-new-chat', !isSystemAgent);
    toggleDisplay('#profile-btn-world', !isSystemAgent);
    toggleDisplay('#profile-btn-chatlore', !isSystemAgent);
    toggleDisplay('#profile-btn-export', !isSystemAgent);
    toggleDisplay('#profile-btn-delete', !isSystemAgent);
    toggleDisplay('#profile-export-popup', !isSystemAgent);

    // Hide for assistant - header elements (keep name and avatar only)
    toggleDisplay('.profile-creator-row', !isSystemAgent);
    toggleDisplay('.profile-tags', !isSystemAgent);

    // Hide for assistant - content sections (keep creator notes only)
    toggleDisplay('#profile-section-description', !isSystemAgent);
    toggleDisplay('#profile-section-first-message', !isSystemAgent);
    toggleDisplay('#profile-section-advanced', !isSystemAgent);

    // Hide for assistant - other UI
    toggleDisplay('.profile-close-btn', !isSystemAgent);
}

// ============================================================================
// FULLSCREEN EXPAND OVERLAY
// ============================================================================

/**
 * Creates the fullscreen expand overlay DOM (appended to body once)
 */
function createExpandOverlay() {
    if (document.getElementById('profile-expand-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'profile-expand-overlay';
    overlay.className = 'profile-expand-overlay';
    overlay.innerHTML = `
        <div class="profile-expand-header">
            <span class="profile-expand-title"></span>
            <button class="profile-expand-close" title="${translate('Close')}">
                <i class="fa-solid fa-compress"></i>
            </button>
        </div>
        <textarea id="profile-expand-textarea" class="profile-expand-textarea"></textarea>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.profile-expand-close').addEventListener('click', closeExpandOverlay);

    overlay.querySelector('#profile-expand-textarea').addEventListener('input', (e) => {
        if (!expandTargetId) return;
        const sourceTextarea = document.getElementById(expandTargetId);
        if (sourceTextarea) {
            sourceTextarea.value = e.target.value;
            sourceTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
}

/**
 * Opens the fullscreen expand overlay for a given textarea
 */
function openExpandOverlay(targetId, title) {
    createExpandOverlay();

    const overlay = document.getElementById('profile-expand-overlay');
    const textarea = document.getElementById('profile-expand-textarea');
    const titleEl = overlay.querySelector('.profile-expand-title');

    const source = document.getElementById(targetId);
    if (!source) return;

    expandTargetId = targetId;
    textarea.value = source.value;
    textarea.placeholder = source.placeholder || '';
    titleEl.textContent = title;
    overlay.classList.add('open');
    textarea.focus();
}

/**
 * Closes the fullscreen expand overlay
 */
function closeExpandOverlay() {
    const overlay = document.getElementById('profile-expand-overlay');
    if (overlay) overlay.classList.remove('open');
    expandTargetId = null;
}

// ============================================================================
// GREETING TABS (Multi-Dialogue Support)
// ============================================================================

/**
 * Rebuilds the greeting tabs in the profile panel
 */
function rebuildProfileGreetingTabs() {
    const tabsEl = document.querySelector('.profile-greetings-tabs');
    if (!tabsEl) return;

    const addBtn = tabsEl.querySelector('.profile-greeting-add');
    // Remove existing tabs
    tabsEl.querySelectorAll('.profile-greeting-tab').forEach(t => t.remove());

    profileGreetings.forEach((_, i) => {
        const tab = document.createElement('div');
        tab.className = `profile-greeting-tab${i === profileActiveGreetingIndex ? ' active' : ''}`;
        tab.dataset.index = String(i);

        let html = `${translate('Dialogue')} ${i + 1}`;
        if (i > 0) {
            html += ` <span class="profile-greeting-remove" data-index="${i}">&times;</span>`;
        }
        tab.innerHTML = html;

        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('profile-greeting-remove')) {
                removeProfileGreeting(parseInt(e.target.dataset.index));
                return;
            }
            closeExpandOverlay();
            saveCurrentProfileGreeting();
            profileActiveGreetingIndex = i;
            rebuildProfileGreetingTabs();
            renderProfileGreetingTextarea();
        });

        tabsEl.insertBefore(tab, addBtn);
    });
}

/**
 * Renders the textarea for the currently active greeting
 */
function renderProfileGreetingTextarea() {
    const container = document.querySelector('.profile-greeting-textarea-container');
    if (!container) return;

    container.innerHTML = '';

    const textarea = document.createElement('textarea');
    textarea.id = 'profile-greeting-textarea';
    textarea.className = 'profile-textarea profile-textarea-large';
    textarea.placeholder = translate("Character's opening message...");
    textarea.value = profileGreetings[profileActiveGreetingIndex] || '';

    textarea.addEventListener('input', () => {
        profileGreetings[profileActiveGreetingIndex] = textarea.value;
        hasUnsavedChanges = true;
        updateSaveButtonState();
        scheduleAutosave();
    });

    container.appendChild(textarea);
}

/**
 * Saves the current greeting text from the active textarea into the state array
 */
function saveCurrentProfileGreeting() {
    const textarea = document.getElementById('profile-greeting-textarea');
    if (textarea) {
        profileGreetings[profileActiveGreetingIndex] = textarea.value;
    }
}

/**
 * Adds a new empty greeting and switches to it
 */
function addProfileGreeting() {
    saveCurrentProfileGreeting();
    profileGreetings.push('');
    profileActiveGreetingIndex = profileGreetings.length - 1;
    hasUnsavedChanges = true;
    updateSaveButtonState();
    scheduleAutosave();
    rebuildProfileGreetingTabs();
    renderProfileGreetingTextarea();
}

/**
 * Removes a greeting at the given index. Cannot remove the primary (index 0).
 */
function removeProfileGreeting(index) {
    if (index === 0 || profileGreetings.length <= 1) return;

    saveCurrentProfileGreeting();
    profileGreetings.splice(index, 1);
    if (profileActiveGreetingIndex >= profileGreetings.length) {
        profileActiveGreetingIndex = profileGreetings.length - 1;
    }
    hasUnsavedChanges = true;
    updateSaveButtonState();
    scheduleAutosave();
    rebuildProfileGreetingTabs();
    renderProfileGreetingTextarea();
}

/**
 * Shows the character profile card for a given character ID
 * @param {number|string} charId - Character ID
 */
export function showCharacterProfile(charId) {
    const id = Number(charId);
    const character = characters[id];

    if (!character) {
        console.error('[BetterTavern] Character not found:', id);
        return;
    }

    // Close any open panel first (fixes z-index stacking context bug on mobile
    // where panels inside #top-settings-holder z-index:10000 block the overlay)
    closeCurrentPanel();

    // Ensure overlay exists
    createProfileOverlay();

    const overlay = document.getElementById('character-profile-overlay');
    if (!overlay) return;

    currentProfileCharId = id;
    hasUnsavedChanges = false;
    avatarFile = null;
    cropData = undefined;

    // Populate avatar
    const avatarImg = overlay.querySelector('#profile-avatar-img');
    avatarImg.src = getThumbnailUrl('avatar', character.avatar);
    avatarImg.alt = character.name;

    // Populate editable name
    overlay.querySelector('#profile-char-name').value = character.name || '';

    // Populate editable creator
    overlay.querySelector('#profile-char-creator').value = character.data?.creator || '';

    // Populate tags
    const tagsContainer = overlay.querySelector('#profile-char-tags');
    tagsContainer.innerHTML = '';
    const tags = character.data?.tags || [];
    if (Array.isArray(tags) && tags.length > 0) {
        tags.slice(0, 5).forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'profile-tag';
            tagEl.textContent = tag;
            tagsContainer.appendChild(tagEl);
        });
    }

    // Populate editable fields
    overlay.querySelector('#profile-creator-notes').value = character.data?.creator_notes || '';
    overlay.querySelector('#profile-description').value = character.description || '';
    overlay.querySelector('#profile-personality').value = character.personality || '';
    overlay.querySelector('#profile-scenario').value = character.scenario || '';
    overlay.querySelector('#profile-examples').value = character.mes_example || '';

    // Initialize greeting state from character data
    profileGreetings = [character.first_mes || ''];
    const altGreetings = character.data?.alternate_greetings || [];
    if (Array.isArray(altGreetings)) {
        profileGreetings.push(...altGreetings);
    }
    profileActiveGreetingIndex = 0;
    rebuildProfileGreetingTabs();
    renderProfileGreetingTextarea();

    applySystemAgentProfileMode(overlay, isSystemAgentCharacter(character));

    // Update favorite button state
    updateFavoriteButtonState(character.fav || character.fav === 'true');

    // Update world info button state
    updateWorldButtonState(id);

    // Close all sections by default
    overlay.querySelectorAll('.profile-section, .profile-subsection').forEach(section => {
        section.removeAttribute('open');
    });

    // Update save button state
    updateSaveButtonState();

    // Show overlay
    overlay.classList.add('open');
    isProfileOpen = true;

    console.log('[BetterTavern] Showing profile for:', character.name);
}

/**
 * Updates the save button state based on unsaved changes
 */
function updateSaveButtonState() {
    const saveBtn = document.getElementById('profile-btn-save');
    if (!saveBtn) {
        return;
    }
    if (hasUnsavedChanges) {
        saveBtn.classList.add('has-changes');
    } else {
        saveBtn.classList.remove('has-changes');
    }
}

/**
 * Updates the favorite button visual state
 */
function updateFavoriteButtonState(isFavorite) {
    const favBtn = document.getElementById('profile-btn-favorite');
    if (favBtn) {
        favBtn.classList.toggle('active', isFavorite);
    }
}

/**
 * Updates the world info button visual state
 */
function updateWorldButtonState(charId) {
    const worldBtn = document.getElementById('profile-btn-world');
    if (worldBtn && charId !== undefined) {
        const character = characters[charId];
        const worldName = character?.data?.extensions?.world;
        const hasWorld = worldName && world_names && world_names.includes(worldName);
        worldBtn.classList.toggle('active', hasWorld);
    }
}

/**
 * Handle avatar file upload
 */
async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const base64Data = await getBase64Async(file);

        // Update preview immediately
        const avatarImg = document.getElementById('profile-avatar-img');
        if (avatarImg) {
            avatarImg.src = base64Data;
        }

        // Store file for later upload
        avatarFile = file;
        hasUnsavedChanges = true;
        updateSaveButtonState();
        scheduleAutosave();

        console.log('[BetterTavern] Avatar selected for upload');
    } catch (error) {
        console.error('[BetterTavern] Error processing avatar:', error);
        toastr.error(translate('Failed to process avatar image'));
    }

    // Reset file input
    e.target.value = '';
}

/**
 * Toggle favorite status
 */
async function toggleFavorite() {
    if (currentProfileCharId === null) return;

    const character = characters[currentProfileCharId];
    if (!character) return;

    const newFavState = !(character.fav || character.fav === 'true');

    // Update local state
    character.fav = newFavState;
    if (character.data?.extensions) {
        character.data.extensions.fav = newFavState;
    }

    // Update button state
    updateFavoriteButtonState(newFavState);

    // Save to backend - update the hidden form field and trigger save
    const favCheckbox = document.getElementById('fav_checkbox');
    if (favCheckbox) {
        favCheckbox.checked = newFavState;
    }

    // Mark as needing save
    hasUnsavedChanges = true;
    updateSaveButtonState();
    scheduleAutosave();

    console.log('[BetterTavern] Favorite toggled:', newFavState);
    toastr.info(newFavState ? translate('Added to favorites') : translate('Removed from favorites'));
}

/**
 * Handle world info button click
 */
async function handleWorldInfo(event) {
    if (currentProfileCharId === null) return;

    const character = characters[currentProfileCharId];
    if (!character) return;

    const worldName = character?.data?.extensions?.world;
    const hasEmbed = checkEmbeddedWorld(currentProfileCharId);

    // Normal click: open world editor if exists
    if (worldName && world_names && world_names.includes(worldName) && !event.shiftKey) {
        openWorldInfoEditor(worldName);
    }
    // Shift-click or no world: show world info selection popup
    else {
        $('#set_character_world').data('chid', currentProfileCharId);
        await openCharacterWorldPopup();
    }
}

/**
 * Handle chat lore button click
 */
async function handleChatLore(event) {
    await assignLorebookToChat(event);
}

/**
 * Toggle export popup
 */
function toggleExportPopup(e) {
    e.stopPropagation();
    const popup = document.getElementById('profile-export-popup');
    if (popup) {
        popup.classList.toggle('open');
    }
}

/**
 * Handle export format selection
 */
async function handleExport(e) {
    if (currentProfileCharId === null) return;

    const format = e.target.dataset.format;
    if (!format) return;

    // Close popup
    const popup = document.getElementById('profile-export-popup');
    if (popup) popup.classList.remove('open');

    const character = characters[currentProfileCharId];
    if (!character) return;

    try {
        // Save first if there are unsaved changes
        if (hasUnsavedChanges) {
            await saveCharacter();
        }

        const body = { format, avatar_url: character.avatar };

        const response = await fetch('/api/characters/export', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(body),
        });

        if (response.ok) {
            const filename = character.avatar.replace('.png', `.${format}`);
            const blob = await response.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(a.href);
            document.body.removeChild(a);
            toastr.success(translate('Character exported successfully'));
        } else {
            toastr.error(translate('Failed to export character'));
        }
    } catch (error) {
        console.error('[BetterTavern] Export error:', error);
        toastr.error(translate('Failed to export character'));
    }
}

/**
 * Handle duplicate button click
 */
async function startNewChatWithCharacter() {
    if (currentProfileCharId === null) return;

    const character = characters[currentProfileCharId];
    if (!character) return;
    if (isSystemAgentCharacter(character)) return;

    if (hasUnsavedChanges) {
        await saveCharacter({ reason: 'autosave' });
    }

    const confirmDupe = confirm(`Clone "${character.name}"? This will create a duplicate character.`);
    if (!confirmDupe) return;

    const newAvatar = await duplicateCharacterByAvatar(character.avatar);
    if (!newAvatar) {
        return;
    }

    const newIndex = characters.findIndex((char) => char.avatar === newAvatar);
    if (newIndex !== -1) {
        await selectCharacterById(newIndex);
        closeProfilePanel();
        closeCharactersPanel();
    }
}

/**
 * Handle delete button click
 */
async function handleDelete() {
    if (currentProfileCharId === null) return;

    const character = characters[currentProfileCharId];
    if (!character) return;

    // Confirm deletion
    const confirmDelete = confirm(`Are you sure you want to delete "${character.name}"?\n\nThis action cannot be undone.`);
    if (!confirmDelete) return;

    const deleteChats = confirm('Also delete all chat history with this character?');

    // Close the profile
    closeProfile();

    // Delete the character
    await deleteCharacter(character.avatar, { deleteChats });
}

/**
 * Save character data to backend
 */
async function saveCharacter({ reason = 'manual' } = {}) {
    if (currentProfileCharId === null) return;

    const character = characters[currentProfileCharId];
    if (!character) return;

    const overlay = document.getElementById('character-profile-overlay');
    if (!overlay) return;

    try {
        // Collect data from form
        const formData = new FormData();

        // Required fields
        formData.set('ch_name', overlay.querySelector('#profile-char-name').value.trim());
        formData.set('avatar_url', character.avatar);

        // Content fields
        formData.set('description', overlay.querySelector('#profile-description').value);
        // first_mes comes from greeting state (index 0)
        saveCurrentProfileGreeting();
        formData.set('first_mes', profileGreetings[0] || '');
        formData.set('personality', overlay.querySelector('#profile-personality').value);
        formData.set('scenario', overlay.querySelector('#profile-scenario').value);
        formData.set('mes_example', overlay.querySelector('#profile-examples').value);
        formData.set('creator_notes', overlay.querySelector('#profile-creator-notes').value);
        formData.set('creator', overlay.querySelector('#profile-char-creator').value);

        // Preserve existing fields
        formData.set('chat', character.chat || '');
        formData.set('create_date', character.create_date || '');
        formData.set('talkativeness', character.talkativeness || '0.5');
        formData.set('fav', String(character.fav === true || character.fav === 'true'));

        // Preserve tags
        const tags = character.data?.tags || [];
        formData.set('tags', Array.isArray(tags) ? tags.join(', ') : '');

        // Preserve world info
        formData.set('world', character.data?.extensions?.world || '');

        // Preserve other v2 spec fields
        formData.set('system_prompt', character.data?.system_prompt || '');
        formData.set('post_history_instructions', character.data?.post_history_instructions || '');
        formData.set('character_version', character.data?.character_version || '');

        // Alternate greetings from greeting state (indices 1+)
        for (let i = 1; i < profileGreetings.length; i++) {
            const greeting = profileGreetings[i];
            if (greeting.trim().length > 0) {
                formData.append('alternate_greetings', greeting);
            }
        }

        // Extensions (preserve existing)
        const extensions = character.data?.extensions || {};
        formData.set('extensions', JSON.stringify(extensions));

        // Handle avatar file if changed
        if (avatarFile) {
            formData.set('avatar', avatarFile);
        }

        // Build URL
        let url = '/api/characters/edit';
        if (cropData) {
            url += `?crop=${encodeURIComponent(JSON.stringify(cropData))}`;
        }

        // Send to backend
        const response = await fetch(url, {
            method: 'POST',
            headers: getRequestHeaders({ omitContentType: true }),
            body: formData,
            cache: 'no-cache',
        });

        if (response.ok) {
            // Refresh character data
            await getCharacters();

            // Reset state
            hasUnsavedChanges = false;
            avatarFile = null;
            cropData = undefined;
            updateSaveButtonState();

            if (reason === 'autosave') {
                toastr.info(translate('Autosaved'), '', { timeOut: 1200, preventDuplicates: true });
            } else {
                toastr.success(translate('Character saved successfully'));
            }
            console.log('[BetterTavern] Character saved');

            // Update the displayed data with refreshed character
            const updatedChar = characters[currentProfileCharId];
            if (updatedChar) {
                // Update avatar in case it changed
                const avatarImg = overlay.querySelector('#profile-avatar-img');
                if (avatarImg) {
                    avatarImg.src = getThumbnailUrl('avatar', updatedChar.avatar) + '?t=' + Date.now();
                }
            }
        } else {
            const errorText = await response.text();
            console.error('[BetterTavern] Save failed:', errorText);
            toastr.error(translate('Failed to save character'));
        }
    } catch (error) {
        console.error('[BetterTavern] Save error:', error);
        toastr.error(translate('Failed to save character') + ': ' + error.message);
    }
}

/**
 * Closes the profile card
 */
export function closeProfile() {
    const overlay = document.getElementById('character-profile-overlay');
    if (!overlay) return;

    if (hasUnsavedChanges) {
        void saveCharacter({ reason: 'autosave' });
    }

    // Close expand overlay if open
    closeExpandOverlay();

    overlay.classList.remove('open');
    isProfileOpen = false;
    currentProfileCharId = null;
    hasUnsavedChanges = false;
    avatarFile = null;
    profileGreetings = [''];
    profileActiveGreetingIndex = 0;

    // Close export popup if open
    const exportPopup = document.getElementById('profile-export-popup');
    if (exportPopup) exportPopup.classList.remove('open');

    console.log('[BetterTavern] Profile closed');
}

/**
 * Starts chat with the currently displayed character
 */
async function continueChatWithCharacter() {
    if (currentProfileCharId === null) return;

    // Prevent starting chat while generation is in progress
    if (is_group_generating || is_send_press) {
        toastr.warning(translate('Please wait for the AI to finish generating before switching chats.'));
        return;
    }

    const character = characters[currentProfileCharId];
    if (isSystemAgentCharacter(character)) {
        if (hasUnsavedChanges) {
            await saveCharacter({ reason: 'autosave' });
        }
        closeProfilePanel();
        closeCharactersPanel();
        await returnToWelcomeScreen();
        return;
    }

    if (hasUnsavedChanges) {
        await saveCharacter({ reason: 'autosave' });
    }

    console.log('[BetterTavern] Starting chat with character ID:', currentProfileCharId);

    // Store the ID before closing
    const charId = currentProfileCharId;
    closeProfilePanel();

    // Call the original selectCharacterById to start chat
    await selectCharacterById(charId);

    closeCharactersPanel();
}

function closeProfilePanel() {
    closeExpandOverlay();
    const overlay = document.getElementById('character-profile-overlay');
    if (overlay) {
        overlay.classList.remove('open');
    }
    isProfileOpen = false;
    currentProfileCharId = null;
    hasUnsavedChanges = false;
    avatarFile = null;
    profileGreetings = [''];
    profileActiveGreetingIndex = 0;
}

function closeCharactersPanel() {
    const charactersPanel = document.getElementById('right-nav-panel');
    if (charactersPanel && charactersPanel.classList.contains('openDrawer')) {
        charactersPanel.classList.remove('openDrawer');
        charactersPanel.classList.add('closedDrawer');
        charactersPanel.classList.remove('pinnedOpen');

        // Update the drawer icon
        const drawer = charactersPanel.closest('.drawer');
        if (drawer) {
            const icon = drawer.querySelector('.drawer-icon');
            if (icon) {
                icon.classList.remove('openIcon');
                icon.classList.add('closedIcon');
            }
        }

        // Remove panel-open class from body
        document.body.classList.remove('panel-open');

        console.log('[BetterTavern] Characters panel closed after starting chat');
    }
}

/**
 * Check if profile is currently open
 * @returns {boolean}
 */
export function isCharacterProfileOpen() {
    return isProfileOpen;
}

/**
 * Intercepts character selection clicks to show profile instead
 * Uses CAPTURE PHASE to run BEFORE jQuery's bubble phase handlers
 * This ensures we intercept the click before selectCharacterById() is called
 */
export function initCharacterProfileInterceptor() {
    // Create the overlay early
    createProfileOverlay();

    // Use capture phase (third param: true) to intercept BEFORE jQuery handlers
    // jQuery uses bubble phase, so capture phase runs first
    document.addEventListener('click', function(e) {
        // Find if we clicked on or inside a .character_select element
        const characterSelect = e.target.closest('.character_select');
        if (!characterSelect) return;

        // Don't intercept if clicking on specific sub-elements like favorite button
        const clickedSubElement = e.target.closest('.ch_fav, .tag, .bogus_folder_select, .character_context_menu');
        if (clickedSubElement) {
            return; // Let original handler process these
        }

        // Stop the event from reaching jQuery handlers
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();

        // Get character ID and show profile
        const charId = characterSelect.getAttribute('data-chid');
        if (charId !== undefined && charId !== null) {
            showCharacterProfile(charId);
        }
    }, true); // true = capture phase

    console.log('[BetterTavern] Character profile interceptor initialized (capture phase)');
}

/**
 * Intercept attempts to show the old character edit panel and redirect to character list
 * This prevents the blank page issue when clicking Characters icon while in a chat
 *
 * IMPORTANT: This only redirects for EDIT mode, not CREATE mode.
 * CREATE mode (selected_button === 'create') needs the original panel to work.
 */
function initPanelRedirectInterceptor() {
    const oldPanel = document.getElementById('rm_ch_create_block');
    const charListPanel = document.getElementById('rm_characters_block');

    if (!oldPanel || !charListPanel) {
        console.warn('[BetterTavern] Could not find panels for redirect interceptor');
        return;
    }

    // Use MutationObserver to detect when the old panel's style changes
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                // Check if someone is trying to show this panel (inline style set to display: block/flex)
                const inlineDisplay = oldPanel.style.display;
                if (inlineDisplay && inlineDisplay !== 'none') {
                    // IMPORTANT: Allow CREATE mode to use the original panel
                    if (selected_button === 'create') {
                        console.log('[BetterTavern] CREATE mode detected, allowing original character panel to show');
                        return; // Don't redirect - let the create panel show
                    }

                    console.log('[BetterTavern] EDIT mode intercepted, redirecting to character list');

                    // Clear the inline style that was trying to show it
                    oldPanel.style.display = '';

                    // Show the character list instead
                    charListPanel.style.display = 'flex';

                    // Hide the result_info (token count) since we're showing list, not edit
                    const resultInfo = document.getElementById('result_info');
                    if (resultInfo) {
                        resultInfo.style.display = 'none';
                    }
                }
            }
        }
    });

    observer.observe(oldPanel, { attributes: true, attributeFilter: ['style'] });

    console.log('[BetterTavern] Panel redirect interceptor initialized');
}

/**
 * Initialize the character profile module
 */
export function initCharacterProfile() {
    console.log('[BetterTavern] Initializing character profile module...');

    // Set up the click interceptor for character selection
    initCharacterProfileInterceptor();

    // Set up the panel redirect interceptor to prevent blank page
    initPanelRedirectInterceptor();

    console.log('[BetterTavern] Character profile module initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCharacterProfile);
} else {
    // DOM already loaded, initialize with slight delay to ensure other modules are ready
    setTimeout(initCharacterProfile, 500);
}
