import { useMemo, useRef, useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { CKEditor } from '@ckeditor/ckeditor5-react';
// ✅ CSS do build "ckeditor5" (mais estável com Vite/Webpack e evita toolbar quebrada)
import 'ckeditor5/ckeditor5.css';
// ✅ Importa traduções do CKEditor
import 'ckeditor5/translations/pt-br.js';
import './HtmlEditor.ck.css';
import { processImagesInElement, createImageObserver } from 'hooks/useApiImageUrls';
import {
  DecoupledEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  List,
  Link,
  BlockQuote,
  Alignment,
  Indent,
  IndentBlock,
  FontFamily,
  FontSize,
  FontColor,
  FontBackgroundColor,
  RemoveFormat,
  HorizontalLine,
  Table,
  TableToolbar,
  GeneralHtmlSupport,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageUpload,
  SimpleUploadAdapter
  // Opção alternativa (Base64 - não recomendado para produção):
  // Base64UploadAdapter
} from 'ckeditor5';
import useConfig from 'hooks/useConfig';
import ExportToPdfPlugin from './ExportToPdfPlugin';

// Observação: o CKEditor 5 não injeta CSS automaticamente em apps React.
// Sem o import acima, a toolbar tende a ficar "torta" e herdar estilos globais.

type Props = {
  html: string;
  onChange: (html: string) => void;
  editable?: boolean;
};

type ArticleParts = {
  hasArticle: boolean;
  attributes: Array<{ name: string; value: string }>;
  /** style="" original do <article> para não perder no save */
  styleAttr?: string | null;
  styleTagsHtml: string;
  innerContent: string;
};

function escapeAttr(v: string) {
  return v.replace(/"/g, '&quot;');
}

function styleStringToObject(style?: string | null): CSSProperties | undefined {
  if (!style) return undefined;
  const out: Record<string, string> = {};
  style
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((rule) => {
      const idx = rule.indexOf(':');
      if (idx === -1) return;
      const prop = rule.slice(0, idx).trim();
      const value = rule.slice(idx + 1).trim();
      if (!prop || !value) return;
      out[prop] = value;
    });

  // Mantém as chaves como CSS string mesmo.
  // React aceita style com propriedades custom via index signature quando
  // tipamos como CSSProperties de forma ampla.
  return out as unknown as CSSProperties;
}

function parseArticleParts(html: string): ArticleParts {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || '', 'text/html');
  const article = doc.querySelector('article');

  if (!article) {
    return {
      hasArticle: false,
      attributes: [],
      styleAttr: null,
      styleTagsHtml: '',
      innerContent: html || ''
    };
  }

  const styleAttr = article.getAttribute('style');

  const attributes = Array.from(article.attributes)
    // Evita attrs que o editor injeta
    // Mantém o style separado (styleAttr) para preservar no save,
    // sem tentar aplicar como prop React.
    .filter((a) => a.name !== 'contenteditable' && a.name !== 'id' && a.name !== 'style')
    .map((a) => ({ name: a.name, value: a.value }));

  const styleTags = Array.from(article.querySelectorAll('style'));
  const styleTagsHtml = styleTags.map((s) => s.outerHTML).join('');

  const clone = article.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('style').forEach((s) => s.remove());

  return {
    hasArticle: true,
    attributes,
    styleAttr,
    styleTagsHtml,
    innerContent: clone.innerHTML
  };
}

/**
 * Converte tamanhos de fonte de px para pt no HTML
 * Processa diretamente na string HTML para garantir que todos os casos sejam capturados
 */
function convertFontSizePxToPt(html: string): string {
  if (!html) return html;
  
  try {
    // Regex para encontrar font-size:XXpx em qualquer contexto dentro de atributos style
    // Funciona com aspas simples, duplas ou sem aspas (embora sem aspas seja inválido, alguns parsers aceitam)
    // Também captura casos onde há espaços extras
    return html.replace(
      /font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/gi,
      'font-size:$1pt'
    );
  } catch (err) {
    // Em caso de erro, retorna o HTML original
    console.warn('Erro ao converter font-size de px para pt:', err);
    return html;
  }
}

/**
 * Remove text-indent de parágrafos que contêm imagens no HTML
 */
function removeTextIndentFromImageParagraphsInHtml(html: string): string {
  if (!html) return html;
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Processa todos os parágrafos
    const paragraphs = doc.querySelectorAll('p');
    let removedCount = 0;
    
    paragraphs.forEach(p => {
      // Verifica se o parágrafo contém uma imagem
      const hasImage = p.querySelector('img, .image-inline, figure.image, span.image-inline');
      
      if (hasImage) {
        const currentStyle = p.getAttribute('style') || '';
        
        // Remove text-indent do style
        if (currentStyle.includes('text-indent')) {
          const newStyle = currentStyle
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.toLowerCase().startsWith('text-indent'))
            .join('; ');
          
          if (newStyle) {
            p.setAttribute('style', newStyle);
          } else {
            p.removeAttribute('style');
          }
          
          removedCount++;
        }
      }
    });
    
    if (removedCount > 0) {
      console.log(`✅ Removido text-indent de ${removedCount} parágrafos com imagens no HTML inicial`);
    }
    
    // Retorna o HTML processado
    return doc.body.innerHTML;
  } catch (err) {
    console.warn('Erro ao remover text-indent do HTML:', err);
    return html;
  }
}

/**
 * Processa HTML para garantir que frases específicas de fechamento sejam centralizadas
 */
function ensureClosingPhrasesCentered(html: string): string {
  if (!html) return html;
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Frases que devem ser centralizadas (como texto completo ou principal do parágrafo)
    const phrasesToCenter = [
      /^asdasdasadsdasdasdfdssdfsdf,?\s*$/i
    ];
    
    // Processa todos os parágrafos
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach(p => {
      const textContent = p.textContent?.trim() || '';
      const innerHTML = p.innerHTML.trim();
      
      // Verifica se o parágrafo contém uma das frases como texto completo ou principal
      const shouldCenter = phrasesToCenter.some(regex => regex.test(textContent));
      
      if (shouldCenter) {
        // Obtém o style atual
        const currentStyle = p.getAttribute('style') || '';
        
        // Remove text-align existente
        const styleParts = currentStyle
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.toLowerCase().startsWith('text-align'))
          .filter(Boolean);
        
        // Adiciona text-align: center
        styleParts.push('text-align:center');
        
        // Aplica o novo style
        p.setAttribute('style', styleParts.join('; '));
      }
    });
    
    // Retorna o HTML processado
    return doc.body.innerHTML;
  } catch (err) {
    // Em caso de erro, retorna o HTML original
    console.warn('Erro ao processar HTML para centralização de frases:', err);
    return html;
  }
}

function buildArticle(parts: ArticleParts, newInner: string) {
  // Converte font-size de px para pt primeiro
  const convertedInner = convertFontSizePxToPt(newInner);
  // Remove text-indent de parágrafos com imagens
  const withoutIndent = removeTextIndentFromImageParagraphsInHtml(convertedInner);
  // Processa o conteúdo para garantir centralização das frases de fechamento
  const processedInner = ensureClosingPhrasesCentered(withoutIndent);
  
  // Sempre devolve um <article> para manter compatibilidade com o backend
  let out = '<article';
  if (parts.styleAttr) {
    out += ` style="${escapeAttr(parts.styleAttr)}"`;
  }
  for (const attr of parts.attributes) {
    out += ` ${attr.name}="${escapeAttr(attr.value)}"`;
  }
  out += '>';
  out += parts.styleTagsHtml || '';
  out += processedInner || '';
  out += '</article>';
  
  // Conversão final para garantir que nenhum px tenha escapado
  return convertFontSizePxToPt(out);
}

export default function HtmlEditor({ html, onChange, editable = true }: Props) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<DecoupledEditor | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const { i18n } = useConfig();
  const lastHtmlRef = useRef<string>(html);
  const isInternalChangeRef = useRef(false);

  // Parse do HTML inicial e estrutura do article
  const parts = useMemo(() => {
    const parsed = parseArticleParts(html);
    return parsed;
  }, [html]);

  // Estado interno para o conteúdo do editor (evita reset do cursor durante digitação)
  const [editorData, setEditorData] = useState(() => {
    const initialContent = parts.innerContent ?? '';
    const convertedContent = convertFontSizePxToPt(initialContent);
    const withoutIndent = removeTextIndentFromImageParagraphsInHtml(convertedContent);
    return ensureClosingPhrasesCentered(withoutIndent);
  });

  // Sincroniza o estado interno quando o html prop mudar externamente
  useEffect(() => {
    // Ignora mudanças que vêm do próprio editor
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      lastHtmlRef.current = html;
      return;
    }

    // Só atualiza se o HTML realmente mudou de uma fonte externa
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      const parsed = parseArticleParts(html);
      const convertedContent = convertFontSizePxToPt(parsed.innerContent ?? '');
      const withoutIndent = removeTextIndentFromImageParagraphsInHtml(convertedContent);
      const newContent = ensureClosingPhrasesCentered(withoutIndent);
      // Só atualiza se o conteúdo realmente mudou
      setEditorData(prev => {
        if (prev !== newContent) {
          return newContent;
        }
        return prev;
      });

      // Processa imagens após atualizar o conteúdo do editor
      if (editorRef.current) {
        const centerImages = () => {
          const editableElement = editorRef.current?.editing.view.domRoots.get('main') as HTMLElement;
          if (editableElement) {
            processImagesInElement(editableElement);
          } else {
            // Fallback: procura pelo elemento editável via seletor
            const fallbackElement = document.querySelector('.ck-editor__editable_inline') as HTMLElement;
            if (fallbackElement) {
              processImagesInElement(fallbackElement);
            }
          }
          
          // Centraliza usando comando nativo do CKEditor
          if (editorRef.current) {
            try {
              const model = editorRef.current.model;
              const root = model.document.getRoot();
              
              if (!root) return;

              const imageElements: any[] = [];

              model.change(() => {
                for (const item of root.getChildren()) {
                  findImagesRecursive(item, imageElements);
                }

                imageElements.forEach((imageElement) => {
                  if (imageElement.is('element', 'imageBlock') || imageElement.is('element', 'imageInline')) {
                    model.change((writer: any) => {
                      writer.setAttribute('imageStyle', 'alignCenter', imageElement);
                    });
                  }
                });
              });

              function findImagesRecursive(item: any, images: any[]) {
                if (item.is('element', 'imageBlock') || item.is('element', 'imageInline')) {
                  images.push(item);
                }
                if (item.is('element') && item.childCount > 0) {
                  for (const child of item.getChildren()) {
                    findImagesRecursive(child, images);
                  }
                }
              }
              
              // Remove text-indent de parágrafos com imagens
              setTimeout(() => {
                const editableEl = editorRef.current?.editing.view.domRoots.get('main') as HTMLElement;
                if (editableEl) {
                  const paragraphs = editableEl.querySelectorAll('p');
                  paragraphs.forEach((p) => {
                    const hasImage = p.querySelector('img, .image-inline, figure.image');
                    if (hasImage) {
                      const pElement = p as HTMLElement;
                      const currentStyle = pElement.getAttribute('style') || '';
                      if (currentStyle.includes('text-indent')) {
                        const newStyle = currentStyle
                          .split(';')
                          .map(s => s.trim())
                          .filter(s => s && !s.toLowerCase().startsWith('text-indent'))
                          .join('; ');
                        if (newStyle) {
                          pElement.setAttribute('style', newStyle);
                        } else {
                          pElement.removeAttribute('style');
                        }
                      }
                      if (pElement.style.textIndent) {
                        pElement.style.removeProperty('text-indent');
                      }
                    }
                  });
                }
              }, 100);
              
            } catch (error) {
              console.warn('Erro ao centralizar imagens após atualização:', error);
            }
          }
        };
        
        // Executa múltiplas vezes para garantir
        setTimeout(centerImages, 100);
        setTimeout(centerImages, 300);
        setTimeout(centerImages, 500);
      }
    }
  }, [html]);

  // Cleanup do observer quando o componente desmontar
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const hasInlinePageStyle = !!parts.styleAttr;
  const articleInlineStyle = useMemo(
    () => styleStringToObject(parts.styleAttr),
    [parts.styleAttr]
  );

  // Converte lista de atributos em mapa para espalhar no <article>
  const articleAttrs = useMemo(() => {
    const out: Record<string, string> = {};
    for (const a of parts.attributes) out[a.name] = a.value;
    return out;
  }, [parts.attributes]);

  // ✅ Determina o idioma do CKEditor baseado no i18n da aplicação
  const ckeditorLanguage = useMemo(() => {
    const base = (i18n || 'pt-BR').toLowerCase();

    if (base.startsWith('pt')) return 'pt-br';
    if (base.startsWith('es')) return 'es';
    if (base.startsWith('en')) return 'en';

    // fallback
    return base.split('-')[0] || 'en';
  }, [i18n]);

  const config = useMemo(() => ({
    // Ajuste conforme sua licença.
    // 'GPL' é aceito quando você está em conformidade com os termos da GPL.
    licenseKey: 'GPL',

    language: {
      ui: ckeditorLanguage,
      content: ckeditorLanguage
    },

    plugins: [
      Essentials,
      Paragraph,
      Bold,
      Italic,
      Underline,
      Strikethrough,
      Heading,
      List,
      Link,
      BlockQuote,
      Alignment,
      Indent,
      IndentBlock,
      FontFamily,
      FontSize,
      FontColor,
      FontBackgroundColor,
      RemoveFormat,
      HorizontalLine,
      Table,
      TableToolbar,
      GeneralHtmlSupport,
      Image,
      ImageToolbar,
      ImageCaption,
      ImageStyle,
      ImageResize,
      ImageUpload,
      SimpleUploadAdapter,
      ExportToPdfPlugin
      // Opção alternativa (Base64 - não recomendado para produção):
      // Base64UploadAdapter
    ],
    toolbar: {
      items: [
        'undo',
        'redo',
        '|',
        'heading',
        '|',
        'fontFamily',
        'fontSize',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'fontColor',
        'fontBackgroundColor',
        '|',
        'alignment',
        '|',
        'bulletedList',
        'numberedList',
        'outdent',
        'indent',
        '|',
        'link',
        'blockQuote',
        'insertTable',
        'uploadImage',
        'horizontalLine',
        '|',
        'removeFormat',
        '|',
        'exportToPdf'
      ],
      // ✅ Como no demo: permite agrupar e usar overflow corretamente
      shouldNotGroupWhenFull: false
    },
    fontFamily: {
      options: [
        'default',
        'Arial, Helvetica, sans-serif',
        'Times New Roman, Times, serif',
        'Georgia, serif',
        'Courier New, Courier, monospace'
      ]
    },
    fontSize: {
      options: [
        '9pt', '10pt', '11pt', '12pt', '13pt', '14pt', '15pt', '16pt', '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '36pt', '48pt', '72pt'
      ],
      supportAllValues: true
    },
    heading: {
      options: [
        { model: 'paragraph' as const, title: 'Parágrafo', class: 'ck-heading_paragraph' },
        { model: 'heading1' as const, view: 'h1', title: 'Título 1', class: 'ck-heading_heading1' },
        { model: 'heading2' as const, view: 'h2', title: 'Título 2', class: 'ck-heading_heading2' },
        { model: 'heading3' as const, view: 'h3', title: 'Título 3', class: 'ck-heading_heading3' }
      ]
    },
    indentBlock: {
      offset: 38,
      unit: 'px'
    },
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells'
      ]
    },
    // ✅ Configuração de upload de imagens
    simpleUpload: {
      uploadUrl: `${import.meta.env.VITE_APP_API_URL || 'http://localhost:22211'}/uploads/images`,
      // Opcional: adicionar autenticação se necessário
      // withCredentials: true,
      // headers: {
      //   Authorization: `Bearer ${token}`
      // }
    },
    image: {
      upload: {
        // Tipos de imagem permitidos (o servidor também deve validar)
        types: ['jpeg', 'jpg', 'png', 'gif', 'webp']
      },
      toolbar: [
        'imageTextAlternative',
        'toggleImageCaption',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        '|',
        'resizeImage'
      ]
    },
    /**
     * ✅ Permite que o CKEditor mantenha atributos, classes e styles inline
     * vindos do DOCX/html do backend.
     * Sem isso o editor tende a "limpar" style="" em <p>, <span>, etc.
     */
    htmlSupport: {
      allow: [
        {
          name: /.*/,
          attributes: true,
          classes: /.*/,
          styles: true
        }
      ]
    } as any
  }), [ckeditorLanguage]);

  const baselineTypography = {
    color: '#000',
    fontFamily: 'Calibri, Arial, sans-serif',
    fontSize: '11pt',
    lineHeight: 1.5
  } as const;

  return (
    <Box
      className="otj-ckeditor"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'grey.50',
        // Pequenos ajustes de layout para ficar mais próximo do "document editor"
        // ✅ Se o DOCX trouxe layout de página no <article>, NÃO adiciona padding extra aqui.
        '& .ck-editor__editable_inline': hasInlinePageStyle
          ? {
              minHeight: 'auto',
              padding: 0,
              outline: 'none',
              backgroundColor: 'inherit',
              ...baselineTypography
            }
          : {
              minHeight: '70vh',
              padding: '48px 56px',
              outline: 'none',
              ...baselineTypography
            },
        /**
         * NUNCA estilizar .ck-content diretamente - ela é usada pelo editor inteiro, inclusive UI flutuante.
         * Aplicamos baseline apenas no elemento editável.
         */
        // '& .ck-content': {
        //   ...baselineTypography
        // }
        
        /* BLINDAGEM DEFINITIVA DO COLOR PICKER (NO SX) */
        /* REMOVIDO: Deixar o JavaScript e CSS externo cuidar disso */
      }}
    >
      {/* Toolbar externa (padrão decoupled/document editor) */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: '8px 8px 0 0',
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: '#1a1a2e',
          boxShadow: 'none',
          overflow: 'visible',
          position: 'relative',
          zIndex: 100
        }}
      >
        <Box ref={toolbarRef} />
      </Paper>

      {/* Área do documento */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          p: 3
        }}
      >
        <Box
          component="article"
          // ✅ Mantém o <article> presente no DOM durante a edição
          {...(articleAttrs as any)}
          // ✅ APLICA o style="" do DOCX no wrapper real
          style={articleInlineStyle}
          sx={{
            // ✅ Se o article vier com width/padding de página, não substitui aqui.
            width: hasInlinePageStyle ? undefined : '100%',
            maxWidth: hasInlinePageStyle ? undefined : 980,
            bgcolor: hasInlinePageStyle ? undefined : '#fff',
            borderRadius: hasInlinePageStyle ? 0 : 1,
            boxShadow: hasInlinePageStyle ? 0 : 1,
            p: hasInlinePageStyle ? 0 : { xs: 2, sm: 3, md: 4 },

            // ✅ Baseline tipográfico sempre no wrapper da página.
            // Os estilos do DOCX (<style> internos ou inline nos <p>) continuam
            // podendo sobrescrever normalmente.
            color: '#000',
            fontFamily: 'Calibri, Arial, sans-serif'
          }}
        >
          {/* ✅ Reaplica os <style> originais do article sem passar pelo data do CKEditor */}
          {!!parts.styleTagsHtml && (
            <Box
              component="div"
              dangerouslySetInnerHTML={{ __html: parts.styleTagsHtml }}
            />
          )}

          <CKEditor
            editor={DecoupledEditor}
            data={editorData}
            disabled={!editable}
            config={config}
            onReady={(editor) => {
              editorRef.current = editor;
              // Anexa a toolbar no container externo
              const el = editor.ui.view.toolbar.element;
              if (toolbarRef.current && el) {
                // Evita duplicação/efeitos do StrictMode
                if (!toolbarRef.current.contains(el)) {
                  toolbarRef.current.innerHTML = '';
                  toolbarRef.current.appendChild(el);
                }
              }

              // Define "Parágrafo" como padrão quando não há seleção e atualiza tooltip
              setTimeout(() => {
                const headingButton = el?.querySelector('.ck-heading-dropdown .ck-dropdown__button') as HTMLElement;
                if (headingButton) {
                  let currentLabel = 'Parágrafo';
                  
                  const updateHeadingLabel = () => {
                    const label = headingButton.querySelector('.ck-button__label') as HTMLElement;
                    if (label) {
                      const labelText = label.textContent?.trim() || '';
                      // Se contém "Choose", "Escolher" ou está vazio, define como "Parágrafo"
                      if (labelText.toLowerCase().includes('choose') || 
                          labelText.toLowerCase().includes('escolher') || 
                          labelText === '') {
                        label.textContent = 'Parágrafo';
                        currentLabel = 'Parágrafo';
                      } else {
                        currentLabel = labelText;
                      }
                      
                      // Força a cor do texto sempre
                      label.style.setProperty('color', 'rgba(255, 255, 255, 0.8)', 'important');
                      label.style.setProperty('display', 'block', 'important');
                    }
                    
                    // Atualiza aria-label para o tooltip
                    headingButton.setAttribute('aria-label', currentLabel);
                  };
                  
                  // Observa tooltips sendo criados e atualiza o texto
                  const tooltipObserver = new MutationObserver(() => {
                    const tooltip = document.querySelector('.ck-tooltip') as HTMLElement;
                    if (tooltip) {
                      const tooltipText = tooltip.querySelector('.ck-tooltip__text') as HTMLElement;
                      if (tooltipText) {
                        const text = tooltipText.textContent || '';
                        // Se contém "heading", "Heading", "escolher" ou "choose", substitui
                        if (text.toLowerCase().includes('heading') || 
                            text.toLowerCase().includes('escolher') ||
                            text.toLowerCase().includes('choose')) {
                          tooltipText.textContent = currentLabel;
                        }
                      }
                    }
                  });
                  
                  tooltipObserver.observe(document.body, {
                    childList: true,
                    subtree: true
                  });
                  
                  // Observa mudanças no estado do botão
                  const observer = new MutationObserver(updateHeadingLabel);
                  observer.observe(headingButton, { 
                    attributes: true, 
                    attributeFilter: ['class'],
                    childList: true,
                    subtree: true
                  });
                  
                  // Atualiza quando o editor muda
                  editor.model.document.on('change:data', () => {
                    setTimeout(updateHeadingLabel, 50);
                  });
                  
                  // Atualiza quando a seleção muda
                  editor.model.document.selection.on('change', () => {
                    setTimeout(updateHeadingLabel, 50);
                  });
                  
                  // Atualiza inicialmente
                  updateHeadingLabel();
                  
                  // Atualiza tooltip periodicamente quando o botão está com hover
                  const tooltipInterval = setInterval(() => {
                    const tooltip = document.querySelector('.ck-tooltip') as HTMLElement;
                    if (tooltip && headingButton.matches(':hover')) {
                      const tooltipText = tooltip.querySelector('.ck-tooltip__text') as HTMLElement;
                      if (tooltipText) {
                        const text = tooltipText.textContent || '';
                        if (text.toLowerCase().includes('heading') || 
                            text.toLowerCase().includes('escolher') ||
                            text.toLowerCase().includes('choose')) {
                          tooltipText.textContent = currentLabel;
                        }
                      }
                    }
                  }, 100);
                  
                  // Atualiza periodicamente para garantir
                  const intervalId = setInterval(updateHeadingLabel, 500);
                  
                  // Limpa o intervalo quando o editor for destruído
                  editor.on('destroy', () => {
                    clearInterval(intervalId);
                    clearInterval(tooltipInterval);
                    observer.disconnect();
                    tooltipObserver.disconnect();
                  });
                }
              }, 200);

              // Função para remover text-indent de parágrafos com imagens
              const removeTextIndentFromImageParagraphs = () => {
                try {
                  const editableElement = editor.editing.view.domRoots.get('main') as HTMLElement;
                  if (!editableElement) return;

                  // Encontra todos os parágrafos que contêm imagens
                  const paragraphs = editableElement.querySelectorAll('p');
                  let removedCount = 0;

                  paragraphs.forEach((p) => {
                    // Verifica se o parágrafo contém uma imagem
                    const hasImage = p.querySelector('img, .image-inline, figure.image');
                    
                    if (hasImage) {
                      const pElement = p as HTMLElement;
                      const currentStyle = pElement.getAttribute('style') || '';
                      
                      // Remove text-indent do style
                      if (currentStyle.includes('text-indent')) {
                        // Remove text-indent mantendo outros estilos
                        const newStyle = currentStyle
                          .split(';')
                          .map(s => s.trim())
                          .filter(s => s && !s.toLowerCase().startsWith('text-indent'))
                          .join('; ');
                        
                        if (newStyle) {
                          pElement.setAttribute('style', newStyle);
                        } else {
                          pElement.removeAttribute('style');
                        }
                        
                        removedCount++;
                      }
                      
                      // Também remove via JavaScript caso esteja aplicado
                      if (pElement.style.textIndent) {
                        pElement.style.removeProperty('text-indent');
                        removedCount++;
                      }
                    }
                  });

                  if (removedCount > 0) {
                    console.log(`✅ Removido text-indent de ${removedCount} parágrafos com imagens`);
                  }
                } catch (error) {
                  console.warn('Erro ao remover text-indent de parágrafos:', error);
                }
              };

              // Função para centralizar todas as imagens usando comandos nativos do CKEditor
              const centerAllImagesWithCommand = () => {
                try {
                  // Obtém o modelo do editor
                  const model = editor.model;
                  const root = model.document.getRoot();
                  
                  if (!root) return;

                  // Array para armazenar todas as imagens encontradas
                  const imageElements: any[] = [];

                  // Percorre o documento para encontrar todos os elementos de imagem
                  model.change(() => {
                    for (const item of root.getChildren()) {
                      // Procura recursivamente por imagens
                      findImages(item, imageElements);
                    }

                    // Para cada imagem encontrada, aplica o estilo de centralização
                    imageElements.forEach((imageElement) => {
                      if (imageElement.is('element', 'imageBlock') || imageElement.is('element', 'imageInline')) {
                        // Define o atributo de estilo para centralizado
                        model.change((writer: any) => {
                          writer.setAttribute('imageStyle', 'alignCenter', imageElement);
                        });
                      }
                    });
                  });

                  // Função auxiliar para encontrar imagens recursivamente
                  function findImages(item: any, images: any[]) {
                    if (item.is('element', 'imageBlock') || item.is('element', 'imageInline')) {
                      images.push(item);
                    }
                    
                    // Se o item tem filhos, procura recursivamente
                    if (item.is('element') && item.childCount > 0) {
                      for (const child of item.getChildren()) {
                        findImages(child, images);
                      }
                    }
                  }

                  console.log(`✅ ${imageElements.length} imagens centralizadas usando comando nativo do CKEditor`);
                  
                  // Remove text-indent de parágrafos com imagens
                  setTimeout(() => {
                    removeTextIndentFromImageParagraphs();
                  }, 50);
                  
                } catch (error) {
                  console.warn('Erro ao centralizar imagens com comando nativo:', error);
                  
                  // Fallback: aplica CSS/classes diretamente
                  const editableElement = editor.editing.view.domRoots.get('main') as HTMLElement;
                  if (editableElement) {
                    const figures = editableElement.querySelectorAll('figure.image');
                    figures.forEach((figure) => {
                      if (!figure.classList.contains('image-style-align-center') && 
                          !figure.classList.contains('image-style-block')) {
                        figure.classList.add('image-style-align-center');
                      }
                    });

                    const images = editableElement.querySelectorAll('img');
                    images.forEach((img) => {
                      const parentFigure = img.closest('figure.image');
                      if (!parentFigure) {
                        const imgElement = img as HTMLElement;
                        imgElement.style.display = 'block';
                        imgElement.style.marginLeft = 'auto';
                        imgElement.style.marginRight = 'auto';
                      }
                    });
                    
                    // Remove text-indent também no fallback
                    removeTextIndentFromImageParagraphs();
                  }
                }
              };

              // Processa imagens existentes no conteúdo inicial
              // Usa múltiplos timeouts para garantir que o DOM está pronto e o conteúdo carregado
              const processImagesWithDelay = () => {
                const editableElement = editor.editing.view.domRoots.get('main') as HTMLElement;
                if (editableElement) {
                  processImagesInElement(editableElement);
                  
                  // Cria observer para processar imagens adicionadas dinamicamente
                  if (observerRef.current) {
                    observerRef.current.disconnect();
                  }
                  observerRef.current = createImageObserver(editableElement);
                } else {
                  // Fallback: procura pelo elemento editável via seletor
                  const fallbackElement = document.querySelector('.ck-editor__editable_inline') as HTMLElement;
                  if (fallbackElement) {
                    processImagesInElement(fallbackElement);
                    if (observerRef.current) {
                      observerRef.current.disconnect();
                    }
                    observerRef.current = createImageObserver(fallbackElement);
                  }
                }
                
                // Centraliza usando comando nativo do CKEditor
                centerAllImagesWithCommand();
              };

              // Executa múltiplas vezes para garantir que captura o conteúdo
              setTimeout(processImagesWithDelay, 100);
              setTimeout(processImagesWithDelay, 300);
              setTimeout(processImagesWithDelay, 500);
              setTimeout(processImagesWithDelay, 1000);

              // FIX COLOR PICKER - Força background nos tiles via JavaScript (ABORDAGEM AGRESSIVA)
              const fixColorPickerTiles = () => {
                const tiles = document.querySelectorAll('.ck.ck-color-grid__tile') as NodeListOf<HTMLElement>;
                tiles.forEach((tile) => {
                  let color = '';
                  const styleAttr = tile.getAttribute('style') || '';
                  
                  // Método 1: Busca variável CSS no atributo style
                  const varMatch = styleAttr.match(/--ck-color-grid-tile-background:\s*([^;'"]+)/i);
                  if (varMatch && varMatch[1]) {
                    color = varMatch[1].trim();
                  }
                  
                  // Método 2: Busca background-color direto no style
                  if (!color) {
                    const bgColorMatch = styleAttr.match(/background-color:\s*([^;'"]+)/i);
                    if (bgColorMatch && bgColorMatch[1]) {
                      color = bgColorMatch[1].trim();
                    }
                  }
                  
                  // Método 3: Via getPropertyValue - variável CSS
                  if (!color) {
                    color = tile.style.getPropertyValue('--ck-color-grid-tile-background')?.trim() || '';
                  }
                  
                  // Método 4: Via getPropertyValue - background-color direto
                  if (!color) {
                    color = tile.style.getPropertyValue('background-color')?.trim() || '';
                  }
                  
                  // Método 5: Via computed style
                  if (!color) {
                    try {
                      const computed = getComputedStyle(tile);
                      color = computed.getPropertyValue('--ck-color-grid-tile-background')?.trim() || 
                              computed.getPropertyValue('background-color')?.trim() || '';
                    } catch (e) {
                      // Ignora erros
                    }
                  }
                  
                  // Método 6: Busca em atributos data-*
                  if (!color) {
                    for (const attr of tile.attributes) {
                      if (attr.name.startsWith('data-') && (attr.value.includes('rgb') || attr.value.includes('#'))) {
                        color = attr.value;
                        break;
                      }
                    }
                  }
                  
                  // Se encontrou a cor válida, aplica de forma ULTRA AGRESSIVA
                  if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)' && color !== 'initial' && color !== 'inherit') {
                    // Remove TODAS as propriedades que possam interferir
                    tile.style.removeProperty('background');
                    tile.style.removeProperty('background-color');
                    tile.style.removeProperty('background-image');
                    tile.style.removeProperty('background-size');
                    tile.style.removeProperty('color');
                    
                    // Aplica via setProperty com important
                    tile.style.setProperty('background-color', color, 'important');
                    tile.style.setProperty('background', color, 'important');
                    tile.style.setProperty('color', 'transparent', 'important');
                    
                    // Força via atributo style direto (sobrescreve tudo)
                    tile.setAttribute('style', 
                      `background-color: ${color} !important; ` +
                      `background: ${color} !important; ` +
                      `color: transparent !important; ` +
                      `border: 1px solid #dadce0 !important; ` +
                      `border-radius: 4px !important; ` +
                      `width: 18px !important; ` +
                      `height: 18px !important; ` +
                      `min-width: 18px !important; ` +
                      `min-height: 18px !important;`
                    );
                    
                    // Força também via cssText (método mais direto)
                    tile.style.cssText = 
                      `background-color: ${color} !important; ` +
                      `background: ${color} !important; ` +
                      `color: transparent !important; ` +
                      `border: 1px solid #dadce0 !important; ` +
                      `border-radius: 4px !important; ` +
                      `width: 18px !important; ` +
                      `height: 18px !important; ` +
                      `min-width: 18px !important; ` +
                      `min-height: 18px !important;`;
                  }
                });
              };

              // Observa quando o color picker é aberto (MULTIPLAS ESTRATÉGIAS)
              const colorPickerObserver = new MutationObserver(() => {
                requestAnimationFrame(() => {
                  fixColorPickerTiles();
                  setTimeout(fixColorPickerTiles, 5);
                  setTimeout(fixColorPickerTiles, 20);
                });
              });

              // Observa mudanças no documento para detectar color picker
              colorPickerObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
              });

              // Fix inicial com múltiplas tentativas
              setTimeout(() => {
                fixColorPickerTiles();
                setTimeout(fixColorPickerTiles, 50);
                setTimeout(fixColorPickerTiles, 100);
                setTimeout(fixColorPickerTiles, 200);
              }, 100);

              // Fix periódico quando color picker está visível (MUITO FREQUENTE)
              const colorPickerInterval = setInterval(() => {
                const colorPicker = document.querySelector('.ck.ck-balloon-panel.ck-color-selector');
                if (colorPicker) {
                  // Executa múltiplas vezes em sequência
                  requestAnimationFrame(fixColorPickerTiles);
                  setTimeout(fixColorPickerTiles, 5);
                  setTimeout(fixColorPickerTiles, 15);
                  setTimeout(fixColorPickerTiles, 30);
                }
              }, 20); // Reduzido para 20ms para máxima reatividade

              // Traduz botão "Remove color" para "Remover a cor" (todos os color pickers)
              const translateRemoveColorButton = () => {
                // Busca todos os botões "remove color" (fontColor e fontBackgroundColor)
                const removeColorButtons = document.querySelectorAll('.ck.ck-color-selector__remove-color') as NodeListOf<HTMLElement>;
                removeColorButtons.forEach((removeColorButton) => {
                  const label = removeColorButton.querySelector('.ck-button__label') as HTMLElement;
                  if (label && (label.textContent?.toLowerCase().includes('remove') || label.textContent?.toLowerCase().includes('remover'))) {
                    // Verifica se já não está traduzido
                    if (!label.textContent?.includes('Remover a cor')) {
                      label.textContent = 'Remover a cor';
                    }
                  }
                  // Atualiza aria-label e title
                  removeColorButton.setAttribute('aria-label', 'Remover a cor');
                  removeColorButton.setAttribute('title', 'Remover a cor');
                });
              };

              // Observa quando o color picker é aberto para traduzir o botão
              const removeColorObserver = new MutationObserver(() => {
                setTimeout(translateRemoveColorButton, 10);
              });

              removeColorObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
              });

              // Traduz inicialmente
              setTimeout(translateRemoveColorButton, 200);
              setTimeout(translateRemoveColorButton, 500);

              // Listener para centralizar imagens e remover text-indent sempre que o conteúdo mudar
              const centerImagesOnChange = () => {
                setTimeout(() => {
                  centerAllImagesWithCommand();
                  // Remove text-indent adicional após qualquer mudança
                  setTimeout(() => {
                    removeTextIndentFromImageParagraphs();
                  }, 100);
                }, 50);
              };

              // Adiciona listener de mudanças no modelo
              editor.model.document.on('change:data', centerImagesOnChange);

              // Limpa quando o editor for destruído
              editor.on('destroy', () => {
                clearInterval(colorPickerInterval);
                colorPickerObserver.disconnect();
                removeColorObserver.disconnect();
              });
            }}
            onChange={(_, editor) => {
              const newInner = editor.getData();
              
              // Processa imagens no conteúdo atualizado
              setTimeout(() => {
                const editableElement = editor.editing.view.domRoots.get('main') as HTMLElement;
                if (editableElement) {
                  processImagesInElement(editableElement);
                }
              }, 50);
              
              // Marca que a mudança é interna (vem do editor) para evitar loop
              isInternalChangeRef.current = true;
              // Notifica o componente pai (que pode atualizar o html prop)
              onChange(buildArticle(parts, newInner));
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
