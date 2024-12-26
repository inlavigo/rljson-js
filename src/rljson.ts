// @license
// Copyright (c) 2019 - 2024 Dr. Gabriel Gatzsche. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import { JsonHash } from 'gg-json-hash';


/// Manages a normalized JSON data structure
///
/// composed of tables '@tableA', '@tableB', etc.
/// Each table contains an _data array, which contains data items.
/// Each data item has an hash calculated using gg_json_hash.
export class Rljson {
  public originalData: Rltables;
  public data: Rltables;
  private jsonJash = JsonHash.default;

  // ...........................................................................
  /// Creates an instance of Rljson.
  constructor({ originalData, data }: RljsonConstructorParams) {
    this.originalData = originalData;
    this.data = data;
  }

  // ...........................................................................
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

  // ...........................................................................
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

  // ...........................................................................
  /// Returns the table with the given name. Throws when name is not found.
  table(table: string): Rltables {
    const tableData = this.data[table];
    if (tableData == null) {
      throw new Error(`Table not found: ${table}`);
    }

    return tableData;
  }

  // ...........................................................................
  /// Allows to query data from a table
  items({ table, where }: QueryOptions): Rlmap[] {
    const tableData = this.table(table);
    const items = Object.values(tableData).filter(where);
    return items;
  }

  // ...........................................................................
  /// Allows to query data from the json
  row(table: string, hash: string): Rlmap {
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
  /// Queries a value from data. Throws when table or hash is not found.

  value({ table, itemHash, followLink }: GetValue): any {
    if (itemHash.length === 0) {
      throw new Error('itemHash must not be empty.');
    }

    // Get item
    const row = this.row(table, itemHash);

    // If no followLink is given, return the complete row
    if (!followLink?.length) {
      return row;
    }

    const refKey = followLink[0];

    // Get item value
    const value = row[refKey];
    if (value == null) {
      throw new Error(
        `Key "${refKey}" not found in item with hash "${itemHash}" in table "${table}"`,
      );
    }

    // Return item value when no link or links are not followed
    if (!refKey.endsWith('Ref')) {
      const refHash = followLink[1];
      if (refHash != null) {
        throw new Error(
          `Invalid key "${refHash}". Additional keys are only allowed for links. But key "${refKey}" points to a value.`,
        );
      }

      return value;
    }

    // Follow links
    const targetTable = refKey.substring(0, refKey.length - 3);
    const targetHash = value;

    return this.value({
      table: targetTable,
      itemHash: targetHash,
      followLink: followLink.slice(1),
    });
  }

  // ...........................................................................
  /// Joins multiple tables into one and returns the result
  ///
  /// Note: This implementation is not optimized for performance.
  select(table: string, columns: string[]): Array<Array<any>> {
    // Get the table
    const sourceRows = this.originalData[table]?._data;
    if (!sourceRows) {
      throw new Error(`Table "${table}" not found.`);
    }

    // Split columns
    const columnParts = columns.map((column) => column.split('/'));

    // Iterate all rows of the table
    const targetRows = new Array(sourceRows.length);

    for (let rowNo = 0; rowNo < sourceRows.length; rowNo++) {
      const sourceRow = sourceRows[rowNo];

      // Create a target row
      const targetRow = (targetRows[rowNo] = new Array(columns.length));

      // Iterate all columns
      for (let colNo = 0; colNo < columnParts.length; colNo++) {
        const parts = columnParts[colNo];
        const key = parts[0];
        if (!key.endsWith('Ref')) {
          targetRow[colNo] = sourceRow[key];
          continue;
        } else {
          const targetTable = key.substring(0, key.length - 3);
          const targetHash = sourceRow[key];
          targetRow[colNo] = this.value({
            table: targetTable,
            itemHash: targetHash,
            followLink: parts.slice(1),
          });
        }
      }
    }

    return targetRows;
  }

  // ...........................................................................
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

  // ...........................................................................
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

  // ...........................................................................
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

  // ...........................................................................
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

  // ...........................................................................
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

  // ...........................................................................
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
            details: 'details about d',
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
          {
            bRef: hashB,
            value: 'a0',
          },
        ],
      },
    });

    return rljson;
  }

  // ...........................................................................
  /// Checks if table names are valid
  static checkTableNames(data: Rltables): void {
    for (const key of Object.keys(data)) {
      if (key === '_hash') continue;
      this.checkTableName(key);
    }
  }

  // ...........................................................................
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

  // ...........................................................................
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

  // ...........................................................................
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

export interface Rlmap {
  [key: string]: any;
  _hash?: string;
}

export interface Rltables {
  [key: string]: Rlmap;
  _hash?: any;
}

export interface RljsonConstructorParams {
  originalData: Rltables;
  data: Rltables;
}

export interface QueryOptions {
  table: string;
  where: (item: Rlmap) => boolean;
}

export interface GetValue {
  table: string;
  itemHash: string;
  followLink?: string[];
}

export interface HashOptions {
  table: string;
  index: number;
}

export interface FromJsonOptions {
  validateHashes: boolean;
}
