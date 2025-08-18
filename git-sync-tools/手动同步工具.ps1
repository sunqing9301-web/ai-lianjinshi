# 手动同步工具
# 用于手动执行Git同步操作

param(
    [string]$RepoPath = ".",
    [string]$Remote = "origin",
    [string]$Branch = "main"
)

# 设置控制台编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
}

# 错误处理函数
function Handle-Error {
    param(
        [string]$Operation,
        [int]$ExitCode
    )
    if ($ExitCode -ne 0) {
        Write-Log "操作失败: $Operation (退出代码: $ExitCode)" "ERROR"
        return $false
    }
    return $true
}

# 主同步函数
function Sync-Repository {
    Write-Log "开始手动Git仓库同步"
    Write-Log "仓库路径: $RepoPath"
    Write-Log "远程仓库: $Remote"
    Write-Log "分支: $Branch"
    
    # 切换到仓库目录
    Set-Location $RepoPath
    
    # 检查Git状态
    Write-Log "检查Git状态..."
    git status
    if (-not (Handle-Error "git status" $LASTEXITCODE)) {
        return $false
    }
    
    # 拉取远程更新
    Write-Log "拉取远程更新..."
    git pull $Remote $Branch
    if (-not (Handle-Error "git pull" $LASTEXITCODE)) {
        Write-Log "远程拉取失败，可能有冲突" "WARNING"
        # 尝试使用rebase方式
        Write-Log "尝试rebase拉取..."
        git pull --rebase $Remote $Branch
        if (-not (Handle-Error "git pull --rebase" $LASTEXITCODE)) {
            Write-Log "Rebase也失败，需要手动解决冲突" "ERROR"
            return $false
        }
    }
    
    Write-Log "远程更新拉取成功"
    
    # 推送本地更改
    Write-Log "推送本地更改..."
    git push $Remote $Branch
    if (-not (Handle-Error "git push" $LASTEXITCODE)) {
        Write-Log "推送失败，可能需要认证" "ERROR"
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
        Write-Log "手动同步成功完成！" "SUCCESS"
    } else {
        Write-Log "手动同步失败，请检查错误信息" "ERROR"
    }
} catch {
    Write-Log "同步过程中发生异常: $($_.Exception.Message)" "ERROR"
}

Write-Log "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 