import React from 'react';
import { styled } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Box,
} from '@mui/material';
import {
  Menu as MenuIcon,
  PhotoCamera as CameraIcon,
  History as HistoryIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

const Root = styled('div')({
  display: 'flex',
});

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
  },
}));

const MainContent = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: 64,
}));

const UserInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [drawerOpen, setDrawerOpen] = React.useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Root>
      <StyledAppBar position="fixed">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ marginRight: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            License Plate Recognition
          </Typography>
          <UserInfo>
            <Avatar
              src={user?.picture}
              alt={user?.name || user?.username}
              sx={{ width: 32, height: 32 }}
            >
              {(user?.name || user?.username || '?')[0].toUpperCase()}
            </Avatar>
            <Typography variant="body1">
              {user?.name || user?.username}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </UserInfo>
        </Toolbar>
      </StyledAppBar>

      <StyledDrawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
      >
        <Toolbar />
        <List>
          <ListItem button onClick={() => navigate('/')}>
            <ListItemIcon>
              <CameraIcon />
            </ListItemIcon>
            <ListItemText primary="Detection" />
          </ListItem>
          <ListItem button onClick={() => navigate('/history')}>
            <ListItemIcon>
              <HistoryIcon />
            </ListItemIcon>
            <ListItemText primary="History" />
          </ListItem>
        </List>
      </StyledDrawer>

      <MainContent>
        {children}
      </MainContent>
    </Root>
  );
};

export default Layout;