
export * from "./HostHop.js"
export * from "./HostId.js"
export * from "./SshExec.js"
export * from "./SshHost.js"
export * from "./SshHostOptions.js"
export * from "./apm/PackageManager.js"
export * from "./essentials/SftpPromiseWrapper.js"

export * from "./utils/base.js"

import { SshHost } from "./SshHost.js"

export default SshHost

// or import SshHost from "hivelib" (SshHost is also the default export)

//connect
const myHost = await SshHost.connect({
    host: "127.0.0.1",
    //port: 22, (default 22)
    //user: "root", (default root)

    //password: "123456789",
    // or
    //privateKey: "..."
    // or
    //privateKeyPath:"/home/user/.ssh/id_rsa",
    //passphrase: "123456789"
})

myHost.sftp.readFile("/etc/example/config.yml", "utf8")