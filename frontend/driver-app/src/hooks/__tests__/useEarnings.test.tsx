import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import api from '../../utils/api';
import { EarningsDashboard } from '../../components/EarningsDashboard';

jest.mock('../../utils/api');
jest.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: null,
    insights: null,
  }),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const driver = {
  id: 'driver-123',
  name: 'Test Driver',
  email: 'driver@test.com',
};

describe('driver earnings contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('driver_token', 'test-token');
    localStorage.setItem('driver_user', JSON.stringify(driver));
    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/drivers/driver-123/earnings?period=day') {
        return {
          data: { today: 100, week: 500, month: 2000, total: 5000 },
        };
      }
      if (url === '/drivers/driver-123/earnings/history?limit=20') {
        return { data: [] };
      }
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  it('loads and displays the current driver earnings', async () => {
    renderWithProviders(<EarningsDashboard />);

    expect(await screen.findByText('100.00 €')).toBeInTheDocument();
    expect(screen.getByText('5000.00 €')).toBeInTheDocument();
    expect(screen.getByText('Keine Verdienste gefunden')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/drivers/driver-123/earnings?period=day');
      expect(mockedApi.get).toHaveBeenCalledWith('/drivers/driver-123/earnings/history?limit=20');
    });
  });
});
