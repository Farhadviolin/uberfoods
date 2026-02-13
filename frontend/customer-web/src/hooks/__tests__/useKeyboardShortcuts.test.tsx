import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
  });

  it('should register keyboard shortcuts', () => {
    const shortcuts = {
      'ctrl+s': jest.fn(),
      'ctrl+z': jest.fn(),
      'escape': jest.fn(),
    };

    const { result } = renderHook(() =>
      useKeyboardShortcuts(shortcuts, { target: mockElement })
    );

    expect(result.current.isActive).toBe(true);
    expect(result.current.activeShortcuts).toEqual(['ctrl+s', 'ctrl+z', 'escape']);
  });

  it('should handle single key shortcuts', () => {
    const escapeHandler = jest.fn();
    const shortcuts = {
      'escape': escapeHandler,
    };

    renderHook(() => useKeyboardShortcuts(shortcuts, { target: mockElement }));

    act(() => {
      fireEvent.keyDown(mockElement, { key: 'Escape', code: 'Escape' });
    });

    expect(escapeHandler).toHaveBeenCalledTimes(1);
    expect(escapeHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'Escape',
        preventDefault: expect.any(Function),
        stopPropagation: expect.any(Function),
      })
    );
  });

  it('should handle modifier key combinations', () => {
    const ctrlSHandler = jest.fn();
    const ctrlZHandler = jest.fn();
    const shortcuts = {
      'ctrl+s': ctrlSHandler,
      'ctrl+z': ctrlZHandler,
    };

    renderHook(() => useKeyboardShortcuts(shortcuts, { target: mockElement }));

    // Test Ctrl+S
    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 's',
        code: 'KeyS',
        ctrlKey: true,
      });
    });

    expect(ctrlSHandler).toHaveBeenCalledTimes(1);

    // Test Ctrl+Z
    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
    });

    expect(ctrlZHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple modifier keys', () => {
    const ctrlShiftSHandler = jest.fn();
    const shortcuts = {
      'ctrl+shift+s': ctrlShiftSHandler,
    };

    renderHook(() => useKeyboardShortcuts(shortcuts, { target: mockElement }));

    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 's',
        code: 'KeyS',
        ctrlKey: true,
        shiftKey: true,
      });
    });

    expect(ctrlShiftSHandler).toHaveBeenCalledTimes(1);
  });

  it('should prevent default behavior when configured', () => {
    const handler = jest.fn();
    const shortcuts = {
      'ctrl+s': handler,
    };

    renderHook(() =>
      useKeyboardShortcuts(shortcuts, {
        target: mockElement,
        preventDefault: true,
      })
    );

    // Create a real KeyboardEvent and mock preventDefault
    const mockPreventDefault = jest.fn();
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        code: 'KeyS',
        ctrlKey: true,
        bubbles: true,
      });
      // Mock preventDefault on the event
      event.preventDefault = mockPreventDefault;
      mockElement.dispatchEvent(event);
    });

    expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should stop propagation when configured', () => {
    const handler = jest.fn();
    const shortcuts = {
      'escape': handler,
    };

    renderHook(() =>
      useKeyboardShortcuts(shortcuts, {
        target: mockElement,
        stopPropagation: true,
      })
    );

    // Create a real KeyboardEvent and mock stopPropagation
    const mockStopPropagation = jest.fn();
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        bubbles: true,
      });
      // Mock stopPropagation on the event
      event.stopPropagation = mockStopPropagation;
      mockElement.dispatchEvent(event);
    });

    expect(mockStopPropagation).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not trigger on wrong key combinations', () => {
    const ctrlSHandler = jest.fn();
    const shortcuts = {
      'ctrl+s': ctrlSHandler,
    };

    renderHook(() => useKeyboardShortcuts(shortcuts, { target: mockElement }));

    // Wrong modifier
    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 's',
        code: 'KeyS',
        altKey: true,
      });
    });

    // Wrong key
    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 'a',
        code: 'KeyA',
        ctrlKey: true,
      });
    });

    // No modifier
    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 's',
        code: 'KeyS',
      });
    });

    expect(ctrlSHandler).not.toHaveBeenCalled();
  });

  it('should handle case insensitive key names', () => {
    const handler = jest.fn();
    const shortcuts = {
      'CTRL+S': handler, // uppercase
    };

    renderHook(() => useKeyboardShortcuts(shortcuts, { target: mockElement }));

    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 's',
        code: 'KeyS',
        ctrlKey: true,
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle alternative key names', () => {
    const handler = jest.fn();
    const shortcuts = {
      'control+s': handler, // 'control' instead of 'ctrl'
    };

    renderHook(() => useKeyboardShortcuts(shortcuts, { target: mockElement }));

    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 's',
        code: 'KeyS',
        ctrlKey: true,
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle function keys', () => {
    const f1Handler = jest.fn();
    const shortcuts = {
      'f1': f1Handler,
    };

    renderHook(() => useKeyboardShortcuts(shortcuts, { target: mockElement }));

    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 'F1',
        code: 'F1',
      });
    });

    expect(f1Handler).toHaveBeenCalledTimes(1);
  });

  it('should handle arrow keys', () => {
    const arrowHandler = jest.fn();
    const shortcuts = {
      'arrowup': arrowHandler,
      'uparrow': arrowHandler, // alternative
    };

    renderHook(() => useKeyboardShortcuts(shortcuts, { target: mockElement }));

    act(() => {
      fireEvent.keyDown(mockElement, {
        key: 'ArrowUp',
        code: 'ArrowUp',
      });
    });

    expect(arrowHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle repeated key events', () => {
    const handler = jest.fn();
    const shortcuts = {
      'a': handler,
    };

    renderHook(() => useKeyboardShortcuts(shortcuts, { target: mockElement }));

    // Simulate key repeat
    act(() => {
      fireEvent.keyDown(mockElement, { key: 'a', code: 'KeyA', repeat: true });
    });

    expect(handler).toHaveBeenCalledTimes(1); // Should still trigger
  });

  it('should cleanup event listeners on unmount', () => {
    const shortcuts = {
      'escape': jest.fn(),
    };

    const { unmount } = renderHook(() =>
      useKeyboardShortcuts(shortcuts, { target: mockElement })
    );

    // Spy on removeEventListener
    const removeEventListenerSpy = jest.spyOn(mockElement, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);

    removeEventListenerSpy.mockRestore();
  });

  it('should allow enabling/disabling shortcuts', () => {
    const handler = jest.fn();
    const shortcuts = {
      'escape': handler,
    };

    const { result, rerender } = renderHook(
      ({ enabled }) => useKeyboardShortcuts(shortcuts, { target: mockElement, enabled }),
      { initialProps: { enabled: true } }
    );

    expect(result.current.isActive).toBe(true);

    // Disable shortcuts
    rerender({ enabled: false });
    expect(result.current.isActive).toBe(false);

    // Try to trigger shortcut
    act(() => {
      fireEvent.keyDown(mockElement, { key: 'Escape', code: 'Escape' });
    });

    expect(handler).not.toHaveBeenCalled();

    // Re-enable shortcuts
    rerender({ enabled: true });
    expect(result.current.isActive).toBe(true);

    // Now it should work
    act(() => {
      fireEvent.keyDown(mockElement, { key: 'Escape', code: 'Escape' });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should provide shortcut information', () => {
    const shortcuts = {
      'ctrl+s': jest.fn(),
      'ctrl+z': jest.fn(),
      'escape': jest.fn(),
    };

    const { result } = renderHook(() =>
      useKeyboardShortcuts(shortcuts, { target: mockElement })
    );

    expect(result.current.activeShortcuts).toEqual(['ctrl+s', 'ctrl+z', 'escape']);
    expect(result.current.isActive).toBe(true);
  });
});




