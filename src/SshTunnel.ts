import net, { type ListenOptions as ServerOptions } from "net";
import { Client } from "ssh2";

export type LocalHostPortExtraOptions =
    Omit<
        Partial<ServerOptions>,
        "host" | "port" | "path"
    >

export type SshTunnelOutLocalHostPort = {
    localHost: string,
    localPort: number,
} & LocalHostPortExtraOptions

export type SshTunnelOutLocalSocket = {
    localPath: string,
} & LocalHostPortExtraOptions

export interface SshTunnelOutRemoteHostPort {
    remoteHost: string,
    remotePort: number,
    forwardSourceHost?: string
    forwardSourcePort?: number
}

export interface SshTunnelOutRemoteSocket {
    remotePath: string,
}

export type SshTunnelLocalOutOptions =
    SshTunnelOutLocalHostPort |
    SshTunnelOutLocalSocket

export type SshTunnelRemoteOutOptions =
    SshTunnelOutRemoteHostPort |
    SshTunnelOutRemoteSocket

export type SshTunnelOutOptions =
    SshTunnelLocalOutOptions &
    SshTunnelRemoteOutOptions

/**
 * Returns true if the given options are for a local socket (i.e. path is present).
 *
 * @param options - The options to check.
 * @returns True if the options are for a local socket, otherwise false.
 */
export function isSshTunnelOutLocalSocketOption(
    options: SshTunnelOutOptions,
): options is SshTunnelOutLocalSocket & SshTunnelRemoteOutOptions {
    return typeof options == "object" &&
        options != null &&
        typeof (options as any).localPath == "string"
}

/**
 * Returns true if the given options are for a remote socket (i.e. remotePath is present).
 *
 * @param options - The options to check.
 * @returns True if the options are for a remote socket, otherwise false.
 */
export function isSshTunnelOutRemoteSocketOption(
    options: SshTunnelOutOptions,
): options is SshTunnelLocalOutOptions & SshTunnelOutRemoteSocket {
    return typeof options == "object" &&
        options != null &&
        typeof (options as any).remotePath == "string"
}

/**
 * @experimental This function is experimental and may not be stable.
 * Tunnels incoming server socket conntions to a remote host and port bind (not linux socket).
 *
 * This function establishes an SSH tunnel by forwarding
 * a local server's address and port to a specified remote
 * host and port. It manages the connection and lifecycle of 
 * the tunnel, ensuring that resources are cleaned up upon 
 * closure of the server or socket.
 *
 * @param sshClient - The SSH client instance used to establish the tunnel.
 * @param server - The local server for which the tunnel is being created.
 * @param socket - The socket associated with the server.
 * @param tunnelOptions - Options specifying remote host and port details 
 *                        and optional forwarding source host and port.
 *
 * @throws {Error} If the server's socket address is invalid.
 */
export function handleRemoteHostPortOutTunnel(
    sshClient: Client,
    server: net.Server,
    socket: net.Socket,
    tunnelOptions: SshTunnelOutRemoteHostPort
) {
    const address = server.address() as net.AddressInfo
    if (
        typeof address.address != "string" ||
        typeof address.family != "string" ||
        typeof address.port != "number"
    ) {
        throw new Error(
            "Invalid server socket address: " +
            JSON.stringify(address, null, 2)
        )
    }

    sshClient.forwardOut(
        tunnelOptions.forwardSourceHost ??
        address.address,
        tunnelOptions.forwardSourcePort ??
        address.port,
        tunnelOptions.remoteHost,
        tunnelOptions.remotePort, (err, clientChannel) => {
            if (err) {
                server.emit("error", err)
                return
            }

            server.on('close', () => {
                if (!clientChannel.closed) {
                    clientChannel.end()
                }
                if (!socket.closed) {
                    socket.end()
                }
            })
            socket.pipe(clientChannel).pipe(socket)
        })
}

/**
 * @experimental This function is experimental and may not be stable.
 * Tunnels incoming server socket conntions to a remote socket (not address and port bind) using openssh.
 *
 * This function establishes an SSH tunnel by forwarding
 * a local server's address and port to a specified remote
 * socket path. It manages the connection and lifecycle of 
 * the tunnel, ensuring that resources are cleaned up upon 
 * closure of the server or socket.
 *
 * @param sshClient - The SSH client instance used to establish the tunnel.
 * @param server - The local server for which the tunnel is being created.
 * @param socket - The socket associated with the server.
 * @param tunnelOptions - Options specifying remote socket path details 
 *                        and optional forwarding source host and port.
 *
 * @throws {Error} If the server's socket address is invalid.
 */
export function handleRemoteSocketOutTunnel(
    sshClient: Client,
    server: net.Server,
    socket: net.Socket,
    tunnelOptions: SshTunnelOutRemoteSocket
) {
    const address = server.address() as net.AddressInfo
    if (
        typeof address.address != "string" ||
        typeof address.family != "string" ||
        typeof address.port != "number"
    ) {
        throw new Error(
            "Invalid server socket address: " +
            JSON.stringify(address, null, 2)
        )
    }

    sshClient.openssh_forwardOutStreamLocal(
        tunnelOptions.remotePath,
        (err, clientChannel) => {
            if (err) {
                server.emit("error", err)
                return
            }

            server.on('close', () => {
                if (!clientChannel.closed) {
                    clientChannel.end()
                }
                if (!socket.closed) {
                    socket.end()
                }
            })
            socket.pipe(clientChannel).pipe(socket)
        }
    )
}

/**
 * @experimental This function is experimental and may not be stable.
 * Creates a local server that tunnels incoming connections to a remote linux socket or host and port bind.
 *
 * You need to close the server to stop tunneling!
 * 
 * This function creates a server that listens for incoming connections and forwards them to the remote SSH host. 
 * 
 * @param sshClient - The SSH client instance used to establish the tunnel.
 * @param tunnelOptions - Options specifying remote linux socket or host and port details.
 * 
 * @returns A promise that resolves to the created server that need to be closed.
 */
export function tunnelOut(
    sshClient: Client,
    tunnelOptions: SshTunnelOutOptions,
): Promise<net.Server> {
    return new Promise<net.Server>((res, rej) => {
        let server: net.Server

        server = net.createServer()
        server.on('error', (err) => {
            server.close()
            rej(err)
        })

        server.on('connection',
            isSshTunnelOutRemoteSocketOption(tunnelOptions) ?
                (socket) => handleRemoteSocketOutTunnel(
                    sshClient,
                    server,
                    socket,
                    tunnelOptions,
                ) :
                (socket) => handleRemoteHostPortOutTunnel(
                    sshClient,
                    server,
                    socket,
                    tunnelOptions,
                )
        )

        const baseTunnelServerOptions =
            isSshTunnelOutLocalSocketOption(tunnelOptions) ?
                {
                    path: tunnelOptions.localPath,
                } :
                {
                    host: tunnelOptions.localHost,
                    port: tunnelOptions.localPort,
                }

        server.listen({
            ...tunnelOptions,
            ...baseTunnelServerOptions,
        })

        res(server)
    })
}
