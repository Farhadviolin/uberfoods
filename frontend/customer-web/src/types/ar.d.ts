// WebXR Type Definitions
interface XRSystem {
  requestSession(mode: string, options?: { requiredFeatures?: string[] }): Promise<XRSession>;
  isSessionSupported(mode: string): Promise<boolean>;
}

interface Navigator {
  xr?: XRSystem;
}

// AR.js Type Definitions
interface ARjs {
  init(): void;
  start(): void;
  stop(): void;
}

interface Window {
  ARjs?: ARjs;
  THREE?: typeof import('three');
}

// Apple Pay Type Definitions
interface ApplePayPayment {
  token: {
    paymentData: unknown;
    paymentMethod: {
      displayName: string;
      network: string;
      type: string;
    };
    transactionIdentifier: string;
  };
  billingContact?: unknown;
  shippingContact?: unknown;
}

interface ApplePayPaymentAuthorizedEvent {
  payment: ApplePayPayment;
}

interface ApplePaySession {
  STATUS_SUCCESS: number;
  STATUS_FAILURE: number;
  completePayment(status: number): void;
  abort(): void;
  onpaymentauthorized: (event: ApplePayPaymentAuthorizedEvent) => void | Promise<void>;
}

interface Window {
  ApplePaySession?: {
    new (version: number, request: unknown): ApplePaySession;
    STATUS_SUCCESS: number;
    STATUS_FAILURE: number;
    canMakePayments(): boolean;
    supportsVersion(version: number): boolean;
  };
}
