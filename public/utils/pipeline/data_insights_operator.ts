/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from '../../../../../src/core/public';
import { Operator } from './Operator';
import { TEXT2VIZ_API } from '../../../common/constants/llm';

interface Input {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sample: any;
  dataSourceId?: string;
}

export class DataInsightsOperator extends Operator<Input, Input & { dataInsights: string }> {
  http: HttpSetup;

  constructor(http: HttpSetup) {
    super();
    this.http = http;
  }

  async execute<T extends Input>(v: T) {
    const dataInsights: string = await this.getDataInsights(
      JSON.stringify(v.sample.jsonData),
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
