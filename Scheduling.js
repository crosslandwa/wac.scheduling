'use strict'

const EventEmitter = require('events'),
    util = require('util');

function Repeater(inTheFuture, initialInterval) {
    EventEmitter.call(this);

    let createInterval = function(candidate) {
        return (candidate && (typeof candidate.toMs === 'function')) ? candidate : { toMs: function() { return candidate }};
    };

    let recursiveInTheFuture = function(callback) {
        return inTheFuture(() => {
            if (_isScheduling) {
                callback();
                _cancel = recursiveInTheFuture(callback);
            }
        }, _interval);
    }

    let _isScheduling = false,
        _interval = createInterval(initialInterval),
        _cancel = noAction,
        repeater = this;

    this.updateInterval = function (newInterval) {
        _interval = createInterval(newInterval);
        repeater.reportInterval();
        return repeater;
    }

    this.start = function(callback) {
        if (_isScheduling) return;
        _isScheduling = true;
        callback();
        _cancel = recursiveInTheFuture(callback);
    }

    this.stop = function() {
        _isScheduling = false;
        _cancel();
        _cancel = noAction;
    }

    this.reportInterval = function() {
        repeater.emit('interval', _interval);
    }
}
util.inherits(Repeater, EventEmitter);

function Scheduling(context) {
    let scheduling = this;

    let inTheFutureTight = function(callback, when) {
        let localCallback = callback,
            source = context.createBufferSource(),
            now = context.currentTime,
            thousandth = context.sampleRate / 1000,
            scheduled_at = now + (when.toMs() / 1000) - 0.001;
        // a buffer length of 1 sample doesn't work on IOS, so use 1/1000th of a second
        let buffer = context.createBuffer(1, thousandth, context.sampleRate);
        source.addEventListener('ended', () => { localCallback(); });
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(scheduled_at);

        return function cancel() { localCallback = noAction; }
    };

    this.inTheFuture = context ? inTheFutureTight : inTheFutureLoose;

    this.Repeater = function(initialInterval) {
        return new Repeater(scheduling.inTheFuture, initialInterval)
    }
}

function inTheFutureLoose(callback, when) {
    let localCallback = callback;
    setTimeout(() => { localCallback() }, when.toMs());
    return function cancel() { localCallback = noAction; }
};

function noAction() {}

module.exports = function(context) { return new Scheduling(context); };
