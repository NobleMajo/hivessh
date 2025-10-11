import Bun from "bun"

const packageJson = await Bun.file("package.json").json()

packageJson.version = packageJson.version
    .split(".")
    .map((v: string, i) => {
        if (i === 2) {
            const patchNumber = Number(v)

            if (isNaN(patchNumber)) {
                throw new Error(
                    "Invalid patch version: can convert current patch verion to number ('" +
                        v +
                        "'): " +
                        packageJson.version,
                )
            }

            return patchNumber + 1
        }
        return v
    })
    .join(".")

await Bun.write(
    "package.json",
    JSON.stringify(packageJson, null, 2),
)

console.info("Bumped patch version to " + packageJson.version)
