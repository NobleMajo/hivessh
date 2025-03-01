import { SshHost } from "../SshHost.js"
import { Awaitable } from "../utils/base.js"
import { AbstractPackage, AbstractPackageManager } from "./ApmInterface.js"

/**
 * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
 */
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
    execLogs: [string, boolean, ...any[]][] = []

    noCache: boolean = false

    lastUpdateCache: number = 0
    updateCacheMillis: number = 1000 * 60 * 2

    lastUpgradeAll: number = 0
    upgradeAllMillis: number = 1000 * 60 * 5

    lastUninstallUnused: number = 0
    uninstallUnusedMillis: number = 1000 * 60 * 5

    //### cache
    /**
     * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
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
                this.execLogs.push([
                    "updateCache",
                    true,
                ])
            }
            return
        }

        return this.apm.updateCache()
            ?.then((v) => {
                if (this.debug) {
                    this.execLogs.push([
                        "updateCache",
                        false,
                    ])
                }

                this.lastUpdateCache = Date.now()
                return v
            })
    }
    /**
     * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
     * @description Clear package source cache
     */
    clearCache(): Awaitable<void> {
        if (this.debug) {
            this.execLogs.push([
                "clearCache",
                false,
            ])
        }

        this.lastUpdateCache = 0
        return this.apm.clearCache()
    }

    //### edit
    /**
     * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
     * @description Install defined packages
     */
    install(...pkgs: string[]): Awaitable<void> {
        if (this.debug) {
            this.execLogs.push([
                "install",
                false,
                pkgs,
            ])
        }

        return this.apm.install(...pkgs)
    }
    /**
     * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
     * @description Uninstall defined packages
     */
    uninstall(...pkgs: string[]): Awaitable<void> {
        if (this.debug) {
            this.execLogs.push([
                "uninstall",
                false,
                pkgs,
            ])
        }

        return this.apm.uninstall(...pkgs)
    }

    //### maintenance
    /**
     * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
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
                this.execLogs.push([
                    "upgradeAll",
                    true,
                ])
            }
            return
        }

        return this.apm.upgradeAll()
            ?.then((v) => {
                if (this.debug) {
                    this.execLogs.push([
                        "upgradeAll",
                        false,
                    ])
                }

                this.lastUpgradeAll = Date.now()
                return v
            })
    }
    /**
     * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
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
                this.execLogs.push([
                    "uninstallUnused",
                    true,
                ])
            }
            return
        }

        return this.apm.uninstallUnused()
            ?.then((v) => {
                if (this.debug) {
                    this.execLogs.push([
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
     * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
     * @description List of installed packages
     */
    list(): Awaitable<string[]> {
        if (this.debug) {
            this.execLogs.push([
                "list",
                false,
            ])
        }

        return this.apm.list()
    }
    /**
     * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
     * @description List upgradable packages
     */
    upgradable(): Awaitable<string[]> {
        if (this.debug) {
            this.execLogs.push([
                "upgradable",
                false,
            ])
        }

        return this.apm.upgradable()
    }
    /**
     * @deprecated The AbstractPackageManager (APM) feature will be removed in the future to more focus on the core problems and solutions
     * @description Returns a package description
     */
    describe(pkg: string): Awaitable<AbstractPackage> {
        if (this.debug) {
            this.execLogs.push([
                "describe",
                false,
                pkg,
            ])
        }

        return this.apm.describe(pkg)
    }
}
