import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PatientService } from '../service/patient.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fieldMap } from '../utils/patient.constants';
import { ExcelFileParser } from '../utils/excel.parser';
import { PatientUploadRequest } from './request/patientUpload.request';
import { PatientUploadResponse } from './response/patientUpload.response';
import { PageRequest } from 'src/utils/page.request';

@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getPatients(@Query() param: PageRequest) {
    return await this.patientService.getPatients(param);
  }

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
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PatientUploadResponse> {
    if (!file) {
      throw new BadRequestException('데이터 파일이 존재하지 않습니다.');
    }
    const dto = await new ExcelFileParser<PatientUploadRequest>(
      fieldMap,
      PatientUploadRequest,
    ).parse(file.buffer);

    return await this.patientService.upload(dto);
  }
}
