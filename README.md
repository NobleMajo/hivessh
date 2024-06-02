# HiveSsh

![CI/CD](https://github.com/noblemajo/hivessh/actions/workflows/npm-publish.yml/badge.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![typescript](https://img.shields.io/badge/dynamic/json?style=plastic&color=blue&label=Typescript&prefix=v&query=devDependencies.typescript&url=https%3A%2F%2Fraw.githubusercontent.com%2Fnoblemajo%2Fhivessh%2Fmain%2Fpackage.json)
![npm](https://img.shields.io/npm/v/hivessh.svg?style=plastic&logo=npm&color=red)
<!-- ![github](https://img.shields.io/badge/dynamic/json?style=plastic&color=darkviolet&label=GitHub&prefix=v&query=version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fnoblemajo%2Fhivessh%2Fmain%2Fpackage.json) -->

<!-- ![](https://img.shields.io/badge/dynamic/json?color=green&label=watchers&query=watchers&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=yellow&label=stars&query=stargazers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=orange&label=subscribers&query=subscribers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=navy&label=forks&query=forks&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=darkred&label=open%20issues&query=open_issues&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh) -->

HiveSsh simplifies SSH2 connections via promise-based task execution on Linux servers with built-in server utilities and powerful command execution functions.

HiveSsh is a library designed to streamline SSH2 connections and task execution on Linux servers. It provides user-friendly promise-based functions for efficient server operations without the need for a client application.

----

- [HiveSsh](#hivessh)
- [Key Features](#key-features)
- [Requirements](#requirements)
- [Getting started](#getting-started)
  - [Promisified](#promisified)
    - [Execute and assets](#execute-and-assets)
    - [Sftp](#sftp)
  - [AbstractPackageManager](#abstractpackagemanager)
    - [Custom package manager](#custom-package-manager)
    - [Register package manager](#register-package-manager)
  - [Exec Session](#exec-session)
- [Technologies](#technologies)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

# Key Features
HiveSsh offers the following key features:
- __All-Distributions__: SSH2 and SFTP operations for all Linux servers
- __Promisified__: Promise-based functions for ease of use

- __AbstractPackageManager__: Built-in abstract package manager with support for apt, dnf, and yum, with additional configurability
- __Exec__: Command execution utilities for event or promise-based error handling and output parsing, filtering, and mapping

# Requirements
HiveSsh requires the following server environments:
- **SSH2 server**
- **SFTP support**
- **Linux distribution**

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

    privateKey: "..."
    //passphrase: "123456789"
})
// or
const myHost = await SshHost.connect({
    host: "127.0.0.1",
    //port: 22, (default 22)
    //user: "root", (default root)

    privateKeyPath:"/home/user/.ssh/id_rsa",
    //passphrase: "123456789"
})
```

Here are some using examples:

## Promisified
### Execute and assets

After connecting an `SshHost`, you can use the promisified execution (and other asset features) directly on the `SshHost` instance.
```ts
// check files in user home dir
const homeDirFiles = await myHost.exec("ls -al")
console.log("Home dir files:\n", homeDirFiles.out)
```

Get the hosts public ip address:
```ts
// check if curl command exists
const curlExists = await myHost.exists("curl")
if(!curlExists){
  myHost.close()
  throw new Error("Curl is not installed on: " + myHost.settings.id)
}

const myIp = await myHost.exec("curl ifconfig.me")
console.log("Host public ip: " + myIp.out)
//other sources: `api.ipify.org`, `ipinfo.io/ip` or `ipecho.net/plain`
```

You can also execute commands on absolut path:
```ts
const etcDirFiles = await myHost.exec(
  "ls -al",
  { pwd: "/etc" }
)
console.log("Etc files: ", etcDirFiles.out)
```

Also a git example:
```ts
// check if git command exists
const gitExists = await myHost.exists("git")
if(!gitExists){
  myHost.close()
  throw new Error("Git is not installed on: " + myHost.settings.id)
}

// get git status
const gitStatus = await myHost.exec(
  "git status",
  {
    pwd: "/home/tester/myrepo"
  }
)

console.log("Git status:\n", gitStatus.out)
```

### Sftp
You can also use the promisified SFTP features via `SshHost.sftp`.
```ts
const myBinary: Buffer = await myHost.sftp.readFile("/home/tester/my-binary")

const exampleConfig: string = await myHost.sftp.readFile("/etc/example/config.yml", "utf8")
```

## AbstractPackageManager
With the abstract package manager (`apm`) you can use `apt`, `dnf`, `yum` or a `custom implemented package manager` via one interface.
The apm features are limited and general, but you can update your system and install, delete and list your packages.

```ts
// upgrade all packages using the abstract package manager
const apm = await myHost.getApm()
await apm.updateCache()
await apm.upgradeAll()

// install a package using the abstract package manager
await apm.install("git")
```

### Custom package manager

For creating a custon apm you need to implement the following typescript interface:
[https://github.com/NobleMajo/hivessh/blob/main/src/apm/ApmInterface.ts](https://github.com/NobleMajo/hivessh/blob/main/src/apm/ApmInterface.ts)

### Register package manager

After implementing the custom package manager you need to register it global via a checker function:
```ts
import { apmChecker, AbstractPackageManager } from "./apm/apm.js"

apmChecker.push(async (host) => {
    if (await host.cmdExists("myapm")) {
        const myApm: AbstractPackageManager = { ... }

        return myApm
    }
})
```

This function is called when the `getApm()` is called and can return a package manager depending on the host.

## Exec Session
Sessions are available so that the PWD (process working directory) and environment do not have to be specified for every single command.
These sessions store that persistent settings across multiple executions and can even resolve relative paths.

```ts
const session = host.session("/etc/example")

session.exec("ls -al") // is executed at /etc/example
session.exec("./myApp") // is using MY_APP_ENV_VAR
```

Example with more options:
```ts
const session = host.session("/etc/someapp")

//if sudo is needed enable it for following processes
session.sudo = true

// set process environment variables for following processes
session.env.TZ = "Europe/Berlin"
session.env.NODE_ENV = "production"

// change directory (without checking if exists) for following processes
// shortcut for session.env.PWD = "/etc/someapp/dist"
session.cd("/etc/someapp/dist")

// execute my app with earlier defined environment
session.exec("node myApp.js")
```

# Technologies
HiveSsh is built using the following technologies:
- **TypeScript**
- **Node.js**
- **SSH2** ([NPM Package](https://www.npmjs.com/package/ssh2) & Protocol)

# Contributing
Contributions to HiveSsh are welcome!  
Interested users can refer to the guidelines provided in the [CONTRIBUTING.md](CONTRIBUTING.md) file to contribute to the project and help improve its functionality and features.

# License
HiveSsh is licensed under the [MIT license](LICENSE), providing users with flexibility and freedom to use and modify the software according to their needs.

# Disclaimer
HiveSsh is provided without warranties.  
Users are advised to review the accompanying license for more information on the terms of use and limitations of liability.
