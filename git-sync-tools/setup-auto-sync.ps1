# Git自动同步 - 计划任务设置脚本
# 读取配置文件并创建Windows计划任务

param(
    [switch]$Force = $false,
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
}

# 读取配置文件
function Read-Config {
    $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
    
    if (-not (Test-Path $configPath)) {
        Write-Log "配置文件不存在: $configPath" "ERROR"
        return $null
    }
    
    try {
        $config = Get-Content $configPath | ConvertFrom-Json
        Write-Log "配置文件读取成功" "INFO"
        return $config
    } catch {
        Write-Log "配置文件读取失败: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

# 验证配置
function Test-Config {
    param($Config)
    
    if (-not $Config) {
        return $false
    }
    
    if (-not $Config.sync) {
        Write-Log "配置缺少sync节点" "ERROR"
        return $false
    }
    
    $required = @("repoPath", "interval", "taskName", "remote", "branch")
    foreach ($field in $required) {
        if (-not $Config.sync.$field) {
            Write-Log "配置缺少必需字段: $field" "ERROR"
            return $false
        }
    }
    
    if (-not (Test-Path $Config.sync.repoPath)) {
        Write-Log "仓库路径不存在: $($Config.sync.repoPath)" "ERROR"
        return $false
    }
    
    if (-not (Test-Path (Join-Path $Config.sync.repoPath ".git"))) {
        Write-Log "指定路径不是Git仓库: $($Config.sync.repoPath)" "ERROR"
        return $false
    }
    
    Write-Log "配置验证通过" "INFO"
    return $true
}

# 创建计划任务
function Create-ScheduledTask {
    param($Config)
    
    $taskName = $Config.sync.taskName
    $repoPath = $Config.sync.repoPath
    $interval = $Config.sync.interval
    $scriptPath = Join-Path $PSScriptRoot "auto-sync.ps1"
    
    Write-Log "正在创建计划任务: $taskName" "INFO"
    Write-Log "仓库路径: $repoPath" "INFO"
    Write-Log "同步间隔: $interval 分钟" "INFO"
    
    # 检查任务是否已存在
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        if (-not $Force) {
            Write-Log "计划任务已存在: $taskName" "WARNING"
            $confirm = Read-Host "是否删除现有任务并重新创建？(Y/N)"
            if ($confirm -ne "Y" -and $confirm -ne "y") {
                Write-Log "操作已取消" "INFO"
                return $false
            }
        }
        
        Write-Log "删除现有任务: $taskName" "INFO"
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    
    # 构建任务参数
    $taskArguments = @(
        "-ExecutionPolicy", "Bypass",
        "-File", "`"$scriptPath`"",
        "-RepoPath", "`"$repoPath`"",
        "-Remote", $Config.sync.remote,
        "-Branch", $Config.sync.branch,
        "-LogFile", "`"$(Join-Path $PSScriptRoot $Config.sync.logFile)`""
    )
    
    if ($Config.sync.silent) {
        $taskArguments += "-Silent"
    }
    
    $taskArguments = $taskArguments -join " "
    
    # 创建触发器（每X分钟执行一次）
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $interval) -RepetitionDuration (New-TimeSpan -Days 365)
    
    # 创建动作
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument $taskArguments -WorkingDirectory $PSScriptRoot
    
    # 创建设置
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    
    # 创建任务
    try {
        $task = Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Settings $settings -Description "Git自动同步任务 - 每$interval分钟同步一次" -Force
        
        Write-Log "计划任务创建成功: $taskName" "INFO"
        Write-Log "任务路径: $($task.TaskPath)" "INFO"
        Write-Log "下次运行时间: $($task.NextRunTime)" "INFO"
        
        # 启动任务
        Start-ScheduledTask -TaskName $taskName
        Write-Log "计划任务已启动" "INFO"
        
        return $true
    } catch {
        Write-Log "计划任务创建失败: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# 显示任务信息
function Show-TaskInfo {
    param($Config)
    
    $taskName = $Config.sync.taskName
    
    Write-Log "=== 任务信息 ===" "INFO"
    Write-Log "任务名称: $taskName" "INFO"
    Write-Log "仓库路径: $($Config.sync.repoPath)" "INFO"
    Write-Log "远程仓库: $($Config.sync.remote)" "INFO"
    Write-Log "分支: $($Config.sync.branch)" "INFO"
    Write-Log "同步间隔: $($Config.sync.interval) 分钟" "INFO"
    Write-Log "自动提交: $($Config.sync.autoCommit)" "INFO"
    Write-Log "自动推送: $($Config.sync.autoPush)" "INFO"
    Write-Log "静默模式: $($Config.sync.silent)" "INFO"
    Write-Log "日志文件: $($Config.sync.logFile)" "INFO"
    
    # 检查任务状态
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Log "任务状态: $($task.State)" "INFO"
        Write-Log "下次运行: $($task.NextRunTime)" "INFO"
        Write-Log "最后运行: $($task.LastRunTime)" "INFO"
    } else {
        Write-Log "任务状态: 未找到" "WARNING"
    }
    
    Write-Log "=== 管理命令 ===" "INFO"
    Write-Log "查看任务状态: Get-ScheduledTask -TaskName `"$taskName`"" "INFO"
    Write-Log "手动启动: Start-ScheduledTask -TaskName `"$taskName`"" "INFO"
    Write-Log "停止任务: Stop-ScheduledTask -TaskName `"$taskName`"" "INFO"
    Write-Log "删除任务: Unregister-ScheduledTask -TaskName `"$taskName`" -Confirm:`$false" "INFO"
    Write-Log "查看日志: Get-Content `"$(Join-Path $PSScriptRoot $Config.sync.logFile)`" -Tail 20" "INFO"
}

# 主函数
function Main {
    Write-Log "=== Git自动同步 - 计划任务设置 ===" "INFO"
    Write-Log "脚本路径: $PSScriptRoot" "INFO"
    
    # 检查管理员权限
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    if (-not $isAdmin) {
        Write-Log "需要管理员权限来创建计划任务" "ERROR"
        Write-Log "请以管理员身份运行此脚本" "ERROR"
        return $false
    }
    
    # 读取配置
    $config = Read-Config
    if (-not $config) {
        return $false
    }
    
    # 验证配置
    if (-not (Test-Config $config)) {
        return $false
    }
    
    # 显示配置信息
    Show-TaskInfo $config
    
    # 创建计划任务
    $success = Create-ScheduledTask $config
    
    if ($success) {
        Write-Log "=== 设置完成 ===" "INFO"
        Write-Log "Git自动同步已成功设置！" "INFO"
        Write-Log "任务将每 $($config.sync.interval) 分钟自动执行一次" "INFO"
        Write-Log "无需人工干预，完全自动化运行" "INFO"
        return $true
    } else {
        Write-Log "=== 设置失败 ===" "ERROR"
        Write-Log "请检查错误信息并重试" "ERROR"
        return $false
    }
}

# 执行主函数
try {
    $result = Main
    if ($result) {
        exit 0
    } else {
        exit 1
    }
} catch {
    Write-Log "脚本执行异常: $($_.Exception.Message)" "ERROR"
    exit 1
}