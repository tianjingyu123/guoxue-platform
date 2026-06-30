@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Desktop\guoxue-platform"
start "Guoxue API" /min node scripts\pm2-api.js
