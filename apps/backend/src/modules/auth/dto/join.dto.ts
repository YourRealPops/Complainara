import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class JoinDto {
  @IsString()
  @IsNotEmpty()
  joinCode!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
