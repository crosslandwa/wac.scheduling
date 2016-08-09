# wac.scheduling

Utilities for scheduling events in web audio API based applications

# API
```javascript
const context = new window.AudioContext(),
    Scheduling = require('wac.scheduling')(context);

//-----SCHEDULE AN EVENT-----
// pass a callback to occur at some point in the future

Scheduling.inTheFuture(() => { /* your callback */ }, when); // when must be either a number, or an object that implements .toMs() and returns a time expressed in milliseconds

//-----REPEATING EVENTS-----
// have a callback called now, and repeatedly every X ms until told to stop

var repeater = Scheduling.Repeater(interval); // interval must be an object that implements .toMs(), returning an integer time expressed in milliseconds

repeater.start(myCallback); // calls myCallback immediately, then repeatedly until...
repeater.stop(); // stops calling myCallback
repeater.updateInterval(interval) // fluid method to update the repeat time. interval must have a .toMs() method. Returns the repeater instance 

repeater.on('interval', (interval) => /* Take action when interval changes. interval will have a .toMs() method */);
repeater.reportInterval(); // emits an 'interval' event

// note that Repeater will handle being passed an integer interval and interpret it as a ms time 

```

## Tight or loose?

wac.scheduling is designed to be used both with and without an audio context. Without an audio context, timing utilises the native setTimeout method, and can be sloppy. When provided an audio context, events are scheduled using the Web Audio API and should have more predictable and tighter timing

```javascript
const context = new window.AudioContext(),
    TightScheduling = require('wac.scheduling')(context),
    LooseScheduling = require('wac.scheduling')();

LooseScheduling.inTheFuture(myCallback, 100); // will happen around 100ms from now, depending on what is happening in your browser
TightScheduling.inTheFuture(myCallback, 100); // will happen exactly 100ms from now

```
