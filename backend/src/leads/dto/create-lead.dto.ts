import {
  IsEmail,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class CreateLeadDto {
  @IsString()
  companyName: string;

  @IsString()
  contactName: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  source: string;

  // sent as string to preserve Decimal precision
  @IsNumberString()
  estimatedValue: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
