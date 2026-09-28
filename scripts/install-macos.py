#!/usr/bin/env python3
"""Build and install Nocturne for the current user. No administrator access needed."""
from pathlib import Path
import os, plistlib, shutil, subprocess, tempfile
root = Path(__file__).resolve().parents[1]
app = Path.home() / 'Applications/Nocturne.app'
label = 'com.lersent.nocturne'
agent = Path.home() / 'Library/LaunchAgents' / (label + '.plist')
domain = f'gui/{os.getuid()}'
if not (root / 'cockroach.html').is_file():
    raise SystemExit('Run npm ci && npm run build first.')
with tempfile.TemporaryDirectory(prefix='nocturne-build-') as tmp:
    staged = Path(tmp) / 'Nocturne.app'
    contents = staged / 'Contents'
    binary = contents / 'MacOS/Nocturne'
    binary.parent.mkdir(parents=True)
    subprocess.run(['xcrun', 'swiftc', '-O', str(root / 'macos/Wallpaper.swift'), '-o', str(binary), '-framework', 'Cocoa', '-framework', 'WebKit', '-framework', 'IOKit'], check=True)
    shutil.copy2(root / 'macos/Info.plist', contents / 'Info.plist')
    resources = contents / 'Resources'
    scene = resources / 'scene/scenes/roachscape'
    scene.mkdir(parents=True)
    shutil.copy2(root / 'cockroach.html', scene / 'wallpaper.html')
    for name in ['AppIcon.icns', 'menubar.svg']:
        shutil.copy2(root / 'macos' / name, resources / name)
    for name in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
        shutil.copy2(root / name, resources / name)
    shutil.copytree(root / 'licenses', resources / 'licenses')
    subprocess.run(['codesign', '--force', '--deep', '--sign', '-', str(staged)], check=True)
    subprocess.run(['launchctl', 'bootout', f'{domain}/{label}'], capture_output=True)
    app.parent.mkdir(parents=True, exist_ok=True)
    if app.exists():
        backup = app.with_name('Nocturne.previous.app')
        if backup.exists():
            raise SystemExit(f'Remove or move the previous backup before reinstalling: {backup}')
        app.rename(backup)
    shutil.copytree(staged, app)
agent.parent.mkdir(parents=True, exist_ok=True)
agent.write_bytes(plistlib.dumps({'Label': label, 'ProgramArguments': [str(app / 'Contents/MacOS/Nocturne')], 'RunAtLoad': True, 'KeepAlive': {'SuccessfulExit': False}, 'ProcessType': 'Interactive', 'StandardErrorPath': '/tmp/nocturne.log'}))
subprocess.run(['launchctl', 'bootstrap', domain, str(agent)], check=True)
print(f'Installed {app}. Use the menu bar to pause or quit.')
