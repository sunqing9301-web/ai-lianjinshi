@echo off
chcp 65001 >nul
echo ========================================
echo    Git仓库全自动同步 - 主设置工具
echo ========================================
echo.

echo 正在检查auto-sync-tools文件夹...
if not exist "auto-sync-tools" (
    echo ❌ auto-sync-tools文件夹不存在
    echo 请确保所有同步工具文件都在auto-sync-tools文件夹中
    pause
    exit 1
)

echo ✅ auto-sync-tools文件夹存在
echo.

echo 正在切换到auto-sync-tools目录...
cd auto-sync-tools

echo 正在运行一键设置工具...
call "一键设置全自动同步.bat"

echo.
echo 设置完成，返回项目根目录...
cd ..

pause 