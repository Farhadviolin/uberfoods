export function usePayPal() {
  return {
    createOrder: async (_data?: any) => 'paypal_order_id',
    captureOrder: async (_id?: string) => ({ success: true }),
  };
}

