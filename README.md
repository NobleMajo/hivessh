# HiveSsh

![CI/CD](https://github.com/noblemajo/hivessh/actions/workflows/npm-publish.yml/badge.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![typescript](https://img.shields.io/badge/dynamic/json?style=plastic&color=blue&label=Typescript&prefix=v&query=devDependencies.typescript&url=https%3A%2F%2Fraw.githubusercontent.com%2Fnoblemajo%2Fhivessh%2Fmain%2Fpackage.json)
![npm](https://img.shields.io/npm/v/hivessh.svg?style=plastic&logo=npm&color=red)
![github](https://img.shields.io/badge/dynamic/json?style=plastic&color=darkviolet&label=GitHub&prefix=v&query=version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fnoblemajo%2Fhivessh%2Fmain%2Fpackage.json)

![](https://img.shields.io/badge/dynamic/json?color=green&label=watchers&query=watchers&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=yellow&label=stars&query=stargazers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=orange&label=subscribers&query=subscribers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=navy&label=forks&query=forks&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)
![](https://img.shields.io/badge/dynamic/json?color=darkred&label=open%20issues&query=open_issues&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fhivessh)

# Table of Contents
- [HiveSsh](#hivessh)
- [Table of Contents](#table-of-contents)
- [About](#about)
- [Key Features](#key-features)
- [Requirements](#requirements)
- [Getting started](#getting-started)
  - [Promisified](#promisified)
  - [AbstractPackageManager](#abstractpackagemanager)
- [Technologies](#technologies)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

# About
HiveSsh simplifies SSH2 connections via promise-based task execution on Linux servers with built-in server utilities and powerful command execution functions.

HiveSsh is a library designed to streamline SSH2 connections and task execution on Linux servers. It provides user-friendly promise-based functions for efficient server operations without the need for a client application.

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
```

Here are some using examples:

## Promisified
After connecting an `SshHost`, you can leverage the promised execution (and other asset features) directly on the `SshHost` instance.
```ts
// check files in user home dir
const result = await myHost.exec("ls -al")
console.log("Result: ", result.out)

// check if a command exists
const gitExist = await myHost.exists("git")
console.log("Git exists: ", gitExist)
```

You can also use the promised SFTP features via `SshHost.sftp`.
```ts
const myBinary: Buffer = await myHost.sftp.readFile("/home/tester/my-binary")

const exampleConfig: string = await myHost.sftp.readFile("/etc/example/config.yml", "utf8")
```

## AbstractPackageManager
With the abstract package manager (`apm`) you can use apt, dnf, yum or a custom implemented package manager via one interface.
The apm features are limited and general, but you can update your system and install, delete and list your packages.

```ts
// upgrade all packages using the abstract package manager
const apm = await myHost.getApm()
await apm.updateCache()
await apm.upgradeAll()

// install a package using the abstract package manager
await apm.install("git")
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
