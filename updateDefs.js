const https = require("https")
const fs = require("fs")

const url = 'https://raw.githubusercontent.com/bitburner-official/bitburner-src/dev/src/ScriptEditor/NetscriptDefinitions.d.ts'
const path = './NetscriptDefinitions.d.ts'
const constantsUrl = 'https://raw.githubusercontent.com/bitburner-official/bitburner-src/dev/src/Constants.ts'
const constantsPath = 'src/game-constants.ts'

https.get(url, (res) => {
    const file = fs.createWriteStream(path)

    res.pipe(file)

    file.on('finish', () => {
        file.close
        console.log('Netscript Type Definitions Updated')
    })


}).on("error", (err) => {
    console.log("Error: ", err.message)
})

https.get(constantsUrl, (res) => {
    const file = fs.createWriteStream(constantsPath)

    res.pipe(file)

    file.on('finish', () => {
        file.close
        console.log('Game constants Updated')
    })
}).on("error", (err) => {
    console.log("Error: ", err.message)
})
