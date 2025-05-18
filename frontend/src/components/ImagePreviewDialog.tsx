import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  styled,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const CloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(1),
  top: theme.spacing(1),
  color: theme.palette.grey[500],
}));

const PreviewImage = styled('img')({
  maxWidth: '100%',
  maxHeight: '80vh',
  objectFit: 'contain',
});

const LoadingContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '300px',
});

interface ImagePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
}

const ImagePreviewDialog: React.FC<ImagePreviewDialogProps> = ({
  open,
  onClose,
  imageUrl,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogContent>
        <CloseButton onClick={onClose}>
          <CloseIcon />
        </CloseButton>
        {loading && (
          <LoadingContainer>
            <CircularProgress />
          </LoadingContainer>
        )}
        {error && (
          <LoadingContainer>
            <Typography color="error">Failed to load image</Typography>
          </LoadingContainer>
        )}
        <PreviewImage 
          src={imageUrl} 
          alt="Preview" 
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: loading || error ? 'none' : 'block' }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewDialog;