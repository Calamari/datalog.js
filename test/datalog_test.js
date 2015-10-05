var Datalog = require('../src/datalog.js');

describe('Datalog', function() {
  var datalog;
  it('can insert facts directly into contsructor', function() {
    datalog = new Datalog('+son(bob,bill).');
    // TODO: how to test here?
    expect(datalog.query('son(bob,bill).')).to.equal(true);
  });

  it('throws error if . is missing', function() {
    expect(function() {
      new Datalog('+son(bob,bill)');
    }).to.throwError(new RegExp('Syntax error: Missing ending .'));
  });
});
