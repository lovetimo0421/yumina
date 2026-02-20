/**
 * BetterTavern Input Menu Module
 * Simplified input menu with only: Attach file, Restart chat
 */

/**
 * Dynamically update --bt-reply-bar-height when the reply bar resizes
 * (e.g. multi-line textarea expansion). Keeps #chat bottom from hiding
 * behind the input bar.
 */
function initReplyBarResizeObserver() {
    const formSheld = document.getElementById('form_sheld');
    if (!formSheld) return;

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const height = Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? entry.target.offsetHeight);
            document.documentElement.style.setProperty('--bt-reply-bar-height', height + 'px');
        }
    });

    observer.observe(formSheld);
}

/**
 * Initializes the simplified input menu
 */
function initInputMenu() {
    const menuBtn = document.getElementById('bt-input-menu-btn');
    const menu = document.getElementById('bt-input-menu');

    if (!menuBtn || !menu) {
        console.warn('[BetterTavern] Input menu elements not found');
        return;
    }

    // Toggle menu on button click
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== menuBtn) {
            menu.classList.remove('open');
        }
    });

    // Handle menu item clicks
    menu.querySelectorAll('.bt-input-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            handleMenuAction(action);
            menu.classList.remove('open');
        });
    });

    console.log('[BetterTavern] Input menu initialized');
}

/**
 * Handles menu item actions
 * @param {string} action - The action to perform
 */
function handleMenuAction(action) {
    switch (action) {
        case 'attach':
            // Trigger the file attachment input
            const fileInput = document.getElementById('file_form_input');
            if (fileInput) {
                fileInput.click();
            } else {
                // Try alternative file input
                const altFileInput = document.querySelector('#file_form input[type="file"]');
                if (altFileInput) {
                    altFileInput.click();
                }
            }
            break;


        case 'restart':
            // Trigger start new chat
            const newChatBtn = document.getElementById('option_start_new_chat');
            if (newChatBtn) {
                newChatBtn.click();
            }
            break;

        default:
            console.warn('[BetterTavern] Unknown action:', action);
    }
}

/**
 * Initializes the voice input button using the Web Speech API.
 */
function initVoiceInput() {
    const button = document.getElementById('bt-voice-input');
    const textarea = document.getElementById('send_textarea');

    if (!button || !textarea) {
        return;
    }

    if (button.dataset.btVoiceInit === 'true') {
        return;
    }
    button.dataset.btVoiceInit = 'true';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        button.classList.add('is-disabled');
        button.setAttribute('aria-disabled', 'true');
        button.setAttribute('title', 'Voice input is not supported in this browser');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || 'en-US';

    let isListening = false;

    const setListeningState = (nextState) => {
        isListening = nextState;
        button.classList.toggle('is-listening', isListening);
    };

    button.addEventListener('click', () => {
        if (button.classList.contains('is-disabled')) {
            return;
        }

        if (isListening) {
            recognition.stop();
            return;
        }

        try {
            recognition.start();
        } catch (error) {
            console.warn('[BetterTavern] Voice input failed to start', error);
        }
    });

    recognition.addEventListener('start', () => setListeningState(true));
    recognition.addEventListener('end', () => setListeningState(false));
    recognition.addEventListener('error', (event) => {
        console.warn('[BetterTavern] Voice input error', event.error);
        setListeningState(false);
    });
    recognition.addEventListener('result', (event) => {
        const transcript = Array.from(event.results)
            .map((result) => result[0]?.transcript ?? '')
            .join('')
            .trim();

        if (!transcript) {
            return;
        }

        const spacer = textarea.value && !textarea.value.endsWith(' ') ? ' ' : '';
        textarea.value = `${textarea.value}${spacer}${transcript}`;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initInputMenu();
        initVoiceInput();
        initReplyBarResizeObserver();
    });
} else {
    // DOM already loaded, initialize after a brief delay
    setTimeout(() => {
        initInputMenu();
        initVoiceInput();
        initReplyBarResizeObserver();
    }, 500);
}
