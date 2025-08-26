// src/utils/twoFactorAuth.ts
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

export async function enableTwoFactorAuth(email: string) {
  const secret = speakeasy.generateSecret({ name: `Statement AI: (${email})` });
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url as any);

  return { secret: secret.base32, qrCodeUrl };
}

export function verifyTwoFactorToken(secret: string, token: string) {
  return speakeasy.totp.verify({ secret, encoding: 'base32', token });
}
