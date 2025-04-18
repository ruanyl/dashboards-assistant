/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Subscription } from 'rxjs';
import {
  EuiBadge,
  EuiButton,
  EuiCommentList,
  EuiCommentProps,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingContent,
  EuiLoadingLogo,
  EuiProgress,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { CoreStart } from '../../../../../src/core/public';
import { DataPublicPluginStart, IndexPattern } from '../../../../../src/plugins/data/public';
import { Pipeline } from '../../utils/pipeline/pipeline';
import { PPLSampleTask } from '../../utils/pipeline/ppl_sample_task';
import { DataInsightsTask } from '../../utils/pipeline/data_insights_task';
import { CheckableDataList } from './checkable_data_list';
import { Text2PPLTask } from '../../utils/pipeline/text_to_ppl_task';
import { Text2VegaTask } from '../../utils/pipeline/text_to_vega_task';
import { getVisNLQSavedObjectLoader } from '../../vis_nlq/saved_object_loader';
import { VisNLQSavedObject } from '../../vis_nlq/types';
import { createDashboard } from './create_dashboard';

interface Props {
  dataSourceId?: string;
  core: CoreStart;
  data: DataPublicPluginStart;
  indexPattern: IndexPattern;
  onClose: () => void;
}

type Status = 'INSIGHTS_LOADING' | 'INSIGHTS_LOADED' | 'DASHBOARDS_CREATING' | 'DASHBOARDS_CREATED';

export const InputPanel = (props: Props) => {
  const [dataInsights, setDataInsights] = useState<Record<string, string[]>>({});
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [updateMessages, setUpdateMessages] = useState<EuiCommentProps[]>([]);
  const [panelStatus, setPanelStatus] = useState<Status>('INSIGHTS_LOADING');
  const dataInsightsPipeline = useRef<Pipeline | null>(null);

  if (dataInsightsPipeline.current === null) {
    dataInsightsPipeline.current = new Pipeline([
      new PPLSampleTask(props.data.search),
      new DataInsightsTask(props.core.http),
    ]);
  }

  useEffect(() => {
    let subscription: Subscription;
    if (dataInsightsPipeline.current) {
      subscription = dataInsightsPipeline.current.status$.subscribe((status) => {
        setPanelStatus(status === 'RUNNING' ? 'INSIGHTS_LOADING' : 'INSIGHTS_LOADED');
      });
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let subscription: Subscription;
    if (dataInsightsPipeline.current) {
      subscription = dataInsightsPipeline.current.output$.subscribe((output) => {
        setDataInsights(output.dataInsights);
      });
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (dataInsightsPipeline.current) {
      dataInsightsPipeline.current.run({
        ppl: `source=${props.indexPattern.getIndex()}`,
        dataSourceId: props.dataSourceId,
      });
    }
  }, [props.indexPattern, props.dataSourceId]);

  const onToggle = useCallback(
    (item: string) => {
      const selection = new Set(selectedInsights);
      if (selection.has(item)) {
        selection.delete(item);
      } else {
        selection.add(item);
      }
      setSelectedInsights([...selection]);
    },
    [selectedInsights]
  );

  const onGenerate = useCallback(async () => {
    setPanelStatus('DASHBOARDS_CREATING');
    setUpdateMessages([
      {
        username: 'Dashboards assistant',
        event: 'started to create visualization',
        type: 'update',
        timelineIcon: 'sparkleFilled',
      },
    ]);
    const visualizations: Array<{ id: string; type: string }> = [];

    for (const insight of selectedInsights) {
      const pipeline = new Pipeline([
        new Text2PPLTask(props.core.http),
        new PPLSampleTask(props.data.search),
        new Text2VegaTask(props.core.http, props.core.savedObjects),
      ]);
      try {
        const [inputQuestion, inputInstruction] = insight.split('//');
        // generate vega spec
        // TODO: validate output.vega presence
        const output = await pipeline.runOnce({
          index: props.indexPattern.getIndex(),
          inputQuestion,
          inputInstruction,
          dataSourceId: props.dataSourceId,
        });
        const visTitle = output?.vega?.title;
        const visDescription = output?.vega?.description;
        // saved visualization
        const loader = getVisNLQSavedObjectLoader();
        const savedVis: VisNLQSavedObject = await loader.get();
        savedVis.visualizationState = JSON.stringify({
          title: visTitle,
          type: 'vega-lite',
          params: {
            spec: output?.vega,
          },
        });
        savedVis.uiState = JSON.stringify({
          input: inputQuestion,
          instruction: inputInstruction,
        });
        savedVis.searchSourceFields = { index: props.indexPattern };
        savedVis.title = visTitle;
        savedVis.description = visDescription;
        const id = await savedVis.save({});
        visualizations.push({ id, type: 'visualization-nlq' });

        const url = props.core.application.getUrlForApp('text2viz', {
          path: 'edit/031263c0-b3a4-11ef-82ed-0f7ea3b11071',
        });

        setUpdateMessages((messages) => [
          ...messages,
          {
            username: 'Dashboards assistant',
            event: (
              <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText>created visualization</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success">success</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            type: 'update',
            children: (
              <EuiText size="s">
                <p>
                  {insight}{' '}
                  <EuiLink href={url} target="_blank">
                    view
                  </EuiLink>
                </p>
              </EuiText>
            ),
            timelineIcon: 'check',
          },
        ]);
      } catch (e) {
        setUpdateMessages((messages) => [
          ...messages,
          {
            username: 'Dashboards assistant',
            event: (
              <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText>created visualization</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger">fail</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            children: (
              <EuiText size="s">
                <p>{insight}</p>
              </EuiText>
            ),
            timelineIcon: 'cross',
          },
        ]);
      }
    }

    try {
      // create dashboard
      const dashboardId = await createDashboard(visualizations);
      const url = props.core.application.getUrlForApp('dashboards', {
        path: `#/view/${dashboardId}`,
      });
      setUpdateMessages((messages) => [
        ...messages,
        {
          username: 'Dashboards assistant',
          event: (
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText>
                  created dashboard{' '}
                  <EuiLink href={url} target="_blank">
                    view
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="success">success</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          type: 'update',
          timelineIcon: 'check',
        },
      ]);
    } catch (e) {
      setUpdateMessages((messages) => [
        ...messages,
        {
          username: 'Dashboards assistant',
          event: (
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText>created dashboard</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="danger">fail</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          type: 'update',
          timelineIcon: 'cross',
        },
      ]);
    }

    setPanelStatus('DASHBOARDS_CREATED');
  }, [
    props.core.http,
    props.core.savedObjects,
    props.data,
    selectedInsights,
    props.dataSourceId,
    props.indexPattern,
    props.core.application,
  ]);

  return (
    <EuiFlyout onClose={props.onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Suggested analytics</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {panelStatus === 'INSIGHTS_LOADING' && (
          <EuiEmptyPrompt
            icon={<EuiLoadingLogo logo="visPie" size="xl" />}
            title={<h2>Generating Insights</h2>}
          />
        )}
        {panelStatus === 'INSIGHTS_LOADED' && (
          <>
            {Object.keys(dataInsights).map((key) => (
              <CheckableDataList
                title={key}
                items={dataInsights[key]}
                selection={selectedInsights}
                onToggle={onToggle}
              />
            ))}
          </>
        )}
        {(panelStatus === 'DASHBOARDS_CREATING' || panelStatus === 'DASHBOARDS_CREATED') && (
          <EuiCommentList comments={updateMessages} />
        )}
        {panelStatus === 'DASHBOARDS_CREATING' && <EuiLoadingContent lines={2} />}
      </EuiFlyoutBody>
      {panelStatus === 'DASHBOARDS_CREATING' && <EuiProgress size="xs" color="accent" />}
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onGenerate}
              isLoading={panelStatus === 'DASHBOARDS_CREATING'}
              isDisabled={selectedInsights.length === 0}
            >
              Generate dashboard
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
