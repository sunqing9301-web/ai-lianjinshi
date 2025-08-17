# Git自动同步 - 图形化界面应用
# 提供友好的GUI界面来管理Git自动同步

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 主窗体类
class GitAutoSyncGUI {
    [System.Windows.Forms.Form]$MainForm
    [System.Windows.Forms.TabControl]$TabControl
    [System.Windows.Forms.TabPage]$ConfigTab
    [System.Windows.Forms.TabPage]$StatusTab
    [System.Windows.Forms.TabPage]$LogTab
    [System.Windows.Forms.TabPage]$HelpTab
    
    # 配置页面控件
    [System.Windows.Forms.TextBox]$LocalPathTextBox
    [System.Windows.Forms.TextBox]$RemoteUrlTextBox
    [System.Windows.Forms.TextBox]$BranchTextBox
    [System.Windows.Forms.NumericUpDown]$IntervalNumeric
    [System.Windows.Forms.Button]$BrowseButton
    [System.Windows.Forms.Button]$TestConnectionButton
    [System.Windows.Forms.Button]$SaveConfigButton
    
    # 状态页面控件
    [System.Windows.Forms.Label]$StatusLabel
    [System.Windows.Forms.Button]$StartSyncButton
    [System.Windows.Forms.Button]$StopSyncButton
    [System.Windows.Forms.Button]$ManualSyncButton
    [System.Windows.Forms.ProgressBar]$SyncProgressBar
    [System.Windows.Forms.Timer]$StatusTimer
    
    # 日志页面控件
    [System.Windows.Forms.RichTextBox]$LogTextBox
    [System.Windows.Forms.Button]$RefreshLogButton
    [System.Windows.Forms.Button]$ClearLogButton
    [System.Windows.Forms.Button]$OpenLogFileButton
    
    # 帮助页面控件
    [System.Windows.Forms.RichTextBox]$HelpTextBox
    
    # 构造函数
    GitAutoSyncGUI() {
        $this.InitializeForm()
        $this.CreateConfigTab()
        $this.CreateStatusTab()
        $this.CreateLogTab()
        $this.CreateHelpTab()
        $this.LoadConfiguration()
        $this.UpdateStatus()
    }
    
    # 初始化主窗体
    [void]InitializeForm() {
        $this.MainForm = New-Object System.Windows.Forms.Form
        $this.MainForm.Text = "Git自动同步工具 v2.0"
        $this.MainForm.Size = New-Object System.Drawing.Size(800, 600)
        $this.MainForm.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
        $this.MainForm.Icon = [System.Drawing.SystemIcons]::Information
        $this.MainForm.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
        $this.MainForm.MaximizeBox = $false
        
        $this.TabControl = New-Object System.Windows.Forms.TabControl
        $this.TabControl.Dock = [System.Windows.Forms.DockStyle]::Fill
        $this.MainForm.Controls.Add($this.TabControl)
    }
    
    # 创建配置页面
    [void]CreateConfigTab() {
        $this.ConfigTab = New-Object System.Windows.Forms.TabPage
        $this.ConfigTab.Text = "配置"
        $this.TabControl.TabPages.Add($this.ConfigTab)
        
        # 本地路径
        $localPathLabel = New-Object System.Windows.Forms.Label
        $localPathLabel.Text = "本地项目路径:"
        $localPathLabel.Location = New-Object System.Drawing.Point(20, 20)
        $localPathLabel.Size = New-Object System.Drawing.Size(120, 20)
        $this.ConfigTab.Controls.Add($localPathLabel)
        
        $this.LocalPathTextBox = New-Object System.Windows.Forms.TextBox
        $this.LocalPathTextBox.Location = New-Object System.Drawing.Point(150, 20)
        $this.LocalPathTextBox.Size = New-Object System.Drawing.Size(400, 20)
        $this.ConfigTab.Controls.Add($this.LocalPathTextBox)
        
        $this.BrowseButton = New-Object System.Windows.Forms.Button
        $this.BrowseButton.Text = "浏览..."
        $this.BrowseButton.Location = New-Object System.Drawing.Point(560, 20)
        $this.BrowseButton.Size = New-Object System.Drawing.Size(80, 23)
        $this.BrowseButton.Add_Click({ $this.BrowseLocalPath() })
        $this.ConfigTab.Controls.Add($this.BrowseButton)
        
        # 远程仓库地址
        $remoteUrlLabel = New-Object System.Windows.Forms.Label
        $remoteUrlLabel.Text = "远程仓库地址:"
        $remoteUrlLabel.Location = New-Object System.Drawing.Point(20, 60)
        $remoteUrlLabel.Size = New-Object System.Drawing.Size(120, 20)
        $this.ConfigTab.Controls.Add($remoteUrlLabel)
        
        $this.RemoteUrlTextBox = New-Object System.Windows.Forms.TextBox
        $this.RemoteUrlTextBox.Location = New-Object System.Drawing.Point(150, 60)
        $this.RemoteUrlTextBox.Size = New-Object System.Drawing.Size(490, 20)
        $this.ConfigTab.Controls.Add($this.RemoteUrlTextBox)
        
        # 分支名称
        $branchLabel = New-Object System.Windows.Forms.Label
        $branchLabel.Text = "分支名称:"
        $branchLabel.Location = New-Object System.Drawing.Point(20, 100)
        $branchLabel.Size = New-Object System.Drawing.Size(120, 20)
        $this.ConfigTab.Controls.Add($branchLabel)
        
        $this.BranchTextBox = New-Object System.Windows.Forms.TextBox
        $this.BranchTextBox.Location = New-Object System.Drawing.Point(150, 100)
        $this.BranchTextBox.Size = New-Object System.Drawing.Size(200, 20)
        $this.ConfigTab.Controls.Add($this.BranchTextBox)
        
        # 同步间隔
        $intervalLabel = New-Object System.Windows.Forms.Label
        $intervalLabel.Text = "同步间隔(分钟):"
        $intervalLabel.Location = New-Object System.Drawing.Point(20, 140)
        $intervalLabel.Size = New-Object System.Drawing.Size(120, 20)
        $this.ConfigTab.Controls.Add($intervalLabel)
        
        $this.IntervalNumeric = New-Object System.Windows.Forms.NumericUpDown
        $this.IntervalNumeric.Location = New-Object System.Drawing.Point(150, 140)
        $this.IntervalNumeric.Size = New-Object System.Drawing.Size(100, 20)
        $this.IntervalNumeric.Minimum = 1
        $this.IntervalNumeric.Maximum = 1440
        $this.IntervalNumeric.Value = 5
        $this.ConfigTab.Controls.Add($this.IntervalNumeric)
        
        # 按钮
        $this.TestConnectionButton = New-Object System.Windows.Forms.Button
        $this.TestConnectionButton.Text = "测试连接"
        $this.TestConnectionButton.Location = New-Object System.Drawing.Point(150, 180)
        $this.TestConnectionButton.Size = New-Object System.Drawing.Size(100, 30)
        $this.TestConnectionButton.Add_Click({ $this.TestConnection() })
        $this.ConfigTab.Controls.Add($this.TestConnectionButton)
        
        $this.SaveConfigButton = New-Object System.Windows.Forms.Button
        $this.SaveConfigButton.Text = "保存配置"
        $this.SaveConfigButton.Location = New-Object System.Drawing.Point(270, 180)
        $this.SaveConfigButton.Size = New-Object System.Drawing.Size(100, 30)
        $this.SaveConfigButton.Add_Click({ $this.SaveConfiguration() })
        $this.ConfigTab.Controls.Add($this.SaveConfigButton)
    }
    
    # 创建状态页面
    [void]CreateStatusTab() {
        $this.StatusTab = New-Object System.Windows.Forms.TabPage
        $this.StatusTab.Text = "状态"
        $this.TabControl.TabPages.Add($this.StatusTab)
        
        # 状态标签
        $this.StatusLabel = New-Object System.Windows.Forms.Label
        $this.StatusLabel.Text = "状态: 未运行"
        $this.StatusLabel.Location = New-Object System.Drawing.Point(20, 20)
        $this.StatusLabel.Size = New-Object System.Drawing.Size(300, 20)
        $this.StatusLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10, [System.Drawing.FontStyle]::Bold)
        $this.StatusTab.Controls.Add($this.StatusLabel)
        
        # 进度条
        $this.SyncProgressBar = New-Object System.Windows.Forms.ProgressBar
        $this.SyncProgressBar.Location = New-Object System.Drawing.Point(20, 60)
        $this.SyncProgressBar.Size = New-Object System.Drawing.Size(400, 20)
        $this.SyncProgressBar.Style = [System.Windows.Forms.ProgressBarStyle]::Marquee
        $this.StatusTab.Controls.Add($this.SyncProgressBar)
        
        # 按钮
        $this.StartSyncButton = New-Object System.Windows.Forms.Button
        $this.StartSyncButton.Text = "启动自动同步"
        $this.StartSyncButton.Location = New-Object System.Drawing.Point(20, 100)
        $this.StartSyncButton.Size = New-Object System.Drawing.Size(120, 30)
        $this.StartSyncButton.Add_Click({ $this.StartAutoSync() })
        $this.StatusTab.Controls.Add($this.StartSyncButton)
        
        $this.StopSyncButton = New-Object System.Windows.Forms.Button
        $this.StopSyncButton.Text = "停止自动同步"
        $this.StopSyncButton.Location = New-Object System.Drawing.Point(160, 100)
        $this.StopSyncButton.Size = New-Object System.Drawing.Size(120, 30)
        $this.StopSyncButton.Add_Click({ $this.StopAutoSync() })
        $this.StatusTab.Controls.Add($this.StopSyncButton)
        
        $this.ManualSyncButton = New-Object System.Windows.Forms.Button
        $this.ManualSyncButton.Text = "手动同步"
        $this.ManualSyncButton.Location = New-Object System.Drawing.Point(300, 100)
        $this.ManualSyncButton.Size = New-Object System.Drawing.Size(120, 30)
        $this.ManualSyncButton.Add_Click({ $this.ManualSync() })
        $this.StatusTab.Controls.Add($this.ManualSyncButton)
        
        # 状态定时器
        $this.StatusTimer = New-Object System.Windows.Forms.Timer
        $this.StatusTimer.Interval = 5000  # 5秒更新一次
        $this.StatusTimer.Add_Tick({ $this.UpdateStatus() })
        $this.StatusTimer.Start()
    }
    
    # 创建日志页面
    [void]CreateLogTab() {
        $this.LogTab = New-Object System.Windows.Forms.TabPage
        $this.LogTab.Text = "日志"
        $this.TabControl.TabPages.Add($this.LogTab)
        
        # 日志文本框
        $this.LogTextBox = New-Object System.Windows.Forms.RichTextBox
        $this.LogTextBox.Location = New-Object System.Drawing.Point(20, 20)
        $this.LogTextBox.Size = New-Object System.Drawing.Size(740, 400)
        $this.LogTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
        $this.LogTextBox.ReadOnly = $true
        $this.LogTextBox.BackColor = [System.Drawing.Color]::Black
        $this.LogTextBox.ForeColor = [System.Drawing.Color]::Lime
        $this.LogTab.Controls.Add($this.LogTextBox)
        
        # 按钮
        $this.RefreshLogButton = New-Object System.Windows.Forms.Button
        $this.RefreshLogButton.Text = "刷新日志"
        $this.RefreshLogButton.Location = New-Object System.Drawing.Point(20, 440)
        $this.RefreshLogButton.Size = New-Object System.Drawing.Size(100, 30)
        $this.RefreshLogButton.Add_Click({ $this.RefreshLog() })
        $this.LogTab.Controls.Add($this.RefreshLogButton)
        
        $this.ClearLogButton = New-Object System.Windows.Forms.Button
        $this.ClearLogButton.Text = "清空日志"
        $this.ClearLogButton.Location = New-Object System.Drawing.Point(140, 440)
        $this.ClearLogButton.Size = New-Object System.Drawing.Size(100, 30)
        $this.ClearLogButton.Add_Click({ $this.ClearLog() })
        $this.LogTab.Controls.Add($this.ClearLogButton)
        
        $this.OpenLogFileButton = New-Object System.Windows.Forms.Button
        $this.OpenLogFileButton.Text = "打开日志文件"
        $this.OpenLogFileButton.Location = New-Object System.Drawing.Point(260, 440)
        $this.OpenLogFileButton.Size = New-Object System.Drawing.Size(120, 30)
        $this.OpenLogFileButton.Add_Click({ $this.OpenLogFile() })
        $this.LogTab.Controls.Add($this.OpenLogFileButton)
    }
    
    # 创建帮助页面
    [void]CreateHelpTab() {
        $this.HelpTab = New-Object System.Windows.Forms.TabPage
        $this.HelpTab.Text = "帮助"
        $this.TabControl.TabPages.Add($this.HelpTab)
        
        $this.HelpTextBox = New-Object System.Windows.Forms.RichTextBox
        $this.HelpTextBox.Location = New-Object System.Drawing.Point(20, 20)
        $this.HelpTextBox.Size = New-Object System.Drawing.Size(740, 500)
        $this.HelpTextBox.Font = New-Object System.Drawing.Font("Microsoft YaHei", 9)
        $this.HelpTextBox.ReadOnly = $true
        $this.HelpTextBox.Text = @"
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
        $this.HelpTab.Controls.Add($this.HelpTextBox)
    }
    
    # 浏览本地路径
    [void]BrowseLocalPath() {
        $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
        $folderBrowser.Description = "选择Git仓库文件夹"
        $folderBrowser.ShowNewFolderButton = $false
        
        if ($folderBrowser.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            $this.LocalPathTextBox.Text = $folderBrowser.SelectedPath
        }
    }
    
    # 测试连接
    [void]TestConnection() {
        try {
            $localPath = $this.LocalPathTextBox.Text
            $remoteUrl = $this.RemoteUrlTextBox.Text
            
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
    }
    
    # 保存配置
    [void]SaveConfiguration() {
        try {
            $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
            $config = @{
                sync = @{
                    enabled = $true
                    interval = [int]$this.IntervalNumeric.Value
                    taskName = "GitAutoSync"
                    repoPath = $this.LocalPathTextBox.Text
                    remote = "origin"
                    branch = $this.BranchTextBox.Text
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
    }
    
    # 加载配置
    [void]LoadConfiguration() {
        try {
            $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
            if (Test-Path $configPath) {
                $config = Get-Content $configPath | ConvertFrom-Json
                $this.LocalPathTextBox.Text = $config.sync.repoPath
                $this.BranchTextBox.Text = $config.sync.branch
                $this.IntervalNumeric.Value = $config.sync.interval
                
                # 尝试获取远程URL
                if ($config.sync.repoPath -and (Test-Path $config.sync.repoPath)) {
                    Push-Location $config.sync.repoPath
                    $remoteUrl = git remote get-url origin 2>&1
                    Pop-Location
                    if ($LASTEXITCODE -eq 0) {
                        $this.RemoteUrlTextBox.Text = $remoteUrl
                    }
                }
            }
        } catch {
            Write-Host "加载配置失败: $($_.Exception.Message)"
        }
    }
    
    # 启动自动同步
    [void]StartAutoSync() {
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
    }
    
    # 停止自动同步
    [void]StopAutoSync() {
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
    }
    
    # 手动同步
    [void]ManualSync() {
        try {
            $scriptPath = Join-Path $PSScriptRoot "auto-sync.ps1"
            if (Test-Path $scriptPath) {
                $this.LogTextBox.AppendText("开始手动同步...`n")
                $result = & $scriptPath -Silent
                if ($LASTEXITCODE -eq 0) {
                    $this.LogTextBox.AppendText("手动同步完成！`n")
                } else {
                    $this.LogTextBox.AppendText("手动同步失败！`n")
                }
            } else {
                [System.Windows.Forms.MessageBox]::Show("找不到同步脚本！", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            }
        } catch {
            [System.Windows.Forms.MessageBox]::Show("手动同步时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    }
    
    # 更新状态
    [void]UpdateStatus() {
        try {
            $task = Get-ScheduledTask -TaskName "GitAutoSync" -ErrorAction SilentlyContinue
            if ($task) {
                $state = $task.State
                switch ($state) {
                    "Running" {
                        $this.StatusLabel.Text = "状态: 正在运行"
                        $this.StatusLabel.ForeColor = [System.Drawing.Color]::Green
                        $this.SyncProgressBar.Visible = $true
                    }
                    "Ready" {
                        $this.StatusLabel.Text = "状态: 已就绪"
                        $this.StatusLabel.ForeColor = [System.Drawing.Color]::Blue
                        $this.SyncProgressBar.Visible = $false
                    }
                    default {
                        $this.StatusLabel.Text = "状态: $state"
                        $this.StatusLabel.ForeColor = [System.Drawing.Color]::Orange
                        $this.SyncProgressBar.Visible = $false
                    }
                }
            } else {
                $this.StatusLabel.Text = "状态: 未运行"
                $this.StatusLabel.ForeColor = [System.Drawing.Color]::Red
                $this.SyncProgressBar.Visible = $false
            }
        } catch {
            $this.StatusLabel.Text = "状态: 检查失败"
            $this.StatusLabel.ForeColor = [System.Drawing.Color]::Red
        }
    }
    
    # 刷新日志
    [void]RefreshLog() {
        try {
            $logPath = Join-Path $PSScriptRoot "sync.log"
            if (Test-Path $logPath) {
                $logContent = Get-Content $logPath -Tail 50
                $this.LogTextBox.Text = $logContent -join "`n"
                $this.LogTextBox.SelectionStart = $this.LogTextBox.TextLength
                $this.LogTextBox.ScrollToCaret()
            } else {
                $this.LogTextBox.Text = "日志文件不存在"
            }
        } catch {
            $this.LogTextBox.Text = "刷新日志失败: $($_.Exception.Message)"
        }
    }
    
    # 清空日志
    [void]ClearLog() {
        $this.LogTextBox.Text = ""
    }
    
    # 打开日志文件
    [void]OpenLogFile() {
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
    }
    
    # 显示窗体
    [void]Show() {
        $this.RefreshLog()
        $this.MainForm.ShowDialog()
    }
}

# 主程序
try {
    $gui = [GitAutoSyncGUI]::new()
    $gui.Show()
} catch {
    [System.Windows.Forms.MessageBox]::Show("启动应用程序时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
} 