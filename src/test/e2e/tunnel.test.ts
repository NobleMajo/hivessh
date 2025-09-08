import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Server } from "net"
import { SshHost } from "../../index.js"
import { connectTestHosts, loadEnvVars, TestHost } from "./e2eTestBase.js"

let testSshHosts: [TestHost, SshHost][] = []

describe("e2e out tunneling", () => {
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

    test("unix socket tunneling", async () => {
        await Promise.all(
            testSshHosts.map(async ([testHost, host], i) => {
                const result = await tunnelDockerToPort(host, 54321 + i++)

                expect(result).resolves.toBeArray()
                expect(result).resolves.not.toBeArrayOfSize(0)
            })
        )
    }, 1000 * 20)

    test("address port bind tunneling", async () => {
        await Promise.all(
            testSshHosts.map(async ([testHost, host], i) => {
                const result = await tunnelDockerToSock(testHost, host)

                expect(result).resolves.toBeArray()
                expect(result).resolves.not.toBeArrayOfSize(0)
            })
        )
    }, 1000 * 20)
})

export async function tunnelDockerToPort(
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

        expect(resp.status).toBeNumber()
        expect(resp.status).toBe(200)

        if (resp.status !== 200) {
            return
        }

        return resp.json()
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
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        )

        expect(resp.status).toBeNumber()
        expect(resp.status).toBe(200)

        if (resp.status !== 200) {
            return
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
