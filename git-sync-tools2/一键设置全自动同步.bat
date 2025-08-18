@echo off
chcp 65001 >nul
echo ========================================
echo    Git仓库全自动同步 - 一键设置工具
echo ========================================
echo.

echo 正在检查系统环境...
echo.

:: 检查PowerShell
powershell -Command "Write-Host 'PowerShell版本:' $PSVersionTable.PSVersion" 2>nul
if %errorlevel% neq 0 (
    echo ❌ PowerShell不可用，请确保系统已安装PowerShell
    pause
    exit 1
)

:: 检查Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git不可用，请先安装Git
    echo 下载地址: https://git-scm.com/downloads
    pause
    exit 1
)

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 需要管理员权限来创建任务计划
    echo 请右键点击此文件，选择"以管理员身份运行"
    pause
    exit 1
)

echo ✅ 系统环境检查通过
echo.

:: 显示配置信息
echo 配置信息:
echo   仓库路径: %~dp0
echo   同步间隔: 5分钟
echo   任务名称: GitAutoSync
echo   自动提交: 是
echo   自动推送: 是
echo   静默模式: 是
echo.

set /p confirm=是否继续设置全自动同步？(Y/N): 
if /i "%confirm%" neq "Y" (
    echo 设置已取消
    pause
    exit 0
)

echo.
echo 正在设置全自动同步...

:: 运行PowerShell设置脚本
powershell -ExecutionPolicy Bypass -File "setup-auto-sync.ps1" -Force

if %errorlevel% equ 0 (
    echo.
    echo 🎉 全自动同步设置完成！
    echo.
    echo 任务已创建并启动，将每5分钟自动同步一次
    echo 无需人工干预，完全自动化运行
    echo.
    echo 日志文件: %~dp0sync.log
    echo 任务名称: GitAutoSync
    echo.
    echo 管理命令:
    echo   查看任务状态: schtasks /query /tn GitAutoSync
    echo   手动启动同步: schtasks /run /tn GitAutoSync
    echo   停止自动同步: schtasks /end /tn GitAutoSync
    echo   删除任务: schtasks /delete /tn GitAutoSync /f
    echo.
    echo 现在您可以正常使用项目，所有更改将自动同步到GitHub！
) else (
    echo.
    echo ❌ 设置失败，请检查错误信息
    echo 可以尝试手动运行: powershell -ExecutionPolicy Bypass -File "setup-auto-sync.ps1"
)

echo.
pause 