import { lazy } from 'react';

// project imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import PagesLayout from 'layout/Pages';
import SimpleLayout from 'layout/Simple';

import { SimpleLayoutType } from 'config';

// pages routing
const MaintenanceError = Loadable(lazy(() => import('pages/maintenance/404')));
const MaintenanceError500 = Loadable(lazy(() => import('pages/maintenance/500')));
const MaintenanceUnderConstruction = Loadable(lazy(() => import('pages/maintenance/under-construction')));
const MaintenanceComingSoon = Loadable(lazy(() => import('pages/maintenance/coming-soon')));



// NOVO: Central de Dispositivos
const DevicesCenter = Loadable(lazy(() => import('pages/security/devices-center')));

// NOVO: Configurações da Conta
const AccountSettings = Loadable(lazy(() => import('pages/account')));

// NOVO: Colaboradores
const UsersPage = Loadable(lazy(() => import('pages/users')));
const SensitiveFieldsPage = Loadable(lazy(() => import('pages/sensitive-fields')));
// NOVO: Funções (roles)
const RolesPage = Loadable(lazy(() => import('pages/roles')));
// NOVO: Departamentos
const DepartmentsPage = Loadable(lazy(() => import('pages/departments')));

// NOVO: Empresa
const CompanyPage = Loadable(lazy(() => import('pages/company')));

// NOVO: Bloqueios de Conta
const AccountBlocksPage = Loadable(lazy(() => import('pages/security/account-blocks')));

const AiDocsTemplates = Loadable(lazy(() => import('pages/ai-docs/TemplatesPage')));
const AiDocsCategories = Loadable(lazy(() => import('pages/ai-docs/CategoriesPage')));
const AiDocsSubCategories = Loadable(lazy(() => import('pages/ai-docs/SubCategoriesPage')));
const CreateCaseStep1 = Loadable(lazy(() => import('pages/ai-docs/CreateCaseStep1')));
const WDocEditorPage = Loadable(lazy(() => import('pages/ai-docs/WDocEditorPage')));
const AiCasesPage = Loadable(lazy(() => import('pages/ai-docs/CasesPage')));
const A4Playground = Loadable(lazy(() => import('pages/ai-docs/A4Playground')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        {
          path: 'devices',
          element: <DevicesCenter />
        },
        // NOVO: Bloqueios de Conta
        {
          path: 'blocks',
          element: <AccountBlocksPage />
        },
        {
          path: 'account',
          element: <AccountSettings />
        },
        {
          path: 'users',
          element: <UsersPage />
        },
        {
          path: 'roles',
          element: <RolesPage />
        },
        {
          path: 'departments',
          element: <DepartmentsPage />
        },
        {
          path: 'company',
          element: <CompanyPage />
        },
        {
          path: 'sensitive-fields',
          element: <SensitiveFieldsPage />
        },
        {
          path: 'ai-docs/templates',
          element: <AiDocsTemplates />
        },
        {
          path: 'ai-docs/categories',
          element: <AiDocsCategories />
        },
        {
          path: 'ai-docs/subcategories',
          element: <AiDocsSubCategories />
        },
        {
          path: 'ai-docs/create',
          element: <CreateCaseStep1 />
        },
        {
          path: 'ai-docs/editor',
          element: <WDocEditorPage />
        },
        {
          path: 'ai-docs/cases',
          element: <AiCasesPage />
        },
        {
          path: 'ai-docs/a4-playground/:id',
          element: <A4Playground />
        }
      ]
    },
    {
      path: '/maintenance',
      element: <PagesLayout />,
      children: [
        {
          path: '404',
          element: <MaintenanceError />
        },
        {
          path: '500',
          element: <MaintenanceError500 />
        },
        {
          path: 'under-construction',
          element: <MaintenanceUnderConstruction />
        },
        {
          path: 'coming-soon',
          element: <MaintenanceComingSoon />
        }
      ]
    },

  ]
};

export default MainRoutes;
