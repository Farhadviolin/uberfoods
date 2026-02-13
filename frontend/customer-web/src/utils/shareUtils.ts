export async function shareOrder(orderId: string, orderDetails?: any) {
  const url = `${window.location.origin}/orders/${orderId}`;
  const text = orderDetails
    ? `Ich habe bei UberFoods bestellt! Bestellung #${orderId}`
    : `Meine Bestellung bei UberFoods - Bestellung #${orderId}`;

  if (!navigator.share) {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      return { success: true, method: 'clipboard' };
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return { success: false, error };
    }
  }

  try {
    await navigator.share({
      title: `Meine Bestellung bei UberFoods`,
      text,
      url,
    });
    return { success: true, method: 'native' };
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      // User cancelled - not an error
      return { success: false, cancelled: true };
    }
    return { success: false, error };
  }
}

export async function shareRestaurant(restaurantId: string, restaurantName: string) {
  const url = `${window.location.origin}/restaurant/${restaurantId}`;

  if (!navigator.share) {
    try {
      await navigator.clipboard.writeText(url);
      return { success: true, method: 'clipboard' };
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return { success: false, error };
    }
  }

  try {
    await navigator.share({
      title: `Restaurant: ${restaurantName}`,
      text: `Schau dir dieses Restaurant an: ${restaurantName}`,
      url,
    });
    return { success: true, method: 'native' };
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      return { success: false, cancelled: true };
    }
    return { success: false, error };
  }
}

export async function shareDish(dishId: string, dishName: string, restaurantName: string) {
  const url = `${window.location.origin}/restaurant/${dishId}`;

  if (!navigator.share) {
    try {
      await navigator.clipboard.writeText(url);
      return { success: true, method: 'clipboard' };
    } catch (error) {
      return { success: false, error };
    }
  }

  try {
    await navigator.share({
      title: `${dishName} von ${restaurantName}`,
      text: `Schau dir dieses Gericht an: ${dishName}`,
      url,
    });
    return { success: true, method: 'native' };
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      return { success: false, cancelled: true };
    }
    return { success: false, error };
  }
}

