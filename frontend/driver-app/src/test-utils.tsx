import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppStateProvider } from './services/stateManager';
import { ToastProvider } from './contexts/ToastContext';

// Create a standard QueryClient for testing
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Test wrapper with common providers
interface TestWrapperProps {
  children: React.ReactNode;
  initialEntries?: string[];
  initialAuthState?: any;
  initialAppState?: any;
}

export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  initialEntries = ['/'],
  initialAuthState = { user: null, token: null },
  initialAppState = {}
}) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AppStateProvider initialState={initialAppState}>
          <AuthProvider initialAuthState={initialAuthState}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </AppStateProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Enhanced render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  initialAuthState?: any;
  initialAppState?: any;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries, initialAuthState, initialAppState, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper
        initialEntries={initialEntries}
        initialAuthState={initialAuthState}
        initialAppState={initialAppState}
      >
        {children}
      </TestWrapper>
    ),
    ...renderOptions,
  });
};

// Hook testing wrapper
export const renderHookWithProviders = (hookCallback: () => any) => {
  const queryClient = createTestQueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return {
    queryClient,
    wrapper,
    // Note: In real implementation, you'd use renderHook from @testing-library/react-hooks
    // For now, this is a placeholder
  };
};