import { IsOptional, IsString } from 'class-validator';

export class ApproveSpkDto {
  // Optional note recorded in the status history when approving.
  @IsOptional()
  @IsString()
  notes?: string;
}
