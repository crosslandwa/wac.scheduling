'use strict'

const EventEmitter = require('events')
const util = require('util')
const createInterval = require('./CreateInterval.js')

function noAction () {}

function Sequence (atATime, nowMs) {
  EventEmitter.call(this)
  let sequence = this
  let running = false
  let absoluteStartTime
  let restartEvent = {when: undefined, action: 'restart', cancel: noAction}
  let stopEvent = { when: 0, action: 'stop', cancel: noAction }

  let scheduleAllEvents = function (startTimeMs) {
    stopEvent.when = 0
    events.filter(occursBetween.bind(null, startTimeMs, restartEvent.when)).forEach((event) => {
      stopEvent.when = event.when > stopEvent.when ? event.when : stopEvent.when
      schedule(event)
    })
    stopEvent.when += 10 // this ensures the stop event occurs AFTER the last event
    schedule(restartEvent.when ? restartEvent : stopEvent)
  }

  function restart () {
    absoluteStartTime += restartEvent.when
    sequence.emit('loop')
    scheduleAllEvents(0)
  }

  let cancelAllEvents = function () {
    events.forEach(cancel)
    cancel(restartEvent)
    cancel(stopEvent)
  }

  let schedule = function (event) {
    event.cancel = atATime(() => {
      switch (event.action) {
        case 'restart':
          restart()
          break
        case 'stop':
          sequence.stop()
          break
        default:
          sequence.emit(event.name, event.data)
          break
      }
    }, absoluteStartTime + event.when)
  }

  let currentPositionData = function () {
    let rightNow = nowMs()
    return {
      nowMs: rightNow,
      currentMs: absoluteStartTime > 0 ? rightNow - absoluteStartTime : 0
    }
  }

  let events = []

  this.startAt = function (timeMs, offsetMs) {
    timeMs = createInterval(timeMs).toMs()
    offsetMs = offsetMs > 0 ? offsetMs : 0
    timeMs = timeMs > 0 ? timeMs : 0
    timeMs = timeMs < nowMs() ? nowMs() : timeMs
    if (restartEvent.when) offsetMs = offsetMs % restartEvent.when
    absoluteStartTime = timeMs - offsetMs
    if (running) {
      cancelAllEvents()
    }
    running = true
    scheduleAllEvents(offsetMs)
    return sequence
  }

  this.start = function (offsetMs) {
    sequence.startAt(nowMs(), offsetMs)
  }

  this.stop = function () {
    let wasRunning = running
    running = false
    if (wasRunning) {
      cancelAllEvents()
      sequence.emit('stopped')
    }
  }

  this.loop = function (endTimeMs) {
    let end = endTimeMs > 0 ? endTimeMs : undefined
    if (end) {
      restartEvent.when = end
      if (running) {
        let offsetMs = sequence.currentPositionMs() % end
        sequence.start(offsetMs)
      }
    }
    return sequence
  }

  this.addEventAt = function (when, name, data) {
    events.push({when: when, name: name, data: data, cancel: noAction})
  }

  this.addEventNow = function (name, data) {
    let positionInfo = currentPositionData()
    if (absoluteStartTime === undefined) {
      absoluteStartTime = positionInfo.nowMs
    }
    events.push({when: positionInfo.currentMs, name: name, data: data, cancel: noAction})
  }

  this.currentPositionMs = function () {
    return currentPositionData().currentMs
  }

  this.loopLengthMs = function () {
    return restartEvent.when
  }

  this.reset = function () {
    sequence.stop()
    events = []
    absoluteStartTime = undefined
    restartEvent.when = undefined
    stopEvent.when = 0
    sequence.emit('reset')
    return sequence
  }

  this.scale = function (scaleFactor = 1) {
    if (scaleFactor < 0 || scaleFactor === 1) return sequence

    if (running) {
      cancelAllEvents()
    }

    events.forEach(function (event) { event.when *= scaleFactor })
    if (restartEvent.when) restartEvent.when *= scaleFactor

    if (running) {
      let positionInfo = currentPositionData()
      let offsetMs = positionInfo.currentMs * scaleFactor
      absoluteStartTime = positionInfo.nowMs - offsetMs
      scheduleAllEvents(offsetMs)
    }
    return sequence
  }

  // Removed from README for now as internal JSON representation may change - USE AT OWN RISK!
  // sequence.load(json); // stops the sequence (if running) and loads new events/loops specified in JSON
  this.load = function (json) {
    sequence.stop()

    events = json.events.map((event) => {
      let newEvent = mapEventForJSONification(event)
      newEvent.cancel = noAction
      return newEvent
    })

    restartEvent.when = json.loop.lengthMs > 0 ? json.loop.lengthMs : undefined
    restartEvent.cancel = noAction

    return sequence
  }

  // Removed from README for now as internal JSON representation may change - USE AT OWN RISK!
  // sequence.toJSON(); // returns a JSON representation of the sequence (that can be JSON stringified for storage)
  this.toJSON = function () {
    return {
      loop: { lengthMs: restartEvent.when },
      events: events.map(mapEventForJSONification)
    }
  }
}
util.inherits(Sequence, EventEmitter)

function mapEventForJSONification (event) {
  return {when: event.when, name: event.name, data: event.data}
}

function isAfter (timeMs, event) {
  return event.when >= timeMs
}

function isBefore (event, endMs) {
  return (typeof endMs === 'undefined') ? true : event.when < endMs
}

function occursBetween (startMs, endMs, event) {
  return isAfter(startMs, event) && isBefore(event, endMs)
}

function cancel (event) {
  event.cancel()
  event.cancel = noAction
}

module.exports = Sequence
