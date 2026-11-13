---
tags: [area/internal, ftl, ssd, failure-analysis]
---
# Block Wear 편중

> [!NOTE] 데모 Playbook
> SSD 장애 분석 및 CIA Wiki 탐색 기능을 시험하기 위한 가상 예시입니다. 실제 장비의 확정 진단이나 제품 사양을 의미하지 않습니다.

## 주요 증상

일부 블록의 P/E Cycle이 과도함.

## 수집할 증거

- Block별 P/E Cycle 분포.
- 발생 시각, SSD 모델·펌웨어 버전, 호스트 구성, Workload 조건을 함께 기록한다.
- 동일 현상이 재현되는 경우 정상 장치의 동일 조건 로그와 비교한다.

## 분석 절차

1. Wear Leveling 수행 여부 및 Hot Data 편중 확인.
2. 최초 실패 시점을 기준으로 관련 로그를 시간 순서로 정렬한다.
3. 관측값과 추정 원인을 분리해 기록하고, 재현 조건을 좁혀간다.
4. 테스트 조건을 하나씩 변경하여 가설을 검증한다.

## 판정 시 주의

단일 Dump 또는 하나의 오류 카운터만으로 원인을 단정하지 않는다. Host·Firmware·Media 계층의 증거를 교차 확인한다.

## Related Playbooks

- [[playbooks/gc-state|gc-state]] — 관련 기본 분석 절차
- [[playbooks/ftl-metadata-replay-failure|FTL Metadata Replay 실패]] — 인접 점검 항목
- [[playbooks/ftl-slc-cache-exhaustion|SLC Cache 소진]] — 후속 점검 항목
