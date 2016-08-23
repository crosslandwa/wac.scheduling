'use strict'
const Scheduling = require('../Scheduling.js')()

describe('inTheFuture', () => {
  let when100ms = {toMs: function () { return 100 }}

  it('calls the passed callback at the specified time', (done) => {
    let count = 0
    Scheduling.inTheFuture(() => { count++ }, when100ms)
    expect(count).toEqual(0)
    setTimeout(function () {
      expect(count).toEqual(1)
      done()
    }, 150)
  })

  it('can be cancelled', (done) => {
    let count = 0
    let cancel = Scheduling.inTheFuture(() => { count++ }, when100ms)

    setTimeout(cancel, 50)

    setTimeout(function () {
      expect(count).toEqual(0)
      done()
    }, 150)
  })

  it('allows callbacks to be scheduled and cancelled independently', (done) => {
    let count = 0
    let cancel1 = Scheduling.inTheFuture(() => { count++ }, when100ms)
    Scheduling.inTheFuture(() => { count++ }, { toMs: function () { return 200 } })

    setTimeout(cancel1, 50)

    setTimeout(function () {
      expect(count).toEqual(1)
      done()
    }, 250)
  })

  it('accepts a when time specified in ms', (done) => {
    let count = 0
    Scheduling.inTheFuture(() => { count++ }, 100)
    expect(count).toEqual(0)
    setTimeout(function () {
      expect(count).toEqual(1)
      done()
    }, 150)
  })
})
