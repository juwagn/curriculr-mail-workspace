@echo off
rem Doppelklick-Installer: installiert Spark Look ins Standardprofil von Thunderbird.
rem Thunderbird vorher komplett beenden.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Auto
echo.
pause
