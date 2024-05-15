import * as path from "path";
import { CmdChannelOptions, CmdExecOptions, SshChannel, SshChannelExit } from "./SshExec.js";
import { SshHost } from "./SshHost.js";

export interface ProcessEnv {
    TZ?: string,
    PWD: string,
    [key: string]: string | undefined
}

export class ExecSession {
    timeoutMillis?: number
    sudo?: boolean

    constructor(
        public host: SshHost,
        public env: ProcessEnv,
    ) { }

    clone(): ExecSession {
        const session = new ExecSession(
            this.host,
            {
                ...this.env
            }
        )
        session.timeoutMillis = this.timeoutMillis
        session.sudo = this.sudo
        return session
    }

    cd(
        newPath: string,
    ): void {
        if (!newPath.startsWith("/")) {
            newPath = path.normalize(this.env.PWD + "/" + newPath)
        }

        this.env.PWD = newPath
    }

    setEnv(
        key: string,
        value: string,
    ): void {
        this.env[key] = value
    }

    unsetEnv(
        key: string,
    ): void {
        if (key.toUpperCase() == "PWD") {
            throw new Error("Cant unset process working directory (PWD) in a ExecSession")
        }

        delete this.env[key]
    }

    parseCmdChannelOptions(
        options?: CmdChannelOptions
    ): CmdChannelOptions {
        options = {
            sudo: this.sudo,
            timeoutMillis: this.timeoutMillis,
            ...options,
            pwd: undefined,
            env: {
                ...this.env,
                ...options?.env,
            },
        }

        return options
    }

    execChannel(
        cmd: string,
        options?: CmdChannelOptions
    ): Promise<SshChannel> {
        options = this.parseCmdExecOptions(
            options
        )

        return this.host.execChannel(
            cmd,
            options,
        )
    }

    parseCmdExecOptions(
        options?: CmdExecOptions
    ): CmdExecOptions {
        options = {
            sudo: this.sudo,
            timeoutMillis: this.timeoutMillis,
            ...options,
            pwd: undefined,
            env: {
                ...this.env,
                ...options?.env,
            },
        }

        return options
    }

    async exec(
        cmd: string,
        options?: CmdExecOptions
    ): Promise<SshChannelExit> {
        options = this.parseCmdExecOptions(
            options
        )

        return this.host.exec(
            cmd,
            options,
        )
    }
}