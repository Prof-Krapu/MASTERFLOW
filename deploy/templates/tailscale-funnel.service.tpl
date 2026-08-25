[Unit]
Description=Tailscale Funnel for Correctors
After=network.target tailscaled.service corrector-manage.service
Wants=corrector-manage.service

[Service]
# Type=oneshot + RemainAfterExit : `tailscale funnel --bg` POSE une configuration dans
# tailscaled puis rend la main aussitot. En Type=simple, systemd voyait son process
# principal sortir en 0 et affichait l'unite « inactive (dead) » alors que le funnel
# servait bel et bien (constate le 2026-07-30 : HTTP 200 en public, unite inactive).
# Un etat systemd qui contredit la realite est un piege pour le prochain depannage.
#
# `Restart=` est retire : systemd le refuse sur Type=oneshot. La configuration du funnel
# vit de toute facon dans l'etat de tailscaled et survit a un redemarrage du demon.
Type=oneshot
RemainAfterExit=yes
ExecStart=@TAILSCALE@ funnel --bg --https=443 http://localhost:@PORT@

[Install]
WantedBy=default.target
