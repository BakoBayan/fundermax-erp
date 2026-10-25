@echo off
title Bako's Master System (Dev Mode)
cd /d "%~dp0"
if exist "tools\node\node.exe" (
    tools\node\node.exe launch.js --dev
) else (
    node launch.js --dev
)
