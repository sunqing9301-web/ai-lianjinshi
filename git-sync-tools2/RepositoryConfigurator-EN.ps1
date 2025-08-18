# Git Repository Configurator - English Version
# Simplified GUI for configuring repository address and local path

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Create main form
$mainForm = New-Object System.Windows.Forms.Form
$mainForm.Text = "Git Repository Configurator v1.0"
$mainForm.Size = New-Object System.Drawing.Size(600, 400)
$mainForm.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$mainForm.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
$mainForm.MaximizeBox = $false

# Create title label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Git Repository Configurator"
$titleLabel.Font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::DarkBlue
$titleLabel.Location = New-Object System.Drawing.Point(150, 20)
$titleLabel.Size = New-Object System.Drawing.Size(300, 30)
$titleLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$mainForm.Controls.Add($titleLabel)

# Remote repository address
$remoteUrlLabel = New-Object System.Windows.Forms.Label
$remoteUrlLabel.Text = "Remote Repository URL:"
$remoteUrlLabel.Location = New-Object System.Drawing.Point(30, 80)
$remoteUrlLabel.Size = New-Object System.Drawing.Size(150, 20)
$remoteUrlLabel.Font = New-Object System.Drawing.Font("Arial", 10)
$mainForm.Controls.Add($remoteUrlLabel)

$remoteUrlTextBox = New-Object System.Windows.Forms.TextBox
$remoteUrlTextBox.Location = New-Object System.Drawing.Point(190, 80)
$remoteUrlTextBox.Size = New-Object System.Drawing.Size(370, 25)
$remoteUrlTextBox.Font = New-Object System.Drawing.Font("Consolas", 10)
$remoteUrlTextBox.PlaceholderText = "e.g. https://github.com/username/repository.git"
$mainForm.Controls.Add($remoteUrlTextBox)

# Local path
$localPathLabel = New-Object System.Windows.Forms.Label
$localPathLabel.Text = "Local Project Path:"
$localPathLabel.Location = New-Object System.Drawing.Point(30, 130)
$localPathLabel.Size = New-Object System.Drawing.Size(150, 20)
$localPathLabel.Font = New-Object System.Drawing.Font("Arial", 10)
$mainForm.Controls.Add($localPathLabel)

$localPathTextBox = New-Object System.Windows.Forms.TextBox
$localPathTextBox.Location = New-Object System.Drawing.Point(190, 130)
$localPathTextBox.Size = New-Object System.Drawing.Size(290, 25)
$localPathTextBox.Font = New-Object System.Drawing.Font("Consolas", 10)
$localPathTextBox.ReadOnly = $true
$mainForm.Controls.Add($localPathTextBox)

$browseButton = New-Object System.Windows.Forms.Button
$browseButton.Text = "Browse"
$browseButton.Location = New-Object System.Drawing.Point(490, 130)
$browseButton.Size = New-Object System.Drawing.Size(70, 25)
$browseButton.Add_Click({
    $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
    $folderBrowser.Description = "Select Local Project Folder"
    $folderBrowser.ShowNewFolderButton = $true
    
    if ($folderBrowser.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $localPathTextBox.Text = $folderBrowser.SelectedPath
    }
})
$mainForm.Controls.Add($browseButton)

# Branch name
$branchLabel = New-Object System.Windows.Forms.Label
$branchLabel.Text = "Branch Name:"
$branchLabel.Location = New-Object System.Drawing.Point(30, 180)
$branchLabel.Size = New-Object System.Drawing.Size(150, 20)
$branchLabel.Font = New-Object System.Drawing.Font("Arial", 10)
$mainForm.Controls.Add($branchLabel)

$branchTextBox = New-Object System.Windows.Forms.TextBox
$branchTextBox.Location = New-Object System.Drawing.Point(190, 180)
$branchTextBox.Size = New-Object System.Drawing.Size(150, 25)
$branchTextBox.Font = New-Object System.Drawing.Font("Consolas", 10)
$branchTextBox.Text = "main"
$mainForm.Controls.Add($branchTextBox)

# Sync interval
$intervalLabel = New-Object System.Windows.Forms.Label
$intervalLabel.Text = "Sync Interval (minutes):"
$intervalLabel.Location = New-Object System.Drawing.Point(30, 230)
$intervalLabel.Size = New-Object System.Drawing.Size(150, 20)
$intervalLabel.Font = New-Object System.Drawing.Font("Arial", 10)
$mainForm.Controls.Add($intervalLabel)

$intervalNumeric = New-Object System.Windows.Forms.NumericUpDown
$intervalNumeric.Location = New-Object System.Drawing.Point(190, 230)
$intervalNumeric.Size = New-Object System.Drawing.Size(100, 25)
$intervalNumeric.Minimum = 1
$intervalNumeric.Maximum = 1440
$intervalNumeric.Value = 5
$mainForm.Controls.Add($intervalNumeric)

# Status display
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Status: Waiting for configuration"
$statusLabel.Location = New-Object System.Drawing.Point(30, 280)
$statusLabel.Size = New-Object System.Drawing.Size(400, 20)
$statusLabel.Font = New-Object System.Drawing.Font("Arial", 9)
$statusLabel.ForeColor = [System.Drawing.Color]::Gray
$mainForm.Controls.Add($statusLabel)

# Button area
$buttonPanel = New-Object System.Windows.Forms.Panel
$buttonPanel.Location = New-Object System.Drawing.Point(30, 320)
$buttonPanel.Size = New-Object System.Drawing.Size(540, 40)
$mainForm.Controls.Add($buttonPanel)

# Test connection button
$testButton = New-Object System.Windows.Forms.Button
$testButton.Text = "Test Connection"
$testButton.Location = New-Object System.Drawing.Point(0, 5)
$testButton.Size = New-Object System.Drawing.Size(100, 30)
$testButton.Add_Click({
    $statusLabel.Text = "Status: Testing connection..."
    $statusLabel.ForeColor = [System.Drawing.Color]::Blue
    
    try {
        $remoteUrl = $remoteUrlTextBox.Text.Trim()
        $localPath = $localPathTextBox.Text.Trim()
        
        if ([string]::IsNullOrEmpty($remoteUrl)) {
            $msg = "Please enter remote repository URL!"
            [System.Windows.Forms.MessageBox]::Show($msg, "Warning", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
            $statusLabel.Text = "Status: Waiting for configuration"
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        if ([string]::IsNullOrEmpty($localPath)) {
            $msg = "Please select local project path!"
            [System.Windows.Forms.MessageBox]::Show($msg, "Warning", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
            $statusLabel.Text = "Status: Waiting for configuration"
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        # Check local path
        if (-not (Test-Path $localPath)) {
            $msg = "Local path does not exist, create it?"
            $result = [System.Windows.Forms.MessageBox]::Show($msg, "Confirm", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
            if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                New-Item -ItemType Directory -Path $localPath -Force | Out-Null
            } else {
                $statusLabel.Text = "Status: Waiting for configuration"
                $statusLabel.ForeColor = [System.Drawing.Color]::Gray
                return
            }
        }
        
        # Check if it's a Git repository
        $isGitRepo = Test-Path (Join-Path $localPath ".git")
        
        if ($isGitRepo) {
            # Existing Git repository, check remote address
            Push-Location $localPath
            $currentRemote = git remote get-url origin 2>&1
            Pop-Location
            
            if ($LASTEXITCODE -eq 0) {
                $msg = "Existing Git repository detected, remote URL: `n$currentRemote`n`nChange to new remote URL?"
                $result = [System.Windows.Forms.MessageBox]::Show($msg, "Confirm", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
                if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                    Push-Location $localPath
                    git remote set-url origin $remoteUrl
                    Pop-Location
                    $msg = "Remote URL updated!"
                    [System.Windows.Forms.MessageBox]::Show($msg, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
                }
            } else {
                # Add remote address
                Push-Location $localPath
                git remote add origin $remoteUrl
                Pop-Location
                $msg = "Remote URL added!"
                [System.Windows.Forms.MessageBox]::Show($msg, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
            }
        } else {
            # New repository, initialize Git
            $msg = "Local path is not a Git repository, initialize Git repository?"
            $result = [System.Windows.Forms.MessageBox]::Show($msg, "Confirm", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
            if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                Push-Location $localPath
                git init
                git remote add origin $remoteUrl
                Pop-Location
                $msg = "Git repository initialized!"
                [System.Windows.Forms.MessageBox]::Show($msg, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
            }
        }
        
        $statusLabel.Text = "Status: Connection test completed"
        $statusLabel.ForeColor = [System.Drawing.Color]::Green
        
    } catch {
        $errorMsg = "Error during connection test: " + $_.Exception.Message
        [System.Windows.Forms.MessageBox]::Show($errorMsg, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        $statusLabel.Text = "Status: Connection test failed"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
    }
})
$buttonPanel.Controls.Add($testButton)

# Save configuration button
$saveButton = New-Object System.Windows.Forms.Button
$saveButton.Text = "Save Config"
$saveButton.Location = New-Object System.Drawing.Point(120, 5)
$saveButton.Size = New-Object System.Drawing.Size(100, 30)
$saveButton.Add_Click({
    $statusLabel.Text = "Status: Saving configuration..."
    $statusLabel.ForeColor = [System.Drawing.Color]::Blue
    
    try {
        $remoteUrl = $remoteUrlTextBox.Text.Trim()
        $localPath = $localPathTextBox.Text.Trim()
        $branch = $branchTextBox.Text.Trim()
        $interval = [int]$intervalNumeric.Value
        
        if ([string]::IsNullOrEmpty($remoteUrl) -or [string]::IsNullOrEmpty($localPath)) {
            $msg = "Please fill in complete repository URL and local path!"
            [System.Windows.Forms.MessageBox]::Show($msg, "Warning", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
            $statusLabel.Text = "Status: Waiting for configuration"
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        # Save configuration file
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
        
        $statusLabel.Text = "Status: Configuration saved"
        $statusLabel.ForeColor = [System.Drawing.Color]::Green
        
        $msg = "Configuration saved successfully!`n`nRemote Repository: $remoteUrl`nLocal Path: $localPath`nBranch: $branch`nSync Interval: $interval minutes"
        [System.Windows.Forms.MessageBox]::Show($msg, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        
    } catch {
        $errorMsg = "Error saving configuration: " + $_.Exception.Message
        [System.Windows.Forms.MessageBox]::Show($errorMsg, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        $statusLabel.Text = "Status: Failed to save configuration"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
    }
})
$buttonPanel.Controls.Add($saveButton)

# Start auto sync button
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "Start Auto Sync"
$startButton.Location = New-Object System.Drawing.Point(240, 5)
$startButton.Size = New-Object System.Drawing.Size(120, 30)
$startButton.BackColor = [System.Drawing.Color]::LightGreen
$startButton.Add_Click({
    $statusLabel.Text = "Status: Starting auto sync..."
    $statusLabel.ForeColor = [System.Drawing.Color]::Blue
    
    try {
        # Save configuration first
        $remoteUrl = $remoteUrlTextBox.Text.Trim()
        $localPath = $localPathTextBox.Text.Trim()
        $branch = $branchTextBox.Text.Trim()
        $interval = [int]$intervalNumeric.Value
        
        if ([string]::IsNullOrEmpty($remoteUrl) -or [string]::IsNullOrEmpty($localPath)) {
            $msg = "Please fill in complete repository URL and local path first!"
            [System.Windows.Forms.MessageBox]::Show($msg, "Warning", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
            $statusLabel.Text = "Status: Waiting for configuration"
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        # Save configuration
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
        
        # Start auto sync
        $scriptPath = Join-Path $PSScriptRoot "setup-auto-sync.ps1"
        if (Test-Path $scriptPath) {
            Start-Process PowerShell -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath`" -Force" -Verb RunAs
            $statusLabel.Text = "Status: Auto sync started"
            $statusLabel.ForeColor = [System.Drawing.Color]::Green
            
            $msg = "Creating scheduled task, please wait...`n`nConfiguration:`nRemote Repository: $remoteUrl`nLocal Path: $localPath`nBranch: $branch`nSync Interval: $interval minutes"
            [System.Windows.Forms.MessageBox]::Show($msg, "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        } else {
            $msg = "Setup script not found!"
            [System.Windows.Forms.MessageBox]::Show($msg, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            $statusLabel.Text = "Status: Failed to start"
            $statusLabel.ForeColor = [System.Drawing.Color]::Red
        }
        
    } catch {
        $errorMsg = "Error starting auto sync: " + $_.Exception.Message
        [System.Windows.Forms.MessageBox]::Show($errorMsg, "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        $statusLabel.Text = "Status: Failed to start"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
    }
})
$buttonPanel.Controls.Add($startButton)

# Clear configuration button
$clearButton = New-Object System.Windows.Forms.Button
$clearButton.Text = "Clear Config"
$clearButton.Location = New-Object System.Drawing.Point(380, 5)
$clearButton.Size = New-Object System.Drawing.Size(80, 30)
$clearButton.BackColor = [System.Drawing.Color]::LightCoral
$clearButton.Add_Click({
    $msg = "Clear all configuration?"
    $result = [System.Windows.Forms.MessageBox]::Show($msg, "Confirm", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $remoteUrlTextBox.Text = ""
        $localPathTextBox.Text = ""
        $branchTextBox.Text = "main"
        $intervalNumeric.Value = 5
        $statusLabel.Text = "Status: Configuration cleared"
        $statusLabel.ForeColor = [System.Drawing.Color]::Gray
    }
})
$buttonPanel.Controls.Add($clearButton)

# Load existing configuration
try {
    $configPath = Join-Path $PSScriptRoot "auto-sync-config.json"
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        $localPathTextBox.Text = $config.sync.repoPath
        $branchTextBox.Text = $config.sync.branch
        $intervalNumeric.Value = $config.sync.interval
        
        # Try to get remote URL
        if ($config.sync.repoPath -and (Test-Path $config.sync.repoPath)) {
            Push-Location $config.sync.repoPath
            $remoteUrl = git remote get-url origin 2>&1
            Pop-Location
            if ($LASTEXITCODE -eq 0) {
                $remoteUrlTextBox.Text = $remoteUrl
            }
        }
        
        $statusLabel.Text = "Status: Existing configuration loaded"
        $statusLabel.ForeColor = [System.Drawing.Color]::Green
    }
} catch {
    Write-Host "Failed to load configuration: $($_.Exception.Message)"
}

# Show form
$mainForm.ShowDialog() 