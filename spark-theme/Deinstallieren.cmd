@echo off
rem Doppelklick-Deinstaller: entfernt Spark Look aus dem Standardprofil von Thunderbird.
rem Thunderbird vorher komplett beenden.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1" -Auto
echo.
pause
