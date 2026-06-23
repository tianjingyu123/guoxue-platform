@echo off
REM ============================================================
REM guoxue 数据库自动备份
REM 用法: backup-db.bat [backup_dir]
REM 默认备份到 ..\backups\ 目录
REM 建议: 每天凌晨通过 Windows 任务计划执行
REM ============================================================
setlocal enabledelayedexpansion

set PGPASSWORD=guoxue123
set PGCLIENTENCODING=UTF8
set MSYS2_ARG_CONV_EXCL=*
set PSQL="C:\Program Files\PostgreSQL\16\bin\psql.exe"
set PG_DUMP="C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"

if "%~1"=="" (
    set BACKUP_DIR=%~dp0..\backups
) else (
    set BACKUP_DIR=%~1
)

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set DATE_STAMP=%date:~0,4%%date:~5,2%%date:~8,2%
set TIME_STAMP=%time:~0,2%%time:~3,2%%time:~6,2%
set TIME_STAMP=%TIME_STAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\guoxue_%DATE_STAMP%_%TIME_STAMP%.dump

echo [%date% %time%] Starting backup to %BACKUP_FILE%

REM Use directory format to avoid Windows pipe buffer limits with large TOAST tables
%PG_DUMP% -h localhost -p 5433 -U guoxue -d guoxue ^
    -F d -b -v -f "%BACKUP_FILE%" ^
    --exclude-table-data="_quality_snapshot" ^
    --exclude-table-data="_prisma_migrations"

if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Backup SUCCESS: %BACKUP_FILE%
    REM 保留最近 7 天的备份，删除更早的
    forfiles /p "%BACKUP_DIR%" /m "guoxue_*" /d -7 /c "cmd /c rmdir /s /q @file" 2>nul
) else (
    echo [%date% %time%] Backup FAILED with code %ERRORLEVEL%
)

REM Directory format already contains per-table .dat.gz files for inspection

endlocal
