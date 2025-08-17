# AI炼金师-产品优化专家 GitHub推送工具
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AI炼金师-产品优化专家 GitHub推送工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 显示当前Git状态
Write-Host "当前Git状态：" -ForegroundColor Yellow
git status
Write-Host ""

# 显示远程仓库
Write-Host "当前远程仓库：" -ForegroundColor Yellow
git remote -v
Write-Host ""

# 显示提交历史
Write-Host "提交历史：" -ForegroundColor Yellow
git log --oneline -5
Write-Host ""

# 菜单选择
Write-Host "请选择推送方式：" -ForegroundColor Green
Write-Host "1. 使用Personal Access Token (推荐)" -ForegroundColor White
Write-Host "2. 使用SSH密钥" -ForegroundColor White
Write-Host "3. 使用GitHub Desktop" -ForegroundColor White
Write-Host "4. 退出" -ForegroundColor White
Write-Host ""

$choice = Read-Host "请输入选择 (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "使用Personal Access Token推送" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "请按照以下步骤操作：" -ForegroundColor Yellow
        Write-Host "1. 访问 https://github.com/settings/tokens" -ForegroundColor White
        Write-Host "2. 点击 'Generate new token (classic)'" -ForegroundColor White
        Write-Host "3. 选择权限：repo (完整的仓库访问权限)" -ForegroundColor White
        Write-Host "4. 复制生成的token" -ForegroundColor White
        Write-Host ""
        
        $token = Read-Host "请输入您的Personal Access Token"
        if ($token) {
            Write-Host ""
            Write-Host "正在推送代码..." -ForegroundColor Yellow
            $pushUrl = "https://$token@github.com/sunqing9301-web/ai-lianjinshi.git"
            git push $pushUrl main
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ 推送成功！" -ForegroundColor Green
                Write-Host "请访问: https://github.com/sunqing9301-web/ai-lianjinshi.git" -ForegroundColor Cyan
            } else {
                Write-Host ""
                Write-Host "❌ 推送失败，请检查token是否正确" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Token不能为空" -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "使用SSH密钥推送" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "正在检查SSH密钥..." -ForegroundColor Yellow
        
        $sshTest = ssh -T git@github.com 2>&1
        if ($LASTEXITCODE -eq 1) {
            Write-Host ""
            Write-Host "❌ SSH密钥未配置或无效" -ForegroundColor Red
            Write-Host "请按照以下步骤配置SSH密钥：" -ForegroundColor Yellow
            Write-Host "1. 生成SSH密钥: ssh-keygen -t ed25519 -C 'your_email@example.com'" -ForegroundColor White
            Write-Host "2. 启动SSH代理: eval `$(ssh-agent -s)" -ForegroundColor White
            Write-Host "3. 添加密钥: ssh-add ~/.ssh/id_ed25519" -ForegroundColor White
            Write-Host "4. 复制公钥: cat ~/.ssh/id_ed25519.pub" -ForegroundColor White
            Write-Host "5. 在GitHub Settings > SSH and GPG keys中添加公钥" -ForegroundColor White
            Write-Host ""
            Read-Host "按回车键继续"
        } else {
            Write-Host ""
            Write-Host "正在切换到SSH并推送..." -ForegroundColor Yellow
            git remote set-url origin git@github.com:sunqing9301-web/ai-lianjinshi.git
            git push -u origin main
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ 推送成功！" -ForegroundColor Green
                Write-Host "请访问: https://github.com/sunqing9301-web/ai-lianjinshi.git" -ForegroundColor Cyan
            } else {
                Write-Host ""
                Write-Host "❌ 推送失败，请检查SSH配置" -ForegroundColor Red
            }
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "使用GitHub Desktop推送" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "请按照以下步骤操作：" -ForegroundColor Yellow
        Write-Host "1. 下载GitHub Desktop: https://desktop.github.com/" -ForegroundColor White
        Write-Host "2. 安装并登录GitHub账户" -ForegroundColor White
        Write-Host "3. 选择 'Add an Existing Repository from your hard drive'" -ForegroundColor White
        Write-Host "4. 选择当前项目文件夹: E:\AI炼金师-产品优化专家 (2)" -ForegroundColor White
        Write-Host "5. 点击 'Publish repository' 或 'Push origin'" -ForegroundColor White
        Write-Host ""
        Write-Host "当前项目路径: $(Get-Location)" -ForegroundColor Cyan
        Write-Host ""
        Read-Host "按回车键继续"
    }
    
    "4" {
        Write-Host "退出程序" -ForegroundColor Yellow
    }
    
    default {
        Write-Host "❌ 无效选择，请输入1-4" -ForegroundColor Red
        Read-Host "按回车键继续"
    }
}

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
Read-Host 