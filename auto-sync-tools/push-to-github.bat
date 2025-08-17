@echo off
echo ========================================
echo    AI炼金师-产品优化专家 GitHub推送工具
echo ========================================
echo.

echo 当前Git状态：
git status
echo.

echo 当前远程仓库：
git remote -v
echo.

echo 请选择推送方式：
echo 1. 使用Personal Access Token (推荐)
echo 2. 使用SSH密钥
echo 3. 使用GitHub Desktop
echo 4. 退出
echo.

set /p choice=请输入选择 (1-4): 

if "%choice%"=="1" goto token
if "%choice%"=="2" goto ssh
if "%choice%"=="3" goto desktop
if "%choice%"=="4" goto exit
goto invalid

:token
echo.
echo ========================================
echo 使用Personal Access Token推送
echo ========================================
echo.
echo 请按照以下步骤操作：
echo 1. 访问 https://github.com/settings/tokens
echo 2. 点击 "Generate new token (classic)"
echo 3. 选择权限：repo (完整的仓库访问权限)
echo 4. 复制生成的token
echo.
set /p token=请输入您的Personal Access Token: 
if "%token%"=="" goto token_error
echo.
echo 正在推送代码...
git push https://%token%@github.com/sunqing9301-web/ai-lianjinshi.git main
if %errorlevel%==0 (
    echo.
    echo ✅ 推送成功！
    echo 请访问: https://github.com/sunqing9301-web/ai-lianjinshi.git
) else (
    echo.
    echo ❌ 推送失败，请检查token是否正确
)
goto end

:ssh
echo.
echo ========================================
echo 使用SSH密钥推送
echo ========================================
echo.
echo 正在检查SSH密钥...
ssh -T git@github.com
if %errorlevel%==1 (
    echo.
    echo ❌ SSH密钥未配置或无效
    echo 请按照以下步骤配置SSH密钥：
    echo 1. 生成SSH密钥: ssh-keygen -t ed25519 -C "your_email@example.com"
    echo 2. 启动SSH代理: eval "$(ssh-agent -s)"
    echo 3. 添加密钥: ssh-add ~/.ssh/id_ed25519
    echo 4. 复制公钥: cat ~/.ssh/id_ed25519.pub
    echo 5. 在GitHub Settings > SSH and GPG keys中添加公钥
    echo.
    pause
    goto end
)
echo.
echo 正在切换到SSH并推送...
git remote set-url origin git@github.com:sunqing9301-web/ai-lianjinshi.git
git push -u origin main
if %errorlevel%==0 (
    echo.
    echo ✅ 推送成功！
    echo 请访问: https://github.com/sunqing9301-web/ai-lianjinshi.git
) else (
    echo.
    echo ❌ 推送失败，请检查SSH配置
)
goto end

:desktop
echo.
echo ========================================
echo 使用GitHub Desktop推送
echo ========================================
echo.
echo 请按照以下步骤操作：
echo 1. 下载GitHub Desktop: https://desktop.github.com/
echo 2. 安装并登录GitHub账户
echo 3. 选择 "Add an Existing Repository from your hard drive"
echo 4. 选择当前项目文件夹: E:\AI炼金师-产品优化专家 (2)
echo 5. 点击 "Publish repository" 或 "Push origin"
echo.
echo 当前项目路径: %cd%
echo.
pause
goto end

:token_error
echo.
echo ❌ Token不能为空，请重新输入
goto token

:invalid
echo.
echo ❌ 无效选择，请输入1-4
pause
goto end

:exit
echo.
echo 退出程序
goto end

:end
echo.
echo 按任意键退出...
pause >nul 