@echo off
setlocal

REM Resolve project root from this script location (handles spaces in path)
set "ROOT=%~dp0"

echo ==========================================
echo Starting SPARTAN-G development services...
echo ==========================================
echo.

if not exist "%ROOT%backend\package.json" (
  echo [ERROR] backend\package.json not found.
  echo Run this script from the spartan-g root folder.
  pause
  exit /b 1
)

if not exist "%ROOT%student-portal\package.json" (
  echo [ERROR] student-portal\package.json not found.
  echo Run this script from the spartan-g root folder.
  pause
  exit /b 1
)

echo [1/2] Starting backend on http://localhost:3001 ...
start "SPARTAN-G Backend" cmd /k "cd /d "%ROOT%backend" && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/2] Starting student portal on http://localhost:5175 ...
start "SPARTAN-G Student Portal" cmd /k "cd /d "%ROOT%student-portal" && set "VITE_API_BASE_URL=http://localhost:3001" && npm run dev"

echo.
echo Services launched in new terminal windows.
echo Backend:       http://localhost:3001
echo Student Portal:http://localhost:5175
echo.
echo NOTE for physical Android phone testing:
echo - Use your PC LAN IP in mobile-app/lib/core/constants/api_constants.dart
echo   instead of 10.0.2.2, then rebuild APK.
echo.
endlocal
