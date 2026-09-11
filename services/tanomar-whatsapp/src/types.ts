export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface StatusResponse {
  state: ConnectionStatus;
  phoneNumber: string | null;
  lastConnectedAt: string | null;
  error: string | null;
}

export interface Destination {
  id: string;
  name: string;
}

export interface WhatsAppConnection {
  start(instanceName?: string): Promise<void>;
  reconnect(instanceName?: string): Promise<void>;
  logout(): Promise<void>;
  status(): StatusResponse;
  qrDataUrl(): Promise<string | null>;
  listPersonalChats(): Promise<Destination[]>;
  listGroups(): Promise<Destination[]>;
  send(destinationId: string, message: string): Promise<void>;
}
