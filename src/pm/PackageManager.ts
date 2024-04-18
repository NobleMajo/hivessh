import { SshHost } from "../SshHost.js"
import { Awaitable } from "../utils/base.js"
import { initAptPm } from "./apt.js"
import { initDnfPm } from "./dnf.js"
import { initYumPm } from "./yum.js"

export interface AbstractPackage {
    name: string,
    version: string,
    description?: string,
    fields: {
        [key: string]: string
    }
}

export interface AbstractPackageManager {
    type: string
    sshHost: SshHost

    //### cache
    /**
     * @description Update package source cache
     */
    updateCache(): Promise<void>
    /**
     * @description Clear package source cache
     */
    clearCache(): Promise<void>

    //### edit
    /**
     * @description Install defined packages
     */
    install(...pkgs: string[]): Promise<void>
    /**
     * @description Uninstall defined packages
     */
    uninstall(...pkgs: string[]): Promise<void>

    //### maintenance
    /**
     * @description Upgrades all upgradable packages
     */
    upgradeAll(): Promise<void>
    /**
     * @description Uninstall unused packages
     */
    uninstallUnused(): Promise<void>

    //### get
    /**
     * @description List of installed packages
     */
    list(): Promise<string[]>
    /**
     * @description List upgradable packages
     */
    upgradable(): Promise<string[]>
    /**
     * @description Returns a package description
     */
    describe(pkg: string): Promise<AbstractPackage>
}

export type PmInit = (
    sshHost: SshHost
) => Awaitable<AbstractPackageManager>

export type PmChecker = (
    sshHost: SshHost,
) => Awaitable<AbstractPackageManager | undefined | void>

export const pmChecker: PmChecker[] = []

export async function getPm(
    sshHost: SshHost
): Promise<AbstractPackageManager> {
    for (const pmCheck of pmChecker) {
        const pm = await pmCheck(
            sshHost,
        )
        if (pm) {
            return pm
        }
    }

    throw new Error(
        "No package manager found for:\n" +
        "  " + sshHost.settings.user + "@" +
        sshHost.settings.host + ":" + sshHost.settings.port
    )
}

export function registerDefaultPmMapperChecker(): void {
    pmChecker.push(
        async (sshHost) => {
            if (
                await sshHost.exists("apt") &&
                await sshHost.exists("apt-get")
            ) {
                return initAptPm(sshHost)
            }
        }
    )

    pmChecker.push(
        async (sshHost) => {
            if (
                await sshHost.exists("dnf")
            ) {
                return initDnfPm(sshHost)
            }
        }
    )

    pmChecker.push(
        async (sshHost) => {
            if (
                await sshHost.exists("yum")
            ) {
                return initYumPm(sshHost)
            }
        }
    )
}

registerDefaultPmMapperChecker()

