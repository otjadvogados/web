// assets
import DollarOutlined from '@ant-design/icons/DollarOutlined';
import LoginOutlined from '@ant-design/icons/LoginOutlined';
import RocketOutlined from '@ant-design/icons/RocketOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';

// type
import { NavItemType } from 'types/menu';

// icons
const icons = { DollarOutlined, LoginOutlined, RocketOutlined, UserOutlined };

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
    {
      id: 'users',
      title: 'users',
      type: 'item',
      url: '/users',
      icon: icons.UserOutlined
    }
  ]
};

export default pages;
