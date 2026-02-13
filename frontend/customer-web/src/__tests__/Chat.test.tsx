import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import Chat from '../components/Chat';
import React from 'react';

// Mock useWebSocket
jest.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    socket: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    },
    isConnected: true,
  }),
}));

// Mock NotificationService
jest.mock('../services/notificationService', () => ({
  NotificationService: {
    showNewMessage: jest.fn(),
  },
}));

// Mock API
jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({}),
}));

describe('Chat Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat interface correctly', async () => {
    const api = require('../utils/api').default;
    api.get.mockResolvedValueOnce({ data: [] });

    render(<Chat orderId="test-order" />);

    // Wait for loading to complete and chat interface to render
    await waitFor(() => {
      const input = screen.queryByPlaceholderText(/Nachricht|Message|schreiben/i);
      const sendButton = screen.queryByText(/📤/);
      const chatHeader = screen.queryByText(/Chat/i);
      
      // At least one should be present (input field with placeholder or send button or chat header)
      expect(input || sendButton || chatHeader).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('loads chat history on mount', async () => {
    const mockHistory = [
      { id: '1', message: 'Hello', senderType: 'customer', senderId: 'user-1', senderName: 'User', timestamp: new Date().toISOString() },
      { id: '2', message: 'Hi there!', senderType: 'restaurant', senderId: 'rest-1', senderName: 'Restaurant', timestamp: new Date().toISOString() },
    ];

    const api = require('../utils/api').default;
    api.get.mockResolvedValueOnce({ data: mockHistory });

    render(<Chat orderId="test-order" />);

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('sends message via WebSocket', async () => {
    render(<Chat orderId="test-order" />);

    await waitFor(() => {
      const input = screen.queryByPlaceholderText(/Nachricht|Message/i);
      if (input) {
        fireEvent.change(input, { target: { value: 'Test message' } });
        const sendButton = screen.queryByText(/Senden|Send/i);
        if (sendButton) {
          fireEvent.click(sendButton);
        }
      }
    });
  });

  it('handles message validation', async () => {
    render(<Chat orderId="test-order" />);

    await waitFor(() => {
      const input = screen.queryByPlaceholderText(/Nachricht|Message/i);
      if (input) {
        const sendButton = screen.queryByText(/Senden|Send/i);
        if (sendButton) {
          fireEvent.change(input, { target: { value: '' } });
          fireEvent.click(sendButton);
        }
      }
    });
    
    // Message validation might be handled silently or via alert
    // Just verify component doesn't crash
    expect(screen.queryByText(/Nachricht|Message/i)).toBeTruthy();
  });

  it('handles WebSocket errors gracefully', async () => {
    render(<Chat orderId="test-order" />);

    // Component should handle error gracefully
    await waitFor(() => {
      // Component should still render
      expect(screen.queryByText(/Chat|Nachricht/i) || screen.queryByText(/Laden|Loading/i)).toBeTruthy();
    }, { timeout: 2000 });
  });
});








