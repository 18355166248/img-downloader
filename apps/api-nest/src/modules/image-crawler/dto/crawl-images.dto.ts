import { IsNotEmpty, IsString } from 'class-validator';

export class CrawlImagesDto {
  @IsNotEmpty({ message: '源URL不能为空' })
  @IsString({ message: '源URL必须是字符串' })
  sourceUrl: string;

  @IsNotEmpty({ message: '本地保存路径不能为空' })
  @IsString({ message: '本地保存路径必须是字符串' })
  localPath: string;
}
