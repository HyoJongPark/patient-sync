import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
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
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  getSchemaPath,
} from '@nestjs/swagger';
import { PageResponse } from 'src/utils/page.response';
import { PatientSearchResponse } from './response/patientSearch.response';
import { excelFileFilter } from 'src/utils/excel.filter';

@Controller('patient')
@ApiExtraModels(PageResponse, PatientSearchResponse)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: '환자 데이터 조회(페이징)' })
  @ApiOkResponse({
    description: '환자 데이터 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PageResponse) },
        {
          properties: {
            items: { items: { $ref: getSchemaPath(PatientSearchResponse) } },
          },
        },
      ],
    },
  })
  async getPatients(@Query() param: PageRequest) {
    return await this.patientService.getPatients(param);
  }

  @HttpCode(201)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: excelFileFilter,
    }),
  )
  @ApiOperation({ summary: '환자 데이터 생성(using excel)' })
  @ApiCreatedResponse({
    description: '환자 데이터 적재 성공',
    type: PatientUploadResponse,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async upload(@UploadedFile() file: Express.Multer.File) {
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
