@echo off
echo =========================================
echo  ⚽ 自动截图循环 - 每2分钟一次
echo  📁 保存到 D:\FootballScreenshots\
echo  ⏰ 按 Ctrl+C 停止
echo =========================================

:loop
echo [%time%] 截图中...
agent-browser screenshot --path "D:\FootballScreenshots\screenshot_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.png"
if errorlevel 1 (
    echo [%time%] 截图失败，继续...
) else (
    echo [%time%] ✅ 已保存
)
echo [%time%] 等待2分钟...
timeout /t 120 /nobreak >nul
goto loop
