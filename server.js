const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 5500;
const API_BASE = 'https://api.football-data.org/v4';

// 静态文件服务
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

function serveStaticFile(res, filePath) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
    });
}

// 代理 API 请求
function proxyAPI(res, apiPath, apiKey) {
    const url = `${API_BASE}${apiPath}`;
    console.log(`[代理] 转发请求: ${url}`);

    https.get(url, {
        headers: {
            'X-Auth-Token': apiKey,
            'Accept': 'application/json',
        }
    }, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
            console.log(`[代理] 响应状态: ${apiRes.statusCode}`);
            res.writeHead(apiRes.statusCode, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'X-Auth-Token',
            });
            res.end(data);
        });
    }).on('error', (e) => {
        console.error(`[代理] 错误: ${e.message}`);
        res.writeHead(500, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ message: `代理请求失败: ${e.message}` }));
    });
}

const server = http.createServer((req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Auth-Token, Content-Type');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // API 代理路由：/api/proxy?path=/competitions&key=xxx
    if (pathname === '/api/proxy') {
        const apiPath = url.searchParams.get('path');
        const apiKey = url.searchParams.get('key');
        if (!apiPath || !apiKey) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: '缺少 path 或 key 参数' }));
            return;
        }
        proxyAPI(res, apiPath, apiKey);
        return;
    }

    // API Key 验证路由
    if (pathname === '/api/verify') {
        const apiKey = url.searchParams.get('key');
        if (!apiKey) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: '缺少 key 参数' }));
            return;
        }
        proxyAPI(res, '/competitions', apiKey);
        return;
    }

    // 静态文件
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  ⚽ 足球胜率分析工具 - 本地服务器`);
    console.log(`  🌐 http://127.0.0.1:${PORT}`);
    console.log(`  🔄 API 代理已启用`);
    console.log(`========================================`);
});
