# wac.scheduling

Utilities for scheduling events in web audio API based applications

# API
```javascript
const context = new window.AudioContext(),
    Scheduling = require('wac.scheduling')(context);

//-----SCHEDULE AN EVENT RELATIVE TO NOW-----
// pass a callback to occur at some point relative in the future
let when = { toMs: function() { return 3000 } }; // occur 3s from now
Scheduling.inTheFuture(() => { /* your callback */ }, when); // when must be either a number, or an object that implements .toMs() and returns a time expressed in milliseconds

//-----WHEN IS NOW?-----
// get the current time in milliseconds

Scheduling.nowMs();

//-----SCHEDULE AN EVENT AT AN ABSOLUTE TIME-----
// pass a callback to occur at some exact point in time

let when = Scheduling.nowMs() + 2000; // schedule 2s from now
Scheduling.atATime(() => { /* your callback */ }, when); // when must be either a number, or an object that implements .toMs() and returns a time expressed in milliseconds

//-----REPEATING EVENTS-----
// have a callback called now, and repeatedly every X ms until told to stop

var repeater = Scheduling.Repeater(interval); // interval must be an object that implements .toMs(), returning an integer time expressed in milliseconds

repeater.start(myCallback); // calls myCallback immediately, then repeatedly until...
repeater.stop(); // stops calling myCallback
repeater.updateInterval(interval) // fluid method to update the repeat time. interval must have a .toMs() method. Returns the repeater instance

repeater.on('interval', (interval) => /* Take action when interval changes */);
/*
 * The emitted interval object looks like:
 * { toMs: function, nextRepeatTime: { toMs: function } }
 * toMs gives the interval time (in milliseconds)
 * nextRepeatTime.toMs gives the absolute (scheduled) time when the next repeat will occur (in milliseconds)
 *
 * note nextRepeatTime is omitted if the Repeater is not currently running
 */

repeater.reportInterval(); // emits an 'interval' event

// note that Repeater will handle being passed an integer interval and interpret it as a ms time

// -----METRONOME-----
// a simple metronome

var metronome = Scheduling.Metronome(numberOfBeats, bpm) // specify an accent every 1-16 beats, and a BPM (as a number or a BPM instance)

// metronome emits an event (either 'accent' or 'tick') every beat

metronome.on('accent', () => { /* occurs every Nth beat as specifided by numberOfBeats */ }
metronome.start() // start emitting events
metronome.stop() // stop emitting events

metronome.updateBPM(newBPM) // change how often events are emitted (specifying newBPM as a number or a BPM instance)
metronome.updateNumberOfBeats(beats) // change how often the 'accent' event is emitted vs the 'tick' event

metronome.suppressClick() // prevents the metronome's default click sounds from sounding

metronome.on('running', (nextTick) => { /* occurs when started */ }
/*
 * The emitted nextTick object looks like:
 * { toMs: function }
 * toMs gives the absolute (scheduled) time when the next tick will occur (in milliseconds)
 */

metronome.on('stopped', () => { /* occurs when stopped */ }

// -----TAP-----
// a simple tap tempo type utility

var tap = Scheduling.Tap();
tap.again() // call this repeatedly/periodically and tap will emit 'average' events
tap.on('average', (bpm) => { /* do something with BPM instance */ }) // bpm is a BPM instance describing the average time between calls to tap.again()

// the tap object will reset itself if tap.again() is not called for a period of time

// -----BPM-----
// a simple utility to represent BPM (beats per minute) to a max of 2 decimal places

var bpm = Scheduling.BPM(); // bpm defaults to 120 beats per min
var bpm = Scheduling.BPM(150); // bpm at 150 beats per min
var bpm = Scheduling.BPMForBeatLength(1000); // bpm with beats of length 1000ms (i.e. 60bpm)

var bpm1 = Scheduling.BPM(150);
var bpm2 = Scheduling.BPM(bpm1); // make a new BPM instance from another one (effectively a copy)

bpm.on('changed', (bpm) => /* respond to changes in BPM */);

bpm.changeTo(150); // change to 150 beats per min. Emits a 'changed' event
bpm.changeBy(3); // increase/decrease bpm by given amount. Emits a 'changed' event
bpm.current(); // returns current bpm, 153 in this case
bpm.report(); // forces bpm to emit a 'changed' event

bpm.beatLength(); // returns an object with a toMs() function that returns the current beat length in ms
```

## Tight or loose?

wac.scheduling is designed to be used both with and without an audio context. Without an audio context, timing utilises the native setTimeout method, and can be sloppy. When provided an audio context, events are scheduled using the Web Audio API and should have more predictable/tighter timing

```javascript
const context = new window.AudioContext(),
    TightScheduling = require('wac.scheduling')(context),
    LooseScheduling = require('wac.scheduling')();

LooseScheduling.inTheFuture(myCallback, 100); // will happen around 100ms from now, depending on what is happening in your browser
TightScheduling.inTheFuture(myCallback, 100); // will happen exactly 100ms from now

```

## Relative or absolute?

_inTheFuture_ and _atATime_ offer very similar functionality

_inTheFuture_ is easier to use as the client does not need to know the current time

_atATime_ requires the client to know the current time (discoverable via _nowMs()_)

_inTheFuture_ will generally be slightly less accurate as system processing time could cause your callback to not actually be scheduled until *slightly after* the call to _inTheFuture_ is made

e.g. internally the Repeater object makes use of _atATime_ to repeatedly schedule a callback without incurring variation in when the repetition actually occurs

When absolute precision matters use _atATime_, else make life easy for yourself and use _inTheFuture_

# Sequence API

The sequence object provides the ability to schedule a (looping) series of events

```javascript
const context = new window.AudioContext(),
    Scheduling = require('wac.scheduling')(context);

let sequence = Scheduling.Sequence(Scheduling);

sequence.on(eventName, (eventData) => /* do stuff */);
sequence.on('stopped', (eventData) => /* sequence stopped actions */);
sequence.on('loop', (eventData) => /* take action when sequence starts each loop */);

sequence.addEventAt(whenMs, eventName, eventData); // whenMs specifies how far into the sequence the given eventName/eventData will be emitted
sequence.addEventNow(eventName, eventData); // adds an event at the current point in the (playing) sequence
sequence.loop(loopLengthMs); // optional, sets a loop length and sequence will repeat until stopped
sequence.start([offsetMs]); // starts emitting events [starting from a given offset if provided]
sequence.stop(); // stops sequence, emits stopped event

sequence.reset(); // clears all events and loop length

sequence.toJSON(); // returns a JSON representation of the sequence (that can be JSON stringified for storage)
sequence.load(json); // stops the sequence (if running) and loads new events/loops specified in json

sequence.scale(scaleFactor); // makes the events in the sequence and its loop length (if looping) longer/shorter

sequence.currentPositionMs(); // returns current position within loop in ms
sequence.loopLengthMs(); // returns the loop length in ms (or undefined if the sequence is not looped)
```

## Add event now

The addEventNow method has some slightly special behaviour

```javascript
let sequence = Scheduling.Sequence(Scheduling);

// sequence that is not running

sequence.addEventNow(name, data) // first call adds an event at time 0ms and starts the internal timer running
setTimeout(() => sequence.addEventNow(name, data), 50) // subsequent calls add event at the time called, relative to the sequence start time (i.e. 50ms in this case)

// sequence that is running
sequence.start()
sequence.addEventNow(name, data) // adds the event at current position within the sequence

```