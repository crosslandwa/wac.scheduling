'use strict'

const EventEmitter = require('events')
const util = require('util')
const createInterval = require('./CreateInterval.js')

function noAction () {}

function Repeater (atATime, nowMs, initialInterval) {
  EventEmitter.call(this)

  let _lastScheduledTimeMs
  let _callback = noAction
  let _isScheduling = false
  let _interval = createInterval(initialInterval)
  let _cancel = noAction
  let repeater = this

  function nextRepeatTime () {
    return createInterval(_lastScheduledTimeMs + _interval.toMs())
  }

  function recursiveInTheFuture () {
    let nextScheduledTimeMs = nextRepeatTime().toMs()
    return atATime(() => {
      if (_isScheduling) {
        _callback()
        _lastScheduledTimeMs = nextScheduledTimeMs
        _cancel = recursiveInTheFuture()
      }
    }, nextScheduledTimeMs)
  }

  this.updateInterval = function (newInterval) {
    _interval = createInterval(newInterval)
    if (_isScheduling) {
      _cancel()
      _cancel = recursiveInTheFuture()
    }
    repeater.reportInterval()
    return repeater
  }

  this.start = function (passedCallback) {
    if (_isScheduling) return
    _lastScheduledTimeMs = nowMs()
    _isScheduling = true
    _callback = passedCallback
    _callback()
    repeater.emit('started', {
      previousRepeatTime: { toMs: () => _lastScheduledTimeMs },
      nextRepeatTime: { toMs: () => nextRepeatTime().toMs() }
    })
    _cancel = recursiveInTheFuture()
  }

  this.stop = function () {
    _cancel()
    _cancel = noAction
    _callback = noAction
    _isScheduling = false
    repeater.emit('stopped')
  }

  this.reportInterval = function () {
    repeater.emit('interval', { toMs: _interval.toMs })
  }
}
util.inherits(Repeater, EventEmitter)

module.exports = Repeater
