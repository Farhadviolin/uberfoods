import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PaymentService } from '../payment/payment.service';
import { WebhookService } from './webhook.service';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  const mockOrderService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockPaymentService = {
    processPaymentWithSavedMethod: jest.fn(),
    createPaymentIntent: jest.fn(),
    createPayPalOrder: jest.fn(),
    createPaymentRecord: jest.fn(),
    confirmPayment: jest.fn(),
    capturePayPalOrder: jest.fn(),
    createApplePayPayment: jest.fn(),
  };

  const mockWebhookService = {
    registerWebhook: jest.fn(),
    sendWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of orders', async () => {
      const mockOrders = {
        data: [
          { id: '1', status: 'PENDING', totalAmount: 25.50 },
          { id: '2', status: 'DELIVERED', totalAmount: 45.00 },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockOrderService.findAll.mockResolvedValue(mockOrders);

      const result = await controller.findAll({ page: '1', limit: '20' });

      expect(result).toEqual(mockOrders);
      expect(service.findAll).toHaveBeenCalledWith(
        { page: '1', limit: '20' },
        { page: 1, limit: 20, maxLimit: 100 }
      );
    });

    it('should handle filters', async () => {
      const filters = { status: 'PENDING', restaurantId: 'rest_123' };
      const mockOrders = {
        data: [{ id: '1', status: 'PENDING' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      mockOrderService.findAll.mockResolvedValue(mockOrders);

      const result = await controller.findAll({ ...filters, page: '1', limit: '10' });

      expect(result).toEqual(mockOrders);
      expect(service.findAll).toHaveBeenCalledWith(
        { ...filters, page: '1', limit: '10' },
        { page: 1, limit: 10, maxLimit: 100 }
      );
    });
  });

  describe('findOne', () => {
    it('should return single order', async () => {
      const mockOrder = {
        id: 'order_123',
        status: 'PENDING',
        totalAmount: 25.50,
        customer: { id: 'cust_1', name: 'John Doe' },
        restaurant: { id: 'rest_1', name: 'Pizza Paradise' },
      };

      mockOrderService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne('order_123');

      expect(result).toEqual(mockOrder);
      expect(service.findOne).toHaveBeenCalledWith('order_123');
    });
  });

  describe('create', () => {
    it('should create new order', async () => {
      const createDto = {
        customerId: 'cust_1',
        restaurantId: 'rest_1',
        items: [{ dishId: 'dish_1', quantity: 2 }],
        totalAmount: 25.50,
      };

      const mockCreatedOrder = {
        id: 'order_new',
        ...createDto,
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockOrderService.create.mockResolvedValue(mockCreatedOrder);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreatedOrder);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const updateDto = { status: 'CONFIRMED' as const };
      const mockUpdatedOrder = {
        id: 'order_123',
        status: 'CONFIRMED',
        totalAmount: 25.50,
      };

      mockOrderService.updateStatus.mockResolvedValue(mockUpdatedOrder);

      const result = await controller.updateStatus('order_123', updateDto);

      expect(result).toEqual(mockUpdatedOrder);
      expect(service.updateStatus).toHaveBeenCalledWith('order_123', 'CONFIRMED', undefined);
    });
  });

  describe('getMyOrders', () => {
    it('should return user orders', async () => {
      const mockUser = { id: 'user_123', role: 'CUSTOMER' };
      const mockOrders = {
        data: [
          { id: 'order_1', status: 'DELIVERED' },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      mockOrderService.findAll.mockResolvedValue(mockOrders);

      const result = await controller.getMyOrders('user_123');

      expect(result).toEqual(mockOrders);
      expect(service.findAll).toHaveBeenCalledWith({ customerId: 'user_123' });
    });
  });
});
