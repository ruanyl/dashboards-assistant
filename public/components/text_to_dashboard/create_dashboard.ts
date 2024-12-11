/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import uuid from 'uuid';

import { getDashboard, getDashboardVersion } from '../../services';

interface PanelConfig {
  id: string;
  version: string;
  type: string;
  panelIndex: string;
  gridData: {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
  };
}

export const createDashboard = async (objects: Array<{ id: string; type: string }>) => {
  const dashboardService = getDashboard();
  const loader = dashboardService.getSavedDashboardLoader();
  const dashboard = await loader.get();
  const panels: PanelConfig[] = [];
  const { version } = getDashboardVersion();

  const PANEL_WIDTH = 24;
  const PANEL_HEIGHT = 15;
  let x = 0;
  let y = 0;
  for (const obj of objects) {
    const panelIndex = uuid.v4();
    panels.push({
      version,
      id: obj.id,
      type: obj.type,
      panelIndex,
      gridData: {
        i: panelIndex,
        x,
        y,
        w: PANEL_WIDTH,
        h: PANEL_HEIGHT,
      },
    });
    x = x + PANEL_WIDTH;

    if (x >= 48) {
      x = 0;
      y = y + PANEL_HEIGHT;
    }
  }

  dashboard.panelsJSON = JSON.stringify(panels);
  dashboard.title = `[AI Generated] - ${uuid.v4()}`;
  dashboard.description = 'The dashboard was created by OpenSearch dashboard assistant';

  return await dashboard.save();
};
