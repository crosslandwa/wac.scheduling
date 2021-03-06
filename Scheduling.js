'use strict'

const BPM = require('./src/BPM.js')
const createInterval = require('./src/CreateInterval.js')
const Metronome = require('./src/Metronome.js')
const Repeater = require('./src/Repeater.js')
const Sequence = require('./src/Sequence.js')
const Tap = require('./src/TapTempo.js')

function Scheduling (context) {
  let scheduling = this

  function inTheFutureTight (callback, when) {
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

  function atATimeTight (callback, when) {
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

  function nowMsFromContext () {
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
    bpm = (bpm instanceof BPM) ? bpm : new BPM(bpm)
    return new Metronome(scheduling.Repeater, numberOfBeats, bpm)
  }

  this.Tap = function () { return new Tap(scheduling.nowMs, scheduling.inTheFuture) }

  this.BPM = function (initial) { return new BPM(initial) }
  this.BPMForBeatLength = function (beatLength) { return BPM.forBeatLength(beatLength) }
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

module.exports = function (context) { return new Scheduling(context) }
