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

// NOVO: AI > Peças
const AIPiecesPage = Loadable(lazy(() => import('pages/ai/pieces')));
// NOVO: AI > Regras
const AIRulesPage = Loadable(lazy(() => import('pages/ai/rules')));
// NOVO: AI > Tópicos
const AITopicsPage = Loadable(lazy(() => import('pages/ai/topics')));
// NOVO: AI > Tópicos Específicos
const AITopicSpecificsPage = Loadable(lazy(() => import('pages/ai/topic-specifics')));
// NOVO: AI > Uso da IA
const AIUsagePage = Loadable(lazy(() => import('pages/ai/usage')));
// NOVO: AI > Transcrições
const AITranscribePage = Loadable(lazy(() => import('pages/ai/transcribe')));
const TranscriptionFolderPage = Loadable(lazy(() => import('pages/ai/transcribe/[folderId]')));
// NOVO: Relatórios
const ReportsPage = Loadable(lazy(() => import('pages/ai/reports')));
const ReportsFolderPage = Loadable(lazy(() => import('pages/ai/reports/[folderId]')));
const EditReportPage = Loadable(lazy(() => import('pages/ai/reports/[customerId]/[reportId]/edit')));
const ProvisionamentoReportPage = Loadable(lazy(() => import('pages/ai/reports/provisionamento')));
const PreAudienciaReportPage = Loadable(lazy(() => import('pages/ai/reports/pre-audiencia')));
const PosAudienciaReportPage = Loadable(lazy(() => import('pages/ai/reports/pos-audiencia')));
const DecisoesReportPage = Loadable(lazy(() => import('pages/ai/reports/decisoes')));
const ProcessualReportPage = Loadable(lazy(() => import('pages/ai/reports/processual')));
// NOVO: Prompts
const PromptsPage = Loadable(lazy(() => import('pages/ai/prompts')));
const PromptsFolderPage = Loadable(lazy(() => import('pages/ai/prompts/[folderId]')));
// NOVO: AI > Criar Caso
const CreateCasePage = Loadable(lazy(() => import('pages/ai/cases/create')));
// NOVO: AI > Listar Casos (pastas)
const CasesPage = Loadable(lazy(() => import('pages/ai/cases')));
const CasesFolderPage = Loadable(lazy(() => import('pages/ai/cases/[folderId]')));
// NOVO: AI > Listar Casos (lista completa)
const ListCasesPage = Loadable(lazy(() => import('pages/ai/list-cases')));
// NOVO: AI > Editar Caso
const EditCasePage = Loadable(lazy(() => import('pages/ai/cases/[id]/edit')));
// NOVO: Configurações da Conta
const AccountSettings = Loadable(lazy(() => import('pages/account')));
// NOVO: Página de Boas-Vindas
const WelcomePage = Loadable(lazy(() => import('pages/welcome')));

// NOVO: Colaboradores
const UsersPage = Loadable(lazy(() => import('pages/users')));
const SensitiveFieldsPage = Loadable(lazy(() => import('pages/sensitive-fields')));
// NOVO: Funções (roles)
const RolesPage = Loadable(lazy(() => import('pages/roles')));
// NOVO: Departamentos
const DepartmentsPage = Loadable(lazy(() => import('pages/departments')));

// NOVO: Empresa
const CompanyPage = Loadable(lazy(() => import('pages/company')));

// NOVO: Clientes
const ClientsPage = Loadable(lazy(() => import('pages/clients')));
const NewClientPage = Loadable(lazy(() => import('pages/clients/new')));
const ClientDetailsPage = Loadable(lazy(() => import('pages/clients/[id]')));
const EditClientPage = Loadable(lazy(() => import('pages/clients/[id]/edit')));

// NOVO: Bloqueios de Conta
const AccountBlocksPage = Loadable(lazy(() => import('pages/security/account-blocks')));

// NOVO: Dashboard
const DashboardPage = Loadable(lazy(() => import('pages/dashboard')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        {
          index: true,
          element: <WelcomePage />
        },
        {
          path: 'welcome',
          element: <WelcomePage />
        },
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
          path: 'dashboard',
          element: <DashboardPage />
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
          path: 'clients',
          element: <ClientsPage />
        },
        {
          path: 'clients/new',
          element: <NewClientPage />
        },
        {
          path: 'clients/:id',
          element: <ClientDetailsPage />
        },
        {
          path: 'clients/:id/edit',
          element: <EditClientPage />
        },
        {
          path: 'sensitive-fields',
          element: <SensitiveFieldsPage />
        },
        // Inteligência Artificial
        {
          path: 'ai/cases/create',
          element: <CreateCasePage />
        },
        {
          path: 'ai/cases/:id/edit',
          element: <EditCasePage />
        },
        {
          path: 'ai/cases/:folderId',
          element: <CasesFolderPage />
        },
        {
          path: 'ai/cases',
          element: <CasesPage />
        },
        {
          path: 'ai/list-cases',
          element: <ListCasesPage />
        },
        {
          path: 'ai/pieces',
          element: <AIPiecesPage />
        },
        {
          path: 'ai/rules',
          element: <AIRulesPage />
        },
        {
          path: 'ai/topics',
          element: <AITopicsPage />
        },
        {
          path: 'ai/topic-specifics',
          element: <AITopicSpecificsPage />
        },
        {
          path: 'ai/usage',
          element: <AIUsagePage />
        },
        {
          path: 'ai/transcribe',
          element: <AITranscribePage />
        },
        {
          path: 'ai/transcribe/:folderId',
          element: <TranscriptionFolderPage />
        },
        {
          path: 'ai/reports',
          element: <ReportsPage />
        },
        {
          path: 'ai/reports/:folderId',
          element: <ReportsFolderPage />
        },
        {
          path: 'ai/reports/:customerId/:reportId/edit',
          element: <EditReportPage />
        },
        {
          path: 'ai/reports/provisionamento',
          element: <ProvisionamentoReportPage />
        },
        {
          path: 'ai/reports/pre-audiencia',
          element: <PreAudienciaReportPage />
        },
        {
          path: 'ai/reports/pos-audiencia',
          element: <PosAudienciaReportPage />
        },
        {
          path: 'ai/reports/decisoes',
          element: <DecisoesReportPage />
        },
        {
          path: 'ai/reports/processual',
          element: <ProcessualReportPage />
        },
        {
          path: 'ai/prompts',
          element: <PromptsPage />
        },
        {
          path: 'ai/prompts/:folderId',
          element: <PromptsFolderPage />
        },
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
