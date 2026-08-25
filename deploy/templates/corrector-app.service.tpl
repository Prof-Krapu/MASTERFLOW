[Unit]
Description=Corrector @LABEL@ (:@PORT@)
After=network.target

[Service]
Type=simple
WorkingDirectory=@DIR@
ExecStart=@NODE@ --import file://@DIR@/node_modules/tsx/dist/loader.mjs server.ts
Environment=PORT=@PORT@
Environment=NODE_ENV=production
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
