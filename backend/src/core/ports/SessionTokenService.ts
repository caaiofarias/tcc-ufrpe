/**
 * Issues and verifies session tokens (JWT) for institutional users and holders.
 */
export interface SessionTokenService {
  issueAccessToken(payload: { sub: string; actorType: 'institution' | 'holder'; role?: string }): string;
  issueRefreshToken(payload: { sub: string; actorType: 'institution' | 'holder' }): string;
  verifyAccessToken(token: string): {
    sub: string;
    actorType: 'institution' | 'holder';
    role?: string;
  };
  verifyRefreshToken(token: string): { sub: string; actorType: 'institution' | 'holder' };
}
