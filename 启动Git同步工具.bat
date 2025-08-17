@echo off
chcp 65001 >nul
echo ========================================
echo    Git自动同步工具启动器
echo ========================================
echo.

echo 正在启动Git自动同步工具...
echo.

:: 检查git-sync-tools文件夹
if not exist "git-sync-tools" (
    echo ❌ git-sync-tools文件夹不存在
    echo 请确保所有同步工具文件都在git-sync-tools文件夹中
    pause
    exit 1
)

:: 显示可用工具
echo 可用的同步工具：
echo.
echo 1. 英文版配置器 (推荐)
echo 2. 中文版配置器
echo 3. GUI应用
echo 4. 一键设置工具
echo 5. 查看使用指南
echo.

set /p choice=请选择工具 (1-5): 

if "%choice%"=="1" (
    echo 启动英文版配置器...
    call "git-sync-tools\启动英文版配置器.bat"
) else if "%choice%"=="2" (
    echo 启动中文版配置器...
    call "git-sync-tools\启动中文版配置器.bat"
) else if "%choice%"=="3" (
    echo 启动GUI应用...
    call "git-sync-tools\启动Git自动同步GUI.bat"
) else if "%choice%"=="4" (
    echo 启动一键设置工具...
    call "git-sync-tools\setup-git-auto-sync.bat"
) else if "%choice%"=="5" (
    echo 打开使用指南...
    start "" "git-sync-tools\Git自动同步使用指南.md"
) else (
    echo 无效选择，启动英文版配置器...
    call "git-sync-tools\启动英文版配置器.bat"
)

echo.
echo 返回项目根目录...
pause 