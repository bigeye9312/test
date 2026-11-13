---
id: fw-state
title: Firmware 상태
description: 펌웨어의 상태 전이 및 대기 조건을 검토합니다.
category: internal
tags: [firmware, scheduler]
links:
  - to: command-processing
    type: related
    label: Command 경로의 관측 증거 참고
---
# Firmware 상태

## 확인할 사항
- 관련 상태 전이의 전후 조건
- 특정 Task의 대기 원인
- 상태 해석에 필요한 추가 Dump 정보

## 판단 원칙
단일 시점의 상태를 시간적 정체로 해석할 때는 추가적인 증거가 필요하다.
