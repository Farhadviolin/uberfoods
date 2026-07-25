import { act, fireEvent, render, screen } from '@testing-library/react';
import { LoyaltyProgram } from '../LoyaltyProgram';
import {
  LoyaltyPoints,
  Reward,
  useApplyReferralCode,
  useLoyaltyHistory,
  useLoyaltyPoints,
  useRedeemReward,
  useReferralCode,
  useReferralStats,
  useRewards,
} from '../../hooks/useLoyalty';
import { useToast } from '../../contexts/ToastContext';

jest.mock('../../hooks/useLoyalty');
jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));
jest.mock('../AnimatedNumber', () => ({
  AnimatedNumber: ({
    value,
    decimals = 0,
    prefix = '',
    suffix = '',
  }: {
    value: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  }) => <span>{`${prefix}${value.toFixed(decimals)}${suffix}`}</span>,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'loyalty.title': 'Loyalty Program',
        'loyalty.points': 'Points',
        'loyalty.totalSpent': 'Total Spent',
        'loyalty.orders': 'Orders',
        'loyalty.streak': 'Streak',
        'loyalty.days': 'days',
        'loyalty.gold': 'Gold',
        'loyalty.platinum': 'Platinum',
        'loyalty.nextLevel': 'Next Level: {{tier}}',
        'loyalty.pointsToNextLevel': '{{amount}}€ more until next level',
        'loyalty.availableRewards': 'Available Rewards',
        'loyalty.pointsCost': '{{points}} Points',
        'loyalty.redeem': 'Redeem',
        'loyalty.redeeming': 'Redeeming...',
        'loyalty.noRewards': 'No rewards available',
        'loyalty.pointsHistory': 'Points History',
        'loyalty.noHistory': 'No points history yet',
        'loyalty.referFriends': 'Refer Friends',
        'loyalty.referralCodeLoading': 'Loading referral code...',
        'loyalty.pleaseLogin': 'Please log in to see your loyalty program',
        'loyalty.rewardRedeemed': 'Reward redeemed! {{name}}',
        'loyalty.redeemError': 'Error redeeming',
      };
      let result = translations[key] ?? key;
      for (const [name, value] of Object.entries(options ?? {})) {
        result = result.replace(`{{${name}}}`, String(value));
      }
      return result;
    },
    i18n: { language: 'en' },
  }),
}));

const mockUseLoyaltyPoints = useLoyaltyPoints as jest.MockedFunction<typeof useLoyaltyPoints>;
const mockUseLoyaltyHistory = useLoyaltyHistory as jest.MockedFunction<typeof useLoyaltyHistory>;
const mockUseRewards = useRewards as jest.MockedFunction<typeof useRewards>;
const mockUseRedeemReward = useRedeemReward as jest.MockedFunction<typeof useRedeemReward>;
const mockUseReferralCode = useReferralCode as jest.MockedFunction<typeof useReferralCode>;
const mockUseReferralStats = useReferralStats as jest.MockedFunction<typeof useReferralStats>;
const mockUseApplyReferralCode = useApplyReferralCode as jest.MockedFunction<typeof useApplyReferralCode>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockRedeemReward = jest.fn();
const mockApplyReferralCode = jest.fn();
const mockShowToast = jest.fn();

const loyaltyPoints: LoyaltyPoints = {
  points: 1250,
  tier: 'GOLD',
  totalSpent: 5000,
  totalOrders: 47,
  streakDays: 12,
  nextTier: 'PLATINUM',
  pointsToNextTier: 750,
};

const rewards: Reward[] = [
  {
    id: 'reward_1',
    name: 'Free Delivery',
    description: 'Free delivery on the next order',
    pointsCost: 200,
    type: 'FREE_DELIVERY',
    canRedeem: true,
  },
  {
    id: 'reward_2',
    name: 'Free Meal',
    pointsCost: 2000,
    type: 'FREE_MEAL',
    canRedeem: false,
  },
];

function setPoints(data: LoyaltyPoints | null | undefined, isLoading = false) {
  mockUseLoyaltyPoints.mockReturnValue({
    data,
    isLoading,
  } as ReturnType<typeof useLoyaltyPoints>);
}

function setRewards(data: Reward[] | undefined, isLoading = false) {
  mockUseRewards.mockReturnValue({
    data,
    isLoading,
  } as ReturnType<typeof useRewards>);
}

function setRedeemMutation(isPending = false) {
  mockUseRedeemReward.mockReturnValue({
    mutateAsync: mockRedeemReward,
    isPending,
  } as ReturnType<typeof useRedeemReward>);
}

describe('LoyaltyProgram Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPoints(loyaltyPoints);
    setRewards([]);
    setRedeemMutation();
    mockUseLoyaltyHistory.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useLoyaltyHistory>);
    mockUseReferralCode.mockReturnValue({
      data: null,
    } as ReturnType<typeof useReferralCode>);
    mockUseReferralStats.mockReturnValue({
      data: null,
    } as ReturnType<typeof useReferralStats>);
    mockUseApplyReferralCode.mockReturnValue({
      mutateAsync: mockApplyReferralCode,
      isPending: false,
    } as ReturnType<typeof useApplyReferralCode>);
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
  });

  it('displays user points and tier', () => {
    render(<LoyaltyProgram />);

    expect(screen.getByRole('heading', { name: 'Points' })).toBeInTheDocument();
    expect(screen.getByText('1250')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Next Level: Platinum' })).toBeInTheDocument();
  });

  it('shows available rewards and prevents unaffordable redemption', () => {
    setRewards(rewards);

    render(<LoyaltyProgram />);

    expect(screen.getByRole('heading', { name: 'Free Delivery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Free Meal' })).toBeInTheDocument();
    const redeemButtons = screen.getAllByRole('button', { name: 'Redeem' });
    expect(redeemButtons[0]).toBeEnabled();
    expect(redeemButtons[1]).toBeDisabled();
  });

  it('redeems a reward by its current identity and reports success', async () => {
    setRewards([rewards[0]]);
    mockRedeemReward.mockResolvedValue({
      reward: rewards[0],
      newBalance: 1050,
    });

    render(<LoyaltyProgram />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Redeem' }));
    });

    expect(mockRedeemReward).toHaveBeenCalledWith('reward_1');
    expect(mockShowToast).toHaveBeenCalledWith('Reward redeemed! Free Delivery', 'success');
  });

  it('does not expose loyalty data when points are unavailable', () => {
    setPoints(null);

    render(<LoyaltyProgram />);

    expect(screen.getByText('Please log in to see your loyalty program')).toBeInTheDocument();
    expect(screen.queryByText('1250')).not.toBeInTheDocument();
    expect(screen.queryByText('Gold')).not.toBeInTheDocument();
    expect(mockRedeemReward).not.toHaveBeenCalled();
  });

  it('shows only the loading view while loyalty points are loading', () => {
    setPoints(undefined, true);

    const { container } = render(<LoyaltyProgram />);

    expect(container.querySelectorAll('.skeleton')).toHaveLength(2);
    expect(screen.queryByText('Please log in to see your loyalty program')).not.toBeInTheDocument();
    expect(screen.queryByText('1250')).not.toBeInTheDocument();
  });

  it('shows the empty state when no rewards are available', () => {
    setRewards([]);

    render(<LoyaltyProgram />);

    expect(screen.getByText('No rewards available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Redeem' })).not.toBeInTheDocument();
  });

  it('disables reward actions while a redemption is pending', () => {
    setRewards([rewards[0]]);
    setRedeemMutation(true);

    render(<LoyaltyProgram />);

    expect(screen.getByRole('button', { name: 'Redeeming...' })).toBeDisabled();
    expect(mockRedeemReward).not.toHaveBeenCalled();
  });

  it('reports a redemption error without claiming success', async () => {
    setRewards([rewards[0]]);
    mockRedeemReward.mockRejectedValue({
      response: { data: { message: 'Reward is no longer available' } },
    });

    render(<LoyaltyProgram />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Redeem' }));
    });

    expect(mockRedeemReward).toHaveBeenCalledWith('reward_1');
    expect(mockShowToast).toHaveBeenCalledWith('Reward is no longer available', 'error');
    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.stringContaining('Reward redeemed'),
      'success'
    );
  });
});
