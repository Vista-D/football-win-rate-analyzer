# 自动截图脚本 - 每2分钟截图一次
$url = "https://tv.cctv.com/live/cctv5/?spm=C28340.PNR96hKp8fYJ.ExidtyEJcS5K.5"
$outputDir = "D:\FootballScreenshots"
$endTime = (Get-Date "10:30")
$cleanTime = (Get-Date "10:40")

# 确保输出目录存在
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force }

Write-Output "=========================================="
Write-Output "  ⚽ 全自动截图脚本已启动"
Write-Output "  📡 直播源: $url"
Write-Output "  📁 保存到: $outputDir"
Write-Output "  ⏰ 结束时间: $endTime"
Write-Output "  🧹 清理时间: $cleanTime"
Write-Output "=========================================="

# 打开浏览器
agent-browser open $url
Start-Sleep 5

$count = 0
while ((Get-Date) -lt $endTime) {
    $count++
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $filename = "$outputDir\screenshot_$timestamp.png"
    
    Write-Output "[$timestamp] 第 $count 次截图..."
    agent-browser screenshot --path $filename
    
    if ($LASTEXITCODE -eq 0) {
        Write-Output "  ✅ 已保存: $filename"
    } else {
        Write-Output "  ❌ 截图失败"
    }
    
    # 等待2分钟（但不超过结束时间）
    $nextTime = (Get-Date).AddMinutes(2)
    if ($nextTime -gt $endTime) {
        $waitSeconds = (($endTime - (Get-Date)).TotalSeconds)
        if ($waitSeconds -gt 0) {
            Write-Output "  等待 ${waitSeconds}秒后结束..."
            Start-Sleep $waitSeconds
        }
    } else {
        Write-Output "  等待2分钟到下次截图..."
        Start-Sleep 120
    }
}

# 关闭浏览器
agent-browser close

# 等待10分钟到清理时间
Write-Output "比赛结束，等待10分钟清理..."
$waitClean = ($cleanTime - (Get-Date)).TotalSeconds
if ($waitClean -gt 0) { Start-Sleep $waitClean }

# 删除文件夹
if (Test-Path $outputDir) {
    Remove-Item -Path $outputDir -Recurse -Force
    Write-Output "✅ 已清理: $outputDir"
}
Write-Output "✅ 任务完成"
