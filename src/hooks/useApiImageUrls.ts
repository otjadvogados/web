import api from 'utils/axios';

const API_BASE = import.meta.env.VITE_APP_API_URL || 'http://localhost:22211';

// Cache de URLs convertidas para evitar múltiplas requisições
const imageUrlCache = new Map<string, string>();

/**
 * Verifica se uma URL é uma rota da API que precisa de autenticação
 */
function isApiImageUrl(src: string): boolean {
  return (
    src.startsWith('/ai/') ||
    src.startsWith('/uploads/') ||
    src.startsWith('/users/') ||
    (src.startsWith(API_BASE) && (src.includes('/ai/') || src.includes('/uploads/') || src.includes('/users/')))
  );
}

/**
 * Converte uma URL de imagem da API em blob URL
 */
async function convertApiImageToBlobUrl(apiPath: string): Promise<string | null> {
  // Verifica se já está no cache
  if (imageUrlCache.has(apiPath)) {
    return imageUrlCache.get(apiPath) || null;
  }

  try {
    // Remove a base URL se estiver presente para usar o path relativo
    const path = apiPath.startsWith(API_BASE) ? apiPath.replace(API_BASE, '') : apiPath;
    
    const res = await api.get(path, {
      responseType: 'blob',
      headers: {
        Accept: 'image/*'
      }
    });

    // Verificação do blob
    if (res.status !== 200 || !(res.data instanceof Blob) || res.data.size === 0) {
      console.warn(`Erro ao carregar imagem ${path}: HTTP ${res.status} / blob vazio`);
      return null;
    }

    const blob = res.data as Blob;
    const objectUrl = URL.createObjectURL(blob);
    
    // Armazena no cache
    imageUrlCache.set(apiPath, objectUrl);
    
    return objectUrl;
  } catch (e: any) {
    console.error(`Falha ao carregar imagem ${apiPath}:`, e);
    return null;
  }
}

/**
 * Processa uma imagem individual, convertendo seu src se necessário
 */
export async function processImageElement(img: HTMLImageElement): Promise<void> {
  const src = img.getAttribute('src');
  if (!src || !isApiImageUrl(src)) {
    return;
  }

  // Se já está no cache, substitui imediatamente
  if (imageUrlCache.has(src)) {
    img.src = imageUrlCache.get(src) || src;
    return;
  }

  // Carrega assincronamente
  const blobUrl = await convertApiImageToBlobUrl(src);
  if (blobUrl && img.parentNode) {
    img.src = blobUrl;
  }
}

/**
 * Processa todas as imagens em um elemento DOM
 */
export function processImagesInElement(element: HTMLElement | Document): void {
  const images = element.querySelectorAll('img[src]');
  images.forEach((img) => {
    processImageElement(img as HTMLImageElement);
  });
}

/**
 * Processa HTML string substituindo URLs de imagens da API que já estão em cache
 * Útil para processamento inicial antes de passar para o editor
 */
export function processHtmlString(html: string): string {
  if (!html) return html;

  try {
    // Substitui URLs que já estão no cache
    let processedHtml = html;
    imageUrlCache.forEach((blobUrl, apiPath) => {
      // Escapa caracteres especiais para regex
      const escapedPath = apiPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`src=["']${escapedPath}["']`, 'gi');
      processedHtml = processedHtml.replace(regex, `src="${blobUrl}"`);
    });

    return processedHtml;
  } catch (err) {
    console.warn('Erro ao processar HTML string:', err);
    return html;
  }
}

/**
 * Cria um MutationObserver para processar imagens adicionadas dinamicamente ao DOM
 */
export function createImageObserver(container: HTMLElement): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // Processa imagens diretamente adicionadas
          if (element.tagName === 'IMG' && element.getAttribute('src')) {
            processImageElement(element as HTMLImageElement);
          }
          
          // Processa imagens dentro do elemento adicionado
          const images = element.querySelectorAll('img[src]');
          images.forEach((img) => {
            processImageElement(img as HTMLImageElement);
          });
        }
      });
    });
  });

  observer.observe(container, {
    childList: true,
    subtree: true
  });

  return observer;
}

/**
 * Limpa o cache de URLs de imagens (útil para limpeza de memória)
 */
export function clearImageUrlCache() {
  // Revoga todas as URLs de objeto antes de limpar o cache
  imageUrlCache.forEach((blobUrl) => {
    URL.revokeObjectURL(blobUrl);
  });
  imageUrlCache.clear();
}

