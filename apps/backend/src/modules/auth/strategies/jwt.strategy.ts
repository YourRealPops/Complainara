import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, RawJwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  validate(payload: RawJwtPayload): JwtPayload {
    // Whatever we return here becomes `request.user` in every guarded route.
    // Tokens issued before multi-branch support have no branchId claim:
    // normalize a missing value to null so downstream code never sees
    // `undefined` (null is correct for the ORG_ADMINs holding old tokens).
    return { ...payload, branchId: payload.branchId ?? null };
  }
}
