import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  /**
   * Target branch. ORG_ADMIN may set any branch in the org or omit for an
   * HQ unit; BRANCH_ADMIN callers always get their own branch regardless.
   */
  @IsString()
  @IsOptional()
  branchId?: string;
}
