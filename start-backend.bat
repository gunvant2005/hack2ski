@echo off
setlocal
echo ====================================================
echo Starting LegalLens AI Backend (FastAPI)...
echo ====================================================
cd /d "%~dp0backend"

set "PYTHON_CMD="

:: 1. Check if virtual environment exists
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PYTHON_CMD=%~dp0backend\venv\Scripts\python.exe"
    goto RUN
)
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_CMD=%~dp0backend\.venv\Scripts\python.exe"
    goto RUN
)

:: 2. Check if python in AppData exists
if exist "C:\Users\dhake\AppData\Local\Python\pythoncore-3.14-64\python.exe" (
    set "PYTHON_CMD=C:\Users\dhake\AppData\Local\Python\pythoncore-3.14-64\python.exe"
    goto RUN
)
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto RUN
)
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    goto RUN
)
if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    goto RUN
)

:: 3. Check if python is in PATH
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PYTHON_CMD=python"
    goto RUN
)

:: 4. Check if py launcher is in PATH
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PYTHON_CMD=py"
    goto RUN
)

echo [ERROR] Python was not found! Please ensure Python 3.10+ is installed.
pause
exit /b 1

:RUN
echo Using Python at: "%PYTHON_CMD%"
echo Backend running on: http://localhost:8000
echo Swagger API Docs at: http://localhost:8000/docs
"%PYTHON_CMD%" -m uvicorn app.main:app --reload --port 8000
pause
