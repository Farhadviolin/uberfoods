import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../Login';
import { useAuth } from '../../contexts/AuthContext';
import { webauthnService } from '../../services/webauthnService';

jest.mock('../../contexts/AuthContext');
jest.mock('../../services/webauthnService');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'de' },
  }),
}));

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      driver: null,
      isAuthenticated: false,
    });
    (webauthnService.isSupported as jest.Mock).mockReturnValue(false);
  });

  it('rendert Login-Formular', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login.submit/i })).toBeInTheDocument();
  });

  it('validiert E-Mail und Passwort als required', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('führt Login durch bei Submit', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login.submit/i });

    fireEvent.change(emailInput, { target: { value: 'driver@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('driver@test.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('zeigt Fehler bei fehlgeschlagenem Login', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login.submit/i });

    fireEvent.change(emailInput, { target: { value: 'driver@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('deaktiviert Submit-Button während Loading', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login.submit/i });

    fireEvent.change(emailInput, { target: { value: 'driver@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  it('zeigt Passkey-Button wenn unterstützt', () => {
    (webauthnService.isSupported as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const passkeyButton = screen.getByRole('button', { name: /login.passkey.label/i });
    expect(passkeyButton).toBeInTheDocument();
    expect(passkeyButton).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('deaktiviert Passkey-Button wenn nicht unterstützt', () => {
    (webauthnService.isSupported as jest.Mock).mockReturnValue(false);

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const passkeyButton = screen.getByRole('button', { name: /login.passkey.label/i });
    expect(passkeyButton).toHaveAttribute('aria-disabled', 'true');
  });
});
