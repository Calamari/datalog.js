var Datalog = require('../src/datalog.js');

describe('Datalog', function() {
  var datalog;
  it('can insert facts directly into contsructor', function() {
    datalog = new Datalog('son(bob,bill)');
    // TODO: how to test here?
  });
});
