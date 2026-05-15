@echo off
setlocal

REM Resolve project root from this script location (handles spaces in path)
set "ROOT=%~dp0"

echo ==========================================
echo Starting SPARTAN-G development services...
echo ==========================================
echo.
echo Launching backend and student portal from the spartan-g root...
pushd "%ROOT%"
npm run dev
popd

echo.
echo Services launched through the root dev script.
echo.
echo NOTE for physical Android phone testing:
echo - Use your PC LAN IP in mobile-app/lib/core/constants/api_constants.dart
echo   instead of 10.0.2.2, then rebuild APK.
echo.
endlocal
