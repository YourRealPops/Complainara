import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../modules/auth/types/jwt-payload.type';

/**
 * The caller's branch from the verified JWT — never from client input.
 *
 * Mirrors @CurrentOrg: TenantGuard stamps `branchId` on the request from
 * the verified JWT, and this decorator reads it. Returns `string | null`:
 * null means HQ (ORG_ADMIN / SUPER_ADMIN) and is also what pre-multi-branch
 * tokens resolve to.
 */
export const CurrentBranch = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: JwtPayload; branchId?: string | null }>();
    // TenantGuard stamps this; fall back to the token for robustness.
    // Legacy tokens without a branchId claim normalize to null here, so
    // downstream code never sees `undefined`.
    return request.branchId ?? request.user?.branchId ?? null;
  },
);
