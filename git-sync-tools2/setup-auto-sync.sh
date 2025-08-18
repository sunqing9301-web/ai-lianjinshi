#!/bin/bash

# Git自动同步 - Linux设置脚本
# 用于配置和设置cron任务

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 日志函数
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_message="[$timestamp] [$level] $message"
    
    case $level in
        "ERROR") echo -e "${RED}$log_message${NC}" ;;
        "WARNING") echo -e "${YELLOW}$log_message${NC}" ;;
        "INFO") echo -e "${BLUE}$log_message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}$log_message${NC}" ;;
        *) echo "$log_message" ;;
    esac
}

# 显示欢迎信息
show_welcome() {
    echo "========================================"
    echo "   Git自动同步 - Linux设置工具"
    echo "========================================"
    echo ""
    echo "欢迎使用Git自动同步Linux设置工具！"
    echo "此工具将帮助您配置Git仓库自动同步。"
    echo ""
}

# 检查系统环境
check_environment() {
    log "INFO" "检查系统环境..."
    
    # 检查Git
    if ! command -v git >/dev/null 2>&1; then
        log "ERROR" "Git未安装，请先安装Git"
        log "INFO" "Ubuntu/Debian: sudo apt-get install git"
        log "INFO" "CentOS/RHEL: sudo yum install git"
        return 1
    fi
    
    # 检查jq（用于解析JSON）
    if ! command -v jq >/dev/null 2>&1; then
        log "WARNING" "jq未安装，将无法解析配置文件"
        log "INFO" "Ubuntu/Debian: sudo apt-get install jq"
        log "INFO" "CentOS/RHEL: sudo yum install jq"
    fi
    
    # 检查cron
    if ! command -v crontab >/dev/null 2>&1; then
        log "ERROR" "cron未安装，请先安装cron"
        log "INFO" "Ubuntu/Debian: sudo apt-get install cron"
        log "INFO" "CentOS/RHEL: sudo yum install cronie"
        return 1
    fi
    
    log "SUCCESS" "系统环境检查通过"
    return 0
}

# 读取现有配置
read_existing_config() {
    local config_file="$SCRIPT_DIR/auto-sync-config.json"
    
    if [ ! -f "$config_file" ]; then
        return 1
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        return 1
    fi
    
    # 读取配置
    local repo_path=$(jq -r '.sync.repoPath // empty' "$config_file" 2>/dev/null)
    local remote=$(jq -r '.sync.remote // empty' "$config_file" 2>/dev/null)
    local branch=$(jq -r '.sync.branch // empty' "$config_file" 2>/dev/null)
    local interval=$(jq -r '.sync.interval // empty' "$config_file" 2>/dev/null)
    
    if [ -n "$repo_path" ]; then
        echo "检测到现有配置："
        echo "  仓库路径: $repo_path"
        echo "  远程仓库: $remote"
        echo "  分支: $branch"
        echo "  同步间隔: $interval 分钟"
        echo ""
        return 0
    fi
    
    return 1
}

# 获取用户输入
get_user_input() {
    local default_repo_path="$SCRIPT_DIR/.."
    local default_remote_url="https://github.com/sunqing9301-web/ai-lianjinshi.git"
    
    echo "当前检测到的信息："
    echo "  本地项目路径: $default_repo_path"
    echo "  远程仓库地址: $default_remote_url"
    echo ""
    
    # 获取本地路径
    read -p "请输入本地项目路径 (直接回车使用默认路径): " local_path
    if [ -z "$local_path" ]; then
        local_path="$default_repo_path"
    fi
    
    # 获取远程仓库地址
    read -p "请输入远程仓库地址 (直接回车使用默认地址): " remote_url
    if [ -z "$remote_url" ]; then
        remote_url="$default_remote_url"
    fi
    
    # 获取分支名称
    read -p "请输入分支名称 (直接回车使用main): " branch
    if [ -z "$branch" ]; then
        branch="main"
    fi
    
    # 获取同步间隔
    read -p "请输入同步间隔(分钟) (直接回车使用5分钟): " interval
    if [ -z "$interval" ]; then
        interval="5"
    fi
    
    # 验证输入
    if [ ! -d "$local_path" ]; then
        log "ERROR" "路径不存在: $local_path"
        return 1
    fi
    
    if [ ! -d "$local_path/.git" ]; then
        log "ERROR" "指定路径不是Git仓库: $local_path"
        return 1
    fi
    
    # 保存到全局变量
    REPO_PATH="$local_path"
    REMOTE_URL="$remote_url"
    BRANCH="$branch"
    INTERVAL="$interval"
    
    return 0
}

# 验证Git仓库
validate_git_repo() {
    local repo_path="$1"
    
    log "INFO" "验证Git仓库..."
    
    cd "$repo_path" || return 1
    
    # 检查Git状态
    if ! git status >/dev/null 2>&1; then
        log "ERROR" "Git仓库状态异常"
        return 1
    fi
    
    # 检查远程仓库
    local remote_url=$(git remote get-url origin 2>/dev/null)
    if [ $? -eq 0 ]; then
        log "INFO" "远程仓库已配置: $remote_url"
        
        if [ "$remote_url" != "$REMOTE_URL" ]; then
            log "WARNING" "远程仓库地址不匹配"
            log "INFO" "  当前: $remote_url"
            log "INFO" "  输入: $REMOTE_URL"
            
            read -p "是否更新远程仓库地址？(Y/N): " update_remote
            if [[ "$update_remote" =~ ^[Yy]$ ]]; then
                if git remote set-url origin "$REMOTE_URL"; then
                    log "SUCCESS" "远程仓库地址更新成功"
                else
                    log "ERROR" "远程仓库地址更新失败"
                    return 1
                fi
            fi
        fi
    else
        log "WARNING" "未检测到远程仓库配置"
        log "INFO" "正在添加远程仓库..."
        
        if git remote add origin "$REMOTE_URL"; then
            log "SUCCESS" "远程仓库添加成功"
        else
            log "ERROR" "远程仓库添加失败"
            return 1
        fi
    fi
    
    log "SUCCESS" "Git仓库验证通过"
    return 0
}

# 更新配置文件
update_config_file() {
    local config_file="$SCRIPT_DIR/auto-sync-config.json"
    
    log "INFO" "更新配置文件..."
    
    # 创建配置JSON
    local config_json=$(cat <<EOF
{
    "sync": {
        "enabled": true,
        "interval": $INTERVAL,
        "taskName": "GitAutoSync",
        "repoPath": "$REPO_PATH",
        "remote": "origin",
        "branch": "$BRANCH",
        "logFile": "sync.log",
        "silent": true,
        "autoCommit": true,
        "autoPush": true,
        "conflictStrategy": "rebase",
        "retryAttempts": 3,
        "retryDelay": 30
    }
}
EOF
)
    
    # 保存配置文件
    echo "$config_json" > "$config_file"
    
    if [ $? -eq 0 ]; then
        log "SUCCESS" "配置文件更新成功"
        return 0
    else
        log "ERROR" "配置文件更新失败"
        return 1
    fi
}

# 设置cron任务
setup_cron_task() {
    local sync_script="$SCRIPT_DIR/auto-sync.sh"
    
    log "INFO" "设置cron任务..."
    
    # 确保脚本可执行
    chmod +x "$sync_script"
    
    # 创建临时cron文件
    local temp_cron=$(mktemp)
    
    # 导出当前cron
    crontab -l 2>/dev/null > "$temp_cron" || true
    
    # 检查是否已存在相同的任务
    if grep -q "$sync_script" "$temp_cron"; then
        log "WARNING" "检测到已存在的cron任务"
        read -p "是否删除现有任务并重新创建？(Y/N): " replace_task
        if [[ "$replace_task" =~ ^[Yy]$ ]]; then
            # 删除现有任务
            sed -i "\|$sync_script|d" "$temp_cron"
            log "INFO" "已删除现有cron任务"
        else
            log "INFO" "保留现有cron任务"
            rm -f "$temp_cron"
            return 0
        fi
    fi
    
    # 添加新的cron任务
    echo "*/$INTERVAL * * * * $sync_script --silent >> $SCRIPT_DIR/sync.log 2>&1" >> "$temp_cron"
    
    # 安装新的cron
    if crontab "$temp_cron"; then
        log "SUCCESS" "cron任务设置成功"
        log "INFO" "任务将每 $INTERVAL 分钟执行一次"
    else
        log "ERROR" "cron任务设置失败"
        rm -f "$temp_cron"
        return 1
    fi
    
    rm -f "$temp_cron"
    return 0
}

# 测试同步
test_sync() {
    local sync_script="$SCRIPT_DIR/auto-sync.sh"
    
    log "INFO" "测试同步功能..."
    
    if [ -f "$sync_script" ]; then
        if "$sync_script" --path "$REPO_PATH" --remote "origin" --branch "$BRANCH"; then
            log "SUCCESS" "同步测试成功"
            return 0
        else
            log "ERROR" "同步测试失败"
            return 1
        fi
    else
        log "ERROR" "同步脚本不存在: $sync_script"
        return 1
    fi
}

# 显示完成信息
show_completion() {
    echo ""
    echo "🎉 Git自动同步设置完成！"
    echo ""
    echo "配置信息："
    echo "  本地项目路径: $REPO_PATH"
    echo "  远程仓库地址: $REMOTE_URL"
    echo "  分支名称: $BRANCH"
    echo "  同步间隔: $INTERVAL 分钟"
    echo "  任务名称: GitAutoSync"
    echo ""
    echo "管理命令："
    echo "  查看cron任务: crontab -l"
    echo "  手动执行同步: $SCRIPT_DIR/auto-sync.sh --path \"$REPO_PATH\""
    echo "  查看日志: tail -f $SCRIPT_DIR/sync.log"
    echo "  删除cron任务: crontab -e (手动删除对应行)"
    echo ""
    echo "现在您的项目将每 $INTERVAL 分钟自动同步到GitHub！"
    echo ""
}

# 主函数
main() {
    show_welcome
    
    # 检查系统环境
    if ! check_environment; then
        exit 1
    fi
    
    # 读取现有配置
    if read_existing_config; then
        read -p "是否重新配置？(Y/N): " reconfigure
        if [[ ! "$reconfigure" =~ ^[Yy]$ ]]; then
            log "INFO" "使用现有配置"
            # 这里可以添加使用现有配置的逻辑
            return 0
        fi
    fi
    
    # 获取用户输入
    if ! get_user_input; then
        log "ERROR" "输入验证失败"
        exit 1
    fi
    
    # 确认配置
    echo ""
    echo "配置信息确认："
    echo "  本地项目路径: $REPO_PATH"
    echo "  远程仓库地址: $REMOTE_URL"
    echo "  分支名称: $BRANCH"
    echo "  同步间隔: $INTERVAL 分钟"
    echo ""
    
    read -p "确认以上配置信息？(Y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "INFO" "配置已取消"
        exit 0
    fi
    
    # 验证Git仓库
    if ! validate_git_repo "$REPO_PATH"; then
        log "ERROR" "Git仓库验证失败"
        exit 1
    fi
    
    # 更新配置文件
    if ! update_config_file; then
        log "ERROR" "配置文件更新失败"
        exit 1
    fi
    
    # 设置cron任务
    if ! setup_cron_task; then
        log "ERROR" "cron任务设置失败"
        exit 1
    fi
    
    # 测试同步
    test_sync
    
    # 显示完成信息
    show_completion
}

# 执行主函数
main "$@"