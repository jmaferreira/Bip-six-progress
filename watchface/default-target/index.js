var SCREEN_W = 390
var SCREEN_H = 450
var STAGES_PER_CYCLE = 144
var STAGES_PER_HOUR = 12
var FIRST_REFRESH_DELAY = 1000
var REFRESH_INTERVAL = 30000

var timeSensor = null
var faceWidget = null
var refreshTimer = null
var renderedStage = -1

function faceSource(stage) {
  var key = String(stage)
  if (key.length < 2) key = '0' + key
  return 'images/clock-face/face-' + key + '.png'
}

function currentTime() {
  var hour = timeSensor ? Number(timeSensor.hour) : NaN
  var minute = timeSensor ? Number(timeSensor.minute) : NaN

  if (hour === hour && minute === minute) return { hour: hour, minute: minute }

  var fallback = new Date()
  return { hour: fallback.getHours(), minute: fallback.getMinutes() }
}

function currentStage() {
  var now = currentTime()

  // The dial repeats every 12 hours, so 19:00 correctly reaches the 7 position.
  // Each state represents five minutes; passing :30 therefore advances beyond
  // the half-hour marker rather than waiting for the following hour.
  var hourOnDial = now.hour % 12
  if (hourOnDial === 0 && now.minute === 0) return STAGES_PER_CYCLE

  return hourOnDial * STAGES_PER_HOUR + Math.floor(now.minute / 5)
}

function updateClockFace() {
  var stage = currentStage()
  if (stage === renderedStage) return
  renderedStage = stage

  if (faceWidget) hmUI.deleteWidget(faceWidget)
  faceWidget = hmUI.createWidget(hmUI.widget.IMG, {
    x: 0,
    y: 0,
    w: SCREEN_W,
    h: SCREEN_H,
    src: faceSource(stage),
    show_level: hmUI.show_level.ONLY_NORMAL,
  })
}

WatchFace({
  build: function () {
    // The Bip 6 is a square-display device. The system notification indicator
    // is also avoided by a dedicated safe position for the 12 numeral.
    try {
      hmUI.setStatusBarVisible(false)
    } catch (statusBarError) {}

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: SCREEN_W,
      h: SCREEN_H,
      color: '0xFF000000',
      show_level: hmUI.show_level.ONLY_NORMAL,
    })

    try {
      timeSensor = hmSensor.createSensor(hmSensor.id.TIME)
      timeSensor.addEventListener(hmSensor.event.CHANGE, updateClockFace)
    } catch (timeError) {}

    updateClockFace()

    try {
      refreshTimer = timer.createTimer(FIRST_REFRESH_DELAY, REFRESH_INTERVAL, updateClockFace, {})
    } catch (timerError) {}
  },

  onDestroy: function () {
    if (refreshTimer) timer.stopTimer(refreshTimer)
  },
})
