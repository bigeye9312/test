---
tags: [area/error, pcie, aer]
---
# PCIe 오류 증거

AER와 Link 관련 증거를 수집하고 상관성을 점검합니다.

## 확인할 사항

관련 체크리스트: [[playbooks/pcie-enumeration#먼저 확인할 것|PCIe 인식 확인 항목]]

- 오류가 보고된 시점과 장애 시점
- AER의 종류 및 수집 범위
- Link Width / Generation Speed 변화

## 주의

> [!WARNING] Evidence limitation
> AER 기록이 없다는 사실만으로 PCIe 오류가 없었다고 판단해서는 안 됩니다.

AER가 없다고 PCIe 문제가 없었다고 확정할 수 없다.

## Related Playbooks

- [[playbooks/pcie-enumeration|pcie-enumeration]] — 장치 인식 단계와 비교
- [[playbooks/performance|performance]] — Link 속도나 폭 저하 및 성능 영향이 있다면
