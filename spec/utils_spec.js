var utils = require('../lib/utils');

var t = require('./utils/testing'); // Testing dependency

describe('A replayable buffer', function() {
  it('can have byte buffers appended to it', function() {
    var data = utils.replayableBuffer(0);
    data.append(new Buffer([48, 49, 50]));
    t.expectToBeBuffer(data.asBuffer(), new Buffer([48, 49, 50]));
  });
  it('can have byte buffers appended to it beyond its initial size', function() {
    var data = utils.replayableBuffer(0);
    data.append(new Buffer([48, 49, 50]));
    t.expectToBeBuffer(data.asBuffer(), new Buffer([48, 49, 50]));
  });
  it('can be appended multiple times without reading', function() {
    var data = utils.replayableBuffer(0);
    data.append(new Buffer([48, 49, 50]));
    data.append(new Buffer([51, 52, 53]));
    t.expectToBeBuffer(data.asBuffer(), new Buffer([48, 49, 50, 51, 52, 53]));
  });
});