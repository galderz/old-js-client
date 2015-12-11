'use strict';

var _ = require('underscore');

var utils = require('../lib/utils');
var f = require('../lib/functional');

describe('A counter', function() {
  it('can be incremented', function() {
    var counter = utils.counter(0);
    expect(counter.incr()).toBe(1);
    expect(counter.incr()).toBe(2);
    expect(counter.incr()).toBe(3);
  });
});

describe('A byte buffer', function() {
  it('can read/write single bytes', function() {
    var b0 = utils.byteBuffer(128);
    var b1 = b0.writeUInt8(0xA0).flip();
    expect(b1.readUInt8()).toBe(0xA0);
  });
  it('can read/write multiple bytes', function() {
    var b0 = utils.byteBuffer(128);
    var b1 = b0.writeUInt8(0xA0).writeUInt8(0xA1).flip();
    expect(b1.readUInt8()).toBe(0xA0);
    expect(b1.skipUInt8().readUInt8()).toBe(0xA1);
  });
  it('is immutable', function() {
    var b0 = utils.byteBuffer(128);
    var b1 = b0.writeUInt8(0xA0).flip();
    var b2 = b0.writeUInt8(0xA1).flip();
    expect(b1.readUInt8()).toBe(0xA0);
    expect(b2.readUInt8()).toBe(0xA1);
  });
  it('can read/write single bytes with actions', function() {
    var actions = f.actions(
      [writeUInt8(1), writeUInt8(2), flip(), readUInt8(), readUInt8()],
      function(values, state) {
        return _.last(values, 2); // _.map(values, function(v) {return v.toString(); } );
      });
    expect(actions(utils.byteBuffer(128))).toEqual([1, 2]);
  });
  it('can read/write variable length numbers with actions', function() {
    var actions = f.actions(
      [writeVNum(128), writeUInt8(3), flip(), readVNum(), readUInt8()],
      function(values, state) {
        return [_.last(_.initial(values)).value, _.last(values)];
      });
    expect(actions(utils.byteBuffer(128))).toEqual([128, 3]);
  });
  it('can read/write single bytes with actions', function() {
    var actions = f.actions(
      [writeUInt8(1), writeUInt8(2), flip(), readUInt8(), readUInt8()],
      function(values, state) {
        return _.last(values, 2); // _.map(values, function(v) {return v.toString(); } );
      });
    expect(actions(utils.byteBuffer(128))).toEqual([1, 2]);
  });
  it('can read/write a String with actions', function() {
    var actions = f.actions(
      [writeObject('hello'), flip(), readObject()],
      function(values, state) {
        return _.last(values).value;
      });
    expect(actions(utils.byteBuffer(128))).toEqual('hello');
  });
  it('can read/write bytes with actions', function() {
    var bytes = new Buffer([1, 2, 3]);
    var actions = f.actions(
      [writeBytes(bytes), flip(), readBytes(3)],
      function(values, state) {
        return _.last(values);
      });
    expect(actions(utils.byteBuffer(128))).toEqual(new Buffer([1, 2, 3]));
  });
  it('can write data and be trimmed', function() {
    var result = f.actions([writeUInt8(1)], trim)(utils.byteBuffer(128));
    expect(result.length()).toBe(1);
  });
  it('can append and read data', function() {
    var b0 = utils.byteBuffer(0);
    var b1 = b0.append(new Buffer([1, 2, 3]));
    var actions = f.actions([readBytes(3)],
      function(values, state) {
        return _.first(values);
      });
    expect(actions(b1)).toEqual(new Buffer([1, 2, 3]));
  });

  var writeUInt8 = f.lift(function(bytebuf, value) { return bytebuf.writeUInt8(value); });
  var readUInt8 = f.lift(
    function(bytebuf) { return bytebuf.readUInt8(); },
    function(bytebuf) { return bytebuf.skipUInt8(); }
  );
  var writeVNum = f.lift(function(bytebuf, value) { return bytebuf.writeVNum(value); });
  var readVNum = f.lift(
    function(bytebuf) { return bytebuf.readVNum(); },
    function(bytebuf, vnum) { return bytebuf.skip(vnum.length); }
  );
  var writeObject = f.lift(function(bytebuf, obj) { return bytebuf.writeObject(obj); });
  var readObject = f.lift(
    function(bytebuf) { return bytebuf.readObject(); },
    function(bytebuf, obj) { return bytebuf.skip(obj.length); }
  );
  var writeBytes = f.lift(function(bytebuf, bytes) { return bytebuf.writeBytes(bytes); });
  var readBytes = f.lift(
    function(bytebuf, num) { return bytebuf.readBytes(num); },
    function(bytebuf, bytes) { return bytebuf.skip(bytes.length); }
  );

  var flip = f.lift(function(bytebuf) { return bytebuf.flip(); });
  var trim = function(values, state) {
    return state.trim();
  };

});
