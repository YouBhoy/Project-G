@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "LOCAL_PROPERTIES=%SCRIPT_DIR%android\local.properties"
set "FLUTTER_SDK="
set "SDK_DIR="

if not exist "%LOCAL_PROPERTIES%" (
  echo Android local.properties was not found at %LOCAL_PROPERTIES%.
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%LOCAL_PROPERTIES%") do (
  if "%%A"=="sdk.dir" set "SDK_DIR=%%B"
  if "%%A"=="flutter.sdk" set "FLUTTER_SDK=%%B"
)

if not defined FLUTTER_SDK set "FLUTTER_SDK=C:\flutter\flutter"

set "FLUTTER=%FLUTTER_SDK%\bin\flutter.bat"
set "ADB=%SDK_DIR%\platform-tools\adb.exe"
set "APK=%SCRIPT_DIR%build\app\outputs\flutter-apk\app-debug.apk"

if not exist "%FLUTTER%" (
  echo Flutter was not found at %FLUTTER%.
  exit /b 1
)

if not exist "%ADB%" (
  echo adb was not found at %ADB%.
  exit /b 1
)

echo Building debug APK...
pushd "%SCRIPT_DIR%"
"%FLUTTER%" build apk --debug
if errorlevel 1 (
  popd
  echo Build failed.
  exit /b 1
)

echo Installing to the connected Android device...
"%ADB%" -d install -r "%APK%"

popd

if errorlevel 1 (
  echo Installation failed.
  exit /b 1
)

echo Installation complete.
endlocal