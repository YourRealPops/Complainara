import { Injectable, NotFoundException } from '@nestjs/common';
import { UnitsRepository } from './units.repository';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly unitsRepository: UnitsRepository) {}

  create(orgId: string, dto: CreateUnitDto) {
    return this.unitsRepository.create(orgId, dto.name);
  }

  async update(id: string, orgId: string, dto: UpdateUnitDto) {
    await this.findById(id, orgId);
    await this.unitsRepository.update(id, orgId, dto);
    return this.findById(id, orgId);
  }

  async delete(id: string, orgId: string) {
    await this.findById(id, orgId);
    await this.unitsRepository.delete(id, orgId);
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
