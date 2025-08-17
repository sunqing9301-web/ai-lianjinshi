# Git自动同步 - 简化版GUI应用
# 提供友好的图形界面来管理Git自动同步

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 创建主窗体
$mainForm = New-Object System.Windows.Forms.Form
$mainForm.Text = "Git自动同步工具 v2.0"
$mainForm.Size = New-Object System.Drawing.Size(800, 600)
$mainForm.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$mainForm.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
$mainForm.MaximizeBox = $false

# 创建选项卡控件
$tabControl = New-Object System.Windows.Forms.TabControl
$tabControl.Dock = [System.Windows.Forms.DockStyle]::Fill
$mainForm.Controls.Add($tabControl)

# 配置页面
$configTab = New-Object System.Windows.Forms.TabPage
$configTab.Text = "配置"
$tabControl.TabPages.Add($configTab)

# 本地路径
$localPathLabel = New-Object System.Windows.Forms.Label
$localPathLabel.Text = "本地项目路径:"
$localPathLabel.Location = New-Object System.Drawing.Point(20, 20)
$localPathLabel.Size = New-Object System.Drawing.Size(120, 20)
$configTab.Controls.Add($localPathLabel)

$localPathTextBox = New-Object System.Windows.Forms.TextBox
$localPathTextBox.Location = New-Object System.Drawing.Point(150, 20)
$localPathTextBox.Size = New-Object System.Drawing.Size(400, 20)
$configTab.Controls.Add($localPathTextBox)

$browseButton = New-Object System.Windows.Forms.Button
$browseButton.Text = "浏览..."
$browseButton.Location = New-Object System.Drawing.Point(560, 20)
$browseButton.Size = New-Object System.Drawing.Size(80, 23)
$browseButton.Add_Click({
    $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
    $folderBrowser.Description = "选择Git仓库文件夹"
    $folderBrowser.ShowNewFolderButton = $false
    
    if ($folderBrowser.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $localPathTextBox.Text = $folderBrowser.SelectedPath
    }
})
$configTab.Controls.Add($browseButton)

# 远程仓库地址
$remoteUrlLabel = New-Object System.Windows.Forms.Label
$remoteUrlLabel.Text = "远程仓库地址:"
$remoteUrlLabel.Location = New-Object System.Drawing.Point(20, 60)
$remoteUrlLabel.Size = New-Object System.Drawing.Size(120, 20)
$configTab.Controls.Add($remoteUrlLabel)

$remoteUrlTextBox = New-Object System.Windows.Forms.TextBox
$remoteUrlTextBox.Location = New-Object System.Drawing.Point(150, 60)
$remoteUrlTextBox.Size = New-Object System.Drawing.Size(490, 20)
$configTab.Controls.Add($remoteUrlTextBox)

# 分支名称
$branchLabel = New-Object System.Windows.Forms.Label
$branchLabel.Text = "分支名称:"
$branchLabel.Location = New-Object System.Drawing.Point(20, 100)
$branchLabel.Size = New-Object System.Drawing.Size(120, 20)
$configTab.Controls.Add($branchLabel)

$branchTextBox = New-Object System.Windows.Forms.TextBox
$branchTextBox.Location = New-Object System.Drawing.Point(150, 100)
$branchTextBox.Size = New-Object System.Drawing.Size(200, 20)
$branchTextBox.Text = "main"
$configTab.Controls.Add($branchTextBox)

# 同步间隔
$intervalLabel = New-Object System.Windows.Forms.Label
$intervalLabel.Text = "同步间隔(分钟):"
$intervalLabel.Location = New-Object System.Drawing.Point(20, 140)
$intervalLabel.Size = New-Object System.Drawing.Size(120, 20)
$configTab.Controls.Add($intervalLabel)

$intervalNumeric = New-Object System.Windows.Forms.NumericUpDown
$intervalNumeric.Location = New-Object System.Drawing.Point(150, 140)
$intervalNumeric.Size = New-Object System.Drawing.Size(100, 20)
$intervalNumeric.Minimum = 1
$intervalNumeric.Maximum = 1440
$intervalNumeric.Value = 5
$configTab.Controls.Add($intervalNumeric)

# 测试连接按钮
$testConnectionButton = New-Object System.Windows.Forms.Button
$testConnectionButton.Text = "测试连接"
$testConnectionButton.Location = New-Object System.Drawing.Point(150, 180)
$testConnectionButton.Size = New-Object System.Drawing.Size(100, 30)
$testConnectionButton.Add_Click({
    try {
        $localPath = $localPathTextBox.Text
        $remoteUrl = $remoteUrlTextBox.Text
        
        if (-not (Test-Path $localPath)) {
            [System.Windows.Forms.MessageBox]::Show("本地路径不存在！", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            return
        }
        
        if (-not (Test-Path (Join-Path $localPath ".git"))) {
            [System.Windows.Forms.MessageBox]::Show("指定路径不是Git仓库！", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            return
        }
        
        Push-Location $localPath
        $remoteCheck = git remote get-url origin 2>&1
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            [System.Windows.Forms.MessageBox]::Show("Git仓库连接正常！`n远程地址: $remoteCheck", "成功", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        } else {
            [System.Windows.Forms.MessageBox]::Show("Git仓库连接失败！请检查配置。", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show("测试连接时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    }
})
$configTab.Controls.Add($testConnectionButton)

# 保存配置按钮
$saveConfigButton = New-Object System.Windows.Forms.Button
$saveConfigButton.Text = "保存配置"
$saveConfigButton.Location = New-Object System.Drawing.Point(270, 180)
$saveConfigButton.Size = New-Object System.Drawing.Size(100, 30)
$saveConfigButton.Add_Click({
    try {
        $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
        $config = @{
            sync = @{
                enabled = $true
                interval = [int]$intervalNumeric.Value
                taskName = "GitAutoSync"
                repoPath = $localPathTextBox.Text
                remote = "origin"
                branch = $branchTextBox.Text
                logFile = "sync.log"
                silent = $true
                autoCommit = $true
                autoPush = $true
                conflictStrategy = "rebase"
                retryAttempts = 3
                retryDelay = 30
            }
        }
        
        $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
        
        [System.Windows.Forms.MessageBox]::Show("配置保存成功！", "成功", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    } catch {
        [System.Windows.Forms.MessageBox]::Show("保存配置时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    }
})
$configTab.Controls.Add($saveConfigButton)

# 状态页面
$statusTab = New-Object System.Windows.Forms.TabPage
$statusTab.Text = "状态"
$tabControl.TabPages.Add($statusTab)

# 状态标签
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "状态: 未运行"
$statusLabel.Location = New-Object System.Drawing.Point(20, 20)
$statusLabel.Size = New-Object System.Drawing.Size(300, 20)
$statusLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10, [System.Drawing.FontStyle]::Bold)
$statusTab.Controls.Add($statusLabel)

# 进度条
$syncProgressBar = New-Object System.Windows.Forms.ProgressBar
$syncProgressBar.Location = New-Object System.Drawing.Point(20, 60)
$syncProgressBar.Size = New-Object System.Drawing.Size(400, 20)
$syncProgressBar.Style = [System.Windows.Forms.ProgressBarStyle]::Marquee
$statusTab.Controls.Add($syncProgressBar)

# 启动自动同步按钮
$startSyncButton = New-Object System.Windows.Forms.Button
$startSyncButton.Text = "启动自动同步"
$startSyncButton.Location = New-Object System.Drawing.Point(20, 100)
$startSyncButton.Size = New-Object System.Drawing.Size(120, 30)
$startSyncButton.Add_Click({
    try {
        $scriptPath = Join-Path $PSScriptRoot "setup-auto-sync.ps1"
        if (Test-Path $scriptPath) {
            Start-Process PowerShell -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath`" -Force" -Verb RunAs
            [System.Windows.Forms.MessageBox]::Show("正在创建任务计划，请稍候...", "提示", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        } else {
            [System.Windows.Forms.MessageBox]::Show("找不到设置脚本！", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show("启动自动同步时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    }
})
$statusTab.Controls.Add($startSyncButton)

# 停止自动同步按钮
$stopSyncButton = New-Object System.Windows.Forms.Button
$stopSyncButton.Text = "停止自动同步"
$stopSyncButton.Location = New-Object System.Drawing.Point(160, 100)
$stopSyncButton.Size = New-Object System.Drawing.Size(120, 30)
$stopSyncButton.Add_Click({
    try {
        $task = Get-ScheduledTask -TaskName "GitAutoSync" -ErrorAction SilentlyContinue
        if ($task) {
            Stop-ScheduledTask -TaskName "GitAutoSync"
            [System.Windows.Forms.MessageBox]::Show("自动同步已停止！", "成功", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        } else {
            [System.Windows.Forms.MessageBox]::Show("未找到运行中的自动同步任务！", "提示", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show("停止自动同步时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    }
})
$statusTab.Controls.Add($stopSyncButton)

# 手动同步按钮
$manualSyncButton = New-Object System.Windows.Forms.Button
$manualSyncButton.Text = "手动同步"
$manualSyncButton.Location = New-Object System.Drawing.Point(300, 100)
$manualSyncButton.Size = New-Object System.Drawing.Size(120, 30)
$manualSyncButton.Add_Click({
    try {
        $scriptPath = Join-Path $PSScriptRoot "auto-sync.ps1"
        if (Test-Path $scriptPath) {
            $result = & $scriptPath -Silent
            if ($LASTEXITCODE -eq 0) {
                [System.Windows.Forms.MessageBox]::Show("手动同步完成！", "成功", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
            } else {
                [System.Windows.Forms.MessageBox]::Show("手动同步失败！", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            }
        } else {
            [System.Windows.Forms.MessageBox]::Show("找不到同步脚本！", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show("手动同步时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    }
})
$statusTab.Controls.Add($manualSyncButton)

# 日志页面
$logTab = New-Object System.Windows.Forms.TabPage
$logTab.Text = "日志"
$tabControl.TabPages.Add($logTab)

# 日志文本框
$logTextBox = New-Object System.Windows.Forms.RichTextBox
$logTextBox.Location = New-Object System.Drawing.Point(20, 20)
$logTextBox.Size = New-Object System.Drawing.Size(740, 400)
$logTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logTextBox.ReadOnly = $true
$logTextBox.BackColor = [System.Drawing.Color]::Black
$logTextBox.ForeColor = [System.Drawing.Color]::Lime
$logTab.Controls.Add($logTextBox)

# 刷新日志按钮
$refreshLogButton = New-Object System.Windows.Forms.Button
$refreshLogButton.Text = "刷新日志"
$refreshLogButton.Location = New-Object System.Drawing.Point(20, 440)
$refreshLogButton.Size = New-Object System.Drawing.Size(100, 30)
$refreshLogButton.Add_Click({
    try {
        $logPath = Join-Path $PSScriptRoot "sync.log"
        if (Test-Path $logPath) {
            $logContent = Get-Content $logPath -Tail 50
            $logTextBox.Text = $logContent -join "`n"
            $logTextBox.SelectionStart = $logTextBox.TextLength
            $logTextBox.ScrollToCaret()
        } else {
            $logTextBox.Text = "日志文件不存在"
        }
    } catch {
        $logTextBox.Text = "刷新日志失败: $($_.Exception.Message)"
    }
})
$logTab.Controls.Add($refreshLogButton)

# 打开日志文件按钮
$openLogFileButton = New-Object System.Windows.Forms.Button
$openLogFileButton.Text = "打开日志文件"
$openLogFileButton.Location = New-Object System.Drawing.Point(140, 440)
$openLogFileButton.Size = New-Object System.Drawing.Size(120, 30)
$openLogFileButton.Add_Click({
    try {
        $logPath = Join-Path $PSScriptRoot "sync.log"
        if (Test-Path $logPath) {
            Start-Process notepad $logPath
        } else {
            [System.Windows.Forms.MessageBox]::Show("日志文件不存在！", "提示", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show("打开日志文件时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    }
})
$logTab.Controls.Add($openLogFileButton)

# 帮助页面
$helpTab = New-Object System.Windows.Forms.TabPage
$helpTab.Text = "帮助"
$tabControl.TabPages.Add($helpTab)

$helpTextBox = New-Object System.Windows.Forms.RichTextBox
$helpTextBox.Location = New-Object System.Drawing.Point(20, 20)
$helpTextBox.Size = New-Object System.Drawing.Size(740, 500)
$helpTextBox.Font = New-Object System.Drawing.Font("Microsoft YaHei", 9)
$helpTextBox.ReadOnly = $true
$helpTextBox.Text = @"
Git自动同步工具 v2.0 - 使用帮助

🎯 功能特性：
• 完全自动化的Git仓库同步
• 图形化界面，操作简单
• 实时状态监控
• 详细日志记录
• 智能冲突处理

📋 使用步骤：
1. 配置页面：设置本地路径和远程仓库地址
2. 状态页面：启动/停止自动同步
3. 日志页面：查看同步日志
4. 帮助页面：查看使用说明

⚙️ 配置说明：
• 本地项目路径：Git仓库的本地路径
• 远程仓库地址：GitHub/GitLab等远程仓库地址
• 分支名称：要同步的分支（如main、master）
• 同步间隔：自动同步的时间间隔（分钟）

🔧 管理命令：
• 启动自动同步：创建Windows任务计划
• 停止自动同步：停止任务计划
• 手动同步：立即执行一次同步
• 查看日志：实时监控同步状态

🛡️ 安全特性：
• 自动冲突处理
• 备份机制
• 错误重试
• 详细日志

📞 技术支持：
• 查看日志文件获取详细信息
• 检查任务状态排查问题
• 重新配置解决连接问题

🎉 设置完成后，您的项目将完全自动化同步！
"@
$helpTab.Controls.Add($helpTextBox)

# 加载配置
try {
    $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        $localPathTextBox.Text = $config.sync.repoPath
        $branchTextBox.Text = $config.sync.branch
        $intervalNumeric.Value = $config.sync.interval
        
        # 尝试获取远程URL
        if ($config.sync.repoPath -and (Test-Path $config.sync.repoPath)) {
            Push-Location $config.sync.repoPath
            $remoteUrl = git remote get-url origin 2>&1
            Pop-Location
            if ($LASTEXITCODE -eq 0) {
                $remoteUrlTextBox.Text = $remoteUrl
            }
        }
    }
} catch {
    Write-Host "加载配置失败: $($_.Exception.Message)"
}

# 刷新日志
try {
    $logPath = Join-Path $PSScriptRoot "sync.log"
    if (Test-Path $logPath) {
        $logContent = Get-Content $logPath -Tail 50
        $logTextBox.Text = $logContent -join "`n"
    } else {
        $logTextBox.Text = "日志文件不存在"
    }
} catch {
    $logTextBox.Text = "加载日志失败: $($_.Exception.Message)"
}

# 显示窗体
$mainForm.ShowDialog() 