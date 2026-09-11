import { mkdir, rm } from 'node:fs/promises';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type Contact,
  type ConnectionState,
  type GroupMetadata,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import type { ConnectionStatus, Destination, StatusResponse, WhatsAppConnection } from '../types.js';
import { isSamePersonalNumber, pickResolvedJid, personalJidCandidates } from './personalJid.js';
import { isFatalDisconnect, reconnectDelayMs, shouldAutoReconnect } from './reconnect.js';

const baileysLogger = pino({ level: 'silent' });
const groupsCacheTtlMs = 60_000;

export class BaileysConnection implements WhatsAppConnection {
  private socket: WASocket | undefined;
  private currentStatus: ConnectionStatus = 'disconnected';
  private currentQr: string | null = null;
  private phoneNumber: string | null = null;
  private lastConnectedAt: string | null = null;
  private lastError: string | null = null;
  private instanceName: string;
  private connecting: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private lastStatusCode: number | undefined;
  private manualLogout = false;
  private readonly chats = new Map<string, string>();
  private readonly contacts = new Map<string, Contact>();
  private readonly groupMetadata = new Map<string, GroupMetadata>();
  private readonly outgoing = new Map<string, { conversation: string }>();
  private groupsCache: { at: number; items: Destination[] } | null = null;

  constructor(
    private readonly sessionPath: string,
    instanceName: string,
    private readonly logger: pino.Logger,
  ) {
    this.instanceName = instanceName;
  }

  async start(instanceName?: string): Promise<void> {
    if (instanceName?.trim()) this.instanceName = instanceName.trim();
    if (this.currentStatus === 'connected' || this.connecting) return this.connecting ?? Promise.resolve();
    this.manualLogout = false;
    this.currentStatus = 'connecting';
    this.lastError = null;
    this.connecting = this.openSocket()
      .catch((error: unknown) => {
        this.currentStatus = 'error';
        this.lastError = 'Não foi possível conectar ao WhatsApp.';
        this.scheduleReconnect();
        throw error;
      })
      .finally(() => {
        this.connecting = null;
      });
    return this.connecting;
  }

  async reconnect(instanceName?: string): Promise<void> {
    if (instanceName?.trim()) this.instanceName = instanceName.trim();
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
    this.closeSocket();
    this.currentStatus = 'disconnected';
    await this.start();
  }

  async logout(): Promise<void> {
    this.manualLogout = true;
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
    const socket = this.socket;
    this.socket = undefined;
    if (socket) {
      try {
        await socket.logout('Desconexão administrativa');
      } catch {
        socket.end(undefined);
      }
    }
    await this.resetSession();
    this.currentStatus = 'disconnected';
    this.logger.info('WhatsApp disconnected');
  }

  status(): StatusResponse {
    return {
      state: this.currentStatus,
      phoneNumber: this.phoneNumber,
      lastConnectedAt: this.lastConnectedAt,
      error: this.lastError,
    };
  }

  async qrDataUrl(): Promise<string | null> {
    return this.currentQr ? QRCode.toDataURL(this.currentQr, { margin: 1, width: 320 }) : null;
  }

  async listPersonalChats(): Promise<Destination[]> {
    this.requireConnected();
    const ids = new Set<string>();
    for (const id of this.chats.keys()) {
      const normalized = this.personalJid(id);
      if (normalized) ids.add(normalized);
    }
    for (const contact of this.contacts.values()) {
      const normalized = this.personalJid(contact.jid ?? contact.id);
      if (normalized) ids.add(normalized);
    }
    const ownId = this.socket?.user?.id ? jidNormalizedUser(this.socket.user.id) : null;
    return [...ids]
      .filter((id) => id !== ownId)
      .map((id) => ({ id, name: this.contactName(id) }))
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }

  async listGroups(): Promise<Destination[]> {
    this.requireConnected();
    if (this.groupsCache && Date.now() - this.groupsCache.at < groupsCacheTtlMs)
      return this.groupsCache.items;
    const groups = await this.socket!.groupFetchAllParticipating();
    this.groupMetadata.clear();
    const items = Object.values(groups)
      .map((group) => {
        this.groupMetadata.set(group.id, group);
        return { id: group.id, name: group.subject || group.id };
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
    this.groupsCache = { at: Date.now(), items };
    return items;
  }

  async send(destinationId: string, message: string): Promise<void> {
    this.requireConnected();
    const jid = await this.resolveDestination(destinationId);
    const sent = await this.socket!.sendMessage(jid, { text: message });
    if (!sent?.key?.id) throw new Error('O WhatsApp não confirmou o envio da mensagem.');
    this.outgoing.set(sent.key.id, { conversation: message });
    this.logger.info('WhatsApp notification sent');
  }

  private async openSocket(): Promise<void> {
    await mkdir(this.sessionPath, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
    const socket = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      browser: Browsers.ubuntu(this.instanceName),
      logger: baileysLogger,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 120_000,
      keepAliveIntervalMs: 25_000,
      getMessage: async (key) => (key.id ? this.outgoing.get(key.id) : undefined),
      cachedGroupMetadata: async (jid) => this.groupMetadata.get(jid),
    });
    this.socket = socket;
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('messaging-history.set', ({ chats, contacts }) => {
      for (const chat of chats) if (chat.id) this.chats.set(chat.id, chat.name ?? '');
      for (const contact of contacts) this.saveContact(contact);
    });
    socket.ev.on('chats.upsert', (chats) => {
      for (const chat of chats) if (chat.id) this.chats.set(chat.id, chat.name ?? '');
    });
    socket.ev.on('chats.delete', (ids) => {
      for (const id of ids) this.chats.delete(id);
    });
    socket.ev.on('contacts.upsert', (contacts) => {
      for (const contact of contacts) this.saveContact(contact);
    });
    socket.ev.on('contacts.update', (contacts) => {
      for (const update of contacts) {
        if (!update.id) continue;
        this.saveContact({ ...this.contacts.get(update.id), ...update, id: update.id });
      }
    });
    socket.ev.on('connection.update', (update) => this.onConnectionUpdate(socket, update));
  }

  private onConnectionUpdate(socket: WASocket, update: Partial<ConnectionState>): void {
    if (this.socket !== socket) return;
    if ('qr' in update && update.qr) {
      this.currentQr = update.qr;
      this.currentStatus = 'connecting';
    }
    if ('connection' in update && update.connection === 'open') {
      this.reconnectAttempt = 0;
      this.lastStatusCode = undefined;
      this.currentStatus = 'connected';
      this.currentQr = null;
      this.lastError = null;
      this.lastConnectedAt = new Date().toISOString();
      this.phoneNumber = socket.user?.id ? jidNormalizedUser(socket.user.id).split('@')[0] : null;
      this.logger.info('WhatsApp connected');
      return;
    }
    if ('connection' in update && update.connection === 'close') {
      const statusCode = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      this.lastStatusCode = statusCode;
      this.closeSocket(false);
      if (this.manualLogout) {
        this.currentStatus = 'disconnected';
        this.lastError = null;
        this.logger.info({ statusCode }, 'WhatsApp disconnected');
        return;
      }
      if (isFatalDisconnect(statusCode)) {
        this.currentStatus = 'disconnected';
        this.lastError = 'A sessão do WhatsApp encerrou. Conecte novamente pelo QR Code.';
        this.logger.warn({ statusCode }, 'WhatsApp session ended');
        void this.resetSession();
        return;
      }
      if (!shouldAutoReconnect(statusCode)) {
        this.currentStatus = 'error';
        this.lastError = 'A sessão foi substituída por outro aparelho conectado.';
        this.logger.warn({ statusCode }, 'WhatsApp connection replaced');
        return;
      }
      this.currentStatus = statusCode === DisconnectReason.restartRequired ? 'connecting' : 'error';
      this.lastError = statusCode === DisconnectReason.restartRequired
        ? null
        : 'A conexão com o WhatsApp foi interrompida.';
      this.logger.warn({ statusCode }, 'WhatsApp disconnected');
      this.scheduleReconnect();
    }
  }

  private saveContact(contact: Contact): void {
    const id = contact.jid ?? contact.id;
    this.contacts.set(id, contact);
    this.contacts.set(contact.id, contact);
  }

  private personalJid(id: string | undefined): string | null {
    if (!id || !id.endsWith('@s.whatsapp.net')) return null;
    return jidNormalizedUser(id);
  }

  private contactName(id: string): string {
    const contact = this.contacts.get(id);
    return contact?.name || contact?.notify || contact?.verifiedName || id.split('@')[0];
  }

  private requireConnected(): void {
    if (this.currentStatus !== 'connected' || !this.socket)
      throw new Error('WhatsApp não conectado.');
  }

  private async resolveDestination(destinationId: string): Promise<string> {
    if (destinationId.endsWith('@g.us') || destinationId.endsWith('@lid')) return destinationId;
    const ownId = this.socket?.user?.id ? jidNormalizedUser(this.socket.user.id) : null;
    const ownLid = this.socket?.user?.lid ? jidNormalizedUser(this.socket.user.lid) : null;
    if (
      (this.phoneNumber && isSamePersonalNumber(destinationId, this.phoneNumber))
      || (ownId && isSamePersonalNumber(destinationId, ownId))
    )
      throw new Error('Não é possível enviar para o próprio número conectado. Use outro WhatsApp ou um grupo.');

    const candidates = personalJidCandidates(destinationId);
    if (candidates.length === 0)
      throw new Error('Este número não foi encontrado no WhatsApp. Confira o DDD e o nono dígito.');
    const results = await this.socket!.onWhatsApp(...candidates);
    const found = results?.find((item) => item.exists && (item.jid || item.lid));
    const resolved = pickResolvedJid(found, candidates);
    if (!resolved)
      throw new Error('Este número não foi encontrado no WhatsApp. Confira o DDD e o nono dígito.');
    if (ownLid && resolved === ownLid)
      throw new Error('Não é possível enviar para o próprio número conectado. Use outro WhatsApp ou um grupo.');
    return resolved;
  }

  private scheduleReconnect(): void {
    if (this.manualLogout || this.reconnectTimer) return;
    this.reconnectAttempt += 1;
    const delay = reconnectDelayMs(this.reconnectAttempt, this.lastStatusCode);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start().catch((error: unknown) => {
        this.currentStatus = 'error';
        this.lastError = 'Não foi possível reconectar ao WhatsApp.';
        this.logger.warn({ error }, 'WhatsApp reconnect failed');
        this.scheduleReconnect();
      });
    }, delay);
  }

  private closeSocket(end = true): void {
    const socket = this.socket;
    this.socket = undefined;
    this.currentQr = null;
    this.phoneNumber = null;
    this.groupsCache = null;
    if (end) socket?.end(undefined);
  }

  private async resetSession(): Promise<void> {
    await rm(this.sessionPath, { recursive: true, force: true });
    await mkdir(this.sessionPath, { recursive: true });
    this.chats.clear();
    this.contacts.clear();
    this.groupMetadata.clear();
    this.groupsCache = null;
    this.currentQr = null;
    this.phoneNumber = null;
    this.lastError = null;
    this.reconnectAttempt = 0;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
