const ADDRESS_FIELD_KEYS = [
  'address',
  'deliveryAddress',
  'street',
  'streetAddress',
  'addressLine1',
  'addressLine2',
  'houseNumber',
  'postalCode',
  'postcode',
  'zip',
  'city',
  'state',
  'country',
] as const;

function trimToString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function joinAddressParts(parts: unknown[]): string {
  return parts
    .map(trimToString)
    .filter((part) => part.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasMeaningfulStructuredAddress(candidate: Record<string, unknown>): boolean {
  return Boolean(
    trimToString(candidate.street)
    || trimToString(candidate.streetAddress)
    || trimToString(candidate.addressLine1)
    || trimToString(candidate.deliveryAddress)
    || trimToString(candidate.address)
    || joinAddressParts([
      candidate.street,
      candidate.streetAddress,
      candidate.addressLine1,
      candidate.houseNumber,
      candidate.addressLine2,
      candidate.postalCode,
      candidate.postcode,
      candidate.zip,
      candidate.city,
      candidate.country,
    ]),
  );
}

export function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'string' ? parseMaybeJson(parsed) : parsed;
  } catch {
    return trimmed;
  }
}

export function extractAddressString(value: unknown, seen = new Set<unknown>()): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (!value || typeof value !== 'object' || seen.has(value)) {
    return '';
  }

  seen.add(value);
  const candidate = value as Record<string, unknown>;

  const directAddress = trimToString(candidate.address);
  if (directAddress) {
    return directAddress;
  }

  const directDeliveryAddress = trimToString(candidate.deliveryAddress);
  if (directDeliveryAddress) {
    return directDeliveryAddress;
  }

  const recursiveTargets = [
    candidate.user,
    candidate.customer,
    candidate.profile,
    candidate.data,
    candidate.checkout,
    candidate.delivery,
    candidate.addressObject,
  ];

  for (const target of recursiveTargets) {
    const extracted = extractAddressString(target, seen);
    if (extracted) {
      return extracted;
    }
  }

  const structured = joinAddressParts([
    candidate.street,
    candidate.streetAddress,
    candidate.addressLine1,
    candidate.addressLine2,
    candidate.houseNumber,
    candidate.postalCode,
    candidate.postcode,
    candidate.zip,
    candidate.city,
    candidate.state,
    candidate.country,
  ]);
  if (structured) {
    return structured;
  }

  if (hasMeaningfulStructuredAddress(candidate)) {
    return joinAddressParts([
      candidate.street,
      candidate.streetAddress,
      candidate.addressLine1,
      candidate.addressLine2,
      candidate.houseNumber,
      candidate.postalCode,
      candidate.postcode,
      candidate.zip,
      candidate.city,
      candidate.state,
      candidate.country,
    ]);
  }

  for (const key of ADDRESS_FIELD_KEYS) {
    const nested = extractAddressString(candidate[key], seen);
    if (nested) {
      return nested;
    }
  }

  return '';
}

