# zen-tunnel — SSH 反向端口转发隧道工具

## 概述

`zen-tunnel` 是一个基于 SSH 反向端口转发的隧道工具，让本地服务通过一台公网 Linux 服务器对外暴露。

**核心流程：**

```
[本地服务 :LOCAL_PORT]
       ↕ (SSH 反向转发 -R)
[zen-tunnel client]  ──SSH──►  [zen-tunnel server (公网)]
                                       ↕
                              [公网可访问 :REMOTE_PORT]
```

---

## 包信息

| 项目     | 值                                           |
| -------- | -------------------------------------------- |
| 包名     | `zen-tunnel`                                 |
| 位置     | `packages/zen-tunnel/`                       |
| 语言     | TypeScript                                   |
| 运行时   | Node.js（兼容，无 Bun 依赖）                 |
| SSH 实现 | 调用系统 `ssh` 命令（`child_process.spawn`） |
| 构建工具 | Vite（输出 `dist/cli.js`）                   |
| CLI 入口 | `zen-tunnel server` / `zen-tunnel client`    |

---

## 架构设计

### server 端（公网服务器上运行）

**职责：**

- 复用系统 sshd，不自建 SSH daemon
- 提供 HTTP 控制服务（Hono + `@hono/node-server`），让 client 注册/心跳/注销
- 维护端口分配表（内存），60s 无心跳自动清理
- 事件驱动终端输出（client 连接/断开时追加日志行）

**启动命令：**

```bash
zen-tunnel server [options]

Options:
  -p, --port <number>    控制服务监听端口 (默认: 9000)
  -u, --user <username>  SSH 登录用户名（用于生成客户端连接提示）
```

**携带 `--user` 时的启动输出：**

```
zen-tunnel server  (control port: 9000)
  SSH login:    ubuntu@192.168.1.10
  Client cmd:   zen-tunnel client -s ubuntu@192.168.1.10 -l <local-port> -r <remote-port>
CLIENT ID     REMOTE PORT   LOCAL PORT    CONNECTED    STATUS
```

### client 端（本地机器上运行）

**职责：**

- 向 server 控制服务注册，指定 `REMOTE_PORT`
- 调用系统 `ssh -R` 建立反向隧道（`stdio: 'inherit'`，密码输入直接透传终端）
- 30s 心跳保活；隧道断开后 5s 自动重连
- 退出时向 server 发送注销请求

**启动命令：**

```bash
zen-tunnel client [options]

Options:
  -s, --server <host>          SSH 服务器地址（仅 host，不含 user@）
  -u, --user <username>        SSH 登录用户名（优先级高于 user@host 写法）
  -l, --local-port <number>    本地服务端口
  -r, --remote-port <number>   在 server 上暴露的端口
  -c, --control-port <number>  控制服务端口 (默认: 9000)
  --ssh-port <number>          SSH 端口 (默认: 22)
  -i, --identity-file <path>   SSH 私钥文件
```

**用户名解析优先级：** `-u/--user` > `user@host` 内嵌格式 > 当前 OS 用户（`$USER`）

**启动输出示例：**

```
zen-tunnel client
  server:       example.com
  user:         ubuntu
  local:        localhost:3000
  remote:       example.com:8080
  control:      :9000
Press Ctrl+C to disconnect

  [✓] Registered with control server
  [tunnel] connected
```

---

## 数据结构

### 端口分配表（server 内存维护）

```typescript
interface TunnelEntry {
    clientId: string; // 随机生成的 8 位 UUID 前缀
    remotePort: number; // server 上暴露的端口
    localPort: number; // client 本地服务端口
    sshUser: string; // 连接的 SSH 用户名
    connectedAt: Date;
    lastHeartbeat: Date;
    status: 'active' | 'disconnected';
}
```

### client ↔ server 控制协议（HTTP REST）

```
POST   /register     { clientId, remotePort, localPort, sshUser }  → { ok, assignedPort, error? }
POST   /heartbeat    { clientId }                                   → { ok }
DELETE /unregister   { clientId }                                   → { ok }
GET    /status                                                      → { tunnels: TunnelEntry[] }
```

端口冲突时 `/register` 返回 HTTP 409。

---

## 文件结构

```
packages/zen-tunnel/
├── src/
│   ├── shared/
│   │   └── types.ts          # 共享类型定义（TunnelEntry, 请求/响应类型）
│   ├── server/
│   │   ├── index.ts          # 启动入口（serve + 事件监听）
│   │   ├── controlServer.ts  # Hono HTTP 控制服务（4 个路由）
│   │   ├── tunnelRegistry.ts # 端口分配表（注册/心跳/超时清理 + onEvent 回调）
│   │   └── display.ts        # 追加式终端输出（printServerHeader/printTunnelEvent）
│   ├── client/
│   │   ├── index.ts          # 启动流程（注册 → SSH → 心跳 → 优雅退出）
│   │   ├── sshTunnel.ts      # spawn ssh -R，stdio:inherit，自动重连
│   │   ├── controlClient.ts  # HTTP 注册/心跳/注销客户端
│   │   └── display.ts        # 追加式终端输出（printClientHeader/printTunnelStatus）
│   └── cli.ts                # commander 主入口
├── vite.config.ts            # Vite 构建配置（含 shebang 注入插件）
├── package.json
└── tsconfig.json
```

---

## 依赖

| 依赖                           | 类型            | 用途                      |
| ------------------------------ | --------------- | ------------------------- |
| `commander`                    | dependencies    | CLI 参数解析              |
| `hono`                         | dependencies    | server 控制 HTTP 服务框架 |
| `@hono/node-server`            | dependencies    | Node.js HTTP 适配器       |
| `vite`                         | devDependencies | 构建打包                  |
| `rollup-plugin-node-externals` | devDependencies | 排除 node_modules         |

---

## 构建与运行

```bash
# 开发模式（tsx 直接运行）
npm run dev -- server --user ubuntu
npm run dev -- client -s example.com -u ubuntu -l 3000 -r 8080

# 构建
npm run build        # 输出 dist/cli.js（含 shebang，chmod 755）

# 构建产物运行
node dist/cli.js server --port 9000 --user ubuntu
node dist/cli.js client -s example.com -u ubuntu -l 3000 -r 8080
```

---

## 实现状态

### Phase 1 — 核心功能 ✅

- [x] 基础 CLI 框架（commander）
- [x] server 控制 HTTP 服务 + 端口注册逻辑
- [x] client SSH 隧道建立（ssh -R，stdio:inherit 支持密码输入）
- [x] client 注册 + 心跳（30s 间隔）

### Phase 2 — 稳定性 ✅

- [x] 自动重连（隧道断开后 5s 重连）
- [x] 端口冲突检测（409 响应 + 错误提示）
- [x] 心跳超时自动清理（60s 无心跳移除）
- [x] 优雅退出（Ctrl+C 触发注销 + SSH 进程终止）

### Phase 3 — 体验 ✅

- [x] server 事件驱动追加输出（不清屏，不影响 SSH 密码输入）
- [x] client 追加式状态日志
- [x] server `--user` 生成客户端连接命令提示
- [x] client `-u/--user` 独立用户名参数，支持多种写法

---

## 注意事项

1. **sshd 配置**：server 机器的 `/etc/ssh/sshd_config` 需要 `GatewayPorts yes`，否则 `-R` 转发只绑定 `127.0.0.1`
   而非所有网卡
2. **端口范围**：建议使用 1024–65535 范围内的端口
3. **防火墙**：server 需要放行控制端口（默认 9000）和所有 client 使用的 remote port
4. **SSH 密码**：`stdio: 'inherit'` 确保 SSH 密码/passphrase 提示直接显示在终端，两端均不清屏
