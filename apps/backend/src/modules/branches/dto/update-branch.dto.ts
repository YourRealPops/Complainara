import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;
}
