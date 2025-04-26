import { Body, Controller, Post } from '@nestjs/common';
import { ImageCrawlerService } from './image-crawler.service';
import { CrawlImagesDto } from './dto/crawl-images.dto';

@Controller('image-crawler')
export class ImageCrawlerController {
  constructor(private readonly imageCrawlerService: ImageCrawlerService) {}

  @Post('crawl')
  async crawlImages(@Body() crawlImagesDto: CrawlImagesDto) {
    return this.imageCrawlerService.crawlImages(
      crawlImagesDto.sourceUrl,
      crawlImagesDto.localPath,
    );
  }
}
