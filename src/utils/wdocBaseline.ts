// src/utils/wdocBaseline.ts
import type { WDoc } from 'types/wdoc';

type BaselineMeta = {
  styleBaselineSource?: 'category' | 'company';
  styleBaseline?: any | null;
  sectionsBaseline?: any[] | null;
};

export function applyBaselineToWDoc(input: any): WDoc {
  const meta: BaselineMeta = (input && input.__meta) || {};
  const baseStyles = meta?.styleBaseline || null;
  const baseSections = Array.isArray(meta?.sectionsBaseline) ? meta!.sectionsBaseline! : null;

  // Clona superficialmente para não mutar o original
  const wdoc: any = { ...(input || {}) };

  // 1) sections: se baseline veio, usa; senão mantém as do documento
  if (baseSections?.length) {
    wdoc.sections = baseSections;
  }

  // 2) styles: baseline → sobrescrito por styles do doc (doc ganha)
  if (baseStyles && typeof baseStyles === 'object') {
    wdoc.styles = { ...(baseStyles || {}), ...(wdoc.styles || {}) };
  }

  return wdoc as WDoc;
}
