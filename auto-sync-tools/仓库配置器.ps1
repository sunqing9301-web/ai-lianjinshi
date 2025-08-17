# Git仓库配置器 - 简化版GUI应用
# 专门用于配置仓库地址和本地路径

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 创建主窗体
$mainForm = New-Object System.Windows.Forms.Form
$mainForm.Text = "Git仓库配置器 v1.0"
$mainForm.Size = New-Object System.Drawing.Size(600, 400)
$mainForm.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$mainForm.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
$mainForm.MaximizeBox = $false

# 创建标题标签
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Git仓库配置器"
$titleLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::DarkBlue
$titleLabel.Location = New-Object System.Drawing.Point(200, 20)
$titleLabel.Size = New-Object System.Drawing.Size(200, 30)
$titleLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$mainForm.Controls.Add($titleLabel)

# 远程仓库地址
$remoteUrlLabel = New-Object System.Windows.Forms.Label
$remoteUrlLabel.Text = "远程仓库地址:"
$remoteUrlLabel.Location = New-Object System.Drawing.Point(30, 80)
$remoteUrlLabel.Size = New-Object System.Drawing.Size(120, 20)
$remoteUrlLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10)
$mainForm.Controls.Add($remoteUrlLabel)

$remoteUrlTextBox = New-Object System.Windows.Forms.TextBox
$remoteUrlTextBox.Location = New-Object System.Drawing.Point(160, 80)
$remoteUrlTextBox.Size = New-Object System.Drawing.Size(400, 25)
$remoteUrlTextBox.Font = New-Object System.Drawing.Font("Consolas", 10)
$remoteUrlTextBox.PlaceholderText = "例如: https://github.com/用户名/仓库名.git"
$mainForm.Controls.Add($remoteUrlTextBox)

# 本地路径
$localPathLabel = New-Object System.Windows.Forms.Label
$localPathLabel.Text = "本地项目路径:"
$localPathLabel.Location = New-Object System.Drawing.Point(30, 130)
$localPathLabel.Size = New-Object System.Drawing.Size(120, 20)
$localPathLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10)
$mainForm.Controls.Add($localPathLabel)

$localPathTextBox = New-Object System.Windows.Forms.TextBox
$localPathTextBox.Location = New-Object System.Drawing.Point(160, 130)
$localPathTextBox.Size = New-Object System.Drawing.Size(320, 25)
$localPathTextBox.Font = New-Object System.Drawing.Font("Consolas", 10)
$localPathTextBox.ReadOnly = $true
$mainForm.Controls.Add($localPathTextBox)

$browseButton = New-Object System.Windows.Forms.Button
$browseButton.Text = "选择文件夹"
$browseButton.Location = New-Object System.Drawing.Point(490, 130)
$browseButton.Size = New-Object System.Drawing.Size(70, 25)
$browseButton.Add_Click({
    $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
    $folderBrowser.Description = "选择本地项目文件夹"
    $folderBrowser.ShowNewFolderButton = $true
    
    if ($folderBrowser.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $localPathTextBox.Text = $folderBrowser.SelectedPath
    }
})
$mainForm.Controls.Add($browseButton)

# 分支名称
$branchLabel = New-Object System.Windows.Forms.Label
$branchLabel.Text = "分支名称:"
$branchLabel.Location = New-Object System.Drawing.Point(30, 180)
$branchLabel.Size = New-Object System.Drawing.Size(120, 20)
$branchLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10)
$mainForm.Controls.Add($branchLabel)

$branchTextBox = New-Object System.Windows.Forms.TextBox
$branchTextBox.Location = New-Object System.Drawing.Point(160, 180)
$branchTextBox.Size = New-Object System.Drawing.Size(150, 25)
$branchTextBox.Font = New-Object System.Drawing.Font("Consolas", 10)
$branchTextBox.Text = "main"
$mainForm.Controls.Add($branchTextBox)

# 同步间隔
$intervalLabel = New-Object System.Windows.Forms.Label
$intervalLabel.Text = "同步间隔(分钟):"
$intervalLabel.Location = New-Object System.Drawing.Point(30, 230)
$intervalLabel.Size = New-Object System.Drawing.Size(120, 20)
$intervalLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10)
$mainForm.Controls.Add($intervalLabel)

$intervalNumeric = New-Object System.Windows.Forms.NumericUpDown
$intervalNumeric.Location = New-Object System.Drawing.Point(160, 230)
$intervalNumeric.Size = New-Object System.Drawing.Size(100, 25)
$intervalNumeric.Minimum = 1
$intervalNumeric.Maximum = 1440
$intervalNumeric.Value = 5
$mainForm.Controls.Add($intervalNumeric)

# 状态显示
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "状态: 等待配置"
$statusLabel.Location = New-Object System.Drawing.Point(30, 280)
$statusLabel.Size = New-Object System.Drawing.Size(400, 20)
$statusLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei", 9)
$statusLabel.ForeColor = [System.Drawing.Color]::Gray
$mainForm.Controls.Add($statusLabel)

# 按钮区域
$buttonPanel = New-Object System.Windows.Forms.Panel
$buttonPanel.Location = New-Object System.Drawing.Point(30, 320)
$buttonPanel.Size = New-Object System.Drawing.Size(540, 40)
$mainForm.Controls.Add($buttonPanel)

# 测试连接按钮
$testButton = New-Object System.Windows.Forms.Button
$testButton.Text = "测试连接"
$testButton.Location = New-Object System.Drawing.Point(0, 5)
$testButton.Size = New-Object System.Drawing.Size(100, 30)
$testButton.Add_Click({
    $statusLabel.Text = "状态: 正在测试连接..."
    $statusLabel.ForeColor = [System.Drawing.Color]::Blue
    
    try {
        $remoteUrl = $remoteUrlTextBox.Text.Trim()
        $localPath = $localPathTextBox.Text.Trim()
        
        if ([string]::IsNullOrEmpty($remoteUrl)) {
            [System.Windows.Forms.MessageBox]::Show("请输入远程仓库地址！", "提示", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
            $statusLabel.Text = "状态: 等待配置"
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        if ([string]::IsNullOrEmpty($localPath)) {
            [System.Windows.Forms.MessageBox]::Show("请选择本地项目路径！", "提示", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
            $statusLabel.Text = "状态: 等待配置"
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        # 检查本地路径
        if (-not (Test-Path $localPath)) {
            $result = [System.Windows.Forms.MessageBox]::Show("本地路径不存在，是否创建？", "确认", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
            if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                New-Item -ItemType Directory -Path $localPath -Force | Out-Null
            } else {
                $statusLabel.Text = "状态: 等待配置"
                $statusLabel.ForeColor = [System.Drawing.Color]::Gray
                return
            }
        }
        
        # 检查是否为Git仓库
        $isGitRepo = Test-Path (Join-Path $localPath ".git")
        
        if ($isGitRepo) {
            # 现有Git仓库，检查远程地址
            Push-Location $localPath
            $currentRemote = git remote get-url origin 2>&1
            Pop-Location
            
            if ($LASTEXITCODE -eq 0) {
                $result = [System.Windows.Forms.MessageBox]::Show("检测到现有Git仓库，远程地址为：`n$currentRemote`n`n是否要更改为新的远程地址？", "确认", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
                if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                    Push-Location $localPath
                    git remote set-url origin $remoteUrl
                    Pop-Location
                    [System.Windows.Forms.MessageBox]::Show("远程地址已更新！", "成功", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
                }
            } else {
                # 添加远程地址
                Push-Location $localPath
                git remote add origin $remoteUrl
                Pop-Location
                [System.Windows.Forms.MessageBox]::Show("远程地址已添加！", "成功", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
            }
        } else {
            # 新仓库，初始化Git
            $result = [System.Windows.Forms.MessageBox]::Show("本地路径不是Git仓库，是否初始化Git仓库？", "确认", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
            if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                Push-Location $localPath
                git init
                git remote add origin $remoteUrl
                Pop-Location
                [System.Windows.Forms.MessageBox]::Show("Git仓库已初始化！", "成功", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
            }
        }
        
        $statusLabel.Text = "状态: 连接测试完成"
        $statusLabel.ForeColor = [System.Drawing.Color]::Green
        
    } catch {
        [System.Windows.Forms.MessageBox]::Show("测试连接时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        $statusLabel.Text = "状态: 连接测试失败"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
    }
})
$buttonPanel.Controls.Add($testButton)

# 保存配置按钮
$saveButton = New-Object System.Windows.Forms.Button
$saveButton.Text = "保存配置"
$saveButton.Location = New-Object System.Drawing.Point(120, 5)
$saveButton.Size = New-Object System.Drawing.Size(100, 30)
$saveButton.Add_Click({
    $statusLabel.Text = "状态: 正在保存配置..."
    $statusLabel.ForeColor = [System.Drawing.Color]::Blue
    
    try {
        $remoteUrl = $remoteUrlTextBox.Text.Trim()
        $localPath = $localPathTextBox.Text.Trim()
        $branch = $branchTextBox.Text.Trim()
        $interval = [int]$intervalNumeric.Value
        
        if ([string]::IsNullOrEmpty($remoteUrl) -or [string]::IsNullOrEmpty($localPath)) {
            [System.Windows.Forms.MessageBox]::Show("请填写完整的仓库地址和本地路径！", "提示", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
            $statusLabel.Text = "状态: 等待配置"
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        # 保存配置文件
        $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
        $config = @{
            sync = @{
                enabled = $true
                interval = $interval
                taskName = "GitAutoSync"
                repoPath = $localPath
                remote = "origin"
                branch = $branch
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
        
        $statusLabel.Text = "状态: 配置已保存"
        $statusLabel.ForeColor = [System.Drawing.Color]::Green
        
        [System.Windows.Forms.MessageBox]::Show("配置保存成功！`n`n远程仓库: $remoteUrl`n本地路径: $localPath`n分支: $branch`n同步间隔: $interval 分钟", "成功", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        
    } catch {
        [System.Windows.Forms.MessageBox]::Show("保存配置时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        $statusLabel.Text = "状态: 保存配置失败"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
    }
})
$buttonPanel.Controls.Add($saveButton)

# 启动自动同步按钮
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "启动自动同步"
$startButton.Location = New-Object System.Drawing.Point(240, 5)
$startButton.Size = New-Object System.Drawing.Size(120, 30)
$startButton.BackColor = [System.Drawing.Color]::LightGreen
$startButton.Add_Click({
    $statusLabel.Text = "状态: 正在启动自动同步..."
    $statusLabel.ForeColor = [System.Drawing.Color]::Blue
    
    try {
        # 先保存配置
        $remoteUrl = $remoteUrlTextBox.Text.Trim()
        $localPath = $localPathTextBox.Text.Trim()
        $branch = $branchTextBox.Text.Trim()
        $interval = [int]$intervalNumeric.Value
        
        if ([string]::IsNullOrEmpty($remoteUrl) -or [string]::IsNullOrEmpty($localPath)) {
            [System.Windows.Forms.MessageBox]::Show("请先填写完整的仓库地址和本地路径！", "提示", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
            $statusLabel.Text = "状态: 等待配置"
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        # 保存配置
        $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
        $config = @{
            sync = @{
                enabled = $true
                interval = $interval
                taskName = "GitAutoSync"
                repoPath = $localPath
                remote = "origin"
                branch = $branch
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
        
        # 启动自动同步
        $scriptPath = Join-Path $PSScriptRoot "setup-auto-sync.ps1"
        if (Test-Path $scriptPath) {
            Start-Process PowerShell -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath`" -Force" -Verb RunAs
            $statusLabel.Text = "状态: 自动同步已启动"
            $statusLabel.ForeColor = [System.Drawing.Color]::Green
            [System.Windows.Forms.MessageBox]::Show("正在创建任务计划，请稍候...`n`n配置信息：`n远程仓库: $remoteUrl`n本地路径: $localPath`n分支: $branch`n同步间隔: $interval 分钟", "成功", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        } else {
            [System.Windows.Forms.MessageBox]::Show("找不到设置脚本！", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            $statusLabel.Text = "状态: 启动失败"
            $statusLabel.ForeColor = [System.Drawing.Color]::Red
        }
        
    } catch {
        [System.Windows.Forms.MessageBox]::Show("启动自动同步时发生错误：$($_.Exception.Message)", "错误", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        $statusLabel.Text = "状态: 启动失败"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
    }
})
$buttonPanel.Controls.Add($startButton)

# 清除配置按钮
$clearButton = New-Object System.Windows.Forms.Button
$clearButton.Text = "清除配置"
$clearButton.Location = New-Object System.Drawing.Point(380, 5)
$clearButton.Size = New-Object System.Drawing.Size(80, 30)
$clearButton.BackColor = [System.Drawing.Color]::LightCoral
$clearButton.Add_Click({
    $result = [System.Windows.Forms.MessageBox]::Show("确定要清除所有配置吗？", "确认", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $remoteUrlTextBox.Text = ""
        $localPathTextBox.Text = ""
        $branchTextBox.Text = "main"
        $intervalNumeric.Value = 5
        $statusLabel.Text = "状态: 配置已清除"
        $statusLabel.ForeColor = [System.Drawing.Color]::Gray
    }
})
$buttonPanel.Controls.Add($clearButton)

# 加载现有配置
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
        
        $statusLabel.Text = "状态: 已加载现有配置"
        $statusLabel.ForeColor = [System.Drawing.Color]::Green
    }
} catch {
    Write-Host "加载配置失败: $($_.Exception.Message)"
}

# 显示窗体
$mainForm.ShowDialog() 