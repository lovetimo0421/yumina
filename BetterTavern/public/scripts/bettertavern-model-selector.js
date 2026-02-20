/**
 * BetterTavern Model Selector Module
 *
 * Adds a Claude-style model selector dropdown to the reply bar.
 * Users can quickly switch between curated models without going to AI Config.
 */

import { oai_settings, chat_completion_sources } from './openai.js';
import { saveSettingsDebounced } from '../script.js';

// Track initialization state to prevent duplicate listeners
let isInitialized = false;
let settingsCheckInterval = null;

// Curated models for the demo
const CURATED_MODELS = [
    {
        id: 'anthropic/claude-opus-4.5',
        name: 'Opus 4.5',
        description: 'Best for original stories',
    },
    {
        id: 'google/gemini-3-pro-preview',
        name: 'Gemini 3 Pro',
        description: 'Best for large IPs',
    },
    {
        id: 'x-ai/grok-4.1-fast',
        name: 'Grok 4.1 Fast',
        description: 'Best for sensitivity contents',
    },
];

/**
 * Gets the display name for a model ID
 * @param {string} modelId - The OpenRouter model ID
 * @returns {string} The display name
 */
function getModelDisplayName(modelId) {
    const curatedModel = CURATED_MODELS.find(m => m.id === modelId);
    if (curatedModel) {
        return curatedModel.name;
    }
    // For non-curated models, extract a readable name from the ID
    // e.g., "meta-llama/llama-3.1-70b" -> "llama-3.1-70b"
    const parts = modelId.split('/');
    return parts.length > 1 ? parts[1] : modelId;
}

/**
 * Gets the current model ID from settings
 * @returns {string} The current model ID
 */
function getCurrentModelId() {
    return oai_settings?.openrouter_model || 'google/gemini-3-pro-preview';
}

/**
 * Updates the model selector display to show current model
 */
function updateModelSelectorDisplay() {
    const selectorBtn = document.getElementById('bt-model-selector-btn');
    if (!selectorBtn) return;

    const currentModel = getCurrentModelId();
    const displayName = getModelDisplayName(currentModel);

    const nameSpan = selectorBtn.querySelector('.bt-model-name');
    if (nameSpan) {
        nameSpan.textContent = displayName;
    }

    // Also update the dropdown selection state
    updateDropdownSelection();
}

/**
 * Updates the dropdown to show which model is currently selected
 */
function updateDropdownSelection() {
    const dropdown = document.getElementById('bt-model-dropdown');
    if (!dropdown) return;

    const currentModelId = getCurrentModelId();

    // Update all items
    dropdown.querySelectorAll('.bt-model-dropdown-item').forEach(item => {
        const modelId = item.dataset.modelId;
        const isSelected = modelId === currentModelId;
        const checkDiv = item.querySelector('.bt-model-item-check');

        // Update selected class
        item.classList.toggle('selected', isSelected);

        // Update checkmark
        if (checkDiv) {
            checkDiv.innerHTML = isSelected ? '<i class="fa-solid fa-check"></i>' : '';
        }
    });
}

/**
 * Changes the model and saves settings
 * @param {string} modelId - The model ID to switch to
 */
function changeModel(modelId) {
    if (!oai_settings) {
        console.warn('[BetterTavern] oai_settings not available');
        return;
    }

    // Ensure we're using OpenRouter as the chat completion source.
    // All curated models use OpenRouter model IDs (e.g., "anthropic/claude-opus-4.6").
    if (oai_settings.chat_completion_source !== chat_completion_sources.OPENROUTER) {
        oai_settings.chat_completion_source = chat_completion_sources.OPENROUTER;
        // Trigger change so openai.js runs toggleChatCompletionForms(),
        // reconnectOpenAi(), updateFeatureSupportFlags(), etc.
        $('#chat_completion_source').val(chat_completion_sources.OPENROUTER).trigger('change');
    }

    // Update the setting
    oai_settings.openrouter_model = modelId;

    // Sync the AI Config dropdown and trigger its change handler.
    // This fires onModelChange() in openai.js which updates context limits,
    // temperature caps, feature flags, and emits CHATCOMPLETION_MODEL_CHANGED.
    const $aiConfigDropdown = $('#model_openrouter_select');
    if ($aiConfigDropdown.length) {
        // Add a temporary option if the model isn't in the dropdown yet
        // (happens before API connect populates the list)
        const optionExists = $aiConfigDropdown.find(`option[value="${CSS.escape(modelId)}"]`).length > 0;
        if (!optionExists) {
            $aiConfigDropdown.append($('<option>', { value: modelId, text: modelId }));
        }
        $aiConfigDropdown.val(modelId).trigger('change');
    }

    // Always save — onModelChange() may early-return if the model list
    // hasn't loaded yet, skipping its own saveSettingsDebounced() call.
    saveSettingsDebounced();

    // Update our display
    updateModelSelectorDisplay();

    console.log('[BetterTavern] Model changed to:', modelId);
}

/**
 * Opens the model dropdown
 */
function openDropdown() {
    const container = document.getElementById('bt-model-selector-container');
    const dropdown = document.getElementById('bt-model-dropdown');
    if (!container || !dropdown) return;

    // Update selection state before showing
    updateDropdownSelection();

    // Show dropdown and mark container as open
    dropdown.classList.add('open');
    container.classList.add('open');
}

/**
 * Closes the model dropdown
 */
function closeDropdown() {
    const container = document.getElementById('bt-model-selector-container');
    const dropdown = document.getElementById('bt-model-dropdown');

    if (dropdown) {
        dropdown.classList.remove('open');
    }
    if (container) {
        container.classList.remove('open');
    }
}

/**
 * Toggles the dropdown open/closed
 */
function toggleDropdown() {
    const dropdown = document.getElementById('bt-model-dropdown');
    if (!dropdown) return;

    if (dropdown.classList.contains('open')) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

/**
 * Handle clicks outside the dropdown to close it
 * @param {Event} e - Click event
 */
function handleDocumentClick(e) {
    const container = document.getElementById('bt-model-selector-container');
    if (container && !container.contains(e.target)) {
        closeDropdown();
    }
}

/**
 * Handle Escape key to close dropdown
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleDocumentKeydown(e) {
    if (e.key === 'Escape') {
        closeDropdown();
    }
}

/**
 * Initializes the model selector
 */
function initModelSelector() {
    // Prevent duplicate initialization of document-level listeners
    if (isInitialized) {
        updateModelSelectorDisplay();
        return;
    }

    const selectorBtn = document.getElementById('bt-model-selector-btn');
    const dropdown = document.getElementById('bt-model-dropdown');

    if (!selectorBtn || !dropdown) {
        console.warn('[BetterTavern] Model selector elements not found');
        return;
    }

    // Mark as initialized before adding listeners
    isInitialized = true;

    // Set initial display
    updateModelSelectorDisplay();

    // Toggle dropdown on button click
    selectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    // Handle dropdown item clicks
    dropdown.querySelectorAll('.bt-model-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const modelId = item.dataset.modelId;
            if (modelId) {
                changeModel(modelId);
                closeDropdown();
            }
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', handleDocumentClick);

    // Close dropdown on Escape key
    document.addEventListener('keydown', handleDocumentKeydown);

    // Listen for model changes from AI Config panel
    const aiConfigDropdown = document.getElementById('model_openrouter_select');
    if (aiConfigDropdown) {
        aiConfigDropdown.addEventListener('change', () => {
            updateModelSelectorDisplay();
        });
    }

    console.log('[BetterTavern] Model selector initialized');
}

// Initialize when DOM is ready
function onReady() {
    // Wait a bit for other scripts to initialize
    setTimeout(initModelSelector, 1000);

    // Poll for settings to be loaded, then update display
    if (!settingsCheckInterval) {
        settingsCheckInterval = setInterval(() => {
            if (oai_settings?.openrouter_model) {
                updateModelSelectorDisplay();
                clearInterval(settingsCheckInterval);
                settingsCheckInterval = null;
            }
        }, 500);

        // Stop checking after 10 seconds
        setTimeout(() => {
            if (settingsCheckInterval) {
                clearInterval(settingsCheckInterval);
                settingsCheckInterval = null;
            }
        }, 10000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
} else {
    onReady();
}

// Export for external use
export { updateModelSelectorDisplay, changeModel, CURATED_MODELS };
