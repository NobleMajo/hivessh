import { ClientChannel, ClientErrorExtensions, SFTPWrapper, Client as SshClient } from "ssh2"
import { ExecSession } from "./ExecSession.js"
import { handleHops } from "./HostHop.js"
import { CmdChannelOptions, CmdExecOptions, SshChannel, SshChannelExit, execSshChannel } from "./SshExec.js"
import { SshHostOptions, SshHostSettings, loadSettings } from "./SshHostOptions.js"
import { AbstractPackageManager, getApm } from "./apm/apm.js"
import { OsRelease, fetchOsRelease } from "./essentials/OsRelease.js"
import { SFTPPromiseWrapper, createSFTPPromiseWrapper } from "./essentials/SftpPromiseWrapper.js"
import { Awaitable, trimAll } from "./utils/base.js"

export class SshHost {
    closeErr?: Error | string
    connected: boolean = false
    ssh: SshClient = undefined as any
    sftp: SFTPPromiseWrapper = undefined as any
    release: OsRelease = undefined as any

    /**
     * 
     * @description The only public function to create a SshHost object.
     * @param options Connection options for the ssh host
     * @returns A promise that resolves when the connection is established and the promise provides you an SshHost object
     */
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

    /**
     * @description If the SshHost socket is closed because of an error this method throws that error. 
     * @throws Ssh socket close reason
     */
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

    /**
     * @deprecated Use disconnect()
     * @description Closes the ssh socket if still connected
     */
    close(): void {
        if (this.connected) {
            this.ssh.end()
        }
        this.connected = false
    }

    /**
     * @description Closes the ssh socket if still connected
     */
    disconnect(): void {
        if (this.connected) {
            this.ssh.end()
        }
        this.connected = false
    }

    /**
     * 
     * @param cmd Command string to execute
     * @param options Command channel execution options
     * @description Opens a ssh channel to handle a command execution by yourself
     * @returns A promise that resolves when the command begins execution and the promise provides you with the SshChannel to process the command output
     */
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

    /**
     * 
     * @param cmd Command string to execute
     * @param options Command execution options
     * @description Opens an SSH channel to execute the command and resolves the promise as soon as the exit code is available for the executed command
     * @returns A promise that resolves when the command begins execution and the promise provides you the process some runtime, stdout, stderr and some exit data
     */
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

    /**
     * 
     * @description Opens a ssh shell channel to handle the shell by yourself
     * @returns A promise that resolves when the shell is started and the promise provides you with a session channel
     */
    shellChannel(): Promise<ClientChannel> {
        return new Promise<ClientChannel>(
            (res, rej) => this.ssh.shell(
                (err, channel) =>
                    err ?
                        rej(err) :
                        res(channel)
            )
        )
    }

    /**
     * 
     * @param pwd Inital path of the session
     * @param sudo Defines if commands should be prefied as sudo
     * @param timeoutMillis Default command timeout milliseconds
     * @returns The new created ExecSession object
     */
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

    /**
     * 
     * @param cmd Command to check if it cmdExists
     * @description Function that checks if a spisific command exists on the remote ssh host
     * @returns True if command exists and false if not
     */
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

    /**
     * 
     * @description Resolves all releases files from '/etc/*-release' on the remove ssh host and maps them. Also tries to detect the distro name and version.
     * @param useCache The return value of this function get cached for the next function call. Set this to false to disable the caching.
     * @returns Returns an object that maps all values of all '/etc/*-release' files.
     */
    fetchOsRelease(
        useCache: boolean = true,
    ): Awaitable<OsRelease> {
        this.throwCloseError()

        if (
            useCache &&
            this.cachedOsRelease
        ) {
            return this.cachedOsRelease
        }

        return fetchOsRelease(
            this
        ).then((release) => {
            return this.cachedOsRelease = release
        })
    }

    cachedApm: AbstractPackageManager | undefined

    /**
     * @deprecated Check your self
     * @description Checks one of the predefined package mangers is installed (apt, dnf, yum or a custom one) and returns a abstract interface for that package manager.
     * @param useCache The return value of this function get cached for the next function call. Set this to false to disable the caching.
     * @throws Throws an error if the package manager cant be detected.
     * @returns The abstract interface of the hosts package manager (if found).
     */
    getApm(
        useCache: boolean = true,
    ): Awaitable<AbstractPackageManager> {
        this.throwCloseError()

        if (
            useCache &&
            this.cachedApm
        ) {
            return this.cachedApm
        }

        return getApm(
            this
        ).then((apm) => {
            return this.cachedApm = apm
        })
    }
}