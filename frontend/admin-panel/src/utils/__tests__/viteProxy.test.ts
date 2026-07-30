import { resolveApiProxyTarget } from '../../viteProxy';

describe('admin panel Vite proxy', () => {
  it('routes API requests to the backend during E2E runs', () => {
    expect(resolveApiProxyTarget()).toBe('http://127.0.0.1:3000');
  });
});
