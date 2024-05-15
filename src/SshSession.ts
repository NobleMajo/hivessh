import { CmdChannelOptions, CmdExecOptions, SshChannel, SshChannelExit } from "./SshExec.js";
import { SshHost } from "./SshHost.js";

export interface SessionOptions {
    pwd?: string,
    timeoutMillis?: number,
    sudo?: boolean,
    env?: NodeJS.ProcessEnv;
}

export class SshSession implements SessionOptions {
    pwd?: string
    timeoutMillis?: number
    sudo?: boolean
    env?: NodeJS.ProcessEnv

    constructor(
        public host: SshHost,
        public options?: SessionOptions
    ) {
        if (options) {
            for (
                const key of Object.typedKeys(options)
            ) {
                this[key] = options[key] as any
            }
        }
    }

    cd(
        path: string,
    ): void {
        this.pwd = path
    }

    setEnv(
        key: string,
        value: string,
    ): void {
        if (!this.env) {
            this.env = {}
        }
        this.env[key] = value
    }

    unsetEnv(
        key: string,
    ): void {
        if (!this.env) {
            return
        }

        delete this.env[key]

        if (Object.keys(this.env).length == 0) {
            this.env = undefined
        }
    }

    parseCmdPaths(
        cmd: string | string[],
    ): string {
        if (this.pwd) {
            if (this.pwd.endsWith("/")) {
                this.pwd = this.pwd.slice(0, -1)
            }

            if (typeof cmd == "string") {
                if (cmd.startsWith("./")) {
                    cmd = this.pwd + cmd.slice(1)
                }
            } else if (Array.isArray(cmd)) {
                cmd = cmd.map((v) => {
                    if (v.startsWith("./")) {
                        v = this.pwd + v.slice(1)
                    }
                    return v
                })
            }
        }

        if (Array.isArray(cmd)) {
            return cmd.join("")
        }
        return cmd
    }

    parseCmdChannelOptions(
        options?: CmdChannelOptions
    ): CmdChannelOptions {
        if (options) {
            if (options.env) {
                this.env = {
                    ...this.env,
                    ...options.env,
                }
            }
            if (options.pwd) {
                this.pwd = options.pwd
            }
            if (options.sudo) {
                this.sudo = options.sudo
            }
            if (options.timeoutMillis) {
                this.timeoutMillis = options.timeoutMillis
            }
        }

        options = {
            ...options,
            env: this.env,
            pwd: this.pwd,
            sudo: this.sudo,
            timeoutMillis: this.timeoutMillis,
        }

        return options
    }

    parseCmdExecOptions(
        options?: CmdExecOptions
    ): CmdExecOptions {
        if (options) {
            if (options.env) {
                this.env = {
                    ...this.env,
                    ...options.env,
                }
            }
            if (options.pwd) {
                this.pwd = options.pwd
            }
            if (options.sudo) {
                this.sudo = options.sudo
            }
            if (options.timeoutMillis) {
                this.timeoutMillis = options.timeoutMillis
            }
        }

        options = {
            ...options,
            env: this.env,
            pwd: this.pwd,
            sudo: this.sudo,
            timeoutMillis: this.timeoutMillis,
        }

        return options
    }

    execChannel(
        cmd: string | string[],
        options?: CmdChannelOptions
    ): Promise<SshChannel> {
        options = this.parseCmdChannelOptions(
            options
        )
        cmd = this.parseCmdPaths(cmd)

        return this.host.execChannel(
            cmd,
            options,
        )
    }

    async exec(
        cmd: string | string[],
        options?: CmdExecOptions
    ): Promise<SshChannelExit> {
        options = this.parseCmdExecOptions(
            options
        )
        cmd = this.parseCmdPaths(cmd)

        return this.host.exec(
            cmd,
            options,
        )
    }

    async exists(
        cmd: string | string[],
    ): Promise<boolean> {
        return this.host.exists(
            this.parseCmdPaths(cmd),
        )
    }
}