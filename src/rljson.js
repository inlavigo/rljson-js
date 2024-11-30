// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { JsonHash, addHashes } from 'gg-json-hash';

/**
 * A simple json map
 * @typedef {{ [key: string]: any }} Rlmap
 */

/**
 * A map of tables
 * @typedef {{ [key: string]: Rlmap }} Rltables
 */

/**
 * Manages a normalized JSON data structure
 *
 * composed of tables '@tableA', '@tableB', etc.
 * Each table contains an _data array, which contains data items.
 * Each data item has an hash calculated using gg_json_hash.
 */
export class Rljson {
  /**
   * Creates an instance of Rljson.
   * @class
   * @param {object} params - The parameters for creating a Rljson instance
   * @param {Rltables} params.originalData - The original data
   * @param {Rlmap} params.data - The processed data
   */
  constructor({ originalData, data }) {
    /**
     * @type {*}
     * @description The original data
     */
    this.originalData = originalData;

    /**
     * @type {*}
     * @description The processed data
     */
    this.data = data;
  }

  /**
   * Creates an Rljson instance from JSON data.
   * @param {Record<string, any>} data - The input data.
   * @param {object} options - The options.
   * @param {boolean} options.validateHashes - Whether to validate the hashes.
   * @returns {Rljson} A new Rljson instance.
   */
  static fromJson(data, options = { validateHashes: false }) {
    const { validateHashes = false } = options;

    let result = new Rljson({ originalData: {}, data: {} });
    result = result.addData(data, { validateHashes });
    return result;
  }

  // ...........................................................................
  /**
   * The json data managed by this object
   * @type {Rlmap}
   */
  originalData;

  /**
   * Returns a map of tables containing a map of items for fast access
   * @type {Rltables}
   */
  data;

  // ...........................................................................
  /**
   * Creates a new json containing the given data
   * @param {Rlmap} addedData
   * @param {object} options
   * @param {boolean} options.validateHashes
   * @returns {Rljson}
   */
  addData(addedData, options = { validateHashes: false }) {
    const { validateHashes = false } = options;
    this._checkData(addedData);
    this._checkTableNames(addedData);

    if (validateHashes) {
      new JsonHash().validate(addedData);
    }

    addedData = addHashes(addedData);
    const addedDataAsMap = this._toMap(addedData);

    if (Object.keys(this.originalData).length === 0) {
      return new Rljson({
        originalData: addedData,
        data: addedDataAsMap,
      });
    }

    const mergedData = { ...this.originalData };
    const mergedMap = { ...this.data };

    if (Object.keys(this.originalData).length > 0) {
      for (const table of Object.keys(addedData)) {
        if (table === '_hash') {
          continue;
        }

        const oldTable = this.originalData[table];
        const newTable = addedData[table];

        // Table does not exist yet. Insert all
        if (oldTable == null) {
          mergedData[table] = newTable;
          mergedMap[table] = addedDataAsMap[table];
          continue;
        }

        const oldMap = this.data[table];

        // Table exists. Merge data
        const mergedTableData = [...oldTable['_data']];
        const mergedTableMap = { ...oldMap };
        const newData = newTable['_data'];

        for (const item of newData) {
          const hash = item['_hash'];
          const exists = mergedTableMap[hash] != null;

          if (!exists) {
            mergedTableData.push(item);
            mergedTableMap[hash] = item;
          }
        }

        newTable['_data'] = mergedTableData;
        mergedData[table] = newTable;
        mergedMap[table] = mergedTableMap;
      }
    }

    return new Rljson({ originalData: mergedData, data: mergedMap });
  }

  // ...........................................................................
  /**
   * Returns the table with the given name. Throws when name is not found.
   * @param {string} table
   * @returns {Rltables}
   */
  table(table) {
    const tableData = this.data[table];
    if (tableData == null) {
      throw new Error(`Table not found: ${table}`);
    }

    return tableData;
  }

  // ...........................................................................
  /**
   * Allows to query data from the json
   * @param {object} options
   * @param {string} options.table
   * @param {function(Rlmap): boolean} options.where
   * @returns {Rlmap[]}
   */
  items({ table, where }) {
    const tableData = this.table(table);
    const items = Object.values(tableData).filter(where);
    return items;
  }

  // ...........................................................................
  /**
   * Allows to query data from the json
   * @param {string} table
   * @param {string} hash
   * @returns {Rlmap}
   */
  item(table, hash) {
    // Get table
    const tableData = this.data[table];
    if (tableData == null) {
      throw new Error(`Table not found: ${table}`);
    }

    // Get item
    const item = tableData[hash];
    if (item == null) {
      throw new Error(`Item not found with hash "${hash}" in table "${table}"`);
    }

    return item;
  }

  // ...........................................................................
  /**
   * Queries a value from data. Throws when table or hash is not found.
   * @param {object} options
   * @param {string} options.table
   * @param {string} options.item
   * @param {string} [options.key1]
   * @param {string} [options.key2]
   * @param {string} [options.key3]
   * @param {string} [options.key4]
   * @returns {any}
   */
  get({ table, item, key1, key2, key3, key4 }) {
    // Get item
    const itemHash = item;
    const resultItem = this.item(table, itemHash);

    // If no key is given, return the complete item
    if (key1 == null) {
      return resultItem;
    }

    // Get item value
    const itemValue = resultItem[key1];
    if (itemValue == null) {
      throw new Error(
        `Key "${key1}" not found in item with hash "${itemHash}" in table "${table}"`,
      );
    }

    // Return item value when no link or links are not followed
    if (!key1.startsWith('@')) {
      if (key2 != null) {
        throw new Error(
          `Invalid key "${key2}". Additional keys are only allowed for links. But key "${key1}" points to a value.`,
        );
      }

      return itemValue;
    }

    // Follow links
    const targetTable = key1;
    const targetHash = itemValue;

    return this.get({
      table: targetTable,
      item: targetHash,
      key1: key2,
      key2: key3,
      key3: key4,
    });
  }

  // ...........................................................................
  /**
   * Returns the hash of the item at the given index in the table
   * @param {object} options
   * @param {string} options.table
   * @param {number} options.index
   * @returns {string}
   */
  hash({ table, index }) {
    const tableData = this.originalData[table];

    if (tableData == null) {
      throw new Error(`Table "${table}" not found.`);
    }

    const items = tableData['_data'];
    if (index >= items.length) {
      throw new Error(`Index ${index} out of range in table "${table}".`);
    }

    const item = items[index];
    return item['_hash'];
  }

  // ...........................................................................
  /**
   * Returns all paths found in data
   * @returns {string[]}
   */
  ls() {
    const result = [];
    for (const [table, tableData] of Object.entries(this.data)) {
      for (const [hash, item] of Object.entries(tableData)) {
        for (const key of Object.keys(item)) {
          if (key === '_hash') {
            continue;
          }
          result.push(`${table}/${hash}/${key}`);
        }
      }
    }
    return result;
  }

  // ...........................................................................
  /**
   * Throws if a link is not available
   */
  checkLinks() {
    for (const table of Object.keys(this.data)) {
      const tableData = this.data[table];

      for (const entry of Object.entries(tableData)) {
        const item = entry[1];
        for (const key of Object.keys(item)) {
          if (key === '_hash') continue;

          if (key.startsWith('@')) {
            // Check if linked table exists
            const linkTable = this.data[key];
            const hash = item['_hash'];

            if (linkTable == null) {
              throw new Error(
                `Table "${table}" has an item "${hash}" which links to not existing table "${key}".`,
              );
            }

            // Check if linked item exists
            const targetHash = item[key];
            const linkedItem = linkTable[targetHash];

            if (linkedItem == null) {
              throw new Error(
                `Table "${table}" has an item "${hash}" which links to not existing item "${targetHash}" in table "${key}".`,
              );
            }
          }
        }
      }
    }
  }

  // ...........................................................................
  /**
   * An example object
   * @type {Rljson}
   */
  static example = Rljson.fromJson({
    '@tableA': {
      _data: [
        {
          keyA0: 'a0',
        },
        {
          keyA1: 'a1',
        },
      ],
    },
    '@tableB': {
      _data: [
        {
          keyB0: 'b0',
        },
        {
          keyB1: 'b1',
        },
      ],
    },
  });

  // ...........................................................................
  /**
   * An example object
   * @type {Rljson}
   */
  static exampleWithLink = Rljson.fromJson({
    '@tableA': {
      _data: [
        {
          keyA0: 'a0',
        },
        {
          keyA1: 'a1',
        },
      ],
    },
    '@linkToTableA': {
      _data: [
        {
          '@tableA': 'KFQrf4mEz0UPmUaFHwH4T6',
        },
      ],
    },
  });

  // ...........................................................................
  /**
   * An example object
   * @type {Rljson}
   */
  static exampleWithDeepLink = Rljson.fromJson({
    '@a': {
      _data: [
        {
          '@b': 'Ji-ftHLbqQehV4aV0FlEO6',
          value: 'a',
          _hash: 'Q-oaM7xctsuFg_faf1lkhC',
        },
      ],
      _hash: 'GnSVp1CmoAo3rPiiGl44p-',
    },
    '@b': {
      _data: [
        {
          '@c': 'tlmxwmwJvFMyBYIYoA2k4K',
          value: 'b',
          _hash: 'ks2Zy5nlXx91deccdZtjvK',
        },
      ],
      _hash: 'uHEtXhILctvNH6zk6k4vDi',
    },
    '@c': {
      _data: [
        {
          '@d': '0tlKQklLrHoIhHZxdtcbmS',
          value: 'c',
          _hash: '3AzQ8kTQ-PjmW0FwY5mirx',
        },
      ],
      _hash: 'PE0bzvER5q3D-DgxswKzQM',
    },
    '@d': {
      _data: [
        {
          value: 'd',
          _hash: '0tlKQklLrHoIhHZxdtcbmS',
        },
      ],
      _hash: 'WNq8zriiKUM_vn9DwrwAf0',
    },
    _hash: '8_qxUEjOkDIq8Um7Z8OCt6',
  });

  // ######################
  // Private
  // ######################

  // ...........................................................................
  /**
   * Checks if table names are valid
   * @param {Rltables} data
   */
  _checkTableNames(data) {
    for (const key of Object.keys(data)) {
      if (key === '_hash') continue;

      if (key.startsWith('@')) {
        continue;
      }

      throw new Error(`Table name must start with @: ${key}`);
    }
  }

  // ...........................................................................
  /**
   * Checks if data is valid
   * @param {Rltables} data
   * @throws {Error}
   */
  _checkData(data) {
    const tablesWithMissingData = [];
    const tablesWithWrongType = [];

    for (const table of Object.keys(data)) {
      if (table === '_hash') continue;
      const tableData = data[table];
      const items = tableData['_data'];
      if (items == null) {
        tablesWithMissingData.push(table);
      }

      if (!Array.isArray(items)) {
        tablesWithWrongType.push(table);
      }
    }

    if (tablesWithMissingData.length > 0) {
      throw new Error(
        `_data is missing in table: ${tablesWithMissingData.join(', ')}`,
      );
    }

    if (tablesWithWrongType.length > 0) {
      throw new Error(
        `_data must be a list in table: ${tablesWithWrongType.join(', ')}`,
      );
    }
  }

  // ...........................................................................
  /**
   * Turns data into a map
   * @param {Rltables} data
   * @returns {Record<string, any>}
   */
  _toMap(data) {
    /** @type {Record<string, any>} */
    const result = {};

    // Iterate all tables
    for (const table of Object.keys(data)) {
      if (table.startsWith('_')) continue;

      /** @type {Record<string, any>} */
      const tableData = {};
      result[table] = tableData;

      // Turn _data into map
      const items = data[table]['_data'];

      for (const item of items) {
        const hash = item['_hash'];
        tableData[hash] = item;
      }
    }

    return result;
  }
}