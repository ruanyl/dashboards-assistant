/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Operator } from './Operator';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';

interface Input {
  ppl: string;
  dataSourceId: string | undefined;
  pplSampleSize?: number;
}

const topN = (ppl: string, n: number = 2) => `${ppl} | head ${n}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class PPLSampleOperator<T extends Input> implements Operator<T, { sample: any }> {
  searchClient: DataPublicPluginStart['search'];

  constructor(searchClient: DataPublicPluginStart['search']) {
    this.searchClient = searchClient;
  }

  async execute<P extends T>(v: P) {
    const ppl = topN(v.ppl, v.pplSampleSize);
    const res = await this.searchClient
      .search(
        { params: { body: { query: ppl } }, dataSourceId: v.dataSourceId },
        { strategy: 'pplraw' }
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .toPromise<any>();
    if (res.rawResponse.total === 0) {
      throw new Error(`There is no result with the generated query: '${v.ppl}'.`);
    }
    return { ...v, sample: res.rawResponse };
  }
}
