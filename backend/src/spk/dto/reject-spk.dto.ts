import { IsString, MinLength } from 'class-validator';

export class RejectSpkDto {
  @IsString()
  @MinLength(1, { message: 'Catatan wajib diisi saat menolak SPK.' })
  notes: string;
}
