# rljson

rljson: Define and manage relational data structures in JSON

![rljson](https://github.com/inlavigo/rljson/raw/main/rljson.webp)

## Motivation

Relational data structures are foundational for representing complex
relationships between entities, but traditional relational databases often
require heavy frameworks or specific query languages. By defining relational
data structures in JSON, developers gain the flexibility to work with structured
and interconnected data in a lightweight, human-readable format that's widely
supported across platforms and programming environments. `rljson` simplifies
data exchange in APIs, enhances compatibility with SQL and NoSQL databases, and
supports use cases where lightweight data representation is crucial, all while
preserving the benefits of relational modeling.

## Features

- Define independent or interconnected tables
- Link and access fields across tables
- Deep 128bit hashing
- Immutable state
- No duplicates through hashes

## Example

```js
import { JsonHash } from 'gg-json-hash';
import { Rljson } from '../src/rljson.js';

const jh = JsonHash.default;

// .............................................................
console.log('Create tables');

let db = Rljson.fromJson({
  tableA: {
    _data: [{ a: 'a0' }, { a: 'a1' }],
  },
  tableB: {
    _data: [{ b: 'b0' }, { b: 'b1' }],
  },
});

// .............................................................
console.log('Each item in the table gets an content based hash code');

const hashA0 = db.hash({ table: 'tableA', index: 0 });
const hashA1 = db.hash({ table: 'tableA', index: 1 });
const hashB0 = db.hash({ table: 'tableB', index: 0 });
const hashB1 = db.hash({ table: 'tableB', index: 1 });

// .............................................................
console.log('The hashcode can be used to access data');
const a0 = db.get({ table: 'tableA', item: hashA0, key1: 'a' });
console.log(a0); // a0

const a1 = db.get({ table: 'tableA', item: hashA1, key1: 'a' });
console.log(a1); // a1

const b0 = db.get({ table: 'tableB', item: hashB0, key1: 'b' });
console.log(b0); // b0

const b1 = db.get({ table: 'tableB', item: hashB1, key1: 'b' });
console.log(b1); // b1

// .............................................................
console.log('Add and merge additional data. The original table is not changed');

db = db.addData({
  tableA: {
    _data: [{ a: 'a2' }],
  },
  tableB: {
    _data: [{ b: 'b2' }],
  },
  tableC: {
    _data: [{ c: 'c0' }],
  },
});

// .............................................................
console.log('Print a list of all values in the database');
const allPaths = db.ls();
console.log(allPaths.map((path) => `- ${path}`).join('\n'));

// .............................................................
console.log('Create interconnected tables');

db = Rljson.fromJson({
  a: {
    _data: [
      {
        value: 'a',
      },
    ],
  },
});

const tableAValueHash = db.hash({ table: 'a', index: 0 });

db = db.addData({
  b: {
    _data: [
      {
        aRef: tableAValueHash,
      },
    ],
  },
});

const tableBValueHash = db.hash({ table: 'b', index: 0 });

// .............................................................
console.log('Join tables when reading values');

const a = db.get({
  table: 'b',
  item: tableBValueHash,
  key1: 'aRef',
  key2: 'value',
});

console.log(a); // a

// .............................................................
console.log('To hash data in advance use gg_json_hash');
const hashedData = jh.apply({
  tableA: {
    _data: [{ a: 'a0' }, { a: 'a1' }],
  },
});

console.log('Validate hashes when adding data');
db = Rljson.fromJson(hashedData, { validateHashes: true });
```

## Contribute

Contributions are welcome! To contribute:

- Fork the repository on [GitHub](https://github.com/inlavigo/rljson-js.git).
- Make your changes in your forked repository.
- Submit a pull request to the main branch of this repository.
- Thank you for helping improve this package! 😊
