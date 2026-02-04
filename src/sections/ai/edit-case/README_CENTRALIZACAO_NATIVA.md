# Centralização de Imagens com Comando Nativo do CKEditor

## Visão Geral

Implementação de centralização automática de imagens usando o **comando nativo do CKEditor**, equivalente a clicar no botão "Centered image" da toolbar.

## Por Que Usar o Comando Nativo?

### Antes (CSS/Classes Manuais)
```javascript
// Aplicava classes CSS manualmente
figure.classList.add('image-style-align-center');
img.style.marginLeft = 'auto';
```

**Problemas:**
- ❌ Não integrado com o sistema do CKEditor
- ❌ Não aparece como "selecionado" na UI
- ❌ Pode conflitar com outras operações do editor
- ❌ Não persiste corretamente no HTML gerado

### Agora (Comando Nativo)
```javascript
// Usa o sistema interno do CKEditor
model.change(writer => {
  writer.setAttribute('imageStyle', 'alignCenter', imageElement);
});
```

**Vantagens:**
- ✅ Integrado com o modelo de dados do CKEditor
- ✅ Botão "Centered image" fica selecionado na UI
- ✅ Persiste corretamente no HTML
- ✅ Compatível com undo/redo
- ✅ Funciona como se o usuário clicasse no botão

## Implementação

### Função Principal: `centerAllImagesWithCommand`

```typescript
const centerAllImagesWithCommand = () => {
  try {
    const model = editor.model;
    const root = model.document.getRoot();
    
    if (!root) return;

    const imageElements: any[] = [];

    // Encontra todas as imagens no documento
    model.change(() => {
      for (const item of root.getChildren()) {
        findImages(item, imageElements);
      }

      // Aplica o estilo de centralização usando setAttribute
      imageElements.forEach((imageElement) => {
        if (imageElement.is('element', 'imageBlock') || 
            imageElement.is('element', 'imageInline')) {
          model.change((writer) => {
            writer.setAttribute('imageStyle', 'alignCenter', imageElement);
          });
        }
      });
    });

    console.log(`✅ ${imageElements.length} imagens centralizadas`);
  } catch (error) {
    console.warn('Erro ao centralizar:', error);
    // Fallback para método CSS se necessário
  }
};
```

### Busca Recursiva de Imagens

```typescript
function findImages(item: any, images: any[]) {
  // Verifica se é uma imagem
  if (item.is('element', 'imageBlock') || item.is('element', 'imageInline')) {
    images.push(item);
  }
  
  // Busca recursivamente em filhos
  if (item.is('element') && item.childCount > 0) {
    for (const child of item.getChildren()) {
      findImages(child, images);
    }
  }
}
```

## Tipos de Imagem no CKEditor

O CKEditor 5 usa dois tipos de elementos de imagem:

1. **`imageBlock`**: Imagem em bloco (mais comum)
   - Ocupa uma linha inteira
   - Pode ter legenda
   - Suporta estilos (alignLeft, alignCenter, alignRight)

2. **`imageInline`**: Imagem inline
   - Aparece dentro do texto
   - Flui com o conteúdo textual
   - Suporta menos estilos

## Pontos de Execução

A centralização é executada em **4 momentos críticos**:

### 1. Ao Carregar o Editor (`onReady`)
```typescript
setTimeout(processImagesWithDelay, 100);
setTimeout(processImagesWithDelay, 300);
setTimeout(processImagesWithDelay, 500);
setTimeout(processImagesWithDelay, 1000);
```

### 2. Quando o Conteúdo Muda (`change:data`)
```typescript
editor.model.document.on('change:data', centerImagesOnChange);
```

### 3. Quando HTML é Atualizado Externamente (`useEffect`)
```typescript
useEffect(() => {
  // Quando html prop mudar
  setTimeout(centerImages, 100);
  setTimeout(centerImages, 300);
  setTimeout(centerImages, 500);
}, [html]);
```

### 4. Ao Editar (`onChange`)
```typescript
onChange={(_, editor) => {
  // Processa imagens após edição
}}
```

## Atributos do CKEditor

### Valores Possíveis para `imageStyle`:

- `alignLeft` - Imagem alinhada à esquerda
- `alignCenter` - Imagem centralizada ✅ (usado)
- `alignRight` - Imagem alinhada à direita
- `block` - Imagem em bloco (padrão)
- `inline` - Imagem inline
- `side` - Imagem ao lado do texto

### Como o CKEditor Aplica os Estilos

Quando definimos `imageStyle: 'alignCenter'`, o CKEditor:

1. Adiciona a classe CSS apropriada (`image-style-align-center`)
2. Atualiza o modelo de dados interno
3. Renderiza a visualização com as classes corretas
4. Salva no HTML com a estrutura adequada

Exemplo de HTML gerado:
```html
<figure class="image image-style-align-center">
  <img src="...">
</figure>
```

## Fallback para Segurança

Se o comando nativo falhar (por qualquer razão), há um **fallback automático** que:

1. Aplica classes CSS manualmente
2. Adiciona estilos inline em imagens soltas
3. Garante centralização visual mesmo sem o comando nativo

```typescript
catch (error) {
  console.warn('Erro ao centralizar com comando nativo:', error);
  
  // Fallback: aplica CSS/classes diretamente
  const figures = editableElement.querySelectorAll('figure.image');
  figures.forEach((figure) => {
    figure.classList.add('image-style-align-center');
  });
  
  const images = editableElement.querySelectorAll('img');
  images.forEach((img) => {
    img.style.marginLeft = 'auto';
    img.style.marginRight = 'auto';
  });
}
```

## Logs de Debug

A implementação inclui logs para facilitar o debug:

```typescript
console.log(`✅ ${imageElements.length} imagens centralizadas usando comando nativo do CKEditor`);
```

Verifique o console do navegador para confirmar que as imagens estão sendo processadas.

## Compatibilidade

- ✅ CKEditor 5 (versão 47.3.0+)
- ✅ Funciona com `imageBlock` e `imageInline`
- ✅ Compatível com upload de imagens
- ✅ Compatível com colar conteúdo
- ✅ Compatível com undo/redo
- ✅ Compatível com conversão DOCX → HTML

## Testes Recomendados

1. **Carregamento Inicial**
   - Abrir um caso com imagens existentes
   - Verificar se todas estão centralizadas
   - Verificar console para quantidade processada

2. **Upload de Nova Imagem**
   - Adicionar imagem via botão "Upload"
   - Verificar centralização automática após upload

3. **Colar Conteúdo**
   - Copiar conteúdo com imagens de outro lugar
   - Colar no editor
   - Verificar centralização

4. **Edição Manual**
   - Tentar desalinhar uma imagem
   - Aguardar alguns segundos
   - Verificar se volta a centralizar automaticamente

5. **Salvar e Recarregar**
   - Salvar documento
   - Recarregar página
   - Verificar se imagens continuam centralizadas

## Resolução de Problemas

### Imagens não centralizam
1. Abra o console do navegador
2. Procure por erros ou warnings
3. Verifique os logs de quantidade de imagens processadas
4. Confirme que o timeout está sendo suficiente

### Centralização não persiste
1. Verifique se o HTML está sendo salvo corretamente
2. Confirme que as classes CSS estão presentes no HTML salvo
3. Verifique se não há CSS conflitante sobrescrevendo

### Performance
Se houver muitas imagens e o processamento estiver lento:
1. Aumente os intervalos dos timeouts
2. Considere processar apenas na primeira carga
3. Desabilite o listener `change:data` para documentos grandes

## Arquivos Modificados

- **`HtmlEditor.tsx`**: Implementação do comando nativo
- **`ckeditor-shield.css`**: CSS de suporte (mantido para fallback)
