export class PatientExcelResponse {
  successCount: number;
  message: string;

  constructor(successCount: number) {
    this.successCount = successCount;
    this.message = `총 ${successCount}개의 데이터 적재에 성공했습니다.`;
  }
}
