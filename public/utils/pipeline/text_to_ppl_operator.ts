/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from '../../../../../src/core/public';
import { Operator } from './Operator';
import { TEXT2VIZ_API } from '../../../common/constants/llm';

interface Input {
  inputQuestion: string;
  index: string;
  dataSourceId?: string;
}

export class Text2PPLOperator<T extends Input> implements Operator<T, { ppl: string }> {
  http: HttpSetup;

  constructor(http: HttpSetup) {
    this.http = http;
  }

  async execute<P extends T>(v: P) {
    const ppl: string = await this.text2ppl(v.inputQuestion, v.index, v.dataSourceId);
    return { ...v, ppl };
  }

  async text2ppl(query: string, index: string, dataSourceId?: string) {
    const res = await this.http.post(TEXT2VIZ_API.TEXT2PPL, {
      body: JSON.stringify({
        question: query,
        index,
      }),
      query: { dataSourceId },
    });
    return res.ppl;
  }
}
