import { errorReporting, logError, logWarning, logInfo, logDebug } from '../errorReporting';

describe('errorReporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    errorReporting.setEnabled(true);
  });

  describe('logError', () => {
    it('logs error in development', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      logError(error, { component: 'TestComponent' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('includes context in error log', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      logError(error, { component: 'TestComponent', action: 'testAction', userId: 'user123' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestComponent'),
        expect.anything(),
        expect.objectContaining({
          component: 'TestComponent',
          action: 'testAction',
          userId: 'user123',
        })
      );
      consoleSpy.mockRestore();
    });

    it('handles non-Error objects', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      logError('string error', { component: 'TestComponent' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logWarning', () => {
    it('logs warning in development', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      logWarning('Test warning', { component: 'TestComponent' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logInfo', () => {
    it('logs info in development', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      logInfo('Test info', { component: 'TestComponent' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logDebug', () => {
    it('logs debug in development', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      logDebug('Test debug', { data: 'test' }, { component: 'TestComponent' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setEnabled', () => {
    it('disables logging when set to false', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      errorReporting.setEnabled(false);

      logError(new Error('Test'), { component: 'TestComponent' });

      expect(consoleSpy).not.toHaveBeenCalled();
      errorReporting.setEnabled(true);
      consoleSpy.mockRestore();
    });
  });
});

