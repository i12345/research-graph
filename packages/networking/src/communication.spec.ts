import test from "ava"
import getPort from "get-port"
import * as https from "node:https"
import { readFile } from "node:fs/promises"
import { Server } from "socket.io"
import { listen, send, parser, Protocols, HalfProtocolsToEvents, SocketWith } from "./communication.js"
import { AsyncVariable } from "@graph/utils"
import { io } from "socket.io-client"

test("send/listen 1", async t => {
    const port = await getPort()
    const cert = {
        cert: await readFile(".cert/cert.pem", { encoding: "utf-8" }),
        key: await readFile(".cert/key.pem", { encoding: "utf-8" }),
    } as const

    const httpsServer = https.createServer({
        ...cert,
    })

    type ClientToServerProtocols = {
        upload(file: string, contents: Uint8Array): void
        donwload(file: string): Uint8Array
    }

    type ServerToClientProtocols = {
        broadcast(msg: string): void
    }

    type ClientProtocols = Protocols<ClientToServerProtocols, ServerToClientProtocols>
    type ServerProtocols = Protocols<ServerToClientProtocols, ClientToServerProtocols>

    const svr = new Server<HalfProtocolsToEvents<ClientToServerProtocols>, HalfProtocolsToEvents<ServerToClientProtocols>>(httpsServer, {
        parser,
    })

    const svrFiles = new Map<string, Uint8Array>()
    svr.on("connection", serverToClient => {
        const listener = listen<ServerProtocols>(<SocketWith<ServerProtocols>><unknown>serverToClient, {
            donwload(file) {
                const contents = svrFiles.get(file)
                if (contents === undefined)
                    throw new Error()
                return contents
            },
            upload(file, contents) {
                svrFiles.set(file, contents)
            },
        })

        serverToClient.on("disconnecting", async reason => await AsyncVariable.performCallback(cb => serverToClient.broadcast.emit("broadcast", `client disconnecting d/t ${reason}`, cb)))
        serverToClient.on("disconnect", () => listener.dispose())
    })

    httpsServer.listen(port)

    const clientToServer: SocketWith<ClientProtocols> = io(`https://localhost:${port}`, {
        rejectUnauthorized: false,
        parser,
    })

    await AsyncVariable.wait(100)

    const file1 = new Uint8Array(await readFile("test/file1.txt"))
    const file2 = new Uint8Array([1, 3])
    await send(clientToServer, "upload", "file1.txt", file1)
    await send(clientToServer, "upload", "file2", file2)
    const donwloaded1 = await send(clientToServer, "donwload", "file1.txt")
    const donwloaded2 = await send(clientToServer, "donwload", "file2")
    t.deepEqual(donwloaded1, file1)
    t.deepEqual(donwloaded2, file2)

    clientToServer.close()
    await svr.close()
})
