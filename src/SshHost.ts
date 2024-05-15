import { ClientErrorExtensions, SFTPWrapper, Client as SshClient } from "ssh2"
import { ExecSession } from "./ExecSession.js"
import { handleHops } from "./HostHop.js"
import { CmdChannelOptions, CmdExecOptions, SshChannel, SshChannelExit, execSshChannel } from "./SshExec.js"
import { SshHostOptions, SshHostSettings, loadSettings } from "./SshHostOptions.js"
import { AbstractPackageManager, getApm } from "./apm/PackageManager.js"
import { OsRelease, fetchOsRelease } from "./essentials/OsRelease.js"
import { SFTPPromiseWrapper, createSFTPPromiseWrapper } from "./essentials/SftpPromiseWrapper.js"
import { Awaitable, trimAll } from "./utils/base.js"

export class SshHost {
    closeErr?: Error | string
    connected: boolean = false
    ssh: SshClient = undefined as any
    sftp: SFTPPromiseWrapper = undefined as any
    release: OsRelease = undefined as any

    static async connect(
        options: SshHostOptions,
    ): Promise<SshHost> {
        const host = new SshHost(
            await loadSettings(options)
        )
        await host.connect()
        return host
    }

    private constructor(
        public settings: SshHostSettings
    ) { }

    private emergencyClose(err: Error | string) {
        if (typeof err == "string") {
            err = new Error(err)
        }

        this.connected = false
        if (!this.closeErr) {
            this.closeErr = err
        }
        this.ssh.destroy()
    }

    throwCloseError(): void | never {
        if (!this.connected) {
            if (this.closeErr) {
                throw this.closeErr
            }

            throw new Error(
                "SshHost is not connected!"
            )
        }
    }

    private async connect(): Promise<void> {
        this.ssh = await handleHops(this.settings)
        this.connected = true

        this.ssh.on("close", () => {
            this.emergencyClose(
                new Error(
                    "Ssh2 client closed!"
                )
            )
        })

        this.ssh.on("end", () => {
            this.emergencyClose(
                new Error(
                    "Ssh2 client end!"
                )
            )
        })

        this.ssh.on("timeout", () => {
            this.emergencyClose(
                new Error(
                    "Ssh2 client connection timeout!"
                )
            )
        })

        this.ssh.on("error", (err: Error & ClientErrorExtensions) => {
            this.emergencyClose(
                err
            )
        })

        const sftpWrapper = await new Promise<SFTPWrapper>(
            (res, rej) => this.ssh.sftp(
                (err, sftpClient) => err ? rej(err) : res(sftpClient)
            )
        )

        this.sftp = createSFTPPromiseWrapper(sftpWrapper)


    }

    close(): void {
        if (this.connected) {
            this.ssh.end()
        }
        this.connected = false
    }

    execChannel(
        cmd: string,
        options?: CmdChannelOptions
    ): Promise<SshChannel> {
        this.throwCloseError()

        return execSshChannel(
            this.ssh,
            cmd,
            options
        )
    }

    async exec(
        cmd: string,
        options?: CmdExecOptions
    ): Promise<SshChannelExit> {
        this.throwCloseError()

        try {
            const channel = await execSshChannel(
                this.ssh,
                cmd,
                options
            )

            return await channel.toPromise(
                options
            )
        } catch (err) {
            if (
                err instanceof Error &&
                err.message == "Ssh channel closed, check why the socket was closed or lost connection"
            ) {
                this.throwCloseError()
            }

            throw err
        }
    }

    session(
        pwd: string,
        sudo?: boolean,
        timeoutMillis?: number,
    ): ExecSession {
        const session = new ExecSession(
            this,
            {
                PWD: pwd,
            }
        )

        session.sudo = sudo
        session.timeoutMillis = timeoutMillis

        return session
    }

    async homeDir(): Promise<string> {
        const result = await this.exec("pwd")
        return trimAll(result.out)
    }

    async cmdExists(
        cmd: string
    ): Promise<boolean> {
        this.throwCloseError()

        if (cmd.includes(" ")) {
            throw new Error("Command cant contain a space: '" + cmd + "'")
        }

        const exit = await this.exec("command -v " + cmd, {
            expectedExitCode: [0, 1]
        })

        return exit.code == 0
    }

    cachedOsRelease: OsRelease | undefined
    fetchOsRelease(): Awaitable<OsRelease> {
        this.throwCloseError()

        if (this.cachedOsRelease) {
            return this.cachedOsRelease
        }

        return fetchOsRelease(
            this
        ).then((release) => {
            return this.cachedOsRelease = release
        })
    }

    cachedApm: AbstractPackageManager | undefined
    getApm(): Awaitable<AbstractPackageManager> {
        this.throwCloseError()

        if (this.cachedApm) {
            return this.cachedApm
        }

        return getApm(
            this
        ).then((apm) => {
            return this.cachedApm = apm
        })
    }
}