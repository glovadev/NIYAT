module.exports = {
  apps: [
    {
      name: "niyat-store",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3008",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "800M",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3008,
      },
    },
  ],
};

