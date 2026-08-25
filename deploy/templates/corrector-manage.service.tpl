[Unit]
Description=API Manage - gateway correctors (:@PORT@)
After=network.target @WANTS@
Wants=@WANTS@

[Service]
Type=simple
WorkingDirectory=@DIR@
ExecStart=@NODE@ --import file://@DIR@/node_modules/tsx/dist/loader.mjs server/index.ts
Environment=PORT=@PORT@
Environment=NODE_ENV=production
# proxy  : reverse-proxy vers les 11 process forks (~1,2 Go de RSS au total, mesure).
# static : la gateway sert elle-meme les dist/ des forks, aucun autre process (78 Mo mesures).
# Pose par deploy/install-services.sh selon --light. Cf. server/routes/proxy.ts.
Environment=CORRECTOR_SERVE_MODE=@SERVE_MODE@
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
