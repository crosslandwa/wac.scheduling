'use strict'

const EventEmitter = require('events')
const util = require('util')

function noAction () {}

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

module.exports = Tap
