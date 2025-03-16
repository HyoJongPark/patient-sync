import { ApiProperty } from '@nestjs/swagger';

export class PatientUploadResponse {
  @ApiProperty({
    description: '성공 데이터 수',
    example: '10',
  })
  success: number;

  @ApiProperty({
    description: '실패 데이터 수',
    example: '10',
  })
  failed: number;

  @ApiProperty({
    description: '총 입력 데이터 수',
    example: '10',
  })
  total: number;

  @ApiProperty({
    description: '성공 메시지',
  })
  message: string;

  constructor(successCount: number) {
    this.success = successCount;
  }

  setFailedAndTotal(count: number) {
    this.failed = count - this.success;
    this.total = count;
    this.message = `총 ${this.total}개의 데이터 중 검증 과정에서 ${this.failed}개의 데이터가 실패, ${this.success} 데이터 적재에 성공했습니다.`;
  }
}
