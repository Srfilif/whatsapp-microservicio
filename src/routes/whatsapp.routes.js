import express from 'express';
import multer from 'multer';
import whatsappController from '../controllers/WhatsAppController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Obtener estado de la conexión
router.get('/status', whatsappController.getStatus.bind(whatsappController));

// Obtener todos los chats
router.get('/chats', whatsappController.getChats.bind(whatsappController));

// Obtener información de un chat específico
router.get('/chats/:chatId/info', whatsappController.getChatInfo.bind(whatsappController));

// Obtener mensajes de un chat específico
router.get('/chats/:chatId/messages', whatsappController.getChatMessages.bind(whatsappController));

// Enviar mensaje de texto
router.post('/send/message', whatsappController.sendMessage.bind(whatsappController));

// Enviar imagen
router.post('/send/image', upload.single('file'), whatsappController.sendImage.bind(whatsappController));

// Enviar video
router.post('/send/video', upload.single('file'), whatsappController.sendVideo.bind(whatsappController));

// Enviar documento
router.post('/send/document', upload.single('file'), whatsappController.sendDocument.bind(whatsappController));

// Cerrar sesión
router.post('/logout', whatsappController.logout.bind(whatsappController));

export default router;