import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { ReactNode } from 'react';
import {
  useChefRecommendations,
  usePersonalizedChef,
  useChefProfile,
  useRateChef
} from '../useChef';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('useChef', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useChefRecommendations', () => {
    it('should fetch chef recommendations successfully', async () => {
      const mockRecommendations = [
        {
          id: 'chef-1',
          name: 'Marco Rossi',
          specialty: 'Italian Cuisine',
          rating: 4.8,
          reviewCount: 234,
          experience: 8,
          avatar: 'https://example.com/chef1.jpg',
          bio: 'Passionate Italian chef with 8 years of experience',
          languages: ['Italian', 'English', 'German'],
          certifications: ['Italian Culinary Academy', 'Wine Sommelier'],
          specialties: ['Pizza', 'Pasta', 'Risotto'],
          availableTimes: ['Lunch', 'Dinner'],
          hourlyRate: 45.00,
          location: 'Vienna, Austria',
          isAvailable: true,
          featured: true,
        },
        {
          id: 'chef-2',
          name: 'Anna Schmidt',
          specialty: 'Austrian Cuisine',
          rating: 4.6,
          reviewCount: 156,
          experience: 12,
          avatar: 'https://example.com/chef2.jpg',
          bio: 'Traditional Austrian cuisine with modern twists',
          languages: ['German', 'English'],
          certifications: ['Austrian Culinary Institute'],
          specialties: ['Wiener Schnitzel', 'Sachertorte', 'Traditional Desserts'],
          availableTimes: ['Dinner', 'Weekend'],
          hourlyRate: 50.00,
          location: 'Vienna, Austria',
          isAvailable: true,
          featured: false,
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockRecommendations });

      const { result } = renderHook(() => useChefRecommendations(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/chefs/recommendations');
      expect(result.current.data).toEqual(mockRecommendations);
    });

    it('should handle chef recommendations with filters', async () => {
      const mockRecommendations = [
        {
          id: 'chef-1',
          name: 'Marco Rossi',
          specialty: 'Italian Cuisine',
          rating: 4.8,
          experience: 8,
          hourlyRate: 45.00,
          specialties: ['Pizza', 'Pasta'],
          availableTimes: ['Lunch'],
        },
      ];

      const filters = {
        specialty: 'Italian',
        maxHourlyRate: 50,
        minRating: 4.5,
        availableTime: 'Lunch',
      };

      mockApi.get.mockResolvedValueOnce({ data: mockRecommendations });

      const { result } = renderHook(() => useChefRecommendations(filters), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/chefs/recommendations?specialty=Italian&maxHourlyRate=50&minRating=4.5&availableTime=Lunch');
    });
  });

  describe('usePersonalizedChef', () => {
    it('should fetch personalized chef recommendations successfully', async () => {
      const mockPersonalized = {
        userPreferences: {
          cuisines: ['Italian', 'Asian'],
          dietaryRestrictions: ['vegetarian'],
          budget: 'medium',
          occasions: ['dinner', 'special_events'],
        },
        recommendations: [
          {
            id: 'chef-1',
            name: 'Marco Rossi',
            specialty: 'Italian Cuisine',
            rating: 4.8,
            matchScore: 95,
            whyRecommended: 'Perfect match for Italian cuisine preference',
            estimatedCost: 180.00,
            estimatedDuration: 3,
            menuPreview: [
              'Antipasti platter',
              'Homemade pasta',
              'Tiramisu dessert',
            ],
          },
          {
            id: 'chef-3',
            name: 'Chef Kim',
            specialty: 'Asian Fusion',
            rating: 4.7,
            matchScore: 88,
            whyRecommended: 'Great Asian cuisine options with vegetarian adaptations',
            estimatedCost: 220.00,
            estimatedDuration: 2.5,
            menuPreview: [
              'Spring rolls',
              'Vegetarian stir-fry',
              'Green tea ice cream',
            ],
          },
        ],
        nextBestMatches: [
          {
            id: 'chef-4',
            name: 'Chef Sarah',
            specialty: 'Mediterranean',
            rating: 4.5,
            matchScore: 78,
          },
        ],
      };

      mockApi.get.mockResolvedValueOnce({ data: mockPersonalized });

      const { result } = renderHook(() => usePersonalizedChef(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/chefs/personalized');
      expect(result.current.data).toEqual(mockPersonalized);
    });
  });

  describe('useChefProfile', () => {
    it('should fetch chef profile successfully', async () => {
      const mockProfile = {
        id: 'chef-1',
        name: 'Marco Rossi',
        email: 'marco.rossi@chefs.com',
        phone: '+43 123 456 789',
        avatar: 'https://example.com/chef1.jpg',
        coverImage: 'https://example.com/chef1-cover.jpg',
        bio: 'Passionate Italian chef with 8 years of experience in authentic Italian cuisine',
        specialty: 'Italian Cuisine',
        experience: 8,
        rating: 4.8,
        reviewCount: 234,
        languages: ['Italian', 'English', 'German'],
        certifications: [
          {
            name: 'Italian Culinary Academy',
            issuer: 'ICA',
            year: 2018,
            validUntil: 2025,
          },
          {
            name: 'Wine Sommelier',
            issuer: 'AIS',
            year: 2019,
            validUntil: 2026,
          },
        ],
        specialties: ['Pizza', 'Pasta', 'Risotto', 'Desserts'],
        availableTimes: ['Lunch', 'Dinner', 'Weekend'],
        hourlyRate: 45.00,
        location: {
          city: 'Vienna',
          country: 'Austria',
          travelRadius: 50,
        },
        portfolio: [
          {
            id: 'portfolio-1',
            title: 'Wedding Dinner for 50',
            description: 'Multi-course Italian wedding menu',
            images: ['https://example.com/wedding1.jpg'],
            date: '2024-01-15',
            rating: 5.0,
          },
        ],
        reviews: [
          {
            id: 'review-1',
            customerName: 'John Doe',
            rating: 5,
            comment: 'Amazing Italian dishes! Highly recommended.',
            date: '2024-01-01',
            eventType: 'Private Dinner',
          },
        ],
        availability: {
          nextAvailable: '2024-01-10T19:00:00Z',
          bookedDates: ['2024-01-05', '2024-01-06'],
          preferredDays: ['Friday', 'Saturday', 'Sunday'],
        },
        stats: {
          totalEvents: 156,
          averageRating: 4.8,
          repeatCustomers: 45,
          responseTime: 2, // hours
        },
        isVerified: true,
        insurance: {
          liability: true,
          validUntil: '2024-12-31',
        },
        paymentMethods: ['Bank Transfer', 'PayPal'],
      };

      mockApi.get.mockResolvedValueOnce({ data: mockProfile });

      const { result } = renderHook(() => useChefProfile('chef-1'), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/chefs/chef-1');
      expect(result.current.data).toEqual(mockProfile);
    });
  });

  describe('useRateChef', () => {
    it('should rate chef successfully', async () => {
      const mockRating = {
        id: 'rating-1',
        chefId: 'chef-1',
        customerId: 'customer-1',
        eventId: 'event-1',
        rating: 5,
        comment: 'Amazing experience! The pasta was incredible.',
        categories: {
          foodQuality: 5,
          presentation: 5,
          punctuality: 4,
          communication: 5,
          value: 4,
        },
        images: ['https://example.com/rating1.jpg'],
        createdAt: '2024-01-03T20:00:00Z',
        updatedAt: '2024-01-03T20:00:00Z',
        isPublic: true,
        helpful: 0,
      };

      const ratingData = {
        chefId: 'chef-1',
        eventId: 'event-1',
        rating: 5,
        comment: 'Amazing experience! The pasta was incredible.',
        categories: {
          foodQuality: 5,
          presentation: 5,
          punctuality: 4,
          communication: 5,
          value: 4,
        },
      };

      mockApi.post.mockResolvedValueOnce({ data: mockRating });

      const { result } = renderHook(() => useRateChef(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(ratingData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/chefs/rate', ratingData);
      expect(result.current.data).toEqual(mockRating);
    });

    it('should handle rating validation errors', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Rating must be between 1 and 5' },
        },
      });

      const { result } = renderHook(() => useRateChef(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate({
        chefId: 'chef-1',
        eventId: 'event-1',
        rating: 6, // Invalid rating
        comment: 'Test',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});








