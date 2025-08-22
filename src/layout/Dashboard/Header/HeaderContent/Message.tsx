import { useRef, useState } from 'react';

// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'components/MainCard';
import IconButton from 'components/@extended/IconButton';
import Transitions from 'components/@extended/Transitions';

// assets
import MailOutlined from '@ant-design/icons/MailOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';

import avatar2 from 'assets/images/users/avatar-2.png';
import avatar3 from 'assets/images/users/avatar-3.png';
import avatar4 from 'assets/images/users/avatar-4.png';
import avatar5 from 'assets/images/users/avatar-5.png';

// sx styles
const avatarSX = {
  width: 48,
  height: 48
};

const actionSX = {
  mt: '6px',
  ml: 1,
  top: 'auto',
  right: 'auto',
  alignSelf: 'flex-start',
  transform: 'none'
};

// ==============================|| HEADER CONTENT - MENSAGENS ||============================== //

export default function Message() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const anchorRef = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: MouseEvent | TouchEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 0.75 }}>
      <IconButton
        color="secondary"
        variant="light"
        sx={(theme) => ({
          color: 'text.primary',
          bgcolor: open ? 'grey.100' : 'transparent',
          ...theme.applyStyles('dark', { bgcolor: open ? 'background.default' : 'transparent' })
        })}
        aria-label="abrir mensagens"
        ref={anchorRef}
        aria-controls={open ? 'profile-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <MailOutlined />
      </IconButton>
      <Popper
        placement={downMD ? 'bottom' : 'bottom-end'}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        sx={{ maxHeight: 'calc(100vh - 250px)' }}
        popperOptions={{ modifiers: [{ name: 'offset', options: { offset: [downMD ? -60 : 0, 9] } }] }}
      >
        {({ TransitionProps }) => (
          <Transitions type="grow" position={downMD ? 'top' : 'top-right'} in={open} {...TransitionProps}>
            <Paper sx={(theme) => ({ boxShadow: theme.customShadows.z1, width: '100%', minWidth: 285, maxWidth: { xs: 285, md: 420 } })}>
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard
                  title="Mensagens"
                  elevation={0}
                  border={false}
                  content={false}
                  secondary={
                    <IconButton size="small" onClick={handleToggle}>
                      <CloseOutlined />
                    </IconButton>
                  }
                >
                  <List
                    component="nav"
                    sx={{
                      p: 0,
                      '& .MuiListItemButton-root': {
                        px: 2,
                        py: 1.5,
                        '& .MuiAvatar-root': avatarSX,
                        '& .MuiListItemSecondaryAction-root': { ...actionSX, position: 'relative' }
                      }
                    }}
                  >
                    <ListItem
                      component={ListItemButton}
                      divider
                      secondaryAction={
                        <Typography variant="caption" noWrap>
                          3:00 AM
                        </Typography>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar alt="usuário" src={avatar2} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="h6">
                            Hoje é aniversário de{' '}
                            <Typography component="span" variant="subtitle1">
                              Cristina Danny
                            </Typography>
                            .
                          </Typography>
                        }
                        secondary="há 2 min"
                      />
                    </ListItem>
                    <ListItem
                      component={ListItemButton}
                      divider
                      secondaryAction={
                        <Typography variant="caption" noWrap>
                          18:00
                        </Typography>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar alt="usuário" src={avatar3} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="h6">
                            <Typography component="span" variant="subtitle1">
                              Aida Burg
                            </Typography>{' '}
                            comentou no seu post.
                          </Typography>
                        }
                        secondary="5 de Agosto"
                      />
                    </ListItem>
                    <ListItem
                      component={ListItemButton}
                      divider
                      secondaryAction={
                        <Typography variant="caption" noWrap>
                          14:45
                        </Typography>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar alt="usuário" src={avatar4} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography component="span" variant="subtitle1">
                            Houve uma falha na sua configuração.
                          </Typography>
                        }
                        secondary="há 7 horas"
                      />
                    </ListItem>
                    <ListItem
                      component={ListItemButton}
                      divider
                      secondaryAction={
                        <Typography variant="caption" noWrap>
                          21:10
                        </Typography>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar alt="usuário" src={avatar5} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="h6">
                            <Typography component="span" variant="subtitle1">
                              Cristina Danny
                            </Typography>{' '}
                            convidou você para a{' '}
                            <Typography component="span" variant="subtitle1">
                              reunião.
                            </Typography>
                          </Typography>
                        }
                        secondary="Reunião diária de scrum"
                      />
                    </ListItem>
                    <ListItem component={ListItemButton} sx={{ textAlign: 'center' }}>
                      <ListItemText
                        primary={
                          <Typography variant="h6" color="primary">
                            Ver Todas
                          </Typography>
                        }
                      />
                    </ListItem>
                  </List>
                </MainCard>
              </ClickAwayListener>
            </Paper>
          </Transitions>
        )}
      </Popper>
    </Box>
  );
}
