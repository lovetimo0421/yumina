/**
 * BetterTavern Message Actions Module
 * Handles Regenerate and Revert (backtrack) buttons on messages
 */

import {
    chat,
    Generate,
    saveChatDebounced,
} from '../script.js';

import { eventSource, event_types } from './events.js';
import { translate } from './i18n.js';

// Prevent concurrent operations
let isOperationInProgress = false;

/**
 * Regenerate the AI response for a specific message
 * @param {number} messageId - The ID of the message to regenerate
 */
async function regenerateMessage(messageId) {
    // Prevent concurrent operations
    if (isOperationInProgress) {
        console.log('[BetterTavern] Operation already in progress, skipping');
        return;
    }

    isOperationInProgress = true;

    try {
        // For regeneration, we need to delete the message and all after it, then generate
        const chatLength = chat.length;

        // If this is not the last AI message, we need to backtrack first
        if (messageId < chatLength - 1) {
            await revertToMessageInternal(messageId - 1); // Revert to before this message
        } else {
            // Just remove the last message
            const lastMesBlock = $('#chat').children('.mes').last();
            lastMesBlock.remove();
            chat.pop(); // Use pop() instead of length mutation
            await eventSource.emit(event_types.MESSAGE_DELETED, chat.length);
        }

        // Trigger generation
        await Generate('normal');
    } catch (error) {
        console.error('[BetterTavern] Error regenerating message:', error);
    } finally {
        isOperationInProgress = false;
    }
}

/**
 * Internal revert function (doesn't manage the lock)
 * @param {number} messageId - The ID of the message to revert to
 */
async function revertToMessageInternal(messageId) {
    const targetLength = messageId + 1;

    if (chat.length <= targetLength) {
        console.log('[BetterTavern] Nothing to revert - already at or before this message');
        return;
    }

    // Remove messages from DOM (from last to target)
    const chatElement = $('#chat');
    while (chat.length > targetLength) {
        chatElement.children('.mes').last().remove();
        chat.pop(); // Use pop() instead of length mutation
        await eventSource.emit(event_types.MESSAGE_DELETED, chat.length);
    }

    // Save the chat
    await saveChatDebounced();

    console.log(`[BetterTavern] Reverted to message ${messageId}, chat now has ${chat.length} messages`);
}

/**
 * Revert/backtrack to a specific message (delete all messages after it)
 * @param {number} messageId - The ID of the message to revert to (this message will be kept)
 */
async function revertToMessage(messageId) {
    // Prevent concurrent operations
    if (isOperationInProgress) {
        console.log('[BetterTavern] Operation already in progress, skipping');
        return;
    }

    isOperationInProgress = true;

    try {
        await revertToMessageInternal(messageId);
    } catch (error) {
        console.error('[BetterTavern] Error reverting message:', error);
    } finally {
        isOperationInProgress = false;
    }
}

/**
 * Initialize the message action button handlers
 */
function initMessageActions() {
    // Regenerate button click handler
    $(document).on('click', '.bt_mes_regenerate', async function(e) {
        e.stopPropagation();
        const messageId = Number($(this).closest('.mes').attr('mesid'));

        // Only allow regenerate on AI messages (not user messages)
        const message = chat[messageId];
        if (message && message.is_user) {
            console.log('Cannot regenerate user messages');
            return;
        }

        await regenerateMessage(messageId);
    });

    // Revert button click handler
    $(document).on('click', '.bt_mes_revert', async function(e) {
        e.stopPropagation();
        const messageId = Number($(this).closest('.mes').attr('mesid'));

        // Confirm before reverting (deleting messages is destructive)
        const confirmRevert = confirm(translate('Revert to this message?') + ` ${chat.length - messageId - 1} ` + translate('messages will be deleted.'));
        if (!confirmRevert) {
            return;
        }

        await revertToMessage(messageId);
    });

    console.log('BetterTavern message actions initialized');
}

// Initialize when DOM is ready
$(document).ready(function() {
    initMessageActions();
});
