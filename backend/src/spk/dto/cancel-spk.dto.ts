import { IsString, IsNotEmpty } from 'class-validator';

export class CancelSpkDto {
  @IsString()
  @IsNotEmpty({ message: 'Alasan pembatalan wajib diisi.' })
  notes: string;
}
