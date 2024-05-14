import { FileEntryWithStats, InputAttributes, OpenMode, ReadFileOptions, SFTPWrapper, Stats, TransferOptions, WriteFileOptions } from "ssh2"

export interface FileStat {
    path: string,
    filename: string,
    mode: number,
    uid: number,
    gid: number,
    size: number,
    atime: number,
    mtime: number,
    isDirectory: boolean
    isFile: boolean
    isBlockDevice: boolean
    isCharacterDevice: boolean
    isSymbolicLink: boolean
    isFIFO: boolean
    isSocket: boolean
}

export function convertFileEntryState(
    path: string,
    stats: FileEntryWithStats
): FileStat {
    return {
        path: path,
        filename: stats.filename,
        mode: stats.attrs.mode,
        uid: stats.attrs.uid,
        gid: stats.attrs.gid,
        size: stats.attrs.size,
        atime: stats.attrs.atime,
        mtime: stats.attrs.mtime,
        isDirectory: stats.attrs.isDirectory(),
        isFile: stats.attrs.isFile(),
        isBlockDevice: stats.attrs.isBlockDevice(),
        isCharacterDevice: stats.attrs.isCharacterDevice(),
        isSymbolicLink: stats.attrs.isSymbolicLink(),
        isFIFO: stats.attrs.isFIFO(),
        isSocket: stats.attrs.isSocket(),
    }
}

export interface SFTPPromiseInterface {
    /**
     * (Client-only)
     * Downloads a file at `remotePath` to `localPath` using parallel reads for faster throughput.
     */
    fastGet(remotePath: string, localPath: string, options?: TransferOptions): Promise<void>

    /**
     * (Client-only)
     * Uploads a file from `localPath` to `remotePath` using parallel reads for faster throughput.
     */
    fastPut(localPath: string, remotePath: string, options?: TransferOptions): Promise<void>

    /**
     * (Client-only)
     * Reads a file in memory and returns its contents
     */
    readFile<
        O extends ReadFileOptions | BufferEncoding
    >(
        remotePath: string,
        options?: O,
    ): Promise<
        O extends BufferEncoding ?
        string :
        O extends { encodeing: BufferEncoding } ?
        string :
        Buffer
    >

    /**
     * (Client-only)
     * Writes data to a file
     */
    writeFile<
        O extends WriteFileOptions | BufferEncoding,
    >(
        remotePath: string,
        data: (
            O extends BufferEncoding ?
            string :
            O extends { encodeing: BufferEncoding } ?
            string :
            Buffer
        ),
        options?: WriteFileOptions | BufferEncoding
    ): Promise<void>

    /**
     * (Client-only)
     * Appends data to a file
     */
    appendFile<
        O extends WriteFileOptions | BufferEncoding,
    >(
        remotePath: string,
        data: (
            O extends BufferEncoding ?
            string :
            O extends { encodeing: BufferEncoding } ?
            string :
            Buffer
        ),
        options?: WriteFileOptions
    ): Promise<void>

    /**
     * (Client-only)
     * Opens a file `filename` for `mode` with optional `attributes`.
     */
    open(
        filename: string,
        mode: number | OpenMode,
        attributes: InputAttributes | string | number,
    ): Promise<Buffer>

    /**
     * (Client-only)
     * Reads `length` bytes from the resource associated with `handle` starting at `position`
     * and stores the bytes in `buffer` starting at `offset`.
     */
    read(
        handle: Buffer,
        buffer: Buffer,
        offset: number,
        length: number,
        position: number,
    ): Promise<[number, Buffer, number]>

    /**
     * (Client-only)
     */
    write(handle: Buffer, buffer: Buffer, offset: number, length: number, position: number): Promise<void>

    /**
     * (Client-only)
     * Retrieves attributes for the resource associated with `handle`.
     */
    fstat(handle: Buffer): Promise<Stats>

    /**
     * (Client-only)
     * Sets the attributes defined in `attributes` for the resource associated with `handle`.
     */
    fsetstat(handle: Buffer, attributes: InputAttributes): Promise<void>

    /**
     * (Client-only)
     * Sets the access time and modified time for the resource associated with `handle`.
     */
    futimes(handle: Buffer, atime: number | Date, mtime: number | Date): Promise<void>

    /**
     * (Client-only)
     * Sets the owner for the resource associated with `handle`.
     */
    fchown(handle: Buffer, uid: number, gid: number): Promise<void>

    /**
     * (Client-only)
     * Sets the mode for the resource associated with `handle`.
     */
    fchmod(handle: Buffer, mode: number | string): Promise<void>

    /**
     * (Client-only)
     * Opens a directory `path`.
     */
    opendir(path: string): Promise<Buffer>

    /**
     * (Client-only)
     * Retrieves a directory listing.
     */
    readdir(location: string | Buffer): Promise<FileStat[]>

    /**
     * (Client-only)
     * Removes the file/symlink at `path`.
     */
    unlink(path: string): Promise<void>

    /**
     * (Client-only)
     * Renames/moves `srcPath` to `destPath`.
     */
    rename(srcPath: string, destPath: string): Promise<void>

    /**
     * (Client-only)
     * Creates a new directory `path`.
     */
    mkdir(path: string, attributes: InputAttributes): Promise<void>

    /**
     * (Client-only)
     * Creates a new directory `path`.
     */
    mkdir(path: string): Promise<void>

    /**
     * (Client-only)
     * Removes the directory at `path`.
     */
    rmdir(path: string): Promise<void>

    /**
     * (Client-only)
     * Retrieves attributes for `path`.
     */
    stat(path: string): Promise<Stats>

    /**
     * (Client-only)
     * `path` exists.
     */
    exists(path: string): Promise<boolean>

    /**
     * (Client-only)
     * Retrieves attributes for `path`. If `path` is a symlink, the link itself is stat'ed
     * instead of the resource it refers to.
     */
    lstat(path: string): Promise<Stats>

    /**
     * (Client-only)
     * Sets the attributes defined in `attributes` for `path`.
     */
    setstat(path: string, attributes: InputAttributes): Promise<void>

    /**
     * (Client-only)
     * Sets the access time and modified time for `path`.
     */
    utimes(path: string, atime: number | Date, mtime: number | Date): Promise<void>

    /**
     * (Client-only)
     * Sets the owner for `path`.
     */
    chown(path: string, uid: number, gid: number): Promise<void>

    /**
     * (Client-only)
     * Sets the mode for `path`.
     */
    chmod(path: string, mode: number | string): Promise<void>

    /**
     * (Client-only)
     * Retrieves the target for a symlink at `path`.
     */
    readlink(path: string): Promise<string>

    /**
     * (Client-only)
     * Creates a symlink at `linkPath` to `targetPath`.
     */
    symlink(targetPath: string, linkPath: string): Promise<void>

    /**
     * (Client-only)
     * Resolves `path` to an absolute path.
     */
    realpath(path: string): Promise<string>

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX rename(3) from `srcPath` to `destPath`.
     */
    ext_openssh_rename(srcPath: string, destPath: string): Promise<void>

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX statvfs(2) on `path`.
     */
    ext_openssh_statvfs(path: string): Promise<any>

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX fstatvfs(2) on open handle `handle`.
     */
    ext_openssh_fstatvfs(handle: Buffer): Promise<any>

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX link(2) to create a hard link to `targetPath` at `linkPath`.
     */
    ext_openssh_hardlink(targetPath: string, linkPath: string): Promise<void>

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX fsync(3) on the open handle `handle`.
     */
    ext_openssh_fsync(handle: Buffer): Promise<any>

    /**
     * (Client-only, OpenSSH extension)
     * Similar to setstat(), but instead sets attributes on symlinks.
     */
    ext_openssh_lsetstat(path: string, attrs: InputAttributes): Promise<void>
    ext_openssh_lsetstat(path: string): Promise<void>

    /**
     * (Client-only, OpenSSH extension)
     * Similar to realpath(), but supports tilde-expansion, i.e. "~", "~/..." and "~user/...". These paths are expanded using shell-like rules.
     */
    ext_openssh_expandPath(path: string): Promise<string>

    /**
     * (Client-only)
     * Performs a remote file copy. If length is 0, then the server will read from srcHandle until EOF is reached.
     */
    ext_copy_data(
        handle: Buffer,
        srcOffset: number,
        len: number,
        dstHandle: Buffer,
        dstOffset: number,
    ): Promise<void>
}

const voidMethods = [
    "fastGet",
    "fastPut",
    "writeFile",
    "appendFile",
    "write",
    "fsetstat",
    "futimes",
    "fchown",
    "fchmod",
    "unlink",
    "rename",
    "mkdir",
    "mkdir",
    "rmdir",
    "setstat",
    "utimes",
    "chown",
    "chmod",
    "symlink",
    "ext_openssh_rename",
    "ext_openssh_hardlink",
    "ext_openssh_lsetstat",
    "ext_openssh_lsetstat",
]

const bufferMethods = [
    "readFile",
    "open",
    "opendir",
]

const stringMethods = [
    "readlink",
    "realpath",
    "ext_openssh_expandPath",
]

const statsMethods = [
    "fstat",
    "lstat",
    "stat",
]

const anyMethods = [
    "ext_openssh_statvfs",
    "ext_openssh_fstatvfs",
    "ext_openssh_fsync",
]

const booleanMethods = [
    "exists",
]

const singleValueErrorCallbacks = [
    ...bufferMethods,
    ...stringMethods,
    ...statsMethods,
    ...anyMethods,
    ...booleanMethods,
]

const fsStatsMethods = [
    "readdir",
]

const otherMethods = [
    "read"
]


export type SFTPPromiseWrapper = SFTPPromiseInterface & Omit<SFTPWrapper, keyof SFTPPromiseInterface>

export function createSFTPPromiseWrapper(
    sourceWrapper: SFTPWrapper
): SFTPPromiseWrapper {
    const ret: any = sourceWrapper

    for (const voidMethod of voidMethods) {
        const altName = voidMethod + "2"
        ret[altName] = ret[voidMethod]
        ret[voidMethod] = (...params: any[]) => new Promise<void>(
            (res) => ret[altName](
                ...params,
                res
            )
        )
    }

    for (const bufferMethod of singleValueErrorCallbacks) {
        const altName = bufferMethod + "2"
        ret[altName] = ret[bufferMethod]
        ret[bufferMethod] = (...params: any[]) => new Promise<any>(
            (res, rej) => ret[altName](
                ...params,
                (err: any, value: any) => err ? rej(err) : res(value)
            )
        )
    }

    ret.readdir2 = ret.readdir
    ret.readdir = (...params: any[]) => new Promise<FileStat[]>(
        (res, rej) => ret.readdir(
            ...params,
            (err: any, value: FileEntryWithStats[]) => err ? rej(err) : res(
                value.map(
                    (v) => convertFileEntryState(params[0], v)
                )
            )
        )
    )

    ret.read2 = ret.read
    ret.read = (...params: any[]) => new Promise<[number, Buffer, number]>(
        (res, rej) => ret.read2(
            ...params,
            (err: Error | undefined, read: number, buf: Buffer, pos: number) => err ? rej(err) : res([read, buf, pos])
        )
    )

    return ret
}