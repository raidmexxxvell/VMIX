@echo off
REM One-click launcher for VMIX app
SETLOCAL
SET "APP_DIR=%~dp0"
IF "%APP_DIR:~-1%"=="\" SET "APP_DIR=%APP_DIR:~0,-1%"

where node >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
  REM Node.js найден — запускаем локальный статический сервер через npx http-server
  start "VMIX Server" cmd /k "cd /d "%APP_DIR%" & npx --yes http-server -p 5500 -c-1"
  timeout /t 1 >nul
  start "" "http://localhost:5500/index.html"
) ELSE (
  REM Node.js не найден — откроем файл напрямую в браузере по умолчанию
  start "" "%APP_DIR%\index.html"
)
ENDLOCAL
EXIT /B 0
