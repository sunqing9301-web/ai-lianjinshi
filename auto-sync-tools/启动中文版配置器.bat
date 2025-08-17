@echo off
chcp 65001 >nul
echo ========================================
echo    Git仓库配置器 - 中文版
echo ========================================
echo.

echo 正在启动Git仓库配置器（中文版）...
echo.

:: 检查PowerShell
powershell -Command "Write-Host 'PowerShell版本:' $PSVersionTable.PSVersion" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell不可用，请确保系统已安装PowerShell
    pause
    exit 1
)

:: 启动中文版配置器
echo 启动中，请稍候...
powershell -ExecutionPolicy Bypass -File "仓库配置器-中文版.ps1"

if %errorlevel% equ 0 (
    echo.
    echo ✅ 中文版配置器已正常关闭
) else (
    echo.
    echo ❌ 中文版配置器运行出错
)

echo.
pause 