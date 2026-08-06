export type Locale = 'es' | 'en';

/** Flattens a nested dictionary into dot-notation keys: 'header.year' | 'policies.title' | ... */
export type FlattenKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : FlattenKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Values interpolated into a string via {placeholders}. */
export type Interpolations = Record<string, string | number>;
