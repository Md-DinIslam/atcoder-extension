#!/usr/bin/env python3
"""
Packaging script for Chrome Web Store and Firefox Add-ons (AMO).
Builds separate, browser-compliant packages:
1. atcoder-pulse-extension.zip (and atcoder-pulse-chrome.zip) for Chromium (Chrome, Brave, Edge)
2. atcoder-pulse-firefox.zip for Firefox & Mozilla Developer Hub (AMO)
"""

import os
import zipfile
import json
import shutil

def package_browser(target_name, manifest_source):
    if os.path.exists(target_name):
        os.remove(target_name)

    include_dirs = ["icons", "popup", "content", "background", "utils"]
    total_files = 0

    with zipfile.ZipFile(target_name, "w", zipfile.ZIP_DEFLATED) as zf:
        # Write specific manifest as manifest.json inside zip
        zf.write(manifest_source, "manifest.json")
        total_files += 1

        # Add directories
        for d in include_dirs:
            for root, _, files in os.walk(d):
                for file in files:
                    if file.startswith(".") or file.endswith("~"):
                        continue
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, ".")
                    zf.write(full_path, rel_path)
                    total_files += 1

    size_kb = os.path.getsize(target_name) / 1024
    print(f"  ✅ Created {target_name} ({total_files} files, {size_kb:.1f} KB)")

def main():
    with open("manifest.json", "r") as f:
        v = json.load(f).get("version", "1.0.0")

    print(f"📦 Packaging AtCoder Pulse v{v} for Chrome & Firefox...\n")

    # 1. Chrome build (atcoder-pulse-extension.zip)
    print("🔹 Building Chromium package (Chrome, Brave, Edge):")
    package_browser("atcoder-pulse-extension.zip", "manifest.json")
    shutil.copyfile("atcoder-pulse-extension.zip", "atcoder-pulse-chrome.zip")
    print("  ✅ Copied as atcoder-pulse-chrome.zip")

    # 2. Firefox build (atcoder-pulse-firefox.zip)
    print("\n🦊 Building Firefox package (AMO / Developer Hub compliant):")
    package_browser("atcoder-pulse-firefox.zip", "manifest.firefox.json")

    print("\n🚀 All packages built successfully!")

if __name__ == "__main__":
    main()
