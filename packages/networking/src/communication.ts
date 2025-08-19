import { Socket } from "socket.io-client"
import { AsyncVariable, Disposable } from "@graph/utils"
import * as Parser from "socket.io-cbor-x-parser"

export type HalfProtocol = (...params: any[]) => any

export type HalfProtocols = {
    [event: string]: HalfProtocol
}

export interface Protocols<Send extends HalfProtocols = HalfProtocols, Listen extends HalfProtocols = HalfProtocols> {
    send: Send
    listen: Listen
}

export type SendProtocols<Protocols_ extends Protocols> = Protocols_ extends Protocols<infer Send, infer _Listen> ? Send : never
export type ListenProtocols<Protocols_ extends Protocols> = Protocols_ extends Protocols<infer _Send, infer Listen> ? Listen : never

export type PeerToPeerProtocols<HalfProtocols_ extends HalfProtocols> = Protocols<HalfProtocols_, HalfProtocols_>

export type Callback<Result = unknown> = (errResult: [error: unknown] | [error: undefined, result: Result]) => void

export type HalfProtocolToEvent<HalfProtocol_ extends HalfProtocol> =
    (...parameters: [...Parameters<HalfProtocol_>, callback: Callback<ReturnType<HalfProtocol_>>]) => void

export type HalfProtocolsToEvents<HalfProtocols_ extends HalfProtocols> =
    { [K in keyof HalfProtocols_]: HalfProtocolToEvent<HalfProtocols_[K]> }

export class ProtocolListener<Protocols_ extends Protocols = Protocols> implements Disposable {
    readonly #listeners: Partial<HalfProtocolsToEvents<ListenProtocols<Protocols_>>>
    #registered = false

    get registered() {
        return this.#registered
    }

    set registered(registered) {
        if (registered === this.registered)
            return

        if (registered)
            this.#register()
        else
            this.#unregister()
    }

    constructor(
            readonly socket: SocketWith<Protocols_>,
            readonly listeners: Partial<ListenProtocols<Protocols_>>,
            register = true,
        ) {
        this.#listeners = <Partial<HalfProtocolsToEvents<ListenProtocols<Protocols_>>>>
            Object.fromEntries(
                <any>Object.entries(listeners)
                    .filter(([_, handler]) => handler !== undefined)
                    .map(
                        ([key, handler]) => [
                            key,
                            async (...parameters: any[]) => {
                                const callback = <Callback>parameters.splice(parameters.length - 1, 1)[0]!

                                try {
                                    const result = await handler.call(listeners, ...parameters)
                                    callback([undefined, result])
                                }
                                catch (err) {
                                    if (err instanceof Error)
                                        err = err.stack ?? err.message
                                    callback([err])
                                }
                            }
                        ] as const
                    )
            )
        
        this.registered = register
    }

    #register() {
        if (!this.#registered) {
            this.#registered = true
            for (const [key, listener] of Object.entries(this.#listeners))
                this.socket.on(key, listener)
        }
    }

    #unregister() {
        if (this.#registered) {
            this.#registered = false
            for (const [key, listener] of Object.entries(this.#listeners))
                this.socket.off(key, listener)
        }
    }

    dispose() {
        this.#unregister()
    }
}

export function listen<
        const Protocols_ extends Protocols = Protocols,
    >(
        socket: SocketWith<Protocols_>,
        listeners: Partial<ListenProtocols<Protocols_>>,
        register = true
    ): ProtocolListener<Protocols_> {
    return new ProtocolListener(socket, listeners, register)
}

export async function send<
        const Protocols_ extends Protocols = Protocols,
        Protocol_ extends keyof SendProtocols<Protocols_> = keyof SendProtocols<Protocols_>,
    >(
        socket: SocketWith<Protocols_>,
        protocol: Protocol_,
        ...args: Parameters<SendProtocols<Protocols_>[Protocol_]>
    ): Promise<Awaited<ReturnType<SendProtocols<Protocols_>[Protocol_]>>> {
    const result = new AsyncVariable<Awaited<ReturnType<SendProtocols<Protocols_>[Protocol_]>>>
    
    try {
        const [err, res] = <any>await socket.timeout(50000).emitWithAck(<any>protocol, ...(<any>args))
        if (err) await result.error(err)
        else await result.set(res)
    }
    catch (x) {
        await result.error(x)
    }

    return await result
}

export type SocketWith<Protocols_ extends Protocols> = Socket<HalfProtocolsToEvents<Protocols_["listen"]>, HalfProtocolsToEvents<Protocols_["send"]>>

export const parser = Parser
