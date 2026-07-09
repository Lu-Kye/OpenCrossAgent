@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM dev-cli-build.bat
REM Build + npm link oca-cli
REM Supports: Windows (cmd / PowerShell)
REM Usage: scripts\dev-cli-build.bat

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "PKG_DIR=%PROJECT_ROOT%\clients\cli"
set "PKG_NAME=@oca/oca-cli"

echo Building %PKG_NAME%...

REM -- Ensure pnpm --
where pnpm >nul 2>&1
if !errorlevel! neq 0 (
  echo [WARN] pnpm not found. Attempting auto-install...
  where npm >nul 2>&1
  if !errorlevel! neq 0 (
    echo [ERROR] npm not found. Please install Node.js ^>= 22 first:
    echo    https://nodejs.org/
    exit /b 1
  )
  call npm install -g pnpm
  if !errorlevel! neq 0 (
    echo [ERROR] Failed to install pnpm automatically.
    echo    Please install manually: npm install -g pnpm
    exit /b 1
  )
)

REM -- Ensure bun --
where bun >nul 2>&1
if !errorlevel! neq 0 (
  echo [WARN] bun not found. Attempting auto-install...
  powershell -NoProfile -ExecutionPolicy Bypass -c "irm bun.sh/install.ps1 | iex"
  if !errorlevel! neq 0 (
    echo [ERROR] Failed to install bun automatically.
    echo    Please install manually: https://bun.sh/
    exit /b 1
  )
  set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
)

REM -- Install deps if needed --
cd /d "%PROJECT_ROOT%"
if not exist "%PKG_DIR%\node_modules" (
  echo Installing dependencies...
  call pnpm install
  if !errorlevel! neq 0 (
    echo [ERROR] Failed to install dependencies.
    echo    Please run manually: pnpm install
    exit /b 1
  )
)

REM -- Build --
cd /d "%PKG_DIR%"
echo Building...
call pnpm build
if !errorlevel! neq 0 (
  echo [ERROR] Build failed.
  exit /b 1
)

REM -- npm link --
echo npm link...
call npm link
if !errorlevel! neq 0 (
  echo [ERROR] npm link failed.
  echo    Try manually: cd clients\cli ^&^& npm link
  exit /b 1
)

echo.
echo [OK] %PKG_NAME% built and linked!
echo    You can now run: oca-cli
