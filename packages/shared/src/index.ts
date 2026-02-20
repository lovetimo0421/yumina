// Types
export type {
  User,
  UserProfile,
  UpdateProfileInput,
} from "./types/user.js";
export type {
  World,
  CreateWorldInput,
  UpdateWorldInput,
} from "./types/world.js";
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  HealthCheckResponse,
} from "./types/api.js";

// Validation schemas
export {
  updateProfileSchema,
  type UpdateProfileSchema,
} from "./validation/user.js";
export {
  createWorldSchema,
  updateWorldSchema,
  type CreateWorldSchema,
  type UpdateWorldSchema,
} from "./validation/world.js";

// Constants
export {
  APP_NAME,
  MESSAGE_ROLES,
  ASSET_TYPES,
  MAX_WORLD_NAME_LENGTH,
  MAX_WORLD_DESCRIPTION_LENGTH,
  MAX_USER_NAME_LENGTH,
} from "./constants/index.js";
export type { MessageRole, AssetType } from "./constants/index.js";
