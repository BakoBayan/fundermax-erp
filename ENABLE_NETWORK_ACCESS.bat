@echo off
title Bako's Panel Manager - Network & Phone Access Setup
color 0B

echo ========================================================================
echo        BAKO'S PANEL MANAGER - ALLOW PHONE & NETWORK ACCESS
echo ========================================================================
echo.
echo Checking Administrator privileges...

net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ACTION REQUIRED] Requesting Administrator permission...
    echo Please click "YES" on the Windows prompt to configure the firewall.
    echo.
    set "SELF_BAT=%~f0"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$b = $env:SELF_BAT; Start-Process -FilePath 'cmd.exe' -ArgumentList ('/k \"\"' + $b + '\"\"') -Verb RunAs"
    exit /b
)

echo [OK] Running as Administrator!
echo.
echo 1. Configuring Windows Firewall for Port 3000...
netsh advfirewall firewall delete rule name="Bako Panel Server Port 3000" >nul 2>&1
netsh advfirewall firewall add rule name="Bako Panel Server Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any
if %ERRORLEVEL% equ 0 (
    echo    [SUCCESS] Port 3000 allowed for all networks (Public and Private)!
)

echo.
echo 2. Allowing Node.js through Windows Firewall...
for /f "delims=" %%I in ('where node 2^>nul') do (
    netsh advfirewall firewall add rule name="Node.js Server (Bako)" dir=in action=allow program="%%I" enable=yes profile=any >nul 2>&1
)

echo.
echo 3. Switching Wi-Fi connection to Private Network...
powershell -NoProfile -Command "Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' } | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue" >nul 2>&1
echo    [SUCCESS] Wi-Fi network profile set to Private!

echo.
echo 4. Detecting your Phone / Network IP address...
for /f "delims=" %%I in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress -First 1)" 2^>nul') do (
    set "LOCAL_IP=%%I"
)
if "%LOCAL_IP%"=="" set "LOCAL_IP=192.168.1.33"

echo.
echo ========================================================================
echo   SERVER IS NOW OPEN TO ALL PHONES, TABLETS AND COMPUTERS!
echo ========================================================================
echo.
echo   Type this URL into the browser on any phone or device on your Wi-Fi:
echo.
echo      http://%LOCAL_IP%:3000
echo.
echo ========================================================================
echo.
echo Press any key to close this window.
pause >nul
