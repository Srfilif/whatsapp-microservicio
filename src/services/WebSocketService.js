import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import config from '../config/config.js';

class WebSocketService {
  constructor() {
    this.io = null;
    this.clients = new Map();
  }

  /**
   * Inicializa el servidor WebSocket
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: config.websocket.cors
    });

    this._setupEventHandlers();
    logger.info({ port: config.wsPort }, 'WebSocket server initialized');
  }

  /**
   * Configura los manejadores de eventos
   */
  _setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      this.clients.set(clientId, socket);
      
      logger.info({ clientId }, 'Client connected');

      socket.on('disconnect', () => {
        this.clients.delete(clientId);
        logger.info({ clientId }, 'Client disconnected');
      });

      socket.on('error', (error) => {
        logger.error({ error, clientId }, 'Socket error');
      });
    });
  }

  /**
   * Emite un evento a todos los clientes conectados
   */
  broadcast(event, data) {
    this.io.emit(event, data);
    logger.debug({ event, clients: this.clients.size }, 'Broadcasting event');
  }

  /**
   * Emite un evento a un cliente específico
   */
  emitToClient(clientId, event, data) {
    const client = this.clients.get(clientId);
    if (client) {
      client.emit(event, data);
      logger.debug({ event, clientId }, 'Emitting to specific client');
    }
  }

  /**
   * Obtiene la cantidad de clientes conectados
   */
  getConnectedClients() {
    return this.clients.size;
  }
}

export default new WebSocketService();