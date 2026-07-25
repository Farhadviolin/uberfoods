import { screen } from '@testing-library/react';
import { GroupOrderManagement } from '../GroupOrderManagement';

const render = (global as any).customRender;

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

describe('Current collaborative-order administration', () => {
  it('renders the supported Group Order workflow instead of a removed kitchen component', () => {
    render(<GroupOrderManagement />);
    expect(screen.getByRole('heading', { name: 'Group Orders' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Neue Group Order erstellen' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Mitglied als bereit markieren' })).toBeInTheDocument();
  });
});
