import type { SessionInfo } from './types.js';

const sessions = new Map<string, SessionInfo>();
const pendingChildren = new Map<string, string[]>();

export function createSession(
  id: string,
  title: string,
  filePath: string,
  parentID?: string
): SessionInfo {
  const session: SessionInfo = {
    id,
    parentID,
    title,
    filePath,
    createdAt: new Date(),
    childSessionIDs: [],
  };

  sessions.set(id, session);

  if (parentID) {
    const parent = sessions.get(parentID);
    if (parent) {
      parent.childSessionIDs.push(id);
    } else {
      const pending = pendingChildren.get(parentID) || [];
      pending.push(id);
      pendingChildren.set(parentID, pending);
    }
  } else {
    const pending = pendingChildren.get(id);
    if (pending) {
      session.childSessionIDs.push(...pending);
      pendingChildren.delete(id);
    }
  }

  return session;
}

export function getSession(id: string): SessionInfo | undefined {
  return sessions.get(id);
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

export function getChildSessions(parentID: string): SessionInfo[] {
  const parent = sessions.get(parentID);
  if (!parent) {
    return [];
  }

  return parent.childSessionIDs
    .map((childID) => sessions.get(childID))
    .filter((session): session is SessionInfo => session !== undefined);
}

export function isMainSession(id: string): boolean {
  const session = sessions.get(id);
  return session ? !session.parentID : false;
}

export function getMainSessionForChild(childID: string): SessionInfo | undefined {
  const child = sessions.get(childID);
  if (!child || !child.parentID) {
    return undefined;
  }
  return sessions.get(child.parentID);
}

export function updateSessionTitle(id: string, title: string): void {
  const session = sessions.get(id);
  if (session) {
    session.title = title;
  }
}

export function getAllMainSessions(): SessionInfo[] {
  return Array.from(sessions.values()).filter((session) => !session.parentID);
}

export function clearAllSessions(): void {
  sessions.clear();
  pendingChildren.clear();
}
