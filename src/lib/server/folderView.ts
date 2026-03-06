import { writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const SUPPORTED_EXTS = new Set(['.md', '.txt', '.docx', '.odt', '.doc', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
export const VIEW_FILE = 'sheafbase-folder-view.md';
export const INFO_FILE = 'sheafbase-folder-info.json';
export const TASKS_FILE = 'sheafbase-tasks.md';