export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationUnread {
  unread: boolean;
}

export interface PushPublicKey {
  publicKey: string;
}
