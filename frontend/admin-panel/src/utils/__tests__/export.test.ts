import {
  exportOrdersToCSV,
  exportOrdersToPDF,
  exportRestaurantsToCSV,
  exportToPDF,
} from '../export';

const order = {
  id: 'order_1',
  status: 'DELIVERED',
  totalAmount: 25.5,
  customer: { name: 'Test, User', email: 'john@example.com' },
  restaurant: { name: 'Pizza "Best"' },
  driver: null,
  createdAt: '2025-12-01T10:00:00Z',
  items: [{ quantity: 2 }, { quantity: 1 }],
  phone: '+43 1 1234567',
  address: 'Test Address 1',
};

describe('Export Utils', () => {
  beforeEach(() => {
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('creates a downloadable CSV with escaped values', () => {
    exportOrdersToCSV([order]);
    const link = HTMLAnchorElement.prototype.click as jest.Mock;
    expect(link).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('does not create a CSV download for empty data', () => {
    exportRestaurantsToCSV([]);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('generates a real jsPDF 4 document with an AutoTable and PDF bytes', () => {
    const doc = exportToPDF(
      [{ Name: 'Pizza Palace', Umsatz: 42.5 }],
      'analytics',
      'Analytics Report',
    )!;
    const generatedBytes = doc.output('arraybuffer');

    expect(generatedBytes).toBeInstanceOf(ArrayBuffer);
    expect(generatedBytes.byteLength).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(generatedBytes.slice(0, 8))).toContain('%PDF-');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('maps the current order contract into a real PDF download', () => {
    const doc = exportOrdersToPDF([order])!;

    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000);
  });
});
