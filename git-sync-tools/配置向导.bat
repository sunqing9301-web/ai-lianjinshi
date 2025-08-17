@echo off
chcp 65001 >nul
echo ========================================
echo    Git自动同步 - 配置向导
echo ========================================
echo.

echo 欢迎使用Git自动同步配置向导！
echo 请按照提示输入相关信息。
echo.

:: 获取当前目录作为默认本地路径
set DEFAULT_LOCAL_PATH=%~dp0
set DEFAULT_LOCAL_PATH=%DEFAULT_LOCAL_PATH:~0,-1%

echo 当前检测到的信息：
echo   本地项目路径: %DEFAULT_LOCAL_PATH%
echo   远程仓库地址: https://github.com/sunqing9301-web/ai-lianjinshi.git
echo.

:: 确认本地路径
set /p LOCAL_PATH=请输入本地项目路径 (直接回车使用默认路径): 
if "%LOCAL_PATH%"=="" set LOCAL_PATH=%DEFAULT_LOCAL_PATH%

:: 确认远程仓库地址
set /p REMOTE_URL=请输入远程仓库地址 (直接回车使用默认地址): 
if "%REMOTE_URL%"=="" set REMOTE_URL=https://github.com/sunqing9301-web/ai-lianjinshi.git

:: 确认分支名称
set /p BRANCH=请输入分支名称 (直接回车使用main): 
if "%BRANCH%"=="" set BRANCH=main

:: 确认同步间隔
set /p INTERVAL=请输入同步间隔(分钟) (直接回车使用5分钟): 
if "%INTERVAL%"=="" set INTERVAL=5

echo.
echo 配置信息确认：
echo   本地项目路径: %LOCAL_PATH%
echo   远程仓库地址: %REMOTE_URL%
echo   分支名称: %BRANCH%
echo   同步间隔: %INTERVAL% 分钟
echo.

set /p CONFIRM=确认以上配置信息？(Y/N): 
if /i "%CONFIRM%" neq "Y" (
    echo 配置已取消
    pause
    exit 0
)

echo.
echo 正在更新配置文件...

:: 更新配置文件
powershell -Command "& {
    $config = Get-Content 'auto-sync-config.json' | ConvertFrom-Json
    $config.sync.repoPath = '%LOCAL_PATH%'
    $config.sync.interval = %INTERVAL%
    $config.sync.branch = '%BRANCH%'
    $config | ConvertTo-Json -Depth 10 | Set-Content 'auto-sync-config.json'
}"

if %errorlevel% equ 0 (
    echo ✅ 配置文件更新成功！
) else (
    echo ❌ 配置文件更新失败
    pause
    exit 1
)

echo.
echo 正在检查Git仓库状态...

:: 切换到项目目录
cd /d "%LOCAL_PATH%"

:: 检查Git仓库
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 指定路径不是Git仓库: %LOCAL_PATH%
    echo 请确保该路径包含.git文件夹
    pause
    exit 1
)

:: 检查远程仓库
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未检测到远程仓库配置
    echo 正在添加远程仓库...
    git remote add origin "%REMOTE_URL%"
    if %errorlevel% equ 0 (
        echo ✅ 远程仓库添加成功
    ) else (
        echo ❌ 远程仓库添加失败
        pause
        exit 1
    )
) else (
    echo ✅ 远程仓库配置正常
)

echo.
echo 🎉 配置完成！
echo.
echo 配置信息：
echo   本地项目路径: %LOCAL_PATH%
echo   远程仓库地址: %REMOTE_URL%
echo   分支名称: %BRANCH%
echo   同步间隔: %INTERVAL% 分钟
echo.
echo 下一步：
echo   1. 运行 "一键设置全自动同步.bat" 创建任务计划
echo   2. 或运行 "setup-auto-sync.ps1" 手动设置
echo.

pause 