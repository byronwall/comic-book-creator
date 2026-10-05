export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  disabled?: boolean;
}

export interface UserStore {
  schemaVersion: 1;
  users: User[];
}

export interface DataState {
  schemaVersion: 2;
  /** Stored owner of the shared project and spatial-map tools. */
  legacyUserId: string | null;
}
