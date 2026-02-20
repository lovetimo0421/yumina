/**
 * BetterTavern Start New Page Module
 * Provides a unified entry point for starting new chats,
 * including character creation and world building.
 */

import { characters, duplicateCharacterByAvatar, getCharacters, getRequestHeaders, getThumbnailUrl, selectCharacterById, is_send_press } from '../script.js';
import { getPermanentAssistantAvatar, returnToWelcomeScreen } from './welcome-screen.js';
import { is_group_generating } from './group-chats.js';
import { createNewWorldInfo, createWorldInfoEntry, saveWorldInfo, updateWorldInfoList } from './world-info.js';
import { translate } from './i18n.js';
import { closeCurrentPanel } from './bettertavern-panels.js';

let currentSection = 'import';
const HIDDEN_AVATARS = []; // Characters to hide from library

// Track initialization to prevent duplicate event listeners
let startNewInitialized = false;

// Guard flag to prevent multiple clone operations from rapid clicks
let isCloning = false;

// ============================================================================
// CREATE MODE STATE
// ============================================================================

let createMode = 'character'; // 'character' or 'world'
let avatarFile = null; // File object for avatar upload

// Greeting messages state (character mode)
let greetings = ['']; // Array of first messages
let activeGreetingIndex = 0;

// Greeting messages state (world mode)
let worldGreetings = [''];
let activeWorldGreetingIndex = 0;

// World info entries state (world mode)
let wiEntries = [
    { comment: 'World Background', content: '', enabled: true, constant: false, keys: '', position: 0, order: 100, role: 0, depth: 4 },
    { comment: 'Character 1', content: '', enabled: true, constant: false, keys: '', position: 0, order: 100, role: 0, depth: 4 },
];
let activeWiEntryIndex = 0;

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Open the Start New modal
 */
export function openStartNew() {
    // Close any open panel first (fixes z-index stacking context bug on mobile)
    closeCurrentPanel();

    const modal = document.getElementById('bt-startnew-modal');
    if (modal) {
        isCloning = false;
        modal.classList.add('open');
        switchSection('library'); // Default to library
        loadCharacterGrid();
    }
}

/**
 * Close the Start New modal
 */
export function closeStartNew() {
    const modal = document.getElementById('bt-startnew-modal');
    if (modal) {
        modal.classList.remove('open');
    }
}

/**
 * Switch to a different section of the Start New modal
 * @param {string} section - 'import', 'library', or 'create'
 */
function switchSection(section) {
    currentSection = section;

    // Update option buttons
    document.querySelectorAll('.bt-startnew-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.section === section);
    });

    // Update content sections
    document.querySelectorAll('.bt-startnew-section').forEach(sect => {
        sect.classList.toggle('active', sect.id === `bt-startnew-${section}`);
    });

    // If switching to create, initialize/reset the create form
    if (section === 'create') {
        resetCreateForm();
    }
}

// ============================================================================
// CHARACTER LIBRARY
// ============================================================================

/**
 * Load character grid into the library section
 */
async function loadCharacterGrid() {
    const libraryEl = document.getElementById('bt-startnew-library-grid');
    if (!libraryEl) return;

    // Ensure characters are loaded
    if (!characters.length) {
        await getCharacters();
    }

    if (!characters.length) {
        libraryEl.innerHTML = `
            <div class="bt-startnew-library-empty">
                <i class="fa-solid fa-user-slash"></i>
                <p>${translate('No characters yet. Import a card to get started!')}</p>
            </div>
        `;
        return;
    }

    // Build character grid (filter out hidden system characters)
    const assistantAvatar = getPermanentAssistantAvatar();
    const visibleCharacters = characters
        .map((char, index) => ({ char, index }))
        .filter(({ char }) => !HIDDEN_AVATARS.includes(char.avatar))
        .filter(({ char }) => !assistantAvatar || char.avatar !== assistantAvatar);

    libraryEl.innerHTML = visibleCharacters.map(({ char, index }) => {
        const avatarUrl = getThumbnailUrl('avatar', char.avatar);
        const safeName = escapeHtml(char.name);
        return `
            <div class="bt-startnew-char" data-chid="${index}">
                <div class="bt-startnew-char-avatar">
                    <img src="${avatarUrl}" alt="${safeName}" onerror="this.src='img/ai4.png'">
                </div>
                <div class="bt-startnew-char-name">${safeName}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    libraryEl.querySelectorAll('.bt-startnew-char').forEach(charEl => {
        charEl.addEventListener('click', async () => {
            if (isCloning) return;

            if (is_group_generating || is_send_press) {
                toastr.warning(translate('Please wait for the AI to finish generating before switching chats.'));
                return;
            }

            const chid = parseInt(charEl.dataset.chid);
            const character = characters[chid];
            if (!character) return;

            // Lock cloning and show visual feedback
            isCloning = true;
            charEl.classList.add('bt-startnew-char-cloning');
            libraryEl.classList.add('bt-startnew-library-cloning');

            try {
                const newAvatar = await duplicateCharacterByAvatar(character.avatar);
                if (!newAvatar) return;

                const newIndex = characters.findIndex((char) => char.avatar === newAvatar);
                if (newIndex !== -1) {
                    await selectCharacterById(newIndex);
                }
                closeStartNew();
            } finally {
                isCloning = false;
                charEl.classList.remove('bt-startnew-char-cloning');
                libraryEl.classList.remove('bt-startnew-library-cloning');
            }
        });
    });
}

// ============================================================================
// FILE IMPORT
// ============================================================================

/**
 * Handle file drop/select for import
 */
async function handleFileImport(files) {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validExtensions = ['json', 'png', 'yaml', 'yml', 'charx', 'byaf'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !validExtensions.includes(ext)) {
        console.warn('[BetterTavern] Invalid file type for character import');
        return;
    }

    const importInput = document.getElementById('character_import_file');
    if (importInput instanceof HTMLInputElement) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        importInput.files = dataTransfer.files;
        importInput.dispatchEvent(new Event('change', { bubbles: true }));
        closeStartNew();
    }
}

// ============================================================================
// CREATE MODE - SHARED
// ============================================================================

/**
 * Reset the create form to initial state
 */
function resetCreateForm() {
    createMode = 'character';
    avatarFile = null;
    greetings = [''];
    activeGreetingIndex = 0;
    wiEntries = [
        { comment: 'World Background', content: '', enabled: true, constant: false, keys: '', position: 0, order: 100, role: 0, depth: 4 },
        { comment: 'Character 1', content: '', enabled: true, constant: false, keys: '', position: 0, order: 100, role: 0, depth: 4 },
    ];
    activeWiEntryIndex = 0;

    // Reset UI
    const nameInput = document.getElementById('bt-create-name');
    if (nameInput) nameInput.value = '';

    const descInput = document.getElementById('bt-create-description');
    if (descInput) descInput.value = '';

    const avatarEl = document.getElementById('bt-create-avatar');
    if (avatarEl) {
        avatarEl.style.backgroundImage = '';
        avatarEl.classList.remove('has-image');
    }

    // Reset mode buttons
    document.querySelectorAll('.bt-create-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === 'character');
    });

    // Show character fields, hide world fields
    const charFields = document.getElementById('bt-create-character-fields');
    const worldFields = document.getElementById('bt-create-world-fields');
    if (charFields) charFields.style.display = '';
    if (worldFields) worldFields.style.display = 'none';

    // Reset world greetings
    worldGreetings = [''];
    activeWorldGreetingIndex = 0;

    // Rebuild greeting tabs (character mode)
    rebuildGreetingTabs();
    renderGreetingTextarea();

    // Rebuild greeting tabs (world mode)
    rebuildWorldGreetingTabs();
    renderWorldGreetingTextarea();

    // Rebuild WI tabs
    rebuildWiTabs();
    renderWiEditor();
}

/**
 * Switch between character and world creation modes
 */
function switchCreateMode(mode) {
    createMode = mode;

    document.querySelectorAll('.bt-create-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const charFields = document.getElementById('bt-create-character-fields');
    const worldFields = document.getElementById('bt-create-world-fields');

    if (mode === 'character') {
        if (charFields) charFields.style.display = '';
        if (worldFields) worldFields.style.display = 'none';
    } else {
        if (charFields) charFields.style.display = 'none';
        if (worldFields) worldFields.style.display = '';
    }
}

// ============================================================================
// CREATE MODE - GREETINGS (Character Mode)
// ============================================================================

function rebuildGreetingTabs() {
    const tabsEl = document.querySelector('.bt-create-greetings-tabs');
    if (!tabsEl) return;

    const addBtn = tabsEl.querySelector('.bt-create-greeting-add');
    // Remove all tabs except the add button
    tabsEl.querySelectorAll('.bt-create-greeting-tab').forEach(t => t.remove());

    greetings.forEach((_, i) => {
        const tab = document.createElement('div');
        tab.className = `bt-create-greeting-tab${i === activeGreetingIndex ? ' active' : ''}`;
        tab.dataset.index = String(i);

        let html = `${translate('Dialogue')} ${i + 1}`;
        if (i > 0) {
            html += ` <span class="bt-create-greeting-remove" data-index="${i}">&times;</span>`;
        }
        tab.innerHTML = html;

        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('bt-create-greeting-remove')) {
                removeGreeting(parseInt(e.target.dataset.index));
                return;
            }
            saveCurrentGreeting();
            activeGreetingIndex = i;
            rebuildGreetingTabs();
            renderGreetingTextarea();
        });

        tabsEl.insertBefore(tab, addBtn);
    });
}

function renderGreetingTextarea() {
    // Hide all, show active
    const container = document.querySelector('.bt-create-greetings');
    if (!container) return;

    // Remove existing textareas
    container.querySelectorAll('.bt-create-greeting-textarea').forEach(t => t.remove());

    const textarea = document.createElement('textarea');
    textarea.id = `bt-create-first-message-${activeGreetingIndex}`;
    textarea.className = 'bt-create-textarea bt-create-greeting-textarea';
    textarea.rows = 5;
    textarea.placeholder = 'Add the first AI message here...';
    textarea.value = greetings[activeGreetingIndex] || '';
    textarea.addEventListener('input', () => {
        greetings[activeGreetingIndex] = textarea.value;
    });

    container.appendChild(textarea);
}

function saveCurrentGreeting() {
    const textarea = document.querySelector(`.bt-create-greetings .bt-create-greeting-textarea`);
    if (textarea) {
        greetings[activeGreetingIndex] = textarea.value;
    }
}

function addGreeting() {
    saveCurrentGreeting();
    greetings.push('');
    activeGreetingIndex = greetings.length - 1;
    rebuildGreetingTabs();
    renderGreetingTextarea();
}

function removeGreeting(index) {
    if (greetings.length <= 1) return;
    greetings.splice(index, 1);
    if (activeGreetingIndex >= greetings.length) {
        activeGreetingIndex = greetings.length - 1;
    }
    rebuildGreetingTabs();
    renderGreetingTextarea();
}

// ============================================================================
// CREATE MODE - GREETINGS (World Mode)
// ============================================================================

function rebuildWorldGreetingTabs() {
    const tabsEl = document.querySelector('.bt-create-world-greetings .bt-create-greetings-tabs');
    if (!tabsEl) return;

    const addBtn = tabsEl.querySelector('.bt-create-greeting-add');
    tabsEl.querySelectorAll('.bt-create-greeting-tab').forEach(t => t.remove());

    worldGreetings.forEach((_, i) => {
        const tab = document.createElement('div');
        tab.className = `bt-create-greeting-tab${i === activeWorldGreetingIndex ? ' active' : ''}`;
        tab.dataset.index = String(i);

        let html = `${translate('Dialogue')} ${i + 1}`;
        if (i > 0) {
            html += ` <span class="bt-create-greeting-remove" data-index="${i}">&times;</span>`;
        }
        tab.innerHTML = html;

        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('bt-create-greeting-remove')) {
                removeWorldGreeting(parseInt(e.target.dataset.index));
                return;
            }
            saveCurrentWorldGreeting();
            activeWorldGreetingIndex = i;
            rebuildWorldGreetingTabs();
            renderWorldGreetingTextarea();
        });

        tabsEl.insertBefore(tab, addBtn);
    });
}

function renderWorldGreetingTextarea() {
    const container = document.querySelector('.bt-create-world-greetings');
    if (!container) return;

    container.querySelectorAll('.bt-create-greeting-textarea').forEach(t => t.remove());

    const textarea = document.createElement('textarea');
    textarea.id = `bt-create-world-first-message-${activeWorldGreetingIndex}`;
    textarea.className = 'bt-create-textarea bt-create-greeting-textarea';
    textarea.rows = 5;
    textarea.placeholder = 'Add the first AI message here...';
    textarea.value = worldGreetings[activeWorldGreetingIndex] || '';
    textarea.addEventListener('input', () => {
        worldGreetings[activeWorldGreetingIndex] = textarea.value;
    });

    container.appendChild(textarea);
}

function saveCurrentWorldGreeting() {
    const textarea = document.querySelector('.bt-create-world-greetings .bt-create-greeting-textarea');
    if (textarea) {
        worldGreetings[activeWorldGreetingIndex] = textarea.value;
    }
}

function addWorldGreeting() {
    saveCurrentWorldGreeting();
    worldGreetings.push('');
    activeWorldGreetingIndex = worldGreetings.length - 1;
    rebuildWorldGreetingTabs();
    renderWorldGreetingTextarea();
}

function removeWorldGreeting(index) {
    if (worldGreetings.length <= 1) return;
    worldGreetings.splice(index, 1);
    if (activeWorldGreetingIndex >= worldGreetings.length) {
        activeWorldGreetingIndex = worldGreetings.length - 1;
    }
    rebuildWorldGreetingTabs();
    renderWorldGreetingTextarea();
}

// ============================================================================
// CREATE MODE - WORLD INFO (World Mode)
// ============================================================================

function rebuildWiTabs() {
    const tabsEl = document.querySelector('.bt-create-wi-tabs');
    if (!tabsEl) return;

    const addBtn = tabsEl.querySelector('.bt-create-wi-tab-add');
    // Remove all tabs except the add button
    tabsEl.querySelectorAll('.bt-create-wi-tab').forEach(t => t.remove());

    wiEntries.forEach((entry, i) => {
        const tab = document.createElement('div');
        tab.className = `bt-create-wi-tab${i === activeWiEntryIndex ? ' active' : ''}`;
        tab.dataset.entry = String(i);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = entry.comment || `Entry ${i + 1}`;
        tab.appendChild(nameSpan);

        if (wiEntries.length > 1) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'bt-create-wi-tab-close';
            closeBtn.dataset.entry = String(i);
            closeBtn.title = 'Remove entry';
            closeBtn.textContent = '\u00D7';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeWiEntry(i);
            });
            tab.appendChild(closeBtn);
        }

        tab.addEventListener('click', () => {
            saveCurrentWiEntry();
            activeWiEntryIndex = i;
            rebuildWiTabs();
            renderWiEditor();
        });

        tabsEl.insertBefore(tab, addBtn);
    });
}

function renderWiEditor() {
    const entry = wiEntries[activeWiEntryIndex];
    if (!entry) return;

    const enabledCheckbox = document.getElementById('bt-create-wi-enabled');
    const commentInput = document.getElementById('bt-create-wi-comment');
    const contentTextarea = document.getElementById('bt-create-wi-content');
    const constantCheckbox = document.getElementById('bt-create-wi-constant');
    const keysInput = document.getElementById('bt-create-wi-keys');
    const positionSelect = document.getElementById('bt-create-wi-position');
    const orderInput = document.getElementById('bt-create-wi-order');
    const roleSelect = document.getElementById('bt-create-wi-role');
    const depthInput = document.getElementById('bt-create-wi-depth');
    const keysField = document.getElementById('bt-create-wi-keys-field');

    if (enabledCheckbox) enabledCheckbox.checked = entry.enabled;
    if (commentInput) commentInput.value = entry.comment;
    if (contentTextarea) contentTextarea.value = entry.content;
    if (constantCheckbox) constantCheckbox.checked = entry.constant;
    if (keysInput) keysInput.value = entry.keys;
    if (orderInput) orderInput.value = entry.order;
    if (depthInput) depthInput.value = entry.depth;

    // Set position select value (handle atDepth specially)
    if (positionSelect) {
        const posVal = String(entry.position);
        const options = positionSelect.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === posVal) {
                if (posVal === '4') {
                    // At depth - match role
                    if (options[i].dataset.role === String(entry.role)) {
                        positionSelect.selectedIndex = i;
                        break;
                    }
                } else {
                    positionSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    if (roleSelect) roleSelect.value = String(entry.role);

    // Show/hide trigger words based on constant mode
    if (keysField) {
        keysField.style.display = entry.constant ? 'none' : '';
    }
}

function saveCurrentWiEntry() {
    const entry = wiEntries[activeWiEntryIndex];
    if (!entry) return;

    const enabledCheckbox = document.getElementById('bt-create-wi-enabled');
    const commentInput = document.getElementById('bt-create-wi-comment');
    const contentTextarea = document.getElementById('bt-create-wi-content');
    const constantCheckbox = document.getElementById('bt-create-wi-constant');
    const keysInput = document.getElementById('bt-create-wi-keys');
    const positionSelect = document.getElementById('bt-create-wi-position');
    const orderInput = document.getElementById('bt-create-wi-order');
    const roleSelect = document.getElementById('bt-create-wi-role');
    const depthInput = document.getElementById('bt-create-wi-depth');

    if (enabledCheckbox) entry.enabled = enabledCheckbox.checked;
    if (commentInput) entry.comment = commentInput.value;
    if (contentTextarea) entry.content = contentTextarea.value;
    if (constantCheckbox) entry.constant = constantCheckbox.checked;
    if (keysInput) entry.keys = keysInput.value;
    if (orderInput) entry.order = parseInt(orderInput.value) || 100;
    if (depthInput) entry.depth = parseInt(depthInput.value) || 4;

    if (positionSelect) {
        const selectedOption = positionSelect.options[positionSelect.selectedIndex];
        entry.position = parseInt(selectedOption.value) || 0;
        if (selectedOption.dataset.role !== undefined && selectedOption.dataset.role !== '') {
            entry.role = parseInt(selectedOption.dataset.role) || 0;
        }
    }

    if (roleSelect) entry.role = parseInt(roleSelect.value) || 0;
}

function addWiEntry() {
    saveCurrentWiEntry();
    wiEntries.push({
        comment: `Entry ${wiEntries.length + 1}`,
        content: '',
        enabled: true,
        constant: false,
        keys: '',
        position: 0,
        order: 100,
        role: 0,
        depth: 4,
    });
    activeWiEntryIndex = wiEntries.length - 1;
    rebuildWiTabs();
    renderWiEditor();
}

function removeWiEntry(index) {
    if (wiEntries.length <= 1) return;
    wiEntries.splice(index, 1);
    if (activeWiEntryIndex >= wiEntries.length) {
        activeWiEntryIndex = wiEntries.length - 1;
    }
    rebuildWiTabs();
    renderWiEditor();
}

// ============================================================================
// CREATE MODE - SUBMISSION
// ============================================================================

/**
 * Create a character card via API
 */
async function createCharacterCard(name, description, firstMessage, alternateGreetings, avatarBlob) {
    if (is_group_generating || is_send_press) {
        toastr.error(translate('Cannot create while generating. Stop the request and try again.'));
        return null;
    }

    const formData = new FormData();
    formData.set('ch_name', name);
    formData.set('description', description);
    formData.set('first_mes', firstMessage);
    formData.set('personality', '');
    formData.set('scenario', '');
    formData.set('mes_example', '');
    formData.set('creator_notes', '');
    formData.set('system_prompt', '');
    formData.set('post_history_instructions', '');
    formData.set('tags', '');
    formData.set('creator', '');
    formData.set('character_version', '');
    formData.set('talkativeness', '0.5');
    formData.set('fav', 'false');
    formData.set('extensions', JSON.stringify({}));

    // Add alternate greetings
    for (const greeting of alternateGreetings) {
        formData.append('alternate_greetings', greeting);
    }

    if (avatarBlob) {
        formData.set('avatar', avatarBlob, 'avatar.png');
    }

    const url = '/api/characters/create';

    const response = await fetch(url, {
        method: 'POST',
        headers: getRequestHeaders({ omitContentType: true }),
        body: formData,
        cache: 'no-cache',
    });

    if (!response.ok) {
        throw new Error('Failed to create character');
    }

    return await response.text(); // Returns avatar filename
}

/**
 * Create a character card with an attached world info book
 */
async function createCharacterWithWorld(name, avatarBlob, entries, firstMessage, alternateGreetings) {
    if (is_group_generating || is_send_press) {
        toastr.error(translate('Cannot create while generating. Stop the request and try again.'));
        return null;
    }

    // 1. Create the world info book
    const worldName = `${name}_World`;
    const created = await createNewWorldInfo(worldName, { interactive: false });
    if (!created) {
        throw new Error('Failed to create world info book');
    }

    // 2. Load the newly created book data and add entries
    const worldData = { entries: {} };

    for (let i = 0; i < entries.length; i++) {
        const entryData = entries[i];
        const newEntry = createWorldInfoEntry(worldName, worldData);
        if (!newEntry) continue;

        newEntry.comment = entryData.comment || `Entry ${i + 1}`;
        newEntry.content = entryData.content || '';
        newEntry.disable = !entryData.enabled;
        newEntry.constant = entryData.constant;
        newEntry.addMemo = true; // Show comment in editor

        // Parse trigger words from comma/space/newline-separated string
        if (entryData.keys && !entryData.constant) {
            newEntry.key = entryData.keys
                .split(/[,\s\n]+/)
                .map(k => k.trim())
                .filter(k => k.length > 0);
        }

        newEntry.position = entryData.position;
        newEntry.order = entryData.order;
        newEntry.role = entryData.role;
        newEntry.depth = entryData.depth;
    }

    // 3. Save the world info with all entries
    await saveWorldInfo(worldName, worldData, true);
    await updateWorldInfoList();

    // 4. Create a character card bound to this world book
    const formData = new FormData();
    formData.set('ch_name', name);
    formData.set('description', '');
    formData.set('first_mes', firstMessage || '');
    formData.set('personality', '');
    formData.set('scenario', '');
    formData.set('mes_example', '');
    formData.set('creator_notes', '');
    formData.set('system_prompt', '');
    formData.set('post_history_instructions', '');
    formData.set('tags', '');
    formData.set('creator', '');
    formData.set('character_version', '');
    formData.set('talkativeness', '0.5');
    formData.set('fav', 'false');
    formData.set('world', worldName);
    formData.set('extensions', JSON.stringify({}));

    // Add alternate greetings
    if (alternateGreetings) {
        for (const greeting of alternateGreetings) {
            formData.append('alternate_greetings', greeting);
        }
    }

    if (avatarBlob) {
        formData.set('avatar', avatarBlob, 'avatar.png');
    }

    const response = await fetch('/api/characters/create', {
        method: 'POST',
        headers: getRequestHeaders({ omitContentType: true }),
        body: formData,
        cache: 'no-cache',
    });

    if (!response.ok) {
        throw new Error('Failed to create character');
    }

    return await response.text(); // Returns avatar filename
}

/**
 * Handle the create submit button click
 */
async function handleCreateSubmit() {
    const nameInput = document.getElementById('bt-create-name');
    const name = nameInput?.value?.trim();

    if (!name) {
        toastr.error(translate('Please enter a character name'));
        nameInput?.focus();
        return;
    }

    const submitBtn = document.getElementById('bt-create-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${translate('Creating...')}`;
    }

    try {
        let avatarId;

        if (createMode === 'character') {
            // Save current greeting before submitting
            saveCurrentGreeting();

            const description = document.getElementById('bt-create-description')?.value || '';
            const firstMessage = greetings[0] || '';
            const alternateGreetings = greetings.slice(1).filter(g => g.trim().length > 0);

            avatarId = await createCharacterCard(name, description, firstMessage, alternateGreetings, avatarFile);
        } else {
            // World mode
            saveCurrentWiEntry();
            saveCurrentWorldGreeting();

            const firstMessage = worldGreetings[0] || '';
            const alternateGreetings = worldGreetings.slice(1).filter(g => g.trim().length > 0);

            avatarId = await createCharacterWithWorld(name, avatarFile, wiEntries, firstMessage, alternateGreetings);
        }

        if (!avatarId) {
            throw new Error('No avatar ID returned');
        }

        // Refresh characters list and select the new one
        await getCharacters();
        const newIndex = characters.findIndex((char) => char.avatar === avatarId);
        if (newIndex !== -1) {
            await selectCharacterById(newIndex);
        }

        toastr.success(`${name} ${translate('created successfully!')}`);
        closeStartNew();
    } catch (error) {
        console.error('[BetterTavern] Create error:', error);
        toastr.error(`Failed to create: ${error.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${translate('Create')} <i class="fa-solid fa-arrow-right"></i>`;
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
        setTimeout(setupEventListeners, 1000);
    }
}

function setupEventListeners() {
    if (startNewInitialized) {
        console.log('[BetterTavern] Start New already initialized, skipping');
        return;
    }
    startNewInitialized = true;

    // Close button
    const closeBtn = document.getElementById('bt-startnew-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeStartNew);
    }

    // Close on backdrop click
    const modal = document.getElementById('bt-startnew-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeStartNew();
            }
        });
    }

    // Option buttons (Import / Library / Create)
    document.querySelectorAll('.bt-startnew-option').forEach(opt => {
        opt.addEventListener('click', () => {
            switchSection(opt.dataset.section);
            if (opt.dataset.section === 'library') {
                loadCharacterGrid();
            }
        });
    });

    // Dropzone for import
    const dropzone = document.getElementById('bt-startnew-dropzone');
    if (dropzone) {
        dropzone.addEventListener('click', () => {
            const fileInput = dropzone.querySelector('input[type="file"]');
            if (fileInput) fileInput.click();
        });

        const fileInput = dropzone.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target instanceof HTMLInputElement && e.target.files) {
                    handleFileImport(e.target.files);
                }
            });
        }

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer?.files) {
                handleFileImport(e.dataTransfer.files);
            }
        });
    }

    // Sidebar buttons
    const sidebarBtn = document.getElementById('bt-startnew-btn');
    if (sidebarBtn) {
        sidebarBtn.addEventListener('click', openStartNew);
    }

    const assistantBtn = document.getElementById('bt-assistant-btn');
    if (assistantBtn) {
        assistantBtn.addEventListener('click', () => {
            if (is_group_generating || is_send_press) {
                toastr.warning(translate('Please wait for the AI to finish generating before switching.'));
                return;
            }
            closeCurrentPanel();
            void returnToWelcomeScreen();
        });
    }

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('open')) {
            closeStartNew();
        }
    });

    // ========================================================================
    // CREATE MODE EVENT LISTENERS
    // ========================================================================

    // Mode toggle buttons (Character / World)
    document.querySelectorAll('.bt-create-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchCreateMode(btn.dataset.mode);
        });
    });

    // Avatar upload
    const avatarEl = document.getElementById('bt-create-avatar');
    const avatarInput = document.getElementById('bt-create-avatar-input');
    if (avatarEl && avatarInput) {
        avatarEl.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            avatarFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                avatarEl.style.backgroundImage = `url(${ev.target.result})`;
                avatarEl.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        });
    }

    // Add greeting button
    const addGreetingBtn = document.getElementById('bt-create-greeting-add');
    if (addGreetingBtn) {
        addGreetingBtn.addEventListener('click', addGreeting);
    }

    // Add world greeting button
    const addWorldGreetingBtn = document.getElementById('bt-create-world-greeting-add');
    if (addWorldGreetingBtn) {
        addWorldGreetingBtn.addEventListener('click', addWorldGreeting);
    }

    // Add WI entry button
    const addWiBtn = document.getElementById('bt-create-wi-add');
    if (addWiBtn) {
        addWiBtn.addEventListener('click', addWiEntry);
    }

    // WI constant toggle - show/hide keys field
    const constantCheckbox = document.getElementById('bt-create-wi-constant');
    if (constantCheckbox) {
        constantCheckbox.addEventListener('change', () => {
            const keysField = document.getElementById('bt-create-wi-keys-field');
            if (keysField) {
                keysField.style.display = constantCheckbox.checked ? 'none' : '';
            }
        });
    }

    // WI comment input - update tab name live
    const commentInput = document.getElementById('bt-create-wi-comment');
    if (commentInput) {
        commentInput.addEventListener('input', () => {
            if (wiEntries[activeWiEntryIndex]) {
                wiEntries[activeWiEntryIndex].comment = commentInput.value;
                // Update the active tab text
                const activeTab = document.querySelector(`.bt-create-wi-tab[data-entry="${activeWiEntryIndex}"] span`);
                if (activeTab) {
                    activeTab.textContent = commentInput.value || `Entry ${activeWiEntryIndex + 1}`;
                }
            }
        });
    }

    // Submit button
    const submitBtn = document.getElementById('bt-create-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleCreateSubmit);
    }

    console.log('[BetterTavern] Start New page initialized');
}

// Initialize
init();

// Export for external use
window.BetterTavern = window.BetterTavern || {};
window.BetterTavern.openStartNew = openStartNew;
window.BetterTavern.closeStartNew = closeStartNew;
