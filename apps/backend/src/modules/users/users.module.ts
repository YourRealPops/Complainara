import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UnitsModule } from '../units/units.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [UnitsModule, BranchesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
