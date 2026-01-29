# 给 AI 对话装个"行车记录仪"：opencode-autosave-conversation 开发手记

> 凌晨三点，你跟 AI 聊得热火朝天，它刚帮你写完一段绝世好代码。结果手一抖，终端崩了。对话记录？没了。代码？飞了。你？裂开了。

如果你有过这种经历，那这篇文章就是为你写的。

## 痛点：AI 对话的"阅后即焚"困境

用 OpenCode 这类 AI 编程助手久了，你会发现一个尴尬的问题：**对话记录像金鱼的记忆一样短暂**。

当然，OpenCode 本身是有会话管理的，但问题在于：

1. **不够持久** —— 会话多了，旧的就被清理了
2. **不够直观** —— 想回顾某次对话？祝你在一堆 session ID 里大海捞针
3. **不够便携** —— 想把对话分享给同事或存档到知识库？没门

于是我决定造一个轮子：**opencode-autosave-conversation**。

## 设计理念：润物细无声

在动手之前，我给自己定了几条原则：

### 1. 零配置启动

安装完就能用，不需要用户填一堆配置项。毕竟，谁愿意为了"自动保存"这么简单的功能去研究配置文档呢？

### 2. 静默执行

插件在后台默默干活，不弹窗、不刷日志、不打扰用户。就像一个专业的速记员——你说话我记录，全程零存在感。

### 3. 输出要"人类可读"

保存的不是什么 JSON 数据库，而是**格式优美的 Markdown 文件**。直接用任何编辑器打开就能阅读，还能无缝接入你的笔记系统（Obsidian、Notion、语雀，随便你）。

## 核心功能一览

### 自动文件创建与命名

当你开始一段新对话，插件会自动在项目目录下创建 `conversations` 文件夹，然后按照这个格式命名文件：

```
YYYYMMDD-HH-MM-SS-话题.md
```

比如你问 AI "怎么修复这个该死的 bug"，就会生成：

```
20260129-02-30-45-怎么修复这个该死的bug.md
```

话题从你的第一条消息中自动提取，最多 30 个字符。简直就是电子版的"案发现场记录"。

### 智能防抖保存

采用 **2 秒空闲检测机制**：当你停止输入 2 秒后，插件就偷偷保存一次。

为什么是 2 秒？太短了会频繁写盘（SSD 表示不服），太长了又怕丢数据。2 秒是个甜蜜点。

### 图片独立存储

如果你在对话中发送了截图，插件**不会**把 base64 编码那一坨"乱码艺术"塞进 Markdown 里。

而是把图片单独存到 `conversations/images/` 目录，Markdown 里只留一个优雅的引用：

```markdown
![screenshot](images/20260129-02-30-45-修复bug-0.png)
```

强迫症狂喜。Git diff 也不会被一万行 base64 搞崩。

### 完整的工具调用记录

AI 助手用了什么工具、读了哪个文件、输入是什么、输出是什么——**全部记录在案**。

```markdown
#### Tool: Read
**Status:** completed

**Input:**
​```json
{
  "filePath": "src/auth.ts"
}
​```

**Output:**
​```typescript
export function validateToken(token: string) {
  // ...
}
​```
```

这意味着你可以回溯 AI 的"思考过程"，就像看侦探片一样："原来它是这样一步步找到答案的！"

### 子会话内联

如果你的 AI 助手调用了子代理（subagent），这些子会话的内容也会被记录在主文件的 **Child Sessions** 章节里。一个文件看全貌，不用满世界找碎片。

## 技术实现

代码架构很简单，四个核心模块：

```
src/
├── index.ts          # 插件入口，注册事件钩子
├── session-tracker.ts # 会话追踪器，管理会话生命周期
├── file-manager.ts    # 文件管理器，负责读写文件
└── formatter.ts       # 格式化器，把对话数据转成 Markdown
```

### 事件驱动架构

插件利用 OpenCode 的插件系统，监听三个关键事件：

| 事件 | 触发时机 | 处理逻辑 |
|------|----------|----------|
| `session.create` | 新会话创建 | 初始化文件路径，准备写入 |
| `message.update` | 消息更新 | 防抖 2 秒后保存到文件 |
| `session.delete` | 会话结束 | 最终保存，清理追踪器 |

### 防抖实现

```typescript
// 简化版防抖逻辑
const DEBOUNCE_MS = 2000;
let saveTimer: NodeJS.Timeout | null = null;

function scheduleSave(sessionId: string) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveSession(sessionId);
  }, DEBOUNCE_MS);
}
```

### Markdown 格式化

格式化器负责把 OpenCode 的消息对象转成人类可读的 Markdown。核心挑战是处理各种消息类型：

- 纯文本消息 → 直接输出
- 图片消息 → 提取 base64，保存为文件，返回引用链接
- 工具调用 → 格式化为代码块，保留输入输出

## 安装与使用

**安装：**

```bash
npm install -g opencode-autosave-conversation
```

**配置：**

在 `opencode.json`（项目级或 `~/.config/opencode/opencode.json`）中添加：

```json
{
  "plugin": ["opencode-autosave-conversation"]
}
```

没了。就这两步。比泡面还快。

## 使用场景

### 场景一：知识沉淀

三个月后，你遇到一个似曾相识的问题。与其重新问一遍 AI，不如直接搜索你的对话记录库：

```bash
grep -r "JWT 认证" ./conversations/
```

省 token，省时间，省脑子。

### 场景二：学习复盘

想学习 AI 是怎么解决某类问题的？翻开历史记录，研究它的"思路"，比看教程生动多了。这是真正的 **Learning by Observing AI**。

### 场景三：团队协作

把 `conversations/` 目录提交到 Git 仓库，同事就能看到你是怎么跟 AI 协作完成某个功能的。比写需求文档香多了。

### 场景四：甩锅现场

产品经理："这功能不是我要的啊！"

你："来，让我们看看 1 月 15 日的对话记录，第 47 行，你原话是……"

产品经理："……我先去接个电话。"

## 目录结构

最终生成的文件结构长这样：

```
your-project/
├── conversations/
│   ├── images/
│   │   ├── 20260129-10-30-45-实现认证-0.png
│   │   └── 20260129-10-30-45-实现认证-1.jpg
│   ├── 20260129-10-30-45-实现用户认证.md
│   └── 20260129-14-22-30-修复解析器bug.md
├── src/
└── ...
```

## 写在最后

这个项目的初衷很简单：**让 AI 对话不再是一次性消耗品**。

每一次与 AI 的深度交流，都是一次思维碰撞。这些碰撞的火花值得被记录下来，而不是随着会话关闭而消散。

项目已开源：[github.com/learningpro/opencode-autosave-conversation](https://github.com/learningpro/opencode-autosave-conversation)

如果你也有"对话丢失 PTSD"，不妨试试。

顺便，如果好用的话，给个 Star ⭐ 呗。毕竟，一个愿意帮你"记笔记"的工具，值得你的认可。

---

*作者：Orange*
*首发于：2026 年 1 月*
