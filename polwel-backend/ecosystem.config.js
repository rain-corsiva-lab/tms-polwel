module.exports = {
  apps: [
    {
      name: 'polwel-backend-local',
      script: 'dist/index.js',
      cwd: '/var/www/polwel/backend',
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
    },
    {
      name: 'polwel-backend-staging',
      script: 'dist/index.js',
      cwd: '/var/www/polwel/backend',
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
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'polwel-backend-production',
      script: 'dist/index.js',
      cwd: '/var/www/polwel/backend',
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
      max_restarts: 5,
      min_uptime: '30s'
    }
  ]
};
