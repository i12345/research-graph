export interface ObservableListProtocols<T> {
    insert(item: T, index: number): void
    delete(item: T, index: number): void
    reorder(item: T, index1: number): void
}

export class ObservableList<T> extends Array<T> {
    constructor(length: number)
    constructor(...items: T[])
    constructor(...itemsOrArrayLength: any[]) {
        super(...itemsOrArrayLength)
    }

    override push(...items: T[]): number {
        const length0 = this.length
        const result = super.push(...items)

        items.forEach((item, i) => this.#emit("insert", item, length0 + i))

        return result
    }

    override pop(): T | undefined {
        const index = this.length - 1
        const result = super.pop()

        if (index >= 0)
            this.#emit("delete", result!, index)

        return result
    }

    override reverse(): T[] {
        const final_index = this.length - 1
        const result = super.reverse()

        this.forEach((item, i) => {
            const index0 = final_index - i
            const index1 = i

            if (index0 !== index1)
                this.#emit("reorder", item, index1)
        })

        return result
    }

    override sort(compareFn?: ((a: T, b: T) => number) | undefined): this {
        const result = super.sort(compareFn)

        this.forEach((item, i) => this.#emit("reorder", item, i))

        return result
    }

    override shift(): T | undefined {
        const length0 = this.length
        const result = super.shift()

        if (length0 > 0)
            this.#emit("delete", result!, 0)

        this.forEach((item, i) => this.#emit("reorder", item, i))

        return result
    }

    override splice(start: number, deleteCount = 0, ...items: T[]): T[] {
        const deleted = super.splice(start, deleteCount, ...items)

        deleted.forEach((item, i) => this.#emit("delete", item, start + i))

        if ((deleteCount ?? 0) !== (items?.length ?? 0))
            for (let i = start + (items?.length ?? 0); i < this.length; i++)
                this.#emit("reorder", this[i]!, i)
        
        items.forEach((item, i) => this.#emit("insert", item, start + i))

        return deleted
    }

    override unshift(...items: T[]): number {
        const result = super.unshift(...items)

        for (let i = items.length; i < this.length; i++)
            this.#emit("reorder", this[i]!, i)

        items.forEach((item, i) => this.#emit("insert", item, i))

        return result
    }

    #responders: { [Protocol in keyof ObservableListProtocols<T>]: Set<ObservableListProtocols<T>[Protocol]> } = {
        insert: new Set(),
        delete: new Set(),
        reorder: new Set(),
    }

    #emit<Protocol extends keyof ObservableListProtocols<T>>(protocol: Protocol, ...parameters: Parameters<ObservableListProtocols<T>[Protocol]>): ReturnType<ObservableListProtocols<T>[Protocol]>[] {
        return [...this.#responders[protocol]].map(responder => (<any>responder)(...parameters))
    }

    on<Protocol extends keyof ObservableListProtocols<T>>(protocol: Protocol, responder: ObservableListProtocols<T>[Protocol]) {
        this.#responders[protocol].add(responder)
    }

    off<Protocol extends keyof ObservableListProtocols<T>>(protocol: Protocol, responder: ObservableListProtocols<T>[Protocol]) {
        this.#responders[protocol].delete(responder)
    }

    responders<Protocol extends keyof ObservableListProtocols<T>>(protocol: Protocol) {
        return this.#responders[protocol]
    }
}
