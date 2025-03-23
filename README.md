# 图片下载器

一个从 HTML 文件中提取图片 URL 并下载到本地的工具。

## 功能特点

- 从 HTML 文件中提取所有图片 URL
- 自动下载图片到指定目录
- 支持命令行参数配置
- 显示下载进度

## 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/img-downloader.git
cd img-downloader

# 安装依赖
npm install

# 全局安装（可选）
npm install -g .
```

## 使用方法

### 方法 1：使用 npm 脚本

```bash
# 使用默认设置（从data.html文件下载图片到downloaded_images目录）
npm start

# 使用命令行工具
npm run img-download
```

### 方法 2：命令行工具（如果全局安装）

```bash
# 显示帮助信息
img-downloader --help

# 使用默认设置
img-downloader

# 指定HTML文件路径
img-downloader data.html

# 指定HTML文件路径和下载目录
img-downloader -f data.html -o ./images
```

### 参数说明

- `-f, --file <路径>`: 指定 HTML 文件路径（默认: `data.html`）
- `-o, --output <路径>`: 指定下载目录路径（默认: `./downloaded_images`）
- `-h, --help`: 显示帮助信息

## 技术栈

- Node.js
- cheerio - 用于 HTML 解析
- axios - 用于网络请求
- fs-extra - 用于文件操作

## 许可证

ISC
# img-downloader
