@echo off
title Antigravity Theme Studio - Build Executable (.exe)
cd /d "%~dp0."
echo ========================================================
echo   Antigravity Theme Studio - Dong goi App thanh File .exe
echo ========================================================
echo.
echo Dang kiem tra dependencies...
call npm install
echo.
echo Dang tien hanh dong goi file chay Portable .exe va Setup...
call npx electron-builder --win portable
echo.
echo ========================================================
echo   Hoan tat! File .exe da duoc tao trong thu muc:
echo   %~dp0dist\
echo ========================================================
pause
