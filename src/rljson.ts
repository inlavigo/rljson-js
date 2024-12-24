// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { JsonHash } from 'gg-json-hash';

interface Rlmap {
  [key: string]: any;
  _hash?: string;
}

interface Rltables {
  [key: string]: Rlmap;
  _hash?: any;
}

interface RljsonConstructorParams {
  originalData: Rltables;
  data: Rltables;
}

interface QueryOptions {
  table: string;
  where: (item: Rlmap) => boolean;
}

interface GetOptions {
  table: string;
  item: string;
  key1?: string;
  key2?: string;
  key3?: string;
  key4?: string;
}

interface HashOptions {
  table: string;
  index: number;
}

interface FromJsonOptions {
  validateHashes: boolean;
}

/// Manages a normalized JSON data structure
///
/// composed of tables '@tableA', '@tableB', etc.
/// Each table contains an _data array, which contains data items.
/// Each data item has an hash calculated using gg_json_hash.
export class Rljson {
  public originalData: Rltables;
  public data: Rltables;
  private jsonJash = JsonHash.default;

  /// Creates an instance of Rljson.
  constructor({ originalData, data }: RljsonConstructorParams) {
    this.originalData = originalData;
    this.data = data;
  }

  /// Creates an Rljson instance from JSON data.
  static fromJson(
    data: Record<string, any>,
    options: Partial<FromJsonOptions> = { validateHashes: false },
  ): Rljson {
    const { validateHashes = false } = options;

    let result = new Rljson({ originalData: {}, data: {} });
    result = result.addData(data, { validateHashes });
    return result;
  }

  /// Creates a new json containing the given data
  addData(
    addedData: Rltables,
    options: Partial<FromJsonOptions> = { validateHashes: false },
  ): Rljson {
    const { validateHashes = false } = options;
    this._checkData(addedData);
    Rljson.checkTableNames(addedData);

    if (validateHashes) {
      this.jsonJash.validate(addedData);
    }

    addedData = this.jsonJash.apply(addedData);
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

  /// Returns the table with the given name. Throws when name is not found.
  table(table: string): Rltables {
    const tableData = this.data[table];
    if (tableData == null) {
      throw new Error(`Table not found: ${table}`);
    }

    return tableData;
  }

  /// Allows to query data from the json
  items({ table, where }: QueryOptions): Rlmap[] {
    const tableData = this.table(table);
    const items = Object.values(tableData).filter(where);
    return items;
  }

  /// Allows to query data from the json
  item(table: string, hash: string): Rlmap {
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

  /// Queries a value from data. Throws when table or hash is not found.
  get({ table, item, key1, key2, key3, key4 }: GetOptions): any {
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
    if (!key1.endsWith('Ref')) {
      if (key2 != null) {
        throw new Error(
          `Invalid key "${key2}". Additional keys are only allowed for links. But key "${key1}" points to a value.`,
        );
      }

      return itemValue;
    }

    // Follow links
    const targetTable = key1.substring(0, key1.length - 3);
    const targetHash = itemValue;

    return this.get({
      table: targetTable,
      item: targetHash,
      key1: key2,
      key2: key3,
      key3: key4,
    });
  }

  /// Returns the hash of the item at the given index in the table
  hash({ table, index }: HashOptions): string {
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

  /// Returns all paths found in data
  ls(): string[] {
    const result: string[] = [];
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

  /// Throws if a link is not available
  checkLinks(): void {
    for (const table of Object.keys(this.data)) {
      const tableData = this.data[table];

      for (const entry of Object.entries(tableData)) {
        const item = entry[1];
        for (const key of Object.keys(item)) {
          if (key === '_hash') continue;

          if (key.endsWith('Ref')) {
            // Check if linked table exists
            const tableName = key.substring(0, key.length - 3);
            const linkTable = this.data[tableName];
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
                `Table "${table}" has an item "${hash}" which links to not existing item "${targetHash}" in table "${tableName}".`,
              );
            }
          }
        }
      }
    }
  }

  /// An example object
  static get example(): Rljson {
    return Rljson.fromJson({
      tableA: {
        _data: [
          {
            keyA0: 'a0',
          },
          {
            keyA1: 'a1',
          },
        ],
      },
      tableB: {
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
  }

  /// An example object
  static get exampleWithLink(): Rljson {
    return Rljson.fromJson({
      tableA: {
        _data: [
          {
            keyA0: 'a0',
          },
          {
            keyA1: 'a1',
          },
        ],
      },
      linkToTableA: {
        _data: [
          {
            tableARef: 'KFQrf4mEz0UPmUaFHwH4T6',
          },
        ],
      },
    });
  }

  /// An example object
  static get exampleWithDeepLink(): Rljson {
    // Create an Rljson instance
    let rljson = Rljson.fromJson({});

    // Create a table d
    rljson = rljson.addData({
      d: {
        _data: [
          {
            value: 'd',
          },
        ],
      },
    });

    // Get the hash of d
    const hashD = rljson.hash({ table: 'd', index: 0 });

    // Create a second table c linking to d
    rljson = rljson.addData({
      c: {
        _data: [
          {
            dRef: hashD,
            value: 'c',
          },
        ],
      },
    });

    // Get the hash of c
    const hashC = rljson.hash({ table: 'c', index: 0 });

    // Create a third table b linking to c
    rljson = rljson.addData({
      b: {
        _data: [
          {
            cRef: hashC,
            value: 'b',
          },
        ],
      },
    });

    // Get the hash of b
    const hashB = rljson.hash({ table: 'b', index: 0 });

    // Create a first table a linking to b
    rljson = rljson.addData({
      a: {
        _data: [
          {
            bRef: hashB,
            value: 'a',
          },
        ],
      },
    });

    return rljson;
  }

  /// Checks if table names are valid
  static checkTableNames(data: Rltables): void {
    for (const key of Object.keys(data)) {
      if (key === '_hash') continue;
      this.checkTableName(key);
    }
  }

  /// Checks if a string is valid table name
  static checkTableName(str: string): void {
    // Table name must only contain letters and numbers.
    if (!/^[a-zA-Z0-9]+$/.test(str)) {
      throw new Error(
        `Invalid table name: ${str}. Only letters and numbers are allowed.`,
      );
    }

    // Table names must not end with Ref
    if (str.endsWith('Ref')) {
      throw new Error(
        `Invalid table name: ${str}. Table names must not end with "Ref".`,
      );
    }

    // Table names must not start with an number
    if (/^[0-9]/.test(str)) {
      throw new Error(
        `Invalid table name: ${str}. Table names must not start with a number.`,
      );
    }
  }

  /// Checks if data is valid
  private _checkData(data: Rltables): void {
    const tablesWithMissingData: string[] = [];
    const tablesWithWrongType: string[] = [];

    for (const table of Object.keys(data)) {
      /* v8 ignore next */
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

  /// Turns data into a map
  private _toMap(data: Rltables): Record<string, any> {
    const result: Record<string, any> = {};

    // Iterate all tables
    for (const table of Object.keys(data)) {
      if (table.startsWith('_')) continue;

      const tableData: Record<string, any> = {};
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
