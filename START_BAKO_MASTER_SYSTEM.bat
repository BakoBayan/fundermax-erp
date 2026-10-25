@echo off
title Bako's Master System
cd /d "%~dp0"
if exist "tools\node\node.exe" (
    tools\node\node.exe launch.js
) else (
    node launch.js
)
