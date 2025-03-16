import { IsInt, IsOptional } from 'class-validator';

export class PageRequest {
  @IsOptional()
  @IsInt()
  private pageNo: number = 1;

  @IsOptional()
  @IsInt()
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
