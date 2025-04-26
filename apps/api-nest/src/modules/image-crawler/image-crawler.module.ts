import { Module } from '@nestjs/common';
import { ImageCrawlerController } from './image-crawler.controller';
import { ImageCrawlerService } from './image-crawler.service';

@Module({
  controllers: [ImageCrawlerController],
  providers: [ImageCrawlerService],
  exports: [ImageCrawlerService],
})
export class ImageCrawlerModule {}
