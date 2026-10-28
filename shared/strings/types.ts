// echo-block strings@1.0.0: tracked in .echo/blocks.lock.json. Keep a local edit with scaffold.mjs --accept <file> --reason "...".
/** Same keys as the source catalog, every leaf a string. A missing or extra key is a compile error. */
export type StringsShape<T> = { readonly [K in keyof T]: T[K] extends string ? string : StringsShape<T[K]> };

/** Dotted paths to the string leaves of T, for example "states.loading". */
export type StringKey<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : StringKey<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
