import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockContext = (user: any, requiredRoles?: string[]) => {
    const request = {
      user,
    };

    const handler = {};
    if (requiredRoles) {
      Reflect.defineMetadata(ROLES_KEY, requiredRoles, handler);
    }

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => handler,
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    return context;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const context = createMockContext({ id: 'user-1', role: 'ADMIN' });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'SUPER_ADMIN']);
    const context = createMockContext({ id: 'user-1', role: 'ADMIN' });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access when user has SUPER_ADMIN role (SUPER_ADMIN has access to all roles)', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MODERATOR']);
    const context = createMockContext({ id: 'user-1', role: 'SUPER_ADMIN' });

    // SUPER_ADMIN should have access even if not explicitly in required roles
    // This test verifies that SUPER_ADMIN is treated specially
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user does not have required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN']);
    const context = createMockContext({ id: 'user-1', role: 'MODERATOR' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not authenticated', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should handle case-insensitive role comparison', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createMockContext({ id: 'user-1', role: 'ADMIN' });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access when user role matches any of the required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MODERATOR', 'SUPPORT']);
    const context = createMockContext({ id: 'user-1', role: 'MODERATOR' });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });
});

