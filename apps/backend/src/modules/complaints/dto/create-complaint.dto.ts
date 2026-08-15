import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ComplaintPriority } from '@prisma/client';

export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  location!: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsEnum(ComplaintPriority)
  @IsOptional()
  priority?: ComplaintPriority;
}
