import { promises as afs } from "fs"

export type NoInfer<T> = [T][T extends any ? 0 : never]

export type BaseType = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function"

export type Awaitable<T> = T | Promise<T>

export type JsonBaseType = string | number | boolean | null | undefined
export type JsonType = JsonHolder | JsonBaseType
export type JsonHolder = JsonObject | JsonArray
export type JsonArray = JsonType[]
export interface JsonObject {
    [key: string]: JsonType
}

export type FileType = "file" | "dir" | "none"
export const getFileType = async (
    path: string
): Promise<FileType> => {
    try {
        const stat = await afs.stat(path)
        if (stat.isFile()) {
            return "file"
        } else if (stat.isDirectory()) {
            return "dir"
        }
    } catch (err) {
    }
    return "none"
}

export function isOdd(
    value: number
): boolean {
    return (value % 2) === 1
}

export type PathType = "DIR" | "FILE" | "NONE"

export async function pathType(
    path: string,
): Promise<PathType> {
    try {
        const stat = await afs.stat(path)

        if (stat.isFile()) {
            return "FILE"
        } else if (stat.isDirectory()) {
            return "DIR"
        } else {
            return "NONE"
        }

    } catch (err: Error | any) {
        if (
            err instanceof Error &&
            (err as any).errno === -2 &&
            (err as any).code === "ENOENT"
        ) {
            return "NONE"
        }

        throw err
    }
}

export function trimAll(
    value: string
): string {
    while (
        value.startsWith("\n") ||
        value.startsWith("\t") ||
        value.startsWith("'")
    ) {
        value = value.slice(1)
    }

    while (
        value.endsWith("\n") ||
        value.endsWith("\t") ||
        value.endsWith("'")
    ) {
        value = value.slice(0, -1)
    }
    return value
}

export function filterEmpty(
    arr: string[]
): string[] {
    return arr
        .map(trimAll)
        .filter((v) => v.length != 0)
}