import React, { useState, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Paper,
  LinearProgress,
  Alert,
} from '@mui/material';
import { PhotoCamera, Clear } from '@mui/icons-material';
import { detectionAPI } from '../services/api';
import { DetectionResult } from '../types/types';
import ImagePreviewDialog from '../components/ImagePreviewDialog';
import socketService from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import { DetectionProgress, SocketMessage } from '../types/types';
const Root = styled('div')(({ theme }) => ({
  flexGrow: 1,
}));

const Input = styled('input')({
  display: 'none',
});

const PreviewContainer = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 600,
  margin: '0 auto',
});

const Preview = styled('img')({
  width: '100%',
  maxHeight: 400,
  objectFit: 'contain',
});

const StyledProgress = styled(CircularProgress)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
}));

interface ConfidenceProps {
  value: number;
}

const ConfidenceText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'value',
})<ConfidenceProps>(({ theme, value }) => ({
  color: value > 0.8 ? 'green' : value > 0.5 ? 'orange' : 'red',
}));

const isDetectionProgress = (data: any): data is DetectionProgress => {
  return data && typeof data === 'object' && 'stage' in data && 'progress' in data;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progress, setProgress] = useState<DetectionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      socketService.subscribeToDetections((message) => {
        if (message.type === 'progress' && message.data && isDetectionProgress(message.data)) {
          setProgress(message.data);
          if (message.data.stage === 'complete' && message.data.result) {
            setResult(message.data.result);
            setLoading(false);
            setProgress(null);
          } else if (message.data.stage === 'error') {
            setError(message.data.status);
            setLoading(false);
            setProgress(null);
          }
        }
      });
    }    return () => {
      if (user) {
        socketService.unsubscribeFromDetections(message => {
          // Use the same callback as subscribe to ensure proper cleanup
          if (message.type === 'progress' && message.data && isDetectionProgress(message.data)) {
            setProgress(message.data);
            if (message.data.stage === 'complete' && message.data.result) {
              setResult(message.data.result);
              setLoading(false);
              setProgress(null);
            } else if (message.data.stage === 'error') {
              setError(message.data.status);
              setLoading(false);
              setProgress(null);
            }
          }
        });
      }
    };
  }, [user]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDetect = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      await detectionAPI.detectPlate(formData);
      // Result will be set by WebSocket update
    } catch (error) {
      setError('Failed to process image. Please try again.');
      console.error('Detection error:', error);
    } finally {
      if (!progress) {
        setLoading(false);
      }
    }
  };

  return (
    <Root>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Input
              type="file"
              accept="image/*"
              id="image-input"
              onChange={handleFileSelect}
              ref={fileInputRef}
            />
            <label htmlFor="image-input">
              <Button
                variant="contained"
                color="primary"
                component="span"
                startIcon={<PhotoCamera />}
              >
                Upload Image
              </Button>
            </label>
            {selectedFile && (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleClear}
                sx={{ ml: 1 }}
                startIcon={<Clear />}
              >
                Clear
              </Button>
            )}
          </Paper>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Grid>
        )}

        {previewUrl && (
          <Grid item xs={12}>
            <PreviewContainer>
              <Preview
                src={previewUrl}
                alt="Preview"
                onClick={() => setDialogOpen(true)}
                style={{ cursor: 'pointer' }}
              />
              {loading && !progress && <StyledProgress size={60} />}
              {progress && (
                <div style={{ marginTop: 16 }}>
                  <Typography variant="body2" color="textSecondary">
                    {progress.status}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={progress.progress}
                    sx={{ mt: 1 }}
                  />
                </div>
              )}
            </PreviewContainer>
            <Button
              variant="contained"
              color="primary"
              onClick={handleDetect}
              disabled={loading}
              fullWidth
              sx={{ mt: 2 }}
            >
              {loading ? 'Processing...' : 'Detect License Plate'}
            </Button>
          </Grid>
        )}

        {result && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detection Result
                </Typography>
                <Typography variant="body1">
                  License Plate: {result.licensePlate}
                </Typography>
                <ConfidenceText value={result.confidence} variant="body1">
                  Confidence: {(result.confidence * 100).toFixed(2)}%
                </ConfidenceText>
                {result.province && (
                  <Typography variant="body1">
                    Province: {result.province}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <ImagePreviewDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        imageUrl={previewUrl || ''}
      />
    </Root>
  );
};

export default Dashboard;