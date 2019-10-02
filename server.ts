import fastify from 'fastify';
import sensible from 'fastify-sensible';
import cors from 'fastify-cors';

import nedb from 'nedb-promises';
import minimist from 'minimist';

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

if (!dataDir || !isDirectory(dataDir)) {
  fs.mkdirSync(dataDir);
  //throw new Error(`data directory ${dataDir} does not exist, or is not a directory`);
}

const openDb = (name: string) => nedb.create({
  filename: path.join(dataDir, path.basename(name)),
  autoload: true,
  timestampData: true
});

const server = fastify({
  logger: { level: config.logLevel || 'info' }
});

server.register(sensible);

server.register(cors, {
  origin: config.origin || '*'
});

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

server.route({
  url: '/db/:name',
  method: 'GET',
  schema: {
    querystring: paginationQuerySchema
  },
  handler: async (req, reply) => 
    reply.send(await openDb(req.params.name).find(req.body))
});

server.route({
  url: '/db/:name',
  method: 'POST',
  handler: async (req, reply) =>
    reply.send(await openDb(req.params.name).insert(req.body))
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
    reply.send(await
      openDb(req.params.name).update(req.body.where, req.body.with)
    )
});

server.route({
  url: '/db/:name',
  method: 'DELETE',
  handler: async (req, reply) => 
    reply.send(await
      openDb(req.params.name).remove(req.body, {multi: true})
    )
});

server.listen(config.port || 9080);