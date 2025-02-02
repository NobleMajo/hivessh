import { OsRelease } from "../essentials/OsRelease.js"
import { SshHost } from "../index.js"

export interface TestHost {
    id: number,
    host: string,
    user: string,
    port: number,
    privateKeyPath: string
}

/**
 * Loads host configuration from environment variables and returns an array of TestHost objects.
 * 
 * The function iterates over environment variables to find host configurations following the 
 * pattern `TEST_HOST1`, `TEST_HOST2`, etc., appending the details for each host into an array. 
 * If any required environment variable for a host is not set, an error is thrown.
 * 
 * @throws Will throw an error if any of the required environment variables (_HOST, _USER, _PORT, _KEYPATH) 
 *         for a host are not set.
 * @returns An array of TestHost objects, each containing the host's id, hostname, username, port, 
 *          and private key path.
 */
export function loadEnvVars(): TestHost[] {
    let i = 1
    const hosts: TestHost[] = []
    while (true) {
        const key = "TEST_HOST" + i
        const host: TestHost = {
            id: i - 1,
            host: process.env[key + "_HOST"] ?? "",
            user: process.env[key + "_USER"] ?? "",
            port: Number(process.env[key + "_PORT"]),
            privateKeyPath: process.env[key + "_KEYPATH"] ?? "",
        }

        if (
            host.host.length == 0
            && host.user.length == 0
            && isNaN(host.port)
            && host.privateKeyPath.length == 0
        ) {
            break
        }

        if (host.host.length == 0) {
            throw new Error("Env var " + key + "_HOST not set: " + JSON.stringify(host))
        } else if (host.user.length == 0) {
            throw new Error("Env var " + key + "_USER not set: " + JSON.stringify(host))
        } else if (isNaN(host.port)) {
            throw new Error("Env var " + key + "_PORT not set: " + JSON.stringify(host))
        } else if (host.privateKeyPath.length == 0) {
            throw new Error("Env var " + key + "_KEYPATH not set: " + JSON.stringify(host))
        }

        host.privateKeyPath =
            host.privateKeyPath
                .split("$HOME")
                .join(process.env.HOME)

        hosts.push(host)

        i++
    }

    return hosts
}

/**
 * Connects to all hosts in the given array and returns a Promise resolving to an array of 
 * tuples, each containing the host configuration and the connected SshHost object.
 * 
 * @param hostData An array of TestHost objects, each containing the host's id, hostname, 
 *                 username, port, and private key path.
 * 
 * @returns A Promise resolving to an array of tuples, each containing the host configuration 
 *          and the connected SshHost object.
 */
export function connectTestHosts(
    hostData: TestHost[],
): Promise<[TestHost, SshHost][]> {
    return Promise.all(
        hostData.map(async (hostData) => {
            const host = await SshHost.connect({
                host: hostData.host,
                user: hostData.user,
                port: hostData.port,
                privateKeyPath: hostData.privateKeyPath,
            })

            return [hostData, host]
        })
    )
}

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
 * Collects information about multiple hosts and returns it in the form of an array of HostInfo objects.
 * 
 * The function maps the collectHostInfo function over the given array of SshHost objects, 
 * and returns a Promise resolving to an array of HostInfo objects.
 * 
 * @param hostInfos An array of SshHost objects to collect information about.
 * @param toolsToCheck An array of strings, each containing the name of a command-line tool to check for.
 * @returns A Promise resolving to an array of HostInfo objects containing the collected host information.
 */
export function collectHostInfos(hostInfos: SshHost[], toolsToCheck: string[]): Promise<HostInfo[]> {
    return Promise.all(
        hostInfos.map(
            async (host) => collectHostInfo(host, toolsToCheck)
        )
    )
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

export interface HostReport {
    toolUsage: {
        [tool: string]: number
    },
    homeFileUsage: {
        [file: string]: number
    },
    homeDirUsage: {
        [dir: string]: number
    },
    distroNameUsage: {
        [distro: string]: number
    },
    distroVersionUsage: {
        [version: string]: number
    },
    count: number,
}

/**
 * Collects statistics about the given hosts.
 * 
 * The function creates a report about the given hosts, which includes:
 * - Tool usage and percentage
 * - Home file usage and percentage
 * - Home directory usage and percentage
 * - Distribution name usage and percentage
 * - Distribution version usage and percentage
 * 
 * The function takes an array of HostInfo objects as argument and returns a promise that resolves with the report.
 * 
 * The report is an object which contains the following properties:
 * - toolUsage: An object where the keys are the names of the tools and the values are the number of hosts that have the tool installed.
 * - homeFileUsage: An object where the keys are the names of the files and the values are the number of hosts that have the file in their home directory.
 * - homeDirUsage: An object where the keys are the names of the home directories and the values are the number of hosts that have the home directory.
 * - distroNameUsage: An object where the keys are the names of the distributions and the values are the number of hosts that run the distribution.
 * - distroVersionUsage: An object where the keys are the names of the distributions with their versions and the values are the number of hosts that run the distribution with that version.
 * - count: The number of hosts that were given as argument.
 */
export async function collectHostReport(hostInfos: HostInfo[]): Promise<HostReport> {
    const report: HostReport = {
        toolUsage: {},
        homeFileUsage: {},
        homeDirUsage: {},
        distroNameUsage: {},
        distroVersionUsage: {},
        count: hostInfos.length,
    }

    for (const hostInfo of hostInfos) {
        for (const tool of hostInfo.toolesInstalled) {
            report.toolUsage[tool] = (report.toolUsage[tool] ?? 0) + 1
        }
        for (const file of hostInfo.homefiles) {
            report.homeFileUsage[file] = (report.homeFileUsage[file] ?? 0) + 1
        }
        report.homeDirUsage[hostInfo.homedir] = (report.homeDirUsage[hostInfo.homedir] ?? 0) + 1
        report.distroNameUsage[hostInfo.osRelease.distroName] = (report.distroNameUsage[hostInfo.osRelease.distroName] ?? 0) + 1
        const versionKey = hostInfo.osRelease.distroName + "_" + hostInfo.osRelease.distroVersion
        report.distroVersionUsage[versionKey] = (report.distroVersionUsage[versionKey] ?? 0) + 1
    }

    return report
}

/**
 * Prints the host report to the console.
 * 
 * The function prints the following information:
 * - Distribution name usage and percentage
 * - Distribution version usage and percentage
 * - Home directory usage and percentage
 * - Home file usage and percentage
 * - Tool usage and percentage
 * 
 * The function takes an object of type HostReport as argument and prints the information to the console.
 */
export function printHostReport(report: HostReport) {
    console.info("###   Host Report   ###")

    if (report.count == 0) {
        console.info("No host data collected!")
        console.info("###   Host Report   ###")
        return
    }

    console.info("Distro usage (ammount | percent):")
    for (const distro in report.distroNameUsage) {
        const percent = (report.distroNameUsage[distro] / report.count) * 100
        console.info(`- ${distro}: ${report.distroNameUsage[distro]}x | ${percent.toFixed(2)}%`)
    }

    console.info("Distro version usage (ammount | percent):")
    for (const version in report.distroVersionUsage) {
        const percent = (report.distroVersionUsage[version] / report.count) * 100
        console.info(`- ${version}: ${report.distroVersionUsage[version]}x | ${percent.toFixed(2)}%`)
    }

    console.info("Home dir usage (ammount | percent):")
    for (const dir in report.homeDirUsage) {
        const percent = (report.homeDirUsage[dir] / report.count) * 100
        console.info(`- ${dir}: ${report.homeDirUsage[dir]}x | ${percent.toFixed(2)}%`)
    }

    console.info("Home file usage (ammount | percent):")
    for (const file in report.homeFileUsage) {
        const percent = (report.homeFileUsage[file] / report.count) * 100
        console.info(`- ${file}: ${report.homeFileUsage[file]}x | ${percent.toFixed(2)}%`)
    }

    console.info("Tool usage (ammount | percent):")
    for (const tool in report.toolUsage) {
        const percent = (report.toolUsage[tool] / report.count) * 100
        console.info(`- ${tool}: ${report.toolUsage[tool]}x | ${percent.toFixed(2)}%`)
    }
    console.info("###   Host Report   ###")
}

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

const hostData = loadEnvVars()
if (hostData.length == 0) {
    throw new Error("No hosts configured!")
}

console.info("Concurrent ssh2 host connections: " + hostData.length)
const testSshHosts: [TestHost, SshHost][] = await connectTestHosts(hostData)

// console.info("Executing concurrent sleep workload...")
// await Promise.all(testSshHosts.map(([testHost, host]) => executeSleepWorkload(host)))

console.info("Collecting host report...")
const report = await collectHostReport(
    await collectHostInfos(
        testSshHosts.map(([testHost, host]) => host),
        toolsToCheck,
    )
)

console.info("Disconnect test hosts...")
await Promise.all(testSshHosts.map(([testHost, host]) => host.disconnect()))

printHostReport(report)

