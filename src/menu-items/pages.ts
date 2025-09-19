// assets
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import AIIcon from 'components/icons/AIIcon';

// type
import { NavItemType } from 'types/menu';

// icons
const icons = { TeamOutlined, SafetyOutlined, AppstoreOutlined, SettingOutlined, AIIcon };

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
    // 👇 AI Docs
    {
      id: 'ai-docs',
      title: 'Inteligência Artificial',
      type: 'collapse',
      icon: icons.AIIcon,
      isDropdown: true,
      children: [
        {
          id: 'ai-docs-cases',
          title: 'Meus Casos',
          type: 'item',
          url: '/ai-docs/cases'
        },
        {
          id: 'ai-docs-categories',
          title: 'Categorias',
          type: 'item',
          url: '/ai-docs/categories'
        },
        {
          id: 'ai-docs-subcategories',
          title: 'Subcategorias',
          type: 'item',
          url: '/ai-docs/subcategories'
        },
        {
          id: 'ai-docs-templates',
          title: 'Templates',
          type: 'item',
          url: '/ai-docs/templates'
        }
      ]
    },
  ]
};

export default pages;
