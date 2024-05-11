import { promises as afs } from "fs"
import { ConnectConfig } from "ssh2"
import { HostId, parseHostId } from "./HostId.js"
import { pathType } from "./utils/base.js"

export type Ssh2SshOptions = Omit<ConnectConfig, "host" | "port" | "user" | "passphrase" | "privateKey" | "passphrase" | "password">

export interface SshHostBaseOptions {
    host: string,
    port?: number,
    user?: string,
    privateKey?: string,
    privateKeyPath?: string,
    passphrase?: string,
    password?: string,
    hops?: HopHostOptions[] | undefined,
}

export interface SshHostBaseSettings {
    host: string,
    port: number,
    user: string,
    privateKey?: string,
    privateKeyPath?: string,
    passphrase?: string,
    password?: string,
    hops: HopHostSettings[] | undefined,
}


export type SshHostOptions = SshHostBaseOptions & Ssh2SshOptions
export type SshHostTargetSettings =
    Omit<SshHostBaseSettings, "hops"> &
    Pick<SshHostBaseOptions, "hops"> &
    Ssh2SshOptions & {
        id: HostId,
    }
export type SshHostSettings = SshHostBaseSettings & Ssh2SshOptions & {
    id: HostId,
}

export type HopHostOptions = Omit<SshHostOptions, "hops" | "id">
export type HopHostSettings = Omit<SshHostSettings, "hops" | "id">

export const defaultSshHostSettings: SshHostSettings = {
    host: undefined as any,
    port: 22,
    user: "root",
    hops: undefined,
    id: undefined as any,
    readyTimeout: 1000 * 8,
}

export function completeTargetSettings(
    options: SshHostOptions
): SshHostTargetSettings {
    return {
        ...defaultSshHostSettings,
        ...options,
        id: parseHostId(options),
    }
}

export async function loadSettings(
    options: SshHostOptions
): Promise<SshHostSettings> {
    const ret = completeTargetSettings(options)

    if (Array.isArray(options.hops)) {
        ret.hops = await Promise.all(
            options.hops.map(
                loadSettings
            )
        )
    }

    if (
        typeof ret.privateKey != "string" &&
        typeof ret.privateKeyPath == "string"
    ) {
        if ((await pathType(ret.privateKeyPath)) != "FILE") {
            throw new Error(
                "Private key not exist at '" +
                ret.privateKeyPath + "'"
            )
        }

        ret.privateKey = await afs.readFile(
            ret.privateKeyPath,
            {
                encoding: "utf8"
            }
        )
    }

    return ret as SshHostSettings
}
