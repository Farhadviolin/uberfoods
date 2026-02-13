import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

/**
 * Validiert dass ein Wert eine gültige UUID ist
 */
export function IsUUID(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isUUID",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return typeof value === "string" && uuidRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} muss eine gültige UUID sein`;
        },
      },
    });
  };
}

/**
 * Validiert dass ein Wert eine gültige Telefonnummer ist
 */
export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isPhoneNumber",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const phoneRegex =
            /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
          return typeof value === "string" && phoneRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} muss eine gültige Telefonnummer sein`;
        },
      },
    });
  };
}

/**
 * Validiert dass ein Wert eine gültige Postleitzahl ist (DE/AT)
 */
export function IsPostalCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isPostalCode",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const postalCodeRegex = /^[0-9]{4,5}$/;
          return typeof value === "string" && postalCodeRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} muss eine gültige Postleitzahl sein`;
        },
      },
    });
  };
}

/**
 * Validiert dass ein Wert eine gültige IBAN ist
 */
export function IsIBAN(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isIBAN",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/;
          return (
            typeof value === "string" &&
            ibanRegex.test(value.replace(/\s/g, ""))
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} muss eine gültige IBAN sein`;
        },
      },
    });
  };
}

/**
 * Validiert dass ein Wert eine gültige Koordinate ist (Lat/Lng)
 */
export function IsCoordinate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isCoordinate",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === "number" && value >= -180 && value <= 180;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} muss eine gültige Koordinate zwischen -180 und 180 sein`;
        },
      },
    });
  };
}

/**
 * Validiert dass ein Wert eine gültige Zeit ist (HH:MM Format)
 */
export function IsTime(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isTime",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          return typeof value === "string" && timeRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} muss eine gültige Zeit im Format HH:MM sein`;
        },
      },
    });
  };
}

/**
 * Validiert dass ein Wert eine gültige URL ist
 */
export function IsURL(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isURL",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} muss eine gültige URL sein`;
        },
      },
    });
  };
}

/**
 * Validiert dass ein Wert eine gültige Steuernummer ist (DE/AT)
 */
export function IsTaxId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isTaxId",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Vereinfachte Validierung - in Production: richtige Steuernummer-Validierung
          const taxIdRegex = /^[0-9]{1,15}$/;
          return typeof value === "string" && taxIdRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} muss eine gültige Steuernummer sein`;
        },
      },
    });
  };
}
