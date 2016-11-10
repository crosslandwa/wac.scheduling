'use strict'

const EventEmitter = require('events')
const util = require('util')

const defaultTo120 = (amount) => amount || 120
const rounded2dp = (amount) => Math.round(amount * 100) / 100
const clippedBetween20And300 = (x) => Math.min(Math.max(x, 20), 300)
const sanitize = (x) => rounded2dp(clippedBetween20And300(defaultTo120(x)))

const bpmToBeatLengthMs = (bpm) => (60 / bpm) * 1000
const beatLengthMsToBpm = bpmToBeatLengthMs

const toMs = (candidate) => (candidate && (typeof candidate.toMs === 'function')) ? candidate.toMs() : candidate

function BPM (initial) {
  EventEmitter.call(this)
  let bpm = this
  let current = (initial && (typeof initial.current === 'function')) ? initial.current() : sanitize(initial)

  function updateAndReport (newBpm) {
    current = sanitize(newBpm)
    bpm.report()
  }

  this.current = () => current
  this.report = () => bpm.emit('changed', bpm)
  this.changeBy = (amount) => updateAndReport(current + amount)
  this.changeTo = (amount) => updateAndReport(new BPM(amount).current())
  this.beatLength = () => {
    return { toMs: () => { return bpmToBeatLengthMs(current) } }
  }
}
util.inherits(BPM, EventEmitter)

BPM.forBeatLength = (beatLength) => new BPM(beatLengthMsToBpm(toMs(beatLength)))

module.exports = BPM
