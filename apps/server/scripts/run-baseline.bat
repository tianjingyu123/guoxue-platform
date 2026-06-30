@echo off
REM 数据库基线观察·每日计划任务入口(2026-06-29)
cd /d "C:\Users\Administrator\Desktop\guoxue-platform\apps\server"
call npx tsx scripts/db-baseline-watch.ts >> "C:\Users\Administrator\Desktop\guoxue-platform\docs\progress\db-baseline-cron.log" 2>&1
