/**
 * Break Page - Redirect
 * Legacy entry point that redirects to the unified timer page.
 * All break timer logic is now handled by pages/timer/index.js
 */

import { replace } from '@zos/router';

Page({
  onInit(params) {
    console.log('[Break] redirect to timer-select, params:', params);
    // Attempt to pass through new-format params; if not recognized, go to select screen
    let p = {};
    try {
      p = params ? (typeof params === 'string' ? JSON.parse(params) : params) : {};
    } catch (e) {
      // ignore
    }

    if (p.mode) {
      replace({ url: 'pages/timer/index', params });
    } else {
      replace({ url: 'pages/timer-select/index' });
    }
  },
});
