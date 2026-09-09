import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from '@prisma/client';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      organization: { connect: { id: dto.orgId } },
      ...(dto.unitId && { unit: { connect: { id: dto.unitId } } }),
    });

    return this.sanitize(user);
  }

  // Returns the raw user including password hash — used only by AuthService to verify credentials
  async findByEmailWithPassword(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.sanitize(user);
  }

  async updateRole(id: string, role: UserRole) {
    await this.findById(id);
    await this.usersRepository.updateRole(id, role);
    return this.findById(id);
  }

  async findAllByOrg(orgId: string) {
    const users = await this.usersRepository.findAllByOrg(orgId);
    return users.map((user) => this.sanitize(user));
  }

  // Strips the password hash before returning user data to any client
  private sanitize<T extends { password: string }>(user: T): Omit<T, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest as Omit<T, 'password'>;
  }
}
