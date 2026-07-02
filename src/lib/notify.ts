import { createClient } from '@/lib/supabase/client';

type NotificationType = 'order' | 'store' | 'message' | 'delivery' | 'promo' | 'info';

export async function sendNotification(
  user_id: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  data?: Record<string, unknown>
) {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('send_notification', {
      p_user_id: user_id,
      p_title: title,
      p_message: message,
      p_type: type,
      p_data: data || null,
    });
    if (error) console.error('Notification failed:', error);
  } catch (err) {
    console.error('Notification error:', err);
  }
}

export async function notifyVendorNewOrder(orderId: string, storeName: string, customerName: string, total: number, vendorId: string) {
  await sendNotification(
    vendorId,
    'New Order Received!',
    `${customerName} placed an order of ${total.toFixed(2)} TND from ${storeName}.`,
    'order',
    { order_id: orderId }
  );
}

export async function notifyCustomerOrderStatus(orderId: string, status: string, customerId: string) {
  const messages: Record<string, string> = {
    confirmed: 'Your order has been confirmed by the vendor.',
    preparing: 'Your order is now being prepared.',
    ready: 'Your order is ready for pickup!',
    picked_up: 'Your order has been picked up by the delivery person.',
    on_the_way: 'Your order is on the way to you!',
    delivered: 'Your order has been delivered. Enjoy!',
    cancelled: 'Your order has been cancelled.',
  };

  await sendNotification(
    customerId,
    `Order ${status.replace(/_/g, ' ')}`,
    messages[status] || `Your order status has been updated to ${status}.`,
    'order',
    { order_id: orderId }
  );
}

export async function notifyCustomerDeliveryAccepted(orderId: string, deliveryName: string, customerId: string) {
  await sendNotification(
    customerId,
    'Delivery Accepted!',
    `${deliveryName} has accepted your order for delivery.`,
    'delivery',
    { order_id: orderId }
  );
}

export async function notifyVendorStoreStatus(storeName: string, status: string, vendorId: string) {
  const messages: Record<string, string> = {
    approved: `Your store "${storeName}" has been approved! You can now receive orders.`,
    rejected: `Your store "${storeName}" has been rejected. Please contact support for details.`,
    suspended: `Your store "${storeName}" has been suspended. Please contact support for details.`,
    pending: `Your store "${storeName}" is under review.`,
  };

  await sendNotification(
    vendorId,
    `Store ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    messages[status] || `Your store status has been updated to ${status}.`,
    'store',
    { store_name: storeName, status }
  );
}
