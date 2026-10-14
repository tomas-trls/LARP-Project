@echo off
rem LARP: start the demo. Double-click this.
rem It resets the practice data, starts the back end and front end in two windows, and opens the site.
title LARP demo launcher
cd /d "%~dp0"

if not exist backend\.venv\Scripts\python.exe (
  echo Setup has not been run on this computer yet. Double-click setup-first-time.bat first.
  pause
  exit /b 1
)

echo Resetting the demo data (32 practice students, real events and venues)...
pushd backend
.venv\Scripts\python.exe -m app.reset_db
if errorlevel 1 (
  echo.
  echo The reset failed. Close any old LARP windows (the black ones) and try again.
  popd
  pause
  exit /b 1
)
popd

echo Starting the back end and front end in two new windows. Leave them open during the demo.
start "LARP back end" /d "%~dp0backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"
start "LARP front end" /d "%~dp0frontend" cmd /k "npm run dev"

echo Opening the site in a few seconds...
timeout /t 8 /nobreak >nul
start http://localhost:5173

echo.
echo The demo is running at http://localhost:5173
echo To stop it, close the two black windows called "LARP back end" and "LARP front end".
echo Practice logins: demo.main@ucl.ac.uk or demo.canary@ucl.ac.uk, password demo1234
pause
