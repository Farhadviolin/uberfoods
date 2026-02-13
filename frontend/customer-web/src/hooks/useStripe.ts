export function useStripe() {
  return {
    createPaymentIntent: async (_data: any) => ({ clientSecret: 'test_secret' }),
    confirmPayment: async (_data: any) => ({ success: true }),
  };
}

