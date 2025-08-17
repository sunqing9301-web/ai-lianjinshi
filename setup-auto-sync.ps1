# Git仓库全自动同步设置工具
# 自动创建Windows任务计划，实现完全自动化的Git同步

param(
    [string]$RepoPath = $PSScriptRoot,
    [string]$SyncInterval = "5",  # 同步间隔（分钟）
    [string]$TaskName = "GitAutoSync",
    [switch]$Force = $false
)

# 检查管理员权限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 创建任务计划
function Create-ScheduledTask {
    param(
        [string]$TaskName,
        [string]$RepoPath,
        [string]$SyncInterval
    )
    
    Write-Host "正在创建Windows任务计划..." -ForegroundColor Yellow
    
    # 构建PowerShell命令
    $scriptPath = Join-Path $RepoPath "auto-sync.ps1"
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`" -Silent"
    
    # 设置触发器（每X分钟执行一次）
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes ([int]$SyncInterval)) -RepetitionDuration (New-TimeSpan -Days 365)
    
    # 设置任务设置
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    
    # 创建任务
    try {
        Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Git仓库自动同步任务" -Force:$Force
        Write-Host "✅ 任务计划创建成功！" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ 任务计划创建失败: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 主函数
function Main {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   Git仓库全自动同步设置工具" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # 检查管理员权限
    if (-not (Test-Administrator)) {
        Write-Host "❌ 需要管理员权限来创建任务计划" -ForegroundColor Red
        Write-Host "请以管理员身份运行此脚本" -ForegroundColor Yellow
        exit 1
    }
    
    # 检查Git仓库
    if (-not (Test-Path (Join-Path $RepoPath ".git"))) {
        Write-Host "❌ 指定路径不是Git仓库: $RepoPath" -ForegroundColor Red
        exit 1
    }
    
    # 检查同步脚本
    $scriptPath = Join-Path $RepoPath "auto-sync.ps1"
    if (-not (Test-Path $scriptPath)) {
        Write-Host "❌ 同步脚本不存在: $scriptPath" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "配置信息:" -ForegroundColor Yellow
    Write-Host "  仓库路径: $RepoPath" -ForegroundColor White
    Write-Host "  同步间隔: $SyncInterval 分钟" -ForegroundColor White
    Write-Host "  任务名称: $TaskName" -ForegroundColor White
    Write-Host "  同步脚本: $scriptPath" -ForegroundColor White
    Write-Host ""
    
    # 检查任务是否已存在
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        if ($Force) {
            Write-Host "⚠️  任务已存在，将覆盖..." -ForegroundColor Yellow
        } else {
            Write-Host "❌ 任务已存在: $TaskName" -ForegroundColor Red
            Write-Host "使用 -Force 参数覆盖现有任务" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # 创建任务计划
    $success = Create-ScheduledTask -TaskName $TaskName -RepoPath $RepoPath -SyncInterval $SyncInterval
    
    if ($success) {
        Write-Host ""
        Write-Host "🎉 全自动同步设置完成！" -ForegroundColor Green
        Write-Host ""
        Write-Host "任务详情:" -ForegroundColor Cyan
        Write-Host "  任务名称: $TaskName" -ForegroundColor White
        Write-Host "  执行间隔: 每 $SyncInterval 分钟" -ForegroundColor White
        Write-Host "  执行脚本: $scriptPath" -ForegroundColor White
        Write-Host ""
        Write-Host "管理任务:" -ForegroundColor Cyan
        Write-Host "  启动任务: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
        Write-Host "  停止任务: Stop-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
        Write-Host "  删除任务: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false" -ForegroundColor White
        Write-Host "  查看任务: Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
        Write-Host ""
        Write-Host "任务将自动在后台运行，无需人工干预！" -ForegroundColor Green
    } else {
        Write-Host "❌ 设置失败，请检查错误信息" -ForegroundColor Red
        exit 1
    }
}

# 执行主函数
Main 