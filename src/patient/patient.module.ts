import { Module } from '@nestjs/common';
import { PatientService } from './service/patient.service';
import { PatientController } from './controller/patient.controller';
import { Patient } from './domain/patient.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientRepository } from './repository/patient.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  providers: [PatientService, PatientRepository],
  controllers: [PatientController],
})
export class PatientModule {}
