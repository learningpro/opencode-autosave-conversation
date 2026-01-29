/**
 * Type definitions for the OpenCode Autosave Conversation plugin.
 * These types define the internal data structures used for session tracking,
 * message formatting, and plugin configuration.
 */

/**
 * Information about a tracked session.
 * Used to map session IDs to their corresponding markdown files
 * and track parent-child relationships between sessions.
 */
export interface SessionInfo {
  /** Unique session ID from OpenCode */
  id: string;

  /** Parent session ID (undefined for main sessions) */
  parentID?: string;

  /** Session title or extracted topic for filename */
  title: string;

  /** Full filesystem path to this session's markdown file */
  filePath: string;

  /** Timestamp when session was created */
  createdAt: Date;

  /** IDs of child sessions (subagent tasks) */
  childSessionIDs: string[];
}

/**
 * A formatted message ready for markdown output.
 * Contains pre-rendered content suitable for file writing.
 */
export interface FormattedMessage {
  /** Message role - user input or assistant response */
  role: 'user' | 'assistant';

  /** Fully formatted markdown content */
  content: string;

  /** Message creation timestamp */
  timestamp: Date;
}

/**
 * Plugin configuration options.
 * V1 uses hardcoded defaults; future versions may expose these.
 */
export interface PluginConfig {
  /** Directory to save conversations (relative to project root) */
  saveDirectory: string;

  /** Maximum characters for topic portion of filename */
  maxTopicLength: number;

  /** Debounce delay for idle saves (milliseconds) */
  debounceMs: number;
}

/**
 * Default configuration values for V1.
 * These are hardcoded and not user-configurable in this version.
 */
export const DEFAULT_CONFIG: PluginConfig = {
  saveDirectory: './conversations',
  maxTopicLength: 30,
  debounceMs: 2000,
};

/**
 * Child session data for inline embedding.
 * Contains the title and messages for a subagent session.
 */
export interface ChildSessionData {
  /** Child session title (agent name or description) */
  title: string;

  /** Child session creation timestamp */
  createdAt: Date;

  /** All messages from the child session */
  messages: MessageData[];
}

/**
 * Simplified message data extracted from SDK response.
 * Contains only the fields needed for formatting.
 */
export interface MessageData {
  /** Message ID */
  id: string;

  /** Message role */
  role: 'user' | 'assistant';

  /** Message parts (text, tool calls, files, etc.) */
  parts: PartData[];

  /** Creation timestamp */
  createdAt: number;
}

/**
 * Union type for message parts.
 * Supports text, tool calls, files, and reasoning parts.
 */
export type PartData =
  | TextPartData
  | ToolPartData
  | FilePartData
  | ReasoningPartData
  | OtherPartData;

/**
 * Text content part.
 */
export interface TextPartData {
  type: 'text';
  text: string;
}

/**
 * Tool execution part with full input/output details.
 */
export interface ToolPartData {
  type: 'tool';
  tool: string;
  state: {
    status: string;
    input?: Record<string, unknown>;
    output?: string;
    title?: string;
    error?: string;
  };
}

/**
 * File attachment part.
 */
export interface FilePartData {
  type: 'file';
  filename?: string;
  url: string;
  mime: string;
  /** Local path after saving base64 image to disk (relative to md file) */
  localPath?: string;
}

/**
 * Reasoning/thinking part (for reasoning models).
 */
export interface ReasoningPartData {
  type: 'reasoning';
  text: string;
}

/**
 * Catch-all for other part types we don't specifically handle.
 */
export interface OtherPartData {
  type: string;
  [key: string]: unknown;
}
