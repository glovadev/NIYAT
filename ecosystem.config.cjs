module.exports = {
  apps: [
    {
      name: "niyat-store",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "./",
      instances: "max", // or 1-2 depending on VPS CPU cores
      exec_mode: "cluster",
      max_memory_restart: "800M",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};

