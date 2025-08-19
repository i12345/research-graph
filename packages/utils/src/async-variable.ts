export class AsyncVariable<T> implements PromiseLike<T> {
    #res!: (res: T) => void
    #rej!: (error: unknown) => void
    #result: T | undefined
    #completed = false
    #p!: Promise<T>
    readonly #initialization: Promise<void>

    get result(): T {
        if (!this.#completed)
            throw new Error()
        
        return this.#result!
    }

    set result(result) {
        this.set(result)
    }

    get complete() {
        return this.#completed
    }

    constructor() {
        this.#initialization = new Promise(initialized => this.#p = new Promise((res, rej) => ([this.#res, this.#rej] = [res, rej], initialized())))
    }

    async init() {
        await this.#initialization
    }

    async read() {
        await this.#initialization
        return await this.#p
    }

    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
        return this.read().then(onfulfilled, onrejected)
    }

    #complete() {
        if (this.complete)
            throw new Error("")

        this.#completed = true
    }

    async set(value: T) {
        await this.#initialization
        this.#result = value
        this.#complete()
        this.#res(value)
    }

    async error(error: unknown) {
        await this.#initialization
        this.#complete()
        this.#rej(error)
    }

    static performCallback<R = void>(fn: (cb: (err?: unknown, res?: R) => void) => void): AsyncVariable<R> {
        const av = new AsyncVariable<R>()

        fn(async (err, res) => {
            if (err)
                await av.error(err)
            else
                await av.set(<R>res)
        })

        return av
    }

    perform(fn: () => Promise<T>): this {
        fn().then(value => this.set(value)).catch(error => this.error(error))

        return this
    }

    timeout(milliseconds: number): this {
        AsyncVariable.wait(milliseconds).then(() => {
            if (!this.#completed)
                this.error("timeout")
        })

        return this
    }

    static perform<T>(fn: () => Promise<T>): AsyncVariable<T> {
        return new AsyncVariable<T>().perform(fn)
    }

    static wait(milliseconds: number) {
        const res = new AsyncVariable<void>()
        setTimeout(() => res.set(), milliseconds)
        return res
    }
}
