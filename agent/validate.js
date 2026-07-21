#!/usr/bin/env node
/**
 * data/tasks.json 与 data/audit-log.json 的 schema 校验入口。
 *
 * 用法：
 *   node agent/validate.js            校验两个文件，全部通过 exit 0，否则 exit 1
 *   HUB_DATA_DIR=/path node agent/validate.js   校验指定数据目录（测试用）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { validateTasksFile, validateAuditFile } = require('./schema');

const DATA_DIR = process.env.HUB_DATA_DIR || path.join(__dirname, '..', 'data');

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return { __error: `${path.basename(file)}: 读取或解析失败 — ${err.message}` };
  }
}

function main() {
  let failed = false;

  const tasks = loadJson(path.join(DATA_DIR, 'tasks.json'));
  if (tasks.__error) {
    console.error(`FAIL: ${tasks.__error}`);
    failed = true;
  } else {
    const errors = validateTasksFile(tasks);
    if (errors.length) {
      errors.forEach((e) => console.error(`FAIL: ${e}`));
      failed = true;
    } else {
      console.log(`OK: tasks.json（${tasks.tasks.length} 项任务）`);
    }
  }

  const audit = loadJson(path.join(DATA_DIR, 'audit-log.json'));
  if (audit.__error) {
    console.error(`FAIL: ${audit.__error}`);
    failed = true;
  } else {
    const errors = validateAuditFile(audit);
    if (errors.length) {
      errors.forEach((e) => console.error(`FAIL: ${e}`));
      failed = true;
    } else {
      console.log(`OK: audit-log.json（${audit.entries.length} 条日志）`);
    }
  }

  console.log('VALIDATE:', failed ? 'FAIL' : 'PASS');
  process.exit(failed ? 1 : 0);
}

main();
