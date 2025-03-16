import { BadRequestException } from '@nestjs/common';
import { Express } from 'express';

/**
 * 파일 필터 - 엑셀 파일(xlsx)만 허용
 */
export const excelFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: Function,
) => {
  if (!file.originalname.match(/\.(xlsx)$/)) {
    return callback(
      new BadRequestException('지원하지 않는 파일 형식입니다. (xlsx만 가능)'),
      false,
    );
  }
  callback(null, true);
};
