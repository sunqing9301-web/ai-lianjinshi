# Git仓库全自动同步工具
# 支持自动检测更改、提交、拉取、推送，无需人工干预

param(
    [string]$RepoPath = "",
    [string]$Remote = "origin",
    [string]$Branch = "main",
    [string]$LogFile = "",
    [switch]$Silent = $false,
    [switch]$UseConfig = $true
)

# 日志函数
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    if (-not $Silent) {
        Write-Host $logMessage
    }
    
    if ($LogFile -and (Test-Path (Split-Path $LogFile))) {
        Add-Content -Path $LogFile -Value $logMessage
    }
}

# 读取配置文件
function Read-Config {
    $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
    
    if (-not (Test-Path $configPath)) {
        Write-Log "配置文件不存在: $configPath" "WARNING"
        return $null
    }
    
    try {
        $config = Get-Content $configPath | ConvertFrom-Json
        Write-Log "配置文件读取成功" "INFO"
        return $config
    } catch {
        Write-Log "配置文件读取失败: $($_.Exception.Message)" "WARNING"
        return $null
    }
}

# 应用配置到参数
function Apply-Config {
    param($Config)
    
    if (-not $Config -or -not $Config.sync) {
        return
    }
    
    if (-not $RepoPath -and $Config.sync.repoPath) {
        $script:RepoPath = $Config.sync.repoPath
        Write-Log "从配置文件应用仓库路径: $RepoPath" "INFO"
    }
    
    if ($Remote -eq "origin" -and $Config.sync.remote) {
        $script:Remote = $Config.sync.remote
        Write-Log "从配置文件应用远程仓库: $Remote" "INFO"
    }
    
    if ($Branch -eq "main" -and $Config.sync.branch) {
        $script:Branch = $Config.sync.branch
        Write-Log "从配置文件应用分支: $Branch" "INFO"
    }
    
    if (-not $LogFile -and $Config.sync.logFile) {
        $script:LogFile = Join-Path $PSScriptRoot $Config.sync.logFile
        Write-Log "从配置文件应用日志文件: $LogFile" "INFO"
    }
    
    if (-not $Silent -and $Config.sync.silent) {
        $script:Silent = $true
        Write-Log "从配置文件应用静默模式" "INFO"
    }
}

# 错误处理函数
function Handle-Error {
    param([string]$Operation, [int]$ExitCode, [string]$Output = "")
    if ($ExitCode -ne 0) {
        $errorMsg = "操作失败: $Operation (退出代码: $ExitCode)"
        if ($Output) {
            $errorMsg += "`n输出: $Output"
        }
        Write-Log $errorMsg "ERROR"
        return $false
    }
    return $true
}

# 获取Git状态信息
function Get-GitStatus {
    param([string]$Path)
    
    try {
        Push-Location $Path
        
        # 获取当前分支
        $currentBranch = git branch --show-current 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "获取当前分支失败" "ERROR"
            return $null
        }
        
        # 获取远程分支信息
        $remoteBranch = git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>&1
        $hasUpstream = $LASTEXITCODE -eq 0
        
        # 获取工作区状态
        $status = git status --porcelain 2>&1
        $hasChanges = $LASTEXITCODE -eq 0 -and $status
        
        # 获取提交差异
        $ahead = 0
        $behind = 0
        if ($hasUpstream) {
            $diff = git rev-list --left-right --count $currentBranch...$remoteBranch 2>&1
            if ($LASTEXITCODE -eq 0) {
                $counts = $diff -split "`t"
                if ($counts.Length -eq 2) {
                    $ahead = [int]$counts[0]
                    $behind = [int]$counts[1]
                }
            }
        }
        
        Pop-Location
        
        return @{
            CurrentBranch = $currentBranch
            HasUpstream = $hasUpstream
            RemoteBranch = $remoteBranch
            HasChanges = $hasChanges
            Changes = $status
            Ahead = $ahead
            Behind = $behind
        }
    } catch {
        Write-Log "获取Git状态时发生错误: $($_.Exception.Message)" "ERROR"
        Pop-Location
        return $null
    }
}

# 智能拉取函数
function Invoke-SmartPull {
    param([string]$Path, [string]$Remote, [string]$Branch, [string]$Strategy = "rebase")
    
    try {
        Push-Location $Path
        
        Write-Log "开始拉取远程更新..." "INFO"
        
        # 根据策略选择拉取方式
        if ($Strategy -eq "rebase") {
            Write-Log "使用rebase方式拉取..." "INFO"
            $output = git pull --rebase --autostash $Remote $Branch 2>&1
            $exitCode = $LASTEXITCODE
        } else {
            Write-Log "使用merge方式拉取..." "INFO"
            $output = git pull $Remote $Branch 2>&1
            $exitCode = $LASTEXITCODE
        }
        
        if ($exitCode -eq 0) {
            Write-Log "远程更新拉取成功" "INFO"
            Pop-Location
            return $true
        }
        
        # 拉取失败，尝试其他策略
        Write-Log "拉取失败，尝试备用策略..." "WARNING"
        Write-Log "输出: $output" "DEBUG"
        
        if ($Strategy -eq "rebase") {
            # 如果rebase失败，尝试merge
            Write-Log "尝试使用merge方式..." "INFO"
            $output = git pull $Remote $Branch 2>&1
            $exitCode = $LASTEXITCODE
        } else {
            # 如果merge失败，尝试rebase
            Write-Log "尝试使用rebase方式..." "INFO"
            $output = git pull --rebase --autostash $Remote $Branch 2>&1
            $exitCode = $LASTEXITCODE
        }
        
        if ($exitCode -eq 0) {
            Write-Log "备用策略拉取成功" "INFO"
            Pop-Location
            return $true
        }
        
        # 所有策略都失败
        Write-Log "所有拉取策略都失败，需要手动解决冲突" "ERROR"
        Write-Log "输出: $output" "ERROR"
        Pop-Location
        return $false
        
    } catch {
        Write-Log "拉取过程中发生异常: $($_.Exception.Message)" "ERROR"
        Pop-Location
        return $false
    }
}

# 主同步函数
function Sync-Repository {
    Write-Log "开始Git仓库自动同步" "INFO"
    Write-Log "仓库路径: $RepoPath" "INFO"
    Write-Log "远程仓库: $Remote" "INFO"
    Write-Log "分支: $Branch" "INFO"
    
    # 切换到仓库目录
    if (-not (Test-Path $RepoPath)) {
        Write-Log "仓库路径不存在: $RepoPath" "ERROR"
        return $false
    }
    
    Set-Location $RepoPath
    
    # 获取Git状态
    $gitStatus = Get-GitStatus $RepoPath
    if (-not $gitStatus) {
        Write-Log "无法获取Git状态" "ERROR"
        return $false
    }
    
    Write-Log "当前分支: $($gitStatus.CurrentBranch)" "INFO"
    Write-Log "本地更改: $($gitStatus.HasChanges)" "INFO"
    Write-Log "领先远程: $($gitStatus.Ahead) 个提交" "INFO"
    Write-Log "落后远程: $($gitStatus.Behind) 个提交" "INFO"
    
    # 处理本地更改
    if ($gitStatus.HasChanges) {
        Write-Log "发现本地更改，正在自动提交..." "INFO"
        
        # 添加所有更改（包括删除的文件）
        $addOutput = git add -A 2>&1
        if (-not (Handle-Error "git add -A" $LASTEXITCODE $addOutput)) {
            return $false
        }
        
        # 检查是否有需要提交的内容
        $statusAfterAdd = git status --porcelain 2>&1
        if ($LASTEXITCODE -eq 0 -and $statusAfterAdd) {
            # 提交更改
            $commitMessage = "Auto sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            $commitOutput = git commit -m $commitMessage 2>&1
            if (-not (Handle-Error "git commit" $LASTEXITCODE $commitOutput)) {
                return $false
            }
            
            Write-Log "本地更改已自动提交" "INFO"
        } else {
            Write-Log "没有需要提交的更改" "INFO"
        }
    } else {
        Write-Log "没有本地更改需要提交" "INFO"
    }
    
    # 拉取远程更新
    $pullSuccess = Invoke-SmartPull -Path $RepoPath -Remote $Remote -Branch $Branch
    if (-not $pullSuccess) {
        Write-Log "远程拉取失败，同步终止" "ERROR"
        return $false
    }
    
    # 推送本地更改
    if ($gitStatus.Ahead -gt 0 -or $gitStatus.HasChanges) {
        Write-Log "推送本地更改..." "INFO"
        $pushOutput = git push $Remote $Branch 2>&1
        if (-not (Handle-Error "git push" $LASTEXITCODE $pushOutput)) {
            Write-Log "推送失败，可能需要身份验证" "ERROR"
            return $false
        }
        
        Write-Log "本地更改推送成功" "INFO"
    } else {
        Write-Log "没有需要推送的更改" "INFO"
    }
    
    Write-Log "Git仓库同步完成" "INFO"
    return $true
}

# 执行同步
try {
    # 应用配置文件
    if ($UseConfig) {
        $config = Read-Config
        Apply-Config $config
    }
    
    # 验证必要参数
    if (-not $RepoPath) {
        Write-Log "仓库路径未指定，请使用 -RepoPath 参数或配置文件" "ERROR"
        exit 1
    }
    
    $success = Sync-Repository
    if ($success) {
        Write-Log "同步操作成功完成" "INFO"
        exit 0
    } else {
        Write-Log "同步操作失败" "ERROR"
        exit 1
    }
} catch {
    Write-Log "同步过程中发生异常: $($_.Exception.Message)" "ERROR"
    exit 1
} 