import { IsDateString, IsNumberString, IsOptional, IsString } from 'class-validator';

export class UpdateSpkDto {
  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsNumberString()
  contractValue?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
