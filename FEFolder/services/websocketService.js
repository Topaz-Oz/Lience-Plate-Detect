const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');

class WebSocketService {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Map user IDs to their WebSocket connections

        this.wss.on('connection', (ws, req) => {
            const token = url.parse(req.url, true).query.token;
            
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded._id;
                
                // Store client connection
                this.clients.set(userId, ws);

                ws.on('message', (message) => {
                    this.handleMessage(userId, message);
                });

                ws.on('close', () => {
                    this.clients.delete(userId);
                });

                // Send welcome message
                ws.send(JSON.stringify({
                    type: 'connection',
                    message: 'Connected to detection service'
                }));

            } catch (error) {
                ws.close();
            }
        });
    }

    handleMessage(userId, message) {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'ping':
                    this.sendToUser(userId, {
                        type: 'pong',
                        timestamp: Date.now()
                    });
                    break;
                // Add more message handlers as needed
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }

    // Send message to specific user
    sendToUser(userId, data) {
        const client = this.clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }

    // Send detection progress updates
    sendDetectionProgress(userId, progress) {
        this.sendToUser(userId, {
            type: 'detection_progress',
            progress
        });
    }

    // Send detection result
    sendDetectionResult(userId, result) {
        this.sendToUser(userId, {
            type: 'detection_result',
            result
        });
    }

    // Broadcast message to all connected clients
    broadcast(data) {
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
}

module.exports = WebSocketService;