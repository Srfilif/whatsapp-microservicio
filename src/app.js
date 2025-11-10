import express from 'express';
import cors from 'cors';
import whatsappRoutes from './routes/whatsapp.routes.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import logger from './utils/logger.js';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de requests
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip
  }, 'Incoming request');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Rutas protegidas con autenticación
app.use('/api/whatsapp', authMiddleware, whatsappRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  logger.error({ error: err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default app;