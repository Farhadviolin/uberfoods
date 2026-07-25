import { act, fireEvent, screen } from '@testing-library/react';
import { RestaurantManagement } from '../RestaurantManagement';

const render = (global as any).customRender;
const mockShowToast = jest.fn();

jest.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('RestaurantManagement current product contract', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function renderLoaded() {
    render(<RestaurantManagement />);
    act(() => jest.advanceTimersByTime(1000));
  }

  it('renders a loading state before the local data source resolves', () => {
    render(<RestaurantManagement />);
    expect(screen.queryByText('Pizza Palace')).not.toBeInTheDocument();
  });

  it('renders all three current restaurant records', () => {
    renderLoaded();
    expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
    expect(screen.getByText('Burger Joint')).toBeInTheDocument();
    expect(screen.getByText('Sushi Garden')).toBeInTheDocument();
  });

  it('filters restaurants by free-text search', () => {
    renderLoaded();
    fireEvent.change(screen.getByPlaceholderText('Suche nach Name, Beschreibung, Adresse oder Küche...'), {
      target: { value: 'Sushi' },
    });
    expect(screen.getByText('Sushi Garden')).toBeInTheDocument();
    expect(screen.queryByText('Pizza Palace')).not.toBeInTheDocument();
  });

  it('opens the current add-restaurant dialog', () => {
    renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /Restaurant hinzufügen/ }));
    expect(screen.getByRole('heading', { name: 'Neues Restaurant hinzufügen' })).toBeInTheDocument();
  });

  it('exports the loaded restaurant set as CSV', () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /CSV Export/ }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(mockShowToast).toHaveBeenCalledWith('CSV Export erfolgreich heruntergeladen', 'success');
  });
});
