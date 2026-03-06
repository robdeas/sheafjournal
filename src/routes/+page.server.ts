import { buildTree } from '$lib/server/filesystem';
import { KB_ROOT } from '$lib/server/db';

export function load() {
  const tree = buildTree(KB_ROOT);
  return { tree };
}
