module.exports = {
  apps: [{
    name: 'polwel-backend',
    script: './dist/index.js',
    env: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    instances: 1,
    max_memory_restart: '1G'
  }]
};
