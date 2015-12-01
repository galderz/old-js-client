// Commons functions

var f = require('../../lib/functional');

exports.put = function put(k, v, opts) {
  return function(client) {
    return client.put(k, v, opts);
  }
};

exports.putIfAbsent = function putIfAbsent(k, v, opts) {
  return function(client) {
    return client.putIfAbsent(k, v, opts);
  }
};

exports.replace = function replace(k, v, opts) {
  return function(client) {
    return client.replace(k, v, opts);
  }
};

exports.containsKey = function containsKey(k) {
  return function(client) {
    return client.containsKey(k);
  }
};

exports.assert = function assert(fun, expectFun) {
  if (f.existy(expectFun)) {
    return function(client) {
      return fun(client).then(function(value) {
        expectFun(value);
        return client;
      });
    }
  }
  return function(client) {
    return fun(client).then(function() {
      return client;
    });
  }
}