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

repeater.on('interval', (interval) => /* Take action when interval changes. interval will have a .toMs() method */);
repeater.reportInterval(); // emits an 'interval' event

// note that Repeater will handle being passed an integer interval and interpret it as a ms time 

// -----METRONOME-----
// a simple metronome

var metronome = Scheduling.Metronome(numberOfBeats, bpm) // specifiy an accent every 1-16 beats, and a BPM

// metronome emits an event (either 'accent' or 'tick') every beat

metronome.on('accent', () => { /* occurs every Nth beat as specifided by numberOfBeats */ }
metronome.start() // start emitting events
metronome.stop() // stop emitting events

metronome.updateBPM(newBPM) // change how often events are emitted
metronome.updateNumberOfBeats(beats) // change how often the 'accent' event is emitted vs the 'tick' event
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
setTimeout(() => sequence.addEventNow(name, data), 50) // subsequent calls add event at the time called, relative to ths sequence start time (i.e. 50ms in this case)

// sequence that is running
sequence.start()
sequence.addEventNow(name, data) // adds the event at current position within the sequence

```

## TODO

- add tests/define behaviour around load() method of Sequence when its playing (probably can't load if playing...)
  - what about a merge events from another sequence functionality?
- test toJSON/load for unlooped sequence
- consider the storing the whens in the sequence events as a fraction of loop length rather than absolute ms time...
  - serialized version would be decoupled from BPM (i.e. could load sequence at a different BPM)
  - don't want to have to calculate ms every time event scheduled
  - consider internally storing bpm time + ms time but only serialize the fractional amount