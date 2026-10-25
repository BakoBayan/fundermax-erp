@echo off
title Export SQLite to SQL File - Bako's Master System
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"
set "PATH=%PROJECT_DIR%tools\node;C:\Program Files\nodejs;%PATH%"

echo ========================================================
echo   EXPORTING DATABASE TO PLAIN-TEXT SQL FILE...
echo ========================================================
echo.

node export_sql.js

echo.
echo ========================================================
echo   EXPORT COMPLETE!
echo   Location: %PROJECT_DIR%data\warehouse_dump.sql
echo ========================================================
echo.
pause
