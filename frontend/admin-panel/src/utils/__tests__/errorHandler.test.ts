// Mock logger before importing errorHandler to prevent console.warn during module initialization
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  extractErrorMessage,
  createStructuredApiError,
  handleApiError,
} from '../errorHandler';
import { logger } from '../logger';

describe('errorHandler', () => {
  describe('extractErrorMessage', () => {
    it('should handle standard errors', () => {
      const error = {
        message: 'Standard error message',
      };
      expect(extractErrorMessage(error)).toBe('Ein unerwarteter Fehler ist aufgetreten.');
    });

    it('should create structured ApiError with requestId', () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not found', code: 'NOT_FOUND' },
          headers: { 'x-request-id': 'req-12345' },
        },
      };
      const apiError = createStructuredApiError(error);
      expect(apiError.message).toBe('Not found');
      expect(apiError.status).toBe(404);
      expect(apiError.code).toBe('NOT_FOUND');
      expect(apiError.requestId).toBe('req-12345');
    });
  });

  describe('handleApiError', () => {
    it('should throw error for non-allowlisted 404 error', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };

      try {
        await handleApiError(error, {
          allowlist: [], // 404 not allowlisted
          context: 'Test Context'
        });
        fail('Expected function to throw');
      } catch (thrownError) {
        expect(thrownError).toBeDefined();
      }
    });

    it('should throw error for non-404 errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      };

      try {
        await handleApiError(error, {
          allowlist: [404], // Only 404 allowlisted
          context: 'Test Context'
        });
        fail('Expected function to throw');
      } catch (thrownError) {
        expect(thrownError).toBeDefined();
      }
    });

    it('should return fallback value for allowlisted errors', async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();

      const error = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };

      const result = await handleApiError(error, {
        allowlist: [404],
        fallbackValue: 'default-value',
        logLevel: 'warn',
        context: 'Test Context'
      });

      expect(result).toBe('default-value');
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Allowlisted 404 error in Test Context',
        expect.objectContaining({ status: 404 })
      );

      loggerWarnSpy.mockRestore();
    });
  });
});
