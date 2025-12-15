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
  // Processa o conteúdo para garantir centralização das frases de fechamento
  const processedInner = ensureClosingPhrasesCentered(convertedInner);
  
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
    return ensureClosingPhrasesCentered(convertedContent);
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
      const newContent = ensureClosingPhrasesCentered(convertedContent);
      // Só atualiza se o conteúdo realmente mudou
      setEditorData(prev => {
        if (prev !== newContent) {
          return newContent;
        }
        return prev;
      });

      // Processa imagens após atualizar o conteúdo do editor
      if (editorRef.current) {
        setTimeout(() => {
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
        }, 100);
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
      SimpleUploadAdapter
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
        'removeFormat'
      ],
      // ✅ Como no demo: permite agrupar e usar overflow corretamente
      shouldNotGroupWhenFull: false
    },
    fontFamily: {
      options: [
        'default',
        'Arial, Helvetica, sans-serif',
        'Calibri, Arial, sans-serif',
        'Century Gothic, Arial, sans-serif',
        'Courier New, Courier, monospace',
        'Georgia, serif',
        'Lucida Sans Unicode, Lucida Grande, sans-serif',
        'Tahoma, Geneva, sans-serif',
        'Times New Roman, Times, serif',
        'Trebuchet MS, Helvetica, sans-serif',
        'Verdana, Geneva, sans-serif'
      ]
    },
    fontSize: {
      options: [
        '9pt', '10pt', '11pt', '12pt', '13pt', '14pt', '15pt', '16pt', '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '36pt', '48pt', '72pt'
      ],
      supportAllValues: true
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
              background: 'transparent',
              ...baselineTypography
            }
          : {
              minHeight: '70vh',
              padding: '48px 56px',
              outline: 'none',
              ...baselineTypography
            },
        /**
         * CKEditor também usa .ck-content como raiz do conteúdo.
         * Garantimos o mesmo baseline aqui.
         */
        '& .ck-content': {
          ...baselineTypography
        }
      }}
    >
      {/* Toolbar externa (padrão decoupled/document editor) */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 0,
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
          bgcolor: 'background.paper',
          boxShadow: 'none'
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

              // Processa imagens existentes no conteúdo inicial
              // Usa um timeout para garantir que o DOM está pronto
              setTimeout(() => {
                // Tenta encontrar o elemento editável do CKEditor
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
              }, 100);
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
