import { Server } from "net"
import { SshHost } from "../index.js"
import { connectTestHosts, loadEnvVars, TestHost } from "./base_test.js"

const hostData = loadEnvVars()
if (hostData.length == 0) {
    throw new Error("No hosts configured!")
}

console.info("Concurrent ssh2 host connections: " + hostData.length)
const testSshHosts: [TestHost, SshHost][] = await connectTestHosts(hostData)

export async function tunnelDockerToPort(
    test: TestHost,
    sshHost: SshHost,
    port: number,
): Promise<any> {
    let server: Server | undefined = undefined

    try {
        server = await sshHost.tunnelOut({
            localHost: "127.0.0.1",
            localPort: port,
            remotePath: "/var/run/docker.sock",
        })

        const resp = await fetch(
            "http://127.0.0.1:" + port + "/containers/json",
            {
                method: "GET",
            }
        )

        if (resp.status !== 200) {
            throw new Error("Failed to fetch docker containers")
        }

        const json = await resp.json() as any
        if (!Array.isArray(json)) {
            console.error("Invalid json response: ", json)
            return
        }
        console.log("Response: ", json.length)
    } finally {
        if (server) {
            server.close()
        }
    }
}

export async function tunnelDockerToSock(
    test: TestHost,
    sshHost: SshHost
): Promise<any> {
    let server: Server | undefined = undefined

    try {
        server = await sshHost.tunnelOut({
            localPath: "/tmp/hivessh-test-" + test.id + ".sock",
            remotePath: "/var/run/docker.sock",
        })

        const resp = await fetch(
            "http://localhost/containers/json",
            {
                unix: "/tmp/hivessh-test-" + test.id + ".sock",
            },
        )

        if (resp.status !== 200) {
            throw new Error("Failed to fetch docker containers, status: " + resp.status)
        }

        const json = await resp.json() as any
        if (!Array.isArray(json)) {
            console.error("Invalid json response: ", json)
            return
        }
        console.log("Response: ", json.length)
    } finally {
        if (server) {
            server.close()
        }
    }
}

console.info("Test tunneling...")
for (const testHosts of testSshHosts) {
    await tunnelDockerToSock(testHosts[0], testHosts[1])
}

console.info("Test ports...")
let i = 0
for (const testHosts of testSshHosts) {
    await tunnelDockerToPort(testHosts[0], testHosts[1], 54321 + i++)
}

console.info("Disconnect test hosts...")
await Promise.all(testSshHosts.map(([testHost, host]) => host.disconnect()))

