import type { ChecklistSection } from 'components/CaseChecklistDialog';

/**
 * Checklist  Inicial - exibido ao iniciar um novo caso
 */
export function getInitialChecklist(): ChecklistSection[] {
  return [
    {
      id: 'phase1-analysis',
      title: ' ANÁLISE DA INICIAL E DO PROCESSO',
      defaultExpanded: true,
      collapsible: true,
      items: [
        {
          id: 'phase1-petition',
          label: 'Conferência da Petição Inicial',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'petition-full-reading',
              label: 'Leitura integral da petição inicial',
              required: false,
              checked: false
            },
            {
              id: 'petition-requests',
              label: 'Identificação clara dos pedidos formulados',
              required: false,
              checked: false
            },
            {
              id: 'petition-cause',
              label: 'Identificação da causa de pedir (fatos e fundamentos jurídicos)',
              required: false,
              checked: false
            },
            {
              id: 'petition-implicit',
              label: 'Verificação de pedidos implícitos ou cumulativos',
              required: false,
              checked: false
            },
            {
              id: 'petition-values',
              label: 'Conferência de valores atribuídos aos pedidos (se houver)',
              required: false,
              checked: false
            }
          ]
        },
        {
          id: 'phase1-process',
          label: 'Análise do Processo até o Momento da Defesa',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'process-full-review',
              label: 'Conferir a íntegra do processo até a data atual',
              required: false,
              checked: false
            },
            {
              id: 'process-author-docs',
              label: 'Verificar documentos já juntados pela parte autora',
              required: false,
              checked: false
            },
            {
              id: 'process-decisions',
              label: 'Conferir decisões/interlocutórias já proferidas',
              required: false,
              checked: false
            },
            {
              id: 'process-deadlines',
              label: 'Identificar prazos processuais relevantes',
              required: false,
              checked: false
            },
            {
              id: 'process-preliminaries',
              label: 'Verificar eventuais preliminares já levantadas',
              required: false,
              checked: false
            }
          ]
        }
      ]
    },
    {
      id: 'phase2-validation',
      title: 'DOCUMENTOS DO CLIENTE',
      defaultExpanded: true,
      collapsible: true,
      items: [
        {
          id: 'phase2-general',
          label: 'Validação Geral',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'validation-complete',
              label: 'Conferir se os documentos entregues pelo cliente estão completos',
              required: false,
              checked: false
            },
            {
              id: 'validation-correspond',
              label: 'Verificar se os documentos correspondem aos pedidos da inicial',
              required: false,
              checked: false
            },
            {
              id: 'validation-missing',
              label: 'Identificar documentos faltantes ou inconsistentes',
              required: false,
              checked: false
            },
            {
              id: 'validation-dates',
              label: 'Conferir datas, assinaturas e validade formal',
              required: false,
              checked: false
            },
            {
              id: 'validation-coherence',
              label: 'Verificar coerência entre documentos (ex.: jornada × holerite)',
              required: false,
              checked: false
            }
          ]
        }
      ]
    },
    {
      id: 'basic-labor-docs',
      title: 'DOCUMENTOS TRABALHISTAS BÁSICOS',
      defaultExpanded: true,
      collapsible: true,
      items: [
        {
          id: 'basic-contract',
          label: 'Contrato e Vínculo',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'contract-work',
              label: 'Contrato de trabalho',
              required: false,
              checked: false
            },
            {
              id: 'contract-additives',
              label: 'Aditivos contratuais',
              required: false,
              checked: false
            },
            {
              id: 'contract-extension',
              label: 'Prorrogação de contrato de trabalho',
              required: false,
              checked: false
            },
            {
              id: 'contract-ctps',
              label: 'Atualização da CTPS / ficha atualizada',
              required: false,
              checked: false
            },
            {
              id: 'contract-employee-record',
              label: 'Ficha de Registro de Empregado',
              required: false,
              checked: false
            }
          ]
        },
        {
          id: 'basic-health',
          label: 'Saúde Ocupacional',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'health-aso-admission',
              label: 'ASO admissional',
              required: false,
              checked: false
            },
            {
              id: 'health-aso-periodic',
              label: 'ASO periódico (se houver)',
              required: false,
              checked: false
            },
            {
              id: 'health-aso-dismissal',
              label: 'ASO demissional',
              required: false,
              checked: false
            },
            {
              id: 'health-complementary',
              label: 'Exames médicos complementares (se aplicável)',
              required: false,
              checked: false
            }
          ]
        },
        {
          id: 'basic-payment',
          label: 'Remuneração e Pagamentos',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'payment-payslips',
              label: 'Holerites / contracheques',
              required: false,
              checked: false
            },
            {
              id: 'payment-trct',
              label: 'TRCT',
              required: false,
              checked: false
            },
            {
              id: 'payment-tqrct',
              label: 'TQRCT',
              required: false,
              checked: false
            },
            {
              id: 'payment-severance',
              label: 'Comprovantes de pagamento das verbas rescisórias',
              required: false,
              checked: false
            },
            {
              id: 'payment-bank',
              label: 'Comprovantes bancários de pagamento de salário',
              required: false,
              checked: false
            }
          ]
        },
        {
          id: 'basic-workday',
          label: 'Jornada de Trabalho',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'workday-control',
              label: 'Controle de jornada (cartão ponto/manual/eletrônico)',
              required: false,
              checked: false
            },
            {
              id: 'workday-extension',
              label: 'Acordo de prorrogação de jornada',
              required: false,
              checked: false
            },
            {
              id: 'workday-compensation',
              label: 'Acordo de compensação',
              required: false,
              checked: false
            },
            {
              id: 'workday-hours-bank',
              label: 'Banco de horas (acordo + controles)',
              required: false,
              checked: false
            }
          ]
        }
      ]
    },
    {
      id: 'discipline-occurrences',
      title: 'DISCIPLINA E OCORRÊNCIAS',
      defaultExpanded: true,
      collapsible: true,
      items: [
        {
          id: 'discipline-penalties',
          label: 'Penalidades',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'penalties-warnings',
              label: 'Advertências',
              required: false,
              checked: false
            },
            {
              id: 'penalties-suspensions',
              label: 'Suspensões',
              required: false,
              checked: false
            },
            {
              id: 'penalties-just-cause',
              label: 'Justa causa:',
              required: false,
              checked: false
            },
            {
              id: 'penalties-investigation',
              label: 'Sindicância',
              required: false,
              checked: false
            },
            {
              id: 'penalties-notice',
              label: 'Aviso de justa causa',
              required: false,
              checked: false
            },
            {
              id: 'penalties-history',
              label: 'Histórico de penalidades anteriores',
              required: false,
              checked: false
            }
          ]
        },
        {
          id: 'discipline-certificates',
          label: 'Atestados e Afastamentos',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'certificates-medical',
              label: 'Atestados médicos',
              required: false,
              checked: false
            },
            {
              id: 'certificates-social-security',
              label: 'Afastamentos previdenciários (se houver)',
              required: false,
              checked: false
            }
          ]
        },
        {
          id: 'discipline-accident',
          label: 'Acidente de Trabalho',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'accident-cat',
              label: 'CAT',
              required: false,
              checked: false
            },
            {
              id: 'accident-leave',
              label: 'Documentos de afastamento',
              required: false,
              checked: false
            },
            {
              id: 'accident-inss',
              label: 'Comunicação ao INSS (se aplicável)',
              required: false,
              checked: false
            }
          ]
        }
      ]
    },
    {
      id: 'benefits-charges',
      title: 'BENEFÍCIOS E ENCARGOS',
      defaultExpanded: true,
      collapsible: true,
      items: [
        {
          id: 'benefits-fgts',
          label: 'FGTS e Benefícios',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'fgts-analytical',
              label: 'Extrato Analítico do FGTS',
              required: false,
              checked: false
            },
            {
              id: 'fgts-transport',
              label: 'Extrato do Vale Transporte',
              required: false,
              checked: false
            },
            {
              id: 'fgts-others',
              label: 'Outros benefícios previstos em contrato ou norma coletiva',
              required: false,
              checked: false
            }
          ]
        }
      ]
    },
    {
      id: 'specific-docs',
      title: 'DOCUMENTOS ESPECÍFICOS (QUANDO APLICÁVEL)',
      defaultExpanded: true,
      collapsible: true,
      items: [
        {
          id: 'specific-outsourcing',
          label: 'Terceirização',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'outsourcing-contract',
              label: 'Contrato com a empresa terceirizada',
              required: false,
              checked: false
            },
            {
              id: 'outsourcing-supervision',
              label: 'Comprovação de fiscalização do contrato (se houver)',
              required: false,
              checked: false
            }
          ]
        },
        {
          id: 'specific-safety',
          label: 'Segurança e Saúde do Trabalho',
          required: false,
          checked: false,
          subItems: [
            {
              id: 'safety-ppp',
              label: 'PPP',
              required: false,
              checked: false
            },
            {
              id: 'safety-pcmso',
              label: 'PCMSO',
              required: false,
              checked: false
            },
            {
              id: 'safety-ppra',
              label: 'PPRA',
              required: false,
              checked: false
            },
            {
              id: 'safety-ltcat',
              label: 'LTCAT',
              required: false,
              checked: false
            },
            {
              id: 'safety-epi',
              label: 'Fichas/recibos de entrega de EPI',
              required: false,
              checked: false
            },
            {
              id: 'safety-training',
              label: 'Treinamentos de segurança (se houver)',
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

