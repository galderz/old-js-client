'use strict';

var _ = require('underscore');
var f = require('../lib/functional');
var c = require('../lib/codec');

var t = require('./utils/testing'); // Testing dependency

describe('Protocols', function() {
  var p = t.protocol();

  it('can encode/decode lifespan', function() {
    encodeDecodeUnits('lifespan', lifespan);
  });
  it('can encode/decode max idle', function() {
    encodeDecodeUnits('maxIdle', maxIdle);
  });

  function lifespan(unit) { return unit << 4 | 0x07; }
  function maxIdle(unit) { return 0x70 | unit; }

  function object(name) {
    return function(value) {
      return _.object([name], [value]);
    }
  }

  function encodeDecodeUnits(name, converter) {
    var exp = object(name);
    encodeDecodeSingleNumericExpiry(exp('777777777d'), 777777777, converter(0x06));
    encodeDecodeSingleNumericExpiry(exp('66666666h'), 66666666, converter(0x05));
    encodeDecodeSingleNumericExpiry(exp('5555555m'), 5555555, converter(0x04));
    encodeDecodeSingleNumericExpiry(exp('444444s'), 444444, converter(0x00));
    encodeDecodeSingleNumericExpiry(exp('33333ms'), 33333, converter(0x01));
    encodeDecodeSingleNumericExpiry(exp('2222μs'), 2222, converter(0x03));
    encodeDecodeSingleNumericExpiry(exp('111ns'), 111, converter(0x02));
    encodeDecodeSingleConstantExpiry(exp(0), converter(0x07));
    encodeDecodeSingleConstantExpiry(exp(-1), converter(0x08));
  }

  function encodeDecodeSingleNumericExpiry(expiry, duration, unit) {
    var actions = f.actions(f.cat(
      p.encodeExpiry(expiry), [t.flip(t.vNumSize(duration) + 1), c.decodeUByte(), c.decodeVLong()]),
      c.last(2));
    expect(actions(t.newByteBuf2())).toEqual([unit, duration]);
  }

  function encodeDecodeSingleConstantExpiry(expiry, unit) {
    var actions = f.actions(f.cat(p.encodeExpiry(expiry), [t.flip(1), c.decodeUByte()]), c.last());
    expect(actions(t.newByteBuf2())).toEqual(unit);
  }
});
