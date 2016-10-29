'use strict'

module.exports = (x) => (x && (typeof x.toMs === 'function')) ? x : { toMs: function () { return x } }
