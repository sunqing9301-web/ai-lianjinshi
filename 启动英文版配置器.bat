@echo off
chcp 65001 >nul
echo ========================================
echo    Git Repository Configurator - English
echo ========================================
echo.

echo Starting Git Repository Configurator (English Version)...
echo.

:: Check auto-sync-tools folder
if not exist "auto-sync-tools" (
    echo Error: auto-sync-tools folder does not exist
    echo Please ensure all sync tool files are in the auto-sync-tools folder
    pause
    exit 1
)

:: Check English configurator file
if not exist "auto-sync-tools\RepositoryConfigurator-EN.ps1" (
    echo Error: English configurator file not found
    echo Please ensure the English configurator is in the auto-sync-tools folder
    pause
    exit 1
)

:: Call the English configurator in auto-sync-tools folder
echo Calling English configurator...
call "auto-sync-tools\启动英文版配置器.bat"

echo.
echo Return to project root directory...
pause 