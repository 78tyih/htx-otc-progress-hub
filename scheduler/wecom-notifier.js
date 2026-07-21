/**
 * 企业微信 webhook 通知层（零依赖，Node 内置 http/https）。
 *
 * 安全约定：
 *   - webhook URL 只从环境变量 WECOM_WEBHOOK_URL 或本地 .env 读取，
 *     永不写入代码与 git（.env 已 gitignore）；
 *   - 本层只负责「组装 payload + 发送」，是否发送由调用方决定；
 *   - reminder:test 路径只调用 buildPayload 生成预览，绝不调用 postWebhook。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');

/** 读取 webhook URL：环境变量优先，其次解析项目根目录 .env（简易 KEY=VALUE 解析） */
function loadWebhookUrl(env = process.env) {
  if (env.WECOM_WEBHOOK_URL && env.WECOM_WEBHOOK_URL.trim()) return env.WECOM_WEBHOOK_URL.trim();
  try {
    const text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*WECOM_WEBHOOK_URL\s*=\s*(.+?)\s*$/);
      if (m && m[1]) return m[1].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* .env 不存在时忽略 */
  }
  return null;
}

/** 企微 markdown 消息体 */
function buildPayload(markdown) {
  return { msgtype: 'markdown', markdown: { content: markdown } };
}

/** POST 到 webhook， resolve { code, body }；企微成功返回 {"errcode":0} */
function postWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(url);
    } catch {
      reject(new Error('WECOM_WEBHOOK_URL 不是合法 URL'));
      return;
    }
    const lib = target.protocol === 'http:' ? http : https;
    const body = JSON.stringify(payload);
    const req = lib.request(
      {
        method: 'POST',
        hostname: target.hostname,
        port: target.port || (target.protocol === 'http:' ? 80 : 443),
        path: target.pathname + target.search,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 10000,
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => resolve({ code: res.statusCode, body: chunks }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('webhook 请求超时（10s）')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { loadWebhookUrl, buildPayload, postWebhook };
