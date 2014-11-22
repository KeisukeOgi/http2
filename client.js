var net   = require('net'),
    hpack = require('./hpack');

var FRAME_HEADER_LEN = 9;
