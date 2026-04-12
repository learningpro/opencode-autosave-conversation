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
 * Configurable via environment variables:
 *
 *   OPENCODE_AUTOSAVE_DIR        — Local save directory (relative to project root,
 *                                   or absolute path). Set to "false" to disable.
 *                                   Default: "./conversations"
 *
 *   OPENCODE_AUTOSAVE_GLOBAL_DIR — Global (secondary) save directory. Accepts an
 *                                   absolute path. The project name is appended
 *                                   automatically as a subdirectory. Set to "false"
 *                                   to disable. Default: "~/.conversations"
 */
export interface PluginConfig {
  /** Directory to save conversations (relative to project root, or absolute) */
  saveDirectory: string;

  /** Whether local (primary) saving is enabled */
  localEnabled: boolean;

  /** Global save base directory (project name is appended as subdirectory) */
  globalSaveDirectory: string;

  /** Whether global (secondary) saving is enabled */
  globalEnabled: boolean;

  /** Maximum characters for topic portion of filename */
  maxTopicLength: number;

  /** Debounce delay for idle saves (milliseconds) */
  debounceMs: number;
}

const ENV_LOCAL_DIR = 'OPENCODE_AUTOSAVE_DIR';
const ENV_GLOBAL_DIR = 'OPENCODE_AUTOSAVE_GLOBAL_DIR';

function isDisabled(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.trim().toLowerCase();
  return lower === 'false' || lower === 'off' || lower === '0' || lower === 'no';
}

/**
 * Build configuration from environment variables, falling back to defaults.
 */
export function resolveConfig(): PluginConfig {
  const envLocal = process.env[ENV_LOCAL_DIR];
  const envGlobal = process.env[ENV_GLOBAL_DIR];

  return {
    saveDirectory: (!envLocal || isDisabled(envLocal)) ? './conversations' : envLocal.trim(),
    localEnabled: !isDisabled(envLocal),
    globalSaveDirectory: (!envGlobal || isDisabled(envGlobal)) ? '' : envGlobal.trim(),
    globalEnabled: !isDisabled(envGlobal),
    maxTopicLength: 30,
    debounceMs: 2000,
  };
}

/**
 * Default configuration values (no environment overrides).
 */
export const DEFAULT_CONFIG: PluginConfig = resolveConfig();

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
