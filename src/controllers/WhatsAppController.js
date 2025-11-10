import whatsappService from '../services/WhatsAppService.js';
import logger from '../utils/logger.js';

class WhatsAppController {
  /**
   * Obtiene el estado de la conexión
   */
  async getStatus(req, res) {
    try {
      const status = whatsappService.getConnectionState();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error({ error }, 'Error getting status');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene todos los chats
   */
  async getChats(req, res) {
    try {
      const chats = await whatsappService.getChats();
      
      res.json({
        success: true,
        data: chats,
        count: chats.length
      });
    } catch (error) {
      logger.error({ error }, 'Error getting chats');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene información de un chat específico
   */
  async getChatInfo(req, res) {
    try {
      const { chatId } = req.params;

      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: chatId'
        });
      }

      const chatInfo = await whatsappService.getChatInfo(chatId);
      
      res.json({
        success: true,
        data: chatInfo
      });
    } catch (error) {
      logger.error({ error }, 'Error getting chat info');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene los mensajes de un chat específico
   */
  async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: chatId'
        });
      }

      const messages = await whatsappService.getChatMessages(chatId, limit);
      
      res.json({
        success: true,
        data: messages,
        count: messages.length
      });
    } catch (error) {
      logger.error({ error }, 'Error getting chat messages');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Envía un mensaje de texto
   */
  async sendMessage(req, res) {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, message'
        });
      }

      const result = await whatsappService.sendMessage(to, message);
      
      res.json({
        success: true,
        data: {
          id: result.key.id,
          timestamp: result.messageTimestamp
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error sending message');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Envía una imagen
   */
  async sendImage(req, res) {
    try {
      const { to, caption } = req.body;
      const file = req.file;

      if (!to || !file) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, file'
        });
      }

      const result = await whatsappService.sendImage(
        to, 
        file.buffer, 
        caption || ''
      );
      
      res.json({
        success: true,
        data: {
          id: result.key.id,
          timestamp: result.messageTimestamp
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error sending image');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Envía un video
   */
  async sendVideo(req, res) {
    try {
      const { to, caption } = req.body;
      const file = req.file;

      if (!to || !file) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, file'
        });
      }

      const result = await whatsappService.sendVideo(
        to, 
        file.buffer, 
        caption || ''
      );
      
      res.json({
        success: true,
        data: {
          id: result.key.id,
          timestamp: result.messageTimestamp
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error sending video');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Envía un documento
   */
  async sendDocument(req, res) {
    try {
      const { to } = req.body;
      const file = req.file;

      if (!to || !file) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, file'
        });
      }

      const result = await whatsappService.sendDocument(
        to,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      
      res.json({
        success: true,
        data: {
          id: result.key.id,
          timestamp: result.messageTimestamp
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error sending document');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Cierra sesión de WhatsApp
   */
  async logout(req, res) {
    try {
      await whatsappService.logout();
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error({ error }, 'Error logging out');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new WhatsAppController();