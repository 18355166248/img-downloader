import { Injectable, Logger } from '@nestjs/common';
import puppeteerDownloader from './puppeteer-downloader';
import * as path from 'path';
import { promises as fsPromises } from 'fs';

@Injectable()
export class ImageCrawlerService {
  private readonly logger = new Logger(ImageCrawlerService.name);

  /**
   * 爬取指定URL的图片并保存到本地路径
   * @param sourceUrl 图片爬取的源URL
   * @param localPath 保存图片的本地路径
   * @returns 爬取结果
   */
  async crawlImages(sourceUrl: string, localPath: string) {
    this.logger.log(
      `开始爬取图片，源地址: ${sourceUrl}, 本地保存路径: ${localPath}`,
    );

    try {
      // 确保本地路径存在
      await fsPromises.mkdir(localPath, { recursive: true });

      // 先将URL内容保存为HTML文件
      const htmlFilePath = path.join(localPath, 'data.html');

      // 获取HTML内容并保存到本地文件
      const response = await fetch(sourceUrl);
      const htmlContent = await response.text();
      await fsPromises.writeFile(htmlFilePath, htmlContent);

      // 调用puppeteer-downloader的main方法来爬取图片
      await puppeteerDownloader(htmlFilePath);

      return {
        success: true,
        message: '图片爬取完成',
        data: {
          sourceUrl,
          localPath,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`图片爬取失败: ${errorMessage}`, errorStack);
      return {
        success: false,
        message: `图片爬取失败: ${errorMessage}`,
        data: {
          sourceUrl,
          localPath,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
