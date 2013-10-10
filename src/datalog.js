/*
  The EBNF for Datalog (mentioned in http://nickelsworth.github.io/sympas/16-datalog.html#sec-3-1)
  input  ::=
          [   '+'
            | '-'
            | atom { ':-' formula } '.'
            | formula '.' ]
  formula  ::=  atom { ',' formula }
  atom  ::=  predicate { '(' parameterlist ')' }
  parameterlist  ::=  parameter { ',' parameterlist }
  parameter  ::=  variable | name
  predicate  ::=  l-identifier
  name  ::=  l-identifier
  variable  ::=  u-identifier
  l-identifier  ::=  lowercase letter,
                     followed by further letters, digits and underscores
  u-identifier  ::=  uppercase letter,
                     followed by further letters, digits and underscores
*/
(function(exports) {
  'use strict';

  var LOWER_IDENTIFIER = 1,
      UPPER_IDENTIFIER = 2,
      PLUS             = 3,
      MINUS            = 4,
      POINT            = 5,
      AND              = 6,
      TURNSTILE        = 7,
      OPEN_PARAM       = 8,
      CLOSE_PARAM      = 9,

      lowerLetter = 'abcdefghijklmnopqrstuvwxyz',
      upperLetter = lowerLetter.toUpperCase(),
      digit       = '0123456789',
      underscore  = '_',
      anyLetter   = lowerLetter + upperLetter + digit + underscore;

  function Input(tokens) {
    this.tokens = tokens;
  }

  function Token(chr) {
    this.chars = [chr];
    this.finished = false;
    if (lowerLetter.indexOf(chr) !== -1) {
      this.type = LOWER_IDENTIFIER;
      this.nextChar = anyLetter;
    } else if (upperLetter.indexOf(chr) !== -1) {
      this.type = UPPER_IDENTIFIER;
      this.nextChar = anyLetter;
    } else if (chr === '+') {
      this.type = PLUS;
      this.finished = true;
    } else if (chr === '-') {
      this.type = MINUS;
      this.finished = true;
    } else if (chr === '.') {
      this.type = POINT;
      this.finished = true;
    } else if (chr === ',') {
      this.type = AND;
      this.finished = true;
    } else if (chr === ':') {
      this.type = TURNSTILE;
      this.nextChar = '-';
    } else if (chr === '(') {
      this.type = OPEN_PARAM;
      this.finished = true;
    } else if (chr === ')') {
      this.type = CLOSE_PARAM;
      this.finished = true;
    } else {
      this.type = null;
    }
  }

  Token.prototype.accepts = function(chr) {
    if (!this.finished) {
      return this.nextChar.indexOf(chr) !== -1;
    } else {
      return false;
    }
  };

  Token.prototype.add = function(chr) {
    this.chars.push(chr);
  };

  Token.prototype.toString = function() {
    return this.chars.join('');
  };

  Token.prototype.isTokenEnd = function() {
    return this.type === POINT || this.type === PLUS || this.type === MINUS;
  };

  function Lexer(inputStr) {
    var currentToken = null,
        tokens       = [],
        terms        = [],
        i,l, charCode;

    for (i=0,l=inputStr.length; i<l; ++i) {
      charCode = inputStr[i].charCodeAt();
      // skip if it is a whitespace char
      if (charCode <= 32) {
        continue;
      }

      if (!currentToken) {
        currentToken = new Token(inputStr[i]);
      } else {
        if (currentToken.accepts(inputStr[i])) {
          currentToken.add(inputStr[i]);
        } else {
          tokens.push(currentToken);
          currentToken = new Token(inputStr[i]);
        }
      }

      if (currentToken.type === null) {
        throw new Error('Syntax error/unrecognized token ' + inputStr[i] + ' (charCode: ' + charCode + ')');
      }

      if (currentToken.isTokenEnd()) {
        tokens.push(currentToken);
        terms.push(new Input(tokens));
        tokens = [];
        currentToken = null;
      }
    }
    return {
      terms: terms
    };
  }

  function Datalog(inputStr) {
    var lexer = new Lexer(inputStr),
        terms = lexer.terms;

    console.log('"' + inputStr + '" contains ' + terms.length + ' sentence(s):');
    terms.forEach(function(input) {
      console.log('tokens:', input.tokens.map(function(t) { return t.toString(); }));
    });
  }

  exports.Datalog = Datalog;
}(window));
