export const eventLabels = {
  "account.created": "Account created",
  "account.signed-in": "Signed in",
  "account.signed-out": "Signed out",
  "book.opened": "Book opened",
  "book.created": "Book created",
  "book.saved": "Book edited",
  "book.deleted": "Book deleted",
  "photo.uploaded": "Photo uploaded",
  "admin.password-reset": "Password reset",
  "admin.disabled": "Account disabled",
  "admin.enabled": "Account enabled",
  "admin.deleted": "Account deleted",
} as const;
export type EventType = keyof typeof eventLabels;
export interface ActivityEvent {
  id: string;
  at: string;
  type: EventType;
  userId: string;
  bookId?: string;
  targetUserId?: string;
  targetUsername?: string;
}
export interface AdminUser {
  id: string;
  username: string;
  createdAt: string;
  disabled: boolean;
  isAdmin: boolean;
  lastActivity: string | null;
  books: number;
  pages: number;
  photoPages: number;
  textPages: number;
  photos: number;
  bytes: number;
}
export interface AdminSnapshot {
  account: { id: string; username: string; isAdmin: boolean };
  users: AdminUser[];
  events: ActivityEvent[];
  eventCount: number;
  eventBytes: number;
  capturedSince: string | null;
  generatedAt: string;
}
