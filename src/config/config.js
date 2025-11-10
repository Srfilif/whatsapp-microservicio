import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 3000,
  wsPort: process.env.WS_PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  websocket: {
    cors: {
      origin: process.env.WS_CORS_ORIGIN || '*',
      methods: ['GET', 'POST']
    }
  },

  whatsapp: {
    sessionDir: process.env.WHATSAPP_SESSION_DIR || './sessions',
    sessionName: process.env.WHATSAPP_SESSION_NAME || 'whatsapp-session',
    printQRInTerminal: true
  },

  laravel: {
    webhookUrl: process.env.LARAVEL_WEBHOOK_URL,
    apiToken: process.env.LARAVEL_API_TOKEN
  }
};