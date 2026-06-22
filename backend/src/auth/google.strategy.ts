import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

/**
 * Google OAuth 2.0 strategy.
 *
 * Uses placeholder credentials when GOOGLE_* env vars are not set, so the app
 * still boots during development. To enable real Google login, create OAuth
 * credentials in Google Cloud Console and fill in the .env values.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-client-secret',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName || email || 'Google User';
    if (!email) {
      done(new Error('Akun Google tidak memiliki email.'), undefined);
      return;
    }
    done(null, { email, name });
  }
}
