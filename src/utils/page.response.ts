import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { PatientSearchResponse } from '../patient/controller/response/patientSearch.response';

export class PageResponse<T> {
  @ApiProperty({
    description: '요청 데이터 수',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: '조회 페이지 번호',
    example: 10,
  })
  currentPage: number;

  @ApiProperty({
    description: '조회 데이터 수(limit 이하의 number)',
    minimum: 9,
  })
  totalCount: number;

  @ApiProperty({
    description: '데이터 배열',
    isArray: true,
    items: {
      oneOf: [{ $ref: getSchemaPath(PatientSearchResponse) }],
    },
  })
  items: T[];

  constructor(limit: number, pageNo: number, items: T[]) {
    this.limit = limit;
    this.currentPage = pageNo;
    this.totalCount = items.length;
    this.items = items;
  }
}
