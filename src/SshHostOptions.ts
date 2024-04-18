import { promises as afs } from "fs"
import { ConnectConfig } from "ssh2"
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
    Ssh2SshOptions
export type SshHostSettings = SshHostBaseSettings & Ssh2SshOptions

export type HopHostOptions = Omit<SshHostOptions, "hops">
export type HopHostSettings = Omit<SshHostSettings, "hops">

export const defaultSshHostSettings: SshHostSettings = {
    host: undefined as any,
    port: 22,
    user: "root",
    hops: undefined,
    readyTimeout: 1000 * 8,
}

export function completeTargetSettings(
    options: SshHostOptions
): SshHostTargetSettings {
    const ret: SshHostTargetSettings = {
        ...defaultSshHostSettings,
        ...options,
    }

    return ret
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
        typeof options.privateKey != "string" &&
        typeof options.privateKeyPath == "string"
    ) {
        if ((await pathType(options.privateKeyPath)) != "FILE") {
            throw new Error(
                "Private key not exist at '" +
                options.privateKeyPath + "'"
            )
        }

        options.privateKey = await afs.readFile(
            options.privateKeyPath,
            {
                encoding: "utf8"
            }
        )
    }

    return ret as SshHostSettings
}
