export type Values<T extends object> = T[keyof T]

export type PropertyPath<T> = 
    | []
    | T extends object ? Values<{
        [K in keyof T]: [K] | [K, Values<PropertyPath<T[K]>>]
    }> : []

export type PropertyType<T, Property extends PropertyPath<T>> = PropertyType_<T, Property>
type PropertyType_<T, Property extends any[], Constructed extends any[] = []> =
    (Property & Constructed) extends never ?
    Values<{
        [K in keyof T as Property extends [...Constructed, K, ...any[]] ? K : never]:
        PropertyType_<T[K], Property, [...Constructed, K]>
    }> :
    T

// export type PropertyType<T, Property extends PropertyPath<T> & PropertyKey[]> = PropertyType_<T, Property>
// type PropertyType_<T, Property extends PropertyKey[], Constructed extends PropertyKey[] = []> =
//     (Property & Constructed) extends never ?
//     Values<{
//         [K in keyof T as Property extends [...Constructed, K, ...PropertyKey[]] ? K : never]:
//         PropertyType_<T[K], Property, [...Constructed, K]>
//     }> :
//     T

// type A = {
//     a: {
//         a: 10,
//         b: 1
//         c: 2
//     }
//     b: {
//         a: {
//             c: 1
//         }
//     }
// }

// type a_path = PropertyPath<A>
// const ac = ["a", "c"] satisfies a_path
// // type a1 = (typeof ac) extends ["a", "c", ...PropertyKey[]] ? true : false
// type ac_type = PropertyType_<A, typeof ac>

export function replaceProperty<T, Property extends PropertyPath<T> = PropertyPath<T>>(
        obj: T,
        property: Property,
        value: any
    ): T {
    if (property.length === 0)
        return <T>((<any>value) ?? obj)

    if (typeof obj !== 'object')
        throw new Error()

    const prototype = Object.create(obj)
    const property0 = property[0]!
    prototype[property0] = replaceProperty<any>((<any>obj)[property0]!, <any>property.slice(1), value)
    return <T>prototype
}
