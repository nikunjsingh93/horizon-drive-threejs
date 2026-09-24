@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing the project dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
node node_modules\vite\bin\vite.js preview --host 127.0.0.1 --port 5173 --strictPort
