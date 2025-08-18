# Git自动同步配置向导
# 交互式配置Git仓库地址和本地路径

param(
    [switch]$Silent = $false
)

# 显示欢迎信息
function Show-Welcome {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   Git自动同步 - 配置向导" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "欢迎使用Git自动同步配置向导！" -ForegroundColor Green
    Write-Host "请按照提示输入相关信息。" -ForegroundColor White
    Write-Host ""
}

# 获取当前配置
function Get-CurrentConfig {
    $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
    if (Test-Path $configPath) {
        try {
            $config = Get-Content $configPath | ConvertFrom-Json
            return $config
        } catch {
            Write-Host "⚠️  配置文件读取失败，将使用默认配置" -ForegroundColor Yellow
        }
    }
    return $null
}

# 获取用户输入
function Get-UserInput {
    param(
        [string]$Prompt,
        [string]$DefaultValue = "",
        [string]$Description = ""
    )
    
    if ($Description) {
        Write-Host $Description -ForegroundColor Gray
    }
    
    if ($DefaultValue) {
        $input = Read-Host "$Prompt (默认: $DefaultValue)"
        if ([string]::IsNullOrWhiteSpace($input)) {
            return $DefaultValue
        }
        return $input
    } else {
        return Read-Host $Prompt
    }
}

# 验证路径
function Test-ValidPath {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Host "❌ 路径不存在: $Path" -ForegroundColor Red
        return $false
    }
    
    if (-not (Test-Path (Join-Path $Path ".git"))) {
        Write-Host "❌ 指定路径不是Git仓库: $Path" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# 验证Git仓库
function Test-GitRepository {
    param([string]$Path)
    
    try {
        Push-Location $Path
        $status = git status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Git仓库状态正常" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Git仓库状态异常" -ForegroundColor Red
            return $false
        }
    } finally {
        Pop-Location
    }
}

# 检查远程仓库
function Test-RemoteRepository {
    param([string]$Path)
    
    try {
        Push-Location $Path
        $remoteUrl = git remote get-url origin 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 远程仓库已配置: $remoteUrl" -ForegroundColor Green
            return $remoteUrl
        } else {
            Write-Host "⚠️  未检测到远程仓库配置" -ForegroundColor Yellow
            return $null
        }
    } finally {
        Pop-Location
    }
}

# 更新配置文件
function Update-ConfigFile {
    param(
        [string]$RepoPath,
        [string]$RemoteUrl,
        [string]$Branch,
        [int]$Interval
    )
    
    $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
    
    try {
        if (Test-Path $configPath) {
            $config = Get-Content $configPath | ConvertFrom-Json
        } else {
            # 创建默认配置
            $config = @{
                sync = @{
                    enabled = $true
                    interval = 5
                    taskName = "GitAutoSync"
                    repoPath = ""
                    remote = "origin"
                    branch = "main"
                    logFile = "sync.log"
                    silent = $true
                    autoCommit = $true
                    autoPush = $true
                    conflictStrategy = "rebase"
                    retryAttempts = 3
                    retryDelay = 30
                }
                notifications = @{
                    enabled = $false
                    email = ""
                    webhook = ""
                    desktop = $true
                }
                backup = @{
                    enabled = $true
                    backupPath = "backup"
                    maxBackups = 10
                    backupBeforeSync = $true
                }
                filters = @{
                    excludeFiles = @("*.tmp", "*.log", "node_modules/", ".git/", "backup/")
                    includeFiles = @("*.js", "*.html", "*.css", "*.json", "*.md")
                }
                advanced = @{
                    gitConfig = @{
                        "user.name" = "sunqing9301-web"
                        "user.email" = "sunqing9301-web@users.noreply.github.com"
                        "pull.rebase" = $true
                        "push.default" = "simple"
                    }
                    hooks = @{
                        preSync = ""
                        postSync = ""
                        onError = ""
                    }
                }
            } | ConvertTo-Json -Depth 10 | ConvertFrom-Json
        }
        
        # 更新配置
        $config.sync.repoPath = $RepoPath
        $config.sync.interval = $Interval
        $config.sync.branch = $Branch
        
        # 保存配置
        $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
        
        Write-Host "✅ 配置文件更新成功！" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ 配置文件更新失败: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 主函数
function Main {
    Show-Welcome
    
    # 获取当前目录作为默认本地路径
    $defaultLocalPath = Split-Path (Split-Path $PSScriptRoot)
    $defaultRemoteUrl = "https://github.com/sunqing9301-web/ai-lianjinshi.git"
    
    Write-Host "当前检测到的信息：" -ForegroundColor Yellow
    Write-Host "  本地项目路径: $defaultLocalPath" -ForegroundColor White
    Write-Host "  远程仓库地址: $defaultRemoteUrl" -ForegroundColor White
    Write-Host ""
    
    # 获取用户输入
    $localPath = Get-UserInput -Prompt "请输入本地项目路径" -DefaultValue $defaultLocalPath -Description "请确保该路径包含.git文件夹"
    $remoteUrl = Get-UserInput -Prompt "请输入远程仓库地址" -DefaultValue $defaultRemoteUrl -Description "支持HTTPS和SSH格式"
    $branch = Get-UserInput -Prompt "请输入分支名称" -DefaultValue "main"
    $interval = Get-UserInput -Prompt "请输入同步间隔(分钟)" -DefaultValue "5"
    
    # 验证输入
    if (-not (Test-ValidPath $localPath)) {
        Write-Host "❌ 路径验证失败，请检查输入" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    
    if (-not (Test-GitRepository $localPath)) {
        Write-Host "❌ Git仓库验证失败" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    
    # 检查远程仓库
    $currentRemote = Test-RemoteRepository $localPath
    if (-not $currentRemote) {
        Write-Host "正在添加远程仓库..." -ForegroundColor Yellow
        try {
            Push-Location $localPath
            git remote add origin $remoteUrl
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ 远程仓库添加成功" -ForegroundColor Green
            } else {
                Write-Host "❌ 远程仓库添加失败" -ForegroundColor Red
                Read-Host "按回车键退出"
                exit 1
            }
        } finally {
            Pop-Location
        }
    } elseif ($currentRemote -ne $remoteUrl) {
        Write-Host "⚠️  远程仓库地址不匹配" -ForegroundColor Yellow
        Write-Host "  当前: $currentRemote" -ForegroundColor White
        Write-Host "  输入: $remoteUrl" -ForegroundColor White
        $updateRemote = Read-Host "是否更新远程仓库地址？(Y/N)"
        if ($updateRemote -eq "Y" -or $updateRemote -eq "y") {
            try {
                Push-Location $localPath
                git remote set-url origin $remoteUrl
                Write-Host "✅ 远程仓库地址更新成功" -ForegroundColor Green
            } finally {
                Pop-Location
            }
        }
    }
    
    # 确认配置
    Write-Host ""
    Write-Host "配置信息确认：" -ForegroundColor Cyan
    Write-Host "  本地项目路径: $localPath" -ForegroundColor White
    Write-Host "  远程仓库地址: $remoteUrl" -ForegroundColor White
    Write-Host "  分支名称: $branch" -ForegroundColor White
    Write-Host "  同步间隔: $interval 分钟" -ForegroundColor White
    Write-Host ""
    
    $confirm = Read-Host "确认以上配置信息？(Y/N)"
    if ($confirm -ne "Y" -and $confirm -ne "y") {
        Write-Host "配置已取消" -ForegroundColor Yellow
        Read-Host "按回车键退出"
        exit 0
    }
    
    # 更新配置文件
    $success = Update-ConfigFile -RepoPath $localPath -RemoteUrl $remoteUrl -Branch $branch -Interval ([int]$interval)
    
    if ($success) {
        Write-Host ""
        Write-Host "🎉 配置完成！" -ForegroundColor Green
        Write-Host ""
        Write-Host "配置信息：" -ForegroundColor Cyan
        Write-Host "  本地项目路径: $localPath" -ForegroundColor White
        Write-Host "  远程仓库地址: $remoteUrl" -ForegroundColor White
        Write-Host "  分支名称: $branch" -ForegroundColor White
        Write-Host "  同步间隔: $interval 分钟" -ForegroundColor White
        Write-Host ""
        Write-Host "下一步：" -ForegroundColor Cyan
        Write-Host "  1. 运行 '一键设置全自动同步.bat' 创建任务计划" -ForegroundColor White
        Write-Host "  2. 或运行 'setup-auto-sync.ps1' 手动设置" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ 配置失败" -ForegroundColor Red
    }
    
    Read-Host "按回车键退出"
}

# 执行主函数
Main 