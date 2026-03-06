export type FileNode = {
  name: string;
  type: 'file' | 'directory';
  path: string;
  absPath?: string;
  ext?: string;
  children?: FileNode[];
};

export type FileMeta = {
  path: string;
  tags: string[];
  lastViewed: string | null;
  wordCount: number | null;
  createdAt: string | null;
};

export const MONTHS: Record<string, string> = {
  '01': 'January',  '02': 'February', '03': 'March',
  '04': 'April',    '05': 'May',      '06': 'June',
  '07': 'July',     '08': 'August',   '09': 'September',
  '10': 'October',  '11': 'November', '12': 'December',
};

export function fileIcon(ext?: string): string {
  switch (ext) {
    case 'md':   return '◆';
    case 'docx': return '▣';
    case 'odt':  return '▤';
    case 'pdf':  return '▦';
    default:     return '◇';
  }
}

export function fileClass(ext?: string): string {
  switch (ext) {
    case 'md':   return 'file-icon-md';
    case 'docx': return 'file-icon-docx';
    case 'odt':  return 'file-icon-odt';
    case 'pdf':  return 'file-icon-pdf';
    default:     return 'text-ink-400';
  }
}

// Transform [[Wiki Links]] → anchor tags
export function processWikiLinks(html: string): string {
  return html.replace(
    /\[\[([^\]]+)\]\]/g,
    (_, name) => `<a href="/search?q=${encodeURIComponent(name)}" class="wiki-link">${name}</a>`
  );
}
