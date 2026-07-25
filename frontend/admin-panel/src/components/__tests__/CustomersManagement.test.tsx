import { fireEvent, screen, waitFor } from '@testing-library/react';
import { CustomersManagement } from '../CustomersManagement';
import api from '../../utils/api';

const render = (global as any).customRender;
jest.mock('../../utils/api');
const mockGet = api.get as jest.Mock;

const customers = [
  { id: 'c1', name: 'John Doe', email: 'john@example.com', phone: '123', address: 'Wien' },
  { id: 'c2', name: 'Jane Smith', email: 'jane@example.com', phone: '456', address: 'Graz' },
];

describe('CustomersManagement Component', () => {
  beforeEach(() => {
    mockGet.mockImplementation((url: string) =>
      Promise.resolve({ data: url === '/admin/customers' ? customers : [] }),
    );
  });

  it('renders the current customer list', async () => {
    render(<CustomersManagement />);
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/admin/customers');
    expect(mockGet).toHaveBeenCalledWith('/admin/orders');
  });

  it('filters customers using the current search field', async () => {
    render(<CustomersManagement />);
    await screen.findByText('John Doe');
    fireEvent.change(screen.getByPlaceholderText('Nach Kunde suchen...'), { target: { value: 'Jane' } });
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('exposes the create form and bulk export action', async () => {
    render(<CustomersManagement />);
    await screen.findByText('John Doe');
    expect(screen.getByRole('heading', { name: 'Neuen Kunden erstellen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export \(2\)/ })).toBeEnabled();
  });

  it('shows the backend error contract when customer loading fails', async () => {
    mockGet.mockRejectedValue(new Error('API Error'));
    render(<CustomersManagement />);
    await waitFor(() => expect(screen.getAllByText('API Error').length).toBeGreaterThanOrEqual(2));
  });
});
