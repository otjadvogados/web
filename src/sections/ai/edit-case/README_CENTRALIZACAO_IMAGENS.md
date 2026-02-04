# Centralização Automática de Imagens no CKEditor

## Problema Identificado

As imagens não estavam sendo centralizadas automaticamente no CKEditor, especialmente quando o conteúdo HTML era carregado de uma fonte externa (como um arquivo ou API).

## Causa Raiz

1. O CSS para centralização dependia de uma estrutura HTML específica (`figure.image`)
2. O processamento de centralização acontecia antes do conteúdo estar totalmente carregado no editor
3. Não havia monitoramento contínuo para garantir que novas imagens ou mudanças de conteúdo mantivessem a centralização

## Solução Implementada

### 1. CSS Aprimorado (`ckeditor-shield.css`)

Adicionamos estilos CSS mais abrangentes que garantem a centralização de **todas** as imagens, independentemente da estrutura HTML:

```css
/* Centraliza TODAS as imagens, mesmo sem figure */
.otj-ckeditor .ck-content img {
  display: block !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

/* Garante que parágrafos com imagens também centralizem */
.otj-ckeditor .ck-content p img {
  display: block !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
```

### 2. Processamento JavaScript Multi-camada

Implementamos três estratégias simultâneas para garantir a centralização:

#### A. Processamento no `onReady` (múltiplos timeouts)
```javascript
// Executa em 100ms, 300ms, 500ms e 1000ms após o editor estar pronto
setTimeout(processImagesWithDelay, 100);
setTimeout(processImagesWithDelay, 300);
setTimeout(processImagesWithDelay, 500);
setTimeout(processImagesWithDelay, 1000);
```

**Por quê?** O conteúdo pode levar diferentes tempos para carregar dependendo do tamanho, velocidade da rede, etc.

#### B. Listener no Modelo do Editor
```javascript
editor.model.document.on('change:data', centerImagesOnChange);
```

**Por quê?** Garante que sempre que o conteúdo do editor mudar (inserção de imagens, colar conteúdo, etc.), as imagens sejam centralizadas.

#### C. Processamento no `onChange`
```javascript
onChange={(_, editor) => {
  // ... processa e centraliza imagens
}}
```

**Por quê?** Garante centralização quando o usuário edita o conteúdo.

#### D. Processamento quando HTML é atualizado externamente
```javascript
useEffect(() => {
  // ... quando html prop mudar, centraliza imagens
}, [html]);
```

**Por quê?** Garante centralização quando o conteúdo é atualizado por uma fonte externa (como carregar um novo documento).

### 3. Função de Centralização

A função `centerAllImages` implementa dois métodos de centralização:

1. **Para imagens dentro de `<figure>`**: Adiciona a classe `image-style-align-center`
2. **Para imagens soltas**: Aplica estilos inline `display: block; margin: auto`

```javascript
const centerAllImages = (container: HTMLElement) => {
  // Processa figures
  const figures = container.querySelectorAll('figure.image');
  figures.forEach((figure) => {
    if (!figure.classList.contains('image-style-align-center') && 
        !figure.classList.contains('image-style-block')) {
      figure.classList.add('image-style-align-center');
    }
  });

  // Processa imagens soltas
  const images = container.querySelectorAll('img');
  images.forEach((img) => {
    const parentFigure = img.closest('figure.image');
    if (!parentFigure) {
      const imgElement = img as HTMLElement;
      imgElement.style.display = 'block';
      imgElement.style.marginLeft = 'auto';
      imgElement.style.marginRight = 'auto';
    }
  });
};
```

## Arquivos Modificados

1. **`HtmlEditor.tsx`**:
   - Adicionada função `centerAllImages`
   - Múltiplos timeouts no `onReady`
   - Listener de mudanças no modelo do editor
   - Centralização no `onChange`
   - Centralização no `useEffect` de sincronização

2. **`ckeditor-shield.css`**:
   - CSS adicional para centralizar todas as imagens
   - CSS para imagens dentro de parágrafos

## Resultado

- ✅ Imagens são centralizadas automaticamente ao carregar o editor
- ✅ Imagens mantêm centralização quando o conteúdo é editado
- ✅ Novas imagens inseridas são centralizadas automaticamente
- ✅ Imagens coladas de outras fontes são centralizadas
- ✅ Funciona independentemente da estrutura HTML original
- ✅ Funciona mesmo com diferentes tempos de carregamento

## Testes Recomendados

1. Carregar um documento com imagens existentes
2. Inserir novas imagens via botão "Upload Image"
3. Colar conteúdo com imagens de outras fontes
4. Verificar centralização após salvar e recarregar
5. Testar com documentos grandes (carregamento mais lento)
