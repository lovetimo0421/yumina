export const APP_NAME = "Yumina";

export const MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const ASSET_TYPES = ["image", "audio", "font", "other"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const MAX_WORLD_NAME_LENGTH = 200;
export const MAX_WORLD_DESCRIPTION_LENGTH = 2000;
export const MAX_USER_NAME_LENGTH = 100;

export const LLM_PROVIDERS = ["openrouter", "anthropic", "openai", "ollama"] as const;
export type LLMProviderType = (typeof LLM_PROVIDERS)[number];

export const AUDIO_TRACK_TYPES = ["bgm", "sfx", "ambient"] as const;
export type AudioTrackType = (typeof AUDIO_TRACK_TYPES)[number];
