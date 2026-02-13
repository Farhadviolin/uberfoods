import { IbanValidator } from '../ibanValidator';

describe('IbanValidator', () => {
  describe('validate', () => {
    it('validiert gültige IBANs', () => {
      // Deutsche IBAN (Beispiel)
      expect(IbanValidator.validate('DE89370400440532013000')).toBe(true);
      // Österreichische IBAN
      expect(IbanValidator.validate('AT611904300234573201')).toBe(true);
      // Britische IBAN
      expect(IbanValidator.validate('GB29 NWBK 6016 1331 9268 19')).toBe(true);
      // Französische IBAN
      expect(IbanValidator.validate('FR1420041010050500013M02606')).toBe(true);
    });

    it('lehnt ungültige IBANs ab', () => {
      expect(IbanValidator.validate('')).toBe(false);
      expect(IbanValidator.validate('INVALID')).toBe(false);
      expect(IbanValidator.validate('DE89370400440532013001')).toBe(false); // Falsche Prüfziffer
      expect(IbanValidator.validate('XX89370400440532013000')).toBe(false); // Ungültiges Land
      expect(IbanValidator.validate('DE893704004405320130001234567890123456789')).toBe(false); // Zu lang
    });

    it('handhabt verschiedene Formate', () => {
      // Mit Leerzeichen
      expect(IbanValidator.validate('DE89 3704 0044 0532 0130 00')).toBe(true);
      // Kleinbuchstaben
      expect(IbanValidator.validate('de89370400440532013000')).toBe(true);
      // Gemischt
      expect(IbanValidator.validate('De89 3704 0044 0532 0130 00')).toBe(true);
    });

    it('validiert Längenbeschränkungen', () => {
      // Zu kurz
      expect(IbanValidator.validate('DE123')).toBe(false);
      // Zu lang
      expect(IbanValidator.validate('DE893704004405320130001234567890123456789012345678901234567890')).toBe(false);
      // Minimale Länge (15)
      expect(IbanValidator.validate('NO9386011117947')).toBe(true);
      // Maximale Länge (34)
      expect(IbanValidator.validate('BR9700360305000010009795493P1')).toBe(true);
    });

    it('prüft Ländercode', () => {
      expect(IbanValidator.validate('DE89370400440532013000')).toBe(true);
      expect(IbanValidator.validate('AT611904300234573201')).toBe(true);
      expect(IbanValidator.validate('99INVALIDLANCODE')).toBe(false);
      expect(IbanValidator.validate('123456789012345678')).toBe(false);
    });

    it('handhabt Edge-Cases', () => {
      expect(IbanValidator.validate(null as any)).toBe(false);
      expect(IbanValidator.validate(undefined as any)).toBe(false);
      expect(IbanValidator.validate('   ')).toBe(false);
      expect(IbanValidator.validate('DE 89 37 04 00 44 05 32 01 30 00')).toBe(true);
    });

    it('validiert bekannte Test-IBANs', () => {
      // Deutsche Test-IBANs
      expect(IbanValidator.validate('DE02100500000054540402')).toBe(true);
      expect(IbanValidator.validate('DE02500105170137075030')).toBe(true);

      // Belgische Test-IBAN
      expect(IbanValidator.validate('BE68539007547034')).toBe(true);

      // Niederländische Test-IBAN
      expect(IbanValidator.validate('NL91ABNA0417164300')).toBe(true);
    });
  });

  describe('format', () => {
    it('formatiert IBANs mit Leerzeichen', () => {
      expect(IbanValidator.format('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
      expect(IbanValidator.format('AT611904300234573201')).toBe('AT61 1904 3002 3457 3201');
    });

    it('bereinigt vorhandene Leerzeichen vor Formatierung', () => {
      expect(IbanValidator.format('DE89 3704 0044 0532 0130 00')).toBe('DE89 3704 0044 0532 0130 00');
      expect(IbanValidator.format('  DE89370400440532013000  ')).toBe('DE89 3704 0044 0532 0130 00');
    });

    it('konvertiert zu Großbuchstaben', () => {
      expect(IbanValidator.format('de89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
      expect(IbanValidator.format('De89 3704 0044 0532 0130 00')).toBe('DE89 3704 0044 0532 0130 00');
    });

    it('handhabt Edge-Cases', () => {
      expect(IbanValidator.format('')).toBe('');
      expect(IbanValidator.format(null as any)).toBe('');
      expect(IbanValidator.format(undefined as any)).toBe('');
      expect(IbanValidator.format('   ')).toBe('');
    });

    it('formatiert kurze IBANs', () => {
      expect(IbanValidator.format('NO9386011117947')).toBe('NO93 8601 1117 947');
    });

    it('formatiert lange IBANs', () => {
      expect(IbanValidator.format('BR9700360305000010009795493P1')).toBe('BR97 0036 0305 0000 1000 9795 493P 1');
    });
  });

  describe('validateBic', () => {
    it('validiert gültige BICs', () => {
      expect(IbanValidator.validateBic('DEUTDEFF')).toBe(true);
      expect(IbanValidator.validateBic('DEUTDEFF500')).toBe(true);
      expect(IbanValidator.validateBic('DEUT DE FF')).toBe(true); // Mit Leerzeichen
      expect(IbanValidator.validateBic('deutdeff')).toBe(true); // Kleinbuchstaben
    });

    it('lehnt ungültige BICs ab', () => {
      expect(IbanValidator.validateBic('')).toBe(false);
      expect(IbanValidator.validateBic('INVALID')).toBe(false);
      expect(IbanValidator.validateBic('DEUT')).toBe(false); // Zu kurz
      expect(IbanValidator.validateBic('DEUTDEFF5001')).toBe(false); // Zu lang
      expect(IbanValidator.validateBic('1234DEFF')).toBe(false); // Zahlen am Anfang
      expect(IbanValidator.validateBic('DEUT_DEF_F')).toBe(false); // Ungültige Zeichen
    });

    it('validiert BIC-Struktur', () => {
      // Bank Code (4 Buchstaben)
      expect(IbanValidator.validateBic('ABCD')).toBe(false); // Nur Bank Code
      expect(IbanValidator.validateBic('ABCDXY')).toBe(false); // Bank Code + Country

      // Bank Code + Country Code (6 Buchstaben)
      expect(IbanValidator.validateBic('ABCDXY')).toBe(false); // Fehlt Location Code

      // Vollständiger BIC (8 Zeichen)
      expect(IbanValidator.validateBic('ABCDXY12')).toBe(true);

      // BIC mit Branch Code (11 Zeichen)
      expect(IbanValidator.validateBic('ABCDXY12ABC')).toBe(true);
    });

    it('handhabt Leerzeichen und Groß-/Kleinschreibung', () => {
      expect(IbanValidator.validateBic('DEUT DE FF')).toBe(true);
      expect(IbanValidator.validateBic('deutdeff')).toBe(true);
      expect(IbanValidator.validateBic('DeUtDeFf')).toBe(true);
    });

    it('handhabt Edge-Cases', () => {
      expect(IbanValidator.validateBic(null as any)).toBe(false);
      expect(IbanValidator.validateBic(undefined as any)).toBe(false);
      expect(IbanValidator.validateBic('   ')).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('kann IBAN formatieren und dann validieren', () => {
      const rawIban = 'DE89370400440532013000';
      const formatted = IbanValidator.format(rawIban);
      expect(IbanValidator.validate(formatted)).toBe(true);
    });

    it('validiert verschiedene europäische IBANs', () => {
      const testIbans = [
        'DE89370400440532013000', // Deutschland
        'AT611904300234573201',   // Österreich
        'CH9300762011623852957',  // Schweiz
        'NL91ABNA0417164300',     // Niederlande
        'BE68539007547034',       // Belgien
        'FR1420041010050500013M02606', // Frankreich
        'GB29NWBK60161331926819', // Großbritannien
        'IT60X0542811101000000123456', // Italien
        'ES9121000418450200051332', // Spanien
        'PT50000201231234567890154', // Portugal
      ];

      testIbans.forEach(iban => {
        expect(IbanValidator.validate(iban)).toBe(true);
      });
    });

    it('kann mit verschiedenen Eingabeformaten umgehen', () => {
      const iban = 'DE89370400440532013000';

      // Verschiedene Formate sollten alle validiert werden
      expect(IbanValidator.validate(iban)).toBe(true);
      expect(IbanValidator.validate(iban.toLowerCase())).toBe(true);
      expect(IbanValidator.validate(IbanValidator.format(iban))).toBe(true);

      // BIC Tests
      expect(IbanValidator.validateBic('DEUTDEFF')).toBe(true);
      expect(IbanValidator.validateBic('deut de ff')).toBe(true);
    });
  });
});