import { SshHost } from "../SshHost.js";

export interface ReleaseMeta {
    [key: string]: string
}

export const unknownDistro = "unknown"

export interface OsRelease {
    distroName: string
    distroVersion: string
    meta: ReleaseMeta
}

export const defaultOsRelease: OsRelease = {
    distroName: unknownDistro,
    distroVersion: unknownDistro,
    meta: {}
}

export async function fetchOsRelease(
    sshHost: SshHost
): Promise<OsRelease> {
    let stats = await sshHost.sftp.readdir("/etc")

    stats = stats.filter((v) => v.filename.endsWith("-release"))

    if (stats.length == 0) {
        throw new Error("No '/etc/*-release' file found")
    }

    const meta: {
        [key: string]: string
    } = {}

    for (const stat of stats) {
        const value = "" + await sshHost.sftp.readFile(
            stat.path + "/" + stat.filename
        )

        for (const varLine of value.split("\n")) {
            const i = varLine.indexOf("=")

            const key = varLine.slice(0, i)
            if (key.length == 0) {
                continue
            }

            let value = varLine.slice(i + 1)

            while (
                value.startsWith("\"") ||
                value.startsWith("'")
            ) {
                value = value.slice(1)
            }

            while (
                value.endsWith("\"") ||
                value.endsWith("'")
            ) {
                value = value.slice(0, -1)
            }

            meta[key] = value
        }
    }

    const name = (
        meta.NAME ?? meta.DISTRIB_ID ??
        meta.DISTRO_ID ?? meta.ID ?? "unknown"
    ).toLowerCase()
    const version = (
        meta.VERSION_ID ?? meta.DISTRIB_RELEASE ??
        meta.DISTRO_RELEASE ?? meta.RELEASE ?? "unknown"
    ).toLowerCase()

    return {
        distroName: name,
        distroVersion: version,
        meta: meta
    }
}