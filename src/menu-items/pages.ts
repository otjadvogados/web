// assets
import DollarOutlined from '@ant-design/icons/DollarOutlined';
import LoginOutlined from '@ant-design/icons/LoginOutlined';
import RocketOutlined from '@ant-design/icons/RocketOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';

// type
import { NavItemType } from 'types/menu';

// icons
const icons = { DollarOutlined, LoginOutlined, RocketOutlined, UserOutlined, TeamOutlined, SafetyOutlined, AppstoreOutlined };

// ==============================|| MENU ITEMS - PAGES ||============================== //

const pages: NavItemType = {
  id: 'group-pages',
  title: 'pages',
  type: 'group',
  children: [
    {
      id: 'maintenance',
      title: 'maintenance',
      type: 'collapse',
      icon: icons.RocketOutlined,
      isDropdown: true,
      children: [
        {
          id: 'error-404',
          title: 'error-404',
          type: 'item',
          url: '/maintenance/404',
          target: true
        },
        {
          id: 'error-500',
          title: 'error-500',
          type: 'item',
          url: '/maintenance/500',
          target: true
        },
        {
          id: 'coming-soon',
          title: 'coming-soon',
          type: 'item',
          url: '/maintenance/coming-soon',
          target: true
        },
        {
          id: 'under-construction',
          title: 'under-construction',
          type: 'item',
          url: '/maintenance/under-construction',
          target: true
        }
      ]
    },

    {
      id: 'account',
      title: 'my-account',
      type: 'item',
      url: '/account',
      icon: icons.UserOutlined
    },

    // 👇 NOVO: submenu "Colaboradores"
    {
      id: 'collaborators',
      title: 'users',
      type: 'item',
      icon: icons.TeamOutlined,
      url: '/users'
    },
    // 👇 NOVO: Funções (roles)
    {
      id: 'roles',
      title: 'roles',
      type: 'item',
      icon: icons.SafetyOutlined,
      url: '/roles'
    },
    // 👇 NOVO: Departamentos
    {
      id: 'departments',
      title: 'departments',
      type: 'item',
      icon: icons.AppstoreOutlined,
      url: '/departments'
    },
    // 👇 NOVO: Bloqueios de conta
    {
      id: 'account-blocks',
      title: 'account-blocks',
      type: 'item',
      icon: icons.SafetyOutlined,
      url: '/blocks'
    }
  ]
};

export default pages;
