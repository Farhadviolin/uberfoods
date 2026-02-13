import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    service.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', () => {
      service.set('test-key', 'test-value', 60000);
      const value = service.get<string>('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent key', () => {
      const value = service.get('non-existent');
      expect(value).toBeNull();
    });

    it('should check if key exists', () => {
      service.set('test-key', 'test-value', 60000);
      expect(service.has('test-key')).toBe(true);
      expect(service.has('non-existent')).toBe(false);
    });

    it('should delete a key', () => {
      service.set('test-key', 'test-value', 60000);
      service.delete('test-key');
      expect(service.has('test-key')).toBe(false);
    });

    it('should clear all cache', () => {
      service.set('key1', 'value1', 60000);
      service.set('key2', 'value2', 60000);
      service.clear();
      expect(service.size()).toBe(0);
    });
  });

  describe('TTL', () => {
    it('should expire entries after TTL', (done) => {
      service.set('test-key', 'test-value', 100); // 100ms TTL
      setTimeout(() => {
        const value = service.get('test-key');
        expect(value).toBeNull();
        done();
      }, 150);
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete entries matching pattern', () => {
      service.set('user:1', 'value1', 60000);
      service.set('user:2', 'value2', 60000);
      service.set('order:1', 'value3', 60000);
      service.deletePattern('user:.*');
      expect(service.has('user:1')).toBe(false);
      expect(service.has('user:2')).toBe(false);
      expect(service.has('order:1')).toBe(true);
    });
  });

  describe('Tags', () => {
    it('should set cache with tags', () => {
      service.set('key1', 'value1', 60000, ['tag1', 'tag2']);
      expect(service.has('key1')).toBe(true);
    });

    it('should delete entries by tag', () => {
      service.set('key1', 'value1', 60000, ['tag1']);
      service.set('key2', 'value2', 60000, ['tag2']);
      service.set('key3', 'value3', 60000, ['tag1']);
      service.deleteByTag('tag1');
      expect(service.has('key1')).toBe(false);
      expect(service.has('key2')).toBe(true);
      expect(service.has('key3')).toBe(false);
    });

    it('should delete entries by multiple tags', () => {
      service.set('key1', 'value1', 60000, ['tag1']);
      service.set('key2', 'value2', 60000, ['tag2']);
      service.set('key3', 'value3', 60000, ['tag3']);
      service.deleteByTags(['tag1', 'tag2']);
      expect(service.has('key1')).toBe(false);
      expect(service.has('key2')).toBe(false);
      expect(service.has('key3')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should get cache statistics', () => {
      service.set('key1', 'value1', 60000);
      service.set('key2', 'value2', 60000);
      service.get('key1'); // Hit
      service.get('non-existent'); // Miss

      const stats = service.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalHits).toBeGreaterThan(0);
      expect(stats.totalMisses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
    });

    it('should get top keys', () => {
      service.set('key1', 'value1', 60000);
      service.set('key2', 'value2', 60000);
      service.get('key1');
      service.get('key1'); // Multiple hits
      service.get('key2');

      const topKeys = service.getTopKeys(10);
      expect(Array.isArray(topKeys)).toBe(true);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with data', async () => {
      const warmupData = [
        { key: 'key1', value: 'value1', ttl: 60000 },
        { key: 'key2', value: 'value2', ttl: 60000 },
      ];

      const warmed = await service.warmCache(warmupData);
      expect(warmed).toBeGreaterThan(0);
      expect(service.has('key1')).toBe(true);
      expect(service.has('key2')).toBe(true);
    });
  });

  describe('Preloading', () => {
    it('should preload cache entries', async () => {
      const loader = jest.fn((key: string) => Promise.resolve(`value-${key}`));
      const keys = ['key1', 'key2'];

      const preloaded = await service.preload(loader, keys, 60000);
      expect(preloaded).toBeGreaterThan(0);
      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

  describe('Optimization', () => {
    it('should optimize cache by removing least used entries', () => {
      // Fill cache beyond max size
      for (let i = 0; i < 150; i++) {
        service.set(`key${i}`, `value${i}`, 60000);
      }

      const removed = service.optimize(100);
      expect(removed).toBeGreaterThan(0);
      expect(service.size()).toBeLessThanOrEqual(100);
    });
  });
});

