@echo off
echo Starting LegalLens AI Frontend...
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installing npm packages...
    call npm install
)
call npm run dev
pause
