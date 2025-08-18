@echo off
chcp 65001 >nul
title 手动Git同步工具

echo ========================================
echo        手动Git同步工具
echo ========================================
echo.

cd /d "%~dp0"

if exist "手动同步工具.ps1" (
    echo 正在启动手动同步工具...
    powershell -ExecutionPolicy Bypass -File "手动同步工具.ps1"
) else (
    echo 错误：找不到手动同步工具.ps1文件
    pause
) 