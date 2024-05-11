import { SshHost } from "../SshHost.js"
import { Awaitable } from "../utils/base.js"
import { initAptApm } from "./apt.js"
import { initDnfApm } from "./dnf.js"
import { initYumApm } from "./yum.js"

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
    updateCache(): Awaitable<void>
    /**
     * @description Clear package source cache
     */
    clearCache(): Awaitable<void>

    //### edit
    /**
     * @description Install defined packages
     */
    install(...pkgs: string[]): Awaitable<void>
    /**
     * @description Uninstall defined packages
     */
    uninstall(...pkgs: string[]): Awaitable<void>

    //### maintenance
    /**
     * @description Upgrades all upgradable packages
     */
    upgradeAll(): Awaitable<void>
    /**
     * @description Uninstall unused packages
     */
    uninstallUnused(): Awaitable<void>

    //### get
    /**
     * @description List of installed packages
     */
    list(): Awaitable<string[]>
    /**
     * @description List upgradable packages
     */
    upgradable(): Awaitable<string[]>
    /**
     * @description Returns a package description
     */
    describe(pkg: string): Awaitable<AbstractPackage>
}

export class AbstractPackageManagerWrapper {
    type: string
    sshHost: SshHost

    constructor(
        public apm: AbstractPackageManager
    ) {
        this.type = apm.type
        this.sshHost = apm.sshHost
    }

    debug: boolean = false
    exec: [string, boolean, ...any[]][] = []

    noCache: boolean = false

    lastUpdateCache: number = 0
    updateCacheMillis: number = 1000 * 60 * 2

    lastUpgradeAll: number = 0
    upgradeAllMillis: number = 1000 * 60 * 5

    lastUninstallUnused: number = 0
    uninstallUnusedMillis: number = 1000 * 60 * 5

    //### cache
    /**
     * @description Update package source cache
     */
    updateCache(
        noCache: boolean = this.noCache,
    ): Awaitable<void> {
        if (
            !noCache &&
            Date.now() - this.lastUpdateCache >
            this.updateCacheMillis
        ) {
            if (this.debug) {
                this.exec.push([
                    "updateCache",
                    true,
                ])
            }
            return
        }

        return this.apm.updateCache()
            ?.then((v) => {
                if (this.debug) {
                    this.exec.push([
                        "updateCache",
                        false,
                    ])
                }

                this.lastUpdateCache = Date.now()
                return v
            })
    }
    /**
     * @description Clear package source cache
     */
    clearCache(): Awaitable<void> {
        if (this.debug) {
            this.exec.push([
                "clearCache",
                false,
            ])
        }

        this.lastUpdateCache = 0
        return this.apm.clearCache()
    }

    //### edit
    /**
     * @description Install defined packages
     */
    install(...pkgs: string[]): Awaitable<void> {
        if (this.debug) {
            this.exec.push([
                "install",
                false,
                pkgs,
            ])
        }

        return this.apm.install(...pkgs)
    }
    /**
     * @description Uninstall defined packages
     */
    uninstall(...pkgs: string[]): Awaitable<void> {
        if (this.debug) {
            this.exec.push([
                "uninstall",
                false,
                pkgs,
            ])
        }

        return this.apm.uninstall(...pkgs)
    }

    //### maintenance
    /**
     * @description Upgrades all upgradable packages
     */
    upgradeAll(
        noCache: boolean = this.noCache,
    ): Awaitable<void> {
        if (
            !noCache &&
            Date.now() - this.lastUpgradeAll >
            this.upgradeAllMillis
        ) {
            if (this.debug) {
                this.exec.push([
                    "upgradeAll",
                    true,
                ])
            }
            return
        }

        return this.apm.upgradeAll()
            ?.then((v) => {
                if (this.debug) {
                    this.exec.push([
                        "upgradeAll",
                        false,
                    ])
                }

                this.lastUpgradeAll = Date.now()
                return v
            })
    }
    /**
     * @description Uninstall unused packages
     */
    uninstallUnused(
        noCache: boolean = this.noCache,
    ): Awaitable<void> {
        if (
            !noCache &&
            Date.now() - this.lastUninstallUnused >
            this.uninstallUnusedMillis
        ) {
            if (this.debug) {
                this.exec.push([
                    "uninstallUnused",
                    true,
                ])
            }
            return
        }

        return this.apm.uninstallUnused()
            ?.then((v) => {
                if (this.debug) {
                    this.exec.push([
                        "uninstallUnused",
                        false,
                    ])
                }

                this.lastUninstallUnused = Date.now()
                return v
            })
    }

    //### get
    /**
     * @description List of installed packages
     */
    list(): Awaitable<string[]> {
        if (this.debug) {
            this.exec.push([
                "list",
                false,
            ])
        }

        return this.apm.list()
    }
    /**
     * @description List upgradable packages
     */
    upgradable(): Awaitable<string[]> {
        if (this.debug) {
            this.exec.push([
                "upgradable",
                false,
            ])
        }

        return this.apm.upgradable()
    }
    /**
     * @description Returns a package description
     */
    describe(pkg: string): Awaitable<AbstractPackage> {
        if (this.debug) {
            this.exec.push([
                "describe",
                false,
                pkg,
            ])
        }

        return this.apm.describe(pkg)
    }
}

export type ApmInit = (
    sshHost: SshHost
) => Awaitable<AbstractPackageManager>

export type ApmChecker = (
    sshHost: SshHost,
) => Awaitable<AbstractPackageManager | undefined | void>

export const apmChecker: ApmChecker[] = []

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
                await sshHost.exists("apt") &&
                await sshHost.exists("apt-get")
            ) {
                return initAptApm(sshHost)
            }
        }
    )

    apmChecker.push(
        async (sshHost) => {
            if (
                await sshHost.exists("dnf")
            ) {
                return initDnfApm(sshHost)
            }
        }
    )

    apmChecker.push(
        async (sshHost) => {
            if (
                await sshHost.exists("yum")
            ) {
                return initYumApm(sshHost)
            }
        }
    )
}

registerDefaultApmMapperChecker()

