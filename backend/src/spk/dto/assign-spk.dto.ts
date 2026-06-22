import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class AssignSpkDto {
  // null / kosong = lepas ke antrian bersama
  @ValidateIf((o) => o.assignedFinanceId !== null)
  @IsOptional()
  @IsString()
  assignedFinanceId: string | null = null;
}
