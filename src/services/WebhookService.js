import axios from 'axios';
import logger from '../utils/logger.js';
import config from '../config/config.js';

class WebhookService {
  /**
   * Envía datos al webhook de Laravel
   */
  async send(event, data) {
    if (!config.laravel.webhookUrl) {
      logger.debug('Webhook URL not configured, skipping');
      return;
    }

    try {
      const response = await axios.post(
        config.laravel.webhookUrl,
        {
          event,
          data,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.laravel.apiToken}`
          },
          timeout: 10000
        }
      );

      logger.info({ event, status: response.status }, 'Webhook sent successfully');
      return response.data;
    } catch (error) {
      logger.error({ 
        error: error.message, 
        event,
        url: config.laravel.webhookUrl 
      }, 'Error sending webhook');
    }
  }

  /**
   * Envía notificación de mensaje recibido
   */
  async notifyMessageReceived(messageData) {
    return this.send('message.received', messageData);
  }

  /**
   * Envía notificación de mensaje enviado
   */
  async notifyMessageSent(messageData) {
    return this.send('message.sent', messageData);
  }

  /**
   * Envía notificación de conexión
   */
  async notifyConnected(userData) {
    return this.send('whatsapp.connected', userData);
  }

  /**
   * Envía notificación de desconexión
   */
  async notifyDisconnected() {
    return this.send('whatsapp.disconnected', {});
  }

  /**
   * Envía notificación de QR
   */
  async notifyQRGenerated(qrData) {
    return this.send('whatsapp.qr', qrData);
  }
}

export default new WebhookService();