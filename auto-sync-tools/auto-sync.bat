@echo off
echo ========================================
echo    Git仓库自动同步工具
echo ========================================
echo.

:: 配置信息
set REPO_DIR=%~dp0
set REMOTE=origin
set BRANCH=main
set LOG_FILE=%REPO_DIR%sync.log

echo 仓库路径: %REPO_DIR%
echo 远程仓库: %REMOTE%
echo 分支: %BRANCH%
echo 日志文件: %LOG_FILE%
echo.

:: 进入仓库目录
cd /d "%REPO_DIR%"

:: 检查Git状态
echo [%date% %time%] 开始同步...
echo [%date% %time%] 检查Git状态...

:: 检查是否有未提交的更改
git status --porcelain >nul 2>&1
if %errorlevel% equ 0 (
    echo [%date% %time%] 发现本地更改，正在提交...
    git add .
    git commit -m "Auto sync: %date% %time%"
    if %errorlevel% equ 0 (
        echo [%date% %time%] 本地更改已提交
    ) else (
        echo [%date% %time%] 本地提交失败
    )
)

:: 拉取远程更新
echo [%date% %time%] 拉取远程更新...
git pull %REMOTE% %BRANCH%
if %errorlevel% equ 0 (
    echo [%date% %time%] 远程更新拉取成功
) else (
    echo [%date% %time%] 远程更新拉取失败，可能存在冲突
    echo [%date% %time%] 请手动解决冲突后重新同步
)

:: 推送本地更改
echo [%date% %time%] 推送本地更改...
git push %REMOTE% %BRANCH%
if %errorlevel% equ 0 (
    echo [%date% %time%] 本地更改推送成功
) else (
    echo [%date% %time%] 本地更改推送失败
)

echo [%date% %time%] 同步完成
echo.

:: 记录日志
echo [%date% %time%] 同步完成 >> "%LOG_FILE%"

pause 