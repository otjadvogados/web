# Módulo de Casos - Inteligência Artificial

Este módulo implementa a funcionalidade completa de listagem, visualização e edição de casos gerados pela IA.

## Estrutura de Arquivos

### API (`src/api/aiCases.ts`)

Funções implementadas:

- `listCaseResults(query)` - Lista resultados de casos com filtros avançados
  - Suporta paginação (page, pageSize)
  - Busca por texto (search)
  - Filtros: departmentId, pieceId, customerId, customerName
  - Filtros de data: createdFrom, createdTo
  - Tags personalizadas: tags[chave]=valor

- `getCaseResult(id)` - Obtém detalhes completos de um caso específico

- `updateCaseResultHtml(id, payload)` - Edita o HTML e tags de um caso
  - Atualiza HTML
  - Adiciona/atualiza tags personalizadas
  - Opção de merge ou replace de tags

- `deleteCaseResults(ids)` - Exclusão em lote de casos

- `detectPlaceholders(topicSpecificIds)` - Detecta placeholders em tópicos específicos

### Página Principal (`src/pages/ai/list-cases/index.tsx`)

Página completa de listagem de casos com:

- **Filtros avançados:**
  - Busca por nome da peça e HTML
  - Filtro por departamento
  - Filtro por peça
  - Busca por nome do cliente
  - Intervalo de datas (data inicial e final)

- **Funcionalidades:**
  - Listagem paginada com suporte mobile
  - Seleção múltipla de casos
  - Exclusão em lote
  - Visualização de detalhes
  - Edição de HTML

- **Layout responsivo:**
  - Tabela completa em desktop
  - Cards em mobile

### Sections (Componentes Reutilizáveis)

#### `CaseViewDialog.tsx`

Dialog para visualização completa de um caso:
- Informações básicas (peça, departamento, clientes, datas)
- Status dos placeholders (preenchidos e faltantes)
- Tags personalizadas
- Prévia do HTML renderizado
- Código HTML fonte

#### `CaseEditDialog.tsx`

Dialog para edição de um caso:
- Informações do caso (readonly)
- Status dos placeholders
- Editor de HTML (textarea multilinha)
- Gerenciamento de tags personalizadas:
  - Adicionar tags (chave/valor)
  - Remover tags existentes
  - Merge com tags existentes

## Integração no Sistema

### Menu (`src/menu-items/pages.ts`)

Adicionado submenu "Casos" no menu de Inteligência Artificial, posicionado antes de "Criar Caso".

### Rotas (`src/routes/MainRoutes.tsx`)

Rota adicionada: `/ai/cases` → `ListCasesPage`

## Tipos TypeScript

```typescript
type CaseResult = {
  id: string;
  runId: string | null;
  departmentId: string;
  pieceId: string;
  customerIds: string[];
  html: string;
  infos: Record<string, any>;
  placeholders: string[];
  replacedKeys: string[];
  missingKeys: string[];
  tags: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Relacionamentos
  department?: { id: string; name: string };
  piece?: { id: string; name: string };
  customers?: Array<{ id: string; name: string; displayName?: string }>;
};
```

## Exemplos de Uso da API

```typescript
// Listar casos com filtros
const resultado = await listCaseResults({
  page: 1,
  pageSize: 10,
  search: 'contrato',
  departmentId: 'uuid-depto',
  pieceId: 'uuid-peca',
  customerName: 'João Silva',
  createdFrom: '2024-01-01',
  createdTo: '2024-12-31',
  tags: {
    status: 'revisado',
    urgente: 'true'
  }
});

// Obter caso específico
const caso = await getCaseResult('uuid-caso');

// Editar HTML
await updateCaseResultHtml('uuid-caso', {
  html: '<html>novo conteúdo</html>',
  tags: { status: 'revisado', aprovado: true },
  replaceTags: false // merge com tags existentes
});

// Excluir em lote
await deleteCaseResults(['uuid1', 'uuid2', 'uuid3']);
```

## Features Implementadas

✅ Listagem paginada de casos
✅ Filtros avançados (busca, departamento, peça, cliente, datas)
✅ Seleção múltipla e exclusão em lote
✅ Visualização completa de casos
✅ Edição de HTML e tags
✅ Layout responsivo (desktop e mobile)
✅ Integração com menu e rotas
✅ Tratamento de erros
✅ Feedback visual (snackbars)
✅ Estados de loading

## Próximos Passos (Sugestões)

- [ ] Exportação de casos (PDF, DOCX)
- [ ] Impressão de casos
- [ ] Histórico de alterações
- [ ] Busca avançada com query builder
- [ ] Filtros salvos/favoritos
- [ ] Visualização em modo de pré-visualização (preview mode)
- [ ] Editor de HTML WYSIWYG


