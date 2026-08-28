export interface Settings {
  thermal_printer: string;
  a4_printer: string;
  thermal_template: string;
  a4_template: string;
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
  cloud: {
    enabled: false,
    base_url: "https://api.zmapos.com",
    ws_url: "wss://api.zmapos.com/ws/printing/",
    secret: "",
  },
});
