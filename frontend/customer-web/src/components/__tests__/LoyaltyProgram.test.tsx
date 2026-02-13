import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { LoyaltyProgram } from '../LoyaltyProgram';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('LoyaltyProgram Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays user points and tier', async () => {
    const mockLoyalty = {
      points: 1250,
      tier: 'GOLD',
      lifetimePoints: 5000,
      pointsToNextTier: 750,
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockLoyalty,
    });

    render(<LoyaltyProgram />);

    await waitFor(() => {
      expect(screen.getByText(/1250.*points/i)).toBeInTheDocument();
      expect(screen.getByText(/GOLD/i)).toBeInTheDocument();
    });
  });

  it('shows available rewards', async () => {
    const mockRewards = [
      { id: 'reward_1', name: 'Free Delivery', pointsCost: 200, canAfford: true },
      { id: 'reward_2', name: '10% Off', pointsCost: 300, canAfford: true },
      { id: 'reward_3', name: 'Free Meal', pointsCost: 2000, canAfford: false },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { rewards: mockRewards, userPoints: 1250 },
    });

    render(<LoyaltyProgram />);

    await waitFor(() => {
      expect(screen.getByText('Free Delivery')).toBeInTheDocument();
      expect(screen.getByText('10% Off')).toBeInTheDocument();
    });
  });

  it('redeems reward', async () => {
    const user = userEvent.setup();

    const mockRewards = [
      { id: 'reward_1', name: 'Free Delivery', pointsCost: 200 },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { rewards: mockRewards, userPoints: 1250 },
    });

    (api.default.post as jest.Mock).mockResolvedValue({
      data: { success: true, newBalance: 1050 },
    });

    render(<LoyaltyProgram />);

    await waitFor(() => {
      expect(screen.getByText('Free Delivery')).toBeInTheDocument();
    });

    const redeemButton = screen.getByRole('button', { name: /Redeem|Einlösen/i });
    await user.click(redeemButton);

    await waitFor(() => {
      expect(api.default.post).toHaveBeenCalled();
    });
  });
});






