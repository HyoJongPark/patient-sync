import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fieldMap } from './utils/patient.constants';
import { ExcelFileParser } from './utils/excel.parser';
import { PatientExcelRequest } from './patient.request';
import { PatientExcelResponse } from './patient.response';

@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(xlsx)$/)) {
          return callback(
            new BadRequestException(
              '지원하지 않는 파일 형식입니다. (xlsx만 가능)',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async getHello(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PatientExcelResponse> {
    if (!file) {
      throw new BadRequestException('데이터 파일이 존재하지 않습니다.');
    }
    const dto = await new ExcelFileParser<PatientExcelRequest>(
      fieldMap,
      PatientExcelRequest,
    ).parse(file.buffer);

    return await this.patientService.upload(dto);
  }
}
