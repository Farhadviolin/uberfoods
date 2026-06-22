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

export const CUSTOMER_PROFILE_ADDRESS_KEYS = [
  'customer_profile_address',
  'customer_profile_address_backup',
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

export function readStoredCustomerProfileAddress(storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined' ? window.localStorage : undefined): string {
  if (!storage) {
    return '';
  }

  for (const key of CUSTOMER_PROFILE_ADDRESS_KEYS) {
    const resolved = extractAddressString(parseMaybeJson(storage.getItem(key)));
    if (resolved) {
      return resolved;
    }
  }

  return '';
}

export function mergeCustomerUserWithPreservedAddress(previousUser: unknown, nextUser: unknown): Record<string, unknown> {
  const previous = previousUser && typeof previousUser === 'object'
    ? previousUser as Record<string, unknown>
    : {};

  const next = nextUser && typeof nextUser === 'object'
    ? nextUser as Record<string, unknown>
    : {};

  const previousAddress = extractAddressString(parseMaybeJson(previous.address));
  const nextAddress = extractAddressString(parseMaybeJson(next.address));
  const profileAddress = readStoredCustomerProfileAddress();
  const preservedAddress = nextAddress || previousAddress || profileAddress;

  return {
    ...previous,
    ...next,
    address: preservedAddress,
  };
}

export interface CheckoutAddressResolution {
  address: string;
  source: 'auth' | 'customer_user' | 'customer_profile_address' | 'checkout_state' | 'none';
  profileAddressRawType: string;
  profileAddressKeys: string[];
  customerUserAddressPresent: boolean;
}

export function resolveCheckoutAddressFromStorage(params: {
  authAddress?: unknown;
  customerUserRaw?: unknown;
  customerProfileAddressRawEntries?: Array<{ key: string; raw: unknown }>;
}): CheckoutAddressResolution {
  const normalizeAddress = (value: unknown): string => extractAddressString(parseMaybeJson(value));
  const contextAddress = normalizeAddress(params.authAddress);
  const profileAddressRawEntries = params.customerProfileAddressRawEntries ?? [];
  const profileAddressRawEntry = profileAddressRawEntries.find((entry) => normalizeAddress(entry.raw));
  const profileAddressRaw = profileAddressRawEntry?.raw ?? null;
  const storedCustomerUser = parseMaybeJson(params.customerUserRaw) as Record<string, unknown> | null;
  const storedProfileAddress = parseMaybeJson(profileAddressRaw);
  const profileAddressRawType = profileAddressRaw === null
    ? 'null'
    : Array.isArray(storedProfileAddress)
      ? 'array'
      : typeof storedProfileAddress;
  const profileAddressKeys = storedProfileAddress && typeof storedProfileAddress === 'object'
    ? Object.keys(storedProfileAddress as Record<string, unknown>).slice(0, 12)
    : [];
  const customerUserAddressPresent = Boolean(
    normalizeAddress(storedCustomerUser?.address)
    || normalizeAddress((storedCustomerUser?.user as Record<string, unknown> | undefined)?.address)
    || normalizeAddress((storedCustomerUser?.customer as Record<string, unknown> | undefined)?.address)
    || normalizeAddress((storedCustomerUser?.profile as Record<string, unknown> | undefined)?.address)
    || normalizeAddress((storedCustomerUser?.data as Record<string, unknown> | undefined)?.address)
  );

  if (contextAddress) {
    return {
      address: contextAddress,
      source: 'auth',
      profileAddressRawType,
      profileAddressKeys,
      customerUserAddressPresent,
    };
  }

  const candidateEntries: Array<{
    source: 'customer_user' | 'customer_profile_address' | 'checkout_state';
    value: unknown;
  }> = [
    { source: 'customer_user', value: storedCustomerUser?.address },
    { source: 'customer_user', value: (storedCustomerUser?.user as Record<string, unknown> | undefined)?.address },
    { source: 'customer_user', value: (storedCustomerUser?.customer as Record<string, unknown> | undefined)?.address },
    { source: 'customer_user', value: (storedCustomerUser?.profile as Record<string, unknown> | undefined)?.address },
    { source: 'customer_user', value: (storedCustomerUser?.data as Record<string, unknown> | undefined)?.address },
    { source: 'customer_profile_address', value: storedProfileAddress },
  ];

  if (profileAddressRawEntry?.key === 'customer_profile_address_backup') {
    candidateEntries.unshift({ source: 'customer_profile_address', value: storedProfileAddress });
  }

  const checkoutStateAddress = [
    (storedCustomerUser?.checkout as Record<string, unknown> | undefined)?.address,
    (storedCustomerUser?.delivery as Record<string, unknown> | undefined)?.address,
  ].find((candidate): candidate is unknown => candidate !== undefined);

  if (checkoutStateAddress !== undefined) {
    candidateEntries.push({ source: 'checkout_state', value: checkoutStateAddress });
  }

  for (const candidate of candidateEntries) {
    const resolved = normalizeAddress(candidate.value);
    if (resolved) {
      return {
        address: resolved,
        source: candidate.source,
        profileAddressRawType,
        profileAddressKeys,
        customerUserAddressPresent,
      };
    }
  }

  return {
    address: '',
    source: 'none',
    profileAddressRawType,
    profileAddressKeys,
    customerUserAddressPresent,
  };
}
