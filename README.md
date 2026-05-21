<div align="center">

<img src="logo/中转.svg" width="120" alt="Claude 中转切换器" />

# Claude 中转切换器

<p>
  <img src="https://img.shields.io/badge/本地零阻力-008080?style=for-the-badge" alt="本地零阻力" />
  <img src="https://img.shields.io/badge/上游随手换-D81E06?style=for-the-badge" alt="上游随手换" />
  <img src="https://img.shields.io/badge/桌面端原生-000080?style=for-the-badge" alt="桌面端原生" />
</p>

[![Version](https://img.shields.io/badge/version-0.1.2-orange.svg)](https://github.com/2270525352/claude-cowork-switch/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**给 Claude Desktop 装一个永远只指向 `127.0.0.1:8787` 的桥，背后想接哪条上游就接哪条。**

[为什么需要它](#为什么需要它) · [快速上手](#快速上手) · [它会自动做什么](#它会自动做什么) · [配置上游](#配置上游) · [常见问题](#常见问题) · [发版到-github-releases](#发版到-github-releases)

</div>

---

## 为什么需要它

Claude Desktop 从 2026 年开始把 3rd-party inference 的 `inferenceGatewayBaseUrl` 校验收紧——必须 HTTPS，只对 `127.0.0.1` / `localhost` 网开 loopback HTTP 一面。这意味着你**没法**直接把 `http://198.51.x.x:3456` 这类公网代理填进 Claude Desktop，但跑一个本地 Gateway 中转完全合规。

这个工具就是那个 Gateway，自带一个能切渠道、能自我修复、能不依赖 cc-switch 也能跑的控制面板。

<details>
<summary><b>1. 一次配置，永久生效</b></summary>

Claude Desktop 只需要被指向 `http://127.0.0.1:8787` 一次。之后所有"换 key、换 base URL、换模型"的动作都在这个 App 的 UI 里完成，Claude 那边毫无感知。

- `inferenceProvider: gateway`，`inferenceGatewayAuthScheme: bearer`，`inferenceModels` 自动按官方模型清单写入（4 个 Claude 4.x 主力）。
- 写入前自动备份原 3P 配置到 `Claude-3p/backups/<timestamp>/`。
- 切渠道无需重启 Claude，下一条消息立刻走新上游。

</details>

<details>
<summary><b>2. 装了 cc-switch 自动接管，没装也能直接用</b></summary>

读 `~/.cc-switch/cc-switch.db` + `settings.json` + `~/.claude/profiles/*.json`，cc-switch 里已有的所有 Anthropic / OpenAI 兼容渠道一键全列出来；没装 cc-switch 的话，UI 顶部的 **添加渠道** 按钮可以直接填 baseUrl + apiKey + 模型清单，存在本地 `custom-providers.json` 里。

- cc-switch 里的 currentProviderClaude 变化会被 settings.json 的 mtime 自动同步过来。
- 自定义渠道与 cc-switch 渠道并列展示，删改互不影响。
- API key 永远不会通过 `/api/providers` 返回前端，只在 Gateway 内部转发时用。

</details>

<details>
<summary><b>3. 一键启用 + 自我修复，第一次双击就能跑</b></summary>

启动时检测 Claude Desktop 是不是装了、3P 配置在不在、key 跟 Gateway 是不是一致；任何一项不对，**自动写好磁盘配置**，顶部黄色 banner 提醒"点重启 Claude 让其生效"。整个流程不需要你打开任何隐藏文件夹。

- "一键启用"按钮顺序跑：写 3P 配置 → 重启 Claude → 等待进程起来 → 探测上游可用性。
- 4 个状态点常驻顶栏：**Gateway / 3P 配置 / Claude 进程 / 活跃通道**，绿色才放心。
- 切渠道时缺 API key 会弹确认；探测失败时给"强制切换"逃生通道。

</details>

<details>
<summary><b>4. 支持中文 / 英文实时切换</b></summary>

顶部 `中文 / EN` 切换按钮，所有 UI 文本、状态徽章、错误提示、模态对话框文案都接进了 i18n 字典，选择记在 `localStorage`，下次进入沿用。默认按 `navigator.language` 判断。

</details>

## 快速上手

<details open>
<summary><b>桌面版（macOS / Windows / Linux）</b></summary>

去 [Releases](https://github.com/2270525352/claude-cowork-switch/releases) 下载对应平台的安装包：

- macOS：`.dmg`（含 Intel / Apple Silicon）或 `.zip`
- Windows：NSIS 安装版 / portable 单文件版
- Linux：`.AppImage` / `.deb` / `.tar.gz`

双击安装并运行。系统托盘 / 菜单栏会出现一个红色 中转 图标，点开它的"显示控制面板"或者直接打开浏览器 `http://127.0.0.1:8787` 也能看到 UI。

> **macOS 首次打开**：本项目暂时没有 Apple Developer ID 证书，所以从 Releases 下载下来的 `.dmg` / `.zip` 默认会被 Gatekeeper 拦下、弹"已损坏，移到废纸篓"。文件其实是好的，只是没付费签名。装完 App 后执行一次下面这条命令清掉系统加的隔离标记即可，之后双击就能开：
>
> ```bash
> xattr -cr "/Applications/Claude 中转切换器.app"
> ```
>
> 也可以在挂载 DMG 之前先给安装包本身清标记：`xattr -cr ~/Downloads/claude-cowork-switch-*.dmg`。

</details>

<details>
<summary><b>开发 / 命令行</b></summary>

```bash
git clone https://github.com/2270525352/claude-cowork-switch.git
cd claude-cowork-switch
npm install
npm start                # 仅起 Gateway，默认 127.0.0.1:8787
npm run app:dev          # Electron 桌面版（带 UI、托盘、自动配置）
npm test                 # smoke 测试
```

国内网络下推荐使用镜像：

```bash
npm install --registry=https://registry.npmmirror.com
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

</details>

## 它会自动做什么

打开 App 后**无需任何点击**，它会：

| 时机 | 动作 | 触发条件 |
|---|---|---|
| 启动 Gateway | 监听 `127.0.0.1:8787` | 永远 |
| 检测 Claude 3P 配置 | 缺失 / key 不匹配 / 模式不是 3p 时自动写入 | 启动一次，UI banner 提示重启 |
| 同步 cc-switch 当前渠道 | `settings.json` mtime 变化时同步过来 | 每次刷新 |
| 接受双重认证 | 同时认 Gateway 自身 key 和 Claude Desktop 内部 OAuth bearer (`~/.claude/.credentials.json`) | 自动 |

唯一需要你手动做的：第一次写完 3P 配置后**点一次 "重启 Claude"**，让它重新加载磁盘配置。之后切换渠道完全不需要重启。

## 配置上游

<details open>
<summary><b>方案 A：通过 cc-switch（推荐）</b></summary>

在 [cc-switch](https://github.com/farion1231/cc-switch) 里加好渠道，这个 App 自动读取：

```text
~/.cc-switch/cc-switch.db           // 主要数据源
~/.cc-switch/settings.json          // 当前活跃渠道（claude / codex 分开）
~/.cc-switch/keys.json              // 兜底 key 来源
~/.claude/profiles/*.json           // claude profile
```

支持的 cc-switch app type：

- `claude` → 走 Anthropic Messages API
- `codex` → 走 OpenAI Chat Completions，自动转换为 Anthropic Messages 协议
- `hermes`（`api_mode: anthropic_messages`）→ 走 Anthropic 路径
- `gemini`（暂不支持，UI 折叠在"停用通道"区）

</details>

<details>
<summary><b>方案 B：在 UI 里直接添加（无需 cc-switch）</b></summary>

点顶部 **添加渠道** 按钮，填：

| 字段 | 例子 |
|---|---|
| 名称 | `My Anthropic Proxy` |
| 协议 | Anthropic Messages API（或 OpenAI Chat Completions） |
| Base URL | `https://api.example.com` 或 `http://1.2.3.4:3456` |
| API Key | `sk-...` |
| 模型列表 | 每行一个，第一项作为默认 |

存到 `~/Library/Application Support/claude-cowork-switch/custom-providers.json`（其他平台对应路径）。API key 仅在转发时使用，不会通过任何接口返回前端。

</details>

<details>
<summary><b>方案 C：环境变量微调</b></summary>

```bash
# 网络层
HOST=127.0.0.1
PORT=8787

# Gateway 自身的 bridge key；未设则启动时随机生成一次
BRIDGE_API_KEY=ccs_xxxx

# Anthropic 兼容渠道的默认模型（仅在渠道也没声明模型时兜底）
DEFAULT_ANTHROPIC_MODEL=claude-sonnet-4

# 模型清单来源：auto（默认） / official（强制官方）/ provider（强制 cc-switch）
CLAUDE_GATEWAY_MODEL_SOURCE=auto

# 自定义官方模型清单
CLAUDE_GATEWAY_OFFICIAL_MODELS=claude-sonnet-4-6[1m],claude-opus-4-7[1m],claude-opus-4-6[1m],claude-haiku-4-5-20251001

# 把状态目录搬到别处（很少需要）
CCS_DATA_DIR=/path/to/dir
CCSWITCH_HOME=/path/to/.cc-switch
```

</details>

<details>
<summary><b>状态文件落点</b></summary>

CLI 模式（`npm start`）和 Electron 模式共享同一份状态目录，避免 bridge key 漂移：

- macOS：`~/Library/Application Support/claude-cowork-switch/`
- Windows：`%APPDATA%\claude-cowork-switch\`
- Linux：`~/.config/claude-cowork-switch/`

里面有：
- `state.json` — bridge key、活跃渠道 ID、模型来源、cc-switch settings mtime
- `custom-providers.json` — 用户自建渠道

</details>

## API & 端点

App 内部前端用的端点，可以让脚本 / 其他工具直接调：

```text
GET    /api/providers              # 渠道列表（分组 + 别名展开）
POST   /api/active                 # 切换活跃渠道
POST   /api/settings               # 改 modelSource / healthProbeEnabled
GET    /api/logs?since=<id>        # 请求日志增量

GET    /api/providers/custom       # 自定义渠道 CRUD
POST   /api/providers/custom
PATCH  /api/providers/custom?id=…
DELETE /api/providers/custom?id=…

GET    /api/claude-desktop/status  # 3P 配置当前状态
POST   /api/claude-desktop/apply   # 写 3P 配置（含备份）
POST   /api/claude-desktop/restart # quit + open -a Claude

GET    /api/setup/status           # 4 项 checkpoint 综合状态
POST   /api/setup                  # 一键启用全链路

POST   /v1/messages                # Anthropic Messages（Claude Desktop 实际调用入口）
GET    /v1/models                  # 模型列表
GET    /health                     # 健康检查
```

## 常见问题

<details>
<summary><b>Q: Claude Desktop 报 <code>401 Invalid Gateway API key</code></b></summary>

绝大多数情况是 Claude Desktop 启动时缓存的 key 与磁盘当前 key 不一致。点 UI 上的"重启 Claude"按钮，让 Claude 重新加载 3P 配置即可。

如果重启后还是 401：

1. 看顶部 **3P 配置** 状态点是不是绿（`config.keyMatches: true`）。
2. 看 **请求日志** 面板里 401 那行的 `err=auth fail: sent=…XXXX expected=…YYYY`。
3. 如果 `sent` 是某个不是 `ccs_` 开头的字符串，说明 Claude Desktop 在 3P 模式下用了它的账号 OAuth bearer——本工具已经默认接受 `~/.claude/.credentials.json` 里的 `claudeAiOauth.accessToken`，理论上不会再 401，遇到的话欢迎提 issue。

</details>

<details>
<summary><b>Q: 模型下拉只有 1 个 <code>claude-sonnet-4</code></b></summary>

cc-switch 渠道如果没显式配 `ANTHROPIC_MODEL` 等字段，会默认填官方 4 个 Claude 4.x 模型。如果你看到只有一个，多半是你装的是旧版本，升级到 0.1.1+ 即可。或者把 UI 里"模型来源"切换为 `官方模型 (official)` 强制走官方清单。

</details>

<details>
<summary><b>Q: 切渠道后立刻报"无效 API key"</b></summary>

UI 上的状态徽章如果显示 `缺密钥`（黄色），说明这条 cc-switch 渠道在 `settings_config` 里没有 `ANTHROPIC_AUTH_TOKEN` / `api_key`。点切换时会弹"继续切换"确认。要彻底解决就回 cc-switch 把 key 补上，或者删了这条改用 UI 的"添加渠道"重建。

</details>

<details>
<summary><b>Q: 黄色 banner "已自动写入 Claude 3P 配置" 反复出现</b></summary>

通常是磁盘上的 3P 配置被外部工具改回去了——例如手动改过 `Claude-3p/configLibrary/<id>.json`，或者另一个 cc-switch 派生工具也在写同一个文件。

定位方法：观察 `_meta.json` 里 `appliedId` 是不是仍然是 `7ca42a57-9f05-4f8a-9b7d-8d3fa412cc51`（本工具的固定 ID），key 是不是仍然等于 UI 里 Bridge Key。

</details>

<details>
<summary><b>Q: 不想自动重启 Claude / 不想自动写配置</b></summary>

自动写配置只在"缺失 / key 不匹配 / 模式不是 3p"三种情况触发，且**绝不自动重启 Claude**——重启永远是手动按钮。如果你完全不想要自动写入，目前可以通过删除 `Claude-3p/configLibrary/<id>.json` 然后断开网络让 `apply` 失败来回避；后续可以加一个 `state.json` 开关。

</details>

<details>
<summary><b>Q: macOS 打开提示"已损坏，移到废纸篓"</b></summary>

不是真的坏了，是 Gatekeeper 的统一拒绝文案。本项目目前没有 Apple Developer ID 证书（$99/年），electron-builder 只能做 ad-hoc 签名；浏览器下载下来又会自动打 `com.apple.quarantine` 标记，两者叠加就被拦了。

一次性清掉隔离标记即可：

```bash
# 已经拖进 Applications 的话：
xattr -cr "/Applications/Claude 中转切换器.app"

# 或者在挂载 DMG 之前先清安装包：
xattr -cr ~/Downloads/claude-cowork-switch-*.dmg
```

执行后双击直接打开，不会再弹任何 Gatekeeper 警告。Intel Mac 和 Apple Silicon 用同一条命令。

</details>

<details>
<summary><b>Q: cc-switch 渠道里有几条同样的 baseUrl，UI 是怎么处理的？</b></summary>

按 `(appType, baseUrl)` 折叠成一组：主行选优先级最高的（`cc-current` > 用户上次选过的 > 有 key > 字典序），其他渠道在主行展开成"+N 个别名"列表。任何一个的 key / 名字 / `is_current` 变了都重新选主行。

</details>

## 发版到 GitHub Releases

```bash
npm version patch          # 0.1.x → 0.1.(x+1)，自动建 v* tag
git push --follow-tags     # 触发 .github/workflows/release.yml
```

CI 会并发跑 3 个 runner：

- `macos-latest` → `.dmg` + `.zip`（intel + apple silicon）
- `windows-latest` → NSIS 安装包 + portable
- `ubuntu-latest` → `.AppImage` + `.deb` + `.tar.gz`

每个 runner 都用 `electron-builder --publish always` + 内置 `GITHUB_TOKEN`，自动把产物挂到 `vX.Y.Z` 的 Release 上。

仓库 Actions 页点 "Run workflow" 也可以触发：这种**只生成 workflow artifact，不建 Release**，适合调试构建脚本时用。

## 图标资源

源文件 `logo/中转.svg`，`scripts/build-icons.mjs` 把它栅格化成：

- `build/icons/{16,24,32,48,64,128,256,512,1024}x*.png`（Linux + Electron tray + Web UI）
- `build/icon.ico`（Windows，多尺寸）
- `build/icon.icns`（macOS，通过系统 `iconutil` 生成）
- `public/logo.svg`（Web UI brand 直接使用）

本地手动重新生成：

```bash
npm run build:icons
```

## 致谢

- [cc-switch](https://github.com/farion1231/cc-switch) 提供了渠道数据库的事实标准
- [electron-builder](https://www.electron.build/) 负责跨平台打包与 GitHub Releases 发布
- [@resvg/resvg-js](https://github.com/yisibl/resvg-js) 把 SVG 栅格化到平台原生图标

## License

MIT
