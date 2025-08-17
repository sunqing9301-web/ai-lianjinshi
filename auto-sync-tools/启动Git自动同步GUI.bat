@echo off
chcp 65001 >nul
echo ========================================
echo    Git自动同步 - GUI应用启动器
echo ========================================
echo.

echo 正在启动Git自动同步GUI应用...
echo.

:: 检查auto-sync-tools文件夹
if not exist "auto-sync-tools" (
    echo ❌ auto-sync-tools文件夹不存在
    echo 请确保所有同步工具文件都在auto-sync-tools文件夹中
    pause
    exit 1
)

:: 切换到auto-sync-tools目录
cd auto-sync-tools

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
echo 返回项目根目录...
cd ..

pause 