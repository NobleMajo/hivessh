import { ClientChannel, Client as SshClient } from "ssh2";
import { HopHostSettings, SshHostBaseSettings } from "./SshHostOptions.js";

export function createClient(
    settings: HopHostSettings,
): Promise<SshClient> {
    return new Promise<SshClient>((res, rej) => {
        const hopClient = new SshClient()

        hopClient.on("ready", () => res(hopClient))
        hopClient.on("error", rej)
        hopClient.connect({
            ...settings,
            host: settings.sock ? undefined : settings.host,
            port: settings.sock ? undefined : settings.port,
        })
    })
}

export function createForward(
    ssh: SshClient,
    srcHost: string,
    srcPort: number,
    targetHost: string,
    targetPort: number,
): Promise<ClientChannel> {
    return new Promise<ClientChannel>((res, rej) => {
        ssh.forwardOut(
            srcHost,
            srcPort,
            targetHost,
            targetPort,
            (err, stream) => {
                if (err) {
                    ssh.end()
                    rej(err)
                    return
                }

                res(stream)
            })
    })
}

export async function handleHops(
    settings: SshHostBaseSettings,
    defaultSrcHost: string = "127.0.0.1",
    defaultSrcPort: number = 60022,
): Promise<SshClient> {
    const hops = settings.hops
    if (
        hops === undefined ||
        hops.length == 0
    ) {
        return createClient(settings)
    }

    let lastHop: SshClient = await createClient(hops[0])

    for (let i = 1; i < hops.length; i++) {
        const nextSetting = hops[i]

        const channel = await createForward(
            lastHop,
            defaultSrcHost,
            defaultSrcPort,
            nextSetting.host,
            nextSetting.port,
        )

        lastHop = await createClient({
            ...nextSetting,
            host: undefined as any,
            port: undefined as any,
            sock: channel,
        })
    }

    const channel = await createForward(
        lastHop,
        defaultSrcHost,
        defaultSrcPort,
        settings.host,
        settings.port,
    )

    const finalSshClient = await createClient({
        ...settings,
        host: undefined as any,
        port: undefined as any,
        sock: channel,
    })

    return finalSshClient
}