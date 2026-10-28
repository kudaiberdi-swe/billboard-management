// Display formats of the campaign screens: dates "DD.MM.YYYY", counts with ru digit groups.
export const date = (d: string) => d.split("-").reverse().join(".");
export const period = (from: string, to: string) => `${date(from)} – ${date(to)}`;
export const count = (n: number) => n.toLocaleString("ru-RU");
