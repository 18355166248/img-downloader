#!/usr/bin/env node

const main = require("../src/puppeteer-downloader.js");

// 获取命令行参数
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("请提供HTML文件路径");
  console.error("使用方法: img-downloader <html文件路径>");
  process.exit(1);
}

// 执行主程序
main(args[0]);
