import { isDriver, parseDriverAuthEnvelope } from '../authSession';

const driver = {
  id: 'driver-123',
  email: 'driver@test.com',
  name: 'Test Driver',
  phone: '+4312345678',
  isActive: true,
  role: 'DRIVER' as const,
};

const payload = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: driver,
};

describe('driver auth session contract', () => {
  it.each([
    ['standard API envelope', { success: true, data: payload }],
    ['direct backend payload', payload],
  ])('accepts a valid driver from the %s', (_label, response) => {
    expect(parseDriverAuthEnvelope(response)).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      driver,
      mustChangePassword: false,
    });
  });

  it.each([
    ['missing token', { user: driver }],
    ['empty token', { ...payload, access_token: ' ' }],
    ['incomplete profile', { ...payload, user: { id: driver.id, role: driver.role } }],
    ['non-driver role', { ...payload, user: { ...driver, role: 'ADMIN' } }],
    ['invalid envelope', null],
  ])('rejects %s', (_label, response) => {
    expect(() => parseDriverAuthEnvelope(response)).toThrow();
  });

  it('normalizes the backend driver profile when role is only carried by the JWT', () => {
    const { role: _role, ...backendDriver } = driver;

    expect(parseDriverAuthEnvelope({
      access_token: 'access-token',
      user: backendDriver,
    }).driver).toEqual({ ...backendDriver, role: 'driver' });
  });

  it('rejects incomplete persisted driver data', () => {
    expect(isDriver({ id: driver.id, email: driver.email, name: driver.name })).toBe(false);
  });
});
