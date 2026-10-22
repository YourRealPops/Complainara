import { IsNotEmpty, IsString } from 'class-validator';

/** Sets where complaints of a category route within a given branch. */
export class SetCategoryRouteDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  unitId!: string;
}
