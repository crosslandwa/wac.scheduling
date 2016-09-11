'use strict'
const Scheduling = require('../Scheduling.js')()

function expectEventAtTime (event, expectedName, expectedTime) {
  if (typeof event === 'undefined') return fail('expected an event but was undefined')
  let timingTolerance = 15
  expect(event[0]).toEqual(expectedName)

  let actualTime = event[1]

  if ((actualTime >= (expectedTime - 1)) && (actualTime < expectedTime + timingTolerance)) {
    expect(actualTime).toBeLessThan(expectedTime + timingTolerance)
  } else {
    expect(`${actualTime}ms`).toEqual(`${expectedTime}ms`) // this will always fail, but gives a helpful error message
  }
}

describe('Metronome', () => {
  let metronome
  let clockStartTime

  function capture (events, eventName) {
    metronome.on(eventName, (data) => events.push([eventName, Scheduling.nowMs() - clockStartTime]))
  }

  beforeEach(() => {
    metronome = Scheduling.Metronome(4, 240) // 4 beats per second
    clockStartTime = Scheduling.nowMs()
  })

  it('emits accent, tick, tick, tick', (done) => {
    let events = []
    capture(events, 'accent')
    capture(events, 'tick')

    metronome.start()
    setTimeout(() => {
      expect(events.length).toEqual(6)
      expectEventAtTime(events[0], 'accent', 0)
      expectEventAtTime(events[1], 'tick', 250)
      expectEventAtTime(events[2], 'tick', 500)
      expectEventAtTime(events[3], 'tick', 750)
      expectEventAtTime(events[4], 'accent', 1000)
      expectEventAtTime(events[5], 'tick', 1250)
      done()
    }, 1300)
  })

  it('can have number of beats changed', (done) => {
    let events = []
    capture(events, 'accent')
    capture(events, 'tick')

    setTimeout(() => metronome.updateNumberOfBeats(6), 900)

    metronome.start()
    setTimeout(() => {
      expect(events.length).toEqual(7)
      expectEventAtTime(events[0], 'accent', 0)
      expectEventAtTime(events[1], 'tick', 250)
      expectEventAtTime(events[2], 'tick', 500)
      expectEventAtTime(events[3], 'tick', 750)
      expectEventAtTime(events[4], 'tick', 1000)
      expectEventAtTime(events[5], 'tick', 1250)
      expectEventAtTime(events[6], 'accent', 1500)
      done()
    }, 1600)
  })
})
