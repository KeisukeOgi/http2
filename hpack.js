function encodeInteger(num, prefix) {
    var limit = Math.pow(2, prefix) - 1;

    if (num < limit) {
        return new Buffer([num]);
    }

    var octets = [limit];
    num -= limit;
    while (num >= 128) {
        octets.push(num % 128 | 0x80);
        num >>= 7;
    }
    octets.push(num);

    return new Buffer(octets);
}

function encodeString(str) {
    var buffers = [];
    var value   = new Buffer(str, 'ascii');

    buffers.push(encodeInteger(value.length, 7));
    buffers.push(value);

    return Buffer.concat(buffers);
}

exports.encodeInteger = encodeInteger;
exports.encodeString  = encodeString;
