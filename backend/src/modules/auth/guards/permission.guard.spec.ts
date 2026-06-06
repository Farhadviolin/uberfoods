import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { RbacService } from '../../rbac/rbac.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;
  let rbacService: RbacService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockRBACService = {
    getUserPermissions: jest.fn(),
    incrementPermissionDenial: jest.fn(),
  };

  const mockPrismaService = {
    admin: {
      findUnique: jest.fn(),
    },
  };

  const createMockContext = (user: any) => {
    const request = {
      user,
    };

    const handler = {};
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
        PermissionGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: RbacService,
          useValue: mockRBACService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
    rbacService = module.get<RbacService>(RbacService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no permissions are required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const context = createMockContext({ id: 'user-1', role: 'ADMIN' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockRBACService.getUserPermissions).not.toHaveBeenCalled();
  });

  it('should allow access for SUPER_ADMIN without checking permissions', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['order:read']);
    const context = createMockContext({ id: 'user-1', role: 'SUPER_ADMIN' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockRBACService.getUserPermissions).not.toHaveBeenCalled();
  });

  it('should allow access when user has exact permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['order:read']);
    mockRBACService.getUserPermissions.mockResolvedValue(['order:read', 'order:update']);
    const context = createMockContext({ id: 'user-1', role: 'ADMIN' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockRBACService.getUserPermissions).toHaveBeenCalledWith('user-1', 'ADMIN');
  });

  it('should allow access when user has wildcard permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['order:read']);
    mockRBACService.getUserPermissions.mockResolvedValue(['order:*']);
    const context = createMockContext({ id: 'user-1', role: 'ADMIN' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user does not have required permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['order:delete']);
    mockRBACService.getUserPermissions.mockResolvedValue(['order:read', 'order:update']);
    const context = createMockContext({ id: 'user-1', role: 'MODERATOR' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not authenticated', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['order:read']);
    const context = createMockContext(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should check all required permissions', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['order:read', 'order:update']);
    mockRBACService.getUserPermissions.mockResolvedValue(['order:read', 'order:update', 'order:delete']);
    const context = createMockContext({ id: 'user-1', role: 'ADMIN' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user is missing any required permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['order:read', 'order:delete']);
    mockRBACService.getUserPermissions.mockResolvedValue(['order:read', 'order:update']);
    const context = createMockContext({ id: 'user-1', role: 'MODERATOR' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should handle errors gracefully', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['order:read']);
    mockRBACService.getUserPermissions.mockRejectedValue(new Error('Database error'));
    const context = createMockContext({ id: 'user-1', role: 'ADMIN' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

