import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { Patient } from './patient.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientRepository } from './patient.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  providers: [PatientService, PatientRepository],
  controllers: [PatientController],
})
export class PatientModule {}
