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

  @Column({ length: 20, nullable: true })
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
}
