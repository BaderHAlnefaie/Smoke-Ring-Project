import type { Order, OrderItem, Payment, InventoryItem, MenuItemIngredient } from "./types";

type Insertable<T> = Omit<T, "id" | "created_at" | "updated_at">;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: number;
          slug: string;
          name_en: string;
          name_ar: string;
          sort_order: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: number;
          category_id: number;
          slug: string;
          name_en: string;
          name_ar: string;
          description_en: string | null;
          description_ar: string | null;
          price_halalas: number;
          image_url: string | null;
          is_available: boolean;
          sort_order: number;
          created_at: string;
          auto_86: boolean;
        };
        Insert: {
          category_id: number;
          slug: string;
          name_en: string;
          name_ar: string;
          description_en?: string | null;
          description_ar?: string | null;
          price_halalas: number;
          image_url?: string | null;
          is_available?: boolean;
          auto_86?: boolean;
          sort_order?: number;
        };
        Update: Partial<{
          category_id: number;
          slug: string;
          name_en: string;
          name_ar: string;
          description_en: string | null;
          description_ar: string | null;
          price_halalas: number;
          image_url: string | null;
          is_available: boolean;
          auto_86: boolean;
          sort_order: number;
        }>;
        Relationships: [];
      };
      truck_status: {
        Row: {
          id: number;
          is_open: boolean;
          est_wait_minutes: number;
          accepting_scheduled: boolean;
          opening_hours: { open: string; close: string; closed: boolean }[];
          updated_at: string;
        };
        Insert: never;
        Update: Partial<{
          is_open: boolean;
          est_wait_minutes: number;
          accepting_scheduled: boolean;
          opening_hours: { open: string; close: string; closed: boolean }[];
          updated_at: string;
        }>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          phone: string | null;
          display_name: string | null;
          created_at: string;
        };
        Insert: { id: string; phone?: string | null; display_name?: string | null };
        Update: Partial<{ phone: string | null; display_name: string | null }>;
        Relationships: [];
      };
      user_roles: {
        Row: { user_id: string; role: "customer" | "staff" | "admin" };
        Insert: { user_id: string; role: "customer" | "staff" | "admin" };
        Update: Partial<{ role: "customer" | "staff" | "admin" }>;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: {
          user_id: string;
          subtotal_halalas: number;
          vat_halalas: number;
          total_halalas: number;
          status?: Order["status"];
          pickup_type?: Order["pickup_type"];
          scheduled_for?: string | null;
        };
        Update: Partial<Insertable<Order>> & { updated_at?: string; status?: Order["status"] };
        Relationships: [];
      };
      order_items: {
        Row: OrderItem;
        Insert: {
          order_id: number;
          menu_item_id: number;
          name_en: string;
          name_ar: string;
          qty: number;
          unit_halalas: number;
          notes?: string | null;
        };
        Update: Partial<Omit<OrderItem, "id">>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: {
          order_id: number;
          moyasar_payment_id: string;
          amount_halalas: number;
          status: string;
          raw: unknown;
        };
        Update: Partial<Omit<Payment, "id" | "created_at">>;
        Relationships: [];
      };
      rate_limits: {
        Row: { key: string; window_start: string; count: number };
        Insert: { key: string; window_start: string; count?: number };
        Update: Partial<{ key: string; window_start: string; count: number }>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: number;
          order_id: number;
          user_id: string;
          type: string;
          channel: string;
          status: string;
          detail: string | null;
          created_at: string;
        };
        Insert: {
          order_id: number;
          user_id: string;
          type: string;
          channel: string;
          status: string;
          detail?: string | null;
        };
        Update: Partial<{ status: string; detail: string | null }>;
        Relationships: [];
      };
      inventory_items: {
        Row: InventoryItem;
        Insert: {
          name_en: string;
          name_ar: string;
          unit_label_en?: string;
          unit_label_ar?: string;
          servings_per_unit: number;
          stock_servings?: number;
          low_stock_servings?: number;
          is_active?: boolean;
        };
        Update: Partial<{
          name_en: string;
          name_ar: string;
          unit_label_en: string;
          unit_label_ar: string;
          servings_per_unit: number;
          stock_servings: number;
          low_stock_servings: number;
          is_active: boolean;
          updated_at: string;
        }>;
        Relationships: [];
      };
      menu_item_ingredients: {
        Row: MenuItemIngredient;
        Insert: { menu_item_id: number; inventory_item_id: number; servings_per_item?: number };
        Update: Partial<{ servings_per_item: number }>;
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: number;
          inventory_item_id: number;
          order_id: number | null;
          servings_delta: number;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          inventory_item_id: number;
          order_id?: number | null;
          servings_delta: number;
          reason: string;
          created_by?: string | null;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order: {
        Args: {
          p_user_id: string;
          p_lines: Json;
          p_pickup_type?: Order["pickup_type"];
          p_scheduled_for?: string | null;
        };
        Returns: Order;
      };
      advance_order_status: {
        Args: { p_order_id: number; p_next: Order["status"] };
        Returns: Order;
      };
      rate_limit_hit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_list_team: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          email: string;
          roles: ("customer" | "staff" | "admin")[];
        }[];
      };
      admin_assign_role: {
        Args: { p_email: string; p_role: "customer" | "staff" | "admin" };
        Returns: undefined;
      };
      admin_revoke_role: {
        Args: { p_email: string; p_role: "customer" | "staff" | "admin" };
        Returns: undefined;
      };
      adjust_inventory: {
        Args: {
          p_inventory_item_id: number;
          p_servings_delta: number;
          p_reason: string;
          p_user?: string | null;
        };
        Returns: InventoryItem;
      };
      admin_dashboard_stats: {
        Args: { p_since: string };
        Returns: {
          orders_today: number;
          revenue_today_halalas: number;
          avg_prep_mins: number | null;
          active_now: number;
        }[];
      };
      admin_top_sellers: {
        Args: { p_since: string; p_limit?: number };
        Returns: { name_en: string; name_ar: string; qty: number }[];
      };
    };
    Enums: {
      app_role: "customer" | "staff" | "admin";
      order_status: Order["status"];
      pickup_type: Order["pickup_type"];
    };
    CompositeTypes: Record<string, never>;
  };
};
