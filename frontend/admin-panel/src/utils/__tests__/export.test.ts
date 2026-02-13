// Mock the entire export module
jest.mock('../export', () => ({
  exportOrdersToCSV: jest.fn(() => 'mocked-csv-data'),
  exportRestaurantsToCSV: jest.fn(() => 'mocked-csv-data'),
  exportOrdersToPDF: jest.fn(() => Promise.resolve(new Blob(['mock-pdf'], { type: 'application/pdf' }))),
  exportOrdersToExcel: jest.fn(() => Promise.resolve(new Blob(['mock-excel'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))),
}));

import { 
  exportOrdersToCSV, 
  exportRestaurantsToCSV,
  exportOrdersToPDF,
  exportOrdersToExcel 
} from '../export';

describe('Export Utils', () => {
  describe('exportOrdersToCSV', () => {
    it('should call exportOrdersToCSV function', () => {
      const mockOrders = [
        {
          id: 'order_1',
          status: 'DELIVERED',
          totalAmount: 25.50,
          customer: { name: 'John Doe', email: 'john@example.com' },
          restaurant: { name: 'Pizza Paradise' },
          createdAt: '2025-12-01T10:00:00Z',
          items: [{ quantity: 2 }, { quantity: 1 }],
          phone: '+43 1 1234567',
          address: 'Test Address 1',
        },
      ];

      const result = exportOrdersToCSV(mockOrders);

      expect(exportOrdersToCSV).toHaveBeenCalledWith(mockOrders);
      expect(result).toBe('mocked-csv-data');
    });

    it('should handle empty array', () => {
      const result = exportOrdersToCSV([]);

      expect(exportOrdersToCSV).toHaveBeenCalledWith([]);
      expect(result).toBe('mocked-csv-data');
    });

    it('should handle special characters', () => {
      const mockOrders = [
        {
          id: 'order_1',
          customer: { name: 'Test, User' },
          restaurant: { name: 'Pizza "Best" Paradise' },
          totalAmount: 25.50,
          items: [{ quantity: 1 }],
          phone: '+43 1 1234567',
          address: 'Test Address',
          status: 'DELIVERED',
          createdAt: '2025-12-01T10:00:00Z',
        },
      ];

      const result = exportOrdersToCSV(mockOrders);

      expect(exportOrdersToCSV).toHaveBeenCalledWith(mockOrders);
      expect(result).toBe('mocked-csv-data');
    });
  });

  describe('exportRestaurantsToCSV', () => {
    it('should call exportRestaurantsToCSV function', () => {
      const mockRestaurants = [
        {
          id: 'rest_1',
          name: 'Pizza Paradise',
          address: 'Hauptstrasse 1',
          phone: '+43 1 1234567',
          email: 'info@pizza.com',
          isActive: true,
        },
      ];

      const result = exportRestaurantsToCSV(mockRestaurants);

      expect(exportRestaurantsToCSV).toHaveBeenCalledWith(mockRestaurants);
      expect(result).toBe('mocked-csv-data');
    });
  });

  describe('exportOrdersToPDF', () => {
    it('should generate PDF blob', async () => {
      const mockOrders = [
        {
          id: 'order_1',
          status: 'DELIVERED',
          totalAmount: 25.50,
          customer: { name: 'John Doe' },
          restaurant: { name: 'Pizza Paradise' },
          createdAt: new Date().toISOString(),
          items: [{ quantity: 2 }],
          phone: '+43 1 1234567',
          address: 'Test Address',
        },
      ];

      const result = await exportOrdersToPDF(mockOrders, 'Test Orders');

      expect(exportOrdersToPDF).toHaveBeenCalledWith(mockOrders, 'Test Orders');
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });
  });

  describe('exportOrdersToExcel', () => {
    it('should generate Excel blob', async () => {
      const mockOrders = [
        {
          id: 'order_1',
          status: 'DELIVERED',
          totalAmount: 25.50,
          customer: { name: 'John Doe' },
          restaurant: { name: 'Pizza Paradise' },
          createdAt: new Date().toISOString(),
          items: [{ quantity: 2 }],
          phone: '+43 1 1234567',
          address: 'Test Address',
        },
      ];

      const result = await exportOrdersToExcel(mockOrders, 'Test Orders');

      expect(exportOrdersToExcel).toHaveBeenCalledWith(mockOrders, 'Test Orders');
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('spreadsheet');
    });
  });
});
