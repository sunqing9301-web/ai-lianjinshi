# Git仓库全自动同步工具
# 支持自动检测更改、提交、拉取、推送，无需人工干预

param(
    [string]$RepoPath = (Split-Path (Split-Path $PSScriptRoot)),
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
        Write-Log "Operation failed: $Operation (Exit code: $ExitCode)" "ERROR"
        return $false
    }
    return $true
}

# 主同步函数
function Sync-Repository {
    Write-Log "Starting Git repository auto sync"
    Write-Log "Repository path: $RepoPath"
    Write-Log "Remote: $Remote"
    Write-Log "Branch: $Branch"
    
    # 切换到仓库目录
    Set-Location $RepoPath
    
    # 检查Git仓库状态
    $gitStatus = git status --porcelain 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($gitStatus) {
            Write-Log "Found local changes, auto-committing..."
            
            # 添加所有更改
            git add .
            if (-not (Handle-Error "git add" $LASTEXITCODE)) { return $false }
            
            # 提交更改
            $commitMessage = "Auto sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            git commit -m $commitMessage
            if (-not (Handle-Error "git commit" $LASTEXITCODE)) { return $false }
            
            Write-Log "Local changes auto-committed"
        } else {
            Write-Log "No local changes to commit"
        }
    } else {
        Write-Log "Git status check failed" "ERROR"
        return $false
    }
    
    # 拉取远程更新
    Write-Log "Pulling remote updates..."
    git pull $Remote $Branch
    if (-not (Handle-Error "git pull" $LASTEXITCODE)) {
        Write-Log "Remote pull failed, may have conflicts" "WARNING"
        # 尝试使用rebase方式
        Write-Log "Trying rebase pull..."
        git pull --rebase $Remote $Branch
        if (-not (Handle-Error "git pull --rebase" $LASTEXITCODE)) {
            Write-Log "Rebase also failed, manual conflict resolution needed" "ERROR"
            return $false
        }
    }
    
    Write-Log "Remote updates pulled successfully"
    
    # 推送本地更改
    Write-Log "Pushing local changes..."
    git push $Remote $Branch
    if (-not (Handle-Error "git push" $LASTEXITCODE)) {
        Write-Log "Push failed, authentication may be needed" "ERROR"
        return $false
    }
    
    Write-Log "Local changes pushed successfully"
    Write-Log "Git repository sync completed"
    return $true
}

# 执行同步
try {
    $success = Sync-Repository
    if ($success) {
        Write-Log "Sync operation completed successfully"
        exit 0
    } else {
        Write-Log "Sync operation failed" "ERROR"
        exit 1
    }
} catch {
    Write-Log "Exception during sync: $($_.Exception.Message)" "ERROR"
    exit 1
} 