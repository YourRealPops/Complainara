import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Filters for GET /users (ORG_ADMIN). Lets the admin UI populate
 * assignment dropdowns: e.g. ?role=RESOLVER or ?unitId=<uuid>.
 */
export class FindUsersDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsUUID()
  @IsOptional()
  unitId?: string;
}
