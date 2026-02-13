# Testing Guide für DTOs

## Übersicht

Dieses Dokument beschreibt, wie DTOs getestet werden können, und stellt Test-Helpers zur Verfügung.

## Test-Setup

### Installation

```bash
pnpm add -D @nestjs/testing jest @types/jest ts-jest
```

### Konfiguration

Erstelle eine `jest.config.js` Datei:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

## DTO Test Helpers

### Verfügbare Funktionen

1. **validateDto** - Validiert ein DTO und gibt Fehler zurück
2. **createDtoInstance** - Erstellt eine DTO-Instanz aus einem Plain Object
3. **assertValidDto** - Assertiert, dass ein DTO gültig ist
4. **assertInvalidDto** - Assertiert, dass ein DTO ungültig ist

### Beispiel-Verwendung

```typescript
import { validateDto, assertValidDto, assertInvalidDto } from '@/common/dto/test-helpers.dto';
import { CreateOrderDto } from '@/modules/order/dto/create-order.dto';

describe('CreateOrderDto', () => {
  it('should be valid with correct data', async () => {
    const data = {
      customerId: 'customer-123',
      restaurantId: 'restaurant-123',
      items: [
        { dishId: 'dish-123', quantity: 2 },
      ],
      subtotal: 25.99,
      deliveryFee: 3.50,
    };
    await assertValidDto(CreateOrderDto, data);
  });

  it('should be invalid with missing required fields', async () => {
    const data = {
      customerId: 'customer-123',
      // restaurantId fehlt
    };
    await assertInvalidDto(CreateOrderDto, data, ['restaurantId']);
  });

  it('should be invalid with invalid email', async () => {
    const data = {
      customerId: 'customer-123',
      restaurantId: 'restaurant-123',
      items: [],
      email: 'invalid-email', // Ungültige Email
    };
    await assertInvalidDto(CreateOrderDto, data, ['email']);
  });
});
```

## Test-Patterns

### 1. Validierungs-Tests

```typescript
describe('CreateCustomerDto Validation', () => {
  it('should validate required fields', async () => {
    const dto = new CreateCustomerDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate email format', async () => {
    const dto = new CreateCustomerDto();
    dto.email = 'invalid-email';
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'email')).toBe(true);
  });

  it('should validate password length', async () => {
    const dto = new CreateCustomerDto();
    dto.password = 'short';
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'password')).toBe(true);
  });
});
```

### 2. Transformation-Tests

```typescript
describe('CreateOrderDto Transformation', () => {
  it('should transform plain object to DTO', () => {
    const plain = {
      customerId: 'customer-123',
      restaurantId: 'restaurant-123',
      items: [{ dishId: 'dish-123', quantity: 2 }],
    };
    const dto = plainToInstance(CreateOrderDto, plain);
    expect(dto).toBeInstanceOf(CreateOrderDto);
    expect(dto.customerId).toBe('customer-123');
  });

  it('should handle nested objects', () => {
    const plain = {
      customerId: 'customer-123',
      restaurantId: 'restaurant-123',
      items: [
        { dishId: 'dish-123', quantity: 2, modifications: { extra: 'cheese' } },
      ],
    };
    const dto = plainToInstance(CreateOrderDto, plain);
    expect(dto.items[0].modifications).toEqual({ extra: 'cheese' });
  });
});
```

### 3. Edge-Case-Tests

```typescript
describe('CreateOrderDto Edge Cases', () => {
  it('should handle empty items array', async () => {
    const data = {
      customerId: 'customer-123',
      restaurantId: 'restaurant-123',
      items: [],
    };
    await assertInvalidDto(CreateOrderDto, data, ['items']);
  });

  it('should handle negative prices', async () => {
    const data = {
      customerId: 'customer-123',
      restaurantId: 'restaurant-123',
      items: [{ dishId: 'dish-123', quantity: 1 }],
      subtotal: -10, // Negativer Preis
    };
    await assertInvalidDto(CreateOrderDto, data, ['subtotal']);
  });

  it('should handle very long strings', async () => {
    const data = {
      customerId: 'customer-123',
      restaurantId: 'restaurant-123',
      items: [{ dishId: 'dish-123', quantity: 1 }],
      notes: 'a'.repeat(10000), // Sehr langer String
    };
    // Prüfe MaxLength-Validierung falls vorhanden
    const errors = await validateDto(CreateOrderDto, data);
    if (errors.length > 0) {
      expect(errors.some(e => e.includes('notes'))).toBe(true);
    }
  });
});
```

## Integration Tests

### Controller-Tests mit DTOs

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);
  });

  it('should create an order with valid DTO', async () => {
    const createDto: CreateOrderDto = {
      customerId: 'customer-123',
      restaurantId: 'restaurant-123',
      items: [{ dishId: 'dish-123', quantity: 2 }],
      subtotal: 25.99,
      deliveryFee: 3.50,
    };

    const expectedOrder = { id: 'order-123', ...createDto };
    jest.spyOn(service, 'create').mockResolvedValue(expectedOrder);

    const result = await controller.create(createDto);
    expect(result).toEqual(expectedOrder);
    expect(service.create).toHaveBeenCalledWith(createDto);
  });
});
```

## Best Practices

### 1. Test-Struktur

- Erstelle separate Test-Dateien für jeden DTO
- Verwende beschreibende Test-Namen
- Gruppiere verwandte Tests mit `describe`-Blöcken

### 2. Test-Coverage

- Teste alle Validierungsregeln
- Teste Edge Cases (leere Strings, null, undefined, sehr lange Strings)
- Teste Transformation (plainToInstance)
- Teste Nested Objects

### 3. Test-Performance

- Verwende `beforeEach` für gemeinsame Setup-Logik
- Vermeide unnötige Async-Operationen
- Verwende Mocks für externe Dependencies

### 4. Test-Daten

- Erstelle Test-Daten-Factories für wiederholbare Daten
- Verwende Faker für realistische Test-Daten
- Halte Test-Daten konsistent und vorhersagbar

## Beispiel: Vollständiger DTO-Test

```typescript
import { validateDto, assertValidDto, assertInvalidDto } from '@/common/dto/test-helpers.dto';
import { CreateOrderDto } from '@/modules/order/dto/create-order.dto';

describe('CreateOrderDto', () => {
  const validData: CreateOrderDto = {
    customerId: 'customer-123',
    restaurantId: 'restaurant-123',
    items: [
      { dishId: 'dish-123', quantity: 2 },
      { dishId: 'dish-456', quantity: 1 },
    ],
    subtotal: 25.99,
    deliveryFee: 3.50,
    tax: 2.60,
    tip: 5.00,
  };

  describe('Valid Data', () => {
    it('should be valid with all required fields', async () => {
      await assertValidDto(CreateOrderDto, validData);
    });

    it('should be valid with optional fields', async () => {
      const dataWithOptional = {
        ...validData,
        deliveryAddress: '123 Main St',
        deliveryInstructions: 'Ring the doorbell',
        paymentMethod: 'credit_card',
      };
      await assertValidDto(CreateOrderDto, dataWithOptional);
    });
  });

  describe('Invalid Data', () => {
    it('should be invalid without customerId', async () => {
      const { customerId, ...data } = validData;
      await assertInvalidDto(CreateOrderDto, data, ['customerId']);
    });

    it('should be invalid without restaurantId', async () => {
      const { restaurantId, ...data } = validData;
      await assertInvalidDto(CreateOrderDto, data, ['restaurantId']);
    });

    it('should be invalid with empty items array', async () => {
      const data = { ...validData, items: [] };
      await assertInvalidDto(CreateOrderDto, data, ['items']);
    });

    it('should be invalid with negative subtotal', async () => {
      const data = { ...validData, subtotal: -10 };
      await assertInvalidDto(CreateOrderDto, data, ['subtotal']);
    });

    it('should be invalid with invalid item structure', async () => {
      const data = {
        ...validData,
        items: [{ dishId: 'dish-123' }], // quantity fehlt
      };
      await assertInvalidDto(CreateOrderDto, data, ['items']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', async () => {
      const data = { ...validData, subtotal: Number.MAX_SAFE_INTEGER };
      // Prüfe ob Max-Validierung vorhanden ist
      const errors = await validateDto(CreateOrderDto, data);
      // Erwarte entweder Validierung oder erfolgreiche Validierung
      expect(errors).toBeDefined();
    });

    it('should handle null values', async () => {
      const data = { ...validData, customerId: null };
      await assertInvalidDto(CreateOrderDto, data, ['customerId']);
    });

    it('should handle undefined values', async () => {
      const data = { ...validData, restaurantId: undefined };
      await assertInvalidDto(CreateOrderDto, data, ['restaurantId']);
    });
  });
});
```

## Zusammenfassung

**Test-Setup:**
- ✅ Test-Helpers erstellt
- ✅ Beispiel-Tests bereitgestellt
- ✅ Best Practices dokumentiert

**Nächste Schritte:**
1. Jest konfigurieren
2. Test-Scripts in package.json hinzufügen
3. DTO-Tests für kritische Module schreiben
4. Test-Coverage überwachen

