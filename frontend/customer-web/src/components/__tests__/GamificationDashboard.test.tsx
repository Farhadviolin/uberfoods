import { waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { Gamification } from '../Gamification';
import api from '../../utils/api';

jest.mock('../../utils/api');

const mockApi = jest.mocked(api);

describe('Gamification Component', () => {
  beforeEach(() => {
    mockApi.get.mockResolvedValue({ data: [] });
  });

  it('renders without crashing', async () => {
    render(<Gamification />);
    expect(document.body).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/gamification/achievements');
      expect(mockApi.get).toHaveBeenCalledWith('/gamification/leaderboard?type=level&limit=100');
    });
  });
});
