import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { OsRelease } from "../../essentials/OsRelease.js"
import { SshHost } from "../../index.js"
import { connectTestHosts, loadEnvVars, TestHost } from "./e2eTestBase.js"

const toolsToCheck: string[] = [
    "ls",
    "cat",
    "neofetch",
    "vim",
    "nano",
    "git",
    "curl",
    "wget",
    "ssh",
    "scp",
    "tar",
    "gzip",
    "zip",
    "unzip",
    "7z",
    "unrar",
    "btop",
    "htop",
    "top",
    "ufw",
]

let testSshHosts: [TestHost, SshHost][] = []

describe("e2e concurrent exec", () => {
    beforeEach(async () => {
        const hostData = loadEnvVars()
        if (hostData.length == 0) {
            throw new Error("No hosts configured!")
        }

        testSshHosts = await connectTestHosts(hostData)
    })

    afterEach(async () => {
        await Promise.all(
            testSshHosts.map(
                ([testHost, host]) => host.disconnect()
            )
        )
    })

    test("execute sleep tasks", async () => {
        await Promise.all(
            testSshHosts.map(
                ([testHost, host]) => executeSleepWorkload(host)
            )
        )
    }, 1000 * 20)

    test("execute host info tasks", async () => {
        for (const testHost of testSshHosts) {
            const info = await collectHostInfo(
                testHost[1],
                toolsToCheck,
            )

            // osRelease
            expect(info.osRelease.distroName.length).toBeGreaterThan(0)
            expect(info.osRelease.distroVersion.length).toBeGreaterThan(0)
            expect(info.toolesInstalled.length).toBeGreaterThan(0)

            expect(info.homefiles.length).toBeGreaterThan(0)
            expect(info.homedir.length).toBeGreaterThan(0)
        }
    }, 1000 * 20)
})


export interface HostInfo {
    sshHost: SshHost,
    osRelease: OsRelease,
    toolesInstalled: string[],
    neofetch: string | undefined,
    homefiles: string[],
    homedir: string,
}

/**
 * Collects information about a host and returns it in the form of a HostInfo object.
 * 
 * The function fetches the host's OS release, checks for the presence of the given tools,
 * lists the files in the user's home directory, and determines the user's home directory path.
 * 
 * @param host The SshHost object to collect information about.
 * @param toolsToCheck An array of strings, each containing the name of a command-line tool to check for.
 * @returns A Promise resolving to a HostInfo object containing the collected host information.
 */
export async function collectHostInfo(host: SshHost, toolsToCheck: string[]): Promise<HostInfo> {
    const hostInfo: HostInfo = {
        sshHost: host,
        osRelease: await host.fetchOsRelease(),
        toolesInstalled: [],
        neofetch: undefined,
        homefiles: [],
        homedir: await host.homeDir(),
    }

    hostInfo.homefiles = (await host.sftp.readdir(hostInfo.homedir)).map(
        (stat) => stat.filename,
    )

    for (const tool of toolsToCheck) {
        if (await host.cmdExists(tool)) {
            hostInfo.toolesInstalled.push(tool)
        }

    }

    return hostInfo
}

/**
 * Executes a series of commands on a given SSH host, alternating between
 * listing directory contents and sleeping for increasing durations.
 *
 * The function runs the "ls -al" command to list all files in the current
 * directory, then pauses execution with the "sleep" command for 1 second,
 * 2 seconds, and 3 seconds, respectively, between each directory listing.
 *
 * @param host The SshHost object on which to execute the commands.
 * @returns A Promise that resolves when all commands have been executed.
 */
export async function executeSleepWorkload(
    host: SshHost,
): Promise<void> {
    await host.exec("ls -al")
    await host.exec("sleep 1")
    await host.exec("ls -al")
    await host.exec("sleep 2")
    await host.exec("ls -al")
    await host.exec("sleep 3")
    await host.exec("ls -al")
}
