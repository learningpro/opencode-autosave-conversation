import type { Plugin, Hooks } from '@opencode-ai/plugin';
import type { Event } from '@opencode-ai/sdk';
import {
  DEFAULT_CONFIG,
  type MessageData,
  type PartData,
  type ChildSessionData,
} from './types.js';
import {
  ensureDirectory,
  writeSessionFile,
  isBase64ImageUrl,
  saveImageFromBase64,
  generateFilename,
  getGlobalSaveDirectory,
  ensureGlobalDirectory,
  writeToSecondaryLocation,
  saveImageToSecondaryLocation,
} from './file-manager.js';
import { join } from 'node:path';
import {
  createSession,
  getSession,
  deleteSession,
  getChildSessions,
  updateSessionTitle,
} from './session-tracker.js';
import { formatSession, extractTopicFromMessage } from './formatter.js';

interface SessionCreatedEvent {
  type: 'session.created';
  properties: {
    info: {
      id: string;
      parentID?: string;
      title?: string;
    };
  };
}

interface SessionIdleEvent {
  type: 'session.idle';
  properties: {
    sessionID: string;
  };
}

interface SessionDeletedEvent {
  type: 'session.deleted';
  properties: {
    info: {
      id: string;
    };
  };
}

interface SessionUpdatedEvent {
  type: 'session.updated';
  properties: {
    info: {
      id: string;
      title?: string;
    };
  };
}

type OpencodeClient = {
  session: {
    messages: (options: {
      path: { id: string };
      query: { directory: string };
    }) => Promise<{ data?: RawMessage[] }>;
  };
};

interface RawMessage {
  id: string;
  role: 'user' | 'assistant';
  time?: { created?: number };
}

interface RawPart {
  id: string;
  type: string;
  text?: string;
  tool?: string;
  state?: {
    status: string;
    input?: Record<string, unknown>;
    output?: string;
    title?: string;
    error?: string;
  };
  filename?: string;
  url?: string;
  mime?: string;
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

const plugin: Plugin = async (input) => {
  try {
    const { client, directory } = input;
    const typedClient = client as unknown as OpencodeClient;

    const saveDir = await ensureDirectory(directory, DEFAULT_CONFIG);

    let globalSaveDir: string | null = null;
    const globalPath = getGlobalSaveDirectory(directory);
    if (globalPath) {
      globalSaveDir = await ensureGlobalDirectory(globalPath);
    }

    const hooks: Hooks = {
      event: async ({ event }: { event: Event }) => {
        try {
          await handleEvent(event, typedClient, directory, saveDir, globalSaveDir);
        } catch {
          // Silently ignore event handling errors to not affect other plugins
        }
      },
    };

    return hooks;
  } catch {
    // Return empty hooks if initialization fails to not block other plugins
    return {};
  }
};

async function handleEvent(
  event: Event,
  client: OpencodeClient,
  directory: string,
  saveDir: string,
  globalSaveDir: string | null
): Promise<void> {
  switch (event.type) {
    case 'session.created':
      handleSessionCreated(event as SessionCreatedEvent);
      break;
    case 'session.updated':
      handleSessionUpdated(event as SessionUpdatedEvent);
      break;
    case 'session.idle':
      handleSessionIdle(event as SessionIdleEvent, client, directory, saveDir, globalSaveDir);
      break;
    case 'session.deleted':
      await handleSessionDeleted(
        event as SessionDeletedEvent,
        client,
        directory,
        saveDir,
        globalSaveDir
      );
      break;
  }
}

function handleSessionCreated(event: SessionCreatedEvent): void {
  const { info } = event.properties;
  if (!info?.id) return;

  if (!info.parentID) {
    createSession(info.id, info.title || '', '');
  } else {
    createSession(info.id, info.title || 'Subagent', '', info.parentID);
  }
}

function handleSessionUpdated(event: SessionUpdatedEvent): void {
  const { info } = event.properties;
  if (!info?.id) return;

  if (info.title) {
    updateSessionTitle(info.id, info.title);
  }
}

function handleSessionIdle(
  event: SessionIdleEvent,
  client: OpencodeClient,
  directory: string,
  saveDir: string,
  globalSaveDir: string | null
): void {
  const { sessionID } = event.properties;
  if (!sessionID) return;

  const existing = debounceTimers.get(sessionID);
  if (existing) {
    clearTimeout(existing);
  }

  debounceTimers.set(
    sessionID,
    setTimeout(() => {
      void saveSessionToFile(sessionID, client, directory, saveDir, globalSaveDir);
      debounceTimers.delete(sessionID);
    }, DEFAULT_CONFIG.debounceMs)
  );
}

async function handleSessionDeleted(
  event: SessionDeletedEvent,
  client: OpencodeClient,
  directory: string,
  saveDir: string,
  globalSaveDir: string | null
): Promise<void> {
  const { info } = event.properties;
  if (!info?.id) return;

  const timer = debounceTimers.get(info.id);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(info.id);
  }

  await saveSessionToFile(info.id, client, directory, saveDir, globalSaveDir);
  deleteSession(info.id);
}

async function saveSessionToFile(
  sessionID: string,
  client: OpencodeClient,
  directory: string,
  saveDir: string,
  globalSaveDir: string | null
): Promise<void> {
  try {
    const session = getSession(sessionID);
    if (!session) return;

    if (session.parentID) {
      const parent = getSession(session.parentID);
      if (parent) {
        await saveSessionToFile(session.parentID, client, directory, saveDir, globalSaveDir);
      }
      return;
    }

    const response = await client.session.messages({
      path: { id: sessionID },
      query: { directory },
    });

    const rawMessages = response.data || [];
    const messages = await convertMessages(rawMessages);

    if (messages.length === 0) {
      return;
    }

    let title = session.title;
    if (!title || title.startsWith('New-session-') || title.startsWith('New session')) {
      const firstUserMessage = messages.find((m) => m.role === 'user');
      if (firstUserMessage) {
        const firstTextPart = firstUserMessage.parts.find(
          (p): p is { type: 'text'; text: string } =>
            p.type === 'text' && 'text' in p
        );
        if (firstTextPart) {
          title = extractTopicFromMessage(
            firstTextPart.text,
            DEFAULT_CONFIG.maxTopicLength
          );
          updateSessionTitle(sessionID, title);
        }
      }
    }

    if (!session.filePath) {
      const filename = generateFilename(title || 'untitled', session.createdAt, DEFAULT_CONFIG);
      session.filePath = join(saveDir, filename);
    }

    const children = getChildSessions(sessionID);
    const childData: ChildSessionData[] = await Promise.all(
      children.map(async (child) => {
        const childResponse = await client.session.messages({
          path: { id: child.id },
          query: { directory },
        });
        const childMessages = await convertMessages(childResponse.data || []);
        return {
          title: child.title,
          createdAt: child.createdAt,
          messages: childMessages,
        };
      })
    );

    await processImagesInMessages(messages, session.filePath, title, session.createdAt, globalSaveDir);
    for (const child of childData) {
      await processImagesInMessages(child.messages, session.filePath, title, session.createdAt, globalSaveDir);
    }

    const content = formatSession(
      title,
      session.createdAt,
      messages,
      childData
    );
    await writeSessionFile(session.filePath, content);

    if (globalSaveDir) {
      await writeToSecondaryLocation(session.filePath, globalSaveDir, content);
    }
  } catch (error) {
    console.error(`[autosave] Error saving session ${sessionID}:`, error);
  }
}

async function convertMessages(rawMessages: RawMessage[]): Promise<MessageData[]> {
  return rawMessages.map((msg) => {
    const rawParts = (msg as unknown as { parts?: RawPart[] }).parts || [];
    return {
      id: msg.id,
      role: msg.role,
      parts: rawParts.map(convertPart),
      createdAt: msg.time?.created || Date.now(),
    };
  });
}

async function processImagesInMessages(
  messages: MessageData[],
  mdFilePath: string,
  sessionTitle: string,
  createdAt: Date,
  globalSaveDir: string | null
): Promise<void> {
  let imageIndex = 0;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'file' && 'url' in part && 'mime' in part) {
        const filePart = part as { type: 'file'; url: string; mime: string; localPath?: string };
        if (filePart.mime.startsWith('image/') && isBase64ImageUrl(filePart.url)) {
          const localPath = await saveImageFromBase64(filePart.url, mdFilePath, sessionTitle, createdAt, imageIndex);
          if (localPath) {
            filePart.localPath = localPath;

            if (globalSaveDir) {
              await saveImageToSecondaryLocation(filePart.url, globalSaveDir, sessionTitle, createdAt, imageIndex);
            }

            imageIndex++;
          }
        }
      }
    }
  }
}

function convertPart(raw: RawPart): PartData {
  switch (raw.type) {
    case 'text':
      return { type: 'text', text: raw.text || '' };
    case 'tool':
      return {
        type: 'tool',
        tool: raw.tool || 'unknown',
        state: {
          status: raw.state?.status || 'unknown',
          input: raw.state?.input,
          output: raw.state?.output,
          title: raw.state?.title,
          error: raw.state?.error,
        },
      };
    case 'file':
      return {
        type: 'file',
        filename: raw.filename,
        url: raw.url || '',
        mime: raw.mime || 'application/octet-stream',
      };
    case 'reasoning':
      return { type: 'reasoning', text: raw.text || '' };
    default:
      return { type: raw.type };
  }
}

export default plugin;
