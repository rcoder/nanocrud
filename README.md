# nanocrud

> mongo is too hard, why don't we just wrap json files in an http interface?

`yarn run demo` => live dev server using the example config

`yarn run build` => generate JS bundle from TS sources

`./test.sh` => insert a new document into the database; if the demo server is running, this should echo back the inserted document and update the `test` database in `/tmp/nanocrud-demo`