import { IsEmail, IsOptional, IsString, Validate } from 'class-validator';

/**
 * Validates that the value is either a valid email domain (e.g. "university.edu.ng")
 * or an empty string (to clear the restriction).
 */
class EmailDomainValidator {
  validate(value: string): boolean {
    if (value === '') return true; // empty clears the restriction
    // Basic domain format: at least one dot, no spaces, no @
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(value);
  }

  defaultMessage(): string {
    return 'Must be a valid domain (e.g. "university.edu.ng") or empty to clear';
  }
}

export class UpdateEmailDomainDto {
  @IsString()
  @IsOptional()
  @Validate(EmailDomainValidator)
  allowedEmailDomain?: string;
}
