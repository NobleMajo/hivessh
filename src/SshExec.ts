import { ClientChannel, ExecOptions, Client as SshClient } from "ssh2";
import { Readable } from "stream";
import { Awaitable } from "./utils/base.js";

export interface ArrayOptions {
    concurrency?: number;
    signal?: AbortSignal;
    encoding?: BufferEncoding
}

export interface CmdChannelOptions extends ExecOptions {
    pwd?: string,
    timeoutMillis?: number,
    sudo?: boolean,
}

export interface CmdChannelSettings extends ExecOptions {
    pwd: string,
    timeoutMillis: number,
    sudo: boolean,
}

export const defaultCmdChannelSettings: CmdChannelSettings = {
    pwd: "/",
    timeoutMillis: -1,
    sudo: false,
}

export type CmdExecOptions = CmdChannelOptions & ChannelToPromiseOptions

export interface SshChannelExit {
    cmd: string,
    out: string,
    chunks: [boolean, string][],
    anyErr: boolean,
    anyStd: boolean,
    code: number,
    signal?: string,
    dump?: string,
    desc?: string
}

export class SshChannelExitError extends Error {
    constructor(
        message: string,
        public exit: SshChannelExit,
    ) {
        super(message)
    }
}

export type SshChannelToPromise = (options?: ChannelToPromiseOptions) => Promise<SshChannelExit>

export interface SshChannelExtras {
    cmd: string,
    timeout?: NodeJS.Timeout | undefined,
    settings: CmdChannelSettings,
    stdout: Readable,
    toPromise: SshChannelToPromise
}

export type SshChannel = Omit<ClientChannel, "stdout"> & SshChannelExtras

export function toSshChannel(
    channel: ClientChannel,
    extras: SshChannelExtras,
): SshChannel {
    const sshChannel = channel as any

    for (const key of Object.typedKeys(extras)) {
        sshChannel[key] = extras[key]
    }

    return sshChannel
}

export async function execSshChannel(
    sshClient: SshClient,
    cmd: string,
    options?: CmdChannelOptions
): Promise<SshChannel> {
    const settings: CmdChannelSettings = {
        ...defaultCmdChannelSettings,
        ...options,
    }

    settings.env = {
        ...settings.env,
        PWD: settings.pwd,
    }

    if (settings.sudo) {
        cmd = "sudo " + cmd
    }

    const baseChannel = await new Promise<ClientChannel>(
        (res, rej) => sshClient.exec(
            cmd,
            settings,
            (err, channel) =>
                err ?
                    rej(err) :
                    res(channel)
        )
    )

    const channel = toSshChannel(
        baseChannel,
        {
            cmd,
            settings,
            stdout: baseChannel.stdout,
            toPromise: sshChannelToPromise(
                baseChannel,
                cmd,
            )
        }
    )

    if (
        typeof settings.timeoutMillis == "number" &&
        settings.timeoutMillis > 0
    ) {

        channel.timeout = setTimeout(
            () => {
                if (!channel.closed) {
                    channel.close(
                        "Timeout",
                        settings.timeoutMillis
                    )
                }
            },
            settings.timeoutMillis
        )
        channel.once(
            "close",
            () => clearTimeout(
                channel.timeout
            )
        )
    }

    return channel
}

export type StreamDataMapper = (
    data: string,
    err: boolean
) => Awaitable<string | undefined | void>

export type StreamDataFilter = (
    data: string,
    err: boolean,
    options?: Pick<ArrayOptions, "signal">
) => Awaitable<boolean>

export interface ChannelToPromiseOptions {
    mapOut?: StreamDataMapper,
    mapStdOut?: StreamDataMapper,
    mapErrOut?: StreamDataMapper,
    filterOut?: StreamDataFilter,
    filterStdOut?: StreamDataFilter,
    filterErrOut?: StreamDataFilter,
    filterOutOptions?: ArrayOptions,
    filterStdOutOptions?: ArrayOptions,
    filterErrOutOptions?: ArrayOptions,
    throwOnOut?: boolean,
    throwOnStdOut?: boolean,
    throwOnErrOut?: boolean,
    expectedExitCode?: number | number[],
}

export interface ChannelToPromiseSettings {
    mapOut: StreamDataMapper | undefined,
    mapStdOut: StreamDataMapper | undefined,
    mapErrOut: StreamDataMapper | undefined,
    filterOut: StreamDataFilter | undefined,
    filterStdOut: StreamDataFilter | undefined,
    filterErrOut: StreamDataFilter | undefined,
    filterOutOptions: ArrayOptions | undefined,
    filterStdOutOptions: ArrayOptions | undefined,
    filterErrOutOptions: ArrayOptions | undefined,
    throwOnOut: boolean | undefined,
    throwOnStdOut: boolean,
    throwOnErrOut: boolean,
    expectedExitCode: number[],
}

export const defaultChannelToPromiseSettings: ChannelToPromiseSettings = {
    mapOut: undefined,
    mapStdOut: undefined,
    mapErrOut: undefined,
    filterOut: undefined,
    filterStdOut: undefined,
    filterErrOut: undefined,
    filterOutOptions: undefined,
    filterStdOutOptions: undefined,
    filterErrOutOptions: undefined,
    throwOnOut: undefined,
    throwOnStdOut: false,
    throwOnErrOut: true,
    expectedExitCode: [0],
}

export function checkDataChunk(chunk: any): string {
    if (chunk instanceof Buffer) {
        return chunk.toString("utf8")
    } else if (typeof chunk != "string") {
        throw new Error(
            "Unexpected chunk type: '" + typeof chunk + "'\n" +
            "Value: '" + chunk + "'"
        )
    }
    return chunk
}

export function sshChannelToPromise(
    channel: ClientChannel,
    cmd: string,
): SshChannelToPromise {
    return (
        options?: ChannelToPromiseOptions
    ) => {
        let resolved: boolean = false
        let resolveValue: SshChannelExit | PromiseLike<SshChannelExit>

        let rejected: boolean = false
        let rejectReason: any

        let res: (value: SshChannelExit | PromiseLike<SshChannelExit>) => void = (value) => {
            if (rejected || resolved) {
                return
            }
            resolved = true
            resolveValue = value
        }
        let rej: (reason?: any) => void = (reason) => {
            if (rejected || resolved) {
                return
            }
            rejected = true
            rejectReason = reason
        }

        const settings: ChannelToPromiseSettings = {
            ...defaultChannelToPromiseSettings,
            ...options,
            expectedExitCode: undefined as any,
        }

        if (typeof settings.expectedExitCode == "number") {
            settings.expectedExitCode = [settings.expectedExitCode]
        }

        const chunks: [boolean, string][] = []
        let anyErr: boolean = false
        let anyStd: boolean = false
        let stdout: Readable = channel.stdout
        let stderr: Readable = channel.stderr

        if (typeof settings == "object") {
            if (settings.filterOut) {
                settings.filterStdOut = settings.filterOut
                settings.filterErrOut = settings.filterOut
            }
            if (settings.filterOutOptions) {
                settings.filterStdOutOptions = settings.filterOutOptions
                settings.filterErrOutOptions = settings.filterOutOptions
            }
            if (settings.throwOnOut) {
                settings.throwOnStdOut = settings.throwOnOut
                settings.throwOnErrOut = settings.throwOnOut
            }

            if (settings.mapOut) {
                settings.mapStdOut = settings.mapOut
                settings.mapErrOut = settings.mapOut
            }

            if (settings.filterStdOut) {
                const filterStdOut = settings.filterStdOut
                stdout.filter(
                    (data, options) => filterStdOut(
                        data,
                        false,
                        options
                    ),
                    settings.filterStdOutOptions
                )
            }
            if (settings.filterErrOut) {
                const filterErrOut = settings.filterErrOut
                stderr.filter(
                    (data, options) => filterErrOut(
                        data,
                        true,
                        options
                    ),
                    settings.filterErrOutOptions
                )
            }

            if (settings.mapStdOut) {
                const mapStdOut = settings.mapStdOut
                stdout.on("data", (chunk) => {
                    chunk = checkDataChunk(chunk)
                    chunk = mapStdOut(chunk, false)
                    if (typeof chunk == "string") {
                        chunks.push([false, "" + chunk])
                    }
                })
            } else {
                stdout.on("data", (chunk) => {
                    chunk = checkDataChunk(chunk)
                    chunks.push([false, "" + chunk])
                })
            }

            if (settings.mapErrOut) {
                const mapErrOut = settings.mapErrOut
                stderr.on("data", (chunk) => {
                    chunk = checkDataChunk(chunk)
                    chunk = mapErrOut(chunk, true)
                    if (typeof chunk == "string") {
                        chunks.push([true, "" + chunk])
                    }
                })
            } else {
                stderr.on("data", (chunk) => {
                    chunk = checkDataChunk(chunk)
                    chunks.push([true, "" + chunk])
                })
            }
        } else {
            stdout.on("data", (chunk) => {
                chunk = checkDataChunk(chunk)
                chunks.push([false, "" + chunk])
            })

            stderr.on("data", (chunk) => {
                chunk = checkDataChunk(chunk)
                chunks.push([true, "" + chunk])
            })
        }

        stdout.on("data", () => {
            anyStd = true
        })

        stderr.on("data", () => {
            anyErr = true
        })

        channel.once(
            "error",
            (err: Error) => {
                rej(err)
                if (!channel.closed) {
                    channel.close()
                }
            }
        )

        channel.once(
            "close",
            (...params: any[]) => channel.emit("exit", ...params)
        )

        channel.once("exit", (
            code: number | null,
            signal?: string,
            dump?: string,
            desc?: string,
        ) => {
            if (!channel.closed) {
                channel.close()
            }

            const exit: SshChannelExit = {
                cmd,
                code: code === null ? -1 : code,
                signal,
                dump,
                desc,
                chunks,
                anyErr,
                anyStd,
                out: chunks.map((v) => v[1]).join("\n")
            }

            if (options) {
                if (
                    options.throwOnErrOut &&
                    anyErr
                ) {
                    rej(new SshChannelExitError(
                        "Unexpected error stream output:\n  " +
                        chunks.filter(
                            (chunks) => chunks[0]
                        ).join("\n  "),
                        exit
                    ))
                    return
                }
                if (
                    options.throwOnStdOut &&
                    anyStd
                ) {
                    rej(new SshChannelExitError(
                        "Unexpected standard stream output:\n  " +
                        chunks.filter(
                            (chunks) => !chunks[0]
                        ).join("\n  "),
                        exit
                    ))
                    return

                }
            }

            res(exit)
        })


        return new Promise<SshChannelExit>(
            (res2, rej2) => {
                if (resolved) {
                    res2(resolveValue)
                    return
                } else if (rejected) {
                    rej2(rejectReason)
                    return
                }

                res = res2
                rej = rej2
            }
        )
    }
}