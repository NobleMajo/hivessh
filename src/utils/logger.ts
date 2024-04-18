
export const logNames = [
    "Fatal", "Error", "Warning", "Info", "Trace", "Debug",
] as const
export type LogName = typeof logNames[number]

export const logShorts = [
    "FAT", "ERR", "WAR", "INF", "TRA", "DEB",
] as const
export type LogShort = typeof logShorts[number]

export const customLogType: {
    [level: number]: {
        name: string,
        short: string,
    }
} = {}

export const fatalLogType: LogType = getLogTypeByLevel(0)
export const errorLogType: LogType = getLogTypeByLevel(4)
export const warningLogType: LogType = getLogTypeByLevel(8)
export const infoLogType: LogType = getLogTypeByLevel(12)
export const traceLogType: LogType = getLogTypeByLevel(16)
export const debugLogType: LogType = getLogTypeByLevel(20)

export interface LogType {
    name: string,
    short: string,
    level: number,
}

export function getLogTypeByLevel(
    level: number
): LogType {
    if (
        level == 0 ||
        level == 4 ||
        level == 8 ||
        level == 12 ||
        level == 16 ||
        level == 20
    ) {
        return {
            level: level,
            name: logNames[level / 4],
            short: logShorts[level / 4]
        }
    }

    if (!customLogType[level]) {
        return {
            name: customLogType[level].name,
            short: (customLogType[level].short)
                .toUpperCase()
                .slice(0, 3),
            level: level,
        }
    }

    return {
        level: level,
        name: "Unknown",
        short: "UNK",
    }



}

export interface Log {
    time: number,
    type: LogType,
    value: string,
    area?: string,
}

export type LogParser = (log: Log) => string

export function defaultLogParser(log: Log): string {
    return getLogTimestemp(log.time) +
        "|" + log.type.short +
        "|" + (
            log.area ?
                log.area + "| " :
                " "
        ) + (
            log.value
                .split("\n")
                .join("\n  ")
        ) + (
            log.value.includes("\n") ?
                "\n" :
                ""
        )
}

export function getLogTimestemp(date: Date | number): string {
    if (typeof date == "number") {
        date = new Date(date)
    }

    let year = date.getFullYear()
    let month = ('0' + (date.getMonth() + 1)).slice(-2)
    let day = ('0' + date.getDate()).slice(-2)
    let hours = ('0' + date.getHours()).slice(-2)
    let minutes = ('0' + date.getMinutes()).slice(-2)
    let seconds = ('0' + date.getSeconds()).slice(-2)

    return `${year}.${month}.${day}-${hours}:${minutes}:${seconds}`
}

export type PipeTargetFunc = ((log: Log) => any)
export interface PipeTargetObject {
    addLog: (log: Log) => any
}

export type PipeTarget = PipeTargetFunc | PipeTargetObject

export interface LogRewriteOptions {
    isArea?: string | string[],
    notArea?: string | string[],
    startsWithArea?: string | string[],
    newAreaPrefix?: string,
    justWithoutArea?: boolean,
    justWithArea?: boolean,
    minLogLevel?: number,
    maxLogLevel?: number,
}

export interface LogRewriteSettings {
    isArea: string[] | undefined,
    notArea: string[] | undefined,
    startsWithArea: string[] | undefined,
    newAreaPrefix: string | undefined,
    justWithoutArea?: boolean,
    justWithArea?: boolean,
    minLogLevel?: number,
    maxLogLevel?: number,
}

export class Logger {
    pipeTargets: PipeTarget[] | undefined

    static StdOut: Logger = new Logger(
        (log: Log): void => {
            console.info(defaultLogParser(log))
        }
    )

    static StdStreams: Logger = new Logger(
        (log: Log): void => {
            if (log.type.level < 10) {
                console.error(defaultLogParser(log))
            } else {
                console.info(defaultLogParser(log))
            }
        }
    )

    constructor(
        pipeTargets: PipeTarget | PipeTarget[] | undefined = undefined,
        public prefix: string | undefined = "",
        public logs: Log[] = [],
    ) {
        if (pipeTargets) {
            if (Array.isArray(pipeTargets)) {
                this.pipeTargets = pipeTargets
            } else {
                this.pipeTargets = [pipeTargets]
            }
            for (const pipeTarget of this.pipeTargets) {
                if (
                    !pipeTarget ||
                    pipeTarget == null ||
                    (
                        typeof pipeTarget != "function" &&
                        typeof pipeTarget != "object"
                    )
                ) {
                    throw new Error(
                        "Pipe target need to be an object with log method or a calback function"
                    )
                } else if (pipeTarget == this) {
                    throw new Error("Cant select a logger as its own pipe target")
                }
            }
        }
    }

    rewrite = (
        options: LogRewriteOptions
    ): PipeTargetFunc => {
        const settings: LogRewriteSettings = {
            ...options,
            isArea: !options.isArea ?
                undefined :
                Array.isArray(options.isArea) ?
                    options.isArea :
                    [options.isArea],
            notArea: !options.notArea ?
                undefined :
                Array.isArray(options.notArea) ?
                    options.notArea :
                    [options.notArea],
            startsWithArea: !options.startsWithArea ?
                undefined :
                Array.isArray(options.startsWithArea) ?
                    options.startsWithArea :
                    [options.startsWithArea],
            newAreaPrefix: options.newAreaPrefix ?
                parseArea(options.newAreaPrefix) :
                undefined,
        }

        return (log) => {
            if (log.area) {
                if (settings.justWithoutArea == true) {
                    return
                }

                if (
                    settings.notArea &&
                    settings.notArea.includes(log.area)
                ) {
                    return
                }

                if (
                    settings.isArea &&
                    !settings.isArea.includes(log.area)
                ) {
                    return
                }

                if (
                    settings.startsWithArea
                ) {
                    let found: boolean = false
                    for (const startsWithArea of settings.startsWithArea) {
                        if (log.area.startsWith(startsWithArea)) {
                            found = true
                            break
                        }
                    }
                    if (!found) {
                        return
                    }
                }
            } else if (
                settings.justWithArea == true ||
                (
                    settings.isArea &&
                    settings.isArea.length > 0 ||
                    settings.startsWithArea &&
                    settings.startsWithArea.length > 0
                )
            ) {
                return
            }

            if (
                settings.maxLogLevel &&
                log.type.level > settings.maxLogLevel
            ) {
                return
            }

            if (
                settings.minLogLevel &&
                log.type.level < settings.minLogLevel
            ) {
                return
            }

            this.addLog({
                ...log,
                area: log.area ? (
                    settings.newAreaPrefix ?
                        settings.newAreaPrefix + "-" + log.area :
                        log.area
                ) : (
                    settings.newAreaPrefix ?
                        settings.newAreaPrefix :
                        undefined
                )
            })
        }
    }

    pipe(
        pipeTarget: PipeTarget,
        justNewLogs: boolean = false
    ): void {
        if (
            !pipeTarget ||
            pipeTarget == null ||
            (
                typeof pipeTarget != "function" &&
                typeof pipeTarget != "object"
            )
        ) {
            throw new Error(
                "Pipe target need to be an object with log method or a calback function"
            )
        } else if (pipeTarget == this) {
            throw new Error("Cant select a logger as its own pipe target")
        }

        if (!justNewLogs) {
            for (const log of this.logs) {
                if (typeof pipeTarget == "function") {
                    pipeTarget(log)
                } else {
                    pipeTarget.addLog(log)
                }
            }
        }

        if (!this.pipeTargets) {
            this.pipeTargets = []
        }

        this.pipeTargets.push(pipeTarget)
    }

    unpipe(
        pipeTarget: PipeTarget,
    ): void {
        if (
            !this.pipeTargets ||
            pipeTarget == this
        ) {
            return
        }

        if (
            !pipeTarget ||
            pipeTarget == null ||
            (
                typeof pipeTarget != "function" &&
                typeof pipeTarget != "object"
            )
        ) {
            throw new Error(
                "Pipe target need to be an object with log method or a calback function"
            )
        }

        if (typeof pipeTarget == "function") {
            const pipeTargetString = "" + pipeTarget

            this.pipeTargets = this.pipeTargets.filter(
                (v) => {
                    if (typeof v == "function") {
                        return "" + v != pipeTargetString
                    }
                    return true
                }
            )
        } else {
            this.pipeTargets = this.pipeTargets.filter(
                (v) => {
                    if (typeof v == "object") {
                        return v != pipeTarget
                    }
                    return true
                }
            )
        }

        if (this.pipeTargets.length == 0) {
            this.pipeTargets = undefined
        }
    }

    unpipeAll(): void {
        this.pipeTargets = undefined
    }

    clear(): void {
        this.logs = []
    }

    fatal(
        value: string,
        area?: string,
    ): void {
        this.log(
            fatalLogType,
            value,
            area
        )
    }

    error(
        value: string,
        area?: string,
    ): void {
        this.log(
            errorLogType,
            value,
            area
        )
    }

    warn(
        value: string,
        area?: string,
    ): void {
        this.log(
            warningLogType,
            value,
            area
        )
    }

    info(
        value: string,
        area?: string,
    ): void {
        this.log(
            infoLogType,
            value,
            area
        )
    }

    trace(
        value: string,
        area?: string,
    ): void {
        this.log(
            traceLogType,
            value,
            area
        )
    }

    debug(
        value: string,
        area?: string,
    ): void {
        this.log(
            debugLogType,
            value,
            area
        )
    }

    log(
        level: number | LogType,
        value: string,
        area?: string,
    ): void {
        this.addLog({
            type: typeof level == "number" ?
                getLogTypeByLevel(level) :
                level,
            value: (
                this.prefix != undefined ?
                    this.prefix + value :
                    value
            ),
            area: area ?
                parseArea(area) :
                undefined,
            time: Date.now(),
        })
    }

    addLog(
        log: Log,
    ): void {
        this.logs.push(log)

        if (this.pipeTargets) {
            for (const pipeTarget of this.pipeTargets) {
                if (typeof pipeTarget == "function") {
                    pipeTarget(log)
                } else {
                    pipeTarget.addLog(log)
                }
            }
        }
    }

    getAbove(
        level: number,
        includeLevel: boolean,
    ): Log[] {
        return this.logs.filter(
            (v) => includeLevel ?
                v.type.level >= level :
                v.type.level > level
        )
    }

    getBelow(
        level: number,
        includeLevel: boolean,
    ): Log[] {
        return this.logs.filter(
            (v) => includeLevel ?
                v.type.level <= level :
                v.type.level < level
        )
    }

    getLogsWithAreas(
        areas: string[]
    ): Log[] {
        return this.logs.filter(
            (v) => v.area ?
                areas.includes(v.area) :
                false
        )
    }

    getLogsInArea(
        areas: string[]
    ): Log[] {
        return this.logs.filter(
            (v) => {
                if (!v.area) {
                    return false
                }

                for (const area of areas) {
                    if (area.startsWith(v.area)) {
                        return true
                    }
                }
                return false
            }
        )
    }

    getLogsNotInAreas(
        areas: string[]
    ): Log[] {
        return this.logs.filter(
            (v) => v.area ?
                !areas.includes(v.area) :
                !areas.includes("default")
        )
    }

    parseLogs(
        logParser: LogParser = defaultLogParser,
    ) {
        let out: string = ""
        for (const log of this.logs) {
            out += logParser(log) + "\n"
        }
        return out
    }
}

export function parseArea(
    area: string
): string {
    area = area.toLowerCase()
    while (area.startsWith("-")) {
        area = area.slice(1)
    }

    while (area.endsWith("-")) {
        area = area.slice(0, -1)
    }

    if (area.includes(" ")) {
        area = area.split(" ").join("-")
    }
    if (area.includes("_")) {
        area = area.split("_").join("-")
    }
    if (area.includes("#")) {
        area = area.split("#").join("-")
    }
    if (area.includes(";")) {
        area = area.split(";").join("-")
    }
    if (area.includes("/")) {
        area = area.split("/").join("-")
    }
    if (area.includes("\\")) {
        area = area.split("\\").join("-")
    }
    return area
}