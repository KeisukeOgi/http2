var net   = require('net'),
    hpack = require('./hpack');

var FRAME_HEADER_LEN = 9;

function createSettingsFrame(ack) {
    var flag = ack ? 0x1 : 0x0;

    var frameHeader = new Buffer(FRAME_HEADER_LEN);
    frameHeader.writeUInt32BE(0x0, 0);
    frameHeader.writeUInt8(0x4, 3);
    frameHeader.writeUInt8(flag, 4);
    frameHeader.writeUInt32BE(0x0, 5);

    return frameHeader;
}

function encodeHeaders(headers) {
    var headerBlocks = [];

    headers.forEach(function(header){
        var prefix = new Buffer(1);
        prefix.fill(0);
        headerBlocks.push(prefix);

        var name = hpack.encodeString(header[0]);
        headerBlocks.push(name);

        var value = hpack.encodeString(header[1]);
        headerBlocks.push(value);
    });

    return Buffer.concat(headerBlocks);
}

function createHeadersFrame(headers) {
    var headerBlocks = encodeHeaders(headers);
    var frameHeader  = new Buffer(FRAME_HEADER_LEN);
    frameHeader.writeUInt32BE(headerBlocks.length << 8, 0);
    frameHeader.writeUInt8(0x1, 3);
    frameHeader.writeUInt8(0x5, 4);
    frameHeader.writeUInt32BE(0x1, 5);

    return Buffer.concat([frameHeader, headerBlocks]);
};

function debug(msg) {
    console.log('[debug]', msg);
}


var conn = net.connect(8888, '127.0.0.1');
var frameBuffer = new Buffer(0);
var bodyBuffer  = [];

conn.on('connect', function(){
    conn.write('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n', 'utf8');
    conn.write(createSettingsFrame(false));
    debug('Send SETTINGS frame');
});

conn.on('data', function(chunk){
    frameBuffer = Buffer.concat([frameBuffer, chunk]);

    while (frameBuffer.length >= FRAME_HEADER_LEN) {
        var length  = FRAME_HEADER_LEN;
            length += frameBuffer.readUInt32BE(0) >> 8;
        if (frameBuffer.length < length) {
            return;
        }

        var frame   = frameBuffer.slice(0, length);
        frameBuffer = frameBuffer.slice(length);

        if (frame[3] === 0x4 && frame[4] === 0x0) {
            conn.write(createSettingsFrame(true));
            debug('Send SETTINGS frame with ACK flag');
            continue;
        }

        if (frame[3] === 0x4 && frame[4] === 0x1) {
            var headers = [
                [ ':method', 'GET' ],
                [ ':path', '/' ],
                [ ':scheme', 'http' ],
                [ ':authority', 'localhost:8888' ]
            ];

            conn.write(createHeadersFrame(headers));
            debug('Send HEADERS frame');
            continue;
        }

        if (frame[3] === 0x0 && frame[4] === 0x0) {
            bodyBuffer.push(frame.slice(FRAME_HEADER_LEN));
        }

        if (frame[3] === 0x0 && frame[4] === 0x1) {
            var body = Buffer.concat(bodyBuffer);
            console.log(body.toString());
            conn.end();
        }
    }
});
