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

echo.
echo 步骤1: 配置Git仓库信息
echo ================================
echo.

:: 检查是否已有配置文件
if exist "auto-sync-config.json" (
    echo 检测到现有配置文件
    set /p RUN_CONFIG=是否重新配置？(Y/N，默认N): 
    if /i "%RUN_CONFIG%"=="Y" (
        echo 正在运行配置向导...
        powershell -ExecutionPolicy Bypass -File "配置向导.ps1"
        if %errorlevel% neq 0 (
            echo ❌ 配置失败
            pause
            exit 1
        )
    ) else (
        echo 使用现有配置
    )
) else (
    echo 未检测到配置文件，正在运行配置向导...
    powershell -ExecutionPolicy Bypass -File "配置向导.ps1"
    if %errorlevel% neq 0 (
        echo ❌ 配置失败
        pause
        exit 1
    )
)

echo.
echo 步骤2: 创建自动同步任务
echo ================================
echo.

echo 正在运行一键设置工具...
call "一键设置全自动同步.bat"

echo.
echo 设置完成，返回项目根目录...
cd ..

echo.
echo 🎉 Git自动同步设置完成！
echo.
echo 配置信息：
echo   本地项目路径: 请查看 auto-sync-tools\auto-sync-config.json
echo   远程仓库地址: 请查看 auto-sync-tools\auto-sync-config.json
echo   同步间隔: 请查看 auto-sync-tools\auto-sync-config.json
echo   任务名称: GitAutoSync
echo.
echo 管理命令：
echo   查看任务状态: Get-ScheduledTask -TaskName "GitAutoSync"
echo   手动启动同步: Start-ScheduledTask -TaskName "GitAutoSync"
echo   停止自动同步: Stop-ScheduledTask -TaskName "GitAutoSync"
echo   删除任务: Unregister-ScheduledTask -TaskName "GitAutoSync" -Confirm:$false
echo.
echo 日志文件: auto-sync-tools\sync.log
echo.

pause 