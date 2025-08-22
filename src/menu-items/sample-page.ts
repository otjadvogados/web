// Central de Dispositivos - menu item para layout horizontal

// assets
import DesktopOutlined from '@ant-design/icons/DesktopOutlined';

// type
import { NavItemType } from 'types/menu';

// icons
const icons = { DesktopOutlined };

// ==============================|| MENU ITEMS - CENTRAL DE DISPOSITIVOS ||============================== //

const devicesCenter: NavItemType = {
  id: 'devices-group',
  title: 'devices',
  type: 'group',
  children: [
    {
      id: 'devices',
      title: 'devices-center',
      type: 'item',
      url: '/devices',
      icon: icons.DesktopOutlined
    }
  ]
};

export default devicesCenter;
