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

  function extend(subClass, superClass) {
    var F = function() {};
    F.prototype = superClass.prototype;
    subClass.prototype = new F();
    subClass.prototype.constructor = subClass;
  }

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
// Detection can be optimized: http://jsperf.com/char-testing
  function Input(tokens) {
    this.tokens = tokens;
  }

  function Term() {}
  Term.create = function(tokens) {
    var type = tokens[0].type,
        i    = 0,
        head, body, fact;

    // Starts at current i and tries reading a fact e.g. father(a,b,c)
    // Returns as Fact object
    function readFact() {
      var name = tokens[i].toString(),
          parameters = [];

      if (tokens[i+1].type !== OPEN_PARAM) {
        throw new Error('Could not parse term ' + tokens.join(''));
      }

      do {
        i += 2;
        type = tokens[i].type;
        if (type === LOWER_IDENTIFIER) {
          parameters.push(new Term.Constant(tokens[i].toString()));
        } else if (type === UPPER_IDENTIFIER) {
          parameters.push(new Term.Variable(tokens[i].toString()));
        }
      } while(tokens[i+1].type === AND);

      i += 1;
      if (tokens[i].type !== CLOSE_PARAM) {
        throw new Error('Could not parse term ' + tokens.join(''));
      }

      return new Term.Fact(name, parameters);
    }

    if (tokens.length === 1) {
      switch (type) {
      case PLUS:
        return new Term.EnterWriteMode();
      case MINUS:
        return new Term.EnterQuestionMode();
      case LOWER_IDENTIFIER:
        return new Term.Predicate(tokens[0].toString());
      default:
        throw new Error('Could not parse term ' + tokens.join(''));
      }
    } else if (type === LOWER_IDENTIFIER) {
      fact = readFact();

      type = tokens[i+1].type;
      if (type === POINT) {
        return fact;
      } else if (type === TURNSTILE) {
        head = fact;
        body = [];

        do {
          i += 2;
          body.push(readFact());
        } while(tokens[i+1].type === AND);
        return new Term.Rule(head, body);
      } else {
        throw new Error('Could not parse term ' + tokens.join(''));
      }
    } else {
      throw new Error('Could not parse term ' + tokens.join(''));
    }
  };

  Term.EnterWriteMode = function EnterWriteMode() {
  }
  extend(Term.EnterWriteMode, Term);

  Term.EnterQuestionMode = function EnterQuestionMode() {
  }
  extend(Term.EnterQuestionMode, Term);

  Term.Predicate = function Predicate(value) {
    this.value = value;
  }
  extend(Term.Predicate, Term);

  Term.Constant = function Constant(value) {
    this.value = value;
  }
  extend(Term.Constant, Term);

  Term.Variable = function Variable(value) {
    this.value = value;
  }
  extend(Term.Variable, Term);

  Term.Fact = function Fact(name, parameters) {
    this.name = name;
    this.parameters = parameters;
  }
  extend(Term.Fact, Term);

  Term.Rule = function Rule(head, body) {
    this.head = head;
    this.body = body;
  }
  extend(Term.Rule, Term);



  function removeComments(str) {
    return str.replace(/\/\*.*?\*\//, '');
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

    inputStr = removeComments(inputStr);

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
        terms.push(Term.create(tokens));
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

    console.log('"' + inputStr + '" contains ' + terms.length + ' term(s):');
    console.log(terms);
  }

  exports.Datalog = Datalog;
}(window));
