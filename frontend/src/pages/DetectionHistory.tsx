import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
} from '@mui/material';
import { detectionAPI } from '../services/api';
import { DetectionResult } from '../types/types';
import ImagePreviewDialog from '../components/ImagePreviewDialog';

const Root = styled('div')({
  width: '100%',
});

const LoadingContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(3),
}));

const ImagePreview = styled('img')({
  width: 100,
  height: 'auto',
  cursor: 'pointer',
});

interface ConfidenceProps {
  value: number;
}

const ConfidenceText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'value',
})<ConfidenceProps>(({ theme, value }) => ({
  color: value > 0.8 ? 'green' : value > 0.5 ? 'orange' : 'red',
}));

const DetectionHistory: React.FC = () => {
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadDetectionHistory();
  }, []);

  const loadDetectionHistory = async () => {
    try {
      const response = await detectionAPI.getHistory();
      setDetections(response.data);
    } catch (error) {
      console.error('Error loading detection history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress />
      </LoadingContainer>
    );
  }

  return (
    <Root>
      <Typography variant="h6" gutterBottom>
        Detection History
      </Typography>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          <Table sx={{ minWidth: 750 }}>
            <TableHead>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>License Plate</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Province</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detections.map((detection) => (
                <TableRow key={detection.timestamp}>
                  <TableCell>
                    <ImagePreview
                      src={detection.imageUrl}
                      alt="License plate"
                      onClick={() => handleImageClick(detection.imageUrl)}
                    />
                  </TableCell>
                  <TableCell>{detection.licensePlate}</TableCell>
                  <TableCell>
                    <ConfidenceText value={detection.confidence}>
                      {(detection.confidence * 100).toFixed(2)}%
                    </ConfidenceText>
                  </TableCell>
                  <TableCell>{detection.province || 'Unknown'}</TableCell>
                  <TableCell>
                    {new Date(detection.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ImagePreviewDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        imageUrl={selectedImage || ''}
      />
    </Root>
  );
};

export default DetectionHistory;