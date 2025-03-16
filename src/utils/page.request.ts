import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class PageRequest {
  @IsOptional()
  @IsNumberString()
  @ApiProperty({
    description: '현재 페이지',
    minimum: 1,
    default: 1,
    type: Number,
  })
  private pageNo: number = 1;

  @IsOptional()
  @IsNumberString()
  @ApiProperty({
    description: '조회 데이터 수',
    minimum: 10,
    default: 10,
    type: Number,
  })
  private pageSize: number = 10;

  getPageNo(): number {
    return this.pageNo;
  }

  getOffset(): number {
    return (Math.max(1, this.pageNo) - 1) * Math.max(10, this.pageSize);
  }

  getLimit(): number {
    return Math.max(10, this.pageSize);
  }
}
