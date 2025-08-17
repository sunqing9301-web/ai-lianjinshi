@echo off
chcp 65001 >nul
echo ========================================
echo    Git自动同步 - GUI应用启动器
echo ========================================
echo.

echo 正在启动Git自动同步GUI应用...
echo.

:: 检查PowerShell
powershell -Command "Write-Host 'PowerShell版本:' $PSVersionTable.PSVersion" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell不可用，请确保系统已安装PowerShell
    pause
    exit 1
)

:: 启动GUI应用
echo 启动中，请稍候...
powershell -ExecutionPolicy Bypass -File "GitAutoSync-Simple.ps1"

if %errorlevel% equ 0 (
    echo.
    echo ✅ GUI应用已正常关闭
) else (
    echo.
    echo ❌ GUI应用运行出错
)

echo.
pause 