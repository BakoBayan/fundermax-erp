@echo off
:: ============================================================================
:: Bako's Master System v1.6 - Dedicated Desktop App Shell Launcher
:: Client: Shaswar Ahmad Shaswar Co. (کۆمپانیای شاسوار ئەحمەد شاسوار)
:: Architect & System Maintainer: Bako Bayan Madhhar (07705488654)
:: ============================================================================
:: MANAGED SERVER HOSTING INSTRUCTIONS:
:: When deployed to your private managed server or Cloudflare Tunnel,
:: replace "http://localhost:3000" below with your live domain or server IP.
::
:: Production Examples:
::   set SERVER_URL=https://erp.shaswar-wood.com
::   set SERVER_URL=https://bako-master.yourdomain.com
::   set SERVER_URL=http://192.168.1.100:3000
:: ============================================================================

set SERVER_URL=http://localhost:3000

echo ============================================================================
echo  Bako's Master System v1.6 - Launching Dedicated Shop Shell...
echo  Target Server: %SERVER_URL%
echo ============================================================================

:: Launch Edge in standalone zero-footprint web application mode
start msedge.exe --app=%SERVER_URL% --window-size=1440,900

:: Fallback for systems preferring Chrome if Edge is unavailable
if errorlevel 1 (
  start chrome.exe --app=%SERVER_URL% --window-size=1440,900
)

exit
