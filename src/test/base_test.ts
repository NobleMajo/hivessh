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