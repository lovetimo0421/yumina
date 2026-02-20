export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AppEnv = {
  Variables: {
    user: SessionUser;
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      token: string;
    };
  };
};
