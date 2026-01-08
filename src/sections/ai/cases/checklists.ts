import type { ChecklistSection } from 'components/CaseChecklistDialog';

/**
 * Checklist Swift Soft Inicial - exibido ao iniciar um novo caso
 */
export function getInitialChecklist(): ChecklistSection[] {
  return [
    {
      id: 'phase1',
      title: '1.1 Primeira Fase: Conferir conteúdo e pedidos da inicial',
      defaultExpanded: true,
      description: 'Neste momento nos limitaremos a enviar as pretensões e indicar à IA que são dados/fatos/documentos a serem impugnados.',
      items: [
        {
          id: 'check-initial-content',
          label: 'Conferir conteúdo e pedidos da inicial',
          required: true,
          checked: false,
          description: 'Incluindo a íntegra do processo até o momento da defesa'
        },
        {
          id: 'check-pretensions',
          label: 'Enviar pretensões',
          required: true,
          checked: false
        },
        {
          id: 'check-impugn-data',
          label: 'Indicar à IA que são dados/fatos/documentos a serem impugnados',
          required: true,
          checked: false
        }
      ]
    },
    {
      id: 'phase2',
      title: '1.2 Segunda Fase: Verificar documentos disponibilizados pelo cliente',
      defaultExpanded: true,
      description: 'Neste momento, a IA deve compreender que estes documentos são anexados para fins de subsidiar a defesa; ou seja, não deve impugná-los, mas utilizá-los como meio de prova e de contraponto à primeira leva de documentos.',
      items: [
        {
          id: 'check-docs-correspond',
          label: 'Verificar se os documentos correspondem aos pedidos',
          required: true,
          checked: false
        },
        {
          id: 'check-docs-list',
          label: 'Verificar documentos disponibilizados',
          required: true,
          checked: false,
          description: 'Confirmar que os seguintes documentos estão disponíveis:',
          subItems: [
            {
              id: 'doc-contract',
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
              label: 'TRCT - TQRCT - Comprovante de pagamento',
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
              id: 'doc-medical-certificates',
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
              id: 'doc-agreements',
              label: 'Acordo de prorrogação e/ou compensação e/ou banco de horas',
              required: false,
              checked: false
            },
            {
              id: 'doc-ctps',
              label: 'Atualização de CTPS / ficha atualizada',
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
              id: 'doc-bank-proof',
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
              id: 'doc-outsourcing',
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
      id: 'info-check',
      title: 'Conferência de Informações',
      defaultExpanded: true,
      description: 'Verificar se todas as inclusões referentes ao caso concreto estão corretas',
      items: [
        {
          id: 'check-customer',
          label: 'Cliente selecionado',
          required: true,
          checked: hasCustomer,
          description: hasCustomer ? 'Cliente selecionado corretamente' : 'Selecione um cliente'
        },
        {
          id: 'check-matriz-filial',
          label: 'Matriz/filial',
          required: true,
          checked: hasMatrizFilial,
          description: hasMatrizFilial ? 'Matriz/filial configurada corretamente' : 'Configure a matriz/filial'
        },
        {
          id: 'check-topics',
          label: 'Tópicos',
          required: true,
          checked: hasTopics,
          description: hasTopics ? 'Tópicos selecionados corretamente' : 'Selecione pelo menos um tópico'
        },
        {
          id: 'check-specs',
          label: 'Tópicos Específicos',
          required: true,
          checked: hasSpecs,
          description: hasSpecs ? 'Tópicos específicos selecionados corretamente' : 'Selecione pelo menos um tópico específico'
        }
      ]
    }
  ];
}

/**
 * Checklist de Conferência da Peça - exibido antes de gerar o caso
 */
export function getPieceChecklist(
  hasCustomer: boolean = false,
  customerName?: string | null,
  hasAttachments: boolean = false,
  attachmentsCount: number = 0
): ChecklistSection[] {
  return [
    {
      id: 'customer-standard',
      title: 'Padrão do Cliente',
      defaultExpanded: true,
      description: 'Verificar se o modelo de peça segue o padrão específico do cliente',
      items: [
        {
          id: 'check-customer-standard',
          label: 'Conferência se o modelo de peça segue o padrão do cliente',
          required: true,
          checked: false,
          description: hasCustomer && customerName
            ? `Verificar conformidade com o padrão do cliente: ${customerName} (ex.: Atacadão, Carrefour, Mufato)`
            : hasCustomer
            ? 'Verificar conformidade com o padrão do cliente selecionado'
            : 'Selecione um cliente para validar o padrão da peça'
        }
      ]
    },
    {
      id: 'security',
      title: 'Segurança da Informação',
      defaultExpanded: true,
      description: 'Garantir que a peça não contenha dados sensíveis expostos indevidamente',
      items: [
        {
          id: 'check-sensitive-data',
          label: 'Garantir que a peça não contenha dados sensíveis expostos indevidamente',
          required: true,
          checked: false,
          description: 'Verificar ausência de CPF, CNPJ, senhas, informações bancárias ou outros dados sensíveis expostos indevidamente na peça'
        }
      ]
    },
    {
      id: 'proofs-documents',
      title: 'Controle de Provas e Documentos',
      defaultExpanded: true,
      description: 'Confirmação de que foram anexadas as provas/documentos corretos',
      items: [
        {
          id: 'check-proofs-attached',
          label: 'Confirmação de que foram anexadas as provas/documentos corretos',
          required: true,
          checked: hasAttachments,
          description: hasAttachments
            ? `${attachmentsCount} anexo(s) encontrado(s). Verificar se são os documentos corretos (prints, laudos, cálculos)`
            : 'Nenhum anexo encontrado. Verificar se as provas necessárias foram anexadas (prints, laudos, cálculos)'
        },
        {
          id: 'check-proof-placeholders',
          label: 'Identificação de espaços reservados para colagem de provas',
          required: false,
          checked: false,
          description: 'Quando aplicável, verificar se há espaços reservados no documento para colagem de provas'
        }
      ]
    },
    {
      id: 'placeholders',
      title: 'Placeholders',
      defaultExpanded: true,
      items: [
        {
          id: 'check-placeholder-vara',
          label: 'Vara',
          required: true,
          checked: false
        },
        {
          id: 'check-placeholder-process-number',
          label: 'Número do processo',
          required: true,
          checked: false
        },
        {
          id: 'check-placeholder-parties',
          label: 'Nome das partes (cliente)',
          required: true,
          checked: false
        },
        {
          id: 'check-placeholder-matriz-filial',
          label: 'Matriz/filial',
          required: true,
          checked: false
        },
        {
          id: 'check-placeholder-signatures',
          label: 'Assinaturas',
          required: true,
          checked: false
        },
        {
          id: 'check-placeholder-timbre',
          label: 'Timbre',
          required: true,
          checked: false
        },
        {
          id: 'check-placeholder-abnt',
          label: 'Normas da ABNT',
          required: true,
          checked: false
        }
      ]
    },
    {
      id: 'contract-data',
      title: 'Dados do Contrato',
      defaultExpanded: true,
      items: [
        {
          id: 'check-contract-admission',
          label: 'Admissão/demissão (incluir modalidade)',
          required: true,
          checked: false
        },
        {
          id: 'check-contract-function',
          label: 'Função (histórico funcional)',
          required: true,
          checked: false
        },
        {
          id: 'check-contract-salary',
          label: 'Último salário',
          required: true,
          checked: false
        }
      ]
    },
    {
      id: 'preliminaries',
      title: 'Preliminares',
      defaultExpanded: true,
      items: [
        {
          id: 'check-prelim-prescription',
          label: 'Prescrição',
          required: false,
          checked: false
        },
        {
          id: 'check-prelim-ineptia',
          label: 'Inépcias',
          required: false,
          checked: false
        },
        {
          id: 'check-prelim-value-limit',
          label: 'Limitação de valores (obrigatório)',
          required: true,
          checked: false
        },
        {
          id: 'check-prelim-illegitimacy',
          label: 'Ilegitimidade',
          required: false,
          checked: false
        },
        {
          id: 'check-prelim-litispendence',
          label: 'Litispendência',
          required: false,
          checked: false
        },
        {
          id: 'check-prelim-res-judicata',
          label: 'Coisa julgada',
          required: false,
          checked: false
        }
      ]
    },
    {
      id: 'requests',
      title: 'Pedidos',
      defaultExpanded: true,
      items: [
        {
          id: 'check-requests-order',
          label: 'Conforme documento de ordem de tópicos',
          required: true,
          checked: false
        }
      ]
    },
    {
      id: 'impugnations',
      title: 'Impugnações',
      defaultExpanded: true,
      items: [
        {
          id: 'check-impugn-all-topics',
          label: 'Impugnação de todos os tópicos (principais e subsidiários/alternativos/eventuais)',
          required: true,
          checked: false
        },
        {
          id: 'check-impugn-mandatory-topics',
          label: 'Presença de todos os tópicos obrigatórios',
          required: true,
          checked: false
        },
        {
          id: 'check-impugn-documents',
          label: 'Impugnação a documentos juntados no processo',
          required: true,
          checked: false,
          description: 'Documentos juntados no PJe Mídias deverão ser impugnados pelo próprio advogado. Verificar se IA consegue impugnar imagens.'
        }
      ]
    }
  ];
}

