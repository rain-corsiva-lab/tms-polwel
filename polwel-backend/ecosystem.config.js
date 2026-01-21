module.exports = {
  apps: [{
    name: 'polwel-backend',
    script: './dist/index.js',
    env: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    instances: 1,
    max_memory_restart: '1G',
    // Auto-restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    // Error handling
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Performance
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    // Environment-specific settings
    exp_backoff_restart_delay: 100
  }]
};
