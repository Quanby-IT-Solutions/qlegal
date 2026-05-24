module.exports = {
  apps: [
    {
      name: "qsign-main",
      script: "pnpm",
      args: "start",
      cwd: "/home/ubuntu/qlegal",
      kill_timeout: 5000,
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        PORT: 3000,
      },
    },
  ],
};
