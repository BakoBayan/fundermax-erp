@echo off
setlocal EnableDelayedExpansion
title Bako's Master System - Secure Network Server
cd /d "%~dp0"

:: ============================================================================
:: 1. AUTO-ELEVATION (ADMINISTRATOR CHECK)
:: ============================================================================
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ELEVATION] Requesting Administrator privileges to configure temporary network access...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList ('/c \"\"%~f0\"\"') -Verb RunAs -WorkingDirectory '%~dp0'"
    exit /b
)

:: ============================================================================
:: 2. PRE-CLEANUP (REMOVE ANY ORPHANED TEMP RULES)
:: ============================================================================
netsh advfirewall firewall delete rule name="MasterSystem_TempPort" >nul 2>&1

:: ============================================================================
:: 3. SECURE NETWORK OPENING (PORT 3000)
:: ============================================================================
echo [SECURITY] Opening temporary firewall access on TCP port 3000...
netsh advfirewall firewall add rule name="MasterSystem_TempPort" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1

:: ============================================================================
:: 4. NETWORK IP DETECTION & UI
:: ============================================================================
for /f "delims=" %%I in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress -First 1)" 2^>nul') do (
    set "LOCAL_IP=%%I"
)
if "!LOCAL_IP!"=="" set "LOCAL_IP=127.0.0.1"

cls
echo ========================================================================
echo        BAKO'S MASTER SYSTEM - SECURE LOCAL ^& NETWORK SERVER
echo ========================================================================
echo.
echo   [PC Access]    http://localhost:3000
echo   [Phone/Tablet] http://!LOCAL_IP!:3000
echo.
echo   Firewall Rule: MasterSystem_TempPort (Active)
echo   Network Mode:  0.0.0.0:3000 (Open on LAN)
echo.
echo   Press Ctrl+C to stop server and automatically revoke firewall access.
echo ========================================================================
echo.

:: ============================================================================
:: 5. SERVER EXECUTION
:: ============================================================================
call npm run start

:: ============================================================================
:: 6. SECURE TEARDOWN (POST-EXECUTION)
:: ============================================================================
echo.
echo ========================================================================
echo   SERVER STOPPED - REVOKING TEMPORARY FIREWALL ACCESS...
echo ========================================================================
netsh advfirewall firewall delete rule name="MasterSystem_TempPort"
echo   [SUCCESS] Firewall rule 'MasterSystem_TempPort' deleted.
echo   Port 3000 is now securely closed to the local network.
echo ========================================================================
echo.
timeout /t 5
exit /b
