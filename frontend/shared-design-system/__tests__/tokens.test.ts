import { facebookTokens, responsiveTokens } from '../tokens';

describe('Design Tokens', () => {
  describe('facebookTokens', () => {
    it('should have color palette', () => {
      expect(facebookTokens.colors).toBeDefined();
      expect(facebookTokens.colors.primary).toBeDefined();
      expect(facebookTokens.colors.secondary).toBeDefined();
    });

    it('should have typography scale', () => {
      expect(facebookTokens.typography).toBeDefined();
      expect(facebookTokens.typography.fontSize).toBeDefined();
      expect(facebookTokens.typography.fontFamily).toBeDefined();
    });

    it('should have spacing scale', () => {
      expect(facebookTokens.spacing).toBeDefined();
      expect(typeof facebookTokens.spacing.xs).toBe('string');
    });

    it('should have border radius values', () => {
      expect(facebookTokens.borderRadius).toBeDefined();
      expect(typeof facebookTokens.borderRadius.small).toBe('string');
    });
  });

  describe('responsiveTokens', () => {
    it('should have breakpoints', () => {
      expect(responsiveTokens.breakpoints).toBeDefined();
      expect(responsiveTokens.breakpoints.mobile).toBeDefined();
      expect(responsiveTokens.breakpoints.tablet).toBeDefined();
      expect(responsiveTokens.breakpoints.desktop).toBeDefined();
    });

    it('should have responsive spacing', () => {
      expect(responsiveTokens.spacing).toBeDefined();
      expect(responsiveTokens.spacing.mobile).toBeDefined();
      expect(responsiveTokens.spacing.tablet).toBeDefined();
    });
  });
});