import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  orgId!: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  unitId?: string;

  /**
   * Target branch. Required for BRANCH_ADMIN / RESOLVER / COMPLAINANT;
   * ignored (null) for HQ roles (ORG_ADMIN / SUPER_ADMIN).
   * BRANCH_ADMIN callers cannot set this to a branch other than their own.
   */
  @IsString()
  @IsOptional()
  branchId?: string;
}
