@echo off
chcp 65001 >nul
REM ================================================================
REM 热卜国学 - 开机环境清理脚本
REM 功能: 清理僵尸进程，确保 nginx 以正确配置启动
REM 用法: 开机后双击运行，或放在 Startup 文件夹自动执行
REM ================================================================

echo [clean-boot] 开始环境清理...

REM --- 1. 杀掉所有旧 nginx 进程（防止累积） ---
echo [clean-boot] 清理旧 nginx 进程...
taskkill /F /IM nginx.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM --- 2. 用正确配置启动 nginx（2 worker，不是 12） ---
echo [clean-boot] 启动 nginx (2 workers)...
cd /d "C:\nginx"
start "nginx" /min nginx.exe

REM --- 3. 启动 Guoxue API ---
echo [clean-boot] 启动 Guoxue API...
cd /d "C:\Users\Administrator\Desktop\guoxue-platform"
start "Guoxue API" /min node scripts\pm2-api.js

REM --- 4. 清理 PowerShell 临时文件（防止累积导致 ConPTY 卡死） ---
echo [clean-boot] 清理 PowerShell 临时文件...
del /q "%TEMP%\__PSScriptPolicyTest_*.ps1" >nul 2>&1

REM --- 5. 等待服务就绪 ---
timeout /t 2 /nobreak >nul

REM --- 6. 验证 ---
echo [clean-boot] 验证服务状态...
netstat -ano | findstr ":80 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (echo [clean-boot] nginx: OK) else (echo [clean-boot] nginx: FAILED)
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (echo [clean-boot] Guoxue API: OK) else (echo [clean-boot] Guoxue API: FAILED)

echo [clean-boot] 清理完成！可以启动 Claude Code 了。
