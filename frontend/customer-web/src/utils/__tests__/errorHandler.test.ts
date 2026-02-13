import { extractErrorMessage, isNetworkError, isAuthError, isValidationError, extractValidationErrors, createApiError } from '../errorHandler';
import { AxiosErrorWithResponse } from '../../types';

describe('errorHandler', () => {
  describe('extractErrorMessage', () => {
    it('extracts message from axios error response', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          data: {
            message: 'Custom error message',
          },
          status: 400,
        },
      };

      expect(extractErrorMessage(error)).toBe('Custom error message');
    });

    it('returns default message for 400 status', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          status: 400,
        },
      };

      expect(extractErrorMessage(error)).toContain('Ungültige Anfrage');
    });

    it('returns default message for 401 status', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          status: 401,
        },
      };

      expect(extractErrorMessage(error)).toContain('nicht autorisiert');
    });

    it('returns network error message for request without response', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Network Error',
        request: {},
      };

      expect(extractErrorMessage(error)).toContain('Keine Verbindung');
    });

    it('returns generic error message for unknown error', () => {
      expect(extractErrorMessage('unknown error')).toContain('unerwarteter Fehler');
    });
  });

  describe('isNetworkError', () => {
    it('returns true for network error', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Network Error',
        request: {},
      };

      expect(isNetworkError(error)).toBe(true);
    });

    it('returns false for error with response', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          status: 400,
        },
      };

      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('returns true for 401 error', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Unauthorized',
        response: {
          status: 401,
        },
      };

      expect(isAuthError(error)).toBe(true);
    });

    it('returns true for 403 error', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Forbidden',
        response: {
          status: 403,
        },
      };

      expect(isAuthError(error)).toBe(true);
    });

    it('returns false for other errors', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Not Found',
        response: {
          status: 404,
        },
      };

      expect(isAuthError(error)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('returns true for 400 error', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Bad Request',
        response: {
          status: 400,
        },
      };

      expect(isValidationError(error)).toBe(true);
    });

    it('returns true for 422 error', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Unprocessable Entity',
        response: {
          status: 422,
        },
      };

      expect(isValidationError(error)).toBe(true);
    });
  });

  describe('extractValidationErrors', () => {
    it('extracts validation errors from array format', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Validation failed',
        response: {
          status: 400,
          data: {
            errors: [
              {
                property: 'email',
                constraints: {
                  isEmail: 'email must be an email',
                },
              },
              {
                property: 'password',
                constraints: {
                  minLength: 'password must be longer than 8 characters',
                },
              },
            ],
          },
        },
      };

      const errors = extractValidationErrors(error);
      expect(errors.email).toBe('email must be an email');
      expect(errors.password).toBe('password must be longer than 8 characters');
    });

    it('returns empty object for non-validation error', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Not Found',
        response: {
          status: 404,
        },
      };

      expect(extractValidationErrors(error)).toEqual({});
    });
  });

  describe('createApiError', () => {
    it('creates ApiError from axios error', () => {
      const error: AxiosErrorWithResponse = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          status: 400,
          data: {
            message: 'Custom error',
            code: 'VALIDATION_ERROR',
          },
        },
      };

      const apiError = createApiError(error);
      expect(apiError.message).toBe('Custom error');
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
    });

    it('handles unknown error types', () => {
      const apiError = createApiError('unknown');
      expect(apiError.message).toContain('unerwarteter Fehler');
    });
  });
});

