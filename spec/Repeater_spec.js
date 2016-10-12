'use strict'
const Scheduling = require('../Scheduling.js')()

describe('Repeater', () => {
  let when100ms = {toMs: function () { return 100 }}

  it('calls the passed callback immediately and then repeatedly at initial interval', (done) => {
    let count = 0
    let repeater = Scheduling.Repeater(when100ms)
    repeater.start(() => { count++ })

    setTimeout(function () {
      expect(count).toEqual(5) // calls at 0, 100, 200, 300, 400
      done()
    }, 450)
  })

  it('calls the passed callback at an interval that can be changed', (done) => {
    let count = 0
    let repeater = Scheduling.Repeater(when100ms)
    repeater.start(() => { count++ })

    setTimeout(function () {
      repeater.updateInterval({ toMs: function () { return 200 } })
    }, 150)

    setTimeout(function () {
      expect(count).toEqual(3) // calls at 0, 100, 300, 500
      done()
    }, 450)
  })

  it('calls passed callback until told to stop', (done) => {
    let count = 0
    let repeater = Scheduling.Repeater(when100ms)
    repeater.start(() => { count++ })

    setTimeout(repeater.stop, 150)

    setTimeout(function () {
      expect(count).toEqual(2) // calls at 0, 100
      done()
    }, 250)
  })

  it('cancels previous callbacks when stopped (even if a new callback is started quickly', (done) => {
    let count = 0
    let repeater = Scheduling.Repeater(when100ms)
    let incrementer = function () { count++ }
    repeater.start(incrementer)

    setTimeout(repeater.stop, 140)
    setTimeout(() => repeater.start(incrementer), 180) // restart before previous callback would be called again (at 200)

    setTimeout(function () {
      expect(count).toEqual(4) // calls at 0, 100, 180, 280
      done()
    }, 295)
  })

  it('reports current interval on request', () => {
    let reportedInterval = 0
    let repeater = Scheduling.Repeater(when100ms)
    repeater.on('interval', (interval) => { reportedInterval = interval })
    repeater.reportInterval()
    expect(reportedInterval.toMs()).toEqual(100)
  })

  it('reports new interval on change', () => {
    let reportedInterval = 0
    let repeater = Scheduling.Repeater(when100ms)
    repeater.on('interval', (interval) => { reportedInterval = interval })
    repeater.updateInterval({ toMs: function () { return 200 } })
    expect(reportedInterval.toMs()).toEqual(200)
  })

  it('reports the time of the next repeat when repeating', () => {
    let startTime = Scheduling.nowMs()
    let reportedInterval = 0
    let repeater = Scheduling.Repeater(when100ms)
    repeater.on('interval', (interval) => { reportedInterval = interval })
    repeater.updateInterval({ toMs: function () { return 200 } })
    expect(reportedInterval.nextRepeatTime).toBeUndefined()

    repeater.start(() => {})
    expect(reportedInterval.nextRepeatTime.toMs()).not.toBeLessThan(startTime + 200)

    repeater.stop()
    expect(reportedInterval.nextRepeatTime).toBeUndefined()
  })
})
