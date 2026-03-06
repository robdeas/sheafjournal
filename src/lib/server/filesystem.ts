import { readdirSync, statSync } from 'fs';
import { join, relative, extname, basename } from 'path';
import { KB_ROOT } from './db';

export type FileNode = {
  name: string;
  type: 'file' | 'directory';
  path: string;       // relative to KB_ROOT, forward slashes
  absPath: string;    // absolute path
  ext?: string;
  children?: FileNode[];
};

const HIDDEN = /^\./;
const SUPPORTED_EXTS = new Set(['.md', '.docx', '.odt', '.doc', '.rtf', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf']);

export function buildTree(absDir: string, depth = 0): FileNode {
  const name = basename(absDir);
  const relPath = '/' + relative(KB_ROOT, absDir).replace(/\\/g, '/');

  const node: FileNode = {
    name,
    type: 'directory',
    path: relPath,
    absPath: absDir,
    children: [],
  };

  if (depth > 10) return node; // safety limit

  let entries: string[] = [];
  try {
    entries = readdirSync(absDir);
  } catch {
    return node;
  }

  for (const entry of entries.sort()) {
    if (HIDDEN.test(entry)) continue; // skip .pkm, .pkm_assets etc

    const absEntry = join(absDir, entry);
    let stat;
    try { stat = statSync(absEntry); } catch { continue; }

    if (stat.isDirectory()) {
      node.children!.push(buildTree(absEntry, depth + 1));
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (!SUPPORTED_EXTS.has(ext)) continue;
      node.children!.push({
        name: entry,
        type: 'file',
        path: '/' + relative(KB_ROOT, absEntry).replace(/\\/g, '/'),
        absPath: absEntry,
        ext: ext.replace('.', ''),
      });
    }
  }

  return node;
}

export function findNode(relPath: string): FileNode | null {
  const absPath = join(KB_ROOT, relPath.replace(/^\//, ''));
  try {
    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      return buildTree(absPath);
    } else {
      const ext = extname(absPath).toLowerCase();
      return {
        name: basename(absPath),
        type: 'file',
        path: relPath,
        absPath,
        ext: ext.replace('.', ''),
      };
    }
  } catch {
    return null;
  }
}

export { KB_ROOT };
