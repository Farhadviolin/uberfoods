import { parseAdminAuthEnvelope } from '../authSession';

const authPayload = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: {
    id: 'admin-1',
    email: 'admin@uberfoods.com',
    name: 'Admin',
    role: 'ADMIN',
    userType: 'admin',
  },
};

describe('parseAdminAuthEnvelope', () => {
  it.each([
    ['standard API envelope', { success: true, data: authPayload }],
    ['direct E2E auth payload', authPayload],
  ])('accepts the %s', (_label, response) => {
    expect(parseAdminAuthEnvelope(response)).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'admin-1',
        email: 'admin@uberfoods.com',
        name: 'Admin',
        role: 'ADMIN',
      },
    });
  });

  it('rejects a direct payload without an admin identity', () => {
    expect(() => parseAdminAuthEnvelope({
      ...authPayload,
      user: { ...authPayload.user, role: 'DRIVER', userType: 'driver' },
    })).toThrow('Ungültige Admin-Identität');
  });
});
