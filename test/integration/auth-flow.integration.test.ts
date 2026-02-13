import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../backend/src/app.module';

describe('Authentication Flow (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register new customer', async () => {
      const registerDto = {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'Test User',
        phone: '+43 664 1234567',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user.role).toBe('CUSTOMER');
    });

    it('should validate email format', async () => {
      const invalidDto = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(invalidDto)
        .expect(400);
    });

    it('should enforce password strength', async () => {
      const weakPasswordDto = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(weakPasswordDto)
        .expect(400);
    });

    it('should reject duplicate email', async () => {
      const registerDto = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerDto)
        .expect(201);

      // Duplicate registration
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;

    beforeAll(async () => {
      // Create test user
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `login-test-${Date.now()}@example.com`,
          password: 'TestPass123!',
          name: 'Login Test User',
        });

      testUser = response.body.user;
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPass123!',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
    });

    it('should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPass123!',
        })
        .expect(401);
    });

    it('should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token', async () => {
      // First, login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
        });

      const refreshToken = loginResponse.body.refreshToken;

      // Refresh token
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    it('should return user with valid token', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
        });

      const token = loginResponse.body.accessToken;

      // Get user info
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.email).toBe('test@example.com');
    });

    it('should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
