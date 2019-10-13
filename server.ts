import fastify from 'fastify';
import sensible from 'fastify-sensible';
import cors from 'fastify-cors';

import nedb from 'nedb-promises';
import minimist from 'minimist';
import { Option } from 'prelude-ts';

import * as git from 'isomorphic-git';

import fs from 'fs';
import path from 'path';

const argv = minimist(process.argv.slice(2));

if (argv._.length == 0) {
  throw new Error('usage: nanocrud <config.json>');
}

const isDirectory = (path: string) => 
  fs.existsSync(path) && fs.statSync(path).isDirectory();

const config = JSON.parse(fs.readFileSync(argv._[0]).toString());
const dataDir = config.data;

const gitAuthor = config.git.author;

if (!dataDir || !isDirectory(dataDir)) {
  fs.mkdirSync(dataDir);
}

const server = fastify({
  logger: { level: config.logLevel || 'info' }
});

server.register(sensible);

server.register(cors, {
  origin: config.origin || '*'
});

git.plugins.set('fs', fs);
const gitDir = path.join(dataDir, '.git');

if (!fs.existsSync(gitDir)) {
  git.init({
    dir: dataDir
  }).then(() =>
    server.log.info(`initialized git repo at ${dataDir}/.git`)
  );
}

const dbCache: Map<string, nedb> = new Map();

const openDb = (name: string) => {
  if (dbCache.has(name)) {
    return dbCache.get(name);
  }

  const basename = path.basename(name);
  const fullPath = path.join(dataDir, basename);
  
  const db = nedb.create({
    filename: fullPath,
    autoload: true,
    timestampData: true
  });

  fs.watchFile(fullPath, { persistent: false }, (curr, prev) => {
    if (curr.mtime > prev.mtime) {
      git.add({ dir: dataDir, filepath: basename });
    }
  })

  dbCache.set(name, db);
  return db;
};

process.on('SIGUSR2', async e =>
  Promise.all(Array.from(dbCache.keys()).map(async name => {
    const db = dbCache.get(name);

    if (db) {
      // okay, sometimes the type checker really isn't doing us any favors...like when
      // the typings have a big hole named 'persistence'
      Option.of((db as any).persistence).map(async (p: any) => await p.compactDatafile());
    }

    return await git.add({ dir: dataDir, filepath: path.basename(name) })
  })).then(async () => await git.commit({
    dir: dataDir,
    message: 'automatic commit based on signal',
    author: gitAuthor
  }))
);

if (config.keys) {
  server.register(
    require('fastify-bearer-auth'),
    { keys: new Set(config.keys) }
  );
}

const paginationQuerySchema = {
  skip: { type: 'number' },
  limit: { type: 'number' }
}

const tryOpenDb = async (name: string | undefined) =>
  await openDb((Option.of(name).getOrThrow())) as nedb;

server.route({
  url: '/db/:name',
  method: 'GET',
  schema: {
    querystring: paginationQuerySchema
  },
  handler: async (req, reply) => 
    reply.send((await tryOpenDb(req.params.name)).find(req.body))
});

server.route({
  url: '/db/:name',
  method: 'POST',
  handler: async (req, reply) =>
    reply.send((await tryOpenDb(req.params.name)).insert(req.body))
});

server.route({
  url: '/db/:name/update',
  method: 'POST',
  schema: {
    querystring: paginationQuerySchema,
    body: {
      type: 'object',
      required: ['query', 'update'],
      properties: {
        where: { type: 'object' },
        with: { type: 'object' }
      }
    }
  },
  handler: async (req, reply) => 
    reply.send((await tryOpenDb(req.params.name)).update(req.body.where, req.body.with)
    )
});

server.route({
  url: '/db/:name',
  method: 'DELETE',
  handler: async (req, reply) => 
    reply.send((await tryOpenDb(req.params.name)).remove(req.body, {multi: true}))
});

server.listen(config.port || 9080);