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
- [Table of Contents](#table-of-contents)
- [About](#about)
- [Key Features](#key-features)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Technologies](#technologies)
- [License](#license)
- [Contributing](#contributing)
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

// check files in user home dir
const result = await myHost.exec("ls -al")
console.log("Result: ", result.out)

// check if a command exists
const gitExist = await myHost.exists("git")
console.log("Git exists: ", gitExist)

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
- **SSH2**
- **SFTP**

# License
HiveSsh is licensed under the MIT license, providing users with flexibility and freedom to use and modify the software according to their needs.

# Contributing
Contributions to HiveSsh are welcome!  
Interested users can refer to the guidelines provided in the ![CONTRIBUTING.md][CONTRIBUTING.md] file to contribute to the project and help improve its functionality and features.

# Disclaimer
HiveSsh is provided without warranties.  
Users are advised to review the accompanying license for more information on the terms of use and limitations of liability.
