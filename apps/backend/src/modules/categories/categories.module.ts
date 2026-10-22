import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';
import { UnitsModule } from '../units/units.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService],
  imports: [UnitsModule, BranchesModule],
})
export class CategoriesModule {}
