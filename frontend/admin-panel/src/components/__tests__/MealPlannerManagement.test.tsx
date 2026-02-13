import { screen, waitFor, fireEvent } from '@testing-library/react';

// Use the global custom render that includes providers
const renderWithProviders = (global as any).customRender;
import { MealPlannerManagement } from '../MealPlannerManagement';
import api from '../../utils/api';

// Mock contexts
jest.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock API
jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: {
      headers: {
        common: {},
      },
    },
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('MealPlannerManagement', () => {
  const mockWeeklyPlan = {
    meals: [
      { id: 'plan-1', title: 'Weekly Plan', dishIds: ['dish-1', 'dish-2'], notes: 'Test notes' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: [] });
  });

  it('should render Meal Planner', async () => {
    renderWithProviders(<MealPlannerManagement />);

    await waitFor(() => {
      expect(screen.getByText('Meal Planner')).toBeInTheDocument();
    });
  });

  it('should load weekly plan', async () => {
    mockedApi.get.mockResolvedValue({ data: mockWeeklyPlan });

    renderWithProviders(<MealPlannerManagement />);

    const weekInput = screen.getByLabelText(/Wochenstart für Meal-Plan/i);
    const loadButton = screen.getByRole('button', { name: /Weekly Plan laden/i });

    fireEvent.change(weekInput, { target: { value: '2025-01-06' } });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/meal-planner/weekly',
        expect.objectContaining({ params: { weekStart: '2025-01-06' } })
      );
    });
  });

  it('should create a meal plan', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'plan-2', success: true } });

    renderWithProviders(<MealPlannerManagement />);

    await waitFor(() => {
      expect(screen.getByText('Meal Planner')).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/Titel/i);
    const dishIdsInput = screen.getByPlaceholderText(/dish-1,dish-2/i);
    const submitButton = screen.getByRole('button', { name: /Speichern/i });

    fireEvent.change(titleInput, { target: { value: 'New Plan' } });
    fireEvent.change(dishIdsInput, { target: { value: 'dish-1,dish-2' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/meal-planner/meals',
        expect.objectContaining({
          title: 'New Plan',
          dishIds: ['dish-1', 'dish-2'],
        })
      );
    });
  });

  it('should fetch shopping list', async () => {
    mockedApi.get.mockResolvedValue({ data: { items: ['Item 1', 'Item 2'] } });

    renderWithProviders(<MealPlannerManagement />);

    await waitFor(() => {
      expect(screen.getByText('Meal Planner')).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/Startdatum für Einkaufsliste/i);
    const endInput = screen.getByLabelText(/Enddatum für Einkaufsliste/i);
    const fetchButton = screen.getByRole('button', { name: /Einkaufsliste abrufen/i });

    fireEvent.change(startInput, { target: { value: '2025-01-06' } });
    fireEvent.change(endInput, { target: { value: '2025-01-12' } });
    fireEvent.click(fetchButton);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/meal-planner/shopping-list',
        expect.objectContaining({
          params: { startDate: '2025-01-06', endDate: '2025-01-12' },
        })
      );
    });
  });

  it('should execute meal plan', async () => {
    mockedApi.post.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<MealPlannerManagement />);

    await waitFor(() => {
      expect(screen.getByText('Meal Planner')).toBeInTheDocument();
    });

    const executeInput = screen.getByPlaceholderText(/meal-plan-id/i);
    const executeButton = screen.getByRole('button', { name: /Ausführen/i });

    fireEvent.change(executeInput, { target: { value: 'plan-1' } });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/meal-planner/meals/plan-1/execute'
      );
    });
  });
});




