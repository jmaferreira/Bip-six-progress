const fs = require('fs')

const inputPath = process.argv[2]
const outputPath = process.argv[3]
const text = fs.readFileSync(inputPath, 'utf8')
const lines = text.split(/\r?\n/)
const ansiLines = lines
  .map((line) => {
    const cells = []
    const matches = line.matchAll(/\x1b\[(40|47)m  /g)
    for (const match of matches) cells.push(match[1] === '40' ? '█' : ' ')
    return cells.join('')
  })
  .filter((line) => line.length > 20)
const plainLines = lines
  .map((line) => line.replace(/\x1b\[[0-9;]*m/g, ''))
  .filter((line) => /^[ ▀▄█]+$/.test(line) && line.length > 20)
const encoded = ansiLines.length ? ansiLines : plainLines

if (!encoded.length) throw new Error('No terminal QR code found')

const width = Math.max(...encoded.map((line) => line.length))
const height = encoded.length * 2
const quiet = 4
const scale = 10
const rects = []

encoded.forEach((line, row) => {
  Array.from(line.padEnd(width)).forEach((cell, column) => {
    const upper = cell === '▀' || cell === '█'
    const lower = cell === '▄' || cell === '█'
    if (upper) rects.push(`<rect x="${column + quiet}" y="${row * 2 + quiet}" width="1" height="1"/>`)
    if (lower) rects.push(`<rect x="${column + quiet}" y="${row * 2 + quiet + 1}" width="1" height="1"/>`)
  })
})

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(width + quiet * 2) * scale}" height="${(height + quiet * 2) * scale}" viewBox="0 0 ${width + quiet * 2} ${height + quiet * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><g fill="black">${rects.join('')}</g></svg>`
fs.writeFileSync(outputPath, svg)
