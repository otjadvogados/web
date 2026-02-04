# Funcionalidade de Exportação para PDF no CKEditor

## Visão Geral

Foi adicionado um botão de exportação para PDF diretamente na toolbar do CKEditor, permitindo que os usuários baixem o conteúdo do editor como PDF com um único clique.

## Arquivos Criados/Modificados

### Novos Arquivos:
- `ExportToPdfPlugin.ts` - Plugin customizado do CKEditor5 para exportação de PDF

### Arquivos Modificados:
- `HtmlEditor.tsx` - Integração do plugin na configuração do CKEditor

## Dependências Instaladas

```bash
npm install html2pdf.js
npm install --save-dev @types/html2pdf.js
```

## Funcionalidades

- **Botão na Toolbar**: Um novo botão "Baixar PDF" foi adicionado no final da toolbar do CKEditor
- **Exportação Automática**: Ao clicar no botão, o conteúdo do editor é automaticamente convertido em PDF e baixado
- **Configurações do PDF**:
  - Formato: A4
  - Orientação: Retrato
  - Margens: 10mm em todos os lados
  - Qualidade de imagem: 98%
  - Escala: 2x (para melhor resolução)
  - Suporte a CORS para imagens

## Como Usar

1. Abra qualquer página que utilize o `HtmlEditor` (ex: edição de casos, relatórios)
2. Edite o conteúdo no editor
3. Clique no botão "Baixar PDF" na toolbar (último botão à direita)
4. O PDF será gerado e baixado automaticamente com o nome `documento-[timestamp].pdf`

## Estilo do PDF

O PDF gerado mantém:
- Fonte padrão: Calibri, Arial, sans-serif
- Tamanho da fonte: 11pt
- Espaçamento entre linhas: 1.5
- Cor do texto: Preto
- Fundo: Branco
- Padding interno: 40px

## Tratamento de Erros

Se houver algum erro durante a geração do PDF, uma mensagem de alerta será exibida ao usuário solicitando que tente novamente.

## Notas Técnicas

- O plugin utiliza a biblioteca `html2pdf.js` para conversão
- O conteúdo HTML do editor é processado antes da exportação
- Imagens são processadas com CORS habilitado
- A geração do PDF é feita no lado do cliente (navegador)
