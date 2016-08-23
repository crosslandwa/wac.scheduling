'use strict'
const Scheduling = require('../Scheduling.js')()

describe('atATime', () => {
  let when100ms

  beforeEach(() => {
    let now = Scheduling.nowMs()
    when100ms = {toMs: function () { return 100 + now }}
  })

  it('calls the passed callback at the specified absolute time', (done) => {
    let count = 0
    Scheduling.atATime(() => { count++ }, when100ms)
    expect(count).toEqual(0)
    setTimeout(function () {
      expect(count).toEqual(1)
      done()
    }, 150)
  })

  it('calls the passed callback at an absolute time specified as an integer', (done) => {
    let count = 0
    let now = Scheduling.nowMs()
    Scheduling.atATime(() => { count++ }, 100 + now)
    expect(count).toEqual(0)
    setTimeout(function () {
      expect(count).toEqual(1)
      done()
    }, 150)
  })

  it('can be cancelled', (done) => {
    let count = 0
    let cancel = Scheduling.atATime(() => { count++ }, when100ms)

    setTimeout(cancel, 50)

    setTimeout(function () {
      expect(count).toEqual(0)
      done()
    }, 150)
  })

  it('allows callbacks to be scheduled and cancelled independently', (done) => {
    let count = 0
    let cancel1 = Scheduling.atATime(() => { count++ }, when100ms)
    Scheduling.atATime(() => { count++ }, { toMs: function () { return 200 } })

    setTimeout(cancel1, 50)

    setTimeout(function () {
      expect(count).toEqual(1)
      done()
    }, 250)
  })

  it('schedules callbacks that are specified as in the past now', (done) => {
    let count = 0
    Scheduling.atATime(() => { count++ }, 200) // 'now' would be the current number of ms since 01/01/1970
    expect(count).toEqual(0)
    setTimeout(function () {
      expect(count).toEqual(1)
      done()
    }, 50)
  })
})
