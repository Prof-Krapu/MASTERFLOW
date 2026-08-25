<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.corrector.@SLUG@</string>
  <key>WorkingDirectory</key>
  <string>@DIR@</string>
  <key>ProgramArguments</key>
  <array>
    <string>@NODE@</string>
    <string>--import</string>
    <string>file://@DIR@/node_modules/tsx/dist/loader.mjs</string>
    <string>server.ts</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key>
    <string>@PORT@</string>
    <key>NODE_ENV</key>
    <string>production</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>@DIR@/deploy-launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>@DIR@/deploy-launchd.err.log</string>
</dict>
</plist>
