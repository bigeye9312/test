---
tags: [area/discovery, pcie, enumeration]
---
# PCIe 인식 확인

PCIe 장치 및 Function의 인식 상태에서 분석을 시작합니다.

## 먼저 확인할 것
1. 기대한 PCIe Function이 모두 보이는가?
2. Host와 Dump의 수집 시점 및 관측 범위가 일치하는가?
3. Dual Port 구성이라면 포트별 인식 상태가 다른가?

## Dump Agent에게 요청할 내용
PCIe 인식에 관련된 관측값과 그 출처를 확인하고, 누락된 정보는 별도로 기록한다.

## 주의
인식되지 않는 이유를 이 단계에서 단정하지 않는다.

## Related Playbooks

- [[playbook/nvme-initialization|nvme-initialization]] — PCIe는 보이지만 NVMe 초기화에 문제가 있으면
- [[playbook/pcie-error|pcie-error]] — AER 등 PCIe 오류 증거가 관측되면
