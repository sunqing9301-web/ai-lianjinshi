@echo off
chcp 65001 >nul
echo ========================================
echo    Git仓库配置器 - 启动器
echo ========================================
echo.

echo 正在启动Git仓库配置器...
echo.

:: 检查auto-sync-tools文件夹
if not exist "auto-sync-tools" (
    echo ❌ auto-sync-tools文件夹不存在
    echo 请确保所有同步工具文件都在auto-sync-tools文件夹中
    pause
    exit 1
)

:: 检查仓库配置器文件
if not exist "auto-sync-tools\仓库配置器.ps1" (
    echo ❌ 仓库配置器文件不存在
    echo 请确保仓库配置器文件在auto-sync-tools文件夹中
    pause
    exit 1
)

:: 调用auto-sync-tools文件夹中的仓库配置器
echo 正在调用仓库配置器...
call "auto-sync-tools\启动仓库配置器.bat"

echo.
echo 返回项目根目录...
pause 