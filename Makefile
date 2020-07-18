.PHONY: all clean deps dist check-device-spec


CC = closure-compiler
CC_OPTS = --charset UTF-8
# --language_out ECMASCRIPT5 もしくは ECMASCRIPT5_STRICT を指定してもよい


VA5_SRCS := src/va5_license.js src/polyfill.js $(wildcard src/va5/*.js) src/va5_version.js src/va5_interface.js src/va5_ccinfo.js
CC_OPTS_JS := $(addprefix --js=,$(VA5_SRCS))





all: dist ;


clean:
	-rm -f .*-ok dist/*


.deps-ok:
	$(CC) --version
	jq --version
	node --version
	touch .deps-ok


deps: .deps-ok ;


src/va5_version.js: deps package.json
	echo '(function(exports) { "use strict"; var va5 = exports.va5 || {}; exports.va5 = va5; va5.version =' `cat package.json|jq .version` '; })(this);' > src/va5_version.js


src/va5_license.js: deps LICENSE
	node -e 'var lineNo = 0; require("fs").readFileSync("LICENSE", "utf-8").split("\n").forEach(function (line) { process.stdout.write((lineNo++ ? " * " : "/** @license ") + line + "\n"); }); process.stdout.write(" */\n");' > src/va5_license.js


src/va5_ccinfo.js: deps
	echo '/** @preserve' `$(CC) --version` '*/' > src/va5_ccinfo.js


dist/va5.js: src/*.js src/va5/*.js
	mkdir -p dist
	$(CC) $(CC_OPTS) $(CC_OPTS_JS) --compilation_level WHITESPACE_ONLY --js_output_file dist/va5.js


dist/va5_externs.js: deps dist/va5.js
	node -e 'var modules = require("./dist/va5.js"); console.log("var va5 = {};"); Object.keys(modules.va5).filter(function (k) { return !!k.match(/^[a-z]/); }).sort().forEach(function (k) { console.log("va5."+k+";"); });' > dist/va5_externs.js


dist/va5.min.js: deps dist/va5.js dist/va5_externs.js src/internal_externs.js
	$(CC) $(CC_OPTS) $(CC_OPTS_JS) --compilation_level ADVANCED --js_output_file dist/va5.min.js --create_source_map dist/va5.min.js.map --externs dist/va5_externs.js --externs src/internal_externs.js


.device-spec-ok: deps dist/va5.js
	node -e 'var va5 = require("./dist/va5.js").va5; var waKeys = Object.keys(va5.Devices.WebAudio).sort(); var dumbKeys = Object.keys(va5.Devices.Dumb).sort(); if (JSON.stringify(waKeys) !== JSON.stringify(dumbKeys)) { console.log("WebAudio", waKeys); console.log("Dumb", dumbKeys); console.log("mismatched device-spec"); process.exitCode = 1; }'
	touch .device-spec-ok


check-device-spec: .device-spec-ok ;


dist: clean deps check-device-spec dist/va5.min.js
	# TODO: zipとかに固めたりする


# TODO: npmにデプロイしたりできるようにする
