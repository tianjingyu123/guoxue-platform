@echo off
chcp 65001 >nul
title 停止热卜后端服务

echo 正在停止热卜后端服务（端口 3000）...

:: 1. 按端口 3000 精确结束服务进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
  echo 结束服务进程 PID: %%a
  taskkill /F /PID %%a 2>nul
)

:: 2. 关闭启动脚本留下的命令行窗口
echo 关闭启动窗口...
taskkill /F /FI "WINDOWTITLE eq Guoxue API" 2>nul

echo.
echo 已停止。窗口 3 秒后关闭。
timeout /t 3 /nobreak >nul
