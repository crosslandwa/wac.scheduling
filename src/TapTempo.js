'use strict'

const BPM = require('./BPM.js')
const EventEmitter = require('events')
const util = require('util')

function noAction () {}

function Tap (nowMs, inTheFuture) {
  EventEmitter.call(this)
  let tap = this
  let cancel = noAction
  let queue = []

  function reset () {
    queue = []
  }

  this.again = function () {
    cancel()
    cancel = noAction
    queue.push(nowMs())
    if (queue.length > 4) queue.shift()

    if (queue.length > 1) {
      var averageTime = (queue[queue.length - 1] - queue[0]) / (queue.length - 1)
      tap.emit('average', BPM.forBeatLength(averageTime))
      cancel = inTheFuture(reset, averageTime * 1.25)
    } else {
      cancel = inTheFuture(reset, 1500) // 1 beat at 30bpm!
    }
  }
}
util.inherits(Tap, EventEmitter)

module.exports = Tap
