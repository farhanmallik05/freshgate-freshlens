@echo off
echo =======================================================
echo  FreshGate + FreshLens: Unified Hackathon Demo Launcher
echo =======================================================
echo.
echo Starting FreshGate Engine (port 8787)...
start "FreshGate Engine" cmd /k "cd freshgate\engine && set ENGINE_MOCK=1 && pnpm dev"

timeout /t 2 /nobreak >nul

echo Starting FreshGate Dashboard (port 3000)...
start "FreshGate Dashboard" cmd /k "cd freshgate\dashboard && pnpm dev"

timeout /t 2 /nobreak >nul

echo Starting FreshGate Interactive Demo (port 3001)...
start "FreshGate Demo" cmd /k "cd freshgate\demo && pnpm dev"

echo.
echo All services launched!
echo - FreshGate Engine:       http://localhost:8787/healthz
echo - FreshGate Dashboard:    http://localhost:3000/overview
echo - Interactive Demo App:   http://localhost:3001
echo.
echo FreshLens Chrome Extension:
echo - Load unpacked from: freshlens\.output\chrome-mv3
echo.
pause
