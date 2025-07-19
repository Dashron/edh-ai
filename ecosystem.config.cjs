module.exports = {
  apps: [
    {
      name: 'edh-web-dev',
      cwd: './packages/web',
      script: 'npm',
      args: 'run dev',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development'
      },
      log_file: '../../logs/web-dev.log',
      out_file: '../../logs/web-dev.log',
      error_file: '../../logs/web-dev-error.log',
      merge_logs: true,
      time: true,
      restart_delay: 1000,
      max_restarts: 5,
      min_uptime: '5s'
    },
    {
      name: 'edh-web-prod',
      cwd: './packages/web',
      script: 'npm',
      args: 'run start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      log_file: '../../logs/web-prod.log',
      out_file: '../../logs/web-prod.log',
      error_file: '../../logs/web-prod-error.log',
      merge_logs: true,
      time: true,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};