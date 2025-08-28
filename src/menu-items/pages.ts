// assets
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';

// type
import { NavItemType } from 'types/menu';

// icons
const icons = { TeamOutlined, SafetyOutlined, AppstoreOutlined, SettingOutlined };

// ==============================|| MENU ITEMS - PAGES ||============================== //

const pages: NavItemType = {
  id: 'group-pages',
  title: 'pages',
  type: 'group',
  children: [
           // 👇 Menu "Administração"
      {
        id: 'administration',
        title: 'administration',
        type: 'collapse',
        icon: icons.SettingOutlined,
        isDropdown: true,
        children: [
          {
            id: 'company',
            title: 'company',
            type: 'item',
            url: '/company'
          },
          {
            id: 'departments',
            title: 'departments',
            type: 'item',
            url: '/departments'
          },
          {
            id: 'roles',
            title: 'roles',
            type: 'item',
            url: '/roles'
          }
        ]
      },
    // 👇 submenu "Colaboradores"
    {
      id: 'collaborators',
      title: 'users',
      type: 'item',
      icon: icons.TeamOutlined,
      url: '/users'
    },
  ]
};

export default pages;
