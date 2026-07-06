import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _supabase;
}

export async function getOpenStores(currentTime: string): Promise<string> {
  const { data: stores } = await supabase()
    .from('stores')
    .select('id, name, opening_time, closing_time, delivery_fee, estimated_delivery_time, rating, is_open, address')
    .eq('status', 'approved');

  if (!stores) return '[]';

  const open = stores.filter((s) => {
    if (!s.is_open) return false;
    if (!s.opening_time || !s.closing_time) return true;
    const now = currentTime || new Date().toISOString().slice(11, 16);
    const [nh, nm] = now.split(':').map(Number);
    const [oh, om] = (s.opening_time || '00:00').split(':').map(Number);
    const [ch, cm] = (s.closing_time || '23:59').split(':').map(Number);
    const nowMin = nh * 60 + nm;
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    if (closeMin < openMin) return nowMin >= openMin || nowMin <= closeMin;
    return nowMin >= openMin && nowMin <= closeMin;
  });

  return JSON.stringify(open.map(s => ({
    name: s.name,
    delivery_fee: s.delivery_fee,
    estimated_delivery_time: s.estimated_delivery_time,
    rating: s.rating,
    address: s.address,
    opening_time: s.opening_time,
    closing_time: s.closing_time,
  })));
}

export async function getStoreByCategory(categoryName: string): Promise<string> {
  const { data: cats } = await supabase()
    .from('categories')
    .select('id, name, name_ar, name_fr')
    .or(`name.ilike.%${categoryName}%,name_ar.ilike.%${categoryName}%,name_fr.ilike.%${categoryName}%`)
    .limit(3);

  if (!cats || cats.length === 0) return JSON.stringify({ error: 'Category not found' });

  const catIds = cats.map(c => c.id);
  const { data: stores } = await supabase()
    .from('stores')
    .select('id, name, rating, delivery_fee, estimated_delivery_time, is_open, address')
    .in('category_id', catIds)
    .eq('status', 'approved');

  return JSON.stringify(stores || []);
}

export async function getStoresByCategory(categoryName: string): Promise<string> {
  return getStoreByCategory(categoryName);
}

export async function getDeliveryAvailability(): Promise<string> {
  const { data: delivery } = await supabase()
    .from('delivery_persons')
    .select('id, user_id, online_status, vehicle_type, rating, total_deliveries')
    .eq('online_status', 'online');

  const onlineCount = delivery?.length || 0;

  const { count: totalDeliveries } = await supabase()
    .from('delivery_persons')
    .select('*', { count: 'exact', head: true });

  return JSON.stringify({
    online_now: onlineCount,
    total_registered: totalDeliveries || 0,
    status: onlineCount > 0 ? 'Deliveries are available now' : 'No delivery persons online right now',
  });
}

export async function getStoreProducts(storeName: string): Promise<string> {
  const { data: stores } = await supabase()
    .from('stores')
    .select('id, name')
    .ilike('name', `%${storeName}%`)
    .limit(1);

  if (!stores || stores.length === 0) return JSON.stringify({ error: 'Store not found' });

  const { data: products } = await supabase()
    .from('products')
    .select('name, price, is_available, is_featured, description')
    .eq('store_id', stores[0].id)
    .eq('is_available', true)
    .order('is_featured', { ascending: false })
    .limit(20);

  return JSON.stringify({
    store: stores[0].name,
    products: products || [],
  });
}

export async function getOrderStatus(orderId: string): Promise<string> {
  const { data: order } = await supabase()
    .from('orders')
    .select('id, order_number, status, total, created_at, delivery_address, estimated_delivery')
    .ilike('order_number', `%${orderId}%`)
    .limit(1)
    .single();

  if (!order) return JSON.stringify({ error: 'Order not found' });
  return JSON.stringify(order);
}

export async function getAdminStats(): Promise<string> {
  const [orders, users, stores, delivery] = await Promise.all([
    supabase().from('orders').select('*', { count: 'exact', head: true }),
    supabase().from('profiles').select('*', { count: 'exact', head: true }),
    supabase().from('stores').select('*', { count: 'exact', head: true }),
    supabase().from('delivery_persons').select('*', { count: 'exact', head: true }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const { count: todayOrders } = await supabase()
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  const { data: recentRevenue } = await supabase()
    .from('orders')
    .select('total')
    .eq('status', 'delivered')
    .gte('created_at', today);

  const todayRevenue = recentRevenue?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

  return JSON.stringify({
    total_orders: orders.count || 0,
    today_orders: todayOrders || 0,
    total_users: users.count || 0,
    total_stores: stores.count || 0,
    total_delivery_persons: delivery.count || 0,
    today_revenue: todayRevenue,
  });
}

export async function getOrderAnalytics(period: string): Promise<string> {
  const now = new Date();
  let startDate: string;

  if (period === 'today') {
    startDate = now.toISOString().slice(0, 10);
  } else if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startDate = weekAgo.toISOString();
  } else if (period === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate = monthAgo.toISOString();
  } else {
    startDate = new Date(0).toISOString();
  }

  const { data: orders } = await supabase()
    .from('orders')
    .select('id, status, total, created_at, delivery_fee')
    .gte('created_at', startDate);

  if (!orders) return JSON.stringify({ error: 'No data' });

  const byStatus = orders.reduce((acc: Record<string, number>, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const totalDeliveryFees = orders.reduce((s, o) => s + (o.delivery_fee || 0), 0);

  return JSON.stringify({
    period,
    total_orders: orders.length,
    by_status: byStatus,
    total_revenue: totalRevenue,
    total_delivery_fees: totalDeliveryFees,
    average_order_value: orders.length > 0 ? Math.round(totalRevenue / orders.filter(o => o.status === 'delivered').length * 100) / 100 : 0,
  });
}

export async function getStorePerformance(): Promise<string> {
  const { data: stores } = await supabase()
    .from('stores')
    .select('id, name, rating, total_reviews, total_orders, status, is_open')
    .eq('status', 'approved')
    .order('total_orders', { ascending: false })
    .limit(10);

  return JSON.stringify(stores || []);
}

export async function getDeliveryPerformance(): Promise<string> {
  const { data: delivery } = await supabase()
    .from('delivery_persons')
    .select('id, user_id, online_status, total_deliveries, rating, total_earnings, vehicle_type');

  const userIds = delivery?.map(d => d.user_id).filter(Boolean) || [];
  const { data: profiles } = userIds.length > 0
    ? await supabase().from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

  const merged = delivery?.map(d => ({
    name: profileMap.get(d.user_id) || 'Unknown',
    online_status: d.online_status,
    total_deliveries: d.total_deliveries,
    rating: d.rating,
    total_earnings: d.total_earnings,
    vehicle_type: d.vehicle_type,
  })) || [];

  return JSON.stringify(merged);
}

export async function getCategoryStats(): Promise<string> {
  const { data: categories } = await supabase()
    .from('categories')
    .select('id, name, name_ar, name_fr, is_active')
    .eq('is_active', true)
    .order('sort_order');

  const catIds = categories?.map(c => c.id) || [];
  const { data: stores } = catIds.length > 0
    ? await supabase().from('stores').select('id, category_id, total_orders, rating').in('category_id', catIds).eq('status', 'approved')
    : { data: [] };

  const merged = categories?.map(c => {
    const catStores = stores?.filter(s => s.category_id === c.id) || [];
    return {
      name: c.name,
      name_ar: c.name_ar,
      name_fr: c.name_fr,
      stores_count: catStores.length,
      total_orders: catStores.reduce((s, st) => s + (st.total_orders || 0), 0),
      avg_rating: catStores.length > 0 ? Math.round(catStores.reduce((s, st) => s + (st.rating || 0), 0) / catStores.length * 10) / 10 : 0,
    };
  }) || [];

  return JSON.stringify(merged);
}

// ── Groq tool schemas (OpenAI-compatible) ──────────────────────────

export const CUSTOMER_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_open_stores',
      description: 'Get all stores that are currently open based on the current time. Returns store names, delivery fees, ratings, and hours.',
      parameters: {
        type: 'object',
        properties: {
          current_time: {
            type: 'string',
            description: 'Current time in HH:MM format (24h)',
          },
        },
        required: ['current_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stores_by_category',
      description: 'Search stores by category name (food, pizza, burgers, groceries, pharmacy, sushi, desserts, flowers, pets, electronics, fashion, sports, baby, stationery)',
      parameters: {
        type: 'object',
        properties: {
          category_name: {
            type: 'string',
            description: 'Category name to search for',
          },
        },
        required: ['category_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_delivery_availability',
      description: 'Check how many delivery persons are currently online and available for deliveries.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_store_products',
      description: 'Get the menu/products of a specific store by name.',
      parameters: {
        type: 'object',
        properties: {
          store_name: {
            type: 'string',
            description: 'Name of the store to search',
          },
        },
        required: ['store_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_status',
      description: 'Check the status of an order by its order number or ID.',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'Order number or ID',
          },
        },
        required: ['order_id'],
      },
    },
  },
];

export const ADMIN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_admin_stats',
      description: 'Get overall dashboard statistics: total orders, today orders, total users, stores, delivery persons, and today revenue.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_analytics',
      description: 'Get order analytics for a given period (today, week, month, all). Includes revenue, status breakdown, average order value.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: 'Time period: today, week, month, or all',
          },
        },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_store_performance',
      description: 'Get top stores by orders, with ratings, reviews, and status.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_delivery_performance',
      description: 'Get delivery person performance: deliveries completed, ratings, earnings, online status.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_category_stats',
      description: 'Get statistics per category: number of stores, total orders, average rating.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_open_stores',
      description: 'Get all stores that are currently open based on the current time.',
      parameters: {
        type: 'object',
        properties: {
          current_time: {
            type: 'string',
            description: 'Current time in HH:MM format',
          },
        },
        required: ['current_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_delivery_availability',
      description: 'Check delivery person availability right now.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────

export async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  switch (name) {
    case 'get_open_stores':
      return getOpenStores(args.current_time);
    case 'get_stores_by_category':
      return getStoresByCategory(args.category_name);
    case 'get_store_by_category':
      return getStoreByCategory(args.category_name);
    case 'get_delivery_availability':
      return getDeliveryAvailability();
    case 'get_store_products':
      return getStoreProducts(args.store_name);
    case 'get_order_status':
      return getOrderStatus(args.order_id);
    case 'get_admin_stats':
      return getAdminStats();
    case 'get_order_analytics':
      return getOrderAnalytics(args.period);
    case 'get_store_performance':
      return getStorePerformance();
    case 'get_delivery_performance':
      return getDeliveryPerformance();
    case 'get_category_stats':
      return getCategoryStats();
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
