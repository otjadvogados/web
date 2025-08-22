// material-ui
import List from '@mui/material/List';
import Link from '@mui/material/Link';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

// third-party
import { FormattedMessage } from 'react-intl';

// assets
import CommentOutlined from '@ant-design/icons/CommentOutlined';
import LockOutlined from '@ant-design/icons/LockOutlined';
import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import UnorderedListOutlined from '@ant-design/icons/UnorderedListOutlined';

// ==============================|| HEADER PROFILE - SETTING TAB ||============================== //

export default function SettingTab() {
  return (
    <List component="nav" sx={{ p: 0, '& .MuiListItemIcon-root': { minWidth: 32 } }}>
      <Link underline="none" style={{ color: 'inherit' }} href="/devices">
        <ListItemButton>
          <ListItemIcon>
            <CommentOutlined />
          </ListItemIcon>
          <ListItemText primary={<FormattedMessage id="devices-center" />} />
        </ListItemButton>
      </Link>
    </List>
  );
}
