export type DocflowInlineStyle = {
  bold?: boolean | null;
  italic?: boolean | null;
  underline?: boolean | null;
  underlineStyle?: string | null;
  fontSize?: number | null;
  fontFamily?: string | null;
  color?: string | null;
  highlight?: string | null;
};

export type DocflowInline = {
  style?: DocflowInlineStyle;
  content: string;
};

export type DocflowBlockStyle = {
  spacing?: {
    line?: number | null;
    before?: number | null;
    after?: number | null;
    lineRule?: 'auto' | 'exact' | 'atLeast' | null;
  };
};

export type DocflowBlock = {
  style?: DocflowBlockStyle;
  styleId?: string | null;
  styleName?: string | null; // ex.: "Normal"
  content: string;           // redundante, mas acompanha as inlines
  inlines: DocflowInline[];
};

export type DocflowDoc = {
  blocks: DocflowBlock[];
  [k: string]: any;
};
