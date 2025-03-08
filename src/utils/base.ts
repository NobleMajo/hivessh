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

export type MapObject<V, K extends string = string> = {
    [key in K]: V
}

declare global {
    interface ObjectConstructor {
        typedKeys<
            O extends object
        >(
            o: O
        ): (keyof O)[]

        typedValues<
            O extends object
        >(
            o: O
        ): O[keyof O]

        typedEntries<
            O extends object
        >(
            o: O
        ): [keyof O, O[keyof O]][]
    }
}

Object.typedKeys = Object.keys
Object.typedValues = Object.values
Object.typedEntries = Object.entries

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
        }
    } catch (err: Error | any) {
        if (
            !(err instanceof Error) ||
            (err as any).errno !== -2 ||
            (err as any).code !== "ENOENT"
        ) {
            throw err
        }
    }

    return "NONE"
}

export function trimAll(
    value: string
): string {
    if (typeof value != "string") {
        throw new Error("Value is not a string")
    }

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


/**
 * 
 * @param base Base reference object for the merge
 * @param overwrite Overwrite object that overwrites the values in the base object
 * @returns Merged object of both objects
 */
export function deepMergeObject<O1 extends MapObject<any>, O2 extends MapObject<any>>(
    base: O1,
    overwrite: O2,
    cloneBase: boolean = true,
): O1 & O2 {
    const ret: MapObject<any> = cloneObject(base)

    for (const key of Object.keys(overwrite)) {
        if (
            typeof base[key] == "object" &&
            base[key] !== null &&
            !Array.isArray(base[key])
        ) {
            ret[key] = deepMergeObject(
                base[key],
                overwrite[key]
            )
        } else {
            ret[key] = overwrite[key]
        }
    }

    return ret as any
}

/**
 * 
 * @param base Base object to clone
 * @returns Clone of the base object
 */
export function cloneObject<O extends MapObject<any>>(
    base: O,
): O {
    const ret: MapObject<any> = {}

    for (const key of Object.keys(base)) {
        if (
            typeof base[key] == "object" &&
            base[key] !== null
        ) {
            if (Array.isArray(base[key])) {
                ret[key] = cloneArray(base[key])
            } else {
                ret[key] = cloneObject(base[key])
            }
        } else {
            ret[key] = base[key]
        }
    }

    return ret as any
}

/**
 * 
 * @param base Base array to clone
 * @returns Clone of the base array
 */
export function cloneArray<A extends any[]>(
    base: A,
): A {
    const ret: any[] = []

    for (const value of base) {
        if (
            typeof value == "object" &&
            value !== null
        ) {
            if (Array.isArray(value)) {
                ret.push(cloneArray(value))
            } else {
                ret.push(cloneObject(value))
            }
        } else {
            ret.push(value)
        }
    }

    return ret as any
}