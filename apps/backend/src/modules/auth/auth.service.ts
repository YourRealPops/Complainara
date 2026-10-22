import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { BranchesService } from '../branches/branches.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JoinDto } from './dto/join.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly branchesService: BranchesService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // branchId comes from the user record: null = HQ (ORG_ADMIN / SUPER_ADMIN)
    return this.issueToken(
      user.id,
      user.orgId,
      user.role,
      user.branchId ?? null,
    );
  }

  async signup(dto: SignupDto) {
    // A brand new org has no users yet, so this is the one place
    // we're allowed to create an ORG_ADMIN without an existing token.
    const organization = await this.organizationsService.create({
      name: dto.organizationName,
      type: dto.organizationType,
    });

    const user = await this.usersService.create({
      name: dto.adminName,
      email: dto.adminEmail,
      password: dto.adminPassword,
      orgId: organization.id,
      role: UserRole.ORG_ADMIN,
    });

    // ORG_ADMINs are HQ users — they have no branch.
    return this.issueToken(user.id, organization.id, UserRole.ORG_ADMIN, null);
  }

  async join(dto: JoinDto) {
    // The join code now identifies a BRANCH (org + branch in one lookup).
    // Old shared links keep working: every org's Main branch carries the
    // org's original join code.
    const branch = await this.branchesService.findByJoinCode(dto.joinCode);
    if (!branch) {
      throw new NotFoundException('Invalid join code');
    }
    const organization = branch.organization;

    // Check email domain restriction (org-level policy)
    if (organization.allowedEmailDomain) {
      const emailDomain = dto.email.split('@')[1]?.toLowerCase();
      if (emailDomain !== organization.allowedEmailDomain.toLowerCase()) {
        throw new BadRequestException(
          `Only emails from @${organization.allowedEmailDomain} can join this organization`,
        );
      }
    }

    // Reuse UsersService.create — handles bcrypt hashing and duplicate-email
    // conflict. The user is tagged with the branch the code belongs to.
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      orgId: organization.id,
      role: UserRole.COMPLAINANT,
      branchId: branch.id,
    });

    return this.issueToken(
      user.id,
      organization.id,
      UserRole.COMPLAINANT,
      branch.id,
    );
  }

  private issueToken(
    userId: string,
    orgId: string,
    role: UserRole,
    branchId: string | null,
  ) {
    const payload: JwtPayload = { sub: userId, orgId, role, branchId };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
