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

  TODO:
   - Datalog.insert for inserting more stuff
   - Datalog.query for querying the knowledge base
   - negation (that is not in the EBNF above :-/)
   - & character
   - Parser for Prefix Notation

   read here as well: http://artint.info/html/ArtInt_281.html
*/
(function(exports) {
  'use strict';

  function extend(subClass, superClass) {
    var F = function() {};
    F.prototype = superClass.prototype;
    subClass.prototype = new F();
    subClass.prototype.constructor = subClass;
  }

  function uniq(arr) {
    var result = [],
        i,l;

    for (i=0,l=arr.length; i<l; ++i) {
      if (result.indexOf(arr[i]) === -1) {
        result.push(arr[i]);
      }
    }
    return result;
  }

  function flatten(arr) {
    var result = [];
    return result.concat.apply(result, arr);
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
      NOT              = 10,

      lowerLetter = 'abcdefghijklmnopqrstuvwxyz',
      upperLetter = lowerLetter.toUpperCase(),
      digit       = '0123456789',
      underscore  = '_',
      anyLetter   = lowerLetter + upperLetter + digit + underscore;
// Detection can be optimized: http://jsperf.com/char-testing

  function SymbolTable() {
    this.db = {};
  }
  SymbolTable.prototype.includes = function(element) {
    return !!this.db[element];
  };
  SymbolTable.prototype.get = function(element) {
    return this.db[element];
  };
  SymbolTable.prototype.add = function(element, term) {
    if (!this.db[element]) {
      this.db[element] = [];
    }
    this.db[element].push(term);
  };
  SymbolTable.prototype.remove = function(element, term) {
    if (this.db[element]) {
      var index = this.db[element].indexOf(term);
      if (index !== -1) {
        this.db[element].splice(index, 1);
      }
    }
  };

  function Term() {}

  Term.prototype.getVariables = function() { return []; };
  Term.prototype.getConstants = function() { return []; };
  Term.prototype.getPredicates = function() { return []; };

  Term.create = function(tokens) {
    var type = tokens[0].type,
        i    = 0,
        head, body, atom, atoms;

    // Starts at current i and tries reading an atom e.g. father(a,b,c)
    // Returns as Atom object
    function readAtom() {
      var parameters = [],
          name,
          negated;

      if (tokens[i].type === NOT) {
        negated = true;
        i += 1;
      } else {
        negated = false;
      }
      name = tokens[i].toString();

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

      return new Term.Atom(name, parameters, negated);
    }

    if (tokens.length === 1) {
      switch (type) {
      case PLUS:
        return new Term.EnterWriteMode();
      case MINUS:
        return new Term.EnterQuestionMode();
      case LOWER_IDENTIFIER:
        return new Term.Atom(tokens[0].toString());
      default:
        throw new Error('Could not parse term ' + tokens.join(''));
      }
    } else if (type === LOWER_IDENTIFIER) {
      atom = readAtom();

      type = tokens[i+1].type;
      if (type === POINT) {
        return atom;
      } else if (type === AND) {
        atoms = [atom];
        while (type === AND) {
          i += 2;
          atoms.push(readAtom());
        }
        return new Term.Formula(atoms);
      } else if (type === TURNSTILE) {
        head = atom;
        body = [];

        do {
          i += 2;
          body.push(readAtom());
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
  };
  extend(Term.EnterWriteMode, Term);

  Term.EnterQuestionMode = function EnterQuestionMode() {
  };
  extend(Term.EnterQuestionMode, Term);

  Term.Atom = function Atom(predicate, parameters, negated) {
    this.predicate = predicate;
    this.parameters = parameters;
    this.negated = negated;
  };
  extend(Term.Atom, Term);
  Term.Atom.prototype.getPredicates = function() { return [this.predicate]; };
  Term.Atom.prototype.getConstants = function() {
    var constants = this.parameters.map(function(p) {
      return p.getConstants();
    });
    return uniq(flatten(constants));
  };
  Term.Atom.prototype.getVariables = function() {
    var variables = this.parameters.map(function(p) {
      return p.getVariables();
    });
    return uniq(flatten(variables));
  };

  Term.Formula = function Formula(atoms) {
    this.atoms = atoms;
  };
  extend(Term.Formula, Term);
  Term.Formula.prototype.getVariables = function() {
    var variables = this.atoms.map(function(atom) {
      return atom.getVariables();
    });
    return uniq(flatten(variables));
  };
  Term.Formula.prototype.getConstants = function() {
    var constants = this.atoms.map(function(atom) {
      return atom.getConstants();
    });
    return uniq(flatten(constants));
  };
  Term.Formula.prototype.getPredicates = function() {
    var predicates = this.atoms.map(function(atom) {
      return atom.getPredicates();
    });
    return uniq(flatten(predicates));
  };


  Term.Constant = function Constant(value) {
    this.value = value;
  };
  extend(Term.Constant, Term);
  Term.Constant.prototype.getConstants = function() { return [this.value]; };

  Term.Variable = function Variable(value) {
    this.value = value;
  };
  extend(Term.Variable, Term);
  Term.Variable.prototype.getVariables = function() { return [this.value]; };

  Term.Rule = function Rule(head, body) {
    this.head = head;
    this.body = body;
  };
  extend(Term.Rule, Term);
  Term.Rule.prototype.getVariables = function() {
    var variables = [ this.head.getVariables() ];
    this.body.forEach(function(t) {
      variables.push(t.getVariables());
    });
    return uniq(flatten(variables));
  };
  Term.Rule.prototype.getConstants = function() {
    var constants = [ this.head.getConstants() ];
    this.body.forEach(function(t) {
      constants.push(t.getConstants());
    });
    return uniq(flatten(constants));
  };
  Term.Rule.prototype.getPredicates = function() {
    var predicates = [ this.head.getPredicates() ];
    this.body.forEach(function(t) {
      predicates.push(t.getPredicates());
    });
    return uniq(flatten(predicates));
  };



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
    } else if (chr === ',' || chr === '&') {
      this.type = AND;
      this.finished = true;
    } else if (chr === '~') {
      this.type = NOT;
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

  function Parser(terms, tables) {
    var i, l, term;
    this.questionMode = false;

    for (i=0,l=terms.length; i<l; ++i) {
      term = terms[i];
      term.getVariables().forEach(function(v) {
        tables.variables.add(v, term);
      });
      term.getConstants().forEach(function(v) {
        tables.names.add(v, term);
      });
      term.getPredicates().forEach(function(v) {
        tables.predicates.add(v, term);
      });
    }
  }

  Parser.prototype.isEntering = function() {
    return !this.questionMode;
  };

  Parser.prototype.isAsking = function() {
    return this.questionMode;
  };

  function Lexer() {
    return {
      parse: function parse(inputStr) {
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
        return terms;
      }
    };
  }

  function Datalog(inputStr) {
    var lexer = new Lexer(),
        terms = [],

        // quick access for predicates
        predicatesTable = new SymbolTable(),
        // quick access for constants
        namesTable      = new SymbolTable(),
        // quick access for variables
        variablesTable  = new SymbolTable();

    function _parse(input) {
      var newTerms = lexer.parse(inputStr);
      terms = flatten([terms, newTerms]);
      console.log('"' + inputStr + '" contains ' + terms.length + ' term(s):');
      console.log(newTerms);
      new Parser(terms, {
        predicates: predicatesTable,
        names: namesTable,
        variables: variablesTable
      });
      console.log("Indextables now contain:", {
        predicates: predicatesTable,
        names: namesTable,
        variables: variablesTable
      });
    }

    _parse(inputStr);
  }

  exports.Datalog = Datalog;
  // this is window in browser and exports in node.js
}(this));
