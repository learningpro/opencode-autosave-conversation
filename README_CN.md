# opencode-autosave-conversation

自动将 OpenCode 对话记录保存为 Markdown 文件。

## 功能特性

- 开始新对话时自动创建文件
- 会话空闲时自动保存（静默执行，无控制台输出）
- 文件按时间戳和主题命名：`YYYYMMDD-HH-MM-SS-主题.md`
- 图片保存为独立文件，而非 base64（保持 Markdown 简洁）
- 完整保留工具调用详情（输入和输出）
- 子会话（subagent 任务）内联在父文件中
- 简洁易读的 Markdown 格式
- 支持中文及其他 Unicode 内容

## 安装

```bash
npm install -g opencode-autosave-conversation
```

## 配置

在 `opencode.json`（项目级或 `~/.config/opencode/opencode.json`）中添加插件：

```json
{
  "plugin": ["opencode-autosave-conversation"]
}
```

本地开发时，使用 `file://` 协议：

```json
{
  "plugin": ["file:///path/to/opencode-autosave-conversation"]
}
```

## 使用方法

安装后，插件会自动：

1. 在项目中创建 `./conversations/` 目录
2. 开始对话时创建新的 Markdown 文件
3. 会话空闲时保存所有消息（2 秒防抖）
4. 将图片保存到 `./conversations/images/` 目录
5. 将子会话内容内联到父文件中

无需配置 - 安装即用！

## 文件命名

### Markdown 文件

格式：`YYYYMMDD-HH-MM-SS-主题.md`

- **日期/时间**：对话开始时间（时、分、秒之间用连字符分隔）
- **主题**：从你的第一条消息中提取（最多 30 个字符）

示例：
- `20250129-10-30-45-实现用户认证.md`
- `20250129-14-22-30-修复解析器bug.md`

### 图片文件

格式：`YYYYMMDD-HH-MM-SS-主题-序号.扩展名`

图片保存到 `./conversations/images/` 目录：
- `20250129-10-30-45-实现用户认证-0.png`
- `20250129-10-30-45-实现用户认证-1.jpg`

## 输出格式

~~~~markdown
# Session: 实现用户认证

**Created:** 2025-01-29 10:30:45

---

## Conversation

### User
*2025-01-29 10:30:45*

帮我实现用户认证功能

![screenshot](images/20250129-10-30-45-实现用户认证-0.png)

### Assistant
*2025-01-29 10:30:50*

我来帮你实现用户认证。让我先检查一下当前的项目结构。

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
// ... 文件内容
```

根据我看到的内容，我建议...

---

## Child Sessions

### Subagent: Code Review
*Started: 2025-01-29 10:35:00*

#### User
*2025-01-29 10:35:00*

审查认证实现

#### Assistant
*2025-01-29 10:35:10*

实现看起来不错...
~~~~

## 目录结构

```
your-project/
├── conversations/
│   ├── images/
│   │   ├── 20250129-10-30-45-主题-0.png
│   │   └── 20250129-10-30-45-主题-1.jpg
│   ├── 20250129-10-30-45-实现认证.md
│   └── 20250129-14-22-30-修复bug.md
└── ...
```

## 常见问题

### 文件没有创建

1. 检查插件是否已添加到 `opencode.json`
2. 确认项目目录有写入权限

### 内容缺失

- 内容在会话空闲时保存，不是立即保存
- 发送消息后等待 2-3 秒
- 会话结束/删除时也会保存内容

### 子会话没有出现

- 子会话内联在父会话的文件中
- 它们出现在文件底部的 "Child Sessions" 部分
- 子会话不会单独创建文件

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 类型检查
npm run typecheck

# 代码检查
npm run lint
```

## 许可证

MIT
