# Git仓库全自动同步工具
# 支持自动检测更改、提交、拉取、推送，无需人工干预

param(
    [string]$RepoPath = $PSScriptRoot,
    [string]$Remote = "origin",
    [string]$Branch = "main",
    [string]$LogFile = "$PSScriptRoot\sync.log",
    [switch]$Silent = $false
)

# 日志函数
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    if (-not $Silent) {
        Write-Host $logMessage
    }
    
    Add-Content -Path $LogFile -Value $logMessage
}

# 错误处理函数
function Handle-Error {
    param([string]$Operation, [int]$ExitCode)
    if ($ExitCode -ne 0) {
        Write-Log "操作失败: $Operation (退出代码: $ExitCode)" "ERROR"
        return $false
    }
    return $true
}

# 主同步函数
function Sync-Repository {
    Write-Log "开始Git仓库自动同步"
    Write-Log "仓库路径: $RepoPath"
    Write-Log "远程仓库: $Remote"
    Write-Log "分支: $Branch"
    
    # 切换到仓库目录
    Set-Location $RepoPath
    
    # 检查Git仓库状态
    $gitStatus = git status --porcelain 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($gitStatus) {
            Write-Log "发现本地更改，正在自动提交..."
            
            # 添加所有更改
            git add .
            if (-not (Handle-Error "git add" $LASTEXITCODE)) { return $false }
            
            # 提交更改
            $commitMessage = "Auto sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            git commit -m $commitMessage
            if (-not (Handle-Error "git commit" $LASTEXITCODE)) { return $false }
            
            Write-Log "本地更改已自动提交"
        } else {
            Write-Log "没有本地更改需要提交"
        }
    } else {
        Write-Log "Git状态检查失败" "ERROR"
        return $false
    }
    
    # 拉取远程更新
    Write-Log "拉取远程更新..."
    git pull $Remote $Branch
    if (-not (Handle-Error "git pull" $LASTEXITCODE)) {
        Write-Log "远程更新拉取失败，可能存在冲突" "WARNING"
        # 尝试使用rebase方式
        Write-Log "尝试使用rebase方式拉取..."
        git pull --rebase $Remote $Branch
        if (-not (Handle-Error "git pull --rebase" $LASTEXITCODE)) {
            Write-Log "rebase也失败，需要手动处理冲突" "ERROR"
            return $false
        }
    }
    
    Write-Log "远程更新拉取成功"
    
    # 推送本地更改
    Write-Log "推送本地更改..."
    git push $Remote $Branch
    if (-not (Handle-Error "git push" $LASTEXITCODE)) {
        Write-Log "推送失败，可能需要配置身份验证" "ERROR"
        return $false
    }
    
    Write-Log "本地更改推送成功"
    Write-Log "Git仓库同步完成"
    return $true
}

# 执行同步
try {
    $success = Sync-Repository
    if ($success) {
        Write-Log "同步操作成功完成"
        exit 0
    } else {
        Write-Log "同步操作失败" "ERROR"
        exit 1
    }
} catch {
    Write-Log "同步过程中发生异常: $($_.Exception.Message)" "ERROR"
    exit 1
} 