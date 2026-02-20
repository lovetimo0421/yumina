export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  image: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  image?: string | null;
}
