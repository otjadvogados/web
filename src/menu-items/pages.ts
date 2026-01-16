// assets
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import AudioOutlined from '@ant-design/icons/AudioOutlined';
import FunctionOutlined from '@ant-design/icons/FunctionOutlined';
import RocketOutlined from '@ant-design/icons/RocketOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import ToolOutlined from '@ant-design/icons/ToolOutlined';
import AIIcon from 'components/icons/AIIcon';

// type
import { NavItemType } from 'types/menu';

// icons
const icons = { TeamOutlined, SafetyOutlined, AppstoreOutlined, SettingOutlined, UserOutlined, AudioOutlined, FunctionOutlined, RocketOutlined, ThunderboltOutlined, ToolOutlined, AIIcon };

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
      permissions: ['company.read', 'company.update', 'departments.read', 'departments.create', 'departments.update', 'departments.delete', 'roles.read', 'roles.create', 
        'roles.update', 'roles.delete', 'ai.rules.read', 'ai.rules.create', 'ai.rules.update', 
        'ai.rules.delete','ai.usage.read', 'ai.usage.create', 'ai.usage.update', 'ai.usage.delete', 'dashboard.usage-ranking.read'],
      children: [
        {
          id: 'company',
          title: 'company',
          type: 'item',
          url: '/company',
          permissions: ['company.read', 'company.update'],
        },
        {
          id: 'departments',
          title: 'departments',
          type: 'item',
          url: '/departments',
          permissions: ['departments.read', 'departments.create', 'departments.update', 'departments.delete'],
        },
        {
          id: 'roles',
          title: 'roles',
          type: 'item',
          url: '/roles',
          permissions: ['roles.read', 'roles.create', 'roles.update', 'roles.delete'],
        },
        {
          id: 'ai-rules',
          title: 'Regras e tipografia',
          type: 'item',
          url: '/ai/rules',
          permissions: ['ai.rules.read', 'ai.rules.create', 'ai.rules.update', 'ai.rules.delete'],
        },
        {
          id: 'ai-usage',
          title: 'Uso da IA',
          type: 'item',
          url: '/ai/usage',
          permissions: ['ai.usage.read', 'ai.usage.create', 'ai.usage.update', 'ai.usage.delete'],
        },
        {
          id: 'dashboard',
          title: 'Dashboard',
          type: 'item',
          url: '/dashboard',
          permissions: ['dashboard.usage-ranking.read'],
        },
      ]
    },

    {
      id: 'ai',
      title: 'Criação de Casos',
      type: 'collapse',
      icon: icons.AIIcon,
      isDropdown: true,
      permissions: ['ai.cases.read', 'ai.cases.create', 'ai.cases.update', 'ai.cases.delete', 'ai.pieces.read', 'ai.pieces.create', 'ai.pieces.update', 'ai.pieces.delete', 'ai.topics.read', 'ai.topics.create', 'ai.topics.update', 'ai.topics.delete', 'ai.topic-specifics.read', 'ai.topic-specifics.create', 'ai.topic-specifics.update', 'ai.topic-specifics.delete'],
      children: [
        {
          id: 'ai-cases-list',
          title: 'Casos',
          type: 'item',
          url: '/ai/cases',
          permissions: ['ai.cases.read', 'ai.cases.create', 'ai.cases.update', 'ai.cases.delete'],
        },
        {
          id: 'ai-cases-create',
          title: 'Criar Caso',
          type: 'item',
          url: '/ai/cases/create',
          permissions: ['ai.cases.create'],
        },
        {
          id: 'ai-pieces',
          title: 'Peças',
          type: 'item',
          url: '/ai/pieces',
          permissions: ['ai.pieces.read', 'ai.pieces.create', 'ai.pieces.update', 'ai.pieces.delete'],
        },
        {
          id: 'ai-topics',
          title: 'Tópicos',
          type: 'item',
          url: '/ai/topics',
          permissions: ['ai.topics.read', 'ai.topics.create', 'ai.topics.update', 'ai.topics.delete'],
        },
        {
          id: 'ai-topic-specifics',
          title: 'Tópicos específicos',
          type: 'item',
          url: '/ai/topic-specifics',
          permissions: ['ai.topic-specifics.read', 'ai.topic-specifics.create', 'ai.topic-specifics.update', 'ai.topic-specifics.delete'],
        },
      ]
    },
    // 👇 Inteligência Artificial
    {
      id: 'features',
      title: 'Funcionalidades',
      type: 'collapse',
      icon: icons.ToolOutlined,
      isDropdown: true,
      permissions: ['transcribe.read', 'transcribe.create', 'transcribe.update', 'transcribe.delete'],
      children: [
        {
          id: 'ai-transcribe',
          title: 'Transcrições',
          type: 'item',
          url: '/ai/transcribe',
          permissions: ['transcribe.read', 'transcribe.create', 'transcribe.update', 'transcribe.delete'],
        },
        {
          id: 'ai-reports',
          title: 'Relatórios',
          type: 'item',
          url: '/ai/reports',
          permissions: ['customers.read', 'customers.create', 'customers.update', 'customers.delete'],
        },
      ]
    },
    // 👇 submenu "Colaboradores"
    {
      id: 'collaborators',
      title: 'users',
      type: 'item',
      icon: icons.TeamOutlined,
      url: '/users',
      permissions: ['users.read', 'users.create', 'users.update', 'users.delete'],
    },
    // 👇 Clientes
    {
      id: 'clients',
      title: 'customer',
      type: 'item',
      icon: icons.UserOutlined,
      url: '/clients',
      permissions: ['customers.read', 'customers.create', 'customers.update', 'customers.delete'],
    },
    
  ]
};

export default pages;
