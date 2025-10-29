// assets
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import AIIcon from 'components/icons/AIIcon';

// type
import { NavItemType } from 'types/menu';

// icons
const icons = { TeamOutlined, SafetyOutlined, AppstoreOutlined, SettingOutlined, UserOutlined, AIIcon };

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
    // 👇 Inteligência Artificial
    {
      id: 'ai',
      title: 'Inteligência Artificial',
      type: 'collapse',
      icon: icons.AIIcon,
      isDropdown: true,
      children: [
        {
          id: 'ai-pieces',
          title: 'Peças',
          type: 'item',
          url: '/ai/pieces'
        },
        {
          id: 'ai-topics',
          title: 'Tópicos',
          type: 'item',
          url: '/ai/topics'
        },
        {
          id: 'ai-topic-specifics',
          title: 'Tópicos específicos',
          type: 'item',
          url: '/ai/topic-specifics'
        },
        {
          id: 'ai-rules',
          title: 'Regras e tipografia',
          type: 'item',
          url: '/ai/rules'
        },
        {
          id: 'ai-cases-create',
          title: 'Criar Caso',
          type: 'item',
          url: '/ai/cases/create'
        },
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
    // 👇 Clientes
    {
      id: 'clients',
      title: 'customer',
      type: 'item',
      icon: icons.UserOutlined,
      url: '/clients'
    },
  ]
};

export default pages;
