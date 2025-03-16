import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { Patient } from '../../domain/patient.entity';

export class PatientUploadRequest {
  @IsOptional()
  @IsString()
  chart_number?: string;

  @IsString()
  @Length(1, 16)
  name: string;

  @IsString()
  @Matches(/^(01[016789]-?\d{4}-?\d{4})$|^(0[2-9]\d?-?\d{3,4}-?\d{4})$/, {
    message: '유효한 한국 전화번호 형식이 아닙니다.',
  })
  phone: string;

  @IsString()
  @Matches(/^\d{2}(0[1-9]|1[0-2])(0[1-9]|1\d|2\d|3[0-1])(-?[1-4]\d{6})?$/, {
    message: '유효한 주민등록번호 형식이어야 합니다.',
  })
  ssn: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  memo?: string;

  toEntity(): Patient {
    return Patient.of(
      this.chart_number,
      this.name,
      this.phone,
      this.ssn,
      this.address,
      this.memo,
    );
  }
}
