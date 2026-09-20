const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const root = path.join(__dirname, '..')
const outputDir = path.join(root, 'assets', 'bip-6', 'images', 'clock-face')
const previewPath = path.join(root, 'design', 'watch-face-preview.png')
const coverPath = path.join(root, 'assets', 'bip-6', 'cover.png')
const iconPath = path.join(root, 'assets', 'bip-6', 'icon.png')
const font = path.join(root, 'design', 'fonts', 'Manrope-Bold.ttf')
const screen = { width: 390, height: 450 }
const face = { x: 9, y: 9, width: 372, height: 432, radius: 34 }
const pivot = { x: 195, y: 205 }
const radius = 1200
const stages = 144
const previewStage = 84
const white = '#F7F7F7'
const black = '#171717'
const mutedWhite = '#C6C6C6'
const mutedBlack = '#333333'

const numeralPositions = [
  ['12', 195, 70], ['1', 315, 42], ['2', 352, 125],
  ['3', 352, 225], ['4', 352, 325], ['5', 315, 408],
  ['6', 195, 421], ['7', 75, 408], ['8', 38, 325],
  ['9', 38, 225], ['10', 38, 125], ['11', 75, 42],
]

const halfHourDots = [
  [255, 42], [352, 84], [352, 175], [352, 275],
  [352, 366], [261, 415], [129, 415], [38, 366],
  [38, 275], [38, 175], [38, 84], [135, 42],
]

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: null,
    ...options,
  })

  if (result.status !== 0) {
    const message = result.stderr ? result.stderr.toString().trim() : ''
    throw new Error(`${command} failed${message ? `: ${message}` : ''}`)
  }
}

function progressPoints(stage) {
  if (stage <= 0) return []
  if (stage >= stages) return []

  const sweep = (stage / stages) * 360
  const increments = Math.max(1, Math.ceil(sweep / 4))
  const points = [[pivot.x, pivot.y]]

  for (let step = 0; step <= increments; step += 1) {
    const degrees = -90 + (sweep * step) / increments
    const radians = (degrees * Math.PI) / 180
    points.push([
      Math.round(pivot.x + Math.cos(radians) * radius),
      Math.round(pivot.y + Math.sin(radians) * radius),
    ])
  }

  return points
}

function progressPath(stage) {
  if (stage <= 0) return ''
  if (stage >= stages) return `<rect x="${face.x}" y="${face.y}" width="${face.width}" height="${face.height}"/>`

  return `<polygon points="${progressPoints(stage).map((point) => point.join(',')).join(' ')}"/>`
}

function backgroundSvg(stage) {
  const progress = progressPath(stage)
  const solidProgress = progressPath(Math.max(0, stage - 0.015))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${screen.width}" height="${screen.height}" viewBox="0 0 ${screen.width} ${screen.height}">
  <defs>
    <radialGradient id="face-gradient" cx="50%" cy="42%" r="77%">
      <stop offset="0%" stop-color="#292929"/>
      <stop offset="62%" stop-color="#171717"/>
      <stop offset="100%" stop-color="#090909"/>
    </radialGradient>
    <clipPath id="face-clip"><rect x="${face.x}" y="${face.y}" width="${face.width}" height="${face.height}" rx="${face.radius}"/></clipPath>
    <filter id="progress-feather" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.7"/></filter>
  </defs>
  <rect width="${screen.width}" height="${screen.height}" rx="42" fill="#000000"/>
  <rect x="${face.x}" y="${face.y}" width="${face.width}" height="${face.height}" rx="${face.radius}" fill="url(#face-gradient)"/>
  ${progress ? `<g fill="#F5F5F5" opacity="0.62" filter="url(#progress-feather)" clip-path="url(#face-clip)">${progress}</g><g fill="#F5F5F5" clip-path="url(#face-clip)">${solidProgress}</g>` : ''}
  <rect x="${face.x}" y="${face.y}" width="${face.width}" height="${face.height}" rx="${face.radius}" fill="none" stroke="#5A5A5E" stroke-width="1.5"/>
</svg>`
}

function previewBackgroundSvg(stage) {
  const progress = progressPath(stage)
  const solidProgress = progressPath(Math.max(0, stage - 0.015))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${screen.width}" height="${screen.height}" viewBox="0 0 ${screen.width} ${screen.height}">
  <defs>
    <radialGradient id="preview-gradient" cx="50%" cy="42%" r="77%">
      <stop offset="0%" stop-color="#292929"/>
      <stop offset="62%" stop-color="#171717"/>
      <stop offset="100%" stop-color="#090909"/>
    </radialGradient>
    <filter id="preview-feather" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.7"/></filter>
  </defs>
  <rect width="${screen.width}" height="${screen.height}" fill="url(#preview-gradient)"/>
  ${progress ? `<g fill="#F5F5F5" opacity="0.62" filter="url(#preview-feather)">${progress}</g><g fill="#F5F5F5">${solidProgress}</g>` : ''}
</svg>`
}

function renderSvg(svg, destination) {
  run('rsvg-convert', ['-w', String(screen.width), '-h', String(screen.height), '-o', destination], {
    input: svg,
  })
}

function drawOverlay(numeralColor, dotColor, destination, selector) {
  const args = ['-size', `${screen.width}x${screen.height}`, 'xc:none', '-gravity', 'center']
  const outlineColor = numeralColor === white ? black : white

  numeralPositions.forEach(([digit, x, y]) => {
    if (selector && !selector(digit, x, y)) return

    args.push(
      '(', '-background', 'none', '-fill', numeralColor, '-stroke', outlineColor, '-strokewidth', '1', '-font', font, '-pointsize', '38', `label:${digit}`, ')',
      '-geometry', `${x - screen.width / 2 >= 0 ? '+' : ''}${x - screen.width / 2}${y - screen.height / 2 >= 0 ? '+' : ''}${y - screen.height / 2}`,
      '-composite',
    )
  })

  const circles = halfHourDots
    .filter(([x, y]) => !selector || selector(null, x, y))
    .map(([x, y]) => `circle ${x},${y} ${x + 3.5},${y}`)
    .join(' ')

  args.push('-gravity', 'northwest', '-fill', dotColor, '-draw', circles, destination)
  run('magick', args)
}

function pointIsFilled(stage, digit, x, y) {
  if (stage <= 0) return false
  if (stage >= stages) return true

  // The 12 sits directly on the starting seam. Retaining white there prevents
  // a black half-glyph from disappearing into the unfilled half of the face.
  if (digit === '12') return false

  const angle = (Math.atan2(x - pivot.x, pivot.y - y) * 180 / Math.PI + 360) % 360
  return angle <= (stage / stages) * 360
}

if (!fs.existsSync(font)) {
  throw new Error(`Missing Manrope font at ${font}. Generate the static Bold font first.`)
}

fs.mkdirSync(outputDir, { recursive: true })
fs.readdirSync(outputDir)
  .filter((name) => /^face-\d\d\.png$/.test(name))
  .forEach((name) => fs.unlinkSync(path.join(outputDir, name)))

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bip-six-clock-face-'))
const whiteOverlay = path.join(tempDir, 'numerals-white.png')
const blackTwelveFull = path.join(tempDir, 'numeral-twelve-black.png')
const blackTwelveRight = path.join(tempDir, 'numeral-twelve-right-black.png')

try {
  drawOverlay(white, mutedWhite, whiteOverlay)
  drawOverlay(black, mutedBlack, blackTwelveFull, (digit) => digit === '12')
  run('magick', [
    blackTwelveFull, '-crop', '195x450+195+0', '+repage', '-gravity', 'east', '-background', 'none', '-extent', '390x450', blackTwelveRight,
  ])

  for (let stage = 0; stage <= stages; stage += 1) {
    const key = String(stage).padStart(2, '0')
    const background = path.join(tempDir, `background-${key}.png`)
    const blackOverlay = path.join(tempDir, `numerals-black-${key}.png`)
    const destination = path.join(outputDir, `face-${key}.png`)

    renderSvg(backgroundSvg(stage), background)
    drawOverlay(black, mutedBlack, blackOverlay, (digit, x, y) => pointIsFilled(stage, digit, x, y))
    if (stage >= stages) {
      run('magick', [background, blackOverlay, '-compose', 'Over', '-composite', destination])
    } else {
      run('magick', [
        background, whiteOverlay, '-compose', 'Over', '-composite', blackOverlay, '-compose', 'Over', '-composite',
        blackTwelveRight, '-compose', 'Over', '-composite', destination,
      ])
    }
  }

  const previewBackground = path.join(tempDir, 'preview-background.png')
  const previewBlackOverlay = path.join(tempDir, 'preview-numerals-black.png')
  renderSvg(previewBackgroundSvg(previewStage), previewBackground)
  drawOverlay(black, mutedBlack, previewBlackOverlay, (digit, x, y) => pointIsFilled(previewStage, digit, x, y))
  run('magick', [
    previewBackground, whiteOverlay, '-compose', 'Over', '-composite', previewBlackOverlay, '-compose', 'Over', '-composite',
    blackTwelveRight, '-compose', 'Over', '-composite', '-strip', '-define', 'png:compression-level=9', previewPath,
  ])
  run('magick', [previewPath, coverPath])
  // Zeus uses app.icon as the watch-face selector preview and resizes by width.
  // Preserve the screen aspect ratio so the preview fills its portrait slot.
  run('magick', [previewPath, '-strip', '-define', 'png:compression-level=9', iconPath])
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}

console.log(`Generated ${stages + 1} Manrope clock-face states in ${outputDir}`)
