@echo off
echo Launching LegalLens AI Platform (Backend + Frontend)...
start "LegalLens Backend" cmd /k "%~dp0start-backend.bat"
start "LegalLens Frontend" cmd /k "%~dp0start-frontend.bat"
echo Done! Backend running on http://localhost:8000 and Frontend running on http://localhost:3000
