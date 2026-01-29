import { mkdir, writeFile, rename, access, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { PluginConfig } from './types.js';

const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g;
const MULTIPLE_HYPHENS = /-+/g;
const LEADING_TRAILING_HYPHENS = /^-+|-+$/g;

export async function ensureDirectory(
  baseDir: string,
  config: PluginConfig
): Promise<string> {
  const dir = join(baseDir, config.saveDirectory);
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`[autosave] Failed to create directory ${dir}:`, error);
  }
  return dir;
}

export function generateFilename(
  topic: string,
  createdAt: Date,
  config: PluginConfig
): string {
  const dateStr = formatDateForFilename(createdAt);
  const sanitized = sanitizeTopic(topic, config.maxTopicLength);
  return `${dateStr}-${sanitized}.md`;
}

export function formatDateForFilename(date: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}-${hours}-${minutes}-${seconds}`;
}

export function sanitizeTopic(topic: string, maxLength: number): string {
  let sanitized = topic
    .replace(INVALID_FILENAME_CHARS, '-')
    .replace(/\s+/g, '-')
    .replace(MULTIPLE_HYPHENS, '-')
    .replace(LEADING_TRAILING_HYPHENS, '');

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    sanitized = sanitized.replace(LEADING_TRAILING_HYPHENS, '');
  }

  return sanitized || 'untitled';
}

export async function writeSessionFile(
  filePath: string,
  content: string
): Promise<boolean> {
  const tempPath = `${filePath}.tmp`;
  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`[autosave] Failed to write file ${filePath}:`, error);
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    return false;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function generateUniqueFilename(
  dir: string,
  topic: string,
  createdAt: Date,
  config: PluginConfig
): Promise<string> {
  const baseFilename = generateFilename(topic, createdAt, config);
  const basePath = join(dir, baseFilename);

  if (!(await fileExists(basePath))) {
    return basePath;
  }

  const suffix = Math.random().toString(36).substring(2, 6);
  const nameWithoutExt = baseFilename.replace('.md', '');
  return join(dir, `${nameWithoutExt}-${suffix}.md`);
}

const BASE64_DATA_URL_REGEX = /^data:image\/([a-zA-Z]+);base64,(.+)$/;

export function isBase64ImageUrl(url: string): boolean {
  return BASE64_DATA_URL_REGEX.test(url);
}

export function extractBase64Data(url: string): { format: string; data: string } | null {
  const match = url.match(BASE64_DATA_URL_REGEX);
  if (!match) return null;
  return { format: match[1], data: match[2] };
}

export async function saveImageFromBase64(
  base64Url: string,
  mdFilePath: string,
  sessionTitle: string,
  createdAt: Date,
  imageIndex: number
): Promise<string | null> {
  const extracted = extractBase64Data(base64Url);
  if (!extracted) return null;

  const mdDir = dirname(mdFilePath);
  const imagesDir = join(mdDir, 'images');
  const dateStr = formatDateForFilename(createdAt);
  const sanitizedTitle = sanitizeTopic(sessionTitle, 50);

  try {
    await mkdir(imagesDir, { recursive: true });

    const ext = extracted.format === 'jpeg' ? 'jpg' : extracted.format;
    const imageFilename = `${dateStr}-${sanitizedTitle}-${imageIndex}.${ext}`;
    const imagePath = join(imagesDir, imageFilename);

    const buffer = Buffer.from(extracted.data, 'base64');
    await writeFile(imagePath, buffer);

    return `images/${imageFilename}`;
  } catch (error) {
    console.error('[autosave] Failed to save image:', error);
    return null;
  }
}
