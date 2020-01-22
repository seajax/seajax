build:
	@python Build/Scripts/seajax_v2.py

pivot:
	@python Build/Scripts/seajax_v2.py pivot

collegevine:
	@python Build/Scripts/seajax_v2.py collegevine

lint:
	@./node_modules/.bin/jshint v2/src/

.PHONY: build lint
