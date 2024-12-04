/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TEXT2PPL_AGENT_CONFIG_ID,
  TEXT2VEGA_RULE_BASED_AGENT_CONFIG_ID,
  TEXT2VEGA_WITH_INSTRUCTIONS_AGENT_CONFIG_ID,
} from '../common/constants/llm';
import { DEFAULT_DATA } from '../../../src/plugins/data/common';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { AssistantServiceStart } from './services/assistant_service';
import { AI_ASSISTANT_QUERY_EDITOR_TRIGGER } from './ui_triggers';
import { CoreStart } from '../../../src/core/public';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { toMountPoint } from '../../../src/plugins/opensearch_dashboards_react/public';
import { PPLSampleOperator } from './utils/pipeline/ppl_sample_operator';
import { DataInsightsOperator } from './utils/pipeline/data_insights_operator';

interface Services {
  core: CoreStart;
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  assistantService: AssistantServiceStart;
}

export function registerGenerateDashboardUIAction(services: Services) {
  services.uiActions.addTriggerAction(AI_ASSISTANT_QUERY_EDITOR_TRIGGER, {
    id: 'assistant_generate_dashboard_action',
    order: 10,
    getDisplayName: () => 'Generate dashboard',
    getIconType: () => 'dashboard' as const,
    // T2Viz is only compatible with data sources that have certain agents configured
    isCompatible: async (context) => {
      // t2viz only supports selecting index pattern at the moment
      if (context.datasetType === DEFAULT_DATA.SET_TYPES.INDEX_PATTERN && context.datasetId) {
        const res = await services.assistantService.client.agentConfigExists(
          [
            TEXT2VEGA_RULE_BASED_AGENT_CONFIG_ID,
            TEXT2VEGA_WITH_INSTRUCTIONS_AGENT_CONFIG_ID,
            TEXT2PPL_AGENT_CONFIG_ID,
          ],
          {
            dataSourceId: context.dataSourceId,
          }
        );
        return res.exists;
      }
      return false;
    },
    execute: async (context) => {
      if (context.datasetId && context.datasetType === DEFAULT_DATA.SET_TYPES.INDEX_PATTERN) {
        const indexPattern = await services.data.indexPatterns.get(context.datasetId);

        const pplOperator = new PPLSampleOperator(services.data.search);
        const result = await pplOperator.execute({
          ppl: `source=${indexPattern.getIndex()} | head 3`,
          dataSourceId: context.dataSourceId,
        });
        console.log('result.sample:', result.sample);

        const dataInsightsOperator = new DataInsightsOperator(services.core.http);
        const dataInsights = await dataInsightsOperator.execute({
          sampleData: result.sample,
          dataSourceId: context.dataSourceId,
        });
        console.log('data insights:', dataInsights);

        const data = {
          'Sales Analysis': [
            'Total sales by product category (sum of taxful_total_price per category) // Bar Chart',
            'Average order value by day of the week (mean of taxful_total_price per day_of_week) // Bar Chart',
            'Comparison of taxless vs taxful total price (sum of taxless_total_price vs taxful_total_price) // Stacked Bar Chart',
          ],
          'Customer Demographics': [
            'Distribution of customers by gender (count of orders per customer_gender) // Pie Chart',
            'Geographic distribution of customers by continent (count of orders per geoip.continent_name) // Map Chart',
            'Top 5 cities by order volume (count of orders per geoip.city_name) // Bar Chart',
          ],
          'Product Performance': [
            'Top selling products by quantity (sum of total_quantity per products.product_name) // Bar Chart',
            'Product price range analysis (min, max, avg of products.price per category) // Box Plot',
            'Manufacturer market share by sales volume (sum of taxful_total_price per manufacturer) // Pie Chart',
          ],
          'Order Patterns': [
            'Order frequency by day of week (count of orders per day_of_week) // Bar Chart',
            'Average number of unique products per order (mean of total_unique_products) // Single Value',
            'Distribution of order sizes (count of orders per total_quantity range) // Histogram',
          ],
          'Customer Behavior': [
            'Repeat purchase rate (count of unique customer_id with multiple orders / total unique customer_id) // Single Value',
            'Average customer spend (mean of taxful_total_price per customer_id) // Bar Chart',
            'Correlation between customer age (derived from customer_birth_date) and order value (taxful_total_price) // Scatter Plot',
          ],
        };

        // console.log(indexPattern.fields.map((f) => f.toSpec()));
        // const indexName = indexPattern.getIndex();
        // const res = await services.data.search
        //   .search(
        //     {
        //       params: { body: { query: `source=${indexPattern.getIndex()} | head 3` } },
        //       dataSourceId: context.dataSourceId,
        //     },
        //     { strategy: 'pplraw' }
        //   )
        //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
        //   .toPromise<any>();
        // // console.log(res);

        // const flyout = services.core.overlays.openFlyout(toMountPoint(<div>{res}</div>));
      }
    },
  });
}
