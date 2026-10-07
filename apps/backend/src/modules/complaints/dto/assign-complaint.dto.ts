import { IsOptional, IsUUID } from 'class-validator';

/**
 * Body for PATCH /complaints/:id/assign (ORG_ADMIN only).
 * - resolverId: uuid → assign / reassign
 * - resolverId: null → unassign
 * An absent key is rejected by the service (must be explicit).
 */
export class AssignComplaintDto {
  // Optional at the type level (absent key passes validation) so the
  // service can reject it explicitly with a clear 400 message.
  @IsOptional()
  @IsUUID()
  resolverId?: string | null;
}
