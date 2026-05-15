@echo off
setlocal

REM Resolve project root from this script location (handles spaces in path)
set "ROOT=%~dp0"

set "MAIN_API_BASE_URL=http://localhost:3001"
set "CALENDAR_API_BASE_URL=http://localhost:3002"
set "FLUTTER_API_BASE_URL=http://10.0.2.2:3001/api"

if defined MOBILE_API_BASE_URL set "FLUTTER_API_BASE_URL=%MOBILE_API_BASE_URL%"

echo ==========================================
echo Starting SPARTAN-G full development stack...
echo ==========================================
echo.

call :ensure_env_file "%ROOT%backend" ".env.example" ".env" "backend"
call :ensure_env_file "%ROOT%server" ".env.example" ".env" "calendar server"

if not exist "%ROOT%backend\package.json" (
  echo [ERROR] backend\package.json not found.
  pause
  exit /b 1
)

if not exist "%ROOT%server\package.json" (
  echo [ERROR] server\package.json not found.
  pause
  exit /b 1
)

if not exist "%ROOT%student-portal\package.json" (
  echo [ERROR] student-portal\package.json not found.
  pause
  exit /b 1
)

if not exist "%ROOT%mobile-app\pubspec.yaml" (
  echo [ERROR] mobile-app\pubspec.yaml not found.
  pause
  exit /b 1
)

set "CALENDAR_READY=0"
set "CALENDAR_PID="
set "FLUTTER_AVAILABLE=0"
if exist "%ROOT%server\.env" if exist "%ROOT%server\service-account.json" set "CALENDAR_READY=1"
where flutter >nul 2>nul && set "FLUTTER_AVAILABLE=1"

echo [1/4] Starting backend on http://localhost:3001 ...
start "SPARTAN-G Backend" cmd /k "cd /d ""%ROOT%backend"" && npm run dev"

echo [2/4] Starting calendar server on http://localhost:3002 ...
if "%CALENDAR_READY%"=="1" (
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3002 .*LISTENING"') do set "CALENDAR_PID=%%P"
  if defined CALENDAR_PID (
    echo [SKIP] Calendar server is already running on port 3002 (PID %CALENDAR_PID%).
  ) else (
    start "SPARTAN-G Calendar Server" cmd /k "cd /d ""%ROOT%server"" && set PORT=3002 && npm start"
  )
) else (
  echo [SKIP] Calendar server is optional and was not started.
  echo         Create server\.env and server\service-account.json to enable it.
)

echo [3/4] Starting student portal on http://localhost:5175 ...
start "SPARTAN-G Student Portal" cmd /k "cd /d ""%ROOT%student-portal"" && set VITE_API_BASE_URL=%MAIN_API_BASE_URL% && set VITE_CALENDAR_API_BASE_URL=%CALENDAR_API_BASE_URL% && npm run dev"

echo [4/4] Starting Flutter mobile app ...
if "%FLUTTER_AVAILABLE%"=="0" (
  echo [SKIP] Flutter SDK not found on PATH; mobile app was not started.
) else (
  start "SPARTAN-G Mobile App" cmd /k "cd /d ""%ROOT%mobile-app"" && flutter run --dart-define=API_BASE_URL=%FLUTTER_API_BASE_URL%"
)

echo.
echo Windows launched for backend, student portal, and any available optional services.
echo.
echo Notes:
echo - Change MOBILE_API_BASE_URL before running this file if you want a real phone instead of the emulator.
echo - The calendar server only starts when server\.env and server\service-account.json exist locally.
echo.
endlocal

goto :eof

:ensure_env_file
set "TARGET_DIR=%~1"
set "SOURCE_NAME=%~2"
set "TARGET_NAME=%~3"
set "LABEL=%~4"

if not exist "%TARGET_DIR%\%TARGET_NAME%" (
  if exist "%TARGET_DIR%\%SOURCE_NAME%" (
    copy /Y "%TARGET_DIR%\%SOURCE_NAME%" "%TARGET_DIR%\%TARGET_NAME%" >nul
    echo [INFO] Created %LABEL% env file from %SOURCE_NAME%.
  ) else (
    echo [WARN] %LABEL% env template not found at %TARGET_DIR%\%SOURCE_NAME%.
  )
)
goto :eof