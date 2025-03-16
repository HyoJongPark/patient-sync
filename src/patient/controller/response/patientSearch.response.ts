import { ApiProperty } from '@nestjs/swagger';
import { Patient } from 'src/patient/domain/patient.entity';

export class PatientSearchResponse {
  @ApiProperty({
    description: '환자 이름',
    example: '홍길동',
  })
  name: string;

  @ApiProperty({
    description: '연락처',
    example: '01000000000',
  })
  phone: string;

  @ApiProperty({
    description: '주민등록번호',
    example: '980000-0******',
  })
  ssn: string;

  @ApiProperty({
    description: '차트 번호',
    example: '000000',
    nullable: true,
  })
  chart_number?: string;

  @ApiProperty({
    description: '주소',
    example: '서울시 서초구',
    nullable: true,
  })
  address?: string;

  @ApiProperty({
    description: '메모',
    example: '특이사항',
    nullable: true,
  })
  memo?: string;

  constructor(patient: Patient) {
    this.name = patient.name;
    this.phone = patient.phone;
    this.ssn = patient.ssn;
    this.chart_number = patient.chart_number;
    this.address = patient.address;
    this.memo = patient.memo;
  }
}
