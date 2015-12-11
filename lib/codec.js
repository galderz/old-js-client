(function() {

  var MSB = 0x80
      , REST = 0x7F
      , MSBALL = ~REST
      , INT = Math.pow(2, 31);

  var _ = require('underscore');

  var f = require('./functional');
  var utils = require('./utils');

  //exports.encodeUByte = f.lift(function(bytebuf, value) { return bytebuf.writeUInt8(value); });
  exports.encodeUByte = f.lift(checkedWriteUByte);
  //exports.encodeVInt = f.lift(function(bytebuf, value) { return bytebuf.writeVNum(value); });
  exports.encodeVInt = f.lift(checkedWriteVInt);
  exports.encodeVLong = f.lift(checkedWriteVLong);
  exports.encodeObject = f.lift(checkedWriteObject);
  exports.encodeBytes = f.lift(checkedWriteBytes);

  //exports.encodeUByte = f.lift(doEncodeUByte, _.identity);
  //exports.encodeVInt = f.lift(doEncodeVInt, _.identity);
  //exports.encodeVLong = f.lift(doEncodeVLong, _.identity);
  //exports.encodeObject = f.lift(doEncodeObject, _.identity);
  //exports.encodeBytes = f.lift(doEncodeBytes, _.identity);

  var decodeVNum = f.lift(
    function(bytebuf) { return bytebuf.readVNum(); },
    function(bytebuf, vnum) { return bytebuf.skip(vnum.length); }
  );

  exports.decodeUByte = f.lift(
    function(bytebuf) { return bytebuf.readUInt8(); },
    function(bytebuf) { return bytebuf.skipUInt8(); }
  );
  exports.decodeVInt = decodeVNum;
  exports.decodeVLong = decodeVNum;
  exports.decodeObject = f.lift(
    function(bytebuf) { return bytebuf.readObject(); },
    function(bytebuf, obj) { return bytebuf.skip(obj.length); }
  );
  exports.decodeBytes = f.lift(
    function(bytebuf, num) { return bytebuf.readBytes(num); },
    function(bytebuf, bytes) { return bytebuf.skip(bytes.length); }
  );

  //exports.decodeUByte = f.lift(doDecodeUByte, _.identity);
  //exports.decodeVInt = f.lift(doDecodeVInt, _.identity);
  //exports.decodeVLong = f.lift(doDecodeVLong, _.identity);
  //exports.decodeObject = f.lift(doDecodeObject, _.identity);
  //exports.decodeBytes = f.lift(doDecodeBytes, _.identity);

  //exports.lastDecoded = function(values, state) {
  //  return _.last(values);
  //  //return values[0];
  //};
  //
  //exports.allDecoded = function(values, state) {
  //  return values;
  //};

  exports.last = function(n) {
    return function(values, state) {
      if (f.existy(n) && n > 0) {
        return _.map(_.last(values, n), function(vnum) {
          return _.has(vnum, 'value') ? vnum.value : vnum;
        });
      }
      var value = _.last(values);
      return _.has(value, 'value') ? value.value : value;
    };
  };

  exports.all = function(values, state) {
    var extracted = _.map(values, function(value) {
      return _.has(value, 'value') ? value.value : value;
    });
    return f.cat(extracted, state);
  };

  exports.trim = function(values, state) {
    return state.trim();
  };

  //exports.bytesEncoded = function(values, state) {
  //  // If buffer is too big, slice it up so that it can be sent
  //  // immediately without any further modifications.
  //  var bytes = values[values.length - 1];
  //  if (bytes < state.buf.length)
  //    state.buf = state.buf.slice(0, bytes);
  //
  //  return bytes;
  //};

  //function doEncodeUByte(bytebuf, num) {
  //  return _.compose(updateEncOffset(bytebuf), checkedWriteUByte(bytebuf))(num);
  //}

  //function doEncodeVInt(bytebuf, num) {
  //  return _.compose(updateEncOffset(bytebuf), checkedWriteVInt(bytebuf))(num);
  //}

  //function doEncodeVLong(bytebuf, num) {
  //  return _.compose(updateEncOffset(bytebuf), checkedWriteVLong(bytebuf))(num);
  //}

  function doEncodeObject(bytebuf, obj) {
    return _.compose(updateEncOffset(bytebuf), checkedWriteObject(bytebuf))(obj);
  }

  function doEncodeBytes(bytebuf, bytes) {
    return _.compose(updateEncOffset(bytebuf), checkedWriteBytes(bytebuf))(bytes);
  }

  var nullCheck = f.validator('must not be null', f.existy);
  var number = f.validator('must be a number', _.isNumber);
  var positiveOrZero = f.validator('must be >= 0', f.greaterThan(-1));
  var intTooBig = f.validator('must be less than 2^31', f.lessThan(Math.pow(2, 31)));
  var longTooBig = f.validator('must be less than 2^53 (javascript safe integer limitation)',
                               f.lessThan(Math.pow(2, 53)));

  function checkedWriteUByte(bytebuf, value) {
    return f.partial1(f.condition1(number, positiveOrZero), uncheckedWriteUByte(bytebuf))(value);
  }

  function checkedWriteVInt(bytebuf, value) {
    return f.partial1(f.condition1(number, positiveOrZero, intTooBig), uncheckedWriteVNum(bytebuf))(value);
  }

  function checkedWriteVLong(bytebuf, value) {
    return f.partial1(f.condition1(number, positiveOrZero, longTooBig), uncheckedWriteVNum(bytebuf))(value);
  }

  function checkedWriteObject(bytebuf, obj) {
    return f.partial1(f.condition1(nullCheck), uncheckedWriteObject(bytebuf))(obj);
  }

  function checkedWriteBytes(bytebuf, bytes) {
    return f.partial1(f.condition1(nullCheck), uncheckedWriteBytes(bytebuf))(bytes);
  }

  function updateEncOffset(bytebuf) {
    return function(offset) {
      bytebuf.offset = offset;
      return offset;
    }
  }

  function uncheckedWriteUByte(bytebuf) {
    //return function(bytebuf, value) { return bytebuf.writeUInt8(value); };
    return function(value) {
      return bytebuf.writeUInt8(value);
      //return bytebuf.buf.writeUInt8(byte, bytebuf.offset);
    }
  }

  function uncheckedWriteVNum(bytebuf) {
    return function(value) {
      return bytebuf.writeVNum(value);
      //var localOffset = bytebuf.offset;
      //
      //while(num >= INT) {
      //  bytebuf.buf.writeUInt8((num & 0xFF) | MSB, localOffset++);
      //  num /= 128
      //}
      //while(num & MSBALL) {
      //  bytebuf.buf.writeUInt8((num & 0xFF) | MSB, localOffset++);
      //  num >>>= 7
      //}
      //bytebuf.buf.writeUInt8(num | 0, localOffset);
      //
      //return localOffset + 1;
    }
  }

  function uncheckedWriteObject(bytebuf) {
    return function(obj) {
      return bytebuf.writeObject(obj);
      //if (_.isString(obj)) {
      //  var stringNumBytes = Buffer.byteLength(obj);
      //  var offsetAfterBytes = uncheckedWriteVNum(bytebuf)(stringNumBytes);
      //  return bytebuf.buf.write(obj, offsetAfterBytes) + offsetAfterBytes;
      //} else {
      //  throw new Error('Not handled yet: ' + obj);
      //}
    }
  }

  function uncheckedWriteBytes(bytebuf) {
    return function(bytes) {
      return bytebuf.writeBytes(bytes);
      //var targetStart = bytebuf.offset;
      //bytes.copy(bytebuf.buf, targetStart);
      //return targetStart + bytes.length;
    }
  }

  function doDecodeUByte(bytebuf) {
    return uncheckedReadUByte(bytebuf)();
  }

  function doDecodeVInt(bytebuf) {
    return uncheckedReadVNum(bytebuf)();
  }

  function doDecodeVLong(bytebuf) {
    return uncheckedReadVNum(bytebuf)();
  }

  function doDecodeObject(bytebuf) {
    return uncheckedReadObject(bytebuf)();
  }

  function doDecodeBytes(bytebuf, num) {
    return uncheckedReadBytes(bytebuf)(num);
  }

  function uncheckedReadUByte(bytebuf) {
    return function() {
      return bytebuf.buf.readUInt8(bytebuf.offset++);
    }
  }

  function uncheckedReadVNum(bytebuf) {
    return function() {
      var res = 0, shift  = 0, b;

      do {
        b = bytebuf.buf.readUInt8(bytebuf.offset++);
        res += shift < 28
            ? (b & REST) << shift
            : (b & REST) * Math.pow(2, shift);
        shift += 7;
      } while (b >= MSB);

      return res
    }
  }

  function uncheckedReadBytes(bytebuf) {
    return function(num) {
      var end = bytebuf.offset + num;
      var bytes = bytebuf.buf.slice(bytebuf.offset, end);
      bytebuf.offset = end;
      return bytes;
    }
  }

  function uncheckedReadObject(bytebuf) {
    return function() {
      var numBytes = uncheckedReadVNum(bytebuf)();
      var obj = bytebuf.buf.toString(undefined, bytebuf.offset, bytebuf.offset + numBytes);
      bytebuf.offset = bytebuf.offset + numBytes;
      return obj;
    }
  }

}.call(this));
