// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { assert } from 'console';
import { beforeEach, expect, suite, test } from 'vitest';

import { Rljson } from '../src/rljson';

suite('Rljson', () => {
  let rljson: Rljson;
  let a0Hash: string;
  let a1Hash: string;
  let b0Hash: string;
  let b1Hash: string;

  beforeEach(() => {
    rljson = Rljson.example;
    a0Hash = rljson.hash({ table: 'tableA', index: 0 });
    a1Hash = rljson.hash({ table: 'tableA', index: 1 });
    b0Hash = rljson.hash({ table: 'tableB', index: 0 });
    b1Hash = rljson.hash({ table: 'tableB', index: 1 });

    assert(a0Hash.length === 22);
    assert(a1Hash.length === 22);
    assert(b0Hash.length === 22);
    assert(b1Hash.length === 22);
  });

  suite('ls()', () => {
    test('lists the paths of all items', () => {
      expect(rljson.ls()).toEqual([
        'tableA/KFQrf4mEz0UPmUaFHwH4T6/keyA0',
        'tableA/YPw-pxhqaUOWRFGramr4B1/keyA1',
        'tableB/nmejjLAUhygiT6WFDPPsHy/keyB0',
        'tableB/dXhIygNwNMVPEqFbsFJkn6/keyB1',
      ]);
    });
  });

  suite('fromData(data)', () => {
    test('adds hashes to all fields', () => {
      expect(rljson.data).toEqual({
        tableA: {
          [a0Hash]: {
            keyA0: 'a0',
            _hash: a0Hash,
          },
          [a1Hash]: {
            keyA1: 'a1',
            _hash: a1Hash,
          },
        },
        tableB: {
          [b0Hash]: {
            keyB0: 'b0',
            _hash: b0Hash,
          },
          [b1Hash]: {
            keyB1: 'b1',
            _hash: b1Hash,
          },
        },
      });
    });
  });

  suite('empty()', () => {
    test('returns an empty Rljson object', () => {
      const emptyRljson = Rljson.empty();
      expect(emptyRljson.data).toEqual({});
      expect(emptyRljson.originalData).toEqual({});
    });
  });

  suite('table(String table)', () => {
    suite('returns', () => {
      test('the table when existing', () => {
        const table = rljson.table('tableA');
        expect(table).toEqual({
          [a0Hash]: {
            keyA0: 'a0',
            _hash: a0Hash,
          },
          [a1Hash]: {
            keyA1: 'a1',
            _hash: a1Hash,
          },
        });
      });
    });

    suite('throws', () => {
      test('when table does not exist', () => {
        let exception;

        try {
          rljson.table('tableC');
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: Table not found: tableC');
      });
    });
  });

  suite('items(table, where)', () => {
    test('returns the items that match the query', () => {
      const items = rljson.items({
        table: 'tableA',
        where: (item) => item['keyA0'] === 'a0',
      });

      expect(items).toEqual([{ keyA0: 'a0', _hash: a0Hash }]);
    });
  });

  suite('row(table, hash)', () => {
    suite('returns', () => {
      test('the item when existing', () => {
        const item = rljson.row('tableA', a0Hash);
        expect(item).toEqual({
          keyA0: 'a0',
          _hash: a0Hash,
        });
      });
    });

    suite('throws', () => {
      test('when table is not available', () => {
        let exception;

        try {
          rljson.row('tableC', a0Hash);
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: Table not found: tableC');
      });

      test('when hash is not available', () => {
        let exception;

        try {
          rljson.row('tableA', 'nonExistingHash');
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: Item not found with hash "nonExistingHash" in table "tableA"',
        );
      });
    });
  });

  suite('value(table, itemHash, followLink)', () => {
    suite('returns', () => {
      test('the value of the key of the item with hash in table', () => {
        expect(
          rljson.value({
            table: 'tableA',
            itemHash: a0Hash,
            followLink: ['keyA0'],
          }),
        ).toBe('a0');
      });

      test('the complete item, when no key is given', () => {
        expect(rljson.value({ table: 'tableA', itemHash: a0Hash })).toEqual({
          keyA0: 'a0',
          _hash: a0Hash,
        });
      });

      test('the linked value, when property is a link', () => {
        rljson = Rljson.exampleWithLink;

        const tableALinkHash = rljson.hash({
          table: 'linkToTableA',
          index: 0,
        });

        expect(
          rljson.value({
            table: 'linkToTableA',
            itemHash: tableALinkHash,
            followLink: ['tableARef'],
          }),
        ).toEqual({ _hash: a0Hash, keyA0: 'a0' });
      });

      test('the linked value across multiple tables using key2 to key4', () => {
        rljson = Rljson.exampleWithDeepLink;
        const hash = Object.keys(rljson.data.a)[0];

        expect(
          rljson.value({
            table: 'a',
            itemHash: hash,
            followLink: ['bRef', 'cRef', 'dRef', 'value'],
          }),
        ).toBe('d');
      });
    });

    suite('throws', () => {
      test('when key does not point to a valid value', () => {
        let exception;

        try {
          rljson.value({
            table: 'tableA',
            itemHash: a0Hash,
            followLink: ['nonExistingKey'],
          });
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: Key "nonExistingKey" not found in item with hash "KFQrf4mEz0UPmUaFHwH4T6" in table "tableA"',
        );
      });

      test('when a second key is given but the first key is not a link', () => {
        let exception;

        try {
          rljson.value({
            table: 'tableA',
            itemHash: a0Hash,
            followLink: ['keyA0', 'keyA1'],
          });
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: Invalid key "keyA1". Additional keys are only allowed for links. But key "keyA0" points to a value.',
        );
      });

      test('when the item hash is empty', () => {
        let exception;

        try {
          rljson.value({
            table: 'tableA',
            itemHash: '',
          });
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: itemHash must not be empty.');
      });
    });
  });

  suite('select(table, columns)', () => {
    test('allow to join values from different tables', () => {
      rljson = Rljson.exampleWithDeepLink;
      const hash = Object.keys(rljson.data.a)[0];

      const result = rljson.select('a', [
        'value',
        'bRef/value',
        'bRef/cRef/value',
        'bRef/cRef/dRef/value',
      ]);

      expect(result).toEqual([
        ['a', 'b', 'c', 'd'],
        ['a0', 'b', 'c', 'd'],
      ]);
    });

    suite('throws', () => {
      test('when table is not found', () => {
        let exception;

        try {
          rljson.select('tableC', ['keyA0']);
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: Table "tableC" not found.');
      });
    });
  });

  suite('addData(data)', () => {
    suite('throws', () => {
      test('when validateHashes is true and hashes are missing', () => {
        let exception;

        try {
          rljson.addData(
            {
              tableA: {
                _data: [{ keyA0: 'a0' }],
              },
            },
            { validateHashes: true },
          );
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: Hash is missing.');
      });

      test('when tables do not contain a _data object', () => {
        let exception;

        try {
          rljson.addData({
            '@tableA': {},
            '@tableB': {},
          });
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: _data is missing in table: @tableA, @tableB',
        );
      });

      test('when tables do not contain a _data that is not a list', () => {
        let exception;

        try {
          rljson.addData({
            '@tableA': {
              _data: {},
            },
            '@tableB': {
              _data: {},
            },
          });
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: _data must be a list in table: @tableA, @tableB',
        );
      });
    });

    test('adds data to the json', () => {
      const rljson2 = rljson.addData({
        tableA: {
          _data: [{ keyA2: 'a2' }],
        },
      });

      const hashA2 = rljson2.originalData.tableA._data[2]._hash;

      const items = rljson2.originalData.tableA._data;
      expect(items).toEqual([
        { keyA0: 'a0', _hash: a0Hash },
        { keyA1: 'a1', _hash: a1Hash },
        { keyA2: 'a2', _hash: hashA2 },
      ]);
    });

    test('replaces data when the added table is not yet existing', () => {
      const rljson2 = rljson.addData({
        tableC: {
          _data: [{ keyC0: 'c0' }],
        },
      });

      const items = rljson2.ls();
      expect(items).toEqual([
        'tableA/KFQrf4mEz0UPmUaFHwH4T6/keyA0',
        'tableA/YPw-pxhqaUOWRFGramr4B1/keyA1',
        'tableB/nmejjLAUhygiT6WFDPPsHy/keyB0',
        'tableB/dXhIygNwNMVPEqFbsFJkn6/keyB1',
        'tableC/afNjjrfH8-OfkkEH1uCK14/keyC0',
      ]);
    });

    test('does not cause duplicates', () => {
      const rljson2 = rljson.addData({
        tableA: {
          _data: [{ keyA1: 'a1' }],
        },
      });

      const items = rljson2.originalData.tableA._data;
      expect(items).toEqual([
        { keyA0: 'a0', _hash: a0Hash },
        { keyA1: 'a1', _hash: a1Hash },
      ]);
    });
  });

  suite('checkLinks()', () => {
    test('does nothing when all links are ok', () => {
      rljson = Rljson.exampleWithLink;
      expect(() => rljson.checkLinks()).not.toThrow();
    });

    suite('throws', () => {
      test('when the table of a link does not exist', () => {
        rljson = Rljson.exampleWithLink;

        const jsonWithBrokenLink = rljson.addData({
          tableA: {
            _data: [
              {
                nonExistingTableRef: 'a2',
              },
            ],
          },
        });

        a0Hash = jsonWithBrokenLink.hash({ table: 'tableA', index: 2 });

        let message;

        try {
          jsonWithBrokenLink.checkLinks();
        } catch (e: any) {
          message = e.toString();
        }

        expect(message).toBe(
          `Error: Table "tableA" has an item "Bg6wGMJaKpfLImKIRtP2Ct" which links to not existing table "nonExistingTableRef".`,
        );
      });

      test('when linked item does not exist', () => {
        rljson = Rljson.exampleWithLink;

        const jsonWithBrokenLink = rljson.addData({
          linkToTableA: {
            _data: [
              {
                tableARef: 'brokenHash',
              },
            ],
          },
        });

        const linkToTableAHash = jsonWithBrokenLink.hash({
          table: 'linkToTableA',
          index: 1,
        });

        let message;

        try {
          jsonWithBrokenLink.checkLinks();
        } catch (e: any) {
          message = e.toString();
        }

        expect(message).toBe(
          `Error: Table "linkToTableA" has an item "${linkToTableAHash}" which links to not existing item "brokenHash" in table "tableA".`,
        );
      });
    });
  });

  suite('data', () => {
    suite('returns the data where the _data list is replaced by a map', () => {
      test('with example', () => {
        expect(rljson.data).toEqual({
          tableA: {
            [a0Hash]: {
              keyA0: 'a0',
              _hash: a0Hash,
            },
            [a1Hash]: {
              keyA1: 'a1',
              _hash: a1Hash,
            },
          },
          tableB: {
            [b0Hash]: {
              keyB0: 'b0',
              _hash: b0Hash,
            },
            [b1Hash]: {
              keyB1: 'b1',
              _hash: b1Hash,
            },
          },
        });
      });

      test('with added data', () => {
        const rljson2 = rljson.addData({
          tableC: {
            _data: [{ keyC0: 'c0' }],
          },
        });

        expect(rljson2.data).toEqual({
          tableA: {
            [a0Hash]: {
              keyA0: 'a0',
              _hash: a0Hash,
            },
            [a1Hash]: {
              keyA1: 'a1',
              _hash: a1Hash,
            },
          },
          tableB: {
            [b0Hash]: {
              keyB0: 'b0',
              _hash: b0Hash,
            },
            [b1Hash]: {
              keyB1: 'b1',
              _hash: b1Hash,
            },
          },
          tableC: {
            'afNjjrfH8-OfkkEH1uCK14': {
              keyC0: 'c0',
              _hash: 'afNjjrfH8-OfkkEH1uCK14',
            },
          },
        });
      });
    });
  });

  suite('hash(table, index)', () => {
    suite('returns', () => {
      test('the hash of the item at the index of the table', () => {
        expect(rljson.hash({ table: 'tableA', index: 0 })).toBe(a0Hash);
        expect(rljson.hash({ table: 'tableA', index: 1 })).toBe(a1Hash);
        expect(rljson.hash({ table: 'tableB', index: 0 })).toBe(b0Hash);
        expect(rljson.hash({ table: 'tableB', index: 1 })).toBe(b1Hash);
      });
    });

    suite('throws', () => {
      test('when table does not exist', () => {
        let exception;

        try {
          rljson.hash({ table: 'tableC', index: 0 });
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: Table "tableC" not found.');
      });

      test('when index is out of range', () => {
        let exception;

        try {
          rljson.hash({ table: 'tableA', index: 2 });
        } catch (e: any) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: Index 2 out of range in table "tableA".',
        );
      });
    });
  });

  suite('checkTableNames(data)', () => {
    test('throws when table names contain other chars then letters and numbers', () => {
      let exception;

      try {
        Rljson.checkTableNames({
          'tableA/': {},
        });
      } catch (e: any) {
        exception = e;
      }

      expect(exception.toString()).toBe(
        'Error: Invalid table name: tableA/. Only letters and numbers are allowed.',
      );
    });

    test('throws when table names end with Ref', () => {
      let exception;

      try {
        Rljson.checkTableNames({
          tableARef: {},
        });
      } catch (e: any) {
        exception = e;
      }

      expect(exception.toString()).toBe(
        'Error: Invalid table name: tableARef. Table names must not end with "Ref".',
      );
    });

    test('throws when table names start with numbers', () => {
      let exception;

      try {
        Rljson.checkTableNames({
          '5tableA': {},
        });
      } catch (e: any) {
        exception = e;
      }

      expect(exception.toString()).toBe(
        'Error: Invalid table name: 5tableA. Table names must not start with a number.',
      );
    });

    test('does nothing when it is feed with valid data', () => {
      expect(() =>
        Rljson.checkTableNames({
          tableA: { _hash: 'ABC' },
          _hash: 'xyz',
        } as any),
      ).not.toThrow();
    });
  });
});
