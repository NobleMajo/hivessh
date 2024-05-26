import { SshChannelExit, StreamDataMapper } from "../../SshExec.js"
import { SshHost } from "../../SshHost.js"
import { Awaitable, filterEmpty, trimAll } from "../../utils/base.js"
import { AbstractPackage, AbstractPackageManager, ApmInit } from "../apm.js"

export const dnfEnv = {
    LANG: "en_US.UTF-8"
}

export const ignoredErrMsgs: string[] = [
    "transaction completed",
    "base",
    "cleaning up",
    "warning",
]

export const ignoreMessageFilter: StreamDataMapper = (
    data: string
) => {
    let data2 = trimAll(data).toLowerCase()
    for (const msg of ignoredErrMsgs) {
        if (
            data2.includes(msg)
        ) {
            return undefined
        }
    }
    return data
}

export const parseDnfList = (
    exit: SshChannelExit
): string[] => {
    const trimmedLines = filterEmpty(
        exit.out.split("\n")
    )

    const packages = trimmedLines.slice(1).map((line) => line.split(/\s+/)[0])
    return packages
}

export const parseDnfDescription = (
    exit: SshChannelExit
): AbstractPackage => {
    const infoLines = exit.out.split("\n").filter((line) => line.includes(":"))

    const fields: { [key: string]: string } = {}
    for (const infoLine of infoLines) {
        const [key, value] = infoLine.trim().split(":")
        fields[key.toLowerCase()] = value.trim()
    }

    if (!fields.hasOwnProperty("name") || !fields.hasOwnProperty("version")) {
        throw new Error(
            "Required fields 'name' or 'version' missing in DNF package info"
        )
    }

    return {
        name: fields.name!,
        version: fields.version!,
        description: fields.description || "",
        fields,
    }
}

export const initDnfApm: ApmInit = (
    sshHost: SshHost,
    cmdTimeoutMillis?: number | undefined,
): Awaitable<AbstractPackageManager> => {
    return {
        type: "dnf",
        sshHost,

        //### cache
        updateCache: async () => {
            return sshHost.exec(
                'dnf makecache',
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: dnfEnv,
                }
            ).then()
        },
        clearCache: async () => {
            return sshHost.exec(
                'dnf clean all',
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: dnfEnv,
                }
            ).then()
        },

        //### edit
        install: (...pkgs: string[]) =>
            sshHost.exec(
                "dnf install -y " + pkgs.join(" "),
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: dnfEnv,
                }
            ).then(),
        uninstall: (...pkgs: string[]) =>
            sshHost.exec(
                "dnf remove - y " + pkgs.join(" "),
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: dnfEnv,
                }
            ).then(),

        //### maintenance
        upgradeAll: () =>
            sshHost.exec(
                "dnf upgrade -y",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: dnfEnv,
                }
            ).then(),
        uninstallUnused: () =>
            sshHost.exec(
                "dnf autoremove -y",
                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: dnfEnv,
                }
            ).then(),

        //### get
        list: () =>
            sshHost.exec(
                "dnf list installed",

                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: dnfEnv,
                }

            ).then(parseDnfList),
        upgradable: () =>
            sshHost.exec(
                "dnf list updates",

                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: dnfEnv,
                }

            ).then(parseDnfList),
        describe: (pkg: string) =>
            sshHost.exec(
                "dnf info ${ pkg }",

                {
                    sudo: true,
                    timeoutMillis: cmdTimeoutMillis,
                    mapErrOut: ignoreMessageFilter,
                    env: dnfEnv,
                }

            ).then(parseDnfDescription),
    }
}