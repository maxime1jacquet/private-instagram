const target = process.env.PB_PROXY_TARGET || 'http://127.0.0.1:8090';
module.exports = {
  '/api/**': {
    target,
    changeOrigin: true,
    timeout: 120000,
    proxyTimeout: 120000,
  },
};
