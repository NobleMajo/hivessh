import { SshChannelExit, StreamDataMapper } from "../SshExec.js"
import { SshHost } from "../SshHost.js"
import { Awaitable, trimAll } from "../utils/base.js"
import { AbstractPackage, AbstractPackageManager, ApmInit } from "./apm.js"

export const aptEnv = {
    "LANG": "en_US.UTF-8",
    "DEBIAN_FRONTEND": "noninteractive",
}

export const ignoredErrMsgs: string[] = [
    "debconf: unable to initialize frontend",
    "warning"
]
export const ignoreMessageFilter: StreamDataMapper = (
    data: string
) => {
    let data2 = trimAll(data).toLowerCase()
    for (const msg of ignoredErrMsgs) {
        if (
            data2.startsWith(msg) ||
            data2.endsWith(msg) ||
            data2.includes(msg)
        ) {
            return undefined
        }
    }
    return data
}

export const parsePackageList = (
    exit: SshChannelExit
): string[] => {
    if (!exit.out.includes("Listing...")) {
        throw new Error(
            "Cmd out of '" + exit.cmd + "' not includes 'Listing...':\n  " +
            exit.out.split("\n").join("\n  ")
        )
    }

    return exit.out.split("\n")
        .filter((v) => v.includes("/"))
        .map((v) => v.split("/")[0])
        .map(trimAll)
        .filter((v) => v.length != 0)
}

export const parsePackageDescription = (
    exit: SshChannelExit
): AbstractPackage => {
    const fieldLines = exit.out
        .split("\n")
        .filter((v) => v.includes(": "))

    const fields: {
        [key: string]: string
    } = {}

    for (const fieldLine of fieldLines) {
        const firstPos = fieldLine.indexOf(": ")

        const key = trimAll(
            fieldLine.slice(0, firstPos)
        ).toLowerCase()
        const value = trimAll(
            fieldLine.slice(firstPos + 2)
        )

        if (
            key.length == 0 ||
            value.length == 0
        ) {
            continue
        }

        fields[key] = value
    }


    if (!fields["package"]) {
        throw new Error(
            "'package' field in '" + exit.cmd + "' is missing:\n" +
            JSON.stringify(fields)
        )
    }

    if (!fields["version"]) {
        throw new Error(
            "'version' field in '" + exit.cmd + "' is missing:\n" +
            JSON.stringify(fields)
        )
    }

    return {
        name: fields["package"],
        version: fields["version"],
        description: fields["description"],
        fields: fields
    }
}

export const initAptApm: ApmInit = (
    sshHost: SshHost,
    cmdTimeoutMillis?: number | undefined
): Awaitable<AbstractPackageManager> => {
    return {
        type: "apt",
        sshHost,

        //### cache
        updateCache: () => sshHost.exec(
            "apt-get update",
            {
                sudo: true,
                timeoutMillis: cmdTimeoutMillis,
                mapErrOut: ignoreMessageFilter,
                env: aptEnv,
            }
        ).then(),
        clearCache: () => sshHost.exec(
            "apt-get clean",
            {
                sudo: true,
                timeoutMillis: cmdTimeoutMillis,
                mapErrOut: ignoreMessageFilter,
                env: aptEnv,
            }
        ).then(),

        //### edit
        install: (...pkgs: string[]) =>
            sshHost.exec(
                "apt-get install -o Dpkg::Options::=\"--force-confnew\" -y " +
                pkgs.join(" "),
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: aptEnv,
                }
            ).then(),
        uninstall: (...pkgs: string[]) =>
            sshHost.exec(
                "apt-get purge -y --allow-remove-essential " +
                pkgs.join(" "),
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: aptEnv,
                }
            ).then(),

        //### maintenance
        upgradeAll: () =>
            sshHost.exec(
                "apt-get full-upgrade -o Dpkg::Options::=\"--force-confnew\" -y",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: aptEnv,
                }
            ).then(),
        uninstallUnused: () =>
            sshHost.exec(
                "apt-get autoremove -y",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: aptEnv,
                }
            ).then(),

        //### get
        list: () =>
            sshHost.exec(
                "apt list --installed",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: aptEnv,
                }
            ).then(parsePackageList),
        upgradable: () =>
            sshHost.exec(
                "apt list --upgradable",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: aptEnv,
                }
            ).then(parsePackageList),
        describe: (pkg: string) =>
            sshHost.exec(
                "apt show " + pkg,
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: aptEnv,
                }
            ).then(parsePackageDescription),
    }
}