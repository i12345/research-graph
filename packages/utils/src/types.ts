export type Deleteable<T, K extends keyof T> = {
    -readonly [K1 in K]?: T[K1]
}

export type PartlyDeleteable<T, K extends keyof T> = {
    [K1 in keyof T as (K1 extends K ? never : K1)]: T[K1]
} & Deleteable<T, K>

export type UndefinedIf<T, Condition extends boolean = boolean> = Condition extends true ? undefined : T

export function undefinedIf<T, Condition extends boolean = boolean>(condition: Condition, item: () => T): UndefinedIf<T, Condition> {
    return <UndefinedIf<T, Condition>>(condition ? undefined : item())
}

export type Prefixed<Prefix extends string, T extends object> = {
    [K in string & keyof T as `${Prefix}${K}`]: T[K]
}

export function prefixed<Prefix extends string, T extends object>(prefix: Prefix, o: T): Prefixed<Prefix, T> {
    return <Prefixed<Prefix, T>>Object.fromEntries(Object.entries(o).map(([k, v]) => [`${prefix}${k}`, v] as const))
}
