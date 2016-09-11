'use strict'

const EventEmitter = require('events')
const util = require('util')

function Metronome (Repeater, initialNumberOfBeats, initialBPM) {
  EventEmitter.call(this)
  let metronome = this
  let numberOfBeats = initialNumberOfBeats
  let repeater = Repeater(bpmToMs(initialBPM))
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
    if ((newBPM >= 20) && (newBPM <= 300)) {
      repeater.updateInterval(bpmToMs(newBPM))
    }
  }
}
util.inherits(Metronome, EventEmitter)

function bpmToMs (bpm) {
  return 60 / bpm * 1000
}

module.exports = Metronome
