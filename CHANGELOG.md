# Changelog

## [5.0.6]

- Update gg-json-hash switching base64 and sha256 algorithm

## [5.0.5]

- Update dependencies

## [5.0.4]

- Update rljson

## [5.0.3]

- Update to latest version of gg-json-hash
- Fix: Broken, when Rljson contains `null`

## [5.0.2]

- Update to latest version of gg-json-hash

## [5.0.0]

- BREAKING CHANGES:
  - Rename `data` into `dataIndexed`.
  - Rename `originalData` into `data`
  - Remove `inPlace` option. All changes are in-place now.
- Add `hasTable`
- Add `inPlace` option to `addData`
- Add `addTable`
- Add `createTable`

## [4.1.8]

- Update gg-json-hash for more reliable hash creation

## [4.1.7]

- Changed build process

## [4.1.5]

- Fix: Hash validation was not executed although validateHashes was true
- Allow not to update existing hashes when adding json etc.

## [4.1.0]

- Add `Rljson.empty()` to create an empty Rljson instance.

## [4.0.0]

- Breaking change: Rename `get` into `value`
- Add `select` method to select multiple columns

## [3.0.0]

- Breaking change: Use Ref postfix instead of @
- Table names must only contain numbers and strings

## [2.0.4]

- Update README.md
- Update to latest version of gg-json-hash

## [2.0.1]

- Initial implementation
