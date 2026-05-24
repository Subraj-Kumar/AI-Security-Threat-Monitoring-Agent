@echo off
REM SecOPS Hackathon - Quick Start Script (Windows)
REM This opens two new windows for backend and frontend servers

echo.
echo ========================================
echo  SecOPS - Security Operations Center
echo  Starting Servers for Demo...
echo ========================================
echo.

echo.
echo [1/2] Starting Backend (FastAPI on http://127.0.0.1:8000)...
start "SecOPS Backend" cmd /k "cd backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak

echo [2/2] Starting Frontend (Next.js on http://localhost:3000)...
start "SecOPS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo  Servers Starting...
echo ========================================
echo.
echo Wait 5-10 seconds for both to fully load, then:
echo   Open browser: http://localhost:3000
echo.
echo Backend API docs: http://127.0.0.1:8000/docs
echo.
pause
