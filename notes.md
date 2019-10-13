# A Few Notes About NeDB + Git

These are actually two great tastes that taste even better together.

Because of the way NeDB behaves when compacting data files (i.e., it sorts by key
while compacting) "appends" to the database actually show up as nice clean internal
diffs of just the modified/added objects, rather than causing tons of churn and merge
conflicts at the tail of the file so long as you compact before committing.

In a (perhaps ill-advised; need benchmarks!) effort to make actual snapshots cheap
to capture, we stage the datafiles after each mutation, then compact and commit when
the server receives a USR2 signal.

This means we _should_ have a reasonable working tree, staging index (basically the 
working state of all files) and "transactions" delimited by commits.

TODO: add signing either via normal git+pgp signatures, or a more lightweight signature
embedded in the automatic commit message (need to investigate client behavior when tag
signatures are in non-standard formats)

TODO: expose the same auto-commit hook as an API method, mapped to a "transaction" model
that tracks "safe" commits associated with a transaction boundary

These databases should be trivially sync-able using any method that git supports:
"live" push/pull against an upstream origin, copy to a local clone, or even archiving
to removable or network-attached storage.

Another interesting note: symbol-keyed properties of objects aren't serialized to JSON,
so they're a handy place to put ephemeral or computed state
