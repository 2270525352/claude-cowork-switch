# Claude 中转切换器

Claude 中转切换器给 Claude Desktop 开发者模式提供稳定的本地 Gateway，并直接读取现有 `cc-switch` 渠道配置。

Claude Desktop 只需要配置一次 Gateway 地址；之后在这个 App 里切换渠道即可。

## 平台支持

- macOS：支持 Electron 跨平台版，也保留 Swift 原生菜单栏版。
- Windows：支持 Electron 桌面版，托盘后台运行。
- Linux / Ubuntu：支持 Electron 桌面版，托盘后台运行。
- CLI：所有平台都可以直接运行 `npm start` 启动 Gateway。

## 功能

- 启动 App 后自动拉起本地 Gateway：`http://127.0.0.1:8787`。
- 关闭窗口后仍在托盘 / 菜单栏后台运行。
- App 内提供“一键配置 Claude Desktop”和“重启 Claude”。
- 直接读取 `cc-switch` 配置，不需要重复填写 API Key。
- 支持 Anthropic-compatible 渠道。
- Claude-like 渠道默认使用官方 Claude 模型清单，不再猜测非官方模型名。
- 支持 OpenAI-compatible 渠道，并自动转换为 Anthropic Messages API。
- 使用 `sql.js` 跨平台读取 `cc-switch.db`，没有系统 `sqlite3` 也能运行。
- Web API 不返回渠道密钥，密钥只在本机内存中用于转发请求。

## 自动读取的位置

- `~/.cc-switch/cc-switch.db`
- `~/.cc-switch/settings.json`
- `~/.claude/profiles/*.json`
- `~/.cc-switch/keys.json`

在 Windows 上，`~` 指当前用户目录，例如 `C:\Users\you`。

## 开发运行

```bash
cd ~/Public/project/my/claude-cowork-switch
npm install
npm start
```

如果 Electron 下载慢或失败，可使用镜像源：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

测试：

```bash
npm test
```

运行跨平台桌面 App：

```bash
npm run app:dev
```

## 打包

跨平台 Electron 版：

```bash
npm run dist:mac
npm run dist:win
npm run dist:linux
```

国内网络下打包也建议加镜像源：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run dist:linux
```

产物输出到：

```text
release/
```

建议在对应系统上打包对应平台，或者使用 GitHub Actions：

```text
.github/workflows/release.yml
```

macOS Swift 原生版：

```bash
scripts/package-macos.sh
```

产物输出到：

```text
dist/Claude Cowork Switch.app
```

## Claude Desktop 配置

优先使用 App 顶部的 **一键配置 Claude Desktop**。它会自动写入：

- `Claude-3p/configLibrary/_meta.json`
- `Claude-3p/configLibrary/<配置ID>.json`
- `Claude-3p/claude_desktop_config.json`

写入前会自动备份已有配置。配置完成后点击 **重启 Claude**。

如果自动配置不可用，再手动配置：

如果 Claude Desktop 的 3P Gateway 要求 HTTPS，本地测试可先开隧道：

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

或：

```bash
ngrok http 8787
```

然后在 Claude Desktop：

1. 开启 Developer mode。
2. 进入 third-party inference / Gateway 配置。
3. Provider 选择 `Gateway`。
4. Gateway base URL 填 App 显示的地址，或隧道 HTTPS 地址。
5. Gateway API key 填 App 显示的密钥。
6. 重启 Claude Desktop。

之后只需要在 Claude 中转切换器里切换渠道。

## 环境变量

可选：

```bash
HOST=127.0.0.1
PORT=8787
BRIDGE_API_KEY=change-this
DEFAULT_ANTHROPIC_MODEL=claude-sonnet-4
CLAUDE_GATEWAY_MODEL_SOURCE=auto
CLAUDE_GATEWAY_OFFICIAL_MODELS=claude-sonnet-4-6[1m],claude-opus-4-7[1m],claude-opus-4-6[1m],claude-haiku-4-5-20251001
CCSWITCH_HOME=/Users/you/.cc-switch
```

`CLAUDE_GATEWAY_MODEL_SOURCE` 可选值：

- `auto`：默认。Claude-like 渠道使用官方 Claude 模型清单；GLM、Qwen 等非 Claude 模型保留 cc-switch 配置。
- `official`：所有 Anthropic-compatible 渠道都使用官方 Claude 模型清单。
- `provider`：完全使用 cc-switch / profile 中配置的模型。

桌面 App 会把运行状态写到系统应用数据目录：

- macOS：`~/Library/Application Support/Claude 中转切换器`
- Windows：`%APPDATA%\Claude 中转切换器`
- Linux：`~/.config/Claude 中转切换器`

开发模式下 `npm start` 默认写到项目内 `data/`，该目录已被 `.gitignore` 忽略。

## 发布到 GitHub

```bash
git init
git add .
git commit -m "Initial release"
```

不要提交本机的 `data/`、`dist/`、`release/`、日志、密钥或私有配置数据库。打包产物建议作为 GitHub Release 附件上传。
