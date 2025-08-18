#!/bin/bash

# Git仓库自动同步工具 - Linux版本
# 支持自动检测更改、提交、拉取、推送，无需人工干预

# 默认参数
REPO_PATH=""
REMOTE="origin"
BRANCH="main"
LOG_FILE=""
SILENT=false
USE_CONFIG=true

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_message="[$timestamp] [$level] $message"
    
    if [ "$SILENT" = false ]; then
        case $level in
            "ERROR") echo -e "${RED}$log_message${NC}" ;;
            "WARNING") echo -e "${YELLOW}$log_message${NC}" ;;
            "INFO") echo -e "${BLUE}$log_message${NC}" ;;
            "SUCCESS") echo -e "${GREEN}$log_message${NC}" ;;
            *) echo "$log_message" ;;
        esac
    fi
    
    if [ -n "$LOG_FILE" ] && [ -d "$(dirname "$LOG_FILE")" ]; then
        echo "$log_message" >> "$LOG_FILE"
    fi
}

# 显示帮助信息
show_help() {
    echo "Git仓库自动同步工具 - Linux版本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -p, --path PATH        仓库路径"
    echo "  -r, --remote REMOTE    远程仓库名称 (默认: origin)"
    echo "  -b, --branch BRANCH    分支名称 (默认: main)"
    echo "  -l, --log FILE         日志文件路径"
    echo "  -s, --silent           静默模式"
    echo "  -n, --no-config        不使用配置文件"
    echo "  -h, --help             显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 -p /path/to/repo"
    echo "  $0 -p /path/to/repo -r origin -b main"
    echo "  $0 --path /path/to/repo --log /var/log/git-sync.log"
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--path)
                REPO_PATH="$2"
                shift 2
                ;;
            -r|--remote)
                REMOTE="$2"
                shift 2
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -l|--log)
                LOG_FILE="$2"
                shift 2
                ;;
            -s|--silent)
                SILENT=true
                shift
                ;;
            -n|--no-config)
                USE_CONFIG=false
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 读取配置文件
read_config() {
    local config_file="$(dirname "$0")/auto-sync-config.json"
    
    if [ ! -f "$config_file" ]; then
        log "WARNING" "配置文件不存在: $config_file"
        return 1
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        log "WARNING" "jq命令不可用，无法解析配置文件"
        return 1
    fi
    
    if [ -z "$REPO_PATH" ]; then
        REPO_PATH=$(jq -r '.sync.repoPath // empty' "$config_file" 2>/dev/null)
        if [ -n "$REPO_PATH" ]; then
            log "INFO" "从配置文件应用仓库路径: $REPO_PATH"
        fi
    fi
    
    if [ "$REMOTE" = "origin" ]; then
        local config_remote=$(jq -r '.sync.remote // empty' "$config_file" 2>/dev/null)
        if [ -n "$config_remote" ]; then
            REMOTE="$config_remote"
            log "INFO" "从配置文件应用远程仓库: $REMOTE"
        fi
    fi
    
    if [ "$BRANCH" = "main" ]; then
        local config_branch=$(jq -r '.sync.branch // empty' "$config_file" 2>/dev/null)
        if [ -n "$config_branch" ]; then
            BRANCH="$config_branch"
            log "INFO" "从配置文件应用分支: $BRANCH"
        fi
    fi
    
    if [ -z "$LOG_FILE" ]; then
        local config_log=$(jq -r '.sync.logFile // empty' "$config_file" 2>/dev/null)
        if [ -n "$config_log" ]; then
            LOG_FILE="$(dirname "$0")/$config_log"
            log "INFO" "从配置文件应用日志文件: $LOG_FILE"
        fi
    fi
    
    if [ "$SILENT" = false ]; then
        local config_silent=$(jq -r '.sync.silent // false' "$config_file" 2>/dev/null)
        if [ "$config_silent" = "true" ]; then
            SILENT=true
            log "INFO" "从配置文件应用静默模式"
        fi
    fi
    
    return 0
}

# 验证Git仓库
validate_repo() {
    if [ ! -d "$REPO_PATH" ]; then
        log "ERROR" "仓库路径不存在: $REPO_PATH"
        return 1
    fi
    
    if [ ! -d "$REPO_PATH/.git" ]; then
        log "ERROR" "指定路径不是Git仓库: $REPO_PATH"
        return 1
    fi
    
    return 0
}

# 获取Git状态
get_git_status() {
    local repo_path="$1"
    local current_branch
    local has_upstream=false
    local remote_branch=""
    local has_changes=false
    local changes=""
    local ahead=0
    local behind=0
    
    cd "$repo_path" || return 1
    
    # 获取当前分支
    current_branch=$(git branch --show-current 2>/dev/null)
    if [ $? -ne 0 ]; then
        log "ERROR" "获取当前分支失败"
        return 1
    fi
    
    # 检查是否有上游分支
    if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
        has_upstream=true
        remote_branch=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
    fi
    
    # 检查工作区状态
    changes=$(git status --porcelain 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$changes" ]; then
        has_changes=true
    fi
    
    # 获取提交差异
    if [ "$has_upstream" = true ]; then
        local diff_output
        diff_output=$(git rev-list --left-right --count "$current_branch"..."$remote_branch" 2>/dev/null)
        if [ $? -eq 0 ]; then
            ahead=$(echo "$diff_output" | cut -f1)
            behind=$(echo "$diff_output" | cut -f2)
        fi
    fi
    
    # 输出状态信息
    log "INFO" "当前分支: $current_branch"
    log "INFO" "本地更改: $has_changes"
    log "INFO" "领先远程: $ahead 个提交"
    log "INFO" "落后远程: $behind 个提交"
    
    # 返回状态（通过全局变量）
    GIT_STATUS_CURRENT_BRANCH="$current_branch"
    GIT_STATUS_HAS_UPSTREAM="$has_upstream"
    GIT_STATUS_REMOTE_BRANCH="$remote_branch"
    GIT_STATUS_HAS_CHANGES="$has_changes"
    GIT_STATUS_CHANGES="$changes"
    GIT_STATUS_AHEAD="$ahead"
    GIT_STATUS_BEHIND="$behind"
    
    return 0
}

# 智能拉取
smart_pull() {
    local repo_path="$1"
    local remote="$2"
    local branch="$3"
    local strategy="${4:-rebase}"
    
    cd "$repo_path" || return 1
    
    log "INFO" "开始拉取远程更新..."
    
    # 根据策略选择拉取方式
    if [ "$strategy" = "rebase" ]; then
        log "INFO" "使用rebase方式拉取..."
        if git pull --rebase --autostash "$remote" "$branch" 2>&1; then
            log "SUCCESS" "远程更新拉取成功"
            return 0
        fi
    else
        log "INFO" "使用merge方式拉取..."
        if git pull "$remote" "$branch" 2>&1; then
            log "SUCCESS" "远程更新拉取成功"
            return 0
        fi
    fi
    
    # 拉取失败，尝试备用策略
    log "WARNING" "拉取失败，尝试备用策略..."
    
    if [ "$strategy" = "rebase" ]; then
        # 如果rebase失败，尝试merge
        log "INFO" "尝试使用merge方式..."
        if git pull "$remote" "$branch" 2>&1; then
            log "SUCCESS" "备用策略拉取成功"
            return 0
        fi
    else
        # 如果merge失败，尝试rebase
        log "INFO" "尝试使用rebase方式..."
        if git pull --rebase --autostash "$remote" "$branch" 2>&1; then
            log "SUCCESS" "备用策略拉取成功"
            return 0
        fi
    fi
    
    # 所有策略都失败
    log "ERROR" "所有拉取策略都失败，需要手动解决冲突"
    return 1
}

# 主同步函数
sync_repository() {
    log "INFO" "开始Git仓库自动同步"
    log "INFO" "仓库路径: $REPO_PATH"
    log "INFO" "远程仓库: $REMOTE"
    log "INFO" "分支: $BRANCH"
    
    # 验证仓库
    if ! validate_repo; then
        return 1
    fi
    
    # 获取Git状态
    if ! get_git_status "$REPO_PATH"; then
        log "ERROR" "无法获取Git状态"
        return 1
    fi
    
    # 处理本地更改
    if [ "$GIT_STATUS_HAS_CHANGES" = true ]; then
        log "INFO" "发现本地更改，正在自动提交..."
        
        cd "$REPO_PATH" || return 1
        
        # 添加所有更改（包括删除的文件）
        if ! git add -A 2>&1; then
            log "ERROR" "git add -A 失败"
            return 1
        fi
        
        # 检查是否有需要提交的内容
        if git status --porcelain 2>/dev/null | grep -q .; then
            # 提交更改
            local commit_message="Auto sync: $(date '+%Y-%m-%d %H:%M:%S')"
            if ! git commit -m "$commit_message" 2>&1; then
                log "ERROR" "git commit 失败"
                return 1
            fi
            
            log "SUCCESS" "本地更改已自动提交"
        else
            log "INFO" "没有需要提交的更改"
        fi
    else
        log "INFO" "没有本地更改需要提交"
    fi
    
    # 拉取远程更新
    if ! smart_pull "$REPO_PATH" "$REMOTE" "$BRANCH"; then
        log "ERROR" "远程拉取失败，同步终止"
        return 1
    fi
    
    # 推送本地更改
    if [ "$GIT_STATUS_AHEAD" -gt 0 ] || [ "$GIT_STATUS_HAS_CHANGES" = true ]; then
        log "INFO" "推送本地更改..."
        cd "$REPO_PATH" || return 1
        
        if ! git push "$REMOTE" "$BRANCH" 2>&1; then
            log "ERROR" "推送失败，可能需要身份验证"
            return 1
        fi
        
        log "SUCCESS" "本地更改推送成功"
    else
        log "INFO" "没有需要推送的更改"
    fi
    
    log "SUCCESS" "Git仓库同步完成"
    return 0
}

# 设置cron任务
setup_cron() {
    local interval="${1:-5}"
    local script_path="$(readlink -f "$0")"
    local config_path="$(dirname "$script_path")/auto-sync-config.json"
    
    log "INFO" "设置cron任务，间隔: $interval 分钟"
    
    # 创建临时cron文件
    local temp_cron=$(mktemp)
    
    # 导出当前cron
    crontab -l 2>/dev/null > "$temp_cron" || true
    
    # 添加新的cron任务
    echo "*/$interval * * * * $script_path --silent >> $(dirname "$script_path")/sync.log 2>&1" >> "$temp_cron"
    
    # 安装新的cron
    if crontab "$temp_cron"; then
        log "SUCCESS" "cron任务设置成功"
        log "INFO" "任务将每 $interval 分钟执行一次"
        log "INFO" "查看cron任务: crontab -l"
        log "INFO" "查看日志: tail -f $(dirname "$script_path")/sync.log"
    else
        log "ERROR" "cron任务设置失败"
        rm -f "$temp_cron"
        return 1
    fi
    
    rm -f "$temp_cron"
    return 0
}

# 主函数
main() {
    # 解析命令行参数
    parse_args "$@"
    
    # 应用配置文件
    if [ "$USE_CONFIG" = true ]; then
        read_config
    fi
    
    # 验证必要参数
    if [ -z "$REPO_PATH" ]; then
        log "ERROR" "仓库路径未指定，请使用 -p 参数或配置文件"
        show_help
        exit 1
    fi
    
    # 执行同步
    if sync_repository; then
        log "SUCCESS" "同步操作成功完成"
        exit 0
    else
        log "ERROR" "同步操作失败"
        exit 1
    fi
}

# 执行主函数
main "$@"