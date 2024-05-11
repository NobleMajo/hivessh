export type HostId = `${string}@${string}`
export function parseHostId(
    settings: {
        host: string,
        user?: string,
        port?: number,
    }
): HostId {
    const value =
        (settings.user ?? "root") +
        "@" +
        settings.host +
        ":" +
        (settings.port ?? 22)

    if (!isHostId(value)) {
        throw new Error("Value '" + value + "' is not a valid host id")
    }

    return value
}

export const allowedRuleChars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.:"

export const allowedIdRuleChars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@"

export function throwCharsetError(
    value: string,
    chatSet: string,
): void | never {
    for (const char of value) {
        if (!chatSet.includes(char)) {
            throw new Error("Illegal character in selector value: '" + char + "'")
        }
    }
}

export function matchesCharset(
    value: string,
    chatSet: string,
): boolean {
    for (const char of value) {
        if (!chatSet.includes(char)) {
            return false
        }
    }

    return true
}

export function isHostId(
    value: any
): value is HostId {
    if (typeof value !== "string") {
        return false
    }

    if (!value.includes("@")) {
        return false
    }

    const parts = value.split("@")
    if (
        parts.length != 2 ||
        parts[0].length == 0 ||
        parts[1].length == 0
    ) {
        return false
    }

    if (
        !matchesCharset(
            parts[0],
            allowedRuleChars
        )
    ) {
        return false
    }

    if (
        !matchesCharset(
            parts[1],
            allowedRuleChars + ".:"
        )
    ) {
        return false
    }

    return true
}