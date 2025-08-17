@echo off
chcp 65001 >nul
echo ========================================
echo    Git Repository Configurator - Fixed Version
echo ========================================
echo.

echo Starting Git Repository Configurator...
echo.

:: Check auto-sync-tools folder
if not exist "auto-sync-tools" (
    echo auto-sync-tools folder does not exist
    echo Please ensure all sync tool files are in the auto-sync-tools folder
    pause
    exit 1
)

:: Check Repository Configurator file
if not exist "auto-sync-tools\RepositoryConfigurator.ps1" (
    echo Repository Configurator file does not exist
    echo Please ensure Repository Configurator file is in the auto-sync-tools folder
    pause
    exit 1
)

:: Call Repository Configurator from auto-sync-tools folder
echo Calling Repository Configurator...
call "auto-sync-tools\启动修复版配置器.bat"

echo.
echo Returning to project root directory...
pause 