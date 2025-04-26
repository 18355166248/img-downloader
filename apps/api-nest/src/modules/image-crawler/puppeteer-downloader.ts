import fs from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

// 定义类型，以解决类型错误
type Browser = any;
type Page = any;
type CheerioAPI = any;

// 定义下载目录
const DOWNLOAD_DIR = path.join(process.cwd(), '');
// 设置最大重试次数
const MAX_RETRIES = 3;
// 重试延迟（毫秒）
const RETRY_DELAY = 2000;
// 最大图片尺寸（像素）
const MAX_IMAGE_SIZE = 2040;
// 图片质量（0-1）
const IMAGE_QUALITY = 1;
// 是否限制图片尺寸
const LIMIT_IMAGE_SIZE = true;

/**
 * 等待指定的毫秒数
 * @param {number} ms 毫秒数
 * @returns {Promise<void>}
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 从HTML文件中提取图片URL（使用cheerio而不是puppeteer）
 * @param {string} htmlFilePath HTML文件路径
 * @returns {Promise<Array<string>>} 图片URL数组
 */
async function extractImageUrls(htmlFilePath: string): Promise<string[]> {
  try {
    // 读取HTML文件内容
    const htmlContent = await fs.readFile(htmlFilePath, 'utf8');

    // 使用cheerio加载HTML内容
    const $ = cheerio.load(htmlContent) as CheerioAPI;

    // 提取所有图片的URL
    const imageUrls: string[] = [];
    const uniqueUrls = new Set<string>(); // 使用Set来存储唯一的URL

    // 查找所有img标签
    $('img').each((index, element) => {
      // 优先使用src属性，如果没有则使用data-src属性
      const url =
        $(element).attr('data-lazy-src') ||
        $(element).attr('src') ||
        $(element).attr('data-src');

      if (url) {
        // 清理URL（移除可能的换行符和空格）
        const cleanUrl = url.trim().replace(/\n/g, '');
        // 只添加有效的URL，并使用Set确保唯一性
        if (cleanUrl.startsWith('http') && !uniqueUrls.has(cleanUrl)) {
          uniqueUrls.add(cleanUrl);
          imageUrls.push(cleanUrl);
        }
      }
    });

    // 将Set转换回数组
    const finalImageUrls = Array.from(uniqueUrls);
    console.log(`共找到 ${finalImageUrls.length} 张不重复的图片`);
    return finalImageUrls;
  } catch (error) {
    console.error('提取图片URL时出错:', error);
    throw error;
  }
}

/**
 * 下载图片到本地
 * @param {string} url 图片URL
 * @param {string} filename 保存的文件名
 * @param {puppeteer.Browser} browser Puppeteer浏览器实例
 * @param {number} retryCount 当前重试次数
 * @returns {Promise<boolean>} 是否成功
 */
async function downloadImage(
  url: string,
  filename: string,
  browser: Browser,
  retryCount = 0,
): Promise<boolean> {
  try {
    // 创建完整的文件路径
    const filePath = path.join(DOWNLOAD_DIR, filename);

    // 检查文件是否已存在，如果存在则跳过
    if (await fs.pathExists(filePath)) {
      console.log(`文件已存在，跳过下载: ${filename}`);
      return true;
    }

    // 创建新页面
    const page = await browser.newPage();

    try {
      // 设置下载行为
      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: DOWNLOAD_DIR,
      });

      // 访问图片URL
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // 等待图片加载
      await page.waitForSelector('img', { timeout: 10000 });

      // 获取图片元素
      const imgElement = await page.$('img');

      if (!imgElement) {
        throw new Error('未找到图片元素');
      }

      // 获取图片的src属性
      const imgSrc = await imgElement.evaluate(
        (el: HTMLImageElement) => el.src,
      );

      // 创建新页面下载图片
      const downloadPage = await browser.newPage();
      await downloadPage.goto(imgSrc, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // 等待图片加载完成
      await downloadPage.waitForSelector('img', {
        visible: true,
        timeout: 10000,
      });

      // 等待图片完全加载
      await downloadPage.evaluate(() => {
        return new Promise<void>((resolve) => {
          const img = document.querySelector('img');
          if (img?.complete) {
            resolve();
          } else if (img) {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // 即使加载失败也继续
          } else {
            resolve(); // 如果没有找到图片元素，也继续
          }
        });
      });

      // 获取图片数据
      const imgData = await downloadPage.evaluate(
        (maxSize: number, quality: number, limitSize: boolean) => {
          const img = document.querySelector('img');
          if (!img) return null;

          // 计算新的尺寸，保持宽高比
          let width = img.naturalWidth;
          let height = img.naturalHeight;

          if (limitSize && (width > maxSize || height > maxSize)) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          // 创建canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          // 将图片绘制到canvas
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // 获取压缩后的图片数据
            return canvas.toDataURL('image/jpeg', quality);
          }
          return null;
        },
        MAX_IMAGE_SIZE,
        IMAGE_QUALITY,
        LIMIT_IMAGE_SIZE,
      );

      if (!imgData) {
        throw new Error('无法获取图片数据');
      }

      // 将base64数据转换为Buffer并保存
      const base64Data = imgData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(filePath, buffer);

      await downloadPage.close();
      return true;
    } finally {
      await page.close();
    }
  } catch (error) {
    console.log('🚀 ~ downloadImage ~ error:', error);
    if (retryCount < MAX_RETRIES) {
      console.log(
        `下载失败，正在重试 (${retryCount + 1}/${MAX_RETRIES}): ${filename}`,
      );
      // 等待一段时间后重试
      await sleep(RETRY_DELAY);
      return downloadImage(url, filename, browser, retryCount + 1);
    } else {
      console.error(`下载图片失败 ${url}: ${(error as Error).message}`);
      return false;
    }
  }
}

/**
 * 主函数
 * @param {string} htmlFilePath HTML文件路径
 */
async function main(htmlFilePath: string): Promise<void> {
  try {
    // 确保下载目录存在
    await fs.ensureDir(DOWNLOAD_DIR);

    // 提取图片URL（使用cheerio而不是puppeteer）
    const imageUrls = await extractImageUrls(htmlFilePath);

    if (imageUrls.length === 0) {
      console.log('没有找到图片URL');
      return;
    }

    console.log('开始下载图片...');

    // 启动浏览器
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
      ],
    });

    // 记录成功和失败的数量
    let successCount = 0;
    let failureCount = 0;

    try {
      // 下载所有图片
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];

        // 从URL中提取文件名
        let filename = url.split('/').pop() || `image-${i + 1}.jpg`;
        // 删除问号后面的查询参数
        filename = filename.split('?')[0];

        // 如果文件名中没有扩展名，添加.jpg扩展名
        if (!path.extname(filename)) {
          filename += '.jpg';
        }

        // 显示下载进度
        console.log(
          `正在下载第 ${i + 1}/${imageUrls.length} 张图片: ${filename}`,
        );

        // 下载图片
        const success = await downloadImage(url, filename, browser);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }

        // 每下载5张图片暂停一下，避免请求过快
        if ((i + 1) % 5 === 0 && i < imageUrls.length - 1) {
          console.log('暂停下载，避免请求过快...');
          await sleep(2000);
        }
      }
    } finally {
      // 关闭浏览器
      await browser.close();
    }

    console.log(`下载完成: 成功 ${successCount} 张，失败 ${failureCount} 张`);
    console.log(`所有图片保存在 ${DOWNLOAD_DIR} 目录中`);
  } catch (error) {
    console.error('程序执行失败:', error);
    throw error;
  }
}

// 直接运行脚本的处理
// 注意：在TypeScript中，没有直接等同于CommonJS的require.main === module的检查
// 在生产环境中，应该使用环境变量或其他方式来检测
const isMainModule = process.argv[1] === __filename;
if (isMainModule) {
  const htmlFilePath = path.join(process.cwd(), 'data.html');
  main(htmlFilePath);
}

// 导出main函数供其他文件使用
export default main;
