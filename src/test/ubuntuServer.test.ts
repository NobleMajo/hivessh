import { SshHost } from "../index.js"

if (!process.env.UBUNTU_TEST_HOST) {
    throw new Error("Env var UBUNTU_TEST_HOST not set!")
}

if (!process.env.UBUNTU_TEST_USER) {
    throw new Error("Env var UBUNTU_TEST_USER not set!")
}

if (!process.env.UBUNTU_TEST_KEYPATH) {
    throw new Error("Env var UBUNTU_TEST_KEYPATH not set!")
}

if (!process.env.UBUNTU_TEST_PORT) {
    throw new Error("Env var UBUNTU_TEST_PORT not set!")
}

if (isNaN(Number(process.env.UBUNTU_TEST_PORT))) {
    throw new Error(
        "Env var UBUNTU_TEST_PORT is not a number:\n" +
        "'" + process.env.UBUNTU_TEST_PORT + "'"
    )
}

process.env.UBUNTU_TEST_KEYPATH =
    process.env.UBUNTU_TEST_KEYPATH
        .split("$HOME")
        .join(process.env.HOME)

const host = await SshHost.connect({
    host: process.env.UBUNTU_TEST_HOST,
    user: process.env.UBUNTU_TEST_USER,
    port: Number(process.env.UBUNTU_TEST_PORT),
    privateKeyPath: process.env.UBUNTU_TEST_KEYPATH,
})

console.info("Load os release info...")
const release = await host.fetchOsRelease()
console.info("- os release: ", release)

if (release.distroName != "ubuntu") {
    throw new Error(
        "The distroName should be ubuntu but is:\n" +
        "'" + release.distroName + "'"
    )
}

console.info("Load apm...")
const apm = await host.getApm()
console.info("- apm.type: " + apm.type)
if (apm.type != "apt") {
    throw new Error(
        "The apm type should be apt but is:\n" +
        "'" + apm.type + "'"
    )
}

console.info("Update cache...")
await apm.updateCache()

console.info("Update packages...")
await apm.upgradeAll()

console.info("List installed packages...")
const installedPackages: string[] = await apm.list()
console.info("- installedPackages: ", installedPackages.length)
if (installedPackages.includes("neofetch")) {
    console.info("Preuninstall neofetch because already installed...")
    await apm.uninstall("neofetch")
} else if (installedPackages.length == 0) {
    throw new Error("Some issue by fetching package list because its empty!")
}

let neofetchExists: boolean = await host.cmdExists("neofetch")
console.info("- neofetchExists: ", neofetchExists)
if (neofetchExists) {
    throw new Error(
        "The neofetch cmd should initialy not exist!"
    )
}

console.info("Install neofetch...")
await apm.install("neofetch")

neofetchExists = await host.cmdExists("neofetch")
console.info("- neofetchExists: ", neofetchExists)
if (!neofetchExists) {
    throw new Error(
        "The neofetch cmd should exist after installation!"
    )
}

console.info("Uninstall neofetch...")
await apm.uninstall("neofetch")

neofetchExists = await host.cmdExists("neofetch")
console.info("- neofetchExists: ", neofetchExists)
if (neofetchExists) {
    throw new Error(
        "The neofetch cmd should not exist after uninstall!"
    )
}

host.close()
console.info("Works!")

/*
Example test output:

Load os release info...
- os release:  {
  distroName: 'ubuntu',
  distroVersion: '22.04',
  meta: {
    PRETTY_NAME: 'Ubuntu 22.04.4 LTS',
    NAME: 'Ubuntu',
    VERSION_ID: '22.04',
    VERSION: '22.04.4 LTS (Jammy Jellyfish)',
    VERSION_CODENAME: 'jammy',
    ID: 'ubuntu',
    ID_LIKE: 'debian',
    HOME_URL: 'https://www.ubuntu.com/',
    SUPPORT_URL: 'https://help.ubuntu.com/',
    BUG_REPORT_URL: 'https://bugs.launchpad.net/ubuntu/',
    PRIVACY_POLICY_URL: 'https://www.ubuntu.com/legal/terms-and-policies/privacy-policy',
    UBUNTU_CODENAME: 'jammy',
    DISTRIB_ID: 'Ubuntu',
    DISTRIB_RELEASE: '22.04',
    DISTRIB_CODENAME: 'jammy',
    DISTRIB_DESCRIPTION: 'Ubuntu 22.04.4 LTS'
  }
}
Load apm...
- apm.type: apt
Update cache...
Update packages...
List installed packages...
- installedPackages:  753
- neofetchExists:  false
Install neofetch...
- neofetchExists:  true
Uninstall neofetch...
- neofetchExists:  false
Works!
*/