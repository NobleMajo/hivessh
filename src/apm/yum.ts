import { SshChannelExit, StreamDataMapper } from "../SshExec.js"
import { SshHost } from "../SshHost.js"
import { Awaitable, filterEmpty } from "../utils/base.js"
import { AbstractPackage, AbstractPackageManager, ApmInit } from "./Apm.js"

export const yumEnv = {
    LANG: "en_US.UTF-8"
}

export const ignoreYumMessages: StreamDataMapper = (data: string) => {
    const loweredData = data.toLowerCase()
    if (
        loweredData.includes("transaction completed") ||
        loweredData.includes("base") ||
        loweredData.includes("cleaning up") ||
        loweredData.startsWith("warning:")
    ) {
        return undefined
    }
    return data
}

export const parseYumList = (exit: SshChannelExit): string[] => {
    const trimmedLines = filterEmpty(
        exit.out.split("\n")
    )
    const packages = trimmedLines.slice(1).map((line) => line.split(/\s+/)[0])
    return packages
}

export const parseYumDescription = (exit: SshChannelExit): AbstractPackage => {
    const infoLines = exit.out.split("\n").filter((line) => line.includes(":"))

    const fields: { [key: string]: string } = {}
    for (const infoLine of infoLines) {
        const [key, value] = infoLine.trim().split(":")
        fields[key.toLowerCase()] = value.trim()
    }

    if (!fields.hasOwnProperty("name") || !fields.hasOwnProperty("version")) {
        throw new Error(
            "Required fields 'name' or 'version' missing in Yum package info"
        )
    }

    return {
        name: fields.name!,
        version: fields.version!,
        description: fields.description || "",
        fields,
    }
}

export const initYumApm: ApmInit = (
    sshHost: SshHost,
    cmdTimeoutMillis?: number | undefined,
): Awaitable<AbstractPackageManager> => {
    return {
        type: "yum",
        sshHost,

        //### cache
        updateCache: async () => {
            return sshHost.exec(
                "yum makecache",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreYumMessages,
                    env: yumEnv,
                }
            ).then()
        },
        clearCache: async () => {
            return sshHost.exec(
                "yum clean all",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreYumMessages,
                    env: yumEnv,
                }
            ).then()
        },

        //### edit
        install: (...pkgs: string[]) =>
            sshHost.exec(
                "yum install -y " + pkgs.join(" "),
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreYumMessages,
                    env: yumEnv,
                }
            ).then(),
        uninstall: (...pkgs: string[]) =>
            sshHost.exec(
                "yum remove -y " + pkgs.join(" "),
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreYumMessages,
                    env: yumEnv,
                }
            ).then(),

        //### maintenance
        upgradeAll: () =>
            sshHost.exec(
                "yum upgrade -y",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreYumMessages,
                    env: yumEnv,
                }
            ).then(),
        uninstallUnused: () =>
            sshHost.exec(
                "yum autoremove -y",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreYumMessages,
                    env: yumEnv,
                }
            ).then(),

        //### get
        list: () =>
            sshHost.exec(
                "yum list installed",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreYumMessages,
                    env: yumEnv,
                }
            ).then(parseYumList),
        upgradable: () =>
            sshHost.exec(
                "yum list updates",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreYumMessages,
                    env: yumEnv,
                }
            ).then(parseYumList),
        describe: (pkg: string) =>
            sshHost.exec(
                "yum info " + pkg,
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreYumMessages,
                    env: yumEnv,
                }
            ).then(parseYumDescription),
    }
}
