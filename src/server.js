import http from 'http';
import app from './app.js';
import config from './config/config.js';
import logger from './utils/logger.js';
import whatsappService from './services/WhatsAppService.js';
import websocketService from './services/WebSocketService.js';
import webhookService from './services/WebhookService.js';

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar WebSocket
websocketService.initialize(server);

// Integrar WhatsApp con WebSocket y Webhook
whatsappService.on('qr', (data) => {
  websocketService.broadcast('whatsapp:qr', data);
  webhookService.notifyQRGenerated(data);
});

whatsappService.on('connected', (data) => {
  websocketService.broadcast('whatsapp:connected', data);
  webhookService.notifyConnected(data);
});

whatsappService.on('disconnected', () => {
  websocketService.broadcast('whatsapp:disconnected', {});
  webhookService.notifyDisconnected();
});

whatsappService.on('message', (data) => {
  websocketService.broadcast('whatsapp:message', data);
  webhookService.notifyMessageReceived(data);
});

// Inicializar WhatsApp
async function startServer() {
  try {
    logger.info('Starting WhatsApp Microservice...');
    
    // Inicializar WhatsApp
    await whatsappService.initialize();
    
    // Iniciar servidor HTTP
    server.listen(config.port, () => {
      logger.info({ 
        port: config.port,
        wsPort: config.wsPort,
        env: config.nodeEnv 
      }, 'Server started successfully');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Manejo de señales de cierre
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
  process.exit(1);
});

// Iniciar servidor
startServer();