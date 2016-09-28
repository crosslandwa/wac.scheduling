'use strict'

const EventEmitter = require('events')
const util = require('util')
const createInterval = require('./CreateInterval.js')

function noAction () {}

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

module.exports = Repeater
