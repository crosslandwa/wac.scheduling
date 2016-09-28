'use strict'

const Scheduling = require('../Scheduling.js')()

describe('BPM module', () => {
  let bpm
  let emittedEvents

  beforeEach(() => {
    bpm = Scheduling.BPM()
    emittedEvents = []
    bpm.on('changed', (bpm) => emittedEvents.push('bpm=' + bpm.current()))
  })

  it('reports bpm', () => {
    bpm.report()
    expect(emittedEvents).toEqual(['bpm=120'])
  })

  it('can have bpm increased', () => {
    bpm.change_by(3)
    expect(emittedEvents).toEqual(['bpm=123'])
  })

  it('can have bpm decreased', () => {
    bpm.change_by(-10)
    expect(emittedEvents).toEqual(['bpm=110'])
  })

  it('can have bpm set', () => {
    bpm.change_to(100)
    expect(emittedEvents).toEqual(['bpm=100'])
  })

  it('supports a max bpm of 300', () => {
    bpm.change_by(500)
    expect(emittedEvents).toEqual(['bpm=300'])
  })

  it('supports a min bpm of 20', () => {
    bpm.change_by(-500)
    expect(emittedEvents).toEqual(['bpm=20'])
  })

  it('supports BPM specified up to 2dp', () => {
    bpm.change_to(120.055)
    expect(emittedEvents).toEqual(['bpm=120.06'])
    bpm.change_by(1.005)
    expect(emittedEvents).toEqual(['bpm=120.06', 'bpm=121.07'])
  })

  it('can be queried to report current beat length in Ms', () => {
    expect(bpm.beatLength().toMs()).toEqual(500)
  })

  it('can be created from a beat length in Ms', () => {
    expect(Scheduling.BPMForBeatLength(500).current()).toEqual(120)
  })
})
