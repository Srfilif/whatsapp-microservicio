import pino from 'pino';
import config from '../config/config.js';

// Configuración simple sin pino-pretty para evitar errores
const logger = pino({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  base: {
    pid: process.pid,
    hostname: 'whatsapp-service'
  }
});

export default logger;