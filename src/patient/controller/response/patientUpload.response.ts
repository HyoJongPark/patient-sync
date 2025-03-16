import { ApiProperty } from '@nestjs/swagger';

export class PatientUploadResponse {
  @ApiProperty({
    description: '성공 데이터 수',
    example: '10',
  })
  successCount: number;

  @ApiProperty({
    description: '성공 메시지',
    example: '총 {successCount}개의 데이터 적재에 성공했습니다.',
  })
  message: string;

  constructor(successCount: number) {
    this.successCount = successCount;
    this.message = `총 ${successCount}개의 데이터 적재에 성공했습니다.`;
  }
}
