// 自动截图守护程序 - 每2分钟截图并保存到D盘
// 使用方法: node screenshot_daemon.js
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SCREENSHOT_DIR = 'D:\\FootballScreenshots';
const TEMP_DIR = 'C:\\Users\\Lenovo\\.agent-browser\\tmp\\screenshots';
const INTERVAL_MS = 120000; // 2分钟
const END_TIME = '10:30';
const LIVE_URL = 'https://tv.cctv.com/live/cctv5/?spm=C28340.PNR96hKp8fYJ.ExidtyEJcS5K.5';

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function run(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    } catch (e) {
        return e.stdout || '';
    }
}

function getLatestTempScreenshot() {
    if (!fs.existsSync(TEMP_DIR)) return null;
    const files = fs.readdirSync(TEMP_DIR)
        .filter(f => f.endsWith('.png'))
        .map(f => ({ name: f, time: fs.statSync(path.join(TEMP_DIR, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);
    return files.length > 0 ? path.join(TEMP_DIR, files[0].name) : null;
}

function pushAnalysis(data) {
    return new Promise((resolve) => {
        const body = JSON.stringify({ data });
        const req = http.request({
            hostname: '127.0.0.1', port: 5500,
            path: '/api/analysis/push',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let resp = '';
            res.on('data', d => resp += d);
            res.on('end', () => resolve(resp));
        });
        req.on('error', () => resolve(null));
        req.write(body);
        req.end();
    });
}

function isTimeUp() {
    const now = new Date();
    const end = new Date();
    const [h, m] = END_TIME.split(':');
    end.setHours(parseInt(h), parseInt(m), 0);
    return now >= end;
}

async function main() {
    console.log('==============================');
    console.log('  ?? 自动截图守护程序');
    console.log(`  ?? 保存到: ${SCREENSHOT_DIR}`);
    console.log(`  ?? 间隔: ${INTERVAL_MS/1000}秒`);
    console.log(`  ?? 结束: ${END_TIME}`);
    console.log('==============================');

    // 打开浏览器
    console.log('正在打开直播页面...');
    run(`agent-browser open "${LIVE_URL}"`);
    await new Promise(r => setTimeout(r, 8000));

    let count = 0;
    while (!isTimeUp()) {
        count++;
        const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
        console.log(`\n[${ts}] 第${count}次截图...`);

        // 截图
        run('agent-browser screenshot');

        // 复制到D盘
        const latest = getLatestTempScreenshot();
        if (latest) {
            const dest = path.join(SCREENSHOT_DIR, `screenshot_${ts}.png`);
            fs.copyFileSync(latest, dest);
            console.log(`  ✅ 已保存: ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)}KB)`);

        // 等2分钟
        if (!isTimeUp()) {
            console.log('  等待120秒...');
            await new Promise(r => setTimeout(r, INTERVAL_MS));
        }
    }

    // 关闭浏览器
    run('agent-browser close');
    console.log('\n?? 比赛结束，共截图' + count + '张');
}

main().catch(e => console.error('错误:', e.message));
