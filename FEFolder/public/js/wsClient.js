class WebSocketClient {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = new Map();
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        const wsUrl = `ws://localhost:3000?token=${token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.emit('connected');
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.emit('disconnected');
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
    }

    handleMessage(data) {
        switch (data.type) {
            case 'detection_progress':
                this.emit('progress', data.progress);
                break;
            case 'detection_result':
                this.emit('result', data.result);
                break;
            case 'pong':
                this.emit('pong', data.timestamp);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            this.connect();
        }, 2000 * Math.pow(2, this.reconnectAttempts - 1)); // Exponential backoff
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Helper method to check connection status
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    // Ping server to keep connection alive
    startPing() {
        this.pingInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Ping every 30 seconds
    }

    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
}

// Create singleton instance
const wsClient = new WebSocketClient();