/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CoreStart } from '../../../../../src/core/public';

interface Props {
  indexName: string;
  dataSourceId: string;
  core: CoreStart;
}

export const InputPanel = (props: Props) => {
  const [loading, setLoading] = useState(true);
  return <div />;
};
