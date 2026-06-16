import type { Order, OrderItem, Payment } from "./types";

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
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      truck_status: {
        Row: {
          id: number;
          is_open: boolean;
          est_wait_minutes: number;
          accepting_scheduled: boolean;
          updated_at: string;
        };
        Insert: never;
        Update: never;
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
    };
    Enums: {
      app_role: "customer" | "staff" | "admin";
      order_status: Order["status"];
      pickup_type: Order["pickup_type"];
    };
    CompositeTypes: Record<string, never>;
  };
};
