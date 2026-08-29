export type TableColumnId = "item" | "size" | "qty" | "price" | "total";

export interface TableColumnConfig {
  thermal: TableColumnId[];
  a4: TableColumnId[];
}

export const DEFAULT_THERMAL_COLUMNS: TableColumnId[] = ["item", "qty", "price", "total"];
export const DEFAULT_A4_COLUMNS: TableColumnId[] = ["item", "size", "qty", "price", "total"];

export const DEFAULT_THERMAL_NOTE =
  "Note: Please keep this invoice with yourself. If you want to track your orders, your purchasing history or any refund policy, Thank you.";
export const DEFAULT_THERMAL_FOOTER = "Automated Software Invoice\nSoftware by ZMAPOS.com";
export const DEFAULT_A4_NOTE =
  "Please keep this invoice with yourself. If you want to track your orders, your purchasing history or any refund policy, Thank you.";
export const DEFAULT_A4_FOOTER = "Automated Software Invoice\nPowered by ZMAPOS.com";

export interface Settings {
  thermal_printer: string;
  a4_printer: string;
  thermal_template: string;
  a4_template: string;
  columns: TableColumnConfig;
  thermal_note: string;
  thermal_footer: string;
  a4_note: string;
  a4_footer: string;
  cloud: {
    enabled: boolean;
    base_url: string;
    ws_url: string;
    secret: string;
  };
}

export const defaultSettings = (): Settings => ({
  thermal_printer: "",
  a4_printer: "",
  thermal_template: "thermal-standard",
  a4_template: "a4-standard",
  columns: {
    thermal: [...DEFAULT_THERMAL_COLUMNS],
    a4: [...DEFAULT_A4_COLUMNS],
  },
  thermal_note: DEFAULT_THERMAL_NOTE,
  thermal_footer: DEFAULT_THERMAL_FOOTER,
  a4_note: DEFAULT_A4_NOTE,
  a4_footer: DEFAULT_A4_FOOTER,
  cloud: {
    enabled: false,
    base_url: "https://api.zmapos.com",
    ws_url: "wss://api.zmapos.com/ws/printing/",
    secret: "",
  },
});
