module.exports = {
  apps: [{
    name: 'homeschool-hub',
    script: './backend/src/index.js',
    cwd: '/home/ubuntu/homeschool',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      JWT_SECRET: 'CHANGE_THIS_TO_A_LONG_RANDOM_STRING_IN_PRODUCTION',
      DB_PATH: '/home/ubuntu/homeschool/data/homeschool.db',
    },
    watch: false,
    max_memory_restart: '300M',
    log_file: '/home/ubuntu/homeschool/logs/app.log',
    error_file: '/home/ubuntu/homeschool/logs/error.log',
    time: true,
  }]
};
