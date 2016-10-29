'use strict'

const EventEmitter = require('events')
const util = require('util')
const { clamp } = require('ramda')

const between1And16 = clamp(1, 16)

function Metronome (Repeater, initialNumberOfBeats, bpm) {
  EventEmitter.call(this)
  let metronome = this
  let numberOfBeats = between1And16(initialNumberOfBeats)
  let repeater = Repeater(bpm.beatLength())
  let count = -1

  function tick () {
    count = ++count % numberOfBeats
    if (count === 0) {
      metronome.emit('accent')
    } else {
      metronome.emit('tick')
    }
  }

  this.start = function () {
    repeater.start(tick)
  }

  this.stop = function () {
    repeater.stop()
    count = -1
  }

  this.updateNumberOfBeats = function (beats) {
    numberOfBeats = (beats === between1And16(beats)) ? beats : numberOfBeats
    reportBeats()
  }

  this.updateBPM = function (newBPM) {
    bpm.changeTo(newBPM)
  }

  this.report = function () {
    reportBPM()
    reportBeats()
  }

  function updateRepeaterInterval (newBPM) {
    repeater.updateInterval(newBPM.beatLength())
    reportBPM()
  }

  function reportBeats () {
    metronome.emit('numberOfBeats', numberOfBeats)
  }

  function reportBPM () {
    metronome.emit('bpmChanged', bpm)
  }

  repeater.on('started', (info) => {
    metronome.emit('started', { previousTick: info.previousRepeatTime, nextTick: info.nextRepeatTime })
  })
  repeater.on('stopped', () => { metronome.emit('stopped') })

  bpm.on('changed', updateRepeaterInterval)
}
util.inherits(Metronome, EventEmitter)

module.exports = Metronome
