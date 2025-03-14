import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('patients')
@Unique(['name', 'phone', 'chart_number'])
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, default: 'empty' })
  chart_number?: string;

  @Column({ length: 16 })
  name: string;

  @Column({ length: 15 })
  phone: string;

  @Column({ length: 20 })
  ssn: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  memo?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  static of(
    chart_number: string | undefined,
    name: string,
    phone: string,
    ssn: string,
    address: string | undefined,
    memo: string | undefined,
  ): Patient {
    const patient = new Patient();

    patient.chart_number = chart_number;
    patient.name = name;
    patient.phone = phone.replace(/-/g, '');
    patient.ssn = Patient.maskSSN(ssn);
    patient.address = address;
    patient.memo = memo;

    return patient;
  }

  private static maskSSN(ssn: string): string {
    if (/^\d{6}-\d{7}$/.test(ssn)) {
      return `${ssn.substring(0, 8)}******`;
    }
    if (/^\d{6}$/.test(ssn)) {
      return `${ssn}-0******`;
    }
    return ssn;
  }
}
