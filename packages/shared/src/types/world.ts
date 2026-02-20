export interface World {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
  thumbnailUrl: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorldInput {
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface UpdateWorldInput {
  name?: string;
  description?: string;
  schema?: Record<string, unknown>;
  thumbnailUrl?: string | null;
  isPublished?: boolean;
}
