export const APP_NAME = "Yumina";

export const MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const ASSET_TYPES = ["image", "audio", "font", "other"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const MAX_WORLD_NAME_LENGTH = 200;
export const MAX_WORLD_DESCRIPTION_LENGTH = 2000;
export const MAX_USER_NAME_LENGTH = 100;
