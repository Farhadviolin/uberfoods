import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Profile } from '../Profile';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../utils/api');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockApi = jest.mocked(api);
const mockLogout = jest.fn();
const mockUpdateUser = jest.fn();

const authenticatedUser = {
  id: 'user_1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+43 664 1234567',
  address: 'Hauptstraße 1, 1010 Wien',
};

function setAuthUser(user: typeof authenticatedUser | null) {
  mockUseAuth.mockReturnValue({
    user,
    token: user ? 'customer-token' : null,
    login: jest.fn(),
    register: jest.fn(),
    refreshSession: jest.fn(),
    logout: mockLogout,
    updateUser: mockUpdateUser,
    isAuthenticated: Boolean(user),
    loading: false,
  });
}

function renderProfile() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Profile />
    </MemoryRouter>
  );
}

describe('Profile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    setAuthUser(authenticatedUser);
  });

  it('displays the authenticated user profile information from auth context', () => {
    renderProfile();

    expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('profile-name-input')).toHaveValue('John Doe');
    expect(screen.getByTestId('profile-phone-input')).toHaveValue('+43 664 1234567');
    expect(screen.getByTestId('profile-address-input')).toHaveValue('Hauptstraße 1, 1010 Wien');
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('does not expose profile data to an unauthenticated user', () => {
    setAuthUser(null);

    renderProfile();

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'profile.title' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'auth.login' })).toHaveAttribute('href', '/login');
    expect(mockApi.get).not.toHaveBeenCalled();
    expect(mockApi.put).not.toHaveBeenCalled();
  });

  it('updates profile information through the current profile API boundary', async () => {
    mockApi.put.mockResolvedValue({
      data: { ...authenticatedUser, name: 'John Updated' },
    });

    renderProfile();

    const nameInput = screen.getByTestId('profile-name-input');
    fireEvent.change(nameInput, { target: { value: 'John Updated' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'profile.save' }));
    });

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/customers/profile', {
        name: 'John Updated',
        phone: '+43 664 1234567',
        address: 'Hauptstraße 1, 1010 Wien',
        userId: 'user_1',
      });
    });
    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user_1',
        name: 'John Updated',
        email: 'john@example.com',
      })
    );
    expect(screen.getByText('profile.updateSuccess')).toBeInTheDocument();
  });

  it('shows the saving state while a profile update is pending', async () => {
    let resolveUpdate: (value: { data: typeof authenticatedUser }) => void = () => {};
    mockApi.put.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
    );

    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: 'profile.save' }));

    expect(screen.getByRole('button', { name: 'profile.saving' })).toBeDisabled();

    await act(async () => {
      resolveUpdate({ data: authenticatedUser });
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'profile.save' })).toBeEnabled();
    });
  });

  it('shows the API error and keeps the authenticated profile visible', async () => {
    mockApi.put.mockRejectedValue({
      response: { data: { message: 'Profile update failed' } },
    });

    renderProfile();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'profile.save' }));
    });

    expect(await screen.findByText('Profile update failed')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('handles missing optional profile fields without inventing fallback data', () => {
    setAuthUser({
      id: 'user_2',
      email: 'jane@example.com',
      name: '',
      phone: '',
      address: '',
    });

    renderProfile();

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('profile-name-input')).toHaveValue('');
    expect(screen.getByTestId('profile-phone-input')).toHaveValue('');
    expect(screen.getByTestId('profile-address-input')).toHaveValue('');
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('logs the authenticated user out through the auth boundary', () => {
    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: 'profile.logout' }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockApi.put).not.toHaveBeenCalled();
  });
});
