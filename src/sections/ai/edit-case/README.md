# Editor de Casos com Chat IA

Esta seção contém os componentes para editar casos com um editor tipo Word e um chat lateral inteligente.

## Componentes

### HtmlEditor.tsx
Editor de HTML visual que imita a experiência de um processador de texto como Microsoft Word.

**Recursos:**
- Editor contentEditable com formatação visual
- Layout de página A4
- Estilos tipográficos para parágrafos, títulos, listas
- Modo de edição ativável/desativável

### ChatPanel.tsx
Painel de chat lateral redimensionável para interação com IA durante a edição.

**Recursos:**
- Pode ser aberto e fechado
- Largura ajustável arrastando a borda esquerda
- Histórico de mensagens
- Interface de chat intuitiva
- Integração pronta para API de IA (necessita implementação)

## Uso

A página principal está em `/src/pages/ai/cases/[id]/edit.tsx`.

Para acessar:
1. Na lista de casos, clique em "Editar" em qualquer caso
2. Será redirecionado para `/ai/cases/{id}/edit`
3. Use o botão "Abrir Chat" para mostrar/ocultar o painel lateral
4. Redimensione o chat arrastando a borda esquerda
5. Edite o documento diretamente no editor
6. Clique em "Salvar" para persistir as alterações

## Integração com API de IA

O método `handleSend` no `ChatPanel.tsx` contém uma simulação da resposta da IA.
Substitua por uma chamada real à sua API de IA:

```typescript
const handleSend = async () => {
  // ... código existente ...
  
  // TODO: Substituir por chamada real da API
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: input, context: html })
  });
  const data = await response.json();
  
  // ... processar resposta ...
};
```

## Melhorias Futuras

- Adicionar barra de ferramentas de formatação (negrito, itálico, etc.)
- Implementar sugestões de edição da IA diretamente no documento
- Histórico de versões/desfazer
- Exportação para PDF
- Colaboração em tempo real
