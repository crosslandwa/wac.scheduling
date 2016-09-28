'use strict'
const Scheduling = require('../Scheduling.js')()

describe('Tap', () => {
  it('tells the average time between taps', (done) => {
    let startTime = Scheduling.nowMs()
    let events = []
    let tap = Scheduling.Tap()
    tap.on('average', (result) => {
      events.push([result, Scheduling.nowMs() - startTime])
    })

    tap.again()
    setTimeout(tap.again, 250)
    setTimeout(tap.again, 450)

    setTimeout(() => {
      expect(events.length).toEqual(2)
      expectAverageAtTime(events[0], 250, 250)
      expectAverageAtTime(events[1], 225, 450)
      done()
    }, 475)
  })

  it('resets itself after some time and can be tapped again', (done) => {
    let startTime = Scheduling.nowMs()
    let events = []
    let tap = Scheduling.Tap()
    tap.on('average', (result) => {
      events.push([result, Scheduling.nowMs() - startTime])
    })

    tap.again()
    setTimeout(tap.again, 250)
    setTimeout(tap.again, 800)
    setTimeout(tap.again, 1050)
    setTimeout(tap.again, 1250)

    setTimeout(() => {
      expect(events.length).toEqual(3)
      expectAverageAtTime(events[0], 250, 250)
      expectAverageAtTime(events[1], 250, 1050)
      expectAverageAtTime(events[2], 225, 1250)
      done()
    }, 1275)
  })
})

function expectAverageAtTime (event, expectedAverage, expectedAt) {
  if (typeof event === 'undefined') return fail('expected an event but was undefined')
  let tolerance = 10
  let actualAverage = event[0].beatLength().toMs()
  let actualAt = event[1]

  if (isNaN(actualAverage) || (actualAverage < (expectedAverage - tolerance)) || (actualAverage > (expectedAverage + tolerance))) {
    expect(actualAverage).toEqual(expectedAverage)
  }
  if ((actualAt < (expectedAt - tolerance)) || (actualAt > (expectedAt + tolerance))) {
    expect(actualAt).toEqual(expectedAt)
  }
}
