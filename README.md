# opencode-autosave-conversation

Automatically save your OpenCode conversations to markdown files.

## Features

- Automatic file creation when you start a new conversation
- Auto-saves when the session becomes idle
- Files organized by timestamp and topic: `YYYYMMDD-HHMMSS-topic.md`
- Full tool call details preserved (inputs and outputs)
- Child sessions (subagent tasks) inlined within parent files
- Clean, readable markdown format
- UTF-8 support for Chinese and other Unicode content

## Installation

```bash
npm install opencode-autosave-conversation
```

## Configuration

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["opencode-autosave-conversation"]
}
```

Or for local development:

```json
{
  "plugin": ["file:///path/to/opencode-autosave-conversation"]
}
```

## Usage

Once installed, the plugin automatically:

1. Creates a `./conversations/` directory in your project
2. Creates a new markdown file when you start a conversation
3. Saves all messages when the session becomes idle (2 second debounce)
4. Includes child session (subagent) content inline in the parent file

No configuration needed - just install and start chatting!

## File Naming

Files are named using the format: `YYYYMMDD-HHMMSS-topic.md`

- **Date/Time**: When the conversation started
- **Topic**: Session title or first 30 characters of your first message

Examples:
- `20240115-103045-implement-authentication.md`
- `20240115-142230-fix-bug-in-parser.md`
- `20240115-163015-untitled.md`

## Output Format

```markdown
# Session: Implement user authentication

**Created:** 2024-01-15 10:30:45

---

## Conversation

### User
*2024-01-15 10:30:45*

Help me implement user authentication for my app

### Assistant
*2024-01-15 10:30:50*

I'll help you implement user authentication. Let me first check your current setup.

#### Tool: Read
**Status:** completed

**Input:**
\`\`\`json
{
  "filePath": "src/app.ts"
}
\`\`\`

**Output:**
\`\`\`
import express from 'express';
const app = express();
// ... file content
\`\`\`

Based on what I see, I recommend...

---

## Child Sessions

### Subagent: Code Review
*Started: 2024-01-15 10:35:00*

#### User
*2024-01-15 10:35:00*

Review the authentication implementation

#### Assistant
*2024-01-15 10:35:10*

The implementation looks good...
```

## Where Are Files Saved?

Conversation files are saved in the `./conversations/` directory relative to your project root (the directory where you run OpenCode).

## Troubleshooting

### Files not being created

1. Check that the plugin is listed in your `opencode.json`
2. Verify the project directory is writable
3. Look for `[autosave]` messages in the OpenCode console

### Missing content

- Content is saved on session idle, not immediately
- Wait 2-3 seconds after your last message
- Content is also saved when the session is deleted/ended

### Child sessions not appearing

- Child sessions are inlined in the parent session's file
- They appear in the "Child Sessions" section at the bottom
- Child session files are not created separately

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT
