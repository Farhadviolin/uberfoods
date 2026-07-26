import { fireEvent, screen, waitFor } from '@testing-library/react';
import api from '../../utils/api';
import { DriverExport } from '../DriverExport';

const render = (
  global as typeof globalThis & {
    customRender: (
      ui: React.ReactElement
    ) => ReturnType<typeof import('@testing-library/react').render>;
  }
).customRender;
const mockShowToast = jest.fn();
const mockOnClose = jest.fn();

jest.mock('../../utils/api');
jest.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));
jest.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('DriverExport', () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    mockShowToast.mockClear();
  });

  it('exports validated driver IDs with the selected complete export contract', async () => {
    const anchorClick = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    jest.mocked(window.URL.createObjectURL).mockReturnValue('blob:driver-export');
    mockedApi.post.mockResolvedValue({
      data: new Blob(['driver export'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf; charset=utf-8' },
    });

    render(
      <DriverExport
        driverIds={['driver_1', 'driver-2', 'driver,invalid', '']}
        onClose={mockOnClose}
      />
    );

    const [formatSelect, typeSelect] = screen.getAllByRole('combobox');
    fireEvent.change(formatSelect, { target: { value: 'pdf' } });
    fireEvent.change(typeSelect, { target: { value: 'full' } });
    fireEvent.click(screen.getByLabelText('Bestellungen'));
    fireEvent.click(screen.getByLabelText('Performance-Metriken'));
    fireEvent.click(screen.getByRole('button', { name: '📥 Exportieren' }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/admin/drivers/export',
        {
          driverIds: ['driver_1', 'driver-2'],
          format: 'pdf',
          type: 'full',
          includeData: {
            profile: true,
            earnings: true,
            orders: true,
            performance: true,
            documents: false,
          },
        },
        { responseType: 'blob' }
      );
    });
    await waitFor(() => {
      expect(anchorClick).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith('Export erfolgreich erstellt', 'success');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('rejects missing or non-string content types instead of downloading unsafe data', async () => {
    const anchorClick = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    mockedApi.post.mockResolvedValue({
      data: new Blob(['driver export']),
      headers: { 'content-type': 200 },
    });

    render(<DriverExport driverIds={['driver-1']} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: '📥 Exportieren' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Unerwarteter Inhaltstyp für Export', 'error');
    });
    expect(anchorClick).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('does not call the API when no valid driver ID remains', async () => {
    render(<DriverExport driverIds={['', 'driver,invalid', '../driver']} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: '📥 Exportieren' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Keine gültigen Fahrer-IDs gefunden', 'error');
    });
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
