'use strict'

const BPM = require('./BPM.js')
const EventEmitter = require('events')
const util = require('util')
const { clamp } = require('ramda')

const between1And16 = clamp(1, 16)

const forceToBPMObject = (bpm) => (bpm.beatLength === 'function') ? bpm : new BPM(bpm)

function Metronome (Repeater, context, initialNumberOfBeats, initialBPM) {
  EventEmitter.call(this)
  initialBPM = forceToBPMObject(initialBPM)
  let metronome = this
  let numberOfBeats = between1And16(initialNumberOfBeats)
  let repeater = Repeater(initialBPM.beatLength().toMs())
  let count = -1
  let gain

  function click (f) {
    gain.gain.value = 0.25 // -6dB

    let osc = context.createOscillator()
    osc.frequency.value = f
    osc.frequency.exponentialRampToValueAtTime(10, 0.005)
    osc.start()
    osc.stop(context.currentTime + 0.005)
    osc.connect(gain)
    gain.gain.linearRampToValueAtTime(0, 0.0005)
  }

  function makeAccentClick () {
    click(1200)
  }

  function makeTickClick () {
    click(900)
  }

  if (context) {
    gain = context.createGain()
    gain.connect(context.destination)
    metronome.on('accent', makeAccentClick)
    metronome.on('tick', makeTickClick)
  }

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
    repeater.updateInterval(forceToBPMObject(newBPM).beatLength().toMs())
  }

  this.suppressClick = function () {
    metronome.removeListener('accent', makeAccentClick)
    metronome.removeListener('tick', makeTickClick)
    return metronome
  }
}
util.inherits(Metronome, EventEmitter)

module.exports = Metronome
