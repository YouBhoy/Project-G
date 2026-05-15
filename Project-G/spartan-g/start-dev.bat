@echo off
setlocal

REM Resolve project root from this script location (handles spaces in path)
set "ROOT=%~dp0"

if not exist "%ROOT%backend\.env" (
	if exist "%ROOT%backend\.env.example" (
		copy /Y "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
		echo [INFO] Created backend\.env from backend\.env.example.
	) else (
		echo [WARN] backend\.env.example not found.
	)
)

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
echo - This launcher does not require Google calendar secrets.
echo.
endlocal
