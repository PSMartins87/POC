export interface SecurityEvent {
  eventId: string;
  eventType: 'LOGIN_SUCCESS' | 'LOGOUT' | 'TOKEN_REFRESH' | 'REVOKE_SESSION';
  occurredAt: string;
  expiresAt?: string;
  userId?: string;
  sessionId: string;
  origin: string;
  details?: Record<string, any>
}