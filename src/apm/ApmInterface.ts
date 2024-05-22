import { SshHost } from "../SshHost.js"
import { Awaitable } from "../utils/base.js"

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

export interface AbstractPackage {
    name: string,
    version: string,
    description?: string,
    fields: {
        [key: string]: string
    }
}
