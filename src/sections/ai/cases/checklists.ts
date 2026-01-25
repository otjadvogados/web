import type { ChecklistSection } from 'components/CaseChecklistDialog';

/**
 * Checklist  Inicial - exibido ao iniciar um novo caso
 */
export function getInitialChecklist(): ChecklistSection[] {
  return [
    {
      id: 'phase1-content',
      title: '1.1 Primeira fase: Conferir conteúdo e pedidos da inicial',
      defaultExpanded: true,
      collapsible: true,
      items: [
        {
          id: 'phase1-initial-content',
          label: 'Conferir conteúdo e pedidos da inicial (incluindo a íntegra do processo até o momento da defesa)',
          required: false,
          checked: false
        }
      ]
    },
    {
      id: 'phase2-documents',
      title: '1.2 Segunda fase: Verificar os documentos disponibilizados pelo cliente e se correspondem aos pedidos',
      defaultExpanded: true,
      collapsible: true,
      items: [
        {
          id: 'doc-contract-work',
          label: 'Contrato de trabalho e aditivos',
          required: false,
          checked: false
        },
        {
          id: 'doc-contract-extension',
          label: 'Prorrogação de contrato de trabalho',
          required: false,
          checked: false
        },
        {
          id: 'doc-aso',
          label: 'ASO (aso, exame admissional, exame demissional)',
          required: false,
          checked: false
        },
        {
          id: 'doc-payslips',
          label: 'Holerites',
          required: false,
          checked: false
        },
        {
          id: 'doc-time-control',
          label: 'Controle de jornada',
          required: false,
          checked: false
        },
        {
          id: 'doc-trct',
          label: 'TRCT- TQRCT- Comprovante de pagamento',
          required: false,
          checked: false
        },
        {
          id: 'doc-warnings',
          label: 'Advertência e suspensão',
          required: false,
          checked: false
        },
        {
          id: 'doc-certificates',
          label: 'Atestados',
          required: false,
          checked: false
        },
        {
          id: 'doc-work-accident',
          label: 'Docs de acidentes de trabalho (CAT, afastamento etc)',
          required: false,
          checked: false
        },
        {
          id: 'doc-just-cause',
          label: 'Justa Causa (sindicância, aviso de JC, penalidades)',
          required: false,
          checked: false
        },
        {
          id: 'doc-schedule-agreement',
          label: 'Acordo de prorrogação e/ou compensação e/ou banco de horas',
          required: false,
          checked: false
        },
        {
          id: 'doc-ctps',
          label: 'Atualização de CTPS/ ficha atualizada',
          required: false,
          checked: false
        },
        {
          id: 'doc-employee-record',
          label: 'Ficha de Registro de Empregado',
          required: false,
          checked: false
        },
        {
          id: 'doc-fgts',
          label: 'Extrato Analítico do FGTS',
          required: false,
          checked: false
        },
        {
          id: 'doc-bank-statement',
          label: 'Comprovante Bancário',
          required: false,
          checked: false
        },
        {
          id: 'doc-transport-voucher',
          label: 'Extrato do Vale Transporte',
          required: false,
          checked: false
        },
        {
          id: 'doc-outsourcing-contract',
          label: 'Contrato com a terceirizada, quando for o caso',
          required: false,
          checked: false
        },
        {
          id: 'doc-ppp',
          label: 'PPP',
          required: false,
          checked: false
        },
        {
          id: 'doc-pcmso',
          label: 'PCMSO',
          required: false,
          checked: false
        },
        {
          id: 'doc-ppra',
          label: 'PPRA',
          required: false,
          checked: false
        },
        {
          id: 'doc-ltcat',
          label: 'LTCAT',
          required: false,
          checked: false
        },
        {
          id: 'doc-epi',
          label: 'Fichas/Recibo de entrega de EPI\'s',
          required: false,
          checked: false
        }
      ]
    }
  ];
}

/**
 * Checklist de Conferência de Informações - exibido antes de gerar o caso
 */
export function getInfoChecklist(
  hasCustomer: boolean,
  hasMatrizFilial: boolean,
  hasTopics: boolean,
  hasSpecs: boolean
): ChecklistSection[] {
  return [
    {
      id: 'case-data',
      title: '1. DADOS DO CASO',
      defaultExpanded: true,
      collapsible: true,
      items: [
        {
          id: 'check-customer',
          label: 'Cliente correto',
          required: false,
          checked: hasCustomer
        },
        {
          id: 'check-matriz-filial',
          label: 'Matriz / filial correta',
          required: false,
          checked: hasMatrizFilial
        },
        {
          id: 'check-process',
          label: 'Vara e nº do processo corretos',
          required: false,
          checked: false
        },
        {
          id: 'check-topics-coherent',
          label: 'Tópicos e tópicos específicos coerentes com a inicial',
          required: false,
          checked: hasTopics && hasSpecs
        }
      ]
    }
  ];
}

/**
 * Checklist de Validação - exibido na página de edição do caso
 */
export function getValidationChecklist(): ChecklistSection[] {
  return [
    {
      id: 'information-check',
      title: 'CONFERÊNCIA DE INFORMAÇÕES',
      defaultExpanded: true,
      collapsible: true,
      description: 'Verificar se todas as inclusões referentes ao caso concreto estão corretas, como:',
      items: [
        {
          id: 'check-customer',
          label: 'Cliente selecionado',
          required: false,
          checked: false
        },
        {
          id: 'check-matriz-filial',
          label: 'Matriz/filial',
          required: false,
          checked: false
        },
        {
          id: 'check-topics',
          label: 'Tópicos',
          required: false,
          checked: false
        },
        {
          id: 'check-topic-specifics',
          label: 'Tópicos Específicos',
          required: false,
          checked: false
        }
      ]
    },
    {
      id: 'piece-check',
      title: 'CONFERÊNCIA DA PEÇA',
      defaultExpanded: true,
      collapsible: true,
      description: 'Verificar se todas as inclusões referentes ao caso concreto estão corretas, dentre elas:',
      items: [
        {
          id: 'check-placeholders',
          label: 'Placeholders: Vara, número do processo, nome das partes (cliente), matriz/filial, assinaturas, timbre, normas da ABNT',
          required: false,
          checked: false
        },
        {
          id: 'check-contract-data',
          label: 'Dados do contrato: admissão/demissão (incluir modalidade); função (histórico funcional); último salário',
          required: true,
          checked: false
        },
        {
          id: 'check-preliminaries',
          label: 'Preliminares: prescrição; inépcias; limitação de valores (obrigatório); ilegitimidade; litispendência; coisa julgada',
          required: false,
          checked: false
        },
        {
          id: 'check-requests',
          label: 'Pedidos: conforme documento de ordem de tópicos',
          required: false,
          checked: false
        },
        {
          id: 'check-topics-impugnation',
          label: 'Impugnação de todos os tópicos (principais e subsidiários/alternativos/eventuais)',
          required: false,
          checked: false
        },
        {
          id: 'check-mandatory-topics',
          label: 'Presença de todos os tópicos obrigatórios',
          required: false,
          checked: false
        },
        {
          id: 'check-documents-impugnation',
          label: 'Impugnação a documentos juntados no processo',
          required: false,
          checked: false
        }
      ]
    }
  ];
}

