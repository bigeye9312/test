#!/usr/bin/env python3
"""Patch the fetched Quartz default configuration in the build workspace."""
from pathlib import Path
engine = Path(__file__).resolve().parent / ".engine"
config = engine / "quartz.config.ts"
source = config.read_text(encoding="utf-8")
source = source.replace('pageTitle: "Quartz 4"', 'pageTitle: "SSD Analysis Playbook"')
source = source.replace('baseUrl: "quartz.jzhao.xyz"', 'baseUrl: "bigeye9312.github.io/test"')
source = source.replace('provider: "plausible"', 'provider: "none"')
config.write_text(source, encoding="utf-8")
print("Configured Quartz for bigeye9312.github.io/test")
