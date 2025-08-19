import { AsyncVariable, Disposable, ObservableList } from "@graph/utils"
import { listen, ListenProtocols, parser, PeerToPeerProtocols, ProtocolListener, Protocols, SocketWith } from "./communication.js"
import { io, ManagerOptions, SocketOptions } from "socket.io-client"

export const NetworkProtocolPrefix = "network"
export const NetworkReadyProtocol = `${NetworkProtocolPrefix}.ready`

type NetworkPeerProtocols = {
}

type NetworkServerToClientProtocols = {
    [NetworkReadyProtocol](): void
}

type NetworkClientToServerProtocols = {
}

export type NetworkPeerToPeerProtocols = PeerToPeerProtocols<NetworkPeerProtocols>

export type ServerNetworkProtocols = NetworkPeerToPeerProtocols & Protocols<NetworkServerToClientProtocols, NetworkClientToServerProtocols>
export type ClientNetworkProtocols = NetworkPeerToPeerProtocols & Protocols<NetworkClientToServerProtocols, NetworkServerToClientProtocols>

export interface NetworkNodeModule<
        out Protocols_ extends Protocols = Protocols,
        out SelfToPeer extends
            NetworkNodeConnection<Protocols_> =
            NetworkNodeConnection<Protocols_>,
        out Modules extends
            NetworkNodeModules<Protocols_, SelfToPeer> =
            NetworkNodeModules<Protocols_, SelfToPeer>,
        out Connection extends
            NetworkNodeModuleConnection<Protocols_, SelfToPeer, Modules> =
            NetworkNodeModuleConnection<Protocols_, SelfToPeer, Modules>,
    > extends Disposable {
    init?(self: NetworkNode<Protocols_, SelfToPeer, Modules>): Promise<void> | void
    connect(connection: SelfToPeer): Connection | Promise<Connection>
}

export interface NetworkNodeModuleConnection<
        out Protocols_ extends Protocols = Protocols,
        out SelfToPeer extends
            NetworkNodeConnection<Protocols_> =
            NetworkNodeConnection<Protocols_>,
        out Modules extends
            NetworkNodeModules<Protocols_, SelfToPeer> =
            NetworkNodeModules<Protocols_, SelfToPeer>,
        out ModuleName extends keyof Modules = keyof Modules,
    >
    extends Disposable {
    readonly module: Modules[ModuleName]
    readonly connection: SelfToPeer
}

export abstract class ListeningNetworkNodeModuleConnection<
        out Protocols_ extends Protocols = Protocols,
        out SelfToPeer extends
            NetworkNodeConnection<Protocols_> =
            NetworkNodeConnection<Protocols_>,
        out Modules extends
            NetworkNodeModules<Protocols_, SelfToPeer> =
            NetworkNodeModules<Protocols_, SelfToPeer>,
        out ModuleName extends keyof Modules = keyof Modules,
    >
    implements NetworkNodeModuleConnection<Protocols_, SelfToPeer, Modules> {
    readonly listener: ProtocolListener<Protocols_>
    abstract get moduleName(): ModuleName

    get module() {
        return <Modules[ModuleName]><unknown>this.connection.self.modules[this.moduleName]
    }

    constructor(readonly connection: SelfToPeer) {
        this.listener = listen(this.connection.socket, this.listeners())
    }

    protected abstract listeners(): Partial<ListenProtocols<Protocols_>>

    dispose() {
        this.listener.dispose()
    }
}

export type NetworkNodeModules<
        out Protocols_ extends Protocols = Protocols,
        out SelfToPeer extends NetworkNodeConnection<Protocols_> = NetworkNodeConnection<Protocols_>,
    > = {
    [module: string]: NetworkNodeModule<Protocols_, SelfToPeer>
}

export type NetworkNodeModuleConnections<
        Protocols_ extends Protocols = Protocols,
        SelfToPeer extends NetworkNodeConnection<Protocols_> = NetworkNodeConnection<Protocols_>,
        Modules extends NetworkNodeModules<Protocols_, SelfToPeer> = NetworkNodeModules<Protocols_, SelfToPeer>,
    > = {
    [module in keyof Modules]: Modules[module] extends NetworkNodeModule<Protocols_, SelfToPeer, infer _Modules, infer Connection> ? Connection : NetworkNodeModuleConnection<Protocols_, SelfToPeer>
}

export class NetworkNode<
        Protocols_ extends Protocols = Protocols,
        SelfToPeer extends NetworkNodeConnection<Protocols_> = NetworkNodeConnection<Protocols_>,
        Modules extends NetworkNodeModules<Protocols_, SelfToPeer> = NetworkNodeModules<Protocols_, SelfToPeer>,
    >
    implements Disposable {
    readonly connections = new ObservableList<SelfToPeer>()

    constructor(
            readonly modules: Modules
        ) {
    }

    async init() {
        await Promise.all(Object.values(this.modules).map(async module => await module.init?.(this)))
    }

    async dispose(): Promise<void> {
        await Promise.all(this.connections.map(connection => connection.dispose()))
    }
}

export class NetworkNodeConnection<
        out Protocols_ extends Protocols = Protocols,
    >
    implements Disposable {
    readonly #self: NetworkNode<Protocols_>
    readonly #socket: SocketWith<Protocols_>
    readonly #connections = new AsyncVariable<NetworkNodeModuleConnections<Protocols_>>()

    get self() {
        return this.#self
    }

    get socket() {
        return this.#socket
    }

    get connections() {
        return this.#connections.result
    }

    constructor(
            self: NetworkNode<Protocols_>,
            socket: SocketWith<Protocols_>,
        ) {
        this.#self = self
        this.#socket = socket
    }

    async initialize() {
        await this.#connections.perform(() => this.#initialize())
    }

    async dispose(): Promise<void> {
        await Promise.all(Object.values(await this.#connections).map(async connection => await connection.dispose?.()))
    }

    async #initialize() {
        return <NetworkNodeModuleConnections<Protocols_>>
            Object.fromEntries(
                await Promise.all(
                    Object.entries(this.self.modules)
                        .map(async ([name, module]) =>
                            [name, await module.connect(this)] as const
                        )
                )
            )
    }
}

export class NetworkClientNodeModule<
        Protocols_ extends ClientNetworkProtocols = ClientNetworkProtocols,
    >
    implements NetworkNodeModule<
        Protocols_,
        ClientToServerNetworkConnection<Protocols_>,
        ClientNetworkNodeModules<Protocols_>,
        ClientNetworkNodeModuleConnection<Protocols_>
    > {
    connect(connection: ClientToServerNetworkConnection<Protocols_>): ClientNetworkNodeModuleConnection<Protocols_> {
        return new ClientNetworkNodeModuleConnection(connection)
    }
}

export class ClientNetworkNodeModuleConnection<
        Protocols_ extends ClientNetworkProtocols = ClientNetworkProtocols
    >
    extends ListeningNetworkNodeModuleConnection<
        Protocols_,
        ClientToServerNetworkConnection<Protocols_>,
        ClientNetworkNodeModules<Protocols_>,
        ClientNetworkNodeModuleName
    > {
    readonly serverReady = new AsyncVariable<void>()

    override get moduleName(): ClientNetworkNodeModuleName {
        return ClientNetworkNodeModuleName
    }

    constructor(
            connection: ClientToServerNetworkConnection<Protocols_>,
            readonly serverReadyTimeout = 10_000
        ) {
        super(connection)

        connection.socket.on("disconnect", (_reason, _desc) => {
            connection.dispose()
        })

        this.serverReady.timeout(serverReadyTimeout)
    }

    protected override listeners() {
        return <Partial<ListenProtocols<Protocols_>>>{
            [NetworkReadyProtocol]: () => {
                if (!this.serverReady.complete)
                    this.serverReady.set()
            }
        }
    }
}

export const ClientNetworkNodeModuleName = "client"
export type ClientNetworkNodeModuleName = typeof ClientNetworkNodeModuleName

export type ClientNetworkNodeModules<Protocols_ extends ClientNetworkProtocols = ClientNetworkProtocols> = {
    client: NetworkClientNodeModule<Protocols_>
}

export const ClientNetworkNodeModules: ClientNetworkNodeModules = {
    client: new NetworkClientNodeModule()
}

export class ClientNetworkNode<
        Protocols_ extends ClientNetworkProtocols = ClientNetworkProtocols,
        Modules extends ClientNetworkNodeModules & NetworkNodeModules<Protocols_, ClientToServerNetworkConnection<Protocols_>> = ClientNetworkNodeModules & NetworkNodeModules<Protocols_, ClientToServerNetworkConnection<Protocols_>>,
    >
    extends NetworkNode<Protocols_, ClientToServerNetworkConnection<Protocols_>, Modules> {
    async connect(uri: string, options?: Partial<SocketOptions & ManagerOptions>) {
        const socket = <SocketWith<Protocols_>>io(uri, {
            parser,
            ...options,
        })

        if (options?.autoConnect === false)
            socket.connect()

        const connection = new ClientToServerNetworkConnection<Protocols_>(this, socket)
        this.connections.push(connection)
        await connection.initialize()

        return connection
    }
}

export class ClientToServerNetworkConnection<Protocols_ extends ClientNetworkProtocols = ClientNetworkProtocols>
    extends NetworkNodeConnection<Protocols_> {
    constructor(
            self: ClientNetworkNode<Protocols_>,
            socket: SocketWith<Protocols_>,
        ) {
        super(self, socket)
    }

    override async dispose(): Promise<void> {
        await super.dispose()
        this.socket.close()
    }

    override async initialize(): Promise<void> {
        await super.initialize()
        const { client } = <NetworkNodeModuleConnections<Protocols_, ClientToServerNetworkConnection<Protocols_>, ClientNetworkNodeModules<Protocols_>>>this.connections
        await client.serverReady
    }
}
