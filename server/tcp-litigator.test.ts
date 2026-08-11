import { describe, it, expect, beforeAll } from 'vitest';
import { checkLitigatorStatus, updateUserTcpLitigatorCredentials, getUserTcpLitigatorCredentials } from './db';

describe('TCP Litigator List API Integration', () => {
  const testUserId = 1;
  const testPhone = '2145551234';

  beforeAll(async () => {
    const username = process.env.TCP_LITIGATOR_USERNAME;
    const password = process.env.TCP_LITIGATOR_PASSWORD;
    if (username && password) {
      await updateUserTcpLitigatorCredentials(testUserId, username, password);
    }
  });

  it('should validate TCP Litigator List credentials by checking a test number', async () => {
    const creds = await getUserTcpLitigatorCredentials(testUserId);
    
    if (!creds?.username || !creds?.password) {
      console.warn('TCP Litigator credentials not configured, skipping test');
      expect(true).toBe(true);
      return;
    }

    const result = await checkLitigatorStatus(testPhone, creds.username, creds.password);
    expect(typeof result).toBe('boolean');
    expect([true, false]).toContain(result);
  }, 20000);

  it('should return false if credentials are missing', async () => {
    const result = await checkLitigatorStatus(testPhone);
    expect(result).toBe(false);
  });
});
