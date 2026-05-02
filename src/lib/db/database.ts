import type { Order, OrderItem, Payment } from "./types";

type Insertable<T> = Omit<T, "id" | "created_at" | "updated_at">;

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: "customer" | "staff" | "admin";
      order_status: Order["status"];
      pickup_type: Order["pickup_type"];
    };
    CompositeTypes: Record<string, never>;
  };
};
