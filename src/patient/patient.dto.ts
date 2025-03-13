import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { Patient } from './patient.entity';

export class PatientDTO {
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

  toEntity(dto: PatientDTO): Patient {
    const patient = Object.assign(new Patient(), dto);

    patient.phone = patient.phone.replace(/-/g, '');
    patient.ssn = this.maskSSN(patient.ssn);

    return patient;
  }

  private maskSSN(ssn: string): string {
    if (/^\d{6}-\d{7}$/.test(ssn)) {
      return `${ssn.substring(0, 8)}******`;
    }
    if (/^\d{6}$/.test(ssn)) {
      return `${ssn}-0******`;
    }
    return ssn;
  }
}
