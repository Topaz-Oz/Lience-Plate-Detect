import { io, Socket } from 'socket.io-client';
import { deflate, inflate } from 'pako';
import { DetectionProgress, DetectionResult } from '../types/types';

interface DetectionMessage {
  type: 'progress' | 'detection';
  data: DetectionProgress | DetectionResult;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private detectionCallbacks: Set<(message: DetectionMessage) => void> = new Set();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.socket?.connect();
      }
    });

    this.socket.on('videoFrame', async (compressedFrame: Uint8Array) => {
      try {
        const decompressedFrame = inflate(compressedFrame);
        const frame = new TextDecoder().decode(decompressedFrame);
        this.handleVideoFrame(frame);
      } catch (error) {
        console.error('Error decompressing frame:', error);
      }
    });

    this.socket.on('detection', (message: DetectionMessage) => {
      this.detectionCallbacks.forEach(callback => callback(message));
    });
  }

  private handleVideoFrame(frame: string) {
    try {
      const imageElement = document.getElementById('video-frame') as HTMLImageElement;
      if (imageElement) {
        imageElement.src = frame;
      }
    } catch (error) {
      console.error('Error handling video frame:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.detectionCallbacks.clear();
  }

  subscribeToDetections(callback: (message: DetectionMessage) => void) {
    this.detectionCallbacks.add(callback);
  }

  unsubscribeFromDetections(callback: (message: DetectionMessage) => void) {
    this.detectionCallbacks.delete(callback);
  }
}

export default new SocketService();