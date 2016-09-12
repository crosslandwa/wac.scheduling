'use strict'

const EventEmitter = require('events')
const util = require('util')
const Sequence = require('./src/Sequence.js')
const Metronome = require('./src/Metronome.js')

function Repeater (atATime, nowMs, initialInterval) {
  EventEmitter.call(this)

  let lastScheduledTimeMs

  let recursiveInTheFuture = function (callback) {
    let nextScheduledTimeMs = lastScheduledTimeMs + _interval.toMs()
    return atATime(() => {
      if (_isScheduling) {
        callback()
        lastScheduledTimeMs = nextScheduledTimeMs
        _cancel = recursiveInTheFuture(callback)
      }
    }, nextScheduledTimeMs)
  }

  let _isScheduling = false
  let _interval = createInterval(initialInterval)
  let _cancel = noAction
  let repeater = this

  this.updateInterval = function (newInterval) {
    _interval = createInterval(newInterval)
    repeater.reportInterval()
    return repeater
  }

  this.start = function (callback) {
    if (_isScheduling) return
    _isScheduling = true
    callback()
    lastScheduledTimeMs = nowMs()
    _cancel = recursiveInTheFuture(callback)
  }

  this.stop = function () {
    _isScheduling = false
    _cancel()
    _cancel = noAction
  }

  this.reportInterval = function () {
    repeater.emit('interval', _interval)
  }
}
util.inherits(Repeater, EventEmitter)

function Tap (nowMs, inTheFuture) {
  EventEmitter.call(this)
  let firstTapped
  let lastTapped
  let count = -1
  let tap = this
  let cancel = noAction

  function reset () {
    count = -1
    lastTapped = undefined
  }

  this.again = function () {
    cancel()
    cancel = noAction
    count++
    if (count === 0) {
      firstTapped = nowMs()
    } else {
      lastTapped = nowMs()
    }
    if (lastTapped) {
      tap.emit('average', {
        toMs: function () { return (lastTapped - firstTapped) / count }
      })
    }

    let cancelTime = lastTapped ? 2.5 * ((lastTapped - firstTapped) / count) : 2000
    cancel = inTheFuture(reset, cancelTime)
  }
}
util.inherits(Tap, EventEmitter)

function Scheduling (context) {
  let scheduling = this

  let inTheFutureTight = function (callback, when) {
    let source = context.createBufferSource()
    let now = context.currentTime
    let thousandth = context.sampleRate / 1000
    let scheduledAt = now + (createInterval(when).toMs() / 1000) - 0.001
    // a buffer length of 1 sample doesn't work on IOS, so use 1/1000th of a second
    let buffer = context.createBuffer(1, thousandth, context.sampleRate)
    source.addEventListener('ended', callback)
    source.buffer = buffer
    source.connect(context.destination)
    source.start(scheduledAt)

    return function cancel () {
      source.removeEventListener('ended', callback)
      source.stop()
    }
  }

  let atATimeTight = function (callback, when) {
    let source = context.createBufferSource()
    let thousandth = context.sampleRate / 1000
    let scheduledAt = (createInterval(when).toMs() / 1000) - 0.001

    // a buffer length of 1 sample doesn't work on IOS, so use 1/1000th of a second
    let buffer = context.createBuffer(1, thousandth, context.sampleRate)
    source.addEventListener('ended', callback)
    source.buffer = buffer
    source.connect(context.destination)
    source.start(scheduledAt)

    return function cancel () {
      source.removeEventListener('ended', callback)
      source.stop()
    }
  }

  let nowMsFromContext = function () {
    return context.currentTime * 1000
  }

  this.inTheFuture = context ? inTheFutureTight : inTheFutureLoose

  this.atATime = context ? atATimeTight : atATimeLoose

  this.nowMs = context ? nowMsFromContext : nowMsFromSystem

  this.Repeater = function (initialInterval) {
    return new Repeater(scheduling.atATime, scheduling.nowMs, initialInterval)
  }

  this.Sequence = function () {
    return new Sequence(scheduling.atATime, scheduling.nowMs)
  }

  this.Metronome = function (numberOfBeats, bpm) {
    numberOfBeats = (numberOfBeats > 0) && (numberOfBeats <= 16) ? numberOfBeats : 4
    bpm = (bpm >= 20) && (bpm <= 300) ? bpm : 120
    return new Metronome(scheduling.Repeater, context, numberOfBeats, bpm)
  }

  this.Tap = function () { return new Tap(scheduling.nowMs, scheduling.inTheFuture) }
}

function inTheFutureLoose (callback, when) {
  let timer = setTimeout(callback, createInterval(when).toMs())
  return function cancel () { clearTimeout(timer) }
}

function atATimeLoose (callback, when) {
  let timer = setTimeout(callback, createInterval(when).toMs() - nowMsFromSystem())
  return function cancel () { clearTimeout(timer) }
}

function nowMsFromSystem () {
  return new Date().getTime()
}

function noAction () {}

function createInterval (candidate) {
  return (candidate && (typeof candidate.toMs === 'function')) ? candidate : { toMs: function () { return candidate } }
}

module.exports = function (context) { return new Scheduling(context) }
