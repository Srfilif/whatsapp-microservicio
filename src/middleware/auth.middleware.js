import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Middleware de autenticación por token
 */
export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      });
    }

    if (token !== config.laravel.apiToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid authorization token'
      });
    }

    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware de validación de archivos
 */
export const validateFileMiddleware = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  // Validar tamaño máximo (16MB)
  const maxSize = 16 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds maximum allowed (16MB)'
    });
  }

  next();
};