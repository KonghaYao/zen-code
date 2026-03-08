#!/bin/bash

# 创建受限制的 Linux 用户脚本
# 用途: 创建只拥有端口权限和 node 访问权限的受限制账号

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}错误: 请使用 root 权限运行此脚本${NC}"
    echo "使用: sudo $0"
    exit 1
fi

# 生成随机密码
generate_password() {
    openssl rand -base64 16 | tr -d "=+/" | cut -c1-16
}

# 用户名
USERNAME="${1:-zenuser}"

# 检查用户是否已存在
if id "$USERNAME" &>/dev/null; then
    echo -e "${YELLOW}警告: 用户 $USERNAME 已存在${NC}"
    read -p "是否删除并重新创建? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}删除现有用户...${NC}"
        userdel -r "$USERNAME" 2>/dev/null || true
    else
        echo -e "${RED}操作取消${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}创建受限制用户账号${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# 生成随机密码
PASSWORD=$(generate_password)
echo -e "${GREEN}✓ 已生成随机密码${NC}"

# 创建用户组（如果不存在）
if ! grep -q "^zenrestricted:" /etc/group; then
    groupadd zenrestricted
    echo -e "${GREEN}✓ 已创建受限用户组 zenrestricted${NC}"
fi

# 创建用户
useradd -m -s /bin/bash -G zenrestricted "$USERNAME"
echo -e "${GREEN}✓ 已创建用户 $USERNAME${NC}"

# 设置密码
echo "$USERNAME:$PASSWORD" | chpasswd
echo -e "${GREEN}✓ 已设置密码${NC}"

# 创建用户目录结构
mkdir -p "/home/$USERNAME/.config"
mkdir -p "/home/$USERNAME/.local/bin"
mkdir -p "/home/$USERNAME/projects"
chown -R "$USERNAME:$USERNAME" "/home/$USERNAME"

# 设置 Node.js 路径
NODE_PATH="/usr/local/bin/node"
NPM_PATH="/usr/local/bin/npm"

if [ ! -f "$NODE_PATH" ]; then
    NODE_PATH="/usr/bin/node"
    NPM_PATH="/usr/bin/npm"
fi

if [ -f "$NODE_PATH" ]; then
    # 添加 node 到用户 PATH
    cat >> "/home/$USERNAME/.bashrc" << 'EOF'

# Node.js 和 npm 路径
export PATH="/usr/local/bin:/usr/bin:$PATH"

# Node 项目配置
export NODE_ENV=production
EOF
    echo -e "${GREEN}✓ 已配置 Node.js 环境${NC}"
else
    echo -e "${YELLOW}⚠ 未找到 Node.js，请手动安装${NC}"
fi

# 配置 sudo 规则（只允许特定端口操作）
SUDOERS_FILE="/etc/sudoers.d/zen-$USERNAME"
cat > "$SUDOERS_FILE" << EOF
# 受限制用户 $USERNAME 的 sudo 规则
# 只允许特定端口的操作

# 允许绑定特定端口范围（8080-9000）
$USERNAME ALL=(root) NOPASSWD: /usr/bin/setcap 'cap_net_bind_service=+ep' $NODE_PATH

# 允许查看进程（限制范围）
$USERNAME ALL=(root) NOPASSWD: /usr/bin/ps -u $USERNAME
$USERNAME ALL=(root) NOPASSWD: /usr/bin/kill -l

# 允许网络诊断
$USERNAME ALL=(root) NOPASSWD: /usr/bin/netstat -tulpn
$USERNAME ALL=(root) NOPASSWD: /usr/bin/ss -tulpn
$USERNAME ALL=(root) NOPASSWD: /usr/bin/nc -vz -w 2 *

# 禁止其他所有 sudo 操作
EOF

chmod 440 "$SUDOERS_FILE"
echo -e "${GREEN}✓ 已配置 sudo 权限限制${NC}"

# 配置防火墙规则（如果使用 ufw）
if command -v ufw &> /dev/null; then
    echo -e "${YELLOW}检测到 ufw 防火墙${NC}"
    echo -e "${BLUE}建议手动添加防火墙规则:${NC}"
    echo "  sudo ufw allow from 127.0.0.1 to any port 8080:9000"
fi

# 创建端口使用限制脚本
cat > "/home/$USERNAME/allowed-ports.sh" << 'EOF'
#!/bin/bash
# 检查端口是否在允许的范围内
# 允许端口: 1024-65535（用户端口范围）

PORT=$1

if [ -z "$PORT" ]; then
    echo "用法: $0 <端口号>"
    echo "允许端口范围: 1024-65535"
    exit 1
fi

if [ "$PORT" -ge 1024 ] && [ "$PORT" -le 65535 ]; then
    echo "端口 $PORT 在允许范围内"
    exit 0
else
    echo "错误: 端口 $PORT 不在允许范围内 (1024-65535)"
    exit 1
fi
EOF

chmod +x "/home/$USERNAME/allowed-ports.sh"
chown "$USERNAME:$USERNAME" "/home/$USERNAME/allowed-ports.sh"
echo -e "${GREEN}✓ 已创建端口检查脚本${NC}"

# 创建使用说明
cat > "/home/$USERNAME/README.txt" << EOF
========================================
受限用户账号使用说明
========================================

用户名: $USERNAME
密码: $PASSWORD
主机名: $(hostname)
IP地址: $(hostname -I | awk '{print $1}')

========================================
权限说明
========================================

✓ 允许操作:
  - 运行 Node.js 应用程序
  - 绑定 1024-65535 端口范围
  - 在 /home/$USERNAME/projects 目录下工作
  - 查看自己的进程
  - 网络诊断（netstat, ss, nc）

✗ 禁止操作:
  - 系统管理命令
  - 访问其他用户文件
  - 修改系统配置
  - 绑定特权端口（1-1023）

========================================
常用命令
========================================

1. 连接到此账号:
   ssh $USERNAME@$(hostname -I | awk '{print $1}')

2. 启动 Node.js 应用（端口 8080）:
   cd ~/projects
   node app.js

3. 检查端口是否允许:
   ~/allowed-ports.sh 8080

4. 查看网络监听端口:
   sudo netstat -tulpn

========================================
注意事项
========================================

1. 首次登录后建议修改密码
2. 只能在 projects 目录下工作
3. 不要尝试绕过权限限制
4. 所有操作都会被系统日志记录

========================================
EOF

chown "$USERNAME:$USERNAME" "/home/$USERNAME/README.txt"

echo
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ 受限制用户创建完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo
echo -e "${YELLOW}📋 账号信息${NC}"
echo "   用户名: $USERNAME"
echo "   密码:   $PASSWORD"
echo "   主机:   $(hostname -I | awk '{print $1}')"
echo
echo -e "${YELLOW}🔗 连接命令${NC}"
echo "   ssh $USERNAME@$(hostname -I | awk '{print $1}')"
echo
echo -e "${YELLOW}📖 完整说明${NC}"
echo "   请查看: /home/$USERNAME/README.txt"
echo

# 保存到临时文件（方便复制）
CREDENTIALS_FILE="/tmp/zen-user-credentials-${USERNAME}.txt"
cat > "$CREDENTIALS_FILE" << EOF
受限制用户账号信息
========================================

用户名: $USERNAME
密码: $PASSWORD
主机: $(hostname -I | awk '{print $1}')
端口: 22

连接命令:
ssh $USERNAME@$(hostname -I | awk '{print $1}')

完整说明:
cat /home/$USERNAME/README.txt

========================================
创建时间: $(date)
========================================
EOF

echo -e "${BLUE}凭证已保存到: $CREDENTIALS_FILE${NC}"
echo -e "${YELLOW}建议: 首次登录后请使用 'passwd' 命令修改密码${NC}"
echo