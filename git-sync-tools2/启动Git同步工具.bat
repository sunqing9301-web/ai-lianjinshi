@echo off
chcp 65001 >nul
title Git同步工具启动器

echo ========================================
echo        Git同步工具启动器
echo ========================================
echo.

cd /d "%~dp0"

if exist "git-sync-tools\GitAutoSync-Simple.ps1" (
    echo 正在启动Git自动同步GUI...
    powershell -ExecutionPolicy Bypass -File "git-sync-tools\GitAutoSync-Simple.ps1"
) else (
    echo 错误：找不到GitAutoSync-Simple.ps1文件
    echo 请确保文件存在于git-sync-tools目录中
    pause
) 