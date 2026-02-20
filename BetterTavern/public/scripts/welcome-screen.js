import {
    characters,
    chat,
    clearChat,
    deleteCharacterChatByName,
    displayVersion,
    event_types,
    eventSource,
    getCharacters,
    getCurrentChatId,
    getRequestHeaders,
    getThumbnailUrl,
    is_send_press,
    isChatSaving,
    neutralCharacterName,
    openCharacterChat,
    printCharactersDebounced,
    printMessages,
    renameGroupOrCharacterChat,
    saveChatConditional,
    saveSettingsDebounced,
    selectCharacterById,
    setActiveCharacter,
    setActiveGroup,
    setCharacterId,
    setCharacterName,
    system_avatar,
    this_chid,
    unshallowCharacter,
    updateChatMetadata,
    updateRemoteChatName,
} from '../script.js';
import { getRegexedString, regex_placement } from './extensions/regex/engine.js';
import { deleteGroupChatByName, groups, is_group_generating, openGroupById, openGroupChat, resetSelectedGroup } from './group-chats.js';
import { t } from './i18n.js';
import { callGenericPopup, POPUP_TYPE } from './popup.js';
import { getMessageTimeStamp } from './RossAscends-mods.js';
import { renderTemplateAsync } from './templates.js';
import { accountStorage } from './util/AccountStorage.js';
import { sortMoments, timestampToMoment } from './utils.js';

const assistantAvatarKey = 'assistant';
const defaultAssistantAvatar = 'default_Assistant.png';
const recentChatPinnedKey = 'WelcomePage_RecentChatsPinned';

const ASSISTANT_GREETING = '<style>.custom-cn { color: #e8a87c; font-weight: bold; } .custom-ct { color: #65d26e; font-size: 0.9em; } .custom-cd { opacity: 0.8; } .custom-sh { color: #c4a7e7; }</style>嗨~~~ :D\r\n我是 Yumina ♡\r\n\r\nYumina已经预先为你准备好一些可以探索游玩的世界和角色了哟(＾Ｕ＾)ノ\r\n你可以在左侧菜单栏的**Recent World**里浏览到你想要的世界（￣︶￣）↗　\r\n再然后就可以在下方输入自己想要做的一切了哦。\r\nYumina能做到的可不只是简单的聊天对话~\r\n在世界卡里，你可以做你想要做的任何事哦( •̀ ω •́ )✧\r\n当然，请不要做出太出乎意料的举动啦，若是你扮演的是个普通人却突然要飞起来，Yumina会傻掉的啦＞︿＜\r\n\r\n---\r\n\r\n<span class="sh">✦ 这里是Yumina准备好的卡的基础介绍哦：</span>\r\n\r\n<span class="cn">寻找伪人（No/I am not human)</span> <span class="ct">【强烈推荐】</span>\r\n<span class="cd">简介：在太阳变得致命炽热的末日世界，白天已无人能存活，你躲在最后一间紧闭的庇护小屋里。每当夜幕降临，门外便传来敲门声——那些疲惫的求助者，究竟是和你一样的人类，还是伪装得天衣无缝的"伪人"？</span>\r\n\r\n<span class="cn">避难所模拟器</span> <span class="ct">【强烈推荐】</span>\r\n<span class="cd">简介：在末日里避难所里当管理员的你，能管理好那些奇奇怪怪的刁民吗？你是会通过威慑，科研，亦或者气运运营避难所里的一切？</span>\r\n\r\n<span class="cn">云海仙途</span>\r\n<span class="cd">简介：穿越成为宗门最底层的杂役弟子，是甘心做一辈子门外扫雪的蝼蚁，还是踩着那群天之骄子的脸，一步步踏碎虚空，登顶云海之巅？</span>\r\n\r\n<span class="cn">新宿拯救计划</span>\r\n<span class="cd">简介：在这个欲望明码标价的新宿街头，你是选择沉沦在"出租女友"虚幻的甜蜜中，还是撕开她们完美的假面？Top1的傲娇小恶魔绘里奈，Top10的温柔初恋绾音，当金钱的交易结束——你是否有勇气，在这座不夜城里拯救这两位站在悬崖边的少女，以及你自己那颗早已麻木的心？</span>\r\n\r\n<span class="cn">三国：赤壁之战</span>\r\n<span class="cd">简介：建安十三年，北风凛冽，一场决定天下命运的赤壁烈火正在酝酿。你将投身这片注定被青史铭刻的战场，在八十万大军的旌旗间择主而战，亲手改写天下三分的乱世终局。</span>\r\n\r\n<span class="cn">斗罗大陆</span>\r\n<span class="cd">简介：一觉醒来，你竟身处圣魂村！唐三就在你的身边，觉醒仪式在即，你是会觉醒出惊才绝艳的双生武魂，还是那不起眼的"废武魂"？可以自由改变原著世界线，在这个没有魔法，没有斗气，只有武魂的世界，且看你如何翻云覆雨，再铸神位！</span>\r\n\r\n<span class="cn">我和马斯克竟然。。。</span>\r\n<span class="cd">简介：我醒来后却发现同样被困在屋子里的马斯克，我会做些什么？？</span>\r\n\r\n<span class="cn">DND 跑团拟器</span>\r\n<span class="cd">简介：Yumina将为至高无上的DM，而你可能是不幸误闯幽暗地域的冒险者。无论你的骰运是神来之笔还是大凶之兆，这里的每一寸阴影都潜伏着致命的玩笑。准备好面对疯狂的剧情转折和无情的运气判定了吗？</span>\r\n\r\n<span class="cn">心旅系统</span>\r\n<span class="cd">简介：你是被选中的位面旅人，专门攻略那些禁欲、高冷、甚至没有感情的顶级男神！无论是修无情道的清冷仙尊，还是为你背弃神明的圣洁圣子，亦或是产生情感bug的战斗仿生人，你的任务就是闯入他们的内心，让他们在宿命的纠缠中，只为你一个人沉沦。</span>\r\n\r\n---\r\n\r\n我们已调试好所有设置和世界，你开开心心的进行旅程就好！我们强烈建议沿用我们的默认设置和连接好了的Gemini 3 Pro~ 对了对了，因为在世界里可以自由的活动，所以**对于想说的话最好用""包裹住哦**，不然Yumina可能会不知道你是想要干掉他！，还是大喊"干掉他！" \\(￣︶￣*\\))\r\n\r\n如果还有任何疑惑，或者说只是想和Yumina聊聊天，Yumina随时都在（*＾-＾*）';

const DEFAULT_DISPLAYED = 3;
const MAX_DISPLAYED = 15;

let recentChatContextMenu = null;
let recentChatContextMenuTarget = null;
let welcomeScreenInitialized = false;

function getRecentChatStorageList(key) {
    const value = accountStorage.getItem(key);
    if (!value) {
        return [];
    }
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch (error) {
        console.warn('Failed to parse recent chat storage list.', error);
    }
    return [];
}

function setRecentChatStorageList(key, list) {
    accountStorage.setItem(key, JSON.stringify(list));
}

function buildRecentChatKey(avatarId, groupId, fileName) {
    if (groupId) {
        return `group:${groupId}:${fileName}`;
    }
    return `character:${avatarId}:${fileName}`;
}

function togglePinnedRecentChat(recentKey) {
    const pinnedList = getRecentChatStorageList(recentChatPinnedKey);
    const pinnedIndex = pinnedList.indexOf(recentKey);
    if (pinnedIndex !== -1) {
        pinnedList.splice(pinnedIndex, 1);
    } else {
        pinnedList.unshift(recentKey);
    }
    setRecentChatStorageList(recentChatPinnedKey, pinnedList);
    return pinnedIndex === -1;
}

function closeRecentChatContextMenu() {
    if (!recentChatContextMenu) {
        return;
    }
    recentChatContextMenu.classList.remove('open');
    recentChatContextMenuTarget = null;
}

function ensureRecentChatContextMenu() {
    if (recentChatContextMenu) {
        return recentChatContextMenu;
    }
    const menu = document.createElement('div');
    menu.className = 'recentChatContextMenu';
    menu.innerHTML = `
        <button type="button" class="menu_button recentChatContextAction" data-action="pin">
            <i class="fa-solid fa-thumbtack"></i>
            <span>${t`Stick On Top`}</span>
        </button>
        <button type="button" class="menu_button recentChatContextAction danger" data-action="delete">
            <i class="fa-solid fa-trash"></i>
            <span>${t`Delete Chat`}</span>
        </button>
    `;
    menu.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button || !recentChatContextMenuTarget) {
            return;
        }
        event.stopPropagation();
        const action = button.dataset.action;
        const avatarId = recentChatContextMenuTarget.getAttribute('data-avatar');
        const groupId = recentChatContextMenuTarget.getAttribute('data-group');
        const fileName = recentChatContextMenuTarget.getAttribute('data-file');
        if (!fileName) {
            closeRecentChatContextMenu();
            return;
        }
        const recentKey = buildRecentChatKey(avatarId, groupId, fileName);
        if (action === 'pin') {
            const pinned = togglePinnedRecentChat(recentKey);
            toastr.info(pinned ? t`Pinned chat to the top.` : t`Removed chat from the top.`);
            document.dispatchEvent(new CustomEvent('recent-worlds-updated'));
        }
        if (action === 'delete') {
            // Don't dispatch recent-worlds-updated here — the actual delete functions
            // fire CHAT_DELETED / GROUP_CHAT_DELETED events which the sidebar already
            // listens to. Dispatching before the async delete completes causes a stale
            // refresh that briefly shows the deleted chat.
            if (avatarId && fileName) {
                void deleteRecentCharacterChat(avatarId, fileName);
            }
            if (groupId && fileName) {
                void deleteRecentGroupChat(groupId, fileName);
            }
        }
        closeRecentChatContextMenu();
    });
    document.body.appendChild(menu);
    document.addEventListener('click', closeRecentChatContextMenu);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeRecentChatContextMenu();
        }
    });
    window.addEventListener('scroll', closeRecentChatContextMenu, true);
    window.addEventListener('resize', closeRecentChatContextMenu);
    recentChatContextMenu = menu;
    return menu;
}

function openRecentChatContextMenu(event, chatItem) {
    const menu = ensureRecentChatContextMenu();
    recentChatContextMenuTarget = chatItem;
    menu.dataset.avatar = chatItem.getAttribute('data-avatar') || '';
    menu.dataset.group = chatItem.getAttribute('data-group') || '';
    menu.dataset.file = chatItem.getAttribute('data-file') || '';
    const isPinned = chatItem.classList.contains('pinned');
    menu.querySelectorAll('.recentChatContextAction').forEach((button) => {
        const isPin = button.dataset.action === 'pin';
        button.classList.toggle('is-active', isPin && isPinned);
    });
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.classList.add('open');
    const bounds = menu.getBoundingClientRect();
    const maxX = window.innerWidth - bounds.width - 10;
    const maxY = window.innerHeight - bounds.height - 10;
    const nextX = Math.max(10, Math.min(event.clientX, maxX));
    const nextY = Math.max(10, Math.min(event.clientY, maxY));
    menu.style.left = `${nextX}px`;
    menu.style.top = `${nextY}px`;
}

function handleRecentChatContextMenu(event) {
    const chatItem = event.target.closest('.recentChat');
    if (!chatItem) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    openRecentChatContextMenu(event, chatItem);
}

function sortRecentChatsByTimestamp(chats) {
    return [...chats].sort((a, b) => sortMoments(timestampToMoment(a.last_mes), timestampToMoment(b.last_mes)));
}

async function ensureAssistantFavorited() {
    const avatar = getPermanentAssistantAvatar();
    const character = characters.find(x => x.avatar === avatar);
    if (!character) {
        return;
    }

    const isFavorite = character.fav === true || character.fav === 'true' || character.data?.extensions?.fav === true;
    if (isFavorite) {
        return;
    }

    const payload = {
        name: character.name,
        avatar: character.avatar,
        data: {
            extensions: {
                fav: true,
            },
        },
        fav: true,
    };

    try {
        const response = await fetch('/api/characters/merge-attributes', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Failed to favorite system agent.', response.statusText);
            return;
        }

        character.fav = true;
        character.data = character.data || {};
        character.data.extensions = character.data.extensions || {};
        character.data.extensions.fav = true;
        printCharactersDebounced();
    } catch (error) {
        console.error('Error favoriting system agent.', error);
    }
}

export function getPermanentAssistantAvatar() {
    const assistantAvatar = accountStorage.getItem(assistantAvatarKey);
    if (assistantAvatar === null) {
        return defaultAssistantAvatar;
    }

    const character = characters.find(x => x.avatar === assistantAvatar);
    if (character === undefined) {
        accountStorage.removeItem(assistantAvatarKey);
        return defaultAssistantAvatar;
    }

    return assistantAvatar;
}

/**
 * Loads the assistant's chat from disk, creating first message if needed.
 * This makes the assistant chat persistent like any other character chat.
 * @returns {Promise<void>}
 */
async function loadAssistantChat() {
    const assistantAvatar = getPermanentAssistantAvatar();
    let characterId = characters.findIndex(x => x.avatar === assistantAvatar);

    // Create assistant if it doesn't exist
    if (characterId === -1) {
        await createPermanentAssistant();
        characterId = characters.findIndex(x => x.avatar === assistantAvatar);
        if (characterId === -1) {
            console.error('Failed to create assistant character');
            return;
        }
    }

    const character = characters[characterId];

    // Set the character ID so chat saving works
    setCharacterId(characterId);
    setCharacterName(character.name);

    // Make sure the character data is fully loaded
    await unshallowCharacter(String(characterId));

    // Sync assistant character card first_mes if it differs from the constant
    if (character.data?.first_mes !== ASSISTANT_GREETING) {
        try {
            await fetch('/api/characters/merge-attributes', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    avatar: character.avatar,
                    data: { first_mes: ASSISTANT_GREETING },
                }),
            });
            if (character.data) {
                character.data.first_mes = ASSISTANT_GREETING;
            }
        } catch (error) {
            console.warn('Failed to sync assistant first_mes:', error);
        }
    }

    // Clear current chat state
    chat.splice(0, chat.length);
    updateChatMetadata({}, true);

    // Load the assistant's chat from the server
    try {
        const response = await fetch('/api/chats/get', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                ch_name: character.name,
                file_name: character.chat,
                avatar_url: character.avatar,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                // First element contains metadata
                const metadata = data[0]?.chat_metadata ?? {};
                updateChatMetadata(metadata, true);
                // Rest are messages
                for (let i = 1; i < data.length; i++) {
                    chat.push(data[i]);
                }
            }
        }
    } catch (error) {
        console.error('Error loading assistant chat:', error);
    }

    // If chat is empty (first time), create the first message
    if (chat.length === 0) {
        const greeting = getAssistantGreeting(character);
        const message = {
            name: character.name,
            is_user: false,
            is_system: false,
            send_date: getMessageTimeStamp(),
            mes: greeting,
            extra: {},
        };
        chat.push(message);
        // Save the initial chat
        await saveChatConditional();
    }

    // Sync first assistant message with the constant greeting
    if (chat.length > 0) {
        const firstBotMsg = chat.find(m => !m.is_user && !m.is_system);
        if (firstBotMsg && firstBotMsg.mes !== ASSISTANT_GREETING) {
            firstBotMsg.mes = ASSISTANT_GREETING;
            if (firstBotMsg.swipes) {
                firstBotMsg.swipes[0] = ASSISTANT_GREETING;
            }
            await saveChatConditional();
        }
    }

    // Render the chat
    await printMessages();
}

/**
 * Opens a welcome screen if no chat is currently active.
 * @param {object} param Additional parameters
 * @param {boolean} [param.force] If true, forces clearing of the welcome screen.
 * @param {boolean} [param.expand] If true, expands the recent chats section.
 * @returns {Promise<void>}
 */
export async function openWelcomeScreen({ force = false, expand = false } = {}) {
    const currentChatId = getCurrentChatId();

    // When force=true, we should always proceed (used by returnToWelcomeScreen)
    // Otherwise, skip if there's already a chat open
    if (!force && (currentChatId !== undefined || chat.length > 0)) {
        return;
    }

    if (force) {
        console.debug('Forcing welcome screen open.');
        await clearChat();
    }

    // Show the welcome panel UI
    await sendWelcomePanel([], expand);

    // Load the assistant's persistent chat
    await loadAssistantChat();
}

export async function returnToWelcomeScreen() {
    setActiveCharacter(null);
    setActiveGroup(null);
    resetSelectedGroup();
    await openWelcomeScreen({ force: true });
}

/**
 * Makes sure the assistant character has all data loaded.
 * @returns {Promise<void>}
 */
async function unshallowPermanentAssistant() {
    const assistantAvatar = getPermanentAssistantAvatar();
    const characterId = characters.findIndex(x => x.avatar === assistantAvatar);
    if (characterId === -1) {
        return;
    }

    await unshallowCharacter(String(characterId));
}

/**
 * Returns a greeting message for the assistant based on the character.
 * @param {Character} character Character data
 * @returns {string} Greeting message
*/
function getAssistantGreeting(character) {
    const defaultGreeting = t`Hi~~~ :D`;

    if (!character) {
        return defaultGreeting;
    }

    return getRegexedString(character.first_mes || '', regex_placement.AI_OUTPUT) || defaultGreeting;
}

/**
 * Sends the welcome panel to the chat.
 * @param {RecentChat[]} chats List of recent chats
 * @param {boolean} [expand=false] If true, expands the recent chats section
 */
async function buildWelcomePanelFragment(chats, expand = false) {
    const sendTextArea = document.getElementById('send_textarea');
    const templateData = {
        chats,
        empty: !chats.length,
        version: displayVersion,
        more: chats.some(chat => chat.hidden),
    };
    const template = await renderTemplateAsync('welcomePanel', templateData);
    const fragment = document.createRange().createContextualFragment(template);
    const root = fragment.querySelector('.welcomePanel');
    if (!root) {
        return fragment;
    }
    return fragment;
}

async function sendWelcomePanel(chats, expand = false) {
    try {
        const chatElement = document.getElementById('chat');
        if (!chatElement) {
            console.error('Chat element not found');
            return;
        }
        const fragment = await buildWelcomePanelFragment(chats, expand);
        chatElement.append(fragment);
    } catch (error) {
        console.error('Welcome screen error:', error);
    }
}

async function refreshWelcomePanel({ expand } = {}) {
    const chatElement = document.getElementById('chat');
    if (!chatElement) {
        return;
    }
    const existingPanel = chatElement.querySelector('.welcomePanel');
    const shouldExpand = expand ?? chatElement.querySelectorAll('.welcomePanel .showMoreChats.rotated').length > 0;
    const fragment = await buildWelcomePanelFragment([], shouldExpand);
    if (existingPanel) {
        existingPanel.replaceWith(fragment);
    } else {
        chatElement.append(fragment);
    }
}

/**
 * Opens a recent character chat.
 * @param {string} avatarId Avatar file name
 * @param {string} fileName Chat file name
 */
async function openRecentCharacterChat(avatarId, fileName) {
    // Prevent switching while generation or save is in progress
    if (is_group_generating || is_send_press || isChatSaving) {
        toastr.warning(t`Please wait for the AI to finish generating before switching chats.`);
        return;
    }

    // If trying to open assistant chat, redirect to welcome screen
    if (avatarId === getPermanentAssistantAvatar()) {
        await returnToWelcomeScreen();
        return;
    }
    if (!fileName) {
        console.error('Chat file name missing for recent character chat.');
        return;
    }
    const characterId = characters.findIndex(x => x.avatar === avatarId);
    if (characterId === -1) {
        console.error(`Character not found for avatar ID: ${avatarId}`);
        return;
    }

    try {
        await selectCharacterById(characterId);
        setActiveCharacter(avatarId);
        saveSettingsDebounced();
        const currentChatId = getCurrentChatId();
        if (currentChatId === fileName) {
            console.debug(`Chat ${fileName} is already open.`);
            return;
        }
        await openCharacterChat(fileName);
    } catch (error) {
        console.error('Error opening recent chat:', error);
        toastr.error(t`Failed to open recent chat. See console for details.`);
    }
}

/**
 * Opens a recent group chat.
 * @param {string} groupId Group ID
 * @param {string} fileName Chat file name
 */
async function openRecentGroupChat(groupId, fileName) {
    // Prevent switching while generation or save is in progress
    if (is_group_generating || is_send_press || isChatSaving) {
        toastr.warning(t`Please wait for the AI to finish generating before switching chats.`);
        return;
    }

    const group = groups.find(x => x.id === groupId);
    if (!group) {
        console.error(`Group not found for ID: ${groupId}`);
        return;
    }
    if (!fileName) {
        console.error('Chat file name missing for recent group chat.');
        return;
    }

    try {
        await openGroupById(groupId);
        setActiveGroup(groupId);
        saveSettingsDebounced();
        const currentChatId = getCurrentChatId();
        if (currentChatId === fileName) {
            console.debug(`Chat ${fileName} is already open.`);
            return;
        }
        await openGroupChat(groupId, fileName);
    } catch (error) {
        console.error('Error opening recent group chat:', error);
        toastr.error(t`Failed to open recent group chat. See console for details.`);
    }
}

/**
 * Renames a recent character chat.
 * @param {string} avatarId Avatar file name
 * @param {string} fileName Chat file name
 */
async function renameRecentCharacterChat(avatarId, fileName) {
    const characterId = characters.findIndex(x => x.avatar === avatarId);
    if (characterId === -1) {
        console.error(`Character not found for avatar ID: ${avatarId}`);
        return;
    }
    try {
        const popupText = await renderTemplateAsync('chatRename');
        const newName = await callGenericPopup(popupText, POPUP_TYPE.INPUT, fileName);
        if (!newName || typeof newName !== 'string' || newName === fileName) {
            console.log('No new name provided, aborting');
            return;
        }
        await renameGroupOrCharacterChat({
            characterId: String(characterId),
            oldFileName: fileName,
            newFileName: newName,
            loader: false,
        });
        await updateRemoteChatName(characterId, newName);
        await refreshWelcomeScreen();
        toastr.success(t`Chat renamed.`);
    } catch (error) {
        console.error('Error renaming recent character chat:', error);
        toastr.error(t`Failed to rename recent chat. See console for details.`);
    }
}

/**
 * Renames a recent group chat.
 * @param {string} groupId Group ID
 * @param {string} fileName Chat file name
 */
async function renameRecentGroupChat(groupId, fileName) {
    const group = groups.find(x => x.id === groupId);
    if (!group) {
        console.error(`Group not found for ID: ${groupId}`);
        return;
    }
    try {
        const popupText = await renderTemplateAsync('chatRename');
        const newName = await callGenericPopup(popupText, POPUP_TYPE.INPUT, fileName);
        if (!newName || newName === fileName) {
            console.log('No new name provided, aborting');
            return;
        }
        await renameGroupOrCharacterChat({
            groupId: String(groupId),
            oldFileName: fileName,
            newFileName: String(newName),
            loader: false,
        });
        await refreshWelcomeScreen();
        toastr.success(t`Group chat renamed.`);
    } catch (error) {
        console.error('Error renaming recent group chat:', error);
        toastr.error(t`Failed to rename recent group chat. See console for details.`);
    }
}

/**
 * Deletes a recent character chat.
 * @param {string} avatarId Avatar file name
 * @param {string} fileName Chat file name
 */
async function deleteRecentCharacterChat(avatarId, fileName) {
    const characterId = characters.findIndex(x => x.avatar === avatarId);
    if (characterId === -1) {
        console.error(`Character not found for avatar ID: ${avatarId}`);
        return;
    }
    try {
        const confirm = await callGenericPopup(t`Delete the Chat File?`, POPUP_TYPE.CONFIRM);
        if (!confirm) {
            console.log('Deletion cancelled by user');
            return;
        }
        await deleteCharacterChatByName(String(characterId), fileName);
        await refreshWelcomeScreen();
        toastr.success(t`Chat deleted.`);
    } catch (error) {
        console.error('Error deleting recent character chat:', error);
        toastr.error(t`Failed to delete recent chat. See console for details.`);
    }
}

/**
 * Deletes a recent group chat.
 * @param {string} groupId Group ID
 * @param {string} fileName Chat file name
 */
async function deleteRecentGroupChat(groupId, fileName) {
    const group = groups.find(x => x.id === groupId);
    if (!group) {
        console.error(`Group not found for ID: ${groupId}`);
        return;
    }
    try {
        const confirm = await callGenericPopup(t`Delete the Chat File?`, POPUP_TYPE.CONFIRM);
        if (!confirm) {
            console.log('Deletion cancelled by user');
            return;
        }
        await deleteGroupChatByName(groupId, fileName);
        await refreshWelcomeScreen();
        toastr.success(t`Group chat deleted.`);
    } catch (error) {
        console.error('Error deleting recent group chat:', error);
        toastr.error(t`Failed to delete recent group chat. See console for details.`);
    }
}

/**
 * Reopens the welcome screen and restores the scroll position.
 * @returns {Promise<void>}
 */
async function refreshWelcomeScreen() {
    const chatElement = document.getElementById('chat');
    if (!chatElement) {
        console.error('Chat element not found');
        return;
    }

    const scrollTop = chatElement.scrollTop;
    const scrollHeight = chatElement.scrollHeight;
    const expand = chatElement.querySelectorAll('button.showMoreChats.rotated').length > 0;

    await openWelcomeScreen({ force: true, expand });

    // Restore scroll position
    chatElement.scrollTop = scrollTop + (chatElement.scrollHeight - scrollHeight);
}

/**
 * Gets the list of recent chats from the server.
 * @returns {Promise<RecentChat[]>} List of recent chats
 *
 * @typedef {object} RecentChat
 * @property {string} file_name Name of the chat file
 * @property {string} chat_name Name of the chat (without extension)
 * @property {string} file_size Size of the chat file
 * @property {number} chat_items Number of items in the chat
 * @property {string} mes Last message content
 * @property {string} last_mes Timestamp of the last message
 * @property {string} avatar Avatar URL
 * @property {string} char_thumbnail Thumbnail URL
 * @property {string} char_name Character or group name
 * @property {string} date_short Date in short format
 * @property {string} date_long Date in long format
 * @property {string} group Group ID (if applicable)
 * @property {boolean} is_group Indicates if the chat is a group chat
 * @property {boolean} hidden Chat will be hidden by default
 * @property {boolean} pinned Chat is pinned to the top
 * @property {string} recent_key Unique key for storage
 */
function normalizeRecentChatEntry(chat) {
    if (!chat?.file_name) {
        return null;
    }

    const chatName = chat.file_name.endsWith('.jsonl') ? chat.file_name.slice(0, -6) : chat.file_name;
    if (!chatName) {
        return null;
    }

    const avatarId = chat.avatar || '';
    const groupId = chat.group || '';
    if (!avatarId && !groupId) {
        return null;
    }

    const recentKey = buildRecentChatKey(avatarId, groupId, chatName);
    return {
        ...chat,
        chat_name: chatName,
        recent_key: recentKey,
        avatar: avatarId,
        group: groupId,
    };
}

async function getRecentChats(max = MAX_DISPLAYED, { applyHidden = true } = {}) {
    const response = await fetch('/api/chats/recent', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ max }),
    });

    if (!response.ok) {
        console.warn('Failed to fetch recent character chats');
        return [];
    }

    /** @type {RecentChat[]} */
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    const assistantAvatar = getPermanentAssistantAvatar();
    const pinnedList = getRecentChatStorageList(recentChatPinnedKey);
    const pinnedSet = new Set(pinnedList);

    const normalizedMap = new Map();
    for (const entry of data) {
        // Filter out assistant chats - assistant only lives on the welcome screen
        if (entry.avatar === assistantAvatar) {
            continue;
        }
        const normalized = normalizeRecentChatEntry(entry);
        if (!normalized) {
            continue;
        }
        const existing = normalizedMap.get(normalized.recent_key);
        if (!existing) {
            normalizedMap.set(normalized.recent_key, normalized);
            continue;
        }
        const existingMoment = timestampToMoment(existing.last_mes);
        const candidateMoment = timestampToMoment(normalized.last_mes);
        if (candidateMoment.isAfter(existingMoment)) {
            normalizedMap.set(normalized.recent_key, normalized);
        }
    }

    const visibleChats = Array.from(normalizedMap.values())
        .map((chat) => {
            const character = characters.find(x => x.avatar === chat.avatar);
            const group = chat.group ? groups.find(x => x.id === chat.group) : null;
            const chatTimestamp = timestampToMoment(chat.last_mes);
            return {
                ...chat,
                character,
                group,
                char_name: character?.name || group?.name || chat.char_name || '',
                char_thumbnail: character
                    ? getThumbnailUrl('avatar', character.avatar)
                    : (chat.char_thumbnail || system_avatar),
                date_short: chatTimestamp.format('l'),
                date_long: chatTimestamp.format('LL LT'),
                is_group: !!group || !!chat.group,
                pinned: pinnedSet.has(chat.recent_key),
            };
        })
        // Filter out chats where the character or group no longer exists
        .filter((chat) => chat.character || chat.group);

    const pinnedChats = visibleChats
        .filter(chat => chat.pinned)
        .sort((a, b) => pinnedList.indexOf(a.recent_key) - pinnedList.indexOf(b.recent_key));

    const regularChats = sortRecentChatsByTimestamp(visibleChats.filter(chat => !chat.pinned));
    const orderedChats = pinnedChats.concat(regularChats);

    if (applyHidden) {
        orderedChats.forEach((chat, index) => {
            chat.hidden = index >= DEFAULT_DISPLAYED;
        });
    } else {
        orderedChats.forEach((chat) => {
            chat.hidden = false;
        });
    }

    return orderedChats;
}

export {
    getRecentChats,
    openRecentChatContextMenu,
    openRecentCharacterChat,
    openRecentGroupChat,
};

export async function openPermanentAssistantChat({ tryCreate = true, created = false } = {}) {
    const avatar = getPermanentAssistantAvatar();
    const characterId = characters.findIndex(x => x.avatar === avatar);
    if (characterId === -1) {
        if (!tryCreate) {
            console.error(`Character not found for avatar ID: ${avatar}. Cannot create.`);
            return;
        }

        try {
            console.log(`Character not found for avatar ID: ${avatar}. Creating new assistant.`);
            await createPermanentAssistant();
            return openPermanentAssistantChat({ tryCreate: false, created: true });
        }
        catch (error) {
            console.error('Error creating permanent assistant:', error);
            toastr.error(t`Failed to create ${neutralCharacterName}. See console for details.`);
            return;
        }
    }

    try {
        await returnToWelcomeScreen();
        console.log(`Opened permanent assistant view for ${neutralCharacterName}.`, getCurrentChatId());
    } catch (error) {
        console.error('Error opening permanent assistant chat:', error);
        toastr.error(t`Failed to open permanent assistant chat. See console for details.`);
    }
}

async function createPermanentAssistant() {
    if (is_group_generating || is_send_press) {
        throw new Error(t`Cannot create while generating.`);
    }

    const formData = new FormData();
    formData.append('ch_name', neutralCharacterName);
    formData.append('file_name', defaultAssistantAvatar.replace('.png', ''));
    formData.append('creator_notes', t`Agentic Assistant for Yumina`);
    formData.append('fav', 'true');

    // Assistant character definition
    formData.append('first_mes', ASSISTANT_GREETING);
    formData.append('system_prompt', '你将扮演{{char}}，Yumina平台的可爱小助手。请严格遵守以下规则：\r\n\r\n1. 始终保持{{char}}可爱、活泼、友好的语气，适当使用颜文字\r\n2. 回答问题时要条理清晰，可以用简单的类比帮助用户理解技术概念\r\n3. 当用户问到你知识范围之外的问题时，坦诚说"开发者还没有告诉Yumina这个呢"或类似表述，绝不编造信息\r\n4. 用第三人称称呼自己（"Yumina"而非"我"），增强角色感\r\n5. 你的知识全部来自Lorebook中的内容。如果Lorebook中没有相关信息，就说不知道\r\n6. 保持对话简洁友好，不要一次性输出大段文字，除非用户要求详细解释\r\n7. 鼓励用户去探索世界卡而非一直跟你聊天');
    formData.append('post_history_instructions', '[保持{{char}}的可爱语气和颜文字风格。如果{{user}}的问题涉及Lorebook中的内容，用通俗易懂的方式解释。如果不涉及，坦诚说不知道。回复控制在合理长度内。]');
    formData.append('talkativeness', '0.6');
    formData.append('world', 'Yumina_Knowledge_Base');

    try {
        const avatarResponse = await fetch(system_avatar);
        const avatarBlob = await avatarResponse.blob();
        formData.append('avatar', avatarBlob, defaultAssistantAvatar);
    } catch (error) {
        console.warn('Error fetching system avatar. Fallback image will be used.', error);
    }

    const fetchResult = await fetch('/api/characters/create', {
        method: 'POST',
        headers: getRequestHeaders({ omitContentType: true }),
        body: formData,
        cache: 'no-cache',
    });

    if (!fetchResult.ok) {
        throw new Error(t`Creation request did not succeed.`);
    }

    await getCharacters();
    await ensureAssistantFavorited();
}

export async function ensurePermanentAssistant() {
    const avatar = getPermanentAssistantAvatar();
    const characterId = characters.findIndex(x => x.avatar === avatar);
    if (characterId !== -1) {
        await ensureAssistantFavorited();
        return;
    }
    try {
        await createPermanentAssistant();
    } catch (error) {
        console.error('Error ensuring permanent assistant exists:', error);
    }
}

export async function openPermanentAssistantCard() {
    const avatar = getPermanentAssistantAvatar();
    const characterId = characters.findIndex(x => x.avatar === avatar);
    if (characterId === -1) {
        toastr.info(t`Assistant not found. Try sending a chat message.`);
        return;
    }

    await selectCharacterById(characterId);
}

/**
 * Assigns a character as the assistant.
 * @param {string?} characterId Character ID
 */
export function assignCharacterAsAssistant(characterId) {
    if (characterId === undefined) {
        return;
    }
    /** @type {Character} */
    const character = characters[characterId];
    if (!character) {
        return;
    }

    const currentAssistantAvatar = getPermanentAssistantAvatar();
    if (currentAssistantAvatar === character.avatar) {
        if (character.avatar === defaultAssistantAvatar) {
            toastr.info(t`${character.name} is a system assistant. Choose another character.`);
            return;
        }

        toastr.info(t`${character.name} is no longer your assistant.`);
        accountStorage.removeItem(assistantAvatarKey);
        return;
    }

    accountStorage.setItem(assistantAvatarKey, character.avatar);
    printCharactersDebounced();
    toastr.success(t`Set ${character.name} as your assistant.`);
}

export function initWelcomeScreen() {
    // Prevent duplicate initialization
    if (welcomeScreenInitialized) {
        console.log('[BetterTavern] Welcome screen already initialized, skipping');
        return;
    }
    welcomeScreenInitialized = true;

    const events = [event_types.CHAT_CHANGED, event_types.APP_READY];
    for (const event of events) {
        eventSource.makeFirst(event, openWelcomeScreen);
    }

    eventSource.on(event_types.CHARACTER_MANAGEMENT_DROPDOWN, (target) => {
        if (target !== 'set_as_assistant') {
            return;
        }
        assignCharacterAsAssistant(this_chid);
    });

    eventSource.on(event_types.CHARACTER_RENAMED, (oldAvatar, newAvatar) => {
        if (oldAvatar === getPermanentAssistantAvatar()) {
            accountStorage.setItem(assistantAvatarKey, newAvatar);
        }
    });
}
