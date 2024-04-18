import { SshHost } from "../SshHost.js"
import { filterEmpty, trimAll } from "../utils/base.js"

export async function isSudoer(
    sshHost: SshHost,
    user?: string
): Promise<boolean> {
    if (!user) {
        user = sshHost.settings.user
    }

    if (!(await sshHost.exists("sudo"))) {
        throw new Error(
            "Cant check if '" + user + "' is sudoer if sudo is not installed"
        )
    }

    if (user.includes(" ")) {
        throw new Error("User name '" + user + "' includes space")
    }

    return sshHost.exec(
        "sudo -l -U " + user,
    ).then(async (v) => {
        const lines = filterEmpty(
            v.out.split("\n")
        )
        for (const line of lines) {
            if (
                trimAll(line).startsWith(
                    "User " + user + " is not allowed to run sudo"
                )
            ) {
                return false
            }
        }
        return true
    })
}

export async function listUsers(
    sshHost: SshHost,
): Promise<string[]> {
    return sshHost.exec(
        "getent passwd",
    ).then((v) => {
        return filterEmpty(
            v.out.split("\n")
                .map(
                    (v) => v.split(":")[0]
                )
        )
    })
}

export async function listUserInGroups(
    sshHost: SshHost,
    user?: string
): Promise<string[]> {
    if (!user) {
        user = sshHost.settings.user
    }

    if (user.includes(" ")) {
        throw new Error("User name '" + user + "' includes space")
    }

    return sshHost.exec(
        "groups " + user,
    ).then((v) => {
        let raw = trimAll(v.out)

        return filterEmpty(
            raw.split(":")[1]
                .split(" ")
        )
    })
}

export async function isUserInGroup(
    sshHost: SshHost,
    group: string,
    user?: string
): Promise<boolean> {
    const groups = await listUserInGroups(
        sshHost,
        user,
    )

    return groups.includes(group)
}

export async function addUserToGroup(
    sshHost: SshHost,
    group: string,
    user?: string
): Promise<void> {
    if (!user) {
        user = sshHost.settings.user
    }

    if (user.includes(" ")) {
        throw new Error("User name '" + user + "' includes space")
    }
    if (group.includes(" ")) {
        throw new Error("Group name '" + group + "' includes space")
    }

    return sshHost.exec(
        "gpasswd -a " + user + " " + group,
    ).then()
}

export async function removeUserFromGroup(
    sshHost: SshHost,
    group: string,
    user?: string
): Promise<void> {
    if (!user) {
        user = sshHost.settings.user
    }

    if (user.includes(" ")) {
        throw new Error("User name '" + user + "' includes space")
    }
    if (group.includes(" ")) {
        throw new Error("Group name '" + group + "' includes space")
    }

    return sshHost.exec(
        "gpasswd -d " + user + " " + group,
    ).then()
}

export async function createGroup(
    sshHost: SshHost,
    group: string,
    gid?: number,
): Promise<void> {
    if (group.includes(" ")) {
        throw new Error("Group name '" + group + "' includes space")
    }

    return sshHost.exec(
        "groupadd" + (typeof gid == "number" ? " -g " + gid : "") +
        " " + group,
    ).then()
}

export async function renameGroup(
    sshHost: SshHost,
    group: string,
    newName: string,
): Promise<void> {
    if (group.includes(" ")) {
        throw new Error("Group name '" + group + "' includes space")
    }
    if (newName.includes(" ")) {
        throw new Error("New group name '" + newName + "' includes space")
    }

    return sshHost.exec(
        "groupmod -n " + newName + " " + group,
    ).then()
}

export async function deleteGroup(
    sshHost: SshHost,
    group: string,
): Promise<void> {
    if (group.includes(" ")) {
        throw new Error("Group name '" + group + "' includes space")
    }

    return sshHost.exec(
        "groupdel " + group,
    ).then()
}
