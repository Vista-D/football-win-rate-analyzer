const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5500;
const API_BASE = 'https://api.football-data.org/v4';

// 最新分析数据存储（实时推送用）
let latestAnalysis = null;
let analysisId = 0;

// MIME 类型
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

function proxyAPI(res, apiPath, apiKey) {
    const url = `${API_BASE}${apiPath}`;
    console.log(`[代理] ${url}`);
    https.get(url, {
        headers: { 'X-Auth-Token': apiKey, 'Accept': 'application/json' }
    }, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
            res.writeHead(apiRes.statusCode, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            });
            res.end(data);
        });
    }).on('error', (e) => {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ message: `代理失败: ${e.message}` }));
    });
}

// 收集 POST 请求体
function collectBody(req, cb) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try { cb(JSON.parse(body)); }
        catch { cb(null); }
    });
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Auth-Token, Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsed = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsed.pathname;

    // ===== 实时分析推送接口（AI调用） =====
    if (pathname === '/api/analysis/push' && req.method === 'POST') {
        collectBody(req, (body) => {
            if (!body || !body.data) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '需要 data 字段' }));
                return;
            }
            analysisId++;
            latestAnalysis = {
                id: analysisId,
                timestamp: new Date().toISOString(),
                data: body.data
            };
            console.log(`[分析推送 #${analysisId}] ${JSON.stringify(body.data)}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', id: analysisId }));
        });
        return;
    }

    // ===== 获取最新分析（网页轮询用） =====
    if (pathname === '/api/analysis/latest') {
        const lastId = parseInt(parsed.searchParams.get('since') || '0');
        if (lastId > 0 && latestAnalysis && latestAnalysis.id <= lastId) {
            // 没有新数据
            res.writeHead(204);
            res.end();
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify(latestAnalysis || { id: 0, data: null }));
        return;
    }

    // API 代理
    if (pathname === '/api/proxy') {
        const apiPath = parsed.searchParams.get('path');
        const apiKey = parsed.searchParams.get('key');
        if (!apiPath || !apiKey) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: '缺少参数' }));
            return;
        }
        proxyAPI(res, apiPath, apiKey);
        return;
    }

    if (pathname === '/api/verify') {
        const apiKey = parsed.searchParams.get('key');
        if (!apiKey) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: '缺少 key' }));
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
    console.log(`  ⚽ 足球胜率分析工具`);
    console.log(`  🌐 http://127.0.0.1:${PORT}`);
    console.log(`  🔄 实时分析推送已启用`);
    console.log(`========================================`);
});
