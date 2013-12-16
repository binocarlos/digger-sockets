build: install
	@echo build ...
	@mkdir -p build
	@./node_modules/.bin/browserify -r \
		./src/browser.js > build/build.js

test: build
	@cp -f build/build.js test/browser.js
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter spec \
		--timeout 300 \
		--require should \
		--growl \
		test/test.js
	@rm -rf test/browser.js

install:
	npm install

.PHONY: test