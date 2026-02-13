/**
 * IBAN Validierung nach ISO 13616 Standard
 * Unterstützt alle SEPA-Länder
 */
export class IbanValidator {
  /**
   * Validiert eine IBAN
   * @param iban - Die zu validierende IBAN
   * @returns true wenn gültig, false sonst
   */
  static validate(iban: string): boolean {
    if (!iban) return false;

    // Entferne Leerzeichen und konvertiere zu Großbuchstaben
    const cleaned = iban.replace(/\s/g, "").toUpperCase();

    // IBAN muss zwischen 15 und 34 Zeichen lang sein
    if (cleaned.length < 15 || cleaned.length > 34) {
      return false;
    }

    // IBAN muss mit 2 Buchstaben (Ländercode) beginnen
    if (!/^[A-Z]{2}/.test(cleaned)) {
      return false;
    }

    // Modulo 97 Prüfung
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, (char) => {
      return (char.charCodeAt(0) - 55).toString();
    });

    // Berechne Modulo 97
    let remainder = "";
    for (let i = 0; i < numeric.length; i++) {
      remainder = (remainder + numeric[i]).slice(-9);
      remainder = (parseInt(remainder, 10) % 97).toString();
    }

    return parseInt(remainder, 10) === 1;
  }

  /**
   * Formatiert eine IBAN für die Anzeige (4er-Blöcke)
   * @param iban - Die zu formatierende IBAN
   * @returns Formatierte IBAN
   */
  static format(iban: string): string {
    if (!iban) return "";
    const cleaned = iban.replace(/\s/g, "").toUpperCase();
    return cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
  }

  /**
   * Extrahiert den Ländercode aus einer IBAN
   * @param iban - Die IBAN
   * @returns Ländercode (z.B. 'AT', 'DE')
   */
  static getCountryCode(iban: string): string | null {
    if (!iban) return null;
    const cleaned = iban.replace(/\s/g, "").toUpperCase();
    const match = cleaned.match(/^([A-Z]{2})/);
    return match ? match[1] : null;
  }

  /**
   * Validiert BIC (Bank Identifier Code)
   * @param bic - Die zu validierende BIC
   * @returns true wenn gültig, false sonst
   */
  static validateBic(bic: string): boolean {
    if (!bic) return false;
    const cleaned = bic.replace(/\s/g, "").toUpperCase();
    // BIC ist 8 oder 11 Zeichen lang
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned);
  }
}
