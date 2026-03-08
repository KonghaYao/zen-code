# zen-tunnel

SSH 反向端口转发隧道工具 - 让本地服务通过公网服务器对外暴露。

## 概述

`zen-tunnel` 是一个基于 SSH 反向端口转发的隧道工具，让你可以轻松将本地开发服务暴露到公网。

**核心流程：**

```
[本地服务 :LOCAL_PORT]
       ↕ (SSH 反向转发 -R)
[zen-tunnel client]  ──SSH──►  [zen-tunnel server (公网)]
                                       ↕
                              [公网可访问 :REMOTE_PORT]
```

## 特性

- 🚀 **简单易用** - 一个命令即可建立隧道
- 🔄 **自动重连** - 隧道断开后 5 秒自动重连
- 💓 **心跳保活** - 30 秒心跳间隔，60 秒超时自动清理
- 🔒 **安全性** - 基于 SSH 标准加密，支持密钥认证
- 📊 **实时监控** - 服务器端实时显示隧道连接状态
- 🛡️ **端口冲突检测** - 自动检测并提示端口冲突

## 安装

```bash
npm install -g zen-tunnel
```

或从源码构建：

```bash
cd packages/zen-tunnel
npm run build
```

## 快速开始

### 1. 启动服务器（在公网 Linux 服务器上）

```bash
zen-tunnel server
```

服务器将显示连接信息：

```
zen-tunnel server  (control port: 9000)
  SSH login:    ubuntu@192.168.1.10
  Client cmd:   zen-tunnel client -s ubuntu@192.168.1.10 -l <local-port> -r <remote-port>
CLIENT ID     REMOTE PORT   LOCAL PORT    CONNECTED    STATUS
```

### 2. 启动客户端（在本地机器上）

```bash
zen-tunnel client -s example.com -u ubuntu -l 3000 -r 8080
```

客户端将显示连接状态：

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

现在你的本地服务 `localhost:3000` 可以通过 `http://example.com:8080` 访问。

## 命令参考

### 服务器命令

```bash
zen-tunnel server [options]
```

**选项：**

- `-p, --port <number>` - 控制服务监听端口（默认：9000）
- `-u, --user <username>` - SSH 登录用户名（用于生成客户端连接提示）

### 客户端命令

```bash
zen-tunnel client [options]
```

**选项：**

- `-s, --server <host>` - SSH 服务器地址（仅 host，不含 user@）
- `-u, --user <username>` - SSH 登录用户名（优先级高于 user@host 写法）
- `-l, --local-port <number>` - 本地服务端口
- `-r, --remote-port <number>` - 在服务器上暴露的端口
- `-c, --control-port <number>` - 控制服务端口（默认：9000）
- `--ssh-port <number>` - SSH 端口（默认：22）
- `-i, --identity-file <path>` - SSH 私钥文件

**用户名解析优先级：** `-u/--user` > `user@host` 内嵌格式 > 当前 OS 用户（`$USER`）

## 架构设计

### 服务器端

服务器端组件：

- **Control Server** - Hono HTTP 控制服务（注册/心跳/注销）
- **Tunnel Registry** - 端口分配表管理（内存存储，超时清理）
- **Event Display** - 事件驱动终端输出

### 客户端

客户端组件：

- **SSH Tunnel** - 调用系统 `ssh -R` 建立反向隧道
- **Control Client** - HTTP 注册/心跳/注销客户端
- **Auto Reconnect** - 隧道断开自动重连机制

### 控制协议

客户端与服务器之间通过 HTTP REST 协议通信：

```
POST   /register     { clientId, remotePort, localPort, sshUser }  → { ok, assignedPort, error? }
POST   /heartbeat    { clientId }                                   → { ok }
DELETE /unregister   { clientId }                                   → { ok }
GET    /status                                                      → { tunnels: TunnelEntry[] }
```

## 服务器配置

### SSH 配置

确保服务器的 `/etc/ssh/sshd_config` 包含以下配置：

```
GatewayPorts yes
```

这允许 `-R` 转发绑定所有网卡，而不仅仅是 `127.0.0.1`。

重启 SSH 服务：

```bash
sudo systemctl restart sshd
```

### 防火墙配置

确保服务器防火墙允许以下端口：

- 控制端口（默认 9000）
- 所有客户端使用的 remote port

```bash
sudo ufw allow 9000/tcp
sudo ufw allow 8080/tcp  # 示例 remote port
```

### 创建受限用户（推荐）

使用提供的脚本创建受限的 SSH 用户：

```bash
./create-restricted-user.sh
```

脚本功能：

- 创建新用户并配置 SSH 密钥
- 限制用户仅使用端口转发
- 禁用终端访问
- 设置自动清理过期隧道

## 开发

### 开发模式

```bash
# 开发服务器
npm run dev -- server --user ubuntu

# 开发客户端
npm run dev -- client -s example.com -u ubuntu -l 3000 -r 8080
```

### 构建

```bash
npm run build
```

输出文件：`dist/cli.js`（包含 shebang，自动设置可执行权限）

### 运行构建产物

```bash
node dist/cli.js server --port 9000 --user ubuntu
node dist/cli.js client -s example.com -u ubuntu -l 3000 -r 8080
```

## 故障排除

### 端口已被占用

如果远程端口已被占用，客户端将收到 409 错误：

```
[✗] Port 8080 is already in use
```

解决方案：选择其他端口或检查服务器状态。

### 隧道连接失败

检查以下几点：

1. SSH 连接是否正常：`ssh -v user@server`
2. 服务器 `GatewayPorts` 是否启用
3. 防火墙是否放行相关端口
4. 控制服务是否正常运行

### 心跳超时

如果客户端 60 秒无心跳，服务器将自动清理隧道。确保客户端持续运行且网络稳定。

## 项目结构

```
packages/zen-tunnel/
├── src/
│   ├── shared/
│   │   └── types.ts          # 共享类型定义
│   ├── server/
│   │   ├── index.ts          # 服务器启动入口
│   │   ├── controlServer.ts  # HTTP 控制服务
│   │   ├── tunnelRegistry.ts # 端口分配表管理
│   │   └── display.ts        # 终端输出
│   ├── client/
│   │   ├── index.ts          # 客户端启动流程
│   │   ├── sshTunnel.ts      # SSH 隧道管理
│   │   ├── controlClient.ts  # HTTP 控制客户端
│   │   └── display.ts        # 终端输出
│   └── cli.ts                # CLI 主入口
├── package.json
├── tsconfig.json
├── vite.config.ts
└── create-restricted-user.sh # 服务器用户创建脚本
```

## 依赖

| 依赖                           | 类型            | 用途                |
| ------------------------------ | --------------- | ------------------- |
| `commander`                    | dependencies    | CLI 参数解析        |
| `hono`                         | dependencies    | HTTP 服务框架       |
| `@hono/node-server`            | dependencies    | Node.js HTTP 适配器 |
| `vite`                         | devDependencies | 构建打包            |
| `rollup-plugin-node-externals` | devDependencies | 排除 node_modules   |

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关资源

- [LangGraph](https://github.com/langchain-ai/langgraph)
- [CodeGraph](https://github.com/codegraph-ai/codegraph)
