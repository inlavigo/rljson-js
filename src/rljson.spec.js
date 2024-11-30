// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { beforeEach, expect, suite, test } from 'vitest';

import { assert } from 'console';
import { Rljson } from './rljson.js';

suite('Rljson', () => {
  /** @type Rljson */
  let rljson;
  /**
   * @type {string}
   */
  let a0Hash;
  /**
   * @type {string}
   */
  let a1Hash;
  /**
   * @type {string}
   */
  let b0Hash;
  /**
   * @type {string}
   */
  let b1Hash;

  beforeEach(() => {
    rljson = Rljson.example;
    a0Hash = rljson.hash({ table: '@tableA', index: 0 });
    a1Hash = rljson.hash({ table: '@tableA', index: 1 });
    b0Hash = rljson.hash({ table: '@tableB', index: 0 });
    b1Hash = rljson.hash({ table: '@tableB', index: 1 });

    assert(a0Hash.length === 22);
    assert(a1Hash.length === 22);
    assert(b0Hash.length === 22);
    assert(b1Hash.length === 22);
  });

  suite('ls()', () => {
    test('lists the paths of all items', () => {
      expect(rljson.ls()).toEqual([
        '@tableA/KFQrf4mEz0UPmUaFHwH4T6/keyA0',
        '@tableA/YPw-pxhqaUOWRFGramr4B1/keyA1',
        '@tableB/nmejjLAUhygiT6WFDPPsHy/keyB0',
        '@tableB/dXhIygNwNMVPEqFbsFJkn6/keyB1',
      ]);
    });
  });

  suite('fromData(data)', () => {
    test('adds hashes to all fields', () => {
      expect(rljson.data).toEqual({
        '@tableA': {
          [a0Hash]: {
            keyA0: 'a0',
            _hash: a0Hash,
          },
          [a1Hash]: {
            keyA1: 'a1',
            _hash: a1Hash,
          },
        },
        '@tableB': {
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

  suite('table(String table)', () => {
    suite('returns', () => {
      test('the table when existing', () => {
        const table = rljson.table('@tableA');
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
          rljson.table('@tableC');
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: Table not found: @tableC');
      });
    });
  });

  suite('items(table, where)', () => {
    test('returns the items that match the query', () => {
      const items = rljson.items({
        table: '@tableA',
        where: (item) => item['keyA0'] === 'a0',
      });

      expect(items).toEqual([{ keyA0: 'a0', _hash: a0Hash }]);
    });
  });

  suite('item(table, hash)', () => {
    suite('returns', () => {
      test('the item when existing', () => {
        const item = rljson.item('@tableA', a0Hash);
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
          rljson.item('@tableC', a0Hash);
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: Table not found: @tableC');
      });

      test('when hash is not available', () => {
        let exception;

        try {
          rljson.item('@tableA', 'nonExistingHash');
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: Item not found with hash "nonExistingHash" in table "@tableA"',
        );
      });
    });
  });

  suite('value(table, hash, key, key2, key3, key4 followLinks)', () => {
    suite('returns', () => {
      test('the value of the key of the item with hash in table', () => {
        expect(
          rljson.get({
            table: '@tableA',
            item: a0Hash,
            key1: 'keyA0',
          }),
        ).toBe('a0');
      });

      test('the complete item, when no key is given', () => {
        expect(rljson.get({ table: '@tableA', item: a0Hash })).toEqual({
          keyA0: 'a0',
          _hash: a0Hash,
        });
      });

      test('the linked value, when property is a link', () => {
        rljson = Rljson.exampleWithLink;

        const tableALinkHash = rljson.hash({
          table: '@linkToTableA',
          index: 0,
        });

        expect(
          rljson.get({
            table: '@linkToTableA',
            item: tableALinkHash,
            key1: '@tableA',
          }),
        ).toEqual({ _hash: a0Hash, keyA0: 'a0' });
      });

      test('the linked value across multiple tables using key2 to key4', () => {
        rljson = Rljson.exampleWithDeepLink;
        expect(
          rljson.get({
            table: '@a',
            item: 'GnSVp1CmoAo3rPiiGl44p-',
            key1: '@b',
            key2: '@c',
            key3: '@d',
            key4: 'value',
          }),
        ).toBe('d');
      });
    });

    suite('throws', () => {
      test('when key does not point to a valid value', () => {
        let exception;

        try {
          rljson.get({
            table: '@tableA',
            item: a0Hash,
            key1: 'nonExistingKey',
          });
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: Key "nonExistingKey" not found in item with hash "KFQrf4mEz0UPmUaFHwH4T6" in table "@tableA"',
        );
      });

      test('when a second key is given but the first key is not a link', () => {
        let exception;

        try {
          rljson.get({
            table: '@tableA',
            item: a0Hash,
            key1: 'keyA0',
            key2: 'keyA1',
          });
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: Invalid key "keyA1". Additional keys are only allowed for links. But key "keyA0" points to a value.',
        );
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
              '@tableA': {
                _data: [{ keyA0: 'a0' }],
              },
            },
            { validateHashes: true },
          );
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: Hash is missing.');
      });

      test('when table names do not start with @', () => {
        let exception;

        try {
          rljson.addData({
            _hash: 'xyz',
            tableA: { _hash: 'hash', _data: [] },
            tableB: { _data: [] },
            tableC: { _data: [] },
          });
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: Table name must start with @: tableA',
        );
      });

      test('when tables do not contain a _data object', () => {
        let exception;

        try {
          rljson.addData({
            '@tableA': {},
            '@tableB': {},
          });
        } catch (/** @type {any} */ e) {
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
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: _data must be a list in table: @tableA, @tableB',
        );
      });
    });

    test('adds data to the json', () => {
      const rljson2 = rljson.addData({
        '@tableA': {
          _data: [{ keyA2: 'a2' }],
        },
      });

      const items = rljson2.originalData['@tableA']['_data'];
      expect(items).toEqual([
        { keyA0: 'a0', _hash: a0Hash },
        { keyA1: 'a1', _hash: a1Hash },
        { keyA2: 'a2', _hash: 'apLP3I2XLnVm13umIZdVhV' },
      ]);
    });

    test('replaces data when the added table is not yet existing', () => {
      const rljson2 = rljson.addData({
        '@tableC': {
          _data: [{ keyC0: 'c0' }],
        },
      });

      const items = rljson2.ls();
      expect(items).toEqual([
        '@tableA/KFQrf4mEz0UPmUaFHwH4T6/keyA0',
        '@tableA/YPw-pxhqaUOWRFGramr4B1/keyA1',
        '@tableB/nmejjLAUhygiT6WFDPPsHy/keyB0',
        '@tableB/dXhIygNwNMVPEqFbsFJkn6/keyB1',
        '@tableC/afNjjrfH8-OfkkEH1uCK14/keyC0',
      ]);
    });

    test('does not cause duplicates', () => {
      const rljson2 = rljson.addData({
        '@tableA': {
          _data: [{ keyA1: 'a1' }],
        },
      });

      const items = rljson2.originalData['@tableA']['_data'];
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
          '@tableA': {
            _data: [
              {
                '@nonExistingTable': 'a2',
              },
            ],
          },
        });

        a0Hash = jsonWithBrokenLink.hash({ table: '@tableA', index: 2 });

        let message;

        try {
          jsonWithBrokenLink.checkLinks();
        } catch (/** @type {any} */ e) {
          message = e.toString();
        }

        expect(message).toBe(
          `Error: Table "@tableA" has an item "${a0Hash}" which links to not existing table "@nonExistingTable".`,
        );
      });

      test('when linked item does not exist', () => {
        rljson = Rljson.exampleWithLink;

        const jsonWithBrokenLink = rljson.addData({
          '@linkToTableA': {
            _data: [
              {
                '@tableA': 'brokenHash',
              },
            ],
          },
        });

        const linkToTableAHash = jsonWithBrokenLink.hash({
          table: '@linkToTableA',
          index: 1,
        });

        let message;

        try {
          jsonWithBrokenLink.checkLinks();
        } catch (/** @type {any} */ e) {
          message = e.toString();
        }

        expect(message).toBe(
          `Error: Table "@linkToTableA" has an item "${linkToTableAHash}" which links to not existing item "brokenHash" in table "@tableA".`,
        );
      });
    });
  });

  suite('data', () => {
    suite('returns the data where the _data list is replaced by a map', () => {
      test('with example', () => {
        expect(rljson.data).toEqual({
          '@tableA': {
            [a0Hash]: {
              keyA0: 'a0',
              _hash: a0Hash,
            },
            [a1Hash]: {
              keyA1: 'a1',
              _hash: a1Hash,
            },
          },
          '@tableB': {
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
          '@tableC': {
            _data: [{ keyC0: 'c0' }],
          },
        });

        expect(rljson2.data).toEqual({
          '@tableA': {
            [a0Hash]: {
              keyA0: 'a0',
              _hash: a0Hash,
            },
            [a1Hash]: {
              keyA1: 'a1',
              _hash: a1Hash,
            },
          },
          '@tableB': {
            [b0Hash]: {
              keyB0: 'b0',
              _hash: b0Hash,
            },
            [b1Hash]: {
              keyB1: 'b1',
              _hash: b1Hash,
            },
          },
          '@tableC': {
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
        expect(rljson.hash({ table: '@tableA', index: 0 })).toBe(a0Hash);
        expect(rljson.hash({ table: '@tableA', index: 1 })).toBe(a1Hash);
        expect(rljson.hash({ table: '@tableB', index: 0 })).toBe(b0Hash);
        expect(rljson.hash({ table: '@tableB', index: 1 })).toBe(b1Hash);
      });
    });

    suite('throws', () => {
      test('when table does not exist', () => {
        let exception;

        try {
          rljson.hash({ table: '@tableC', index: 0 });
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe('Error: Table "@tableC" not found.');
      });

      test('when index is out of range', () => {
        let exception;

        try {
          rljson.hash({ table: '@tableA', index: 2 });
        } catch (/** @type {any} */ e) {
          exception = e;
        }

        expect(exception.toString()).toBe(
          'Error: Index 2 out of range in table "@tableA".',
        );
      });
    });
  });
});
