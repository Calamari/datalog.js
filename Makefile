TESTS = $(shell find test -name "*test.js")

test:
	./node_modules/.bin/mocha --reporter list $(TESTS)

.PHONY: test
