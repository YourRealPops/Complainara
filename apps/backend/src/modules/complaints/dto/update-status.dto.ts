import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ComplaintStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(ComplaintStatus)
  status!: ComplaintStatus;

  @IsString()
  @IsOptional()
  note?: string;
}
