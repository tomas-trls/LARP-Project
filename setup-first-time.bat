@echo off
rem LARP: first-time setup. Double-click this once on a new computer.
rem It needs Python 3.11 and Node.js installed (see DEMO_GUIDE.md).
title LARP first-time setup
cd /d "%~dp0"

echo.
echo === 1/4  Creating the settings file (.env) ===
if not exist .env (
  copy .env.example .env >nul
  rem Demo settings: any email address can register, and nothing goes out to the internet.
  powershell -NoProfile -Command "(Get-Content .env) -replace 'REQUIRE_UCL_EMAIL=true','REQUIRE_UCL_EMAIL=false' | Set-Content .env"
  echo Created .env
) else (
  echo .env already exists, leaving it alone.
)

echo.
echo === 2/4  Setting up the back end (this takes a minute or two) ===
pushd backend
py -3.11 -m venv .venv
if errorlevel 1 (
  echo.
  echo Could not find Python 3.11. Install it from python.org, tick "Add python.exe to PATH", then run this again.
  popd
  pause
  exit /b 1
)
.venv\Scripts\python.exe -m pip install -r requirements.txt
popd

echo.
echo === 3/4  Setting up the front end (this takes a minute or two) ===
pushd frontend
call npm install
if errorlevel 1 (
  echo.
  echo Could not run npm. Install Node.js from nodejs.org, then run this again.
  popd
  pause
  exit /b 1
)
popd

echo.
echo === 4/4  Done ===
echo Now double-click start-demo.bat to run the demo.
pause
