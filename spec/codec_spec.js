//'use strict';

var _ = require('underscore');

var f = require('../lib/functional');
var c = require('../lib/codec');
var t = require('./utils/testing');

// Test functions

//var multiByteEncode = f.actions([c.encodeUByte(0xA0), c.encodeUByte(0xA1)], c.bytesEncoded);
//
//var singleByteDecode = f.actions([c.decodeUByte()], c.allDecoded);
//var multiByteDecode = f.actions([c.decodeUByte(), c.decodeUByte()], c.allDecoded);
//var singleVLongDecode = f.actions([c.decodeVLong()], c.allDecoded);
//var multiVNumDecode = f.actions([c.decodeVInt(), c.decodeVLong()], c.allDecoded);

//var singleObjectDecode = f.actions([c.decodeObject()], c.allDecoded);
//var multiObjectDecode = f.actions([c.decodeObject(), c.decodeObject()], c.allDecoded);

// Tests

describe('Bytes encode/decode', function() {
  it('can encode a number of Bytes', function() {
    var bytes = new Buffer([48, 49, 50, 51, 52, 53, 54, 55]);
    var actions = f.actions([c.encodeBytes(bytes), t.flip(8), c.decodeBytes(8)], c.last());
    expect(actions(t.newByteBuf2())).toEqual(bytes);
  });
  it('can encode Object + Bytes + Object', function() {
    var bytes = new Buffer([48, 49, 50, 51, 52, 53, 54, 55]);
    var actions = f.actions(
      [c.encodeObject('one'), c.encodeBytes(bytes), c.encodeObject('two'),
       t.flip(strSize('one') + 8 + strSize('two')),
       c.decodeObject(), c.decodeBytes(8), c.decodeObject()], c.last(3));
    var result = actions(t.newByteBuf2());
    expect(result[0]).toBe('one');
    expect(result[1]).toEqual(bytes);
    expect(result[2]).toBe('two');
  });
  it('can encode a chain of Bytes => Object', function() {
    var bytes = new Buffer([48, 49, 50, 51, 52, 53, 54, 55]);
    var actions = f.actions(
      [c.encodeBytes(bytes), c.encodeObject('one'),
       t.flip(8 + strSize('one')),
       c.decodeBytes(8), c.decodeObject()], c.last(2));
    var result = actions(t.newByteBuf2());
    expect(result[0]).toEqual(bytes);
    expect(result[1]).toBe('one');
  });
  it('can encode a chain of Object => Bytes', function() {
    var bytes = new Buffer([48, 49, 50, 51, 52, 53, 54, 55]);
    var actions = f.actions(
      [c.encodeObject('one'), c.encodeBytes(bytes), t.flip(strSize('one') + 8),
       c.decodeObject(), c.decodeBytes(8)], c.last(2));
    var result = actions(t.newByteBuf2());
    expect(result[0]).toBe('one');
    expect(result[1]).toEqual(bytes);
    //var encodeChain = f.actions([c.encodeObject('one'), c.encodeBytes(bytes)], c.bytesEncoded);
    //var bytebuf = t.assertEncode(t.newByteBuf(), encodeChain, 8 + strSize('one'));
    //var decodeChain = f.actions([c.decodeObject(), c.decodeBytes(8)], c.allDecoded);
    //var actual = decodeChain({buf: bytebuf.buf, offset: 0});
    //expect(actual[0]).toBe('one');
    //expect(actual[1]).toEqual(bytes);
  });
});

describe('Object encode/decode', function() {
  it('can encode a String', function() {
    var actions = f.actions([c.encodeObject('one'), t.flip(strSize('one')), c.decodeObject()], c.last());
    expect(actions(t.newByteBuf2())).toEqual('one');
  });
  it('can encode multiple Strings', function() {
    var actions = f.actions(
      [c.encodeObject('one'), c.encodeObject('two'), t.flip(strSize('one') + strSize('two')),
       c.decodeObject(), c.decodeObject()], c.last(2));
    expect(actions(t.newByteBuf2())).toEqual(['one', 'two']);
  });
});

function strSize(str) {
  var len = Buffer.byteLength(str);
  return len + t.vNumSize(len);
}

describe('Variable number encode/decode', function() {
  it('can encode 0', function() {
    encodeDecodeVNum(0);
  });
  it('can encode 2^7 - 1', function() {
    encodeDecodeVNum(Math.pow(2, 7) - 1);
  });
  it('can encode 2^7', function() {
    encodeDecodeVNum(Math.pow(2, 7));
  });
  it('can encode 2^14 - 1', function() {
    encodeDecodeVNum(Math.pow(2, 14) - 1);
  });
  it('can encode 2^14', function() {
    encodeDecodeVNum(Math.pow(2, 14));
  });
  it('can encode 2^21 - 1', function() {
    encodeDecodeVNum(Math.pow(2, 21) - 1);
  });
  it('can encode 2^21', function() {
    encodeDecodeVNum(Math.pow(2, 21));
  });
  it('can encode 2^28 - 1', function() {
    encodeDecodeVNum(Math.pow(2, 28) - 1);
  });
  it('can encode 2^28', function() {
    encodeDecodeVNum(Math.pow(2, 28));
  });
  it('can encode 2^31 - 1', function() {
    encodeDecodeVNum(Math.pow(2, 31) - 1);
  });
  it('fails to encode 2^31 as a VInt because it is out of bounds', function() {
    var encode = f.actions([c.encodeVInt(Math.pow(2, 31))], c.trim);
    expect(function() { encode(t.newByteBuf2()) }).toThrow('must be less than 2^31');
  });
  it('can encode 2^31', function() {
    encodeDecodeVLong(Math.pow(2, 31));
  });
  it('can encode 2^35 - 1', function() {
    encodeDecodeVLong(Math.pow(2, 35) - 1);
  });
  it('can encode 2^35', function() {
    encodeDecodeVLong(Math.pow(2, 35));
  });
  it('can encode 2^42 - 1', function() {
    encodeDecodeVLong(Math.pow(2, 42) - 1);
  });
  it('can encode 2^42', function() {
    encodeDecodeVLong(Math.pow(2, 42));
  });
  it('can encode 2^49 - 1', function() {
    encodeDecodeVLong(Math.pow(2, 49 - 1));
  });
  it('can encode 2^49', function() {
    encodeDecodeVLong(Math.pow(2, 49));
  });
  it('can encode 2^53 - 1', function() {
    encodeDecodeVLong(Math.pow(2, 53) - 1);
  });
  it('fails to encode 2^53 as a VLong because it is out of bounds', function() {
    var encode = f.actions([c.encodeVLong(Math.pow(2, 53))], c.trim);
    expect(function() { encode(t.newByteBuf()) })
        .toThrow('must be less than 2^53 (javascript safe integer limitation)');
  });
  it('fails to encode a number when it is not a number', function() {
    var encode = f.actions([c.encodeVInt('blah')], c.trim);
    expect(function() { encode(t.newByteBuf()) })
        .toThrow('must be a number, must be >= 0, must be less than 2^31');
  });
  it('fails to encode a number when it is negative', function() {
    var encode = f.actions([c.encodeVInt(-1)], c.trim);
    expect(function() { encode(t.newByteBuf2()) }).toThrow('must be >= 0');
  });
});

function encodeDecodeVNum(num) {
  var expectedBytes = t.vNumSize(num);
  var actions = f.actions(
    [c.encodeVInt(num), c.encodeVLong(num), t.flip(expectedBytes * 2),
    c.decodeVInt(), c.decodeVLong()], c.last(2));
  expect(actions(t.newByteBuf2())).toEqual([num, num]);
  //var bytebuf = t.assertEncode(t.newByteBuf(), actions, expectedBytes * 2);
  //expect(multiVNumDecode({buf: bytebuf.buf, offset: 0})).toEqual([num, num]);
}

function encodeDecodeVLong(num) {
  var length = t.vNumSize(num);
  var actions = f.actions([c.encodeVLong(num), t.flip(length), c.decodeVLong()], c.last());
  expect(actions(t.newByteBuf2())).toEqual(num);
  //var expectedBytes = t.vNumSize(num);
  //var bytebuf = t.newByteBuf();
  //var encode = f.actions([c.encodeVLong(num)], c.bytesEncoded);
  //expect(encode(bytebuf)).toBe(expectedBytes);
  //expect(singleVLongDecode({buf: bytebuf.buf, offset: 0})).toEqual([num]);
}

//var lastVNum = function(n) {
//  return function(values, state) {
//    return _.map(_.last(values, n), function(vnum) {
//      //return vnum.value;
//      return _.has(vnum, 'value') ? vnum.value : vnum;
//    });
//  };
//};

//var lastVNum = function(values, state) {
//  return _.last(values).value;
//};

describe('Basic encode/decode', function() {
  it('fails to encode a byte when it is not a number', function() {
    var invalidByteEncode = f.actions([c.encodeUByte('blah')], c.trim);
    expect(function() { invalidByteEncode(t.newByteBuf()) })
        .toThrow('must be a number, must be >= 0');
  });
  it('fails to encode a number when it is negative', function() {
    var encode = f.actions([c.encodeUByte(-1)], c.trim);
    expect(function() { encode(t.newByteBuf()) }).toThrow('must be >= 0');
  });
  it('fails to encode a byte when the value is too big (256 or higher)', function() {
    var actions = f.actions([c.encodeUByte(0x100)], c.trim);
    expect(function() { actions(t.newByteBuf2()) }).toThrow('value is out of bounds');
  });
  it('fails to decode if past the buffer end', function() {
    var actions = f.actions(
      [c.encodeUByte(0xA0), t.flip(1), c.decodeUByte(), c.decodeUByte()], c.last(2));
    expect(function() { actions(t.newByteBuf2()) }).toThrow('index out of range');
  });
  it('can encode a byte with limit value 255', function() {
    var actions = f.actions([c.encodeUByte(0xFF), t.flip(1), c.decodeUByte()], c.last());
    expect(actions(t.newByteBuf2())).toEqual(0xFF);
  });
  it('can encode a multiple bytes with actions', function() {
    var actions = f.actions(
      [c.encodeUByte(0xA0), c.encodeUByte(0xA1), t.flip(2),
      c.decodeUByte(), c.decodeUByte()], lastDecoded(2));
    expect(actions(t.newByteBuf2())).toEqual([0xA0, 0xA1]);
  });
  it('can encode a single byte with actions', function() {
    var actions = f.actions([c.encodeUByte(0xA0), t.flip(1), c.decodeUByte()], c.last());
    expect(actions(t.newByteBuf2())).toEqual(0xA0);
  });

  var lastDecoded = function(n) {
    return function(values, state) {
      return _.last(values, n);
    };
  };

});
