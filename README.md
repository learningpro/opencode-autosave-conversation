# opencode-autosave-conversation

Automatically save your OpenCode conversations to markdown files.

## Features

- Automatic file creation when you start a new conversation
- Auto-saves when the session becomes idle (silent execution, no console output)
- Files organized by timestamp and topic: `YYYYMMDD-HH-MM-SS-topic.md`
- Images saved as separate files instead of base64 (keeps markdown clean)
- Full tool call details preserved (inputs and outputs)
- Child sessions (subagent tasks) inlined within parent files
- Clean, readable markdown format
- UTF-8 support for Chinese and other Unicode content
- **Global backup**: Conversations also saved to `~/.conversations/{project_name}/`

## Installation

```bash
npm install -g opencode-autosave-conversation
```

## Configuration

Add the plugin to your `opencode.json` (project-level or `~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["opencode-autosave-conversation"]
}
```

For local development, use the `file://` protocol:

```json
{
  "plugin": ["file:///path/to/opencode-autosave-conversation"]
}
```

### Environment Variables

You can customize save locations via environment variables:

| Variable | Description | Default |
|---|---|---|
| `OPENCODE_AUTOSAVE_DIR` | Local save directory (relative to project root, or absolute path). Set to `false` to disable local saves. | `./conversations` |
| `OPENCODE_AUTOSAVE_GLOBAL_DIR` | Global (secondary) save base directory. The project name is appended as a subdirectory automatically. Set to `false` to disable global saves. | `~/.conversations` |

**Examples:**

Save only to a global `~/Notes/conversations/` directory (no local project copies):

```bash
OPENCODE_AUTOSAVE_DIR=false \
OPENCODE_AUTOSAVE_GLOBAL_DIR=~/Notes/conversations \
opencode
```

Save locally to a custom directory:

```bash
OPENCODE_AUTOSAVE_DIR=.opencode/history \
opencode
```

Disable all saving:

```bash
OPENCODE_AUTOSAVE_DIR=false \
OPENCODE_AUTOSAVE_GLOBAL_DIR=false \
opencode
```

You can set these permanently in your shell profile (e.g. `~/.zshrc`, `~/.bashrc`).

## Usage

Once installed, the plugin automatically:

1. Creates a `./conversations/` directory in your project (unless disabled via `OPENCODE_AUTOSAVE_DIR=false`)
2. Creates a new markdown file when you start a conversation
3. Saves all messages when the session becomes idle (2 second debounce)
4. Saves images to `./conversations/images/` directory
5. Includes child session (subagent) content inline in the parent file
6. **Mirrors all saves to `~/.conversations/{project_name}/`** for global backup (configurable via `OPENCODE_AUTOSAVE_GLOBAL_DIR`)

No configuration needed - just install and start chatting! Customize save locations with environment variables if desired.

## File Naming

### Markdown Files

Format: `YYYYMMDD-HH-MM-SS-topic.md`

- **Date/Time**: When the conversation started (with hyphens between hours, minutes, seconds)
- **Topic**: Extracted from your first message (max 30 characters)

Examples:
- `20250129-10-30-45-implement-authentication.md`
- `20250129-14-22-30-fix-bug-in-parser.md`

### Image Files

Format: `YYYYMMDD-HH-MM-SS-topic-index.ext`

Images are saved to `./conversations/images/` directory:
- `20250129-10-30-45-implement-authentication-0.png`
- `20250129-10-30-45-implement-authentication-1.jpg`

## Output Format

~~~~markdown
# Session: Implement user authentication

**Created:** 2025-01-29 10:30:45

---

## Conversation

### User
*2025-01-29 10:30:45*

Help me implement user authentication for my app

![screenshot](images/20250129-10-30-45-implement-authentication-0.png)

### Assistant
*2025-01-29 10:30:50*

I'll help you implement user authentication. Let me first check your current setup.

#### Tool: Read
**Status:** completed

**Input:**
```json
{
  "filePath": "src/app.ts"
}
```

**Output:**
```
import express from 'express';
const app = express();
// ... file content
```

Based on what I see, I recommend...

---

## Child Sessions

### Subagent: Code Review
*Started: 2025-01-29 10:35:00*

#### User
*2025-01-29 10:35:00*

Review the authentication implementation

#### Assistant
*2025-01-29 10:35:10*

The implementation looks good...
~~~~

## Directory Structure

Conversations are saved to two locations (both configurable):

**Primary (project-local) — `OPENCODE_AUTOSAVE_DIR`:**
```
your-project/
├── conversations/
│   ├── images/
│   │   ├── 20250129-10-30-45-topic-0.png
│   │   └── 20250129-10-30-45-topic-1.jpg
│   ├── 20250129-10-30-45-implement-auth.md
│   └── 20250129-14-22-30-fix-bug.md
└── ...
```

**Global backup — `OPENCODE_AUTOSAVE_GLOBAL_DIR`:**
```
~/.conversations/
└── your-project/
    ├── images/
    │   ├── 20250129-10-30-45-topic-0.png
    │   └── 20250129-10-30-45-topic-1.jpg
    ├── 20250129-10-30-45-implement-auth.md
    └── 20250129-14-22-30-fix-bug.md
```

Both locations contain identical content. The global backup allows you to access all your conversations across different projects from a single location. Either location can be disabled independently.

## Troubleshooting

### Files not being created

1. Check that the plugin is listed in your `opencode.json`
2. Verify the project directory is writable

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
