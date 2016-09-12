'use strict'
const Scheduling = require('../Scheduling.js')()

describe('Tap', () => {
  it('tells the average time between taps', (done) => {
    let startTime = Scheduling.nowMs()
    let events = []
    let tap = Scheduling.Tap()
    tap.on('average', (result) => {
      events.push([result.toMs(), Scheduling.nowMs() - startTime])
    })

    tap.again()
    setTimeout(tap.again, 100)
    setTimeout(tap.again, 250)

    setTimeout(() => {
      expect(events.length).toEqual(2)
      expectAverageAtTime(events[0], 100, 100)
      expectAverageAtTime(events[1], 125, 250)
      done()
    }, 250)
  })

  it('resets itself after some time and can be tapped again', (done) => {
    let startTime = Scheduling.nowMs()
    let events = []
    let tap = Scheduling.Tap()
    tap.on('average', (result) => {
      events.push([result.toMs(), Scheduling.nowMs() - startTime])
    })

    tap.again()
    setTimeout(tap.again, 100)
    setTimeout(tap.again, 500)
    setTimeout(tap.again, 650)
    setTimeout(tap.again, 800)

    setTimeout(() => {
      expect(events.length).toEqual(3)
      expectAverageAtTime(events[0], 100, 100)
      expectAverageAtTime(events[1], 150, 650)
      expectAverageAtTime(events[2], 150, 800)
      done()
    }, 850)
  })
})

function expectAverageAtTime (event, expectedAverage, expectedAt) {
  if (typeof event === 'undefined') return fail('expected an event but was undefined')
  let tolerance = 10
  let actualAverage = event[0]
  let actualAt = event[1]

  if (isNaN(actualAverage) || (actualAverage < (expectedAverage - tolerance)) || (actualAverage > (expectedAverage + tolerance))) {
    expect(actualAverage).toEqual(expectedAverage)
  }
  if ((actualAt < (expectedAt - tolerance)) || (actualAt > (expectedAt + tolerance))) {
    expect(actualAt).toEqual(expectedAt)
  }
}
