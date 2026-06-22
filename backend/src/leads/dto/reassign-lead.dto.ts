import { IsString, IsNotEmpty } from 'class-validator';

export class ReassignLeadDto {
  @IsString()
  @IsNotEmpty({ message: 'Pilih Sales tujuan.' })
  ownerId: string;
}
