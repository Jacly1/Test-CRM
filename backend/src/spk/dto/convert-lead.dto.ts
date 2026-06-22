import { IsDateString, IsNumberString, IsString } from 'class-validator';

export class ConvertLeadDto {
  @IsString()
  leadId: string;

  @IsString()
  projectName: string;

  @IsNumberString()
  contractValue: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
