export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string;
          avatar_url: string | null;
          role: 'customer' | 'vendor' | 'delivery' | 'admin';
          is_active: boolean;
          language: 'ar' | 'fr' | 'en';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone: string;
          avatar_url?: string | null;
          role?: 'customer' | 'vendor' | 'delivery' | 'admin';
          is_active?: boolean;
          language?: 'ar' | 'fr' | 'en';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string;
          avatar_url?: string | null;
          role?: 'customer' | 'vendor' | 'delivery' | 'admin';
          is_active?: boolean;
          language?: 'ar' | 'fr' | 'en';
          updated_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string;
          image_url: string;
          cover_url: string | null;
          category_id: string;
          rating: number;
          total_reviews: number;
          total_orders: number;
          status: 'pending' | 'approved' | 'suspended' | 'rejected';
          is_open: boolean;
          min_order: number;
          delivery_fee: number;
          estimated_delivery_time: number;
          opening_time: string;
          closing_time: string;
          latitude: number;
          longitude: number;
          address: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description: string;
          image_url: string;
          cover_url?: string | null;
          category_id: string;
          rating?: number;
          total_reviews?: number;
          total_orders?: number;
          status?: 'pending' | 'approved' | 'suspended' | 'rejected';
          is_open?: boolean;
          min_order?: number;
          delivery_fee?: number;
          estimated_delivery_time?: number;
          opening_time: string;
          closing_time: string;
          latitude: number;
          longitude: number;
          address: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          name?: string;
          description?: string;
          image_url?: string;
          cover_url?: string | null;
          category_id?: string;
          rating?: number;
          total_reviews?: number;
          total_orders?: number;
          status?: 'pending' | 'approved' | 'suspended' | 'rejected';
          is_open?: boolean;
          min_order?: number;
          delivery_fee?: number;
          estimated_delivery_time?: number;
          opening_time?: string;
          closing_time?: string;
          latitude?: number;
          longitude?: number;
          address?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          name_ar: string;
          name_fr: string;
          icon: string;
          image_url: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_ar: string;
          name_fr: string;
          icon: string;
          image_url: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          name_ar?: string;
          name_fr?: string;
          icon?: string;
          image_url?: string;
          is_active?: boolean;
          sort_order?: number;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          category_id: string;
          name: string;
          description: string;
          price: number;
          image_url: string;
          stock: number;
          is_available: boolean;
          is_featured: boolean;
          preparation_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          category_id: string;
          name: string;
          description: string;
          price: number;
          image_url: string;
          stock: number;
          is_available?: boolean;
          is_featured?: boolean;
          preparation_time?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          category_id?: string;
          name?: string;
          description?: string;
          price?: number;
          image_url?: string;
          stock?: number;
          is_available?: boolean;
          is_featured?: boolean;
          preparation_time?: number;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string;
          store_id: string;
          delivery_person_id: string | null;
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
          subtotal: number;
          delivery_fee: number;
          discount: number;
          total: number;
          promo_code_id: string | null;
          delivery_address_id: string;
          delivery_address: string;
          delivery_latitude: number;
          delivery_longitude: number;
          delivery_instructions: string | null;
          scheduled_for: string | null;
          tip: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_id: string;
          store_id: string;
          delivery_person_id?: string | null;
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
          subtotal: number;
          delivery_fee?: number;
          discount?: number;
          total: number;
          promo_code_id?: string | null;
          delivery_address_id: string;
          delivery_address: string;
          delivery_latitude: number;
          delivery_longitude: number;
          delivery_instructions?: string | null;
          scheduled_for?: string | null;
          tip?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          delivery_person_id?: string | null;
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
          subtotal?: number;
          delivery_fee?: number;
          discount?: number;
          total?: number;
          promo_code_id?: string | null;
          delivery_instructions?: string | null;
          scheduled_for?: string | null;
          tip?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          quantity?: number;
          price?: number;
          notes?: string | null;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          address: string;
          latitude: number;
          longitude: number;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          address: string;
          latitude: number;
          longitude: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          label?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          is_default?: boolean;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          store_id: string;
          order_id: string;
          rating: number;
          comment: string | null;
          reply: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id: string;
          order_id: string;
          rating: number;
          comment?: string | null;
          reply?: string | null;
          created_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
          reply?: string | null;
        };
      };
      promo_codes: {
        Row: {
          id: string;
          code: string;
          description: string;
          discount_percent: number;
          discount_amount: number;
          max_uses: number;
          current_uses: number;
          min_order: number;
          max_discount: number | null;
          valid_from: string;
          valid_until: string;
          is_active: boolean;
          store_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description: string;
          discount_percent?: number;
          discount_amount?: number;
          max_uses?: number;
          current_uses?: number;
          min_order?: number;
          max_discount?: number | null;
          valid_from: string;
          valid_until: string;
          is_active?: boolean;
          store_id?: string | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          description?: string;
          discount_percent?: number;
          discount_amount?: number;
          max_uses?: number;
          current_uses?: number;
          min_order?: number;
          max_discount?: number | null;
          valid_from?: string;
          valid_until?: string;
          is_active?: boolean;
          store_id?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          data: Record<string, unknown> | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          data?: Record<string, unknown> | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          message?: string;
          type?: string;
          data?: Record<string, unknown> | null;
          is_read?: boolean;
        };
      };
      chats: {
        Row: {
          id: string;
          order_id: string;
          customer_id: string;
          delivery_person_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          customer_id: string;
          delivery_person_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          text: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          text: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          product_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          product_id?: string | null;
          created_at?: string;
        };
        Update: {
          store_id?: string | null;
          product_id?: string | null;
        };
      };
      loyalty_points: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          order_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points: number;
          order_id: string;
          created_at?: string;
        };
        Update: {
          points?: number;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          referral_code: string;
          bonus_amount: number;
          is_used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          referral_code: string;
          bonus_amount?: number;
          is_used?: boolean;
          created_at?: string;
        };
        Update: {
          is_used?: boolean;
        };
      };
      delivery_zones: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          coordinates: unknown;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          coordinates: unknown;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          coordinates?: unknown;
          is_active?: boolean;
        };
      };
      delivery_persons: {
        Row: {
          id: string;
          user_id: string;
          type: 'staff' | 'freelance';
          status: 'pending' | 'approved' | 'rejected' | 'suspended';
          online_status: 'online' | 'offline' | 'busy';
          vehicle_type: string;
          vehicle_plate: string;
          id_document_url: string;
          license_document_url: string;
          latitude: number | null;
          longitude: number | null;
          total_deliveries: number;
          rating: number;
          total_earnings: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: 'staff' | 'freelance';
          status?: 'pending' | 'approved' | 'rejected' | 'suspended';
          online_status?: 'online' | 'offline' | 'busy';
          vehicle_type: string;
          vehicle_plate: string;
          id_document_url: string;
          license_document_url: string;
          latitude?: number | null;
          longitude?: number | null;
          total_deliveries?: number;
          rating?: number;
          total_earnings?: number;
          created_at?: string;
        };
        Update: {
          type?: 'staff' | 'freelance';
          status?: 'pending' | 'approved' | 'rejected' | 'suspended';
          online_status?: 'online' | 'offline' | 'busy';
          vehicle_type?: string;
          vehicle_plate?: string;
          id_document_url?: string;
          license_document_url?: string;
          latitude?: number | null;
          longitude?: number | null;
          total_deliveries?: number;
          rating?: number;
          total_earnings?: number;
        };
      };
    };
    Enums: {
      user_role: 'customer' | 'vendor' | 'delivery' | 'admin';
      order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
      store_status: 'pending' | 'approved' | 'suspended' | 'rejected';
    };
  };
}
