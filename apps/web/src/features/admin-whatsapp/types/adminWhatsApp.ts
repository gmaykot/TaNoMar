export type WhatsAppConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';
export type WhatsAppDestinationType = 'personal' | 'group';

export interface WhatsAppIntegration {
  enabled: boolean;
  notifyByEmail: boolean;
  instanceName: string;
  defaultDestinationType: WhatsAppDestinationType | null;
  defaultDestinationId: string | null;
  defaultDestinationName: string | null;
  notifyNewUser: boolean;
  notifyPlanRequested: boolean;
  notifyPlanPaid: boolean;
  notifyPlanChanged: boolean;
  createdAt: string;
  updatedAt: string;
  status: {
    state: WhatsAppConnectionState;
    phoneNumber: string | null;
    lastConnectedAt: string | null;
    error: string | null;
  };
}

export interface WhatsAppDestination {
  id: string;
  name: string;
}

export interface WhatsAppDestinations {
  personal: WhatsAppDestination[];
  groups: WhatsAppDestination[];
}

export interface WhatsAppSettingsUpdate {
  enabled: boolean;
  notifyByEmail: boolean;
  instanceName: string;
  defaultDestinationType: WhatsAppDestinationType | null;
  defaultDestinationId: string | null;
  defaultDestinationName: string | null;
  notifyNewUser: boolean;
  notifyPlanRequested: boolean;
  notifyPlanPaid: boolean;
  notifyPlanChanged: boolean;
}
