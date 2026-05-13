import AppKit
import Foundation

struct ProvidersResponse: Decodable {
    let activeProviderId: String?
    let bridgeApiKey: String
    let providers: [Provider]
}

struct Provider: Decodable {
    let id: String
    let source: String
    let appType: String?
    let name: String
    let kind: String
    let baseUrl: String?
    let model: String?
    let models: [String]?
    let authPresent: Bool
    let compatible: Bool
    let isCcSwitchCurrent: Bool
    let notes: String?
    let active: Bool
}

final class GatewayProcess {
    let baseURL = URL(string: "http://127.0.0.1:8787")!
    private var process: Process?

    func startIfNeeded() {
        if isRunning() { return }

        guard let appRoot = locateAppRoot() else {
            showError("找不到内置的 Gateway 服务文件。")
            return
        }

        let supportDir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Claude Cowork Switch", isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: supportDir, withIntermediateDirectories: true)
        } catch {
            showError("无法创建应用数据目录：\(error.localizedDescription)")
            return
        }

        let child = Process()
        child.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        child.arguments = ["node", "src/server.mjs"]
        child.currentDirectoryURL = appRoot

        var environment = ProcessInfo.processInfo.environment
        environment["HOST"] = "127.0.0.1"
        environment["PORT"] = "8787"
        environment["CCS_DATA_DIR"] = supportDir.path
        child.environment = environment

        do {
            try child.run()
            process = child
        } catch {
            showError("无法启动 Gateway。请确认已安装 Node.js。\n\n\(error.localizedDescription)")
        }
    }

    func stopIfOwned() {
        if let process, process.isRunning {
            process.terminate()
        }
    }

    private func locateAppRoot() -> URL? {
        if let resourcePath = Bundle.main.resourcePath {
            let bundled = URL(fileURLWithPath: resourcePath)
                .appendingPathComponent("claude-cowork-switch", isDirectory: true)
            if FileManager.default.fileExists(atPath: bundled.appendingPathComponent("src/server.mjs").path) {
                return bundled
            }
        }

        let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
        if FileManager.default.fileExists(atPath: cwd.appendingPathComponent("src/server.mjs").path) {
            return cwd
        }

        return nil
    }

    private func isRunning() -> Bool {
        let semaphore = DispatchSemaphore(value: 0)
        var result = false
        let request = URLRequest(url: baseURL.appendingPathComponent("health"), timeoutInterval: 0.7)
        URLSession.shared.dataTask(with: request) { _, response, _ in
            if let http = response as? HTTPURLResponse {
                result = (200..<500).contains(http.statusCode)
            }
            semaphore.signal()
        }.resume()
        _ = semaphore.wait(timeout: .now() + 1.0)
        return result
    }

    private func showError(_ message: String) {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Claude 中转切换器"
            alert.informativeText = message
            alert.alertStyle = .warning
            alert.runModal()
        }
    }
}

final class MainWindowController: NSWindowController, NSTableViewDataSource, NSTableViewDelegate {
    private let gateway: GatewayProcess
    private var providers: [Provider] = []
    private var apiKey = ""

    private let tableView = NSTableView()
    private let statusLabel = NSTextField(labelWithString: "正在启动 Gateway...")
    private let gatewayLabel = NSTextField(labelWithString: "http://127.0.0.1:8787")
    private let apiKeyLabel = NSTextField(labelWithString: "加载中")
    private let activeLabel = NSTextField(labelWithString: "加载中")
    private let summaryLabel = NSTextField(labelWithString: "正在读取 cc-switch 配置...")
    private let useButton = NSButton(title: "切换到所选", target: nil, action: nil)

    init(gateway: GatewayProcess) {
        self.gateway = gateway
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 980, height: 620),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Claude 中转切换器"
        window.minSize = NSSize(width: 820, height: 520)
        super.init(window: window)
        buildUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func refresh() {
        gateway.startIfNeeded()
        statusLabel.stringValue = "正在刷新渠道..."
        let url = gateway.baseURL.appendingPathComponent("api/providers")
        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error {
                    self.statusLabel.stringValue = "连接失败：\(error.localizedDescription)"
                    return
                }
                guard let data, let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                    self.statusLabel.stringValue = "读取渠道失败。"
                    return
                }
                do {
                    let decoded = try JSONDecoder().decode(ProvidersResponse.self, from: data)
                    self.providers = decoded.providers
                    self.apiKey = decoded.bridgeApiKey
                    self.apiKeyLabel.stringValue = decoded.bridgeApiKey
                    self.tableView.reloadData()
                    self.updateSummary()
                } catch {
                    self.statusLabel.stringValue = "解析渠道失败：\(error.localizedDescription)"
                }
            }
        }.resume()
    }

    private func buildUI() {
        guard let contentView = window?.contentView else { return }
        contentView.wantsLayer = true
        contentView.layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor

        let root = NSStackView()
        root.orientation = .vertical
        root.spacing = 14
        root.edgeInsets = NSEdgeInsets(top: 18, left: 20, bottom: 18, right: 20)
        root.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(root)

        NSLayoutConstraint.activate([
            root.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            root.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            root.topAnchor.constraint(equalTo: contentView.topAnchor),
            root.bottomAnchor.constraint(equalTo: contentView.bottomAnchor)
        ])

        let header = NSStackView()
        header.orientation = .horizontal
        header.alignment = .centerY
        header.spacing = 12

        let titleBlock = NSStackView()
        titleBlock.orientation = .vertical
        titleBlock.spacing = 3
        let title = NSTextField(labelWithString: "Claude 中转切换器")
        title.font = .systemFont(ofSize: 20, weight: .semibold)
        let subtitle = NSTextField(labelWithString: "后台运行 Gateway，直接读取 cc-switch 渠道配置。")
        subtitle.textColor = .secondaryLabelColor
        subtitle.font = .systemFont(ofSize: 12)
        titleBlock.addArrangedSubview(title)
        titleBlock.addArrangedSubview(subtitle)

        let refreshButton = NSButton(title: "刷新", target: self, action: #selector(refreshAction))
        let configureClaudeButton = NSButton(title: "配置 Claude", target: self, action: #selector(configureClaudeDesktop))
        let restartClaudeButton = NSButton(title: "重启 Claude", target: self, action: #selector(restartClaudeDesktop))
        let copyUrlButton = NSButton(title: "复制地址", target: self, action: #selector(copyGatewayURL))
        let copyKeyButton = NSButton(title: "复制密钥", target: self, action: #selector(copyAPIKey))

        header.addArrangedSubview(titleBlock)
        header.addArrangedSubview(NSView())
        header.addArrangedSubview(configureClaudeButton)
        header.addArrangedSubview(restartClaudeButton)
        header.addArrangedSubview(refreshButton)
        header.addArrangedSubview(copyUrlButton)
        header.addArrangedSubview(copyKeyButton)

        let statusGrid = NSGridView(views: [
            [label("Gateway 地址"), gatewayLabel],
            [label("Gateway 密钥"), apiKeyLabel],
            [label("当前渠道"), activeLabel]
        ])
        statusGrid.column(at: 0).width = 96
        statusGrid.rowSpacing = 8
        statusGrid.columnSpacing = 10
        gatewayLabel.lineBreakMode = .byTruncatingMiddle
        apiKeyLabel.lineBreakMode = .byTruncatingMiddle
        activeLabel.lineBreakMode = .byTruncatingMiddle

        let summaryRow = NSStackView()
        summaryRow.orientation = .horizontal
        summaryRow.alignment = .centerY
        summaryRow.spacing = 10
        summaryLabel.textColor = .secondaryLabelColor
        statusLabel.textColor = .secondaryLabelColor
        summaryRow.addArrangedSubview(summaryLabel)
        summaryRow.addArrangedSubview(NSView())
        summaryRow.addArrangedSubview(statusLabel)

        tableView.delegate = self
        tableView.dataSource = self
        tableView.usesAlternatingRowBackgroundColors = true
        tableView.allowsMultipleSelection = false
        tableView.doubleAction = #selector(useSelectedProvider)
        tableView.target = self
        addColumn("name", "名称", 190)
        addColumn("app", "应用", 64)
        addColumn("kind", "协议", 82)
        addColumn("model", "模型", 150)
        addColumn("base", "地址", 270)
        addColumn("status", "状态", 82)

        let scroll = NSScrollView()
        scroll.hasVerticalScroller = true
        scroll.hasHorizontalScroller = false
        scroll.documentView = tableView

        let bottomBar = NSStackView()
        bottomBar.orientation = .horizontal
        bottomBar.alignment = .centerY
        bottomBar.spacing = 12
        useButton.target = self
        useButton.action = #selector(useSelectedProvider)
        useButton.bezelStyle = .rounded
        bottomBar.addArrangedSubview(NSView())
        bottomBar.addArrangedSubview(useButton)

        root.addArrangedSubview(header)
        root.addArrangedSubview(statusGrid)
        root.addArrangedSubview(summaryRow)
        root.addArrangedSubview(scroll)
        root.addArrangedSubview(bottomBar)
        scroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 330).isActive = true
    }

    private func label(_ text: String) -> NSTextField {
        let view = NSTextField(labelWithString: text)
        view.textColor = .secondaryLabelColor
        view.font = .systemFont(ofSize: 12, weight: .medium)
        return view
    }

    private func addColumn(_ identifier: String, _ title: String, _ width: CGFloat) {
        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier(identifier))
        column.title = title
        column.width = width
        column.resizingMask = .autoresizingMask
        tableView.addTableColumn(column)
    }

    private func updateSummary() {
        let compatibleCount = providers.filter(\.compatible).count
        let active = providers.first(where: \.active)
        activeLabel.stringValue = active.map { "\($0.name) (\($0.kind))" } ?? "没有可用渠道"
        summaryLabel.stringValue = "检测到 \(providers.count) 个渠道，\(compatibleCount) 个可用"
        statusLabel.stringValue = "Gateway 运行中"
        useButton.isEnabled = tableView.selectedRow >= 0
    }

    func numberOfRows(in tableView: NSTableView) -> Int {
        providers.count
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        let row = tableView.selectedRow
        useButton.isEnabled = row >= 0 && providers[row].compatible && !providers[row].active
    }

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard let identifier = tableColumn?.identifier.rawValue else { return nil }
        let provider = providers[row]
        let text: String
        switch identifier {
        case "name":
            text = provider.name
        case "app":
            text = provider.appType ?? "-"
        case "kind":
            text = provider.kind
        case "model":
            if let models = provider.models, models.count > 1 {
                text = "\(models[0]) 等 \(models.count) 个"
            } else {
                text = provider.model ?? provider.models?.first ?? "未设置"
            }
        case "base":
            text = provider.baseUrl ?? "未设置"
        case "status":
            text = statusText(provider)
        default:
            text = ""
        }

        let cell = NSTableCellView()
        let field = NSTextField(labelWithString: text)
        field.translatesAutoresizingMaskIntoConstraints = false
        field.lineBreakMode = .byTruncatingMiddle
        field.maximumNumberOfLines = 1
        field.textColor = provider.compatible ? .labelColor : .secondaryLabelColor
        if identifier == "status" && provider.active {
            field.textColor = .systemGreen
            field.font = .systemFont(ofSize: 13, weight: .semibold)
        }
        cell.addSubview(field)
        NSLayoutConstraint.activate([
            field.leadingAnchor.constraint(equalTo: cell.leadingAnchor, constant: 6),
            field.trailingAnchor.constraint(equalTo: cell.trailingAnchor, constant: -6),
            field.centerYAnchor.constraint(equalTo: cell.centerYAnchor)
        ])
        return cell
    }

    private func statusText(_ provider: Provider) -> String {
        if !provider.compatible { return "不支持" }
        if !provider.authPresent { return "缺密钥" }
        if provider.active { return "当前" }
        if provider.isCcSwitchCurrent { return "cc 当前" }
        return "可用"
    }

    @objc private func refreshAction() {
        refresh()
    }

    @objc private func copyGatewayURL() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(gateway.baseURL.absoluteString, forType: .string)
        statusLabel.stringValue = "已复制 Gateway 地址"
    }

    @objc private func copyAPIKey() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(apiKey, forType: .string)
        statusLabel.stringValue = "已复制 Gateway 密钥"
    }

    @objc private func configureClaudeDesktop() {
        var request = URLRequest(url: gateway.baseURL.appendingPathComponent("api/claude-desktop/apply"))
        request.httpMethod = "POST"
        statusLabel.stringValue = "正在配置 Claude Desktop..."

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error {
                    self.statusLabel.stringValue = "配置失败：\(error.localizedDescription)"
                    return
                }
                guard let data, let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                    self.statusLabel.stringValue = "配置失败。"
                    return
                }
                let text = String(data: data, encoding: .utf8) ?? ""
                self.statusLabel.stringValue = text.contains("backupDir") ? "已配置，原配置已备份" : "已配置，请重启 Claude"
            }
        }.resume()
    }

    @objc private func restartClaudeDesktop() {
        var request = URLRequest(url: gateway.baseURL.appendingPathComponent("api/claude-desktop/restart"))
        request.httpMethod = "POST"
        statusLabel.stringValue = "正在重启 Claude..."

        URLSession.shared.dataTask(with: request) { _, response, error in
            DispatchQueue.main.async {
                if let error {
                    self.statusLabel.stringValue = "重启失败：\(error.localizedDescription)"
                    return
                }
                guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                    self.statusLabel.stringValue = "重启失败。"
                    return
                }
                self.statusLabel.stringValue = "已处理 Claude 重启"
            }
        }.resume()
    }

    @objc private func useSelectedProvider() {
        let row = tableView.selectedRow
        guard row >= 0, providers.indices.contains(row) else { return }
        let provider = providers[row]
        guard provider.compatible, !provider.active else { return }

        var request = URLRequest(url: gateway.baseURL.appendingPathComponent("api/active"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["id": provider.id])
        statusLabel.stringValue = "正在切换到 \(provider.name)..."

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error {
                    self.statusLabel.stringValue = "切换失败：\(error.localizedDescription)"
                    return
                }
                guard let data, let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                    self.statusLabel.stringValue = "切换失败。"
                    return
                }
                do {
                    let decoded = try JSONDecoder().decode(ProvidersResponse.self, from: data)
                    self.providers = decoded.providers
                    self.apiKey = decoded.bridgeApiKey
                    self.apiKeyLabel.stringValue = decoded.bridgeApiKey
                    self.tableView.reloadData()
                    self.updateSummary()
                    self.statusLabel.stringValue = "已切换到 \(provider.name)"
                } catch {
                    self.statusLabel.stringValue = "切换后刷新失败：\(error.localizedDescription)"
                }
            }
        }.resume()
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private let gateway = GatewayProcess()
    private var statusItem: NSStatusItem?
    private var windowController: MainWindowController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        gateway.startIfNeeded()
        setupStatusItem()
        windowController = MainWindowController(gateway: gateway)
        showWindow()
    }

    func applicationWillTerminate(_ notification: Notification) {
        gateway.stopIfOwned()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        showWindow()
        return true
    }

    private func setupStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.title = "CCS"
        item.button?.toolTip = "Claude 中转切换器"

        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "显示控制面板", action: #selector(showWindow), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "刷新渠道", action: #selector(refreshProviders), keyEquivalent: ""))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "复制 Gateway 地址", action: #selector(copyGatewayURL), keyEquivalent: ""))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "退出", action: #selector(quit), keyEquivalent: "q"))
        item.menu = menu
        statusItem = item
    }

    @objc private func showWindow() {
        windowController?.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
        windowController?.refresh()
    }

    @objc private func refreshProviders() {
        windowController?.refresh()
    }

    @objc private func copyGatewayURL() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(gateway.baseURL.absoluteString, forType: .string)
    }

    @objc private func quit() {
        gateway.stopIfOwned()
        NSApp.terminate(nil)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
