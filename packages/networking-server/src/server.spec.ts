import { ClientNetworkNode, ClientNetworkNodeModules, ClientNetworkProtocols, listen, NetworkNodeConnection, NetworkNodeModule, NetworkNodeModuleConnection, PeerToPeerProtocols, send, ServerNetworkProtocols } from '@graph/networking'
import { ServerNetworkNode, ServerNetworkNodeModules } from './server.js'
import getPort from "get-port"
import { readFile } from "node:fs/promises"
import test from "ava"
import { AsyncVariable } from '@graph/utils'

test("server 1", async t => {
    type Protocols = PeerToPeerProtocols<{
        chat(msg: string): string
    }>

    const port = await getPort()
    const cert = {
        cert: await readFile(".cert/cert.pem", { encoding: "utf-8" }),
        key: await readFile(".cert/key.pem", { encoding: "utf-8" }),
    } as const

    const modules = {
        server: ServerNetworkNodeModules,
        client: ClientNetworkNodeModules,
    } as const

    const server = new ServerNetworkNode<Protocols & ServerNetworkProtocols>(modules.server, {
        httpOptions: {
            port,
            cert,
            secret: "secret",
        },
        serverOptions: {
            transports: ["websocket", "polling"]
        }
    })
    await server.init()

    const client = new ClientNetworkNode<Protocols & ClientNetworkProtocols>(<ClientNetworkNodeModules<Protocols & ClientNetworkProtocols>>modules.client)
    await client.init()

    await server.start()
    await client.connect(`https://localhost:${port}`, {
        rejectUnauthorized: false,
    })

    const clientToServer = client.connections[0]!
    const serverToClient = server.connections[0]!

    function reverse(msg: string) {
        return msg.split('').reverse().join('')
    }

    function lower(msg: string) {
        return msg.toLowerCase()
    }
    
    listen(serverToClient.socket, {
        chat(msg) {
            console.log(`server->client: ${msg}`)
            return reverse(msg)
        },
    })

    listen(clientToServer.socket, {
        chat(msg) {
            console.log(`client->server: ${msg}`)
            return lower(msg)
        },
    })

    const clientToServerMsg1 = "msg1"
    console.log(`sending client->server ${clientToServerMsg1}`)
    const clientToServerResponse1 = await send(clientToServer.socket, "chat", clientToServerMsg1)
    console.log(`received: "${clientToServerResponse1}" expected "${reverse(clientToServerMsg1)}"`)
    t.is(clientToServerResponse1, reverse(clientToServerMsg1))

    const serverToClientMsg1 = "MSG2"
    console.log(`sending server->client ${serverToClientMsg1}`)
    const serverToClientResponse1 = await send(serverToClient.socket, "chat", serverToClientMsg1)
    console.log(`received: "${serverToClientResponse1}" expected "${lower(serverToClientMsg1)}"`)
    t.is(serverToClientResponse1, lower(serverToClientMsg1))

    await server.stop()
})

test("connect with server module connection initialize delay", async t => {
    type Protocols = PeerToPeerProtocols<{
        chat(msg: string): string
    }>

    const port = await getPort()
    const cert = {
        cert: await readFile(".cert/cert.pem", { encoding: "utf-8" }),
        key: await readFile(".cert/key.pem", { encoding: "utf-8" }),
    } as const

    const DelayConnectionInitializeModuleName = "delay"
    type DelayConnectionInitializeModuleName = typeof DelayConnectionInitializeModuleName

    class DelayConnectionInitializeModuleConnection implements NetworkNodeModuleConnection {
        get module() {
            return <any>this.connection.self.modules[DelayConnectionInitializeModuleName]
        }

        constructor(
            readonly connection: NetworkNodeConnection,
        ) { }
    }

    class DelayConnectionInitializeModule implements NetworkNodeModule {
        constructor(readonly delay: number) { }

        async connect(connection: NetworkNodeConnection) {
            const moduleConnection = new DelayConnectionInitializeModuleConnection(connection)
            await AsyncVariable.wait(this.delay)
            return <any>moduleConnection
        }
    }

    const DelayConnectionInitializeModules = {
        [DelayConnectionInitializeModuleName]: new DelayConnectionInitializeModule(2500),
    } as const

    const modules = {
        server: {
            ...ServerNetworkNodeModules,
            ...DelayConnectionInitializeModules,
        },
        client: {
            ...ClientNetworkNodeModules,
            // ...DelayConnectionInitializeModules,
        }
    } as const

    const server = new ServerNetworkNode<Protocols & ServerNetworkProtocols>(modules.server, {
        httpOptions: {
            port,
            cert,
            secret: "secret",
        },
        serverOptions: {
            transports: ["websocket", "polling"]
        }
    })
    await server.init()

    const client = new ClientNetworkNode<Protocols & ClientNetworkProtocols>(<ClientNetworkNodeModules<Protocols & ClientNetworkProtocols>>modules.client)
    await client.init()

    await server.start()
    await client.connect(`https://localhost:${port}`, {
        rejectUnauthorized: false,
    })

    const clientToServer = client.connections[0]!
    const serverToClient = server.connections[0]!

    function reverse(msg: string) {
        return msg.split('').reverse().join('')
    }

    function lower(msg: string) {
        return msg.toLowerCase()
    }
    
    listen(serverToClient.socket, {
        chat(msg) {
            console.log(`server->client: ${msg}`)
            return reverse(msg)
        },
    })

    listen(clientToServer.socket, {
        chat(msg) {
            console.log(`client->server: ${msg}`)
            return lower(msg)
        },
    })

    const clientToServerMsg1 = "msg1"
    console.log(`sending client->server ${clientToServerMsg1}`)
    const clientToServerResponse1 = await send(clientToServer.socket, "chat", clientToServerMsg1)
    console.log(`received: "${clientToServerResponse1}" expected "${reverse(clientToServerMsg1)}"`)
    t.is(clientToServerResponse1, reverse(clientToServerMsg1))

    const serverToClientMsg1 = "MSG2"
    console.log(`sending server->client ${serverToClientMsg1}`)
    const serverToClientResponse1 = await send(serverToClient.socket, "chat", serverToClientMsg1)
    console.log(`received: "${serverToClientResponse1}" expected "${lower(serverToClientMsg1)}"`)
    t.is(serverToClientResponse1, lower(serverToClientMsg1))

    await server.stop()
})

test("connect with client module connection initialize delay", async t => {
    type Protocols = PeerToPeerProtocols<{
        chat(msg: string): string
    }>

    const port = await getPort()
    const cert = {
        cert: await readFile(".cert/cert.pem", { encoding: "utf-8" }),
        key: await readFile(".cert/key.pem", { encoding: "utf-8" }),
    } as const

    const DelayConnectionInitializeModuleName = "delay"
    type DelayConnectionInitializeModuleName = typeof DelayConnectionInitializeModuleName

    class DelayConnectionInitializeModuleConnection implements NetworkNodeModuleConnection {
        get module() {
            return <any>this.connection.self.modules[DelayConnectionInitializeModuleName]
        }

        constructor(
            readonly connection: NetworkNodeConnection,
        ) { }
    }

    class DelayConnectionInitializeModule implements NetworkNodeModule {
        constructor(readonly delay: number) { }

        async connect(connection: NetworkNodeConnection) {
            const moduleConnection = new DelayConnectionInitializeModuleConnection(connection)
            await AsyncVariable.wait(this.delay)
            return <any>moduleConnection
        }
    }

    const DelayConnectionInitializeModules = {
        [DelayConnectionInitializeModuleName]: new DelayConnectionInitializeModule(2500),
    } as const

    const modules = {
        server: {
            ...ServerNetworkNodeModules,
            // ...DelayConnectionInitializeModules,
        },
        client: {
            ...ClientNetworkNodeModules,
            ...DelayConnectionInitializeModules,
        }
    } as const

    const server = new ServerNetworkNode<Protocols & ServerNetworkProtocols>(modules.server, {
        httpOptions: {
            port,
            cert,
            secret: "secret",
        },
        serverOptions: {
            transports: ["websocket", "polling"]
        }
    })
    await server.init()

    const client = new ClientNetworkNode<Protocols & ClientNetworkProtocols>(<ClientNetworkNodeModules<Protocols & ClientNetworkProtocols>><any>modules.client)
    await client.init()

    await server.start()
    await client.connect(`https://localhost:${port}`, {
        rejectUnauthorized: false,
    })

    const clientToServer = client.connections[0]!
    const serverToClient = server.connections[0]!

    function reverse(msg: string) {
        return msg.split('').reverse().join('')
    }

    function lower(msg: string) {
        return msg.toLowerCase()
    }
    
    listen(serverToClient.socket, {
        chat(msg) {
            console.log(`server->client: ${msg}`)
            return reverse(msg)
        },
    })

    listen(clientToServer.socket, {
        chat(msg) {
            console.log(`client->server: ${msg}`)
            return lower(msg)
        },
    })

    const clientToServerMsg1 = "msg1"
    console.log(`sending client->server ${clientToServerMsg1}`)
    const clientToServerResponse1 = await send(clientToServer.socket, "chat", clientToServerMsg1)
    console.log(`received: "${clientToServerResponse1}" expected "${reverse(clientToServerMsg1)}"`)
    t.is(clientToServerResponse1, reverse(clientToServerMsg1))

    const serverToClientMsg1 = "MSG2"
    console.log(`sending server->client ${serverToClientMsg1}`)
    const serverToClientResponse1 = await send(serverToClient.socket, "chat", serverToClientMsg1)
    console.log(`received: "${serverToClientResponse1}" expected "${lower(serverToClientMsg1)}"`)
    t.is(serverToClientResponse1, lower(serverToClientMsg1))

    await server.stop()
})
