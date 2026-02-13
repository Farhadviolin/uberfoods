import { Test, TestingModule } from '@nestjs/testing';
import { MapsService } from './maps.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MapsService', () => {
  let service: MapsService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_MAPS_API_KEY') return null; // Mock mode
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: {
            // Mock PrismaService methods as needed
            $transaction: jest.fn(),
            address: {
              findFirst: jest.fn().mockResolvedValue(null),
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn().mockResolvedValue({}),
            },
            restaurant: {
              findFirst: jest.fn().mockResolvedValue(null),
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MapsService>(MapsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateRoute', () => {
    it('should calculate route using mock implementation when API key is missing', async () => {
      const origin = { lat: 48.2082, lng: 16.3738 }; // Vienna
      const destination = { lat: 48.2100, lng: 16.3800 }; // Nearby point

      const result = await service.calculateRoute(origin, destination);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('duration');
      expect(typeof result.distance).toBe('number');
      expect(typeof result.duration).toBe('number');
    });

    it('should use Google Maps API when key is provided', async () => {
      // Mock ConfigService to return API key
      mockConfigService.get.mockReturnValue('test-api-key');

      // Recreate service with API key
      const moduleWithKey: TestingModule = await Test.createTestingModule({
        providers: [
          MapsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => 'test-api-key'),
            },
          },
          {
            provide: PrismaService,
            useValue: {
              $transaction: jest.fn(),
              address: {
                findFirst: jest.fn().mockResolvedValue(null),
                findMany: jest.fn().mockResolvedValue([]),
                create: jest.fn().mockResolvedValue({}),
              },
              restaurant: {
                findFirst: jest.fn().mockResolvedValue(null),
                findMany: jest.fn().mockResolvedValue([]),
              },
            },
          },
        ],
      }).compile();

      const serviceWithKey = moduleWithKey.get<MapsService>(MapsService);

      const origin = { lat: 48.2082, lng: 16.3738 };
      const destination = { lat: 48.2100, lng: 16.3800 };

      mockedAxios.get.mockResolvedValue({
        data: {
          routes: [
            {
              legs: [
                {
                  distance: { value: 1000 }, // meters
                  duration: { value: 120 }, // seconds
                },
              ],
              overview_polyline: { points: 'test-polyline' },
            },
          ],
        },
      });

      const result = await serviceWithKey.calculateRoute(origin, destination);

      expect(result).toBeDefined();
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1 = { lat: 48.2082, lng: 16.3738 }; // Vienna
      const point2 = { lat: 48.2100, lng: 16.3800 }; // Nearby point

      const distance = service.calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should return 0 for same point', () => {
      const point = { lat: 48.2082, lng: 16.3738 };

      const distance = service.calculateDistance(point, point);

      expect(distance).toBe(0);
    });
  });

  describe('estimateDuration', () => {
    it('should estimate duration based on distance', () => {
      const distance = 5000; // 5 km in meters
      const averageSpeed = 30; // km/h

      const duration = service.estimateDuration(distance, averageSpeed);

      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });

    it('should use default speed if not provided', () => {
      const distance = 1000; // 1 km

      const duration = service.estimateDuration(distance);

      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('geocodeAddress', () => {
    it('should geocode address using mock when API key is missing', async () => {
      const address = 'Vienna, Austria';

      const result = await service.geocodeAddress(address);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('coordinates');
      expect(result.coordinates).toHaveProperty('lat');
      expect(result.coordinates).toHaveProperty('lng');
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates using mock when API key is missing', async () => {
      const coordinates = { lat: 48.2082, lng: 16.3738 };

      const result = await service.reverseGeocode(coordinates);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

