@echo off
chcp 65001 >nul
echo ========================================
echo    Git Repository Configurator - English
echo ========================================
echo.

echo Starting Git Repository Configurator (English Version)...
echo.

:: Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: PowerShell is not available
    pause
    exit 1
)

:: Check if the configurator script exists
if not exist "RepositoryConfigurator-EN.ps1" (
    echo Error: RepositoryConfigurator-EN.ps1 not found
    echo Please ensure the English configurator is in the current directory
    pause
    exit 1
)

:: Run the English configurator
echo Launching English configurator...
powershell -ExecutionPolicy Bypass -File "RepositoryConfigurator-EN.ps1"

echo.
echo English configurator completed.
pause 