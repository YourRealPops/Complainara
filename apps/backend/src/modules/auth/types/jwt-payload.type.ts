import { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: string; // user id
  orgId: string;
  role: UserRole;
  /**
   * null = HQ (ORG_ADMIN / SUPER_ADMIN). Tokens issued before
   * multi-branch support carry no branchId at all — validators must
   * normalize a missing value to null (which is correct for the
   * ORG_ADMINs those tokens belong to).
   */
  branchId: string | null;
};

/**
 * What a decoded token may actually look like before normalization:
 * legacy tokens simply lack the branchId claim.
 */
export type RawJwtPayload = Omit<JwtPayload, 'branchId'> & {
  branchId?: string | null;
};
