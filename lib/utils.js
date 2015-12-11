'use strict';

(function() {

  var _ = require('underscore');
  var log4js = require('log4js');
  var util = require('util');

  var f = require('./functional');

  exports.counter = function(value) { return new Counter(value); };
  exports.keyValueMap = function() { return new KeyValueMap(); };
  exports.logger = function(name) { return new ClientLogger(name); };

  // NOTE: Default byte buffer implementation is immutable to make it easier
  // to reason about changes. If performance concerns arise, consider
  // providing a mutable byte buffer implementation.
  exports.byteBuffer = function(size) { return new ImmutableByteBuffer(new Buffer(size), 0); };

  var Counter = function(val) {
    var _value = val;

    return {
      incr: function() {
        _value = _value + 1;
        return _value;
      }
    };
  };

  var KeyValueMap = function() {
    var _map = Object.create(null);

    return {
      put: function(k, v) {
        _map[k] = v;
      },
      get: function(k) { // TODO: Return an Option or similar?
        return _map[k];
      },
      remove: function(k) {
        delete _map[k];
      }
    };
  }

  var ClientLogger = function(name) {
    var logger = log4js.getLogger(name);

    return {
      debugl: function(fun) {
        if (logger.isDebugEnabled())
          logger.debug.apply(logger, fun());
      },
      debugf: function() { logger.debug.apply(logger, arguments); },
      tracef: function() { logger.trace.apply(logger, arguments); },
      error: function() { logger.error.apply(logger, arguments); }
    }
  };

  function ImmutableByteBuffer(buffer, offset) {
    this.buffer = buffer;
    this.offset = offset;
  }
  (function() {
    var MSB = 0x80,
      REST = 0x7F,
      MSBALL = ~REST,
      INT = Math.pow(2, 31);

    this.writeBytes = function(bytes) {
      var start = this.offset;
      var copy = new Buffer(this.buffer);
      bytes.copy(copy, start);
      return new ImmutableByteBuffer(copy, start + bytes.length);
    };
    this.readBytes = function(num) {
      var end = this.offset + num;
      return this.buffer.slice(this.offset, end);
    };
    this.writeObject = function(obj) {
      if (_.isString(obj)) {
        var length = Buffer.byteLength(obj);
        var bytebuf = this.writeVNum(length);
        var newOffset = bytebuf.buffer.write(obj, bytebuf.offset) + bytebuf.offset;
        return new ImmutableByteBuffer(bytebuf.buffer, newOffset);
      } else {
        throw new Error('Not handled yet: ' + obj);
      }
    };
    this.readObject = function() {
      var vnum = this.readVNum();
      var bytebuf = this.skip(vnum.length);
      var obj = bytebuf.buffer.toString(undefined, bytebuf.offset, bytebuf.offset + vnum.value);
      return {value: obj, length: vnum.length + vnum.value};
    };
    this.writeUInt8 = function(value) {
      // TODO: Be more efficient with copying, e.g. copy only written data and not garbage
      // TODO: Also, size the buffer just as big as needed (e.g. length + 1)
      var copy = new Buffer(this.buffer);
      var newOffset = copy.writeUInt8(value, this.offset);
      return new ImmutableByteBuffer(copy, newOffset);
    };
    this.readUInt8 = function() {
      return this.buffer.readUInt8(this.offset);
    };
    this.skipUInt8 = function() { return this.skip(1); };
    this.writeVNum = function(value) {
      // TODO: Be more efficient with copying, e.g. copy only written data and not garbage
      // TODO: Also, size the buffer just as big as needed (e.g. max 8 bytes, can always be trimmed at the end)
      var copy = new Buffer(this.buffer);
      var copyOffset = this.offset;
      while(value >= INT) {
        copy.writeUInt8((value & 0xFF) | MSB, copyOffset++);
        value /= 128
      }
      while(value & MSBALL) {
        copy.writeUInt8((value & 0xFF) | MSB, copyOffset++);
        value >>>= 7
      }
      copy.writeUInt8(value | 0, copyOffset++);
      return new ImmutableByteBuffer(copy, copyOffset);
    };
    this.readVNum = function() {
      var length = 0;
      var value = 0, shift  = 0, b;

      do {
        b = this.buffer.readUInt8(this.offset + length);
        length++;
        value += shift < 28
          ? (b & REST) << shift
          : (b & REST) * Math.pow(2, shift);
        shift += 7;
      } while (b >= MSB);

      return {value: value, length: length};
    };
    this.skip = function(num) {
      if (f.existy(num))
        return new ImmutableByteBuffer(this.buffer, this.offset + num);
      else
        return new ImmutableByteBuffer(this.buffer.slice(this.offset), 0);
    };
    this.flip = function() {
      var buf = this.offset < this.buffer.length ? this.buffer.slice(0, this.offset) : this.buffer;
      return new ImmutableByteBuffer(buf, 0);
    };
    this.append = function(buf) {
      var tmp = new Buffer(this.buffer.length + buf.length);
      this.buffer.copy(tmp);
      buf.copy(tmp, this.buffer.length);
      return new ImmutableByteBuffer(tmp, 0);
    };
    this.isEmpty = function() {
      return this.offset >= this.buffer.length;
    };
    //this.toByteBuf = function() { // TODO: Temporary method, bridges over to old buffer
    //  return {buf: this.buffer, offset: this.offset};
    //};
    this.toString = function() {
      return this.offset > 0
        ? util.format('[buffer=0x%s,offset=%d]', this.buffer.slice(0, this.offset).toString('hex'), this.offset)
        : "[]";
    };
    this.length = function() {
      return this.buffer.length;
    };
    this.trim = function() {
      if (this.offset < this.buffer.length)
        return new ImmutableByteBuffer(this.buffer.slice(0, this.offset), 0);

      return this;
    };
    this.asBuffer = function() {
      return this.buffer;
    }
  }).call(ImmutableByteBuffer.prototype);

  //// An immutable byte buffer tracking offset read/write positions
  //var ImmutableByteBuffer = function(buffer, offset) {
  //  return {
  //    flip: function() {
  //      return new ImmutableByteBuffer(buffer, 0);
  //    },
  //    writeUInt8: function(value) {
  //      var copy = new Buffer(buffer);
  //      var newOffset = copy.writeUInt8(value, offset);
  //      return new ImmutableByteBuffer(copy, newOffset);
  //    },
  //    readUInt8: function() {
  //      var value = buffer.readUInt8(offset);
  //      return {value: value, bytebuf: new ImmutableByteBuffer(buffer, offset + 1)};
  //    },
  //    readUInt8_2: function() {
  //      return buffer.readUInt8(offset);
  //    },
  //    skipUInt8: function() {
  //      return new ImmutableByteBuffer(buffer, offset + 1);
  //    },
  //    append: function(buf) {
  //      var tmp = new Buffer(buffer.length + buf.length);
  //      buffer.copy(tmp);
  //      buf.copy(tmp, buffer.length);
  //      return new ImmutableByteBuffer(tmp, 0);
  //    },
  //    isEmpty: function() {
  //      return buffer.length > offset;
  //    },
  //    toByteBuf: function() { // TODO: Temporary method, bridges over to old buffer
  //      return {buf: buffer, offset: offset};
  //    },
  //    toString: function() {
  //      return offset > 0
  //        ? util.format('[buffer=0x%s,offset=%d]', buffer.slice(0, offset).toString('hex'), offset)
  //        : "[]";
  //    }
  //  }
  //}

}.call(this));
