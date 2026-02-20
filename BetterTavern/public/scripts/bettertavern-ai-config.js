/**
 * BetterTavern AI Config Module
 * Handles Simple/Advanced tab switching and UI enhancements for the AI Config panel
 */

import { translate } from './i18n.js';

const DEFAULT_TAB = 'simple';
const STORAGE_KEY = 'bettertavern_ai_config_tab';

// ─── Friendly descriptions for Simple view settings ───────────────────────────

const SETTING_DESCRIPTIONS = {
    openai_max_context: {
        icon: 'fa-brain',
        label: 'Memory Size',
        description: 'How much conversation history the AI can see. Larger values let the AI remember more but use more tokens.',
    },
    openai_max_tokens: {
        icon: 'fa-pen-nib',
        label: 'Response Length',
        description: 'Maximum length of each AI reply. ~750 tokens is about 500 words. Increase for longer, more detailed responses.',
    },
    temp_openai: {
        icon: 'fa-palette',
        label: 'Creativity',
        description: 'Controls how creative vs predictable the AI is. Try 0.8 for focused, 1 for balanced, or 1.2 for more variety. Range is 0–2.',
    },
    stream_toggle: {
        icon: 'fa-water',
        label: 'Streaming',
        description: 'Show AI responses word-by-word as they are generated, instead of waiting for the full response.',
    },
};

// ─── Friendly names and descriptions for Prompt Manager entries ───────────────

const PROMPT_FRIENDLY_NAMES = {
    // System Instructions
    main:                { friendly: 'System Instructions',     category: 'system',  hint: 'The main instructions that define how the AI behaves' },
    nsfw:                { friendly: 'Content Guidelines',      category: 'system',  hint: 'Rules for what kind of content the AI can generate' },
    jailbreak:           { friendly: 'Post-History Instructions', category: 'system', hint: 'Instructions sent after the conversation history' },
    enhanceDefinitions:  { friendly: 'Enhanced Details',        category: 'system',  hint: 'Extra details to enrich character descriptions' },

    // Context Order (markers)
    worldInfoBefore:     { friendly: 'World Info (Before)',      category: 'context', hint: 'World/lore info placed before the character' },
    personaDescription:  { friendly: 'Your Persona',            category: 'context', hint: 'Description of your character/persona' },
    charDescription:     { friendly: 'Character Description',   category: 'context', hint: 'The AI character\'s full description' },
    charPersonality:     { friendly: 'Character Personality',   category: 'context', hint: 'The AI character\'s personality traits' },
    scenario:            { friendly: 'Scenario',                category: 'context', hint: 'The scene or setting for the conversation' },
    worldInfoAfter:      { friendly: 'World Info (After)',       category: 'context', hint: 'World/lore info placed after the character' },
    dialogueExamples:    { friendly: 'Example Dialogue',        category: 'context', hint: 'Sample conversations showing the character\'s style' },
    chatHistory:         { friendly: 'Conversation History',    category: 'context', hint: 'The actual messages exchanged so far' },
};

const CATEGORY_LABELS = {
    system:  { label: 'System Prompts',   icon: 'fa-cog',        description: 'Core instructions that tell the AI how to behave. These define the AI\'s personality, rules, and guidelines.' },
    context: { label: 'Context Order',    icon: 'fa-layer-group', description: 'Controls the order information is sent to the AI. Drag to rearrange what the AI sees first.' },
    custom:  { label: 'Custom Prompts',   icon: 'fa-plus-circle', description: 'Your own custom prompts and injections. Create new ones with the button below.' },
};

/**
 * Switch to the specified tab view
 * @param {string} tabName - 'simple' or 'advanced'
 */
export function switchAIConfigTab(tabName) {
    // Update body class for CSS targeting
    document.body.classList.remove('ai-config-simple-view', 'ai-config-advanced-view');
    document.body.classList.add(`ai-config-${tabName}-view`);

    // Update tab button states
    document.querySelectorAll('.ai-config-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Persist preference
    localStorage.setItem(STORAGE_KEY, tabName);

    // Apply Simple view enhancements when switching to simple
    if (tabName === 'simple') {
        setTimeout(() => {
            injectSettingDescriptions();
            enhancePromptManager();
        }, 150);
    }

    // Clean up any stale inline styles when switching to advanced view
    // so the original ST UI is fully restored
    if (tabName === 'advanced') {
        document.querySelectorAll('#range_block_openai .range-block-title').forEach(el => {
            el.style.removeProperty('display');
        });
    }

    console.log(`[BetterTavern] AI Config switched to ${tabName} view`);
}

/**
 * Inject friendly labels and descriptions below the Simple view settings
 */
function injectSettingDescriptions() {
    for (const [inputId, info] of Object.entries(SETTING_DESCRIPTIONS)) {
        const input = document.getElementById(inputId);
        if (!input) continue;

        const rangeBlock = input.closest('.range-block');
        if (!rangeBlock) continue;

        // Skip if already injected
        if (rangeBlock.querySelector('.bt-friendly-label')) continue;

        // Find the title element to replace/augment
        const titleEl = rangeBlock.querySelector('.range-block-title');
        const checkboxLabel = rangeBlock.querySelector('.checkbox_label');
        const target = titleEl || checkboxLabel;

        if (target) {
            // Create friendly label
            const friendlyLabel = document.createElement('div');
            friendlyLabel.className = 'bt-friendly-label';
            friendlyLabel.innerHTML = `
                <span class="bt-label-icon fa-solid ${info.icon}"></span>
                <span>${translate(info.label)}</span>
            `;

            // Create description
            const desc = document.createElement('div');
            desc.className = 'bt-setting-description';
            desc.textContent = translate(info.description);

            // For checkbox labels (Streaming), wrap differently
            if (checkboxLabel) {
                // Insert before the checkbox label
                rangeBlock.insertBefore(friendlyLabel, checkboxLabel);
                checkboxLabel.after(desc);
            } else {
                // Insert friendly version before original title
                // (CSS hides .range-block-title in simple view, no inline style needed)
                rangeBlock.insertBefore(friendlyLabel, titleEl);
                friendlyLabel.after(desc);
            }
        }
    }

    // Mark the first visible row so CSS can hide its top divider
    const visibleOrder = ['openai_max_context', 'openai_max_tokens', 'temp_openai', 'stream_toggle'];
    let firstRowMarked = false;
    for (const id of visibleOrder) {
        const input = document.getElementById(id);
        if (!input) continue;
        const block = input.closest('.range-block');
        if (!block) continue;
        if (!firstRowMarked) {
            block.dataset.btFirstRow = 'true';
            firstRowMarked = true;
        } else {
            delete block.dataset.btFirstRow;
        }
    }
}

/**
 * Enhance the Prompt Manager list with friendly names, categories, and descriptions
 */
function enhancePromptManager() {
    const promptList = document.getElementById('completion_prompt_manager_list');
    if (!promptList) return;

    // Guard: wait until the list is actually populated with prompt items
    const items = promptList.querySelectorAll('li.completion_prompt_manager_prompt');
    if (items.length === 0) return;

    // Add section description below the prompt list header if not present
    const pmContainer = document.getElementById('completion_prompt_manager');
    if (pmContainer && !pmContainer.querySelector('.bt-pm-section-description')) {
        const headerDiv = pmContainer.querySelector('.completion_prompt_manager_header');
        if (headerDiv) {
            const sectionDesc = document.createElement('div');
            sectionDesc.className = 'bt-pm-section-description';
            sectionDesc.textContent = translate('Prompts control what the AI knows and how it responds. Toggle them on/off, click the pencil to edit, or drag to reorder.');
            // Insert after the footer (which is inserted after the header by PromptManager)
            const footer = pmContainer.querySelector('.completion_prompt_manager_footer');
            if (footer) {
                footer.after(sectionDesc);
            } else {
                headerDiv.after(sectionDesc);
            }
        }
    }

    // Apply friendly names, categories, and hints to each prompt item
    let lastCategory = null;
    const processedCategories = new Set();

    items.forEach(item => {
        const identifier = item.dataset.pmIdentifier;
        if (!identifier) return;

        // Skip if already enhanced
        if (item.dataset.btEnhanced) return;
        item.dataset.btEnhanced = 'true';

        const friendlyInfo = PROMPT_FRIENDLY_NAMES[identifier];
        const category = friendlyInfo ? friendlyInfo.category : 'custom';

        // Set data attribute for CSS category coloring
        item.dataset.btCategory = category;

        // Insert category header if entering a new category
        if (category !== lastCategory && !processedCategories.has(category)) {
            const catInfo = CATEGORY_LABELS[category];
            if (catInfo) {
                const catHeader = document.createElement('li');
                catHeader.className = `bt-pm-category-header bt-category-${category}`;
                catHeader.innerHTML = `
                    <span class="bt-category-icon fa-solid ${catInfo.icon}"></span>
                    <span>${translate(catInfo.label)}</span>
                `;
                catHeader.title = translate(catInfo.description);
                item.before(catHeader);
                processedCategories.add(category);
            }
            lastCategory = category;
        }

        // Add friendly hint below the prompt name
        if (friendlyInfo) {
            const nameSpan = item.querySelector('.completion_prompt_manager_prompt_name');
            if (nameSpan && !nameSpan.querySelector('.bt-pm-friendly-hint')) {
                // Update the display name
                const nameLink = nameSpan.querySelector('.prompt-manager-inspect-action') ||
                                 nameSpan.querySelector('span[title]');
                if (nameLink) {
                    nameLink.textContent = translate(friendlyInfo.friendly);
                    nameLink.title = `${translate(friendlyInfo.friendly)} (${identifier})`;
                }

                const hint = document.createElement('span');
                hint.className = 'bt-pm-friendly-hint';
                hint.textContent = translate(friendlyInfo.hint);
                nameSpan.appendChild(hint);
            }
        }
    });

    // Add text label to the New Prompt button in Simple view
    const footer = document.querySelector('.completion_prompt_manager_footer');
    if (footer) {
        const newBtn = footer.querySelector('[title="New prompt"]');
        if (newBtn && !newBtn.dataset.btLabeled) {
            newBtn.dataset.btLabeled = 'true';
            // Wrap with a span so we don't inject text directly into the FA icon element
            const labelSpan = document.createElement('span');
            labelSpan.className = 'bt-new-prompt-label';
            labelSpan.textContent = ' ' + translate('New Prompt');
            newBtn.appendChild(labelSpan);
        }
    }
}

/**
 * Set up a MutationObserver to re-apply enhancements when the Prompt Manager re-renders
 */
function observePromptManagerRenders() {
    const container = document.getElementById('completion_prompt_manager');
    if (!container) return;

    let debounceTimeout;
    const observer = new MutationObserver(() => {
        if (document.body.classList.contains('ai-config-simple-view')) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                enhancePromptManager();
            }, 250);
        }
    });

    observer.observe(container, { childList: true, subtree: true });
}

/**
 * Initialize the AI Config tab functionality
 */
export function initAIConfigTabs() {
    // Find the AI Config panel
    const leftNavPanel = document.getElementById('left-nav-panel');
    if (!leftNavPanel) {
        console.warn('[BetterTavern] AI Config panel not found');
        return;
    }

    const scrollableInner = leftNavPanel.querySelector('.scrollableInner');
    if (!scrollableInner) {
        console.warn('[BetterTavern] AI Config scrollable content not found');
        return;
    }

    // Check if tab bar already exists
    if (document.getElementById('ai-config-tabs')) {
        return;
    }

    // Create tab bar
    const tabBar = document.createElement('div');
    tabBar.id = 'ai-config-tabs';
    tabBar.className = 'ai-config-tab-bar';
    tabBar.innerHTML = `
        <button class="ai-config-tab active" data-tab="simple">${translate('Simple')}</button>
        <button class="ai-config-tab" data-tab="advanced">${translate('Advanced')}</button>
    `;

    // Insert tab bar before scrollable content
    leftNavPanel.insertBefore(tabBar, scrollableInner);

    // Set up click handlers
    document.querySelectorAll('.ai-config-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchAIConfigTab(tab.dataset.tab);
        });
    });

    // Restore saved preference or use default
    const savedTab = localStorage.getItem(STORAGE_KEY) || DEFAULT_TAB;
    switchAIConfigTab(savedTab);

    // Set up Prompt Manager re-render observer
    setTimeout(observePromptManagerRenders, 1000);

    console.log('[BetterTavern] AI Config tabs initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initAIConfigTabs, 500);
    });
} else {
    // DOM already loaded, wait for SillyTavern to initialize
    setTimeout(initAIConfigTabs, 500);
}
