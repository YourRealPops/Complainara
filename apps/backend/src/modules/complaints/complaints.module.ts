import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { ComplaintsRepository } from './complaints.repository';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService, ComplaintsRepository],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
