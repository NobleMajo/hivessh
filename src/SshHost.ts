import { ClientErrorExtensions, SFTPWrapper, Client as SshClient } from "ssh2"
import { handleHops } from "./HostHop.js"
import { CmdChannelOptions, CmdExecOptions, SshChannel, SshChannelExit, execSshChannel } from "./SshExec.js"
import { SshHostOptions, SshHostSettings, loadSettings } from "./SshHostOptions.js"
import { OsRelease, fetchOsRelease } from "./essentials/OsRelease.js"
import { SFTPPromiseWrapper, createSFTPPromiseWrapper } from "./essentials/SftpPromiseWrapper.js"
import { AbstractPackageManager, getPm } from "./pm/PackageManager.js"
import { Awaitable } from "./utils/base.js"

export class SshHost {
    closeErr?: any
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

    private errorDisconnect(err: any) {
        this.connected = false
        if (!this.closeErr) {
            this.closeErr = err
        }
        this.ssh.destroy()
    }

    private async connect(): Promise<void> {
        this.ssh = await handleHops(this.settings)
        this.connected = true

        this.ssh.on("close", () => {
            this.errorDisconnect(
                new Error("Ssh2 client closed!")
            )
        })

        this.ssh.on("end", () => {
            this.errorDisconnect(
                new Error("Ssh2 client end!")
            )
        })

        this.ssh.on("timeout", () => {
            this.errorDisconnect(
                new Error("Ssh2 client connection timeout!")
            )
        })

        this.ssh.on("error", (err: Error & ClientErrorExtensions) => {
            this.errorDisconnect(
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
        const channel = await execSshChannel(
            this.ssh,
            cmd,
            options
        )

        return channel.toPromise(
            options
        )
    }

    async exists(
        cmd: string
    ): Promise<boolean> {
        if (cmd.includes(" ")) {
            throw new Error("Command can not contain a space: '" + cmd + "'")
        }

        const exit = await this.exec(cmd, {
            expectedExitCode: [0, 1]
        })

        return exit.code == 0
    }

    cachedOsRelease: OsRelease | undefined
    fetchOsRelease(): Awaitable<OsRelease> {
        if (this.cachedOsRelease) {
            return this.cachedOsRelease
        }

        return fetchOsRelease(
            this
        ).then((release) => {
            return this.cachedOsRelease = release
        })
    }

    cachedPackageManager: AbstractPackageManager | undefined
    getPm(): Awaitable<AbstractPackageManager> {
        if (this.cachedPackageManager) {
            return this.cachedPackageManager
        }

        return getPm(
            this
        ).then((pm) => {
            return this.cachedPackageManager = pm
        })
    }
}
