export interface User {
  _id: string;
  username: string;
  email?: string;
  name?: string;
  picture?: string;
  role: 'admin' | 'user';
  isGoogleAccount?: boolean;
}

export interface DetectionResult {
  licensePlate: string;
  confidence: number;
  imageUrl: string;
  timestamp: string;
  province?: string;
  location?: string;
  detectedBy?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface DetectionProgress {
  stage: 'detecting' | 'processing' | 'complete' | 'error';
  progress: number;
  status: string;
  result?: DetectionResult;
}

export interface SocketMessage {
  type: 'detection' | 'error' | 'progress';
  message: string;
  data?: DetectionProgress | DetectionResult;
}