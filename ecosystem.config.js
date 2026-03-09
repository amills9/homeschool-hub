module.exports = {
  apps: [{
    name: 'homeschool-hub',
    script: './backend/src/index.js',
    cwd: '/home/ubuntu/homeschool-hub',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      JWT_SECRET: 'ca38bcd6de833c59d5f6851630869acdc7a217691122d630081826e9eaa6261b',
      DB_PATH: '/home/ubuntu/homeschool-hub/data/homeschool.db',
      RESEND_API_KEY: 're_ZGjnvGpq_KMUhQaqGjcSGf9RP9A8ERxNp',
    },
    watch: false,
    max_memory_restart: '300M',
    log_file: '/home/ubuntu/homeschool-hub/logs/app.log',
    error_file: '/home/ubuntu/homeschool-hub/logs/error.log',
    time: true,
  }]
};
