import { IsOptional, IsString, IsUrl, Length, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'username may only contain lowercase letters, numbers and underscores',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  // require_tld: false — same reasoning as CampaignMediaDto.url: local dev
  // uploads are served from http://localhost:<port>, which has no TLD.
  @IsUrl({ require_protocol: true, require_tld: false })
  avatarUrl?: string;
}
