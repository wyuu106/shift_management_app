import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export const dateKey = (value) =>
  typeof value === "string" ? value.slice(0, 10) : format(value, "yyyy-MM-dd");

export const formatDate = (value, pattern = "M月d日（E）") =>
  format(typeof value === "string" ? parseISO(value) : value, pattern, {
    locale: ja,
  });
