@echo off
setlocal enabledelayedexpansion
echo ====================================================
echo Starting LegalLens AI Frontend (Next.js)...
echo ====================================================

set "NODE_CMD="
set "NPM_CMD="

:: 1. Check if node and npm are in current PATH
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "NODE_CMD=node"
)
where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "NPM_CMD=npm"
)

:: 2. If not found, search standard installation directories
if not defined NODE_CMD (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files\nodejs\node.exe"
        set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
        set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;!PATH!"
    ) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "NODE_CMD=%LOCALAPPDATA%\Programs\nodejs\node.exe"
        set "NPM_CMD=%LOCALAPPDATA%\Programs\nodejs\npm.cmd"
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;!PATH!"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files (x86)\nodejs\node.exe"
        set "NPM_CMD=C:\Program Files (x86)\nodejs\npm.cmd"
        set "PATH=C:\Program Files (x86)\nodejs;%APPDATA%\npm;!PATH!"
    )
)

:: 3. If still not found, provide clear actionable guidance
if not defined NPM_CMD (
    echo [ERROR] Node.js and NPM were not found on this machine!
    echo.
    echo To run the frontend locally:
    echo 1. Download and install Node.js (LTS version) from:
    echo    https://nodejs.org/
    echo 2. During installation, ensure "Add to PATH" is checked.
    echo 3. Restart Antigravity IDE and run this script again.
    echo.
    echo NOTE: The full LegalLens AI web application is ALREADY LIVE in production:
    echo ========================================================================
    echo Frontend URL: https://hack2ski-frontend-gunvants-projects-43dc627e.vercel.app
    echo Backend Docs: https://backend-eight-ecru-95.vercel.app/docs
    echo ========================================================================
    echo You can use the live URL immediately without installing local Node.js!
    echo.
    pause
    exit /b 1
)

:: 4. Ensure %APPDATA%\npm folder exists (prevents npm missing file errors)
if not exist "%APPDATA%\npm" (
    mkdir "%APPDATA%\npm" 2>nul
)

cd /d "%~dp0frontend"
echo Using Node: !NODE_CMD!
echo Using NPM:  !NPM_CMD!

if not exist node_modules (
    echo [INFO] Installing frontend dependencies...
    call "!NPM_CMD!" install
)

echo [INFO] Starting Next.js development server on http://localhost:3000 ...
call "!NPM_CMD!" run dev
pause
