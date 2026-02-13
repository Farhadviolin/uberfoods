/**
 * IBAN Validierung für Frontend
 */
export class IbanValidator {
  static validate(iban: string): boolean {
    if (!iban) return false;
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    if (cleaned.length < 15 || cleaned.length > 34) return false;
    if (!/^[A-Z]{2}/.test(cleaned)) return false;

    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, (char) => {
      return (char.charCodeAt(0) - 55).toString();
    });

    let remainder = '';
    for (let i = 0; i < numeric.length; i++) {
      remainder = (remainder + numeric[i]).slice(-9);
      remainder = (parseInt(remainder, 10) % 97).toString();
    }

    return parseInt(remainder, 10) === 1;
  }

  static format(iban: string): string {
    if (!iban) return '';
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  }

  static validateBic(bic: string): boolean {
    if (!bic) return false;
    const cleaned = bic.replace(/\s/g, '').toUpperCase();
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned);
  }
}

