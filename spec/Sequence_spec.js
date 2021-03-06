'use strict'
const Scheduling = require('../Scheduling.js')()

function expectEventAtTime (event, expectedName, expectedTime, expectedData) {
  if (typeof event === 'undefined') return fail('expected an event but was undefined')
  let timingTolerance = 15
  expect(event[0]).toEqual(expectedName)
  if (expectedData) {
    expect(event[1]).toEqual(expectedData)
  }

  let actualTime = event[2]

  if ((actualTime >= (expectedTime - 1)) && (actualTime < expectedTime + timingTolerance)) {
    expect(actualTime).toBeLessThan(expectedTime + timingTolerance)
  } else {
    expect(`${actualTime}ms`).toEqual(`${expectedTime}ms`) // this will always fail, but gives a helpful error message
  }
}

describe('Sequence', () => {
  let sequence
  let clockStartTime

  let capture = function (events, eventName) {
    sequence.on(eventName, (data) => events.push([eventName, data, Scheduling.nowMs() - clockStartTime]))
  }

  describe('unlooped', () => {
    beforeEach(() => {
      sequence = Scheduling.Sequence()
      clockStartTime = Scheduling.nowMs()
    })

    it('fires scheduled events', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.start()
      setTimeout(() => {
        expect(events.length).toEqual(2)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 100, 'hello2')
        done()
      }, 200)
    })

    it('can be run multiple times', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.start()

      setTimeout(sequence.start, 100)

      setTimeout(() => {
        expect(events.length).toEqual(2)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 150, 'hello1')
        done()
      }, 200)
    })

    it('can be restarted whilst running', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(150, 'capture', 'hello2')
      sequence.start()

      setTimeout(sequence.start, 75)

      setTimeout(() => {
        expect(events.length).toEqual(2)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 125, 'hello1')
        done()
      }, 150)
    })

    it('emits a stopped event when all scheduled events fired', (done) => {
      let events = []
      capture(events, 'capture')
      capture(events, 'stopped')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.start()
      setTimeout(() => {
        expect(events.length).toEqual(2)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'stopped', 60)
        done()
      }, 100)
    })

    it('can be started with some arbitrary offset, specified in ms', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.start(75)

      setTimeout(() => {
        expect(events.length).toEqual(1)
        expectEventAtTime(events[0], 'capture', 25, 'hello2')
        done()
      }, 50)
    })

    it('can be scheduled to start at some point in time (in the future), specified in ms', (done) => {
      let events = []
      capture(events, 'capture')
      capture(events, 'stopped')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.startAt(clockStartTime + 25)

      setTimeout(() => {
        expect(events.length).toEqual(3)
        expectEventAtTime(events[0], 'capture', 75, 'hello1')
        expectEventAtTime(events[1], 'capture', 125, 'hello2')
        expectEventAtTime(events[2], 'stopped', 135) // 10ms after last event
        done()
      }, 150)
    })

    it('stops immediately when started after the last event', (done) => {
      let events = []
      capture(events, 'capture')
      capture(events, 'stopped')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.start(75)

      setTimeout(() => {
        expect(events.length).toEqual(1)
        expectEventAtTime(events[0], 'stopped', 0)
        done()
      }, 20)
    })

    it('can be scaled to shorten/expand when events are fired', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(40, 'capture', 'hello1')
      sequence.addEventAt(80, 'capture', 'hello2')
      sequence.scale(0.5).start()
      setTimeout(() => {
        expect(events.length).toEqual(2)
        expectEventAtTime(events[0], 'capture', 20, 'hello1')
        expectEventAtTime(events[1], 'capture', 40, 'hello2')
        done()
      }, 60)
    })

    it('can be scaled while running to shorten/expand when events are fired', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(100, 'capture', 'hello1')
      sequence.addEventAt(180, 'capture', 'hello2')
      sequence.addEventAt(200, 'capture', 'hello3')
      sequence.start()

      setTimeout(() => { sequence.scale(0.5) }, 120)

      setTimeout(() => {
        expect(events.length).toEqual(3)
        expectEventAtTime(events[0], 'capture', 100, 'hello1')
        expectEventAtTime(events[1], 'capture', 150, 'hello2')
        expectEventAtTime(events[2], 'capture', 160, 'hello3')
        done()
      }, 180)
    })

    it('can be serialized to and loaded from JSON', (done) => {
      let events = []
      capture(events, 'capture')
      capture(events, 'stopped')

      let sequence2 = Scheduling.Sequence()

      sequence2.addEventAt(50, 'capture', 'hello1')
      sequence2.addEventAt(100, 'capture', 'hello2')

      sequence.load(sequence2.toJSON())
      sequence.start()

      setTimeout(() => {
        expect(events.length).toEqual(3)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 100, 'hello2')
        expectEventAtTime(events[2], 'stopped', 100)
        done()
      }, 125)
    })

    it('is automatically stopped when loaded from JSON', (done) => {
      let events = []
      capture(events, 'capture')
      capture(events, 'stopped')

      let sequence2 = Scheduling.Sequence()

      sequence2.addEventAt(50, 'capture', 'hello1')

      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.start()

      sequence.load(sequence2.toJSON())
      setTimeout(sequence.start, 50)

      setTimeout(() => {
        expect(events.length).toEqual(3)
        expectEventAtTime(events[0], 'stopped', 0)
        expectEventAtTime(events[1], 'capture', 100, 'hello1')
        expectEventAtTime(events[2], 'stopped', 110) // expect stop to occur ~10ms after last event (for unlooped sequence)
        done()
      }, 125)
    })
  })

  describe("that hasn't been started", () => {
    beforeEach(() => {
      sequence = Scheduling.Sequence()
      clockStartTime = Scheduling.nowMs()
    })

    it('accepts events, and takes the first event as the sequence start', (done) => {
      let events = []
      capture(events, 'capture')
      capture(events, 'stopped')

      setTimeout(() => sequence.addEventNow('capture', 'hello1'), 25)
      setTimeout(() => sequence.addEventNow('capture', 'hello2'), 50)
      setTimeout(sequence.start, 75)

      setTimeout(() => {
        expect(events.length).toEqual(3)
        expectEventAtTime(events[0], 'capture', 75, 'hello1')
        expectEventAtTime(events[1], 'capture', 100, 'hello2')
        expectEventAtTime(events[2], 'stopped', 110)
        done()
      }, 150)
    })
  })

  describe('looped', () => {
    beforeEach(() => {
      sequence = Scheduling.Sequence()
      clockStartTime = Scheduling.nowMs()
    })

    it('can repeatedly fire scheduled events', (done) => {
      let events = []
      capture(events, 'capture')
      capture(events, 'loop')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.loop(150)
      sequence.start()

      setTimeout(() => {
        expect(events.length).toEqual(5)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 100, 'hello2')
        expectEventAtTime(events[2], 'loop', 150)
        expectEventAtTime(events[3], 'capture', 200, 'hello1')
        expectEventAtTime(events[4], 'capture', 250, 'hello2')
        done()
      }, 275)
    })

    it('can have events added whilst running', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.loop(150)
      sequence.start()

      setTimeout(() => sequence.addEventNow('capture', 'hello3'), 125)

      setTimeout(() => {
        expect(events.length).toEqual(5)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 100, 'hello2')
        expectEventAtTime(events[2], 'capture', 200, 'hello1')
        expectEventAtTime(events[3], 'capture', 250, 'hello2')
        expectEventAtTime(events[4], 'capture', 275, 'hello3')
        done()
      }, 300)
    })

    it('can be started with some arbitrary offset, specified in ms', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.loop(150).start(75)

      setTimeout(() => {
        expect(events.length).toEqual(2)
        expectEventAtTime(events[0], 'capture', 25, 'hello2')
        expectEventAtTime(events[1], 'capture', 125, 'hello1')
        done()
      }, 150)
    })

    it('starts within the loop when started with an offset that is after the loop end', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.loop(150).start(175)

      expectEventAtTime(['currentPosition', {}, sequence.currentPositionMs()], 'currentPosition', 25)

      setTimeout(() => {
        expect(events.length).toEqual(2)
        expectEventAtTime(events[0], 'capture', 25, 'hello1')
        expectEventAtTime(events[1], 'capture', 75, 'hello2')
        done()
      }, 100)
    })

    it('can be scheduled to start at some point in time (in the future), specified in ms', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.loop(150).startAt({ toMs: () => clockStartTime + 25 })

      setTimeout(() => {
        expect(events.length).toEqual(3)
        expectEventAtTime(events[0], 'capture', 75, 'hello1')
        expectEventAtTime(events[1], 'capture', 125, 'hello2')
        expectEventAtTime(events[2], 'capture', 225, 'hello1')
        done()
      }, 250)
    })

    it('responds to changes in loop length whilst playing', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.addEventAt(150, 'capture', 'hello3')
      sequence.loop(200).start()

      setTimeout(() => sequence.loop(125), 385) // current position should be 185, so expect it to go to 60

      setTimeout(() => {
        expect(events.length).toEqual(8)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 100, 'hello2')
        expectEventAtTime(events[2], 'capture', 150, 'hello3')
        expectEventAtTime(events[3], 'capture', 250, 'hello1')
        expectEventAtTime(events[4], 'capture', 300, 'hello2')
        expectEventAtTime(events[5], 'capture', 350, 'hello3')
        expectEventAtTime(events[6], 'capture', 415, 'hello2') // 375 + (100 - 60)
        expectEventAtTime(events[7], 'capture', 490, 'hello1') // 375 + (125 - 60) + 50
        done()
      }, 510)
    })

    it('fires events until stopped', (done) => {
      let events = []
      capture(events, 'capture')
      capture(events, 'stopped')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.loop(150).start()

      setTimeout(() => {
        sequence.stop()
      }, 225)

      setTimeout(() => {
        expect(events.length).toEqual(4)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 100, 'hello2')
        expectEventAtTime(events[2], 'capture', 200, 'hello1')
        expectEventAtTime(events[3], 'stopped', 225)
        done()
      }, 500) // leave this long enough to ensure no more 'capture' events are fired after the 'stopped' event
    })

    it('does not fire events scheduled beyond the loop end', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(50, 'capture', 'hello1')
      sequence.addEventAt(100, 'capture', 'hello2')
      sequence.addEventAt(150, 'capture', 'hello3')
      sequence.loop(125)
      sequence.start()

      setTimeout(() => {
        expect(events.length).toEqual(4)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 100, 'hello2')
        expectEventAtTime(events[2], 'capture', 175, 'hello1')
        expectEventAtTime(events[3], 'capture', 225, 'hello2')
        done()
      }, 250)
    })

    it('can be scaled to shorten/expand loop length and when events are fired', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(40, 'capture', 'hello1')
      sequence.addEventAt(80, 'capture', 'hello2')
      sequence.loop(100)
      sequence.scale(0.5).start()

      setTimeout(() => {
        expect(events.length).toEqual(4)
        expectEventAtTime(events[0], 'capture', 20, 'hello1')
        expectEventAtTime(events[1], 'capture', 40, 'hello2')
        expectEventAtTime(events[2], 'capture', 70, 'hello1')
        expectEventAtTime(events[3], 'capture', 90, 'hello2')
        done()
      }, 100)
    })

    it('can be scaled while running to shorten/expand when events are fired and the loop length ', (done) => {
      let events = []
      capture(events, 'capture')

      sequence.addEventAt(60, 'capture', 'hello1')
      sequence.addEventAt(180, 'capture', 'hello2')
      sequence.loop(240).start()

      setTimeout(() => { sequence.scale(0.5) }, 120)
      // now expect internal pointer to be halfway through loop, events at 30 and 90

      setTimeout(() => {
        expect(events.length).toEqual(4)
        expectEventAtTime(events[0], 'capture', 60, 'hello1')
        expectEventAtTime(events[1], 'capture', 150, 'hello2')
        expectEventAtTime(events[2], 'capture', 210, 'hello1')
        expectEventAtTime(events[3], 'capture', 270, 'hello2')
        done()
      }, 300)
    })

    it('can be serialized to and loaded from JSON', (done) => {
      let events = []
      capture(events, 'capture')

      let sequence2 = Scheduling.Sequence()

      sequence2.addEventAt(50, 'capture', 'hello1')
      sequence2.addEventAt(100, 'capture', 'hello2')
      sequence2.loop(150)

      sequence.load(sequence2.toJSON())
      sequence.start()

      setTimeout(() => {
        expect(events.length).toEqual(4)
        expectEventAtTime(events[0], 'capture', 50, 'hello1')
        expectEventAtTime(events[1], 'capture', 100, 'hello2')
        expectEventAtTime(events[2], 'capture', 200, 'hello1')
        expectEventAtTime(events[3], 'capture', 250, 'hello2')
        done()
      }, 300)
    })

    it('can be reset so all event and loop length info is cleared', (done) => {
      let events = []
      capture(events, 'capture')
      capture(events, 'reset')

      sequence.addEventAt(25, 'capture', 'hello1')
      sequence.loop(50)

      sequence.reset()
      sequence.addEventAt(50, 'capture', 'hello2')
      sequence.loop(100)

      sequence.start()
      setTimeout(() => {
        expect(events.length).toEqual(3)
        expectEventAtTime(events[0], 'reset', 0)
        expectEventAtTime(events[1], 'capture', 50, 'hello2')
        expectEventAtTime(events[2], 'capture', 150, 'hello2')
        done()
      }, 170)
    })
  })
})
