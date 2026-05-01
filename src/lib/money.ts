const VAT_RATE = 0.15;

export function vatHalalas(subtotalHalalas: number): number {
  return Math.round(subtotalHalalas * VAT_RATE);
}

export function totalHalalas(subtotalHalalas: number): number {
  return subtotalHalalas + vatHalalas(subtotalHalalas);
}

export function formatHalalas(halalas: number, lang: "en" | "ar"): string {
  const sar = halalas / 100;
  const locale = lang === "ar" ? "ar-SA" : "en-SA";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
  }).format(sar);
}
