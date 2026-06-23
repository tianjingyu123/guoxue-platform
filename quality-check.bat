@echo off
REM ============================================================
REM guoxue 数据库质量监控 - 一键运行
REM 用法: quality-check.bat
REM ============================================================
set PGPASSWORD=guoxue123
set PGCLIENTENCODING=UTF8
set MSYS2_ARG_CONV_EXCL=*

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5433 -U guoxue -d guoxue -f "%~dp0scripts\data-quality-monitor.sql"
