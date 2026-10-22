import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtPayload } from '../../modules/auth/types/jwt-payload.type';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload;
      orgId?: string;
      branchId?: string | null;
    }>();

    if (request.user) {
      request.orgId = request.user.orgId;
      // null = HQ (ORG_ADMIN / SUPER_ADMIN); also what pre-multi-branch
      // tokens resolve to (JwtStrategy normalizes a missing claim to null).
      request.branchId = request.user.branchId ?? null;
    }

    return true;
  }
}
