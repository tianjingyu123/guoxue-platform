declare module "sweph" {
  export function julday(year: number, month: number, day: number, hour: number, gregflag: number): number;
  export function calc(jd: number, planet: number, flags: number): {
    flag: number;
    error: string;
    data: number[];
  };
  export function get_planet_name(planet: number): string;
  export function version(): string;
  export function set_ephe_path(path: string): void;
  export function close(): void;
}
