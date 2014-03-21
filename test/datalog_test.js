var Datalog = require('../src/datalog.js');

describe('Datalog', function() {
  var datalog;
  it('throws error if . is missing', function() {
    expect(function() {
      new Datalog('+son(bob,bill)');
    }).to.throwError(new RegExp('Syntax error: Missing ending .'));
  });
});
