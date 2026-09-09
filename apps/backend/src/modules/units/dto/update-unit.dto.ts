import { PartialType } from '@nestjs/mapped-types';
import { CreateUnitDto } from './create-unit.dto';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class UpdateUnitDto extends PartialType(CreateUnitDto) {}
