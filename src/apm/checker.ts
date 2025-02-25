import { SshHost } from "../SshHost.js"
import { Awaitable } from "../utils/base.js"
import { AbstractPackageManager } from "./ApmInterface.js"
import { AbstractPackageManagerWrapper } from "./apm.js"
import { initAptApm } from "./impl/apt.js"
import { initDnfApm } from "./impl/dnf.js"
import { initYumApm } from "./impl/yum.js"

/**
 * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
 */
export type ApmInit = (
    sshHost: SshHost
) => Awaitable<AbstractPackageManager>

/**
 * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
 */
export type ApmChecker = (
    sshHost: SshHost,
) => Awaitable<AbstractPackageManager | undefined | void>

export const apmChecker: ApmChecker[] = []

/**
 * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
 */
export async function getApm(
    sshHost: SshHost
): Promise<AbstractPackageManagerWrapper> {
    for (const apmCheck of apmChecker) {
        const apm = await apmCheck(
            sshHost,
        )
        if (apm) {
            return new AbstractPackageManagerWrapper(
                apm
            )
        }
    }

    throw new Error(
        "No package manager found for:\n" +
        "  " + sshHost.settings.user + "@" +
        sshHost.settings.host + ":" + sshHost.settings.port
    )
}

export function registerDefaultApmMapperChecker(): void {
    apmChecker.push(
        async (sshHost) => {
            if (
                await sshHost.cmdExists("apt") &&
                await sshHost.cmdExists("apt-get")
            ) {
                return initAptApm(sshHost)
            }
        }
    )

    apmChecker.push(
        async (sshHost) => {
            if (
                await sshHost.cmdExists("dnf")
            ) {
                return initDnfApm(sshHost)
            }
        }
    )

    apmChecker.push(
        async (sshHost) => {
            if (
                await sshHost.cmdExists("yum")
            ) {
                return initYumApm(sshHost)
            }
        }
    )
}

registerDefaultApmMapperChecker()

