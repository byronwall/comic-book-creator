export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface UserStore {
  schemaVersion: 1;
  users: User[];
}

export interface DataState {
  schemaVersion: 2;
  legacyUserId: string | null;
  migrationId: string;
  completedAt: string;
}
