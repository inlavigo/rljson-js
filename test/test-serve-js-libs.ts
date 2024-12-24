// @license
// Copyright (c) 2024 Dr. Gabriel Gatzsche
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.

import fs from 'fs';
import { join } from 'path';
import { vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';


// .......................................................................
/// Mock fetching gg-mg files from node_modules/gg-mg/dist/gg-mg/
export const serveJsLibs = () => {
  const fetchMocker = createFetchMock(vi);

  // Todo: Replace with SQL libs when needed

  fetchMocker.enableMocks();

  fetchMocker.mockIf(/^.*\/gg-mg\/*/, (req) => {
    const fileName = req.url.split('/').pop()!;
    const filePath = join(
      __dirname,
      '..',
      'node_modules/gg-mg/dist/gg-mg/',
      fileName,
    );

    const fileContent = fs.readFileSync(filePath).toString();
    return fileContent;
  });
};
