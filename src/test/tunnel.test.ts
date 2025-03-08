import { Server } from "net"
import { Agent, fetch } from 'undici'
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
    sshHost: SshHost
): Promise<any> {
    console.info("Test: ", test)

    const server: Server = await sshHost.tunnelOut({
        localHost: "127.0.0.1",
        localPort: 54321,
        remotePath: "/var/run/docker.sock",
    })

    const resp = await fetch(
        "http://127.0.0.1:54321/containers/json",
        {
            method: "GET",
        }
    )

    if (resp.status !== 200) {
        throw new Error("Failed to fetch docker containers")
    }

    console.log("Response: ", await resp.text())

    server.close()
}

export async function tunnelDockerToSock(
    test: TestHost,
    sshHost: SshHost
): Promise<any> {
    console.info("Test: ", test)

    const server: Server = await sshHost.tunnelOut({
        localPath: "/tmp/hivessh-test-" + test.id + ".sock",
        remotePath: "/var/run/docker.sock",
    })

    const resp = await fetch(
        "http://localhost/containers/json", {
        dispatcher: new Agent({
            connect: {
                socketPath: "/tmp/hivessh-test-" + test.id + ".sock"
            }
        })
    })

    if (resp.status !== 200) {
        throw new Error("Failed to fetch docker containers, status: " + resp.status)
    }

    console.log("Response: ", await resp.text())

    server.close()
}

console.info("Test tunneling...")
for (const testHosts of testSshHosts) {
    await tunnelDockerToSock(testHosts[0], testHosts[1])
}

console.info("Disconnect test hosts...")
await Promise.all(testSshHosts.map(([testHost, host]) => host.disconnect()))

