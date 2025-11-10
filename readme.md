# 📱 WhatsApp Microservice con Baileys

Microservicio profesional de WhatsApp con WebSockets en tiempo real, integración con Laravel y soporte completo para multimedia.

## 🚀 Características

- ✅ Conexión con WhatsApp mediante QR
- ✅ Envío de mensajes de texto
- ✅ Envío/recepción de imágenes, videos y documentos
- ✅ WebSocket para comunicación en tiempo real
- ✅ Webhook para notificaciones a Laravel
- ✅ API REST completa
- ✅ Arquitectura profesional con separación de responsabilidades
- ✅ Sistema de logging con Pino
- ✅ Manejo robusto de errores
- ✅ Autenticación por token

## 📦 Instalación

```bash
# Clonar o descargar el proyecto
cd whatsapp-microservice

# Instalar dependencias
npm install

# Copiar y configurar variables de entorno
cp .env.example .env

# Editar .env con tus configuraciones
nano .env
```

## ⚙️ Configuración

Edita el archivo `.env`:

```env
PORT=3000
WS_PORT=3001
WS_CORS_ORIGIN=http://localhost:8000

# Token de seguridad (genera uno seguro)
LARAVEL_API_TOKEN=tu-token-super-secreto

# URL del webhook de Laravel (opcional)
LARAVEL_WEBHOOK_URL=http://localhost:8000/api/webhook/whatsapp
```

## 🏃 Uso

### Iniciar el microservicio

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

### Escanear QR

1. Inicia el microservicio
2. El QR aparecerá en la consola
3. Escanéalo con WhatsApp desde tu teléfono
4. La conexión se establecerá automáticamente

## 📡 API REST

Todas las rutas requieren autenticación mediante header:
```
Authorization: Bearer tu-token-secreto
```

### 1. Verificar estado
```http
GET /api/whatsapp/status
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "state": "connected",
    "qr": null,
    "user": {
      "id": "573001234567:1@s.whatsapp.net",
      "name": "Tu Nombre"
    }
  }
}
```

### 2. Obtener todos los chats
```http
GET /api/whatsapp/chats
```

**Respuesta:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "573001234567@s.whatsapp.net",
      "name": "Juan Pérez",
      "isGroup": false,
      "profilePicture": "https://...",
      "lastMessage": "Hola, ¿cómo estás?",
      "lastMessageTimestamp": 1699564800,
      "unreadCount": 2,
      "participants": null,
      "participantCount": null
    },
    {
      "id": "120363123456789@g.us",
      "name": "Grupo de Trabajo",
      "isGroup": true,
      "profilePicture": "https://...",
      "lastMessage": "📷 Imagen",
      "lastMessageTimestamp": 1699564700,
      "unreadCount": 0,
      "participants": [
        {
          "id": "573001234567@s.whatsapp.net",
          "isAdmin": true,
          "isSuperAdmin": true
        }
      ],
      "participantCount": 5
    }
  ]
}
```

### 3. Obtener información de un chat específico
```http
GET /api/whatsapp/chats/:chatId/info
```

**Ejemplo:**
```http
GET /api/whatsapp/chats/573001234567/info
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "573001234567@s.whatsapp.net",
    "name": "Juan Pérez",
    "isGroup": false,
    "profilePicture": "https://...",
    "lastMessage": "Hola, ¿cómo estás?",
    "lastMessageTimestamp": 1699564800,
    "unreadCount": 2,
    "participants": null,
    "participantCount": null
  }
}
```

### 4. Obtener mensajes de un chat
```http
GET /api/whatsapp/chats/:chatId/messages?limit=50
```

**Ejemplo:**
```http
GET /api/whatsapp/chats/573001234567/messages?limit=100
```

**Respuesta:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": "BAE5F5F5F5F5F5F5",
      "from": "573001234567@s.whatsapp.net",
      "fromMe": false,
      "timestamp": 1699564700,
      "type": "text",
      "body": "Hola, ¿cómo estás?",
      "media": null
    },
    {
      "id": "BAE5F5F5F5F5F5F6",
      "from": "573001234567@s.whatsapp.net",
      "fromMe": true,
      "timestamp": 1699564800,
      "type": "text",
      "body": "¡Muy bien, gracias!",
      "media": null
    },
    {
      "id": "BAE5F5F5F5F5F5F7",
      "from": "573001234567@s.whatsapp.net",
      "fromMe": false,
      "timestamp": 1699564900,
      "type": "image",
      "body": null,
      "media": {
        "buffer": "base64_encoded_image...",
        "mimetype": "image/jpeg",
        "filename": "image.jpg"
      }
    }
  ]
}
```

### 5. Enviar mensaje de texto
```http
POST /api/whatsapp/send/message
Content-Type: application/json

{
  "to": "573001234567",
  "message": "Hola desde el microservicio!"
}
```

### 5. Enviar mensaje de texto
```http
POST /api/whatsapp/send/message
Content-Type: application/json

{
  "to": "573001234567",
  "message": "Hola desde el microservicio!"
}
```

### 6. Enviar imagen
```http
POST /api/whatsapp/send/image
Content-Type: multipart/form-data

to: 573001234567
caption: Mira esta imagen
file: [archivo de imagen]
```

### 7. Enviar video
```http
POST /api/whatsapp/send/video
Content-Type: multipart/form-data

to: 573001234567
caption: Video importante
file: [archivo de video]
```

### 8. Enviar documento
```http
POST /api/whatsapp/send/document
Content-Type: multipart/form-data

to: 573001234567
file: [archivo PDF, Word, etc]
```

### 9. Cerrar sesión
```http
POST /api/whatsapp/logout
```

## 🔌 WebSocket

### Conectar desde Laravel

```javascript
import Echo from 'laravel-echo';
import io from 'socket.io-client';

window.io = io;

window.Echo = new Echo({
    broadcaster: 'socket.io',
    host: 'http://localhost:3001'
});
```

### Eventos disponibles

#### 1. QR generado
```javascript
Echo.channel('whatsapp')
    .listen('whatsapp:qr', (data) => {
        console.log('QR:', data.qr);
        // Mostrar QR en la interfaz
    });
```

#### 2. Conectado
```javascript
Echo.channel('whatsapp')
    .listen('whatsapp:connected', (data) => {
        console.log('Conectado:', data.user);
    });
```

#### 3. Desconectado
```javascript
Echo.channel('whatsapp')
    .listen('whatsapp:disconnected', () => {
        console.log('Desconectado');
    });
```

#### 4. Mensaje recibido
```javascript
Echo.channel('whatsapp')
    .listen('whatsapp:message', (message) => {
        console.log('Mensaje:', message);
        // message contiene:
        // - id: ID del mensaje
        // - from: Número del remitente
        // - fromMe: boolean si es propio
        // - timestamp: timestamp
        // - type: 'text', 'image', 'video', etc.
        // - body: texto del mensaje
        // - media: objeto con buffer, mimetype, filename (si aplica)
    });
```

## 🔗 Integración con Laravel

### 1. Instalar dependencias en Laravel

```bash
composer require guzzlehttp/guzzle
```

### 2. Crear servicio en Laravel

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WhatsAppService
{
    private $baseUrl;
    private $token;

    public function __construct()
    {
        $this->baseUrl = config('services.whatsapp.url');
        $this->token = config('services.whatsapp.token');
    }

    public function sendMessage($to, $message)
    {
        return Http::withToken($this->token)
            ->post("{$this->baseUrl}/api/whatsapp/send/message", [
                'to' => $to,
                'message' => $message
            ]);
    }

    public function sendImage($to, $imagePath, $caption = '')
    {
        return Http::withToken($this->token)
            ->attach('file', file_get_contents($imagePath), basename($imagePath))
            ->post("{$this->baseUrl}/api/whatsapp/send/image", [
                'to' => $to,
                'caption' => $caption
            ]);
    }

    public function getStatus()
    {
        return Http::withToken($this->token)
            ->get("{$this->baseUrl}/api/whatsapp/status");
    }
}
```

### 3. Configurar en `config/services.php`

```php
'whatsapp' => [
    'url' => env('WHATSAPP_SERVICE_URL', 'http://localhost:3000'),
    'token' => env('WHATSAPP_SERVICE_TOKEN'),
],
```

### 4. Crear controlador webhook

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class WhatsAppWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $event = $request->input('event');
        $data = $request->input('data');

        switch ($event) {
            case 'message.received':
                // Procesar mensaje recibido
                $this->handleMessageReceived($data);
                break;
            
            case 'whatsapp.connected':
                // WhatsApp conectado
                break;
            
            case 'whatsapp.disconnected':
                // WhatsApp desconectado
                break;
        }

        return response()->json(['success' => true]);
    }

    private function handleMessageReceived($message)
    {
        // Guardar en base de datos, procesar, etc.
        \Log::info('Mensaje recibido de WhatsApp:', $message);
    }
}
```

### 5. Agregar ruta

```php
Route::post('/api/webhook/whatsapp', [WhatsAppWebhookController::class, 'handle']);
```

## 📂 Estructura del Proyecto

```
whatsapp-microservice/
├── src/
│   ├── config/
│   │   └── config.js           # Configuración centralizada
│   ├── controllers/
│   │   └── WhatsAppController.js  # Controlador HTTP
│   ├── services/
│   │   ├── WhatsAppService.js     # Lógica de WhatsApp
│   │   ├── WebSocketService.js    # Lógica de WebSocket
│   │   └── WebhookService.js      # Lógica de Webhook
│   ├── routes/
│   │   └── whatsapp.routes.js     # Rutas de la API
│   ├── middleware/
│   │   └── auth.middleware.js     # Autenticación
│   ├── utils/
│   │   └── logger.js              # Sistema de logs
│   ├── app.js                     # Aplicación Express
│   └── server.js                  # Servidor principal
├── sessions/                      # Sesiones de WhatsApp (auto-generado)
├── .env                          # Variables de entorno
├── package.json
└── README.md
```

## 🔒 Seguridad

- ✅ Autenticación por token en todas las rutas
- ✅ Validación de archivos (tamaño máximo 16MB)
- ✅ CORS configurable
- ✅ Headers de seguridad
- ✅ Logs de todas las operaciones

## 🐛 Solución de Problemas

### El QR no aparece
- Verifica que el puerto 3000 esté libre
- Revisa los logs en la consola
- Elimina la carpeta `sessions/` y reinicia

### No se conecta a WhatsApp
- Asegúrate de escanear el QR rápidamente
- Verifica tu conexión a internet
- Revisa que WhatsApp esté actualizado en tu teléfono

### Laravel no recibe mensajes
- Verifica que el webhook esté configurado correctamente
- Comprueba el token de autorización
- Revisa los logs del microservicio

## 📝 Ejemplos de Uso

### Desde Laravel

```php
// Enviar mensaje
$whatsapp = app(WhatsAppService::class);
$whatsapp->sendMessage('573001234567', '¡Hola desde Laravel!');

// Enviar imagen
$whatsapp->sendImage('573001234567', storage_path('app/imagen.jpg'), 'Mira esto');

// Obtener estado
$status = $whatsapp->getStatus();
```

### Desde JavaScript

```javascript
// Conectar WebSocket
const socket = io('http://localhost:3001');

socket.on('whatsapp:message', (message) => {
    console.log('Nuevo mensaje:', message);
});

// Enviar mensaje vía API
fetch('http://localhost:3000/api/whatsapp/send/message', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer tu-token'
    },
    body: JSON.stringify({
        to: '573001234567',
        message: 'Hola!'
    })
});
```

## 📄 Licencia

MIT

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría realizar.

---

**Desarrollado con ❤️ para integración profesional con Laravel**# whatsapp-microservicio
