/**
 * Pokus App
 * Gamified ADHD Focus Timer for ZeppOS
 */

App({
  globalData: {
    sessionSeconds: 0,
    earnedCoins: 0,
  },

  onCreate() {
    console.log('[App] onCreate');
  },

  onDestroy() {
    console.log('[App] onDestroy');
  },
});
