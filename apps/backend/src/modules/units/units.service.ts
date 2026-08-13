import { Injectable, NotFoundException } from '@nestjs/common';
import { UnitsRepository } from './units.repository';
import { CreateUnitDto } from './dto/create-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly unitsRepository: UnitsRepository) {}

  create(orgId: string, dto: CreateUnitDto) {
    return this.unitsRepository.create(orgId, dto.name);
  }

  findAllByOrg(orgId: string) {
    return this.unitsRepository.findAllByOrg(orgId);
  }

  async findById(id: string, orgId: string) {
    const unit = await this.unitsRepository.findById(id, orgId);
    if (!unit) {
      throw new NotFoundException(`Unit with id ${id} not found`);
    }
    return unit;
  }
}
