import { IsString, IsEmail, MinLength } from 'class-validator';
import {
  validateDto,
  createDtoInstance,
  assertValidDto,
  assertInvalidDto,
} from '../test-helpers.dto';

// Test DTO class
class TestUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

describe('DTO Test Helpers', () => {
  describe('validateDto', () => {
    it('should return empty array for valid DTO', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: process.env.TEST_DTO_PASSWORD || `test-dto-pw-${Date.now()}`,
      };
      const errors = await validateDto(TestUserDto, data);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid DTO', async () => {
      const data = {
        name: '',
        email: 'invalid-email',
        password: 'short',
      };
      const errors = await validateDto(TestUserDto, data);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('createDtoInstance', () => {
    it('should create DTO instance from plain object', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: process.env.TEST_DTO_PASSWORD || `test-dto-pw-${Date.now()}`,
      };
      const dto = createDtoInstance(TestUserDto, data);
      expect(dto).toBeInstanceOf(TestUserDto);
      expect(dto.name).toBe('John Doe');
      expect(dto.email).toBe('john@example.com');
    });
  });

  describe('assertValidDto', () => {
    it('should not throw for valid DTO', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: process.env.TEST_PASSWORD ?? `TestPw${Date.now()}!`,
      };
      await expect(assertValidDto(TestUserDto, data)).resolves.not.toThrow();
    });

    it('should throw for invalid DTO', async () => {
      const data = {
        name: '',
        email: 'invalid-email',
        password: 'short',
      };
      await expect(assertValidDto(TestUserDto, data)).rejects.toThrow();
    });
  });

  describe('assertInvalidDto', () => {
    it('should not throw for invalid DTO', async () => {
      const data = {
        name: '',
        email: 'invalid-email',
        password: 'short',
      };
      await expect(assertInvalidDto(TestUserDto, data)).resolves.not.toThrow();
    });

    it('should throw for valid DTO', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: process.env.TEST_PASSWORD ?? `TestPw${Date.now()}!`,
      };
      await expect(assertInvalidDto(TestUserDto, data)).rejects.toThrow();
    });

    it('should check for expected errors', async () => {
      const data = {
        name: '',
        email: 'invalid-email',
        password: 'short',
      };
      await expect(
        assertInvalidDto(TestUserDto, data, ['email', 'password']),
      ).resolves.not.toThrow();
    });
  });
});

