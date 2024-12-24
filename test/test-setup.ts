import { expect } from 'vitest';
import * as matchers from 'vitest-dom/matchers';

import { serveJsLibs } from './test-serve-js-libs';

expect.extend(matchers);

serveJsLibs();
