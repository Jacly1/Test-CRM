import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class ChangeLeadStatusDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @IsString()
  @IsNotEmpty({ message: 'Catatan wajib diisi saat mengubah status.' })
  note: string;
}
