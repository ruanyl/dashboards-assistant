/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from '../../../../../src/core/public';
import { Operator } from './Operator';
import { TEXT2VIZ_API } from '../../../common/constants/llm';

interface Input {
  sampleData: string;
  dataSourceId?: string;
}

export class DataInsightsOperator<T extends Input>
  implements Operator<T, { dataInsights: string }> {
  http: HttpSetup;

  constructor(http: HttpSetup) {
    this.http = http;
  }

  async execute<P extends T>(v: P) {
    const dataInsights: string = await this.getDataInsights(
      JSON.stringify(v.sampleData),
      v.dataSourceId
    );
    return { ...v, dataInsights };
  }

  async getDataInsights(sampleData: string, dataSourceId?: string) {
    const res = await this.http.post(TEXT2VIZ_API.DATA_INSIGHTS, {
      body: JSON.stringify({
        input: JSON.stringify(sampleData),
      }),
      query: { dataSourceId },
    });
    console.log('res: ', res);
    return res;
  }
}
