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
    metronome.on(eventName, (data) => events.push([eventName, Scheduling.nowMs() - clockStartTime, data]))
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

    metronome.start()
    setTimeout(() => metronome.updateNumberOfBeats(6), 900)

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

  it('can have bpm changed', (done) => {
    let events = []
    capture(events, 'accent')
    capture(events, 'tick')

    metronome.start()
    setTimeout(() => metronome.updateBPM(120), 275)

    setTimeout(() => {
      expect(events.length).toEqual(4)
      expectEventAtTime(events[0], 'accent', 0)
      expectEventAtTime(events[1], 'tick', 250)
      expectEventAtTime(events[2], 'tick', 750) // expect BPM change to re-time next tick
      expectEventAtTime(events[3], 'tick', 1250)
      done()
    }, 1300)
  })

  it('is slaved to passed in BPM (object)', (done) => {
    let bpm = Scheduling.BPM(240)
    metronome = Scheduling.Metronome(4, bpm)

    let events = []
    capture(events, 'accent')
    capture(events, 'tick')

    metronome.start()
    setTimeout(() => bpm.changeTo(120), 275)

    setTimeout(() => {
      expect(events.length).toEqual(4)
      expectEventAtTime(events[0], 'accent', 0)
      expectEventAtTime(events[1], 'tick', 250)
      expectEventAtTime(events[2], 'tick', 750) // expect BPM change to re-time next tick
      expectEventAtTime(events[3], 'tick', 1250)
      done()
    }, 1300)
  })

  it('reports when its BPM is changed', () => {
    let events = []
    capture(events, 'bpmChanged')
    metronome.updateBPM(100)
    expect(events.length).toEqual(1)
    let bpm = events[0][2]
    expect(bpm.current()).toEqual(100)
  })

  it('can be stopped and started', (done) => {
    let events = []
    capture(events, 'accent')
    capture(events, 'tick')

    metronome.start()
    setTimeout(() => metronome.stop(), 200)
    setTimeout(() => metronome.start(), 300)

    setTimeout(() => {
      expect(events.length).toEqual(3)
      expectEventAtTime(events[0], 'accent', 0)
      expectEventAtTime(events[1], 'accent', 300)
      expectEventAtTime(events[2], 'tick', 550)
      done()
    }, 600)
  })

  it('emits started and started events, and the previous and next tick times are discoverable', (done) => {
    let events = []
    capture(events, 'stopped')
    capture(events, 'started')

    metronome.start()
    setTimeout(() => metronome.stop(), 325)

    setTimeout(() => {
      expect(events.length).toEqual(1)
      expectEventAtTime(events[0], 'started', 0)
      let previousTickTime = events[0][2].previousTick.toMs() - clockStartTime
      expect(previousTickTime).not.toBeLessThan(0) // 4 beats per second
      expect(previousTickTime).toBeLessThan(250)
      let nextTickTime = events[0][2].nextTick.toMs() - clockStartTime
      expect(nextTickTime).not.toBeLessThan(250) // 4 beats per second
      expect(nextTickTime).toBeLessThan(500)
    }, 100)

    setTimeout(() => {
      expect(events.length).toEqual(1)
      let previousTickTime = events[0][2].previousTick.toMs() - clockStartTime
      expect(previousTickTime).not.toBeLessThan(250) // 4 beats per second
      expect(previousTickTime).toBeLessThan(500)
      let nextTickTime = events[0][2].nextTick.toMs() - clockStartTime
      expect(nextTickTime).not.toBeLessThan(500) // 4 beats per second
      expect(nextTickTime).toBeLessThan(750)
    }, 300)

    setTimeout(() => {
      expect(events.length).toEqual(2)
      expectEventAtTime(events[1], 'stopped', 325)
      done()
    }, 350)
  })
})
