import type {
  MessageData,
  PartData,
  TextPartData,
  ToolPartData,
  FilePartData,
  ReasoningPartData,
  ChildSessionData,
} from './types.js';

export function formatSession(
  title: string,
  createdAt: Date,
  messages: MessageData[],
  childSessions: ChildSessionData[]
): string {
  const lines: string[] = [];

  lines.push(`# Session: ${title}`);
  lines.push('');
  lines.push(`**Created:** ${formatTimestamp(createdAt)}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Conversation');
  lines.push('');

  for (const message of messages) {
    lines.push(formatMessage(message));
    lines.push('');
  }

  if (childSessions.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Child Sessions');
    lines.push('');

    for (const child of childSessions) {
      lines.push(formatChildSession(child));
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function formatMessage(message: MessageData): string {
  const lines: string[] = [];
  const roleEmoji = message.role === 'user' ? '👤' : '🤖';
  const roleLabel = message.role === 'user' ? 'User' : 'Assistant';

  lines.push(`### ${roleEmoji} ${roleLabel}`);
  lines.push(`*${formatTimestamp(new Date(message.createdAt))}*`);
  lines.push('');

  for (const part of message.parts) {
    const formattedPart = formatPart(part);
    if (formattedPart) {
      lines.push(formattedPart);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

export function formatPart(part: PartData): string {
  if (part.type === 'text' && 'text' in part) {
    return formatTextPart(part as TextPartData);
  }
  if (part.type === 'tool' && 'tool' in part && 'state' in part) {
    return formatToolPart(part as ToolPartData);
  }
  if (part.type === 'file' && 'url' in part && 'mime' in part) {
    return formatFilePart(part as FilePartData);
  }
  if (part.type === 'reasoning' && 'text' in part) {
    return formatReasoningPart(part as ReasoningPartData);
  }
  return `*[${part.type} part]*`;
}

export function formatTextPart(part: TextPartData): string {
  return part.text;
}

export function formatToolPart(part: ToolPartData): string {
  const lines: string[] = [];
  const { tool, state } = part;

  lines.push(`#### 🔧 Tool: ${tool}`);
  lines.push(`**Status:** ${state.status}`);

  if (state.title) {
    lines.push(`**Title:** ${state.title}`);
  }

  if (state.input && Object.keys(state.input).length > 0) {
    lines.push('');
    lines.push('**Input:**');
    lines.push('```json');
    lines.push(JSON.stringify(state.input, null, 2));
    lines.push('```');
  }

  if (state.output) {
    lines.push('');
    lines.push('**Output:**');
    lines.push('```');
    lines.push(state.output);
    lines.push('```');
  }

  if (state.error) {
    lines.push('');
    lines.push('**Error:**');
    lines.push('```');
    lines.push(state.error);
    lines.push('```');
  }

  return lines.join('\n');
}

export function formatFilePart(part: FilePartData): string {
  const filename = part.filename || 'unnamed';

  if (part.localPath && part.mime.startsWith('image/')) {
    return `![${filename}](${part.localPath})`;
  }

  const lines: string[] = [];
  lines.push(`📁 **File:** ${filename}`);
  lines.push(`- MIME: ${part.mime}`);
  if (!part.url.startsWith('data:')) {
    lines.push(`- URL: ${part.url}`);
  }

  return lines.join('\n');
}

export function formatReasoningPart(part: ReasoningPartData): string {
  const lines: string[] = [];

  lines.push('💭 **Reasoning:**');
  lines.push('');
  lines.push('<details>');
  lines.push('<summary>Click to expand reasoning</summary>');
  lines.push('');
  lines.push(part.text);
  lines.push('');
  lines.push('</details>');

  return lines.join('\n');
}

export function formatChildSession(child: ChildSessionData): string {
  const lines: string[] = [];

  lines.push(`### 📦 Subagent: ${child.title}`);
  lines.push(`*Started: ${formatTimestamp(child.createdAt)}*`);
  lines.push('');

  for (const message of child.messages) {
    const roleEmoji = message.role === 'user' ? '👤' : '🤖';
    const roleLabel = message.role === 'user' ? 'User' : 'Assistant';

    lines.push(`#### ${roleEmoji} ${roleLabel}`);
    lines.push(`*${formatTimestamp(new Date(message.createdAt))}*`);
    lines.push('');

    for (const part of message.parts) {
      const formattedPart = formatPart(part);
      if (formattedPart) {
        lines.push(formattedPart);
        lines.push('');
      }
    }
  }

  return lines.join('\n').trim();
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function extractTopicFromMessage(messageText: string, maxLength: number): string {
  const cleaned = messageText
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned || 'untitled';
  }

  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.5) {
    return truncated.substring(0, lastSpace);
  }

  return truncated;
}
