const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");
const axios = require("axios");

// 定义下载目录
const DOWNLOAD_DIR = path.join(process.cwd(), "downloaded_images");
// 设置最大重试次数
const MAX_RETRIES = 3;
// 重试延迟（毫秒）
const RETRY_DELAY = 2000;

/**
 * 从HTML文件中提取图片URL
 * @param {string} htmlFilePath HTML文件路径
 * @returns {Promise<Array<string>>} 图片URL数组
 */
async function extractImageUrls(htmlFilePath) {
  try {
    // 读取HTML文件内容
    const htmlContent = await fs.readFile(htmlFilePath, "utf8");

    // 使用cheerio加载HTML内容
    const $ = cheerio.load(htmlContent);

    // 提取所有图片的URL
    const imageUrls = [];

    // 查找所有图片元素
    $("img").each((index, element) => {
      // 优先使用src属性，如果没有则使用data-src属性
      const url = $(element).attr("src") || $(element).attr("data-src");
      if (url) {
        // 清理URL（移除可能的换行符和空格）
        const cleanUrl = url.trim().replace(/\n/g, "");
        // 只添加有效的URL
        if (cleanUrl.startsWith("http") && !imageUrls.includes(cleanUrl)) {
          imageUrls.push(cleanUrl);
        }
      }
    });

    console.log(`共找到 ${imageUrls.length} 张图片`);
    return imageUrls;
  } catch (error) {
    console.error("提取图片URL时出错:", error);
    throw error;
  }
}

/**
 * 等待指定的毫秒数
 * @param {number} ms 毫秒数
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 下载图片到本地，带重试机制
 * @param {string} url 图片URL
 * @param {string} filename 保存的文件名
 * @param {number} retryCount 当前重试次数
 * @returns {Promise<boolean>} 是否成功
 */
async function downloadImage(url, filename, retryCount = 0) {
  try {
    // 创建完整的文件路径
    const filePath = path.join(DOWNLOAD_DIR, filename);

    // 检查文件是否已存在，如果存在则跳过
    if (await fs.pathExists(filePath)) {
      console.log(`文件已存在，跳过下载: ${filename}`);
      return true;
    }

    // 下载图片
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: new URL(url).origin,
      },
      timeout: 30000, // 30秒超时
    });

    // 将响应流写入文件
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(true));
      writer.on("error", reject);
    });
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(
        `下载失败，正在重试 (${retryCount + 1}/${MAX_RETRIES}): ${filename}`
      );
      // 等待一段时间后重试
      await sleep(RETRY_DELAY);
      return downloadImage(url, filename, retryCount + 1);
    } else {
      console.error(`下载图片失败 ${url}: ${error.message}`);
      return false;
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const htmlFilePath = path.join(process.cwd(), "data.html");

    // 确保下载目录存在
    await fs.ensureDir(DOWNLOAD_DIR);

    // 提取图片URL
    const imageUrls = await extractImageUrls(htmlFilePath);

    if (imageUrls.length === 0) {
      console.log("没有找到图片URL");
      return;
    }

    console.log("开始下载图片...");

    // 记录成功和失败的数量
    let successCount = 0;
    let failureCount = 0;

    // 下载所有图片
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];

      // 从URL中提取文件名
      let filename = url.split("/").pop() || `image-${i + 1}.jpg`;

      // 如果文件名中没有扩展名，添加.jpg扩展名
      if (!path.extname(filename)) {
        filename += ".jpg";
      }

      // 显示下载进度
      console.log(
        `正在下载第 ${i + 1}/${imageUrls.length} 张图片: ${filename}`
      );

      // 下载图片
      const success = await downloadImage(url, filename);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }

      // 每下载5张图片暂停一下，避免请求过快
      if ((i + 1) % 5 === 0 && i < imageUrls.length - 1) {
        console.log("暂停下载，避免请求过快...");
        await sleep(1000);
      }
    }

    console.log(`下载完成: 成功 ${successCount} 张，失败 ${failureCount} 张`);
    console.log(`所有图片保存在 ${DOWNLOAD_DIR} 目录中`);
  } catch (error) {
    console.error("程序执行失败:", error);
  }
}

// 执行主函数
main();
