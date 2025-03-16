import { ApiProperty } from '@nestjs/swagger';

export class PatientUploadResponse {
  @ApiProperty({
    description: '성공 데이터 수',
    example: '10',
  })
  success: number;

  @ApiProperty({
    description: 'chart_number가 empty인 데이터에 덮은 데이터 수',
    example: '10',
  })
  overlapToEmpty: number;

  @ApiProperty({
    description: '입력 데이터 중 DB에 이미 존재하는 데이터 수',
    example: '10',
  })
  duplicated: number;

  @ApiProperty({
    description: '업데이트 된 데이터 수',
    example: '10',
  })
  updated: number;

  @ApiProperty({
    description: '성공 메시지',
    example: '총 {successCount}개의 데이터 적재에 성공했습니다.',
  })
  message: string;

  constructor(successCount: number) {
    this.success = successCount;
    this.message = `총 ${successCount}개의 데이터 적재에 성공했습니다.`;
  }
}
