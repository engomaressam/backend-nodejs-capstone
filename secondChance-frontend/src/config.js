const config = {
  // Empty means the back end is reached through the same origin (the website server proxies /api and /images)
  backendUrl: process.env.REACT_APP_BACKEND_URL || '',
};

console.log(`backendUrl in config.js: ${config.backendUrl}`)
export {config as urlConfig}
