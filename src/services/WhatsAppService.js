import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import config from '../config/config.js';

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qrCode = null;
    this.connectionState = 'disconnected';
    this.eventHandlers = new Map();
    this.chatsCache = new Map();
  }

  /**
   * Inicializa la conexión de WhatsApp
   */
  async initialize() {
    try {
      const sessionDir = path.resolve(config.whatsapp.sessionDir);
      
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: config.whatsapp.printQRInTerminal,
        logger: logger.child({ module: 'baileys' }),
        // Habilitar almacenamiento de mensajes
        getMessage: async (key) => {
          return { conversation: 'Message not found' };
        }
      });

      this._setupEventHandlers(saveCreds);
      
      logger.info('WhatsApp service initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize WhatsApp service');
      throw error;
    }
  }

  /**
   * Configura los manejadores de eventos de Baileys
   */
  _setupEventHandlers(saveCreds) {
    this.sock.ev.on('creds.update', saveCreds);

    // Evento para actualizar chats
    this.sock.ev.on('chats.set', ({ chats }) => {
      logger.info({ count: chats.length }, 'Chats loaded');
      chats.forEach(chat => {
        this.chatsCache.set(chat.id, chat);
      });
    });

    this.sock.ev.on('chats.update', (updates) => {
      updates.forEach(update => {
        const existing = this.chatsCache.get(update.id) || {};
        this.chatsCache.set(update.id, { ...existing, ...update });
      });
    });

    this.sock.ev.on('chats.upsert', (chats) => {
      chats.forEach(chat => {
        const existing = this.chatsCache.get(chat.id) || {};
        this.chatsCache.set(chat.id, { ...existing, ...chat });
      });
    });

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        this.connectionState = 'qr';
        qrcode.generate(qr, { small: true });
        this._emit('qr', { qr });
        logger.info('QR Code generated');
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        
        logger.info({ shouldReconnect }, 'Connection closed');
        
        if (shouldReconnect) {
          this.initialize();
        } else {
          this.connectionState = 'disconnected';
          this._emit('disconnected');
        }
      } else if (connection === 'open') {
        this.connectionState = 'connected';
        this.qrCode = null;
        this._emit('connected', { user: this.sock.user });
        logger.info({ user: this.sock.user }, 'Connected to WhatsApp');
      }
    });

    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const message of messages) {
        // Actualizar cache del chat
        const chatId = message.key.remoteJid;
        const existingChat = this.chatsCache.get(chatId) || { id: chatId };
        
        existingChat.conversationTimestamp = message.messageTimestamp;
        if (!existingChat.unreadCount) existingChat.unreadCount = 0;
        if (!message.key.fromMe) existingChat.unreadCount++;
        
        this.chatsCache.set(chatId, existingChat);
        
        await this._handleIncomingMessage(message);
      }
    });
  }

  /**
   * Maneja los mensajes entrantes
   */
  async _handleIncomingMessage(message) {
    try {
      const messageData = await this._formatMessage(message);
      this._emit('message', messageData);
      logger.info({ from: messageData.from }, 'Message received');
    } catch (error) {
      logger.error({ error }, 'Error handling incoming message');
    }
  }

  /**
   * Formatea el mensaje a un formato estandarizado
   */
  async _formatMessage(message) {
    const messageKey = message.key;
    const messageContent = message.message;

    const data = {
      id: messageKey.id,
      from: messageKey.remoteJid,
      fromMe: messageKey.fromMe,
      timestamp: message.messageTimestamp,
      type: this._getMessageType(messageContent),
      body: null,
      media: null
    };

    // Extraer texto
    if (messageContent?.conversation) {
      data.body = messageContent.conversation;
    } else if (messageContent?.extendedTextMessage?.text) {
      data.body = messageContent.extendedTextMessage.text;
    }

    // Extraer media
    if (this._hasMedia(messageContent)) {
      data.media = await this._downloadMedia(message);
    }

    return data;
  }

  /**
   * Determina el tipo de mensaje
   */
  _getMessageType(messageContent) {
    if (messageContent?.conversation || messageContent?.extendedTextMessage) {
      return 'text';
    }
    if (messageContent?.imageMessage) return 'image';
    if (messageContent?.videoMessage) return 'video';
    if (messageContent?.audioMessage) return 'audio';
    if (messageContent?.documentMessage) return 'document';
    return 'unknown';
  }

  /**
   * Verifica si el mensaje tiene media
   */
  _hasMedia(messageContent) {
    return !!(
      messageContent?.imageMessage ||
      messageContent?.videoMessage ||
      messageContent?.audioMessage ||
      messageContent?.documentMessage
    );
  }

  /**
   * Descarga el archivo multimedia del mensaje
   */
  async _downloadMedia(message) {
    try {
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: logger.child({ module: 'media-download' }),
          reuploadRequest: this.sock.updateMediaMessage
        }
      );

      const messageContent = message.message;
      let mimetype = 'application/octet-stream';
      let filename = 'file';

      if (messageContent.imageMessage) {
        mimetype = messageContent.imageMessage.mimetype || 'image/jpeg';
        filename = 'image.jpg';
      } else if (messageContent.videoMessage) {
        mimetype = messageContent.videoMessage.mimetype || 'video/mp4';
        filename = 'video.mp4';
      } else if (messageContent.audioMessage) {
        mimetype = messageContent.audioMessage.mimetype || 'audio/ogg';
        filename = 'audio.ogg';
      } else if (messageContent.documentMessage) {
        mimetype = messageContent.documentMessage.mimetype;
        filename = messageContent.documentMessage.fileName || 'document';
      }

      return {
        buffer: buffer.toString('base64'),
        mimetype,
        filename
      };
    } catch (error) {
      logger.error({ error }, 'Error downloading media');
      return null;
    }
  }

  /**
   * Envía un mensaje de texto
   */
  async sendMessage(to, text) {
    try {
      if (!this.isConnected()) {
        throw new Error('WhatsApp is not connected');
      }

      const jid = this._formatJid(to);
      const result = await this.sock.sendMessage(jid, { text });
      
      logger.info({ to: jid }, 'Message sent');
      return result;
    } catch (error) {
      logger.error({ error, to }, 'Error sending message');
      throw error;
    }
  }

  /**
   * Envía una imagen
   */
  async sendImage(to, imageBuffer, caption = '') {
    try {
      if (!this.isConnected()) {
        throw new Error('WhatsApp is not connected');
      }

      const jid = this._formatJid(to);
      const result = await this.sock.sendMessage(jid, {
        image: imageBuffer,
        caption
      });
      
      logger.info({ to: jid }, 'Image sent');
      return result;
    } catch (error) {
      logger.error({ error, to }, 'Error sending image');
      throw error;
    }
  }

  /**
   * Envía un video
   */
  async sendVideo(to, videoBuffer, caption = '') {
    try {
      if (!this.isConnected()) {
        throw new Error('WhatsApp is not connected');
      }

      const jid = this._formatJid(to);
      const result = await this.sock.sendMessage(jid, {
        video: videoBuffer,
        caption
      });
      
      logger.info({ to: jid }, 'Video sent');
      return result;
    } catch (error) {
      logger.error({ error, to }, 'Error sending video');
      throw error;
    }
  }

  /**
   * Envía un documento
   */
  async sendDocument(to, documentBuffer, filename, mimetype) {
    try {
      if (!this.isConnected()) {
        throw new Error('WhatsApp is not connected');
      }

      const jid = this._formatJid(to);
      const result = await this.sock.sendMessage(jid, {
        document: documentBuffer,
        fileName: filename,
        mimetype
      });
      
      logger.info({ to: jid, filename }, 'Document sent');
      return result;
    } catch (error) {
      logger.error({ error, to }, 'Error sending document');
      throw error;
    }
  }

  /**
   * Formatea el JID correctamente
   */
  _formatJid(number) {
    if (number.includes('@')) return number;
    return number.includes('-') 
      ? `${number}@g.us` 
      : `${number}@s.whatsapp.net`;
  }

  /**
   * Verifica si está conectado
   */
  isConnected() {
    return this.connectionState === 'connected';
  }

  /**
   * Obtiene el estado de la conexión
   */
  getConnectionState() {
    return {
      state: this.connectionState,
      qr: this.qrCode,
      user: this.sock?.user || null
    };
  }

  /**
   * Sistema de eventos personalizado
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  _emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  /**
   * Obtiene todos los chats con información detallada
   */
  async getChats() {
    try {
      if (!this.isConnected()) {
        throw new Error('WhatsApp is not connected');
      }

      const chatList = [];

      // Primero obtener todos los chats del cache
      for (const [jid, chat] of this.chatsCache.entries()) {
        try {
          const chatInfo = await this._getChatDetails(jid, chat);
          chatList.push(chatInfo);
        } catch (error) {
          logger.error({ error, jid }, 'Error getting chat details from cache');
        }
      }

      // Si no hay chats en cache, intentar obtener de WhatsApp
      if (chatList.length === 0) {
        try {
          // Obtener contactos
          const contacts = Object.keys(this.sock.store?.contacts || {});
          
          for (const jid of contacts) {
            if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us')) {
              try {
                const chatInfo = await this._getChatDetails(jid, { id: jid });
                chatList.push(chatInfo);
              } catch (error) {
                logger.debug({ error, jid }, 'Error getting contact chat');
              }
            }
          }
        } catch (error) {
          logger.error({ error }, 'Error getting contacts');
        }
      }

      // Ordenar por último mensaje (más reciente primero)
      chatList.sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));

      logger.info({ count: chatList.length }, 'Chats retrieved');
      return chatList;
    } catch (error) {
      logger.error({ error }, 'Error getting chats');
      throw error;
    }
  }

  /**
   * Obtiene los detalles de un chat específico
   */
  async _getChatDetails(jid, chat) {
    const isGroup = jid.endsWith('@g.us');
    let name = jid.split('@')[0];
    let profilePicture = null;
    let participants = null;
    let lastMessage = null;
    let lastMessageTimestamp = chat.conversationTimestamp || 0;
    let unreadCount = chat.unreadCount || 0;

    try {
      // Obtener foto de perfil
      try {
        const ppUrl = await this.sock.profilePictureUrl(jid, 'image');
        profilePicture = ppUrl;
      } catch (error) {
        // No hay foto de perfil
        profilePicture = null;
      }

      // Si es un grupo
      if (isGroup) {
        try {
          const groupMetadata = await this.sock.groupMetadata(jid);
          name = groupMetadata.subject;
          participants = groupMetadata.participants.map(p => ({
            id: p.id,
            isAdmin: p.admin !== null && p.admin !== undefined,
            isSuperAdmin: p.admin === 'superadmin'
          }));
        } catch (error) {
          name = chat.name || name;
          participants = [];
        }
      } else {
        // Si es un chat directo
        // Intentar obtener el nombre del contacto
        const contactName = this.sock.store?.contacts?.[jid]?.name || 
                           this.sock.store?.contacts?.[jid]?.notify;
        if (contactName) {
          name = contactName;
        }
      }

      // Obtener el último mensaje si está disponible
      if (chat.lastMessage) {
        lastMessage = this._extractMessageText(chat.lastMessage);
      }
    } catch (error) {
      logger.debug({ error, jid }, 'Error getting profile details');
    }

    return {
      id: jid,
      name,
      isGroup,
      profilePicture,
      lastMessage,
      lastMessageTimestamp,
      unreadCount,
      participants: isGroup ? participants : null,
      participantCount: isGroup && participants ? participants.length : null
    };
  }

  /**
   * Extrae el texto de un mensaje
   */
  _extractMessageText(message) {
    if (!message) return null;

    const msgContent = message.message || message;
    
    if (msgContent?.conversation) {
      return msgContent.conversation;
    } else if (msgContent?.extendedTextMessage?.text) {
      return msgContent.extendedTextMessage.text;
    } else if (msgContent?.imageMessage) {
      return '📷 Imagen';
    } else if (msgContent?.videoMessage) {
      return '🎥 Video';
    } else if (msgContent?.audioMessage) {
      return '🎵 Audio';
    } else if (msgContent?.documentMessage) {
      return '📄 Documento';
    } else if (msgContent?.stickerMessage) {
      return '🎭 Sticker';
    } else if (msgContent?.contactMessage) {
      return '👤 Contacto';
    } else if (msgContent?.locationMessage) {
      return '📍 Ubicación';
    }
    
    return 'Mensaje';
  }

  /**
   * Obtiene los mensajes de un chat específico
   */
  async getChatMessages(chatId, limit = 50) {
    try {
      if (!this.isConnected()) {
        throw new Error('WhatsApp is not connected');
      }

      const jid = this._formatJid(chatId);
      
      // Intentar obtener mensajes
      let messages = [];
      
      try {
        // Método 1: Usar fetchMessagesFromWA
        const fetchedMessages = await this.sock.fetchMessagesFromWA(jid, limit, null);
        messages = fetchedMessages;
      } catch (error) {
        logger.debug({ error }, 'Could not fetch messages from WA, trying alternative method');
        
        // Método 2: Obtener del historial local si existe
        if (this.sock.store?.messages?.[jid]) {
          messages = Array.from(this.sock.store.messages[jid].values()).slice(-limit);
        }
      }
      
      const formattedMessages = [];
      
      for (const msg of messages) {
        if (msg.message) {
          try {
            const formatted = await this._formatMessage(msg);
            formattedMessages.push(formatted);
          } catch (error) {
            logger.debug({ error }, 'Error formatting message');
          }
        }
      }

      // Ordenar por timestamp (más antiguos primero)
      formattedMessages.sort((a, b) => a.timestamp - b.timestamp);

      logger.info({ chatId, count: formattedMessages.length }, 'Messages retrieved');
      return formattedMessages;
    } catch (error) {
      logger.error({ error, chatId }, 'Error getting chat messages');
      // Retornar array vacío en vez de error
      return [];
    }
  }

  /**
   * Obtiene información detallada de un chat específico
   */
  async getChatInfo(chatId) {
    try {
      if (!this.isConnected()) {
        throw new Error('WhatsApp is not connected');
      }

      const jid = this._formatJid(chatId);
      
      // Buscar en cache primero
      let chat = this.chatsCache.get(jid);
      
      // Si no está en cache, crear uno básico
      if (!chat) {
        chat = { id: jid };
      }

      const chatDetails = await this._getChatDetails(jid, chat);
      
      logger.info({ chatId }, 'Chat info retrieved');
      return chatDetails;
    } catch (error) {
      logger.error({ error, chatId }, 'Error getting chat info');
      throw error;
    }
  }

  /**
   * Cierra la sesión
   */
  async logout() {
    try {
      await this.sock?.logout();
      this.connectionState = 'disconnected';
      logger.info('Logged out from WhatsApp');
    } catch (error) {
      logger.error({ error }, 'Error logging out');
      throw error;
    }
  }
}

export default new WhatsAppService();