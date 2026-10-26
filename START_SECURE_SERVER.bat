@echo off
:: 1. Check for Admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    goto :UACPrompt
)

:UACPrompt
    :: Create a VBScript to elevate privileges safely using the short path (%~s0) to avoid apostrophe crashes
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0""", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:admin
    :: 2. Ensure working directory is correct (crucial after UAC elevation)
    cd /d "%~dp0"
    
    echo [1/3] Securing network rules...
    netsh advfirewall firewall delete rule name="MasterSystem_TempPort" >nul 2>&1
    netsh advfirewall firewall add rule name="MasterSystem_TempPort" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
    
    echo [2/3] Starting Server... (Check the terminal below for your Mobile IP address)
    echo ====================================================================
    start http://localhost:3000
    call npm run start
    
    echo ====================================================================
    echo [3/3] Shutting down and locking network port...
    netsh advfirewall firewall delete rule name="MasterSystem_TempPort" >nul 2>&1
    echo Server closed securely. 
    pause
