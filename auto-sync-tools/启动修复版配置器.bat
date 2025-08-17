@echo off
chcp 65001 >nul
echo ========================================
echo    Git Repository Configurator - Fixed Version
echo ========================================
echo.

echo Starting Git Repository Configurator...
echo.

:: Check PowerShell
powershell -Command "Write-Host 'PowerShell Version:' $PSVersionTable.PSVersion" >nul 2>&1
if %errorlevel% neq 0 (
    echo PowerShell not available, please ensure PowerShell is installed
    pause
    exit 1
)

:: Start Repository Configurator
echo Starting, please wait...
powershell -ExecutionPolicy Bypass -File "RepositoryConfigurator.ps1"

if %errorlevel% equ 0 (
    echo.
    echo Repository Configurator closed normally
) else (
    echo.
    echo Repository Configurator encountered an error
)

echo.
pause 