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

export type TruckStatus = {
  id: number;
  is_open: boolean;
  est_wait_minutes: number;
  accepting_scheduled: boolean;
};
