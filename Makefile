build:
	@python Build/Scripts/seajax_v2.py

lint:
	@./node_modules/.bin/jshint v2/src/

.PHONY: build lint
