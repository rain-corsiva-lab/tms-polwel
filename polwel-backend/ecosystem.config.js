module.exports = {
  apps: [
    // Use __dirname so the config works regardless of where PM2 is started from
    {
      name: 'polwel-backend-local',
      script: __dirname + '/dist/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'local',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
      ,
      autorestart: true
    },
    {
      name: 'polwel-backend-staging',
      script: __dirname + '/dist/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      restart_delay: 5000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'polwel-backend-production',
      script: __dirname + '/dist/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '2G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      restart_delay: 5000,
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s'
    }
  ]
};
