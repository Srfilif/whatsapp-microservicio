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

// Eventos desde WhatsApp → WebSocket + Webhooks
whatsappService.on('qr', (qrData) => {
  logger.info('📲 QR generado, enviando a WebSocket y Webhook...');
  websocketService.broadcast('whatsapp:qr', qrData);
  webhookService.notifyQRGenerated(qrData);
});

whatsappService.on('connected', (connectionInfo) => {
  logger.info(`✅ WhatsApp conectado: ${connectionInfo.user}`);
  websocketService.broadcast('whatsapp:connected', connectionInfo);
  webhookService.notifyConnected(connectionInfo);
});

whatsappService.on('disconnected', () => {
  logger.warn('⚠ WhatsApp desconectado');
  websocketService.broadcast('whatsapp:disconnected', {});
  webhookService.notifyDisconnected();
});

whatsappService.on('message', (messageData) => {
  logger.info('💬 Mensaje recibido, reenviando a WebSocket y Webhook...');
  websocketService.broadcast('whatsapp:message', messageData);
  webhookService.notifyMessageReceived(messageData);
});

// Inicialización del microservicio
async function startServer() {
  try {
    logger.info('🚀 Iniciando WhatsApp Microservice...');

    // Inicializar WhatsApp
    await whatsappService.initialize();

    // Escuchar en IPv4 explícitamente
    server.listen(config.port, "0.0.0.0", () => {
      logger.info({
        httpPort: config.port,
        wsPort: config.wsPort,
        env: config.nodeEnv,
        address: `http://0.0.0.0:${config.port}`
      }, '✅ Microservicio iniciado y escuchando correctamente');
    });

  } catch (error) {
    logger.error({ error }, '❌ Error al iniciar el microservicio');
    process.exit(1);
  }
}

// Manejo de señales de cierre
const gracefulShutdown = () => {
  logger.warn('⛔ Apagando microservicio...');
  server.close(() => {
    logger.info('🛑 Servidor detenido correctamente.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Manejo global de errores
process.on('uncaughtException', (err) => {
  logger.error({ err }, '🔥 Excepción no controlada');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '⚠ Promesa rechazada sin manejar');
});

// Start
startServer();
