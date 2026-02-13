import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { Profile } from '../Profile';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('Profile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays user profile information', async () => {
    const mockProfile = {
      id: 'user_1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+43 664 1234567',
      totalOrders: 47,
      favoriteRestaurants: 5,
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockProfile,
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('updates profile information', async () => {
    const user = userEvent.setup();

    const mockProfile = {
      id: 'user_1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockProfile,
    });

    (api.default.put as jest.Mock).mockResolvedValue({
      data: { ...mockProfile, name: 'John Updated' },
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /Edit|Bearbeiten/i });
    await user.click(editButton);

    const nameInput = screen.getByLabelText(/Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'John Updated');

    const saveButton = screen.getByRole('button', { name: /Save|Speichern/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(api.default.put).toHaveBeenCalled();
    });
  });

  it('displays user statistics', async () => {
    const mockStats = {
      totalOrders: 47,
      totalSpent: 1234.50,
      favoriteRestaurant: 'Pizza Paradise',
      level: 12,
      xp: 2450,
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockStats,
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText(/47.*orders/i)).toBeInTheDocument();
      expect(screen.getByText(/1234\.50/)).toBeInTheDocument();
    });
  });
});







