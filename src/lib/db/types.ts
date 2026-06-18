export type Category = {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
};

export type MenuItem = {
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
};

export type OpeningHour = { open: string; close: string; closed: boolean };

export type TruckStatus = {
  id: number;
  is_open: boolean;
  est_wait_minutes: number;
  accepting_scheduled: boolean;
  opening_hours: OpeningHour[];
};

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "ready"
  | "picked_up"
  | "cancelled";

export type Order = {
  id: number;
  user_id: string;
  status: OrderStatus;
  pickup_type: "asap" | "scheduled";
  scheduled_for: string | null;
  subtotal_halalas: number;
  vat_halalas: number;
  total_halalas: number;
  moyasar_invoice_id: string | null;
  is_rush: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: number;
  order_id: number;
  menu_item_id: number;
  name_en: string;
  name_ar: string;
  qty: number;
  unit_halalas: number;
  notes: string | null;
  prepared: boolean;
};

export type Payment = {
  id: number;
  order_id: number;
  moyasar_payment_id: string;
  amount_halalas: number;
  status: string;
  raw: unknown;
  created_at: string;
};
