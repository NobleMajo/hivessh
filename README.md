# HiveSsh

![CI/CD](https://github.com/noblemajo/hivessh/actions/workflows/bun-publish.yml/badge.svg)
![PATCHES](https://github.com/noblemajo/hivessh/actions/workflows/auto-update.yml/badge.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![typescript](https://img.shields.io/badge/dynamic/json?style=plastic&color=blue&label=Typescript&prefix=v&query=devDependencies.typescript&url=https%3A%2F%2Fraw.githubusercontent.com%2Fnoblemajo%2Fhivessh%2Fmain%2Fpackage.json)
![npm](https://img.shields.io/npm/v/hivessh.svg?style=plastic&logo=npm&color=red)

<!-- ![github](https://img.shields.io/badge/dynamic/json?style=plastic&color=darkviolet&label=GitHub&prefix=v&query=version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fnoblemajo%2Fhivessh%2Fmain%2Fpackage.json) -->

![](https://img.shields.io/badge/dynamic/json?color=green&label=watchers&query=watchers&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=yellow&label=stars&query=stargazers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=navy&label=forks&query=forks&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)

<!-- ![](https://img.shields.io/badge/dynamic/json?color=darkred&label=open%20issues&query=open_issues&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=orange&label=subscribers&query=subscribers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh) -->

HiveSsh is an innovative library designed to streamline SSH2
connections and simplify task execution on Linux servers.

It wraps around the ssh2-library, providing a
[promise-based approach](#promisified) to avoid nested callbacks
and adding useful features such as
[command existence checking](#command-existence-checks) and
persistent [exec sessions](#exec-session).

---

- [HiveSsh](#hivessh)
- [SSH2](#ssh2)
- [Key features](#key-features)
- [Requirements](#requirements)
- [Getting started](#getting-started)
  - [Promisified](#promisified)
    - [Execute](#execute)
    - [Execute at](#execute-at)
    - [Command existence checks](#command-existence-checks)
    - [Sftp](#sftp)
  - [Exec Session](#exec-session)
- [Technologies](#technologies)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

# SSH2

The term `ssh2` has two meanings here, the
`secure shell protocol` and the `npm library`. When referring to
the npm library, this repo will always refer to it as the
`ssh2`-library.

HiveSsh is a wrapper library of the `ssh2`-library with
additional features and promise-based task execution instead of
a callback function approach.

# Key features

HiveSsh provides the following key features:

-   **All-Distributions**: SSH2 and SFTP operations for all
    Linux servers
-   **Promisified**: Promise-based operations for ease of use
-   **AbstractPackageManager**: Built-in abstract package
    manager with support for apt, dnf, and yum, with additional
    configurability
-   **Exec**: Command execution utilities for event or
    promise-based error handling and output parsing, filtering,
    and mapping

# Requirements

HiveSsh requires the following server environments:

-   **SSH2 server**
-   **SFTP support**
-   **Linux distribution**

# Getting started

```sh
npm i hivessh
```

```ts
import { SshHost } from "hivelib"

// connect
const myHost = await SshHost.connect({
    host: "127.0.0.1",
    //port: 22, (default 22)
    //user: "root", (default root)

    password: "123456789",
})
// or
const myHost = await SshHost.connect({
    host: "127.0.0.1",
    //port: 22, (default 22)
    //user: "root", (default root)

    privateKey: "...",
    //passphrase: "123456789"
})
// or
const myHost = await SshHost.connect({
    host: "127.0.0.1",
    //port: 22, (default 22)
    //user: "root", (default root)

    privateKeyPath: "/home/user/.ssh/id_rsa",
    //passphrase: "123456789"
})
```

Here are some using examples:

## Promisified

### Execute

After connecting a `SshHost`, you can use the promisified
execution (and other asset features) directly on the `SshHost`
instance.

```ts
// check files in user home dir
const homeDirFiles = await myHost.exec("ls -al")
console.log("Home dir files:\n", homeDirFiles.out)
```

### Execute at

You can also execute commands on absolut path:

```ts
const etcDirFiles = await myHost.exec("ls -al", { pwd: "/etc" })
console.log("Etc files: ", etcDirFiles.out)
```

### Command existence checks

Get the hosts public ip address:

```ts
// check if curl command exists
const curlExists = await myHost.cmdExists("curl")
if (!curlExists) {
    myHost.close()
    throw new Error(
        "Curl is not installed on: " + myHost.settings.id,
    )
}

const myIp = await myHost.exec("curl ifconfig.me")
console.log("Host public ip: " + myIp.out)
//other sources: `api.ipify.org`, `ipinfo.io/ip` or `ipecho.net/plain`
```

Also a git example:

```ts
// check if git command exists
const gitExists = await myHost.cmdExists("git")
if (!gitExists) {
    myHost.close()
    throw new Error(
        "Git is not installed on: " + myHost.settings.id,
    )
}

// get git status
const gitStatus = await myHost.exec("git status", {
    pwd: "/home/tester/myrepo",
})

console.log("Git status:\n", gitStatus.out)
```

### Sftp

You can also use the promisified SFTP features via
`SshHost.sftp`.

```ts
const myBinary: Buffer = await myHost.sftp.readFile(
    "/home/tester/my-binary",
)

const exampleConfig: string = await myHost.sftp.readFile(
    "/etc/example/config.yml",
    "utf8",
)
```

You can find the types in the
[npmjs.com build](https://www.npmjs.com/package/hivessh?activeTab=code)
(at /dist/essentials/SftpPromiseWrapper.d.ts). You can also
check out the `ssh2`-library
[sftp docs](https://github.com/mscdex/ssh2/blob/master/SFTP.md)
for more background.

## Exec Session

This Sessions are reusable command environments that can
predefine the current working directory (cwd), user (via sudo),
and environment variables for executing mutiple commands. They
allow you to run multiple commands consistently without
repeatedly specifying paths, users, or settings, making command
execution cleaner and more maintainable.

```ts
const session = host.session("/etc/example")

session.exec("ls -al") // is executed at /etc/example
session.exec("./myApp") // is using MY_APP_ENV_VAR
```

Example with more options:

```ts
const session = host.session("/etc/someapp")

// if a other user is needed to execute the process
// login user needs sudo rights without password to switch to that target user
session.asUser = "root"

// set process environment variables for following processes
session.env.TZ = "Europe/Berlin"
session.env.NODE_ENV = "production"

// change directory (without checking if exists) for following processes
// shortcut for session.env.PWD = "/etc/someapp/dist"
session.cd("/etc/someapp/dist")

// execute my app with earlier defined environment
session.exec("bun myApp.js")
```

# Technologies

HiveSsh is built using the following technologies:

-   **TypeScript**
-   **Bun.js**
-   [`ssh2`-library](https://www.npmjs.com/package/ssh2)

# Contributing

Contributions to this project are welcome!  
Interested users can follow the guidelines provided in the
[CONTRIBUTING.md](CONTRIBUTING.md) file to contribute to the
project and help improve its functionality and features.

# License

This project is licensed under the [MIT](LICENSE) license, which
provides users with the flexibility and freedom to use and
modify the software according to their needs.

# Disclaimer

This project is provided "as is".  
Users are advised to consult the accompanying licence for
further information on terms of use and limitations of
liability.
