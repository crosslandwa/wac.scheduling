'use strict'

const BPM = require('./BPM.js')
const EventEmitter = require('events')
const util = require('util')
const { clamp } = require('ramda')

const between1And16 = clamp(1, 16)
const bpmBeatLength = (bpm) => new BPM(bpm).beatLength()

function Metronome (Repeater, initialNumberOfBeats, initialBPM) {
  EventEmitter.call(this)
  let metronome = this
  let numberOfBeats = between1And16(initialNumberOfBeats)
  let repeater = Repeater(bpmBeatLength(initialBPM))
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
    if ((beats > 0) && (beats <= 16)) {
      numberOfBeats = beats
    }
  }

  this.updateBPM = function (newBPM) {
    repeater.updateInterval(bpmBeatLength(newBPM))
  }

  repeater.on('started', (info) => {
    metronome.emit('running', { previousTick: info.previousRepeatTime, nextTick: info.nextRepeatTime })
  })
  repeater.on('stopped', () => { metronome.emit('stopped') })
}
util.inherits(Metronome, EventEmitter)

module.exports = Metronome
