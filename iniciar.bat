@echo off
chcp 65001 >nul
title Painel (servidor local)
cd /d "%~dp0"
echo Abrindo o painel em http://localhost:8765/ ...
start "" http://localhost:8765/
python tools\dev_server.py 8765
pause
