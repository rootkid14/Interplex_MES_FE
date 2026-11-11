#!/usr/bin/env python3
"""IPTH MES Agent DevKit v1.1 compatibility-gate upgrade.

Place in Interplex_MES_FE; run from Interplex_MES_BE:
  python ../Interplex_MES_FE/IPTH_AgentDevKit_v11_Updater.py --scan
  python ../Interplex_MES_FE/IPTH_AgentDevKit_v11_Updater.py --apply
  python ../Interplex_MES_FE/IPTH_AgentDevKit_v11_Updater.py --rollback

Requires DevKit v1 unmodified. No MES application files/DB changes.
"""
from __future__ import annotations
import argparse,base64,hashlib,io,json,os,sys,tempfile,zipfile,datetime as dt,subprocess
from pathlib import Path

PATCH_ID="agent-devkit-v11-compatibility-20261107"
ORIGINAL_HASHES={'developer_tools/IPTH_Updater_Template.py': '23e115b44b441a306b12894341bbd88710f50efcfa95d81fa32ef03045957208', 'docs/mes_agent/UPDATER_STANDARD.md': 'de6676e0fa7e65fd64f324bcc26548f25df1f64dbba8fd67b7f85d6d1dc93d8d', 'docs/mes_agent/COMPATIBILITY_POLICY.md': None, 'docs/mes_agent/modules/developer_tooling.md': None, 'docs/mes_agent/CHANGELOG.md': 'd9ea1832803c28e0b873b9c58f3b6d6da27ef397aca8a7d9f19f1e86b13b1988', 'docs/mes_agent/changes/2026-11-07-agent-devkit-v11-compatibility.md': None, 'docs/mes_agent/README.md': 'ab2905b38876ad2ee438f3d5832c326dae49292e9028903fd9e7920053a8ab8d', 'docs/mes_agent/MODULE_INDEX.md': '5fae7738bf75114f76f955fb0f634d0f4d246b965e0f4115f7782c2fd4da63b5'}
AFTER_HASHES={'developer_tools/IPTH_Updater_Template.py': 'c3b41cbcb109217627a37ced3257a6ff668464421a1a394860877d1c78d1142f', 'docs/mes_agent/UPDATER_STANDARD.md': '373a1b7099e8c6a674451cc01bbf557e947a81b96b97b9664958b877fc51c0a5', 'docs/mes_agent/COMPATIBILITY_POLICY.md': '4cf0492bdc30b7531a2279656e0917177ccef2190f72934cfc145694d11e8746', 'docs/mes_agent/modules/developer_tooling.md': '887cc4343de6706d0c790aa40f6191db2c1da04f0ccd61d5ede30f7ba872dac1', 'docs/mes_agent/CHANGELOG.md': '2f2428315bd9ac0272d3eba37183688a555a292b1e7aaa2f5aad057b100a9077', 'docs/mes_agent/changes/2026-11-07-agent-devkit-v11-compatibility.md': '8d646647149659fb3006a5c3b9899426112b420415cc0dea015724d4dfc322f2', 'docs/mes_agent/README.md': '9d381b0a7d4bfd9d91fe71772387f9cdeaa9d07fcb656d19f29229480269d902', 'docs/mes_agent/MODULE_INDEX.md': 'c85a05bdfd3507c7443baf6e3cd85a6ba18477ad6c7136339f5e0cbad9baee03'}
PAYLOAD="UEsDBBQAAAAIAHwPZ12xufqc2xgAAC9UAAAoAAAAZGV2ZWxvcGVyX3Rvb2xzL0lQVEhfVXBkYXRlcl9UZW1wbGF0ZS5webU873fbNpLf/Veg3MuWaiXaSXq9rnLa95xYSbzr2H6y026r6PgoEbJYUySXIG2rPt/ffjMDgARISnaS3XxwRBAYzC8MZgYD/umb/VLk+/Mo2efJDcs2xSpNXu45jjPhpQjmMWfH55fv2YfxBSuzMCh4zvIySXg+ZOsggYY037DBQCyChO3DjyDL4k2fpVkRpUkQQ0uexvE8WFx7e3tvy6LMOQuueFIIBn95DhBZwM4PL9+8Z68/nh6djNnR8WT85vJs8itzYYpoyUXh/S7ShH3PsmATp0HIllHMRY8BAntiFWUsKthtVKxYsYqEwg9wyBlfz3kIrZyJYM3ZTRBHSEPI4G/AogSmFgWSEacJ1wQCopMyYcs8XbPjBBqymN/5wAH/9Xi4xxSTmOft22/fjvdDfsPjNOO5X6RpLPaRd/5HCda/5Osshl9eVnFsMMiCYrEahFGO8OiBi/31xl+sguSK/8tmI7E8Pt3eacoSXtym+TULFgsuxCuGsiszwQKQnABxA/eAcf+370VZsfLXXPiKb77u6Z59vLw4PhqzK5BLzrNU9Ly9D5W2VEJdpGtAIZpHcVRsGKCyuBZsGUTxYBGnAuYBuvNIXG9QlGVynaS3CbvhuQDVEh4q6R4JyfeXpFi+z6J1luYFKEaSFgGqoNjb0235VRbkgutnxLmIQCsCwcJCt64CsYqjuX5EvdO/U6F/5RUQUc6zPEVGVS0bIbGSzwBLI7XmRYB6p3sWICFUZNkdOLEyOp/DY5+dA1XnqYju8HFv7+jsjX8+Gb89/gcbMaetD+kChAkCoQW27+x9PD86vBz7x0c+LLDL8eQUhuWc+A7zurnzP9Ng8Mfh4LeDwV9m9U/fG8zuX/afHxw8/IfT29vbC/mShdEVyMxFAoZsvilw/Q3+ChqR45pgABdEkGj+eWIVvPjPH6l7z1vxOzVcQ4vTBbDfz9O0cGEF5sWQKCaQ+EPCXILcYZmEtGhR62TfPvuO/vdAnmhJerI3/ouWzK1H7LeZ5PS8SPiwAFwyHzt7vzZ713MY1FaDvZyLNL7hQCC9DiLB2c9BXPJxnqe562y1KKjboEI3UcjJWKYFy9IoKaLkihUpWV//Mg8WPJDrpBKICJbAQA5rPIJ58+B2iMJocBD4ASuBRSJK0NAtqGNfdoSJ8R2OrGhrI/4hEgJx0TORojqSzBvshzoV3AIDwNwAfOfTJ6fPnH3VJYPXlha7NKinscuQwcEcmFcWwD1EyvE8B4WdoXxhn0AGyZ/Tg5kkJ2H3bcn2O+T3sIu0jwnykAgaMge2F6AhRwb1KvSCZOPemcigSlKD63hg3nDSJA25v07DEvYkfA4jQe0e7Kj4v+9nm0UA5s33qZnsZsNmOr3eLkzfpvk8CkOebEdWaSSx+DuFraUqsGKueOGihg2VedEy7Vx8sj9KF3Vyv+ps6pXso9ZhvQZQpro77E005076LjbrOEquGYddMeOCNg0mMUVSQV1dDa+WjZoc5hJyuLtzjglflqTJqrcav3UGxVDZSzESNrB1tPBv8wiUNQSDpjlpmkWJBL7VjFlfowlR1mp0mZe8z/gdqImfXtOjnHEZ9lmxxhWjtwYYKfC3m+V8Gd2NpPIMpPIMQJsA7ghxN2ZT6Bf5puYGOUep8JYhuAuJixM5t3Onh3vf0rZsS09Rh5a78WYZl2Ll2q0IVWyShQuvAeMkdXt1B3ip7QIQ1iemKFoj8A7jjWW5oTeqt0esETiiYXWhQ5mQpPFdtZUEoU+ujEt/0VwrhZajtb/hI37A3KoXWnzLw3RM3baGoZbh/7tV7Bwhs7WymLbzCiZDK1qFgNblZJkCXtjNQ2qEa8+dc6Cw4HeFy5NFGgLskVMWy8FPjgIg9cGPQoCCwDxc6E7V6vS27AVVD3tHaLkN3rKM4zWxuBqykxHHCbnaNQuauEh/U1j4klO/FVc1os9iUI4KVdW6cwNTOLB1KXDrWMQlbLUJOPzrDNxOmpWAqqnRi7LwgoZyDQuL/Mmt+OEwXI+LGrnGW1MqwIcGJZ2dwSTxQHAfOnAcgVJ6Oq0In1nYKzmE5PrYb+yplAWMkRPTGT3NyySMSWT3D5V3BpZijardkkObQdhVMajhS7XIGMNuSYJhgB5GDEjNHDz1hKXz3/lCi0ohKf2SUcMjwvkkF6XHYg0hR1h29ALhZ+idGIYNsMdOQBjy4DF0j8osjtCfrfSdkNfbdFzD5XcZYM9Df86Be4hzjaVs8qXj7Fi4NIdBkIvMPcWglZzYBqsb/Rv+HjeWc+6A279E9//+xx8enH5zqt6jsrLQriR18f4QH8Hxp2lhPlSXDo7oiH7EXMsuS2NguB29hottKJmC0fQ6ugAaUCqGGMObJn63S2xmIzpIm6fhhrYbCZ6sOHkIbodCBEtMrZj6QC2d6rBN2jSiFrYKuRCNHvtm1JjrMSLPFXEY0OGWRvrSQSUuEC/IwK0IXZt8aS+m0DhD8baUsok3IWrsZ6gUaAqnlc2cabNUWaqqi2W+ZqaN1sCAI+jNN5iX2Ysj8yiyFOgwuXW4bbwHOuVbx1uDFScrmKGlUPPstM/dxrg21tKMhgxAq40JEMXI0A7tHSs+CXVMRPYa8Qmfis8hrMtunOTsejmrXZPgVnt6x35tSqGbk6A+jtosIESsbZIxrslh6GOJXFGrMN1F3viGw+6h85ZETBDC5sc+BPl1iNkkBZgR4E5e7ytsbUKJ79spVNHgvtKPJ8ujA2E5PUQeDDEtGNp8Cb6mQouwxtFG5837w9N345Ozd8jQr+OffGjyyJpAOw83Eb+tFrH2Z2SjXyZK1WHLmc62+VS6u+Eq/VuXsJ7vM9ZwmyLTWwnyPNiwdCmdSvRDtB7ZuU/T3bTebHeHzV6G32m1S4BiseLrwKE94PnOCHn8t/GbSzZ9c/YBHH//w+Hp8dvxxeVs2IAqAY6eox+S83+WUc7DV+CZFUGtVoYrhFkv02ypRO+oC1f5bkcQgK9bMQA2/isIU5hVAqyjBCM+MCyAiZmWAfpjC8V4DusHhQjR9gJ+gI8YgxhGI+NR5jilC42T976MjpAvYkzQW2ZCT8I6Eu2amBAFIXjhVhm9KPSvo4Ta78lr8mU8jlTQo3JJ9OMiTVDw9B5DWJ8SfPgkjy58lbE3WjBDlkfzslDNV1Hhz3Pg48qpQwuDKbvCisX2oEuJIQp16LTNBT4c/BYM/qgz3z8doCu8mOLQ2aPu4A7tkvqUcFgPZRL9s+TEcHs+0GaeXBUr9tLzfjqwPT2FAnICBn45ImEVoRBKAIwcOU1hPWUIvlwYuu0XS63UqBugxGoTMfUFZbZT8avUbdUG74PwJhJpvjFTtZ9LXpmIMsNjE+Az4rKvEdBZlx303K446WAQ3wYbYWKpWlBtIcChE7SvQTJSORGccCdeU8njmcTiy1dgA1c7Ol50h8bW/GiojKVpmjZM0Jq8kul3O+H+uQyqp/Io/6vN8Fs6I8HDmB1sepqteSAaEGv33llH1G8d3AF/wb8VwBfo8Wcyh4veV6x7hYVabESHNtBrPHQGDQWK7ImtpDN6A30dQak8pwLqF7CWjfOep5/z2EbvU/i9+8mDv737g/5LtHd4lrBr9zFXmaYQDDUA7DyQkOclIybxjZLCvevVxyd4ZCTAKIEueY6dcZcDv2fuQb/HvmPuD2yAJtKVRxo67Uu81fJ2lynwihjSpxB6aCaabgALm3vUvdrOSRPIxmI2CzXkhv13YwS+mlJHc0NQGL8NYgEB7dIhuOye/nt4hcKO1uW6cpLYPYH5Ftq/nT049fyWJjQw+euoGxVrzGcgpZARsLTi9LZCyQRXIadAyROLFiStBDlFKNrJiLmjRAQ+iG+5Hj4JzTqCagkLF7XKg+gVrvkkX41ajkVNukQQeniO93saJe46yFxSCrERnmYjrq7p8OXMSgnK89y2UkkUe9twsMzL0EhrLa7B57USOkmw5jsTOWpQI5yRjY8ZI33ooMpFTLRYY2LrZMjkmi5Q0IzSCJnpqgXP6koG71x2OE2LtwiDcOk8KFfK6JxL9DR75P4B5MexTC5QAU9Ep7gwkquMoer+FdIytjFTW+KQkm7qhNNtnykjEKmKtOPJPRHbOdDTVS9g4CjKGI9P6xIRLy8Td+qoY+PBG4ck7Uo0wEV1FIb4ciBW6e1gUeZ4pOeAk7gIMqpxScsiKwt1iIiHQvpntObwbvT8oJHGRjQ8ybFFGnKMAg/qPYHeiiKEoR6qTLal0kEL8F0EezKhCV5XcBNEMRWJuSGoBMgjZO/Hh0cafCCrfyIs++k5rVXaOXvVC3QilfkDIycq23auItWnESSq1seWkeGD6PnRexdACiXoIJRX1OOiEk7LgkjacJPXaCyVWEeV3cTKqgx20dG96lRZ27jzFGMq3bRZXVHRPNDv1zlZU+tN37G1P2R1whuRxClG9wAGEDTGje6Nfg/WAWnWeShqq0u189FpjjJS1pG7OnTDerwRgGxlyVv0KOe3nlKz09YU1fiUBLru21QZDbc77XRX2+ndRyrg9oBRo8Oayv3RsB91Mht0GLkJrY/6qCUQK0shV5h5q4u2Wpq6MvFoaoCcbXS/gt86Tw/qqnrXemCLpgpEaqpEEmUZlZHUskGrtVMgapC9EarGxxhmIeLhVF35HDQ2yZWBBMmOdEhjDNyhPQ48dzCbrj5xb7JRDWwysFJ8XPppPrpXYKfDvxzMvsmhB2xwAmz76F5B6GCqEczVZF/zjbDYiQ072YkdGrpNQGrTaGayrhXb0fu8Jo29Rl7giEe1tUbYoxna2vq3i7NTdYjLGoirzc6uhLBVl7DhG42PjU5HbkhCNDJEOFgFreqlDaPLfyaUcWBlvu5x8gcKPFHajgWiJkP9mkLvmSkeB3QDgFeOvo1Cve9NpfFXvWc1DHQ+tg2q9QLd73T579sra2HXMYXEFQG1ZtdOm2KPvUWaSweZO5IsfiX309G9GkULp7V9Qquzty1mlVXDMhKXuSsdQFqRCZZj24EJBAkyMIHNNb3Vug9TUiooImbj0smnz6VbeHgyAd/nV5nSzSnIxXE0DBwcmI8b5RRVipOikUbWfzbVmfCZlfs0ZzeyMa0cFgUoVdKqUUSlUNGHtq5zfnhxUec7CQ5uwxumphqirVIl5GBZw4iiCnGNBi00s0fyYANrV0u+PdzIAiFQ6ugyRujx7IoTAS0bPmhuUSIfJdpUQ0oApUuu0zKOkeJ7Uh5eOvS/HE5OnVa8455dkD71Dd3qs0mZoNOtnshmoak4ov1CtX5MIuPJCAUupbs+vstwl6BCPJhsuIXUr6fJAlxx3llQpTxG8tFyU/tlgIpRxNdUGImXoTASnp3F0aPUagOTg16EtcRUfqunC8hVwGQsEDAIfeaqEhP0cPpMlkXI37Q54BpSkDw0fsJ0R6si1rbH3Kif5nGvaytSRaamW2rXnkoHWLIafbwmDEK1dsVUKwGpTKFRztOGU3dUoEYGD9oKgzmHyhQZO0YHGIOvW+C8ATCXMgo2OlfurNQvWS7o7Nidanhnp29PjkGTG2FypVokcOret9Dts61KUG/yqA2WDkrguggaLbxMrKJd7rNaFZXCZDlmKZ1PSXXlSV2mGTp9ZabrOkYdjckxF+V6HYChUx3VGpWNuERd5Tv0tLms5pqMz88ujum6E3DncvyPS+aitg3SJN70hsoYycWQpbLy/Eml7+YqaJrgpycnquLvLH0kQ9Hyo7r+fUkWg4qJZNC9JWfQnegYYaJDqqhyA5zthn27aR52I9KGKUW6dBh6hVn6MGQ68FeDQIbfqlHfPjgNPZCnCMevj0+OL39l72BFMff0jP0yOb4cX1R6YPgRW/yXPqt1vNadymRTyiyqd9+ottTDDkqm93Lk8EfxMGP3ejjQdi8BtOi4OPs4eTOGfeTo7M3HD+PTSyAK/Ofzk8PTLoIqK/95i95PY6DBT/it9rO6sCfk+fAn8NWVp97r6NVy3St3U1o7FNvg24dPidlVBsUMZGvYRezpBnMM63rNAbLADwbUZDy0K46njWrjmc3cD4eTvx+d/XLK3h6fgHm6PFO12iY3dUluo3SuyR8gfED7fZ0w3TbNZPzz8fiX8RG4M6ey0udo24S7y3w+B4fJ+GR8eDFmp2dAHnXqKvRrDDo8OWGH70Dp2IcjhTyY/BtgJ2YghzW/6eZZnfntSPxCI05IP+rCuz1zZ1dyu8esVeOyi1FUXJcX6Xm9/CpO567zHZUfPaD1ql6puw/KoagLM9DzV/MJOoJzLSz+l7o2RN4zmncLpteWpp7QSOXoXVxt+Do33qFstS8uNafVdzc6ymqD6Cvd61y5an0/fwELnM6xHuzKSO1AGx60aQzJDvptQ9jW00/Jz+PJETguQ6ZOfQdYE1mdeMkLquRFR5QPr0pvVGSMK1p4rLJ/XjswfmFiDhZNh5WVzyRtZVpZvKehKdIyX/CqshRA3OZpcqUP756KEwa6NU52qLsbJdWXHZ6fnxyD5UBY9kVumUPrmP5gC0s+Z/o2R/AcOcLLRzq+1RWOr3SUUqGVlNjvMWEZakax1tcrGYa27Jdj8EIR4PHpuwvAGx1CpstlzOvSPPTYhJaS2jCJsApt2x/fMtmAyZC/SNVgfUUdNiqsNwXF5lQ5sQIv1rOrFQ6Uhy3vMvp0txdP5CpnuetmqnFf0VsBQ8Dk7evLkR2XytEOV/D0bTxEtJW0sdI10Ra/n4ohD5rVDmZEX9V3DDD7sYyjq1WhuI3ZXXWXUN2sV/z4E4hhgHxUCoQpmhxaSl3IxqL1mocRUAGiVLLC63aUVRRFmuGV9xCsSOERQPBvfESavIM6gO6DNzM9mA0hUpi+hPg7n/5Af3+c9ezk04NlDt0ABoEfBcsI/76YERfcObXOqXVOrQgjgAcE8wc42JJvGpn2VdWtfEspz6ttT1jmdESt2bmVj0803wtaWsBvdb/uEY/4s/Fvlk1KKgyxcQPfzzaQcgHIq1Wk4yDk5graEnRGeq1V7sJuil5L+Bos0/k9ObpO+0igyhlQM3TdXQV7wEcH6X8dqChNBDeUDkUfe8jANa/del/59T64K/BX3/3Qdz6kG6+/xkEqSxB/h10LPx+CNag1+cN2FN7XN3uGbFrx4F4emA4lCo2bVUOmkbCv2AyZwskhtnCcDkkxsjMP1kFEB30a8lbqCMDsoX1DtwKY5tEV3o3FEcTXdlJLX5etetYYtk8z8MptpVnWzap2Aqw1uHXfucbPOKg3O9XzKBHKi7UqPxqW60y46k2f8URgMiAQiygaqfOWKAkxBHvR8+iya33w1nuM+S3lkkGiLkhvxYkt3J+UI6wA9jpcHenisMPTI/b68M3f4efHc4jSMC2k1taekX0Y03+wIL9cDZR0Py+72aE/3bqDgQne9GlbmSYO+l62PUk7E/hkpSIzpvZ5/QUha6tvOBfD3Ya0vrasbp/TTfAtymoWOey+/G2b2dNUQ9TmC8WJxrUxfW3djJPOp131zvkizcPGOZLaYBTYqVris2HjxmtDJ2C3sgpLHsmXWwbC/v5DnQavrx12JM7J3aBpLcM76zpotDn7Ru29MolCrsIrps4utHYQyvHGLi4xTjG0tqPH0zaG2LmV5Sdc9W4w687Nd1lheb1a8qFS7Yp4ezt6AvVq+wbB5yUefG4jUelGlUyXIjBWVx3lN1/J2080fLj3ZBuhZNxa+x3n0+aab+ElMxz5YhVJP0K5HnhHy8c6KyUwD3/jfTYPZc5DbB1QZqjw9NecvCS9deEZf/8BCHsQbvUwT7zEFtd59uuz9bPw8tn7Zx+eXfzmGF96UdM/0aWaaK2Tnn7O5aex8FCr0LDowlfLydIT2W4WuFdIaPXSzGtNzk5OxnJHwZ2kYUxUpzNwVZReV5zEgwQ6tQWmsCwVAnMVPYRRzyNN7DqIEk0yfSULyyL1F7O8w/yKcpLn9AZt9iKPaOca+Zgk8n0lwgV9cosuPWNPvEvir8uCoui6vNi/ytMSogpVImN8AUUBoHGBmtR1ZCSKWNPrkUO89gsY5uweJ4OKLxiojcqusQaN5tDqE2swtthkfCT3qxWPs5H6Qgi8hLiIonhZqNT+XMj3UrH2d8+lPgQTYd5MTjDRdUf0yReDkJ1w0MJ3odv6+lQV09EIvXCvDJHTfwhcF/CpTKv5xS8XX3v0AmwRpQAWtyFsEMbt/HpdUldJResiGL01XAGFBJeLtCa/rlAxmdbaz3Z9+cSeqtecS3/ypBu+5cL0G2hvz3tVJNZftjFKzG1S7U8waoKtb/65S+MDjPqrY4K+j0idVEV0z6m/S9M3vvthfGnHRgpsZgZbXonGoSXDzvyFPvq3pIwUtCpJu9M3UvGq/E/70MtITQF4n7YR36fY3PfR2vm+qouxwjBp6i82+NWl8V1UuNIwWm57dzVId/2HuWm0izxIduTuocfVrLvQ1p/SEUNKodeFIIk5WKbLx5PJ2QSNe/2mT1ZkhJcfRAGSzXvbKX3x2ATPe3v/D1BLAwQUAAAACAB8D2dd3lskO4YLAAC7GgAAIgAAAGRvY3MvbWVzX2FnZW50L1VQREFURVJfU1RBTkRBUkQubWS9Wetu20YW/q+nOHB/bCKIZJ226W5TLOCLkqiIHcN2t8kuCnFEjqSpSQ47Q0pWgxb7EPuE+yT7nTmkLNlJ18AWmx+xKM7lXL7znYs+o0v9c2uczqmtc9VoR75RVa5cTv/+579ocnH9ms7GV4PBZ5/Ra/7WyfpSV40fDA5jGg7f2Ew1xlbfDId0sWmWttoeZjzlujArjRuSzNYGFzWW0kmFt3Whb6c4fPpynNIT6x5+neR6pQtbazdtrC18+jQePOMrJ9Wqu5Sydc4Xtx7XubbyNHe2vH/U8TgdkY4X8YCI0jSdKb/kj1lOvyWs5PTaqUyrmSlMs0nub+altWgWx8kDKcMBL7VqWqenq3fT70X7uN5QFPlMVf/LflXXxaYTm/+ctb6hgrXXVDv7k84actY2NNvAMHNTaL/xjS6pVO5GOz8cjqjC66x1Dk4jnzlTN5TDiVlj3YaU921Zsy09wQlLeDmzOSMCJq1UqePBF2zzM8ZF2JGKVimtTbOkuTJFlBXWY0tmyxpuETPSAjKybypLa2ca7VkSOj3u4CGPM5XdtLWnzMEAOn8BpQzExDHZkgAcD8FGQFEDcXHDKwNNnaqypfZk5qRWuF7NCg3/KuzwtnWZJrYDQxlGetJpnujbOpyRqDlj8+r10bOvnj8dQbWwM43LPA0b2WRQlgA+aJvrrFDugXIQILuhJxdHV1eU0A9Hl+f4czn+bnxy/VQMY2cw4Ar39RfTShWt9jGCDq6uoH31i3aW5jC7qjbd7pjOjPemWvSxdv9mvTK5rqAkoku2iIcVrZWrsDGmK60pPXl7dnF0PTmevJlcv59evH0zOXnPOsaDLx/4M6AsZWc5XcMRpIqit+USwTLadUWtKxZgE4xkGM1zBI9YBE51eg7obEVrq5vKrqv+NOhaK9cYVWArPFQU2MIgACpI3yrA2TqzMBUWzDZACUS1beOhMx2/BR0xAiCk9QbCGw2A0xMObUp/S2JAezkttZ92DDTt4JXCz1C2NBku3AgciWEedMht1jKjBUaBAhbKB5F6SQW+hPhltCNMYzpndNCsMFWOAy0e5NAtZVFpczM3QlM+HnwViCvXZW0bth4be96yNGx8ZkbBvF/atshppqFlZheV+YWjQtyCRVtn7SxU8H9ka4GB07KALV2qG0jU4vjAF50x4sFzluUKhNzHJ4ylQIo64Q9UmoUTsdndvnFt1oDEcbTXDb6LdbVKvEbINntawtlQP4HyJUOY2XmpqgVHOoSZOaskgNk8cj7QAcLy1Cy1ULjXsDlkZbO0YEwH9cPrMh58zVKf2swT4jH4huw8bA2WGw5fwBLs1MhW2L+ThIZDU3EQFaARThbAr8NGvOnTXUyntvoTeKeFS/2SKr0WfHAoA394AIv42lY5hya0bsEweRCm4rRYaJiPHQC+/DMLeg3DYWmIqbbqMyNLwdwEe3x39Y4AnyaZtQZ+VF6AkAmb1UXru2siD/5gI0Nw0ySlqlpgMsN94JJTzYwOELQIRM8IwW2NKXWIzN6PhLvxttjEg7+wcJeAOKOBpasRsPDHDCbzbV1bmBUgc92KNOEHXQLhyKEhxtkATArsGAsGtibfBgC/8y2Y7+eWs83aupsXjNR1Bz5JXRApHhx+HiT5OMkJ627rCqHi3qOwgJlDHbai18U8yiyC11Q4pUtvHDouDxZ1EC3v2YcxDptr8RqIGfYGIDOWPGOjPuR4L/y8dQ0dXUwAaI+XJcOtalA6cFSIh5NzRs2WJE13FcNe8kDHB3TNCW/LjlsJQtLyjIY+HZxbDgVbYmMGSqyRsBFBwYZ0hTwMmHBNwEmhMXOQ29KARjrZ1yi9CPK1gfcQd1Cm1HlXExTKlNQHBkwJw/Ile1aAow7FUb4tmq3Codrj5AfjhL8/TEDOnAcn56/wLUfgeqmrkEnu7CtS+TbLtM6Z2ERLUQFIXDFqthw3kkyK66BtMD6M5hnPEnQddDrnZoCszgRcXLBuobXH72wEIYzBICKptQKJqPlc0nTKYZ1wFlELLhwkCn3yrXz4aygUgmDD4Uwv1cpYNwoUSvPCrkeMEIL7a4sQBDBQ4h2PCV5GCl0a0LR2LlRaSB2Il1GnzAL8EkiT4xhpLb4T775EJ6+Pzl+N37x9dSfKXX7GhlFHvPkDolJMOTcct/uUFdFR/lDzjr6T9/gXnZ1Fp6fRtwhm10Qm3zMDogzeKUe7/cGo9wuMveQkr4E93VVfd3ZjY7FkJ1d/242mYITEBdDhcZuS0BPUhd3wBeSMv+mg0LGVWO1Sz7ERJd3Z29Pv34ynk/PT8bsgLirGvg7p3cEAZrZnOTqrcbrtTrh6f3U9PpseXZ68nlwDqN9fjvuDtg7vt/HVbwxwPBwC9MxatybkADE/wG30Gj55wihH5Hfbnu4mvdC9hOWSWDVXWFLabsturn5cA+qX01vOV3C/rO7UC76+q+x7B/ceYVKsFBeRT7qogRX+PrkgLvjZIsxXqJBHXRUrkcPQevoC4u2wB3d3fF7ehsgj9j/q3FCg9rlThOt5n0PzIpQ6PY8n6FfqAocPBum9lk+ao64jml5369AapZzXYX+YMZBDAav350W5M2xiZEI4GZigIyzk9ooCrploYHGm2a7oumuHulTCmRvSpGmjb5tBuZmGdQk6sP6S+CcQEZ5Dy8UviB50dt5lSRzHPT5+8rcfX/cJwsHWMn/Ujl1CeNSGj0S2yT+++XicgI139ag3bJnB4KzPw1Iiwr5is2CZDzjqQDL21OQH39DBs8+fPY8OD6PPv47KTdTVNqvDgxGvBFTRsW543duKuRy503NOqpqApVzqHI4mEUO27aUqbP4QFDiQ7Iznw5F8IYkHX/wjPBN9OBChpC+POvo8GNEB6pudN9OdN6Wp+MUX8eFheFS3U32boVAD2roXX/ELz+WKyHPQp76DX0f3bp7rqAZlwR9RIAq/ezmjanr3NVMof/3Ard0JAYyfvjrc/CP+D0KEw+9s8eHTp3f45YOFvad+qdA18+Jvn38Z5WjUmki++yuvCuT+u4s6M/zOpZ9A6ifQA8x+TLwKndXj5IE4Pwar7FUJd1ASCOc70Dl4bPzOmDOmyAVc81oXRH3sGbsR/fhdjzCWYKELiz4nTbfZiPX8r9d8PCse3J0aSosplxZ/kIsZu4NfhXZeIj8Nh6ElQJLtKx0GNdqmVkpUZnnVdAOFkv0gExVkj5CwAD7UIJy8UyHwNKRMREvWFqHk2oVOGnqAMI6I6WUY19wld7k43UNgKgUtkiESkwjRD+BkqCGrJfvIkVyDyFFosu8dJ3hO0TSgTu2TJUpMLMmkPZaaAa1rM+prAd91TbXaFNx5yxyHtRwOnebBIc9OggRY2+dqxVMqNHQVGkYUDxtK97sBIdJ0t0ETsaAl9xF9ia9mKDFCo24KMGTjguFfSCmDKr7oMu9+78LSceVHpvG01xc96Ki2tSIqiks02KFyOh5LBgoD3t8ZuT62yugGuPgTpAV3OPotOYVkbFJguCsM/qC7ZHDzf7qsr5nxUTgOFQB9IgQl8O5VUWwYVXhLXRICdoZDnlzy7HW/Le87d9wMzIWmQZcznedh7BXwiSIfTa8teDQTfnfokZkbFOQoRwNSVL7kjhb9C4Pec7XK84vCLJaN0Eo/UHZMwVJtcjHr1Vw3G4Dj4W8PjKaHPxhI6yyjKh3GM32Zvjd+jOm4C2WZHDEjmIonNo1gXabV31C6YCmQXVpPkZ+9oMV2lM0oW9p11FGEvOKZC+6KVgj7E1uWpglswz+f1Ahl/SxlEzAP6awNr8INdYtuQCao4D2DdiG3YYgKMuZw59f9AQhcu514bflJRJKp0M6ZUdsf+3p8dIrWXBo5ySBBMuYm5Ra6P6MfkoYzFLqPON0OTMNooHaGaVUcNqLxuzH+RxcSfojIuZPi+eucgxy6bHjUWfMMsmriwX8AUEsDBBQAAAAIAHwPZ11Gu9q/qwgAABwSAAAmAAAAZG9jcy9tZXNfYWdlbnQvQ09NUEFUSUJJTElUWV9QT0xJQ1kubWSdWO+P28YR/c6/YiB/6FmQqJxdt8UdUODs06VKGse17AZokIorciluRO6yu0vplJz/977ZJfXDRoqgQHIwucud2Tdv3szoGX03X9LHthBeWnpjmlZ4tVa18gf6Gu/o6l7uvlWedtfp9fMkGY/fy/90ysqCSmNJ7qQ9UNn5zkrCp3mVjsfH45TemRznGU3Oi4OjTueV0BtZ3JCvJGVpe8jISqcK6bCbHuYkdEHKUS14L1uxpgmbX8+pgN3cG1jcK19RNp26XOiM1hK+SH4WbVsfsjRJnj2jD5WVkkznc9PgeD5YPuIma1mJnTI2SaY0Hr+7Wy7H4xtqsC7C2TCbbx1hkyRcT5UKbuQXyFyVqpa0Fk7WSks3oUK2UhdS5yo+5bWw4Svtrci9e57SnG1/dUvBRZg7UGtNLmWRBj9+uHv/lv0Qp6/HotgpB5fG0ScqhaodXcl0k5JpGVdRU+ejT2LtpPYwtAQmOFtp7wJwVgpn9G28/FekSn4LuGCDtKH382/mbz5wFLrau5R+EFYrvaGmcx7rnipEB27lVnmVw6CNBGhgLboeT2DnB0Q4gp3earPXE/LCbqQnZzqbS8DqKmqUa5gsspjgZDsw6ojiYTYgxydht4NHk0gw/LUeCDKOig+4DA3iqErpLj8EU88uEMEESny7tQSJRd2BsEUfJG30L9IaunoROM4cYyIUKvfPb3HfI8/gedk5cGuPo6Ubj0G8v9Jd/KIwWGALCDOYNLCO/cqNZSLfcFbApQGanni9Y2VX45ZwTXEyke20V42ku3cLMGz5j7/TUlp4BWOVbATera3ZO7w4WsJ/lbDFHoFOaVGeQwByyI2NqXkCIjiAODhRStg2ZcnBnBAwCWzAllo5AEXCAYePb/85f794WMzvaUYDCSYh0Zh3YgOGxA85whwT+Yig4vqFnMmd4kjLIXmtrMFTJh6w66KA3ALEACESApEsDywg0noB9w/sAydvTPbvjul7JEAEJkk+VAE9DWh6pjnKhl3pz8iNjLbyQNkFkbKbJMmyjJeTXxOi0cXq6Ib4JV5HK3i+nsQXMYp48WN4Jvp1pAo8jtqDr4yevry+nho71XIv7WhCo63SZ8srhNQhKrzSKM0LL9Pr6/AoHlfyMa87p3ayX3jFC45VODo1GiI8+jT5zLyFEgJeUFdNBbTVXFhnQVtx0gFbxwu4a8ULCzDFtrV8XKFQrF7PZ6A+/lez3fUMydoa1plZf/iqQWjdCstQdj7FI+JnxmfA3tTw/nd7Xcop8udnZMuUQ/GFyxA15/+Hww/zWSvyLbiYDt//PsODvk4Lk0/BQfn/mMa3btYwIpwLs+HMFZ+XNsXn3gx6P/oUnPkJfz8ln5iGSfLRSaTcgIVrZY7ClLO41xTD6Tj5OFsErZG3XO1EA29Suqtrythn9+NPGcETq7gg1g7ZhQJEQYs59bKYjCtXiRev/pTRFSQk0xCiLCihwPY98UHPQ5ZnosSFh90pcaYdS0BI/HAyO5JDsm+53IjOmykE0QbNhMYgp+UjruNDvSwk8nnZta2x/ouyy/CHPuGsJyEvcUmoBfL1ib7lez/RQrcdFFTJGvuf6E0U1idsmE6ndPEX77KzcGZ4n3E8+R/HVgehRPvRy3TcePblgNbw5QTA5LlscYFhDXXdWpT8J1qGQ2anUhfwjEAhKEYHTIJ+tqFyFNRLwrnJIVMvjHKyXbiNWjFTDUM5K6GcQe0jV4ZLXH388DD9C7lu7UAKvXkebXCqrLgqygsDUEk3XAWPMAMOZVxnMvi9MmW/+5RvYRHOlmoTWRCUNpwcLV2qXvgessfGLuSOF950qJqoKO/CJ6GE2dZKbjR11yCJ8gEppojlPvPCRqH4juvOD4a0aGSw9BsGFxr1ua4BZG+yv9m5mfE4j26h7T33KBjeKL9aW0Y82LOyNYAve5hHzF7PA1Xq2uxlcUaRO0QKHcPX3KuGr9kQcqRWOV71+8mhp3pKkrnAeuxoOJeR1kgohXJLmSqyW8oGgcnQXpWCezzyhv3upe+oGr34pJTtK6m5IkEJQqMzyshtVYvUw8fR1thodAi8sZ8Bht7sUBuB/qCGMBWHgdZjdMzc+hTIVUif5o4g9O4UFAT8Q744h5YntsfoYu+js0dnRL3HBAFP+i4JVnW0P9jqG0K0Ojp0TYxx3wF+Xtv7Hjv2PyrcS9Zl38OEhuIZLULiCPhaqwYbkuQ6/Q0u9S5x0kq9U9boJtwRTQcb5/d9RxP6MKR10cVsPJ8beD9iVwAPgYCgRwfR9G5CaDED8uf8Qgh5utrK89P5xkOr5WTLFzw1jnGUieNYmrxI6Zvl92+/oHSUAReGg4BZGETGvYKD5F3E80whbmEL7RQ3srptYuI5DmnFLVr27z+naFSyftzwZ7cIbaQ6JtkgcykEDBQadGRam3x7LibYnPvjtY59ZOCClswjARYnL1N6awi4CC5JLEJY7CWw4EoEtZSWJygt/d5YngjqOt68ERh51oeA7VBf/uBCX49q2nPdVwKdaRWvyw35cdqLtS/W6ANVZn/WDx8nSrxqbhEurudxKGMiutD+6uOuNd+eEbfKbdPkj0iM2BIzKQSPvEisPMjYdKo2GtV7OohpmHtiK3AquCDO+tCinR7YDrQHTHspCxUJAwVCw3U5OF+osoytfSO2YRzsEwq1i5uCgd/Jq+ME2cMQhAJdIfRmHcJQKB+qWZjhEQe+Gde8AGXIlzgwDnMMENenxp9OwnU6jHGL14laxsN0nAvuAug4ucA0A1/6bUmy0FD6Qt4cc2dxP+nrfBTdSSzMXPsmdOxQln+7Qz1nYAOPS5FjPjIYvW2o1JwQkzCn80WiVC7u448Pe+YLY9XDzaNl7CjgPWs3axcoG9AnV5muLuKvEP2PJlwGht88AApQC7nPMx+rKz8ETa3NhlqUsTND/1q8C8PUeAx4kMUiftwwHaxk4TkNtYExNTLov1BLAwQUAAAACAB8D2ddWDx1LfYDAAC8BwAAKwAAAGRvY3MvbWVzX2FnZW50L21vZHVsZXMvZGV2ZWxvcGVyX3Rvb2xpbmcubWSNVMuS2zYQvPMrpspXiaq8LtqTdleuyNmHImnj8kmCyKGELAjAACmZPuUj8oX5kjQAUdrd2FU5EUVgZnqmu+cd3fKBlbHsqDFGefrnr7+ptaVo8KcwtRWN3Eolm46ELsmb1hWMC6W4aKTRWfbuHT0eNTu/lzbLhrSZacRaxV/W99Pl+v10VPYl1rHEaDZf/bpexkw3KZFxue02Yyoco7Cn2pSt4qEvEHUuKlyxlwfcVsbR3d097YHIVFVOCxbl0GjV/RffFUntLc59eIz2jEqNz/8/3Kc0kvWKa6twSniFtUoCkdixbobWsRUOgGuhZcW+GQLg0IpOGVESJlns8fYomz1thmhO6M0gnEKWLh0dgG9F8bzJ6Rqf1noybeNlybQ1iEMF4yXmharfQW8KP6rZryOm0dP8drKaLtbL1eThdrK4zetyE5nc3Dzezyer2fXsbrb6tJ4/3s1uPoXbcYCPZo3rSKJZrpFHhFnGOMeKhWfaBaLySP/NK5lUyhyz7Iecnjwk5Frtz3rqu6bKmZqup1ekDVVSJcZlJbnMsx9z+kMoGSLOg4yV+0GKCrmGe+ExTdBbAp6sOmr1szZH3UtgyyCaT8/y7CdkZRfe8RdwVsgGYpONLIR6I3OQVDx7yKZQbSn1juZdszd6ZMEHZkoHSB3D8IO+UtXqKLXRZD4DYveMBxHwh+XjA5LrSu5I+CSWQmwVX2GKhXElzSfL5ejjZPEwWkw/TG9WefZzThN9aQZarQRwAcYFbgBInWRVekpxsZw2+is7gwZlk190FTQDV/m+sfAUJGjT0LazwvtYoXWcZ7/kERGa6Mg6UzC03BjatcKVOB6BoBfwNqoz8WKg9AJmxHBw3wAsGjwJOYwrEOtf0ZZ081tsUclaJn35LFvhMjidyYd/xQj+Rvf8TY7GiIWhl7/f0ZIdCsUgHmAxuPKIJAPaOnMMMpSwyc69UHEL0dRMgbIt78VBYtKOP7cSpUVZyvASsw79+JxmFYlkYCoxTY3B93Rg6SBnq099XlJLDQHWseQgLQiqW0jZ8Z9hHSV9nu2UrPW5DWIvWufCcz4EcRecprVAA+yD9ECfZx927UdnoIyTDsNoxydBRGclvsKauJcIxMuSCxU3VOi71+1Js98JfdK+tda4BlHJCb0DaES9J+qUv0/xNu5sYw/iahFUjTX6gsdL2KM9TV6UB+nDDkpyP1cIbhm8Umhc/BIMKfXGJD7KOaR93wai0ro+reIx+hwae0Wb4571GOl4fXIMPOsbJyAaT/5ZWnuuojG1l5mi4EKBuXCNFN8ocmltHnwSK1zcAUaxaOGObReslVRQtaCXDMYcaAi8qbg+044sklfy7F9QSwMEFAAAAAgAfA9nXWxM+F82AwAA9QUAABsAAABkb2NzL21lc19hZ2VudC9DSEFOR0VMT0cubWSNlM1uIkcQx+88RUm+2IgBs9lkJfYQsYaNSJaPYCytT9DTU0CHnm7U3YON5ENOeYDdQx4ob7JPkn/PgGGtWAoHBNXdVfX/1ccFDfu3JFZsAmVWFjl+iKCsIbkWZsXarmq1J+qJwHR5j08yHCa93hU90d02i9YnGtqs0ByfeypKYwbrjc2YcpuppeLsZximrFl4JmMDe3qC1yRJ6NVvnL+5fvNT0m4n1+9g7PHuNxVo1262O5QLgzjW7WkplE6kth5Bq+COpM23EJEqrcKeVrA1IIflBncy3rLJ2EjFviWtCU7IgHRokZcyfCvjHWRv2c2DtVqZVTPPFg1a3E163Vl/Or+ddUe97rR3MN+Mh5PubPBh8Gkwu59Pxp8GN/fx6JmQo8D5VkdW1uj9ewAoobvCBJUzss0ixUUF3LdOqpOyLgkS2qiQ7GD7TlkV5VVOHUqBGwKY4DmzyyUoWK1ZAlzjDFbFoPWc5RkLZ4twInC0piLI9VxobWUswotTPPG2cJJfvfFg3UZCGTv/4kSLlPV865Q5heUgm8hp9B/UKmTZ/6N3wFW7uKCxzqA8VwgZrEE3Xi6dzckX261Wp0ZqVToI9Ag5WYdv+wf4oYuk8pgSf1WrJTStKJXMfYitqeGVDvCoOxk06NfxB/r215d47gJNRuWfj/3pDL48rpVDhwLhtSrnSisfmnDePUKE+29/ft390KERP8KFs5K9J37cWhcacSQKoQnuVxxAxiqJti9RQmv/cx8D+mC0FRmVYj/2X3h/2zmLXmaGbkttah9LAF49ov10kRuafZ7REk8GZm0LX/EZH6v+HiOpdSrkBu3+zICds6j2dxHr9d3bZrteR1zrHLDymZvyJR9wBYvLI36gSfw3KvIUki5vRXG6f1WvN+imgB9zYoMpYQcoi+dri5jC5AAlhu+8EHbmZNQ6+okCz6E36Hewjssl1cJsGtXGQV/codKFObZl+/qa/vmb3v1IeU7b9d4riWTKHm/WanGn+pKjAvWdymL5rEarxfHiKurDmsM6rpA170k4jvtL2z2cA67AVReULLRANwu5jrOeFz5QyrRjV65eLHehDGy/qNDCOkcR/gVQSwMEFAAAAAgAfA9nXSVSo1N4AwAABAYAAEMAAABkb2NzL21lc19hZ2VudC9jaGFuZ2VzLzIwMjYtMTEtMDctYWdlbnQtZGV2a2l0LXYxMS1jb21wYXRpYmlsaXR5Lm1kVVTLkho3FN3zFbdqdlTTGC+SqriyYBhcIZmxMeCkvBo00m1aQS11JDWPXT4iX5gv8ZEaxsyuW/d9zrn3jqY7tpEe+PCHjnSYlBP6/9//qBLajKRxgRV1rRKRPUnXtCLqF210PFOQwg4Gw+EDbL8Mh/T+3fufRpPJ6N3PJQ2HTy7qA5ydTbYuINzzP532HGg7GqXgLUWHx79ZRtL2mtzwa70D+4AEYay4ZavYSs2hIOsiOWvOZHSIJGthd2iy0oZDORjc3dEsP4XBYERPTulKw7xVfGDjWvbP0TkTxovl5rfnr32l5w03rcFX2Z4vXeVWaftm5DLImhvx62RLwioSkQyLkJphkl5HLYVBPyz3BfFBmA4ZiU+t0TJB209TUC1CXdB0uRg1wu/ZFwDWVnqXk754YWXdZ8Gs6clz63yk5XS9Hv81XX0ar+a/z2ebEuMBSdG2Bk179p0NJMylg3AJrQB9uIE3DZJR7OzeuqOl4DovOTfFl4Kt8BHwpswJOsQhZSjp3sU6iaCBE/IDHyM6dJvQ966h+zkda31DIMjWKpenj/PU71SpxMXs89NyulncLx4Xm2/Py8+Pi9m3slHbgmKtA8ISrpyI5tzQtnGqA73jtyRqu0tRHy71FIUIb+FVQav59OFpXqCy4lPO0evEuF2vkU8gubNRN0xP8/XFCsk8OPSbFNYk5Zyz8eO8x0JmPQMBxUUaFppsnbYRsK2/PNKaPTimKKBhPLUeJvwHV8UjwCpotv4zUR29kDGQ8wRdG3dusH8X5W4YcmpE9PqU1Ls8xxoFw9lGccrrB3QLanQImB2OVlcpol8i1Dx6h/cbSn+YrkGvQoUAqRfgDyfXpglhFOqgg/Nn4kaj1yS7gkInJYdQdSYv/zhLb+ydMS9C7jPKoLtpQZuVZ7p0XjPqEbKZzFHrXSpWJgaMPvANCAmSWyDTaJCDNAI0qR6hlQ57GtO16GAwP+EKpMEOk1fdqSuJoosOcKZ5071g4S0kxv2Ze3vOdmn9aWGhIexQdsAA0bXkKixLcz0kKNPfyvJ6Z9LBwOtFkWPlZCBADQa0BdZAU/dZe/mE2nVGETje7fJRtRWkFTN8AfU+gA6J8dJZBP3Yg3zaqAI6It9qzwfNx5JWV+SxZ9Gly8onSAsQ8ygP8HKOKTDtZvLrMEsX00pC0mMIOF0WKO87UEsDBBQAAAAIAHwPZ11/UqOtnQcAABwPAAAYAAAAZG9jcy9tZXNfYWdlbnQvUkVBRE1FLm1kvVfdbtvIFb7XUxwgF3UImbKdny1i7IUsMYkKW1IkeZPsjTgih9KsSQ4zM5SsXhR9iAL7QPsmfZJ+Z0hJdloUi2LRG5siOef3O993+IJG08VH6tGodNJUuXyku2hO//z7P6i/lqWjj6JMdZbRmXXCONpII192OkEw1Eld4AXhlC7JlqKyG+3eBQFdXVy9Pb+8PL/4IaQgmOvaJJJWwspclZJqK1N+C//NeWX0VqUypVhVbrMUea4T4bRZGl07Va6X29dL6w3Y8K+qignB0PZ1eEl1lQoETJXY51qklBldtJ4vrkmkqeK4RI4X+Tm7+Kx/ErlKfcBhtY+7uJU4M5e5TPjenU5FHv5iH/HkZ7kygiqjuCreY9f7nn+6JZsYRGs5ubF2SEWUJGqnC1hO8BQ/dUZuIympjUGJ8j2lEmHsEYWRlbYKKSqkRG1xEp1KUrCCNKTd4HfOMWlDwiQbtZUk8p3YW3LiQVqEJROZyhIn9RbhuY2ylLb9CDudFy9oJlETbVI8zdhMuadS7khwSzudy5Di+df5Irpb9meDj6NFNFjcz6KwSGPfeVuv7N46WdgunGlU3/rsUTuEmOtd2LmCibvJ8P42Wo7Gw+jL8azeldLYjar8CfkoEkeZymUpCglzO+U2hKBVplCNraUaaRgnkD0A5mobdl6FCD+XWwH0xYVO61zaXnB0kOjSGViFMcYQ7bR54Jg4VuUyYAhXTlp0qPMaUd5Ph/1FNFvOF/3xsD8bekMcWzyY3E37i9HN6Ha0+LqcTm5Hg69HN0FQ4CUG457R2sLNyG+1MpILbSk+P+dux5geXIqqyhlUd8NjL5rZaM4iKCsyHoTkoa7CzhuENvjYH3+IbicfjjHl/CbSTjaiXD9Le7fZe0yl0qp1Sc0Ladh5y9X6VvOpIGgB5wGFqH2x41RuZa4raZZO69z2eOCXDfIGB6DxPFwj7vJPjlByle2biXoGLaBQl7IB2KD15FvwrCpnQCcjLwVNnNPU6F/ggYzWHFZR6BLjEP+tiWKBRkqxUrly7F+VmBOJPzAMDKawmTSj0vNzQ/GRpZZgqeX7qO3k89s3URzCdQSYIY3a1UYeG1jUKNRKolZVDt8pj937yA8xhrMu8cAnfhN5jgIH0XTvNrrskgzXYYcojmOQ2QZXSUr/IY/e98HgzcqboDDsfZ/AoRuFvG8iXG6/oBnUQOt/POqh2ISKOhxhilZaZ1TChGRAEOfci+6hexbDWuUqUY7n0wK5vUM3kn2vPx0x72S5Wm/QyI1MHtDqaX8+733uz8a9WfQXkMhLtsb95rl+KMEFBLIELYKIebx5CrjQvgupxNjnAFXeECA/uBPmIeVjTBngO829ElkGkzK9Po3ZIQKeCAtm8Zyoy4b14YSnDDFU4EC1VqwDqz28E2TFQnDQ8t5NRB+QawMs9g1bZQN+AK4JgGEUBA2QDDgJInYYZ2qY6btZZzvNaOZ6zajCxKybOWx0DNp0YmKCZNY5iwJiR2tqDEpVGwQku8QVf8J1qqj4osEpxpYz9IaREgxwPxmscO446lGJB4i2f5DUd+xsdxIqlB2ypGzCEoI5eB/NFtAXs5aOpmPKFTp0hoFd6ZV+BHdpgw6gv5ky1r9hvW7i5IrlLRN17q5PN0FTEPC2KL5/zCM7zlKKgsby0TE3sLSE6HpZo0XM3T4tnGkXANxTOebXXpMsKrc/veO1mTnYz/oEfW209EnCQXBgKYT7I3zuaMo7zLguVqCCs7moTwdfBkGXSpDUETExFgKZjycgpieWWjn8keLj0TgImIStzrfyaZInBn0SR8MpR9y2FffVt4dNhIQ9NJCTu9GAzzEvP6foBoKy6pF3hbooLbAW30DMJ8Oo+3nS/bT42h3cz2bReLGcjk+Xs8kgms+74+jL8UdMWyVgxjDZAhPfas0NHMx/goo+ejA924be0eXFxW+//vCGiqJLry4uaDgddWmAYl1e/fmaPt33WU8BFAloB8EqF+UDwuM95FOfMBzpjjmhXF+zIDCq6X7kH9uCyQCgBDfv0fLPEAQIO8U7Vb668v5jbHzJA6Yn9SeiL1GrR8eVCStHUTF5nDGdt2QOLTrw9n8h1N+plGBYHo8/xlJLIwe8H2+shEuebMQHQfg/+2w30T/GrWn3lN9jpX3X9v7tmyBsG4xNHRGdQmSx65xg0MLEniiJ0dzzSlMJtwGlykdlfQGOqgMyx/35x/7Vm7etxNRFq1mCsBCqDEGFNIJ6adgOgtJ/ATD7UhzKcstfFeFaOfxfgUWgG8JayQQ+vKG0Lipc/Tya4i9ibDYLSgRcWaaQrWJpaHZ+C+kDxMETG2H8tIhGJ1mZiL8ylENumRcJvz/LEl8W/LWANUQakdtmNG50jUWWtyheyHhfaLULIzLERs+fZuChVddL8fsI5Vl7oa7dpmcldkpsNewlU+vaeEr32VhEXYiXmOitPFZiJSGiPNZGbjgedHWPHctWvgf44pHytNSnrfcl/h1XYFVuQZVYu3kf9Yysyow3N2U9da4kHCpgCsn0sSYmzMdZjS+9EnLu12emkn0JjuUPspvJHWHrAaGrU8N45dmKnDkZOwa+cdK6Yd7t6ROx8y9QSwMEFAAAAAgAfA9nXas3hSW7BAAA8AoAAB4AAABkb2NzL21lc19hZ2VudC9NT0RVTEVfSU5ERVgubWSlVsFuGzcQvesrCOSSBJYEAznFKApblhGhNmzEit2cVlzuSGLDJbckV/ICvvbce9FDP6Pfkx/oL/QNdyXLit266EXaXQ7fvHkzHM4rceGK2pDQtqA7IW0hlCtIuLUlH5a66vVmX3//ZSa+E3MNMzaY11ZF7axweSC/ogKbRairymg8B1d7RUdi9vW3P/7681fe6V0dAekThJUlbXceiLyOADRG6LIyVJKNMmFbFwEbKlKRCqB9z0DGKQmktY5L0DQGi84Per37TRT34pKJi0rGZRCvPVUuaNg0fU8GwCt6A5tTp+oHT/di5OxcF2QVAIDV7/fFE79YORsLTz/XFKJQCNZGrM0mNpIH97vsYnydnY2HwauhrPSwNRn8FGYHYrb5uHb+S2g9H1eaFxmjTPRDWnW+gPSDsuAVaJ88316KlTS6aCkPRSAOvqW/x+BkDEdVcrY6HJItKqdtDMNbd7NFGFQNk3qS+tu3w1sV/fXGA6SVBkTv/oHpweMFRQy8H8PELl0dSJzIqJbi2KRsoiqe01C5snKWmHvlgZ7YDM88CihBbBG+IZfzcia36w88Vu8Gh6KuoEKqksY4WSRyl3VsK/f/EQPMdYJ5npzbePpvBD9in7YL5P7k8uLlWffttgzeKWRY7lKfu5Kfdol1pjtkui+J1JEwtJCqSe4r6aNpHg5oYtjmtQuKSzOdcf9yriltD/v3+T2f1b3mI+hOhxiOuKnplS5qadoeFNLx1Z5ElH5BTNzTStM68R+5sgTr0fUNRN6EjkgD/z9XC7AyYbgl1WXp5t3+yTYyJ5NVHoE+1jglfDfRV2wD2eiOVB1ljrbWhXWPwmAz0J6dyzIvZFKTZTln+G5ntnp3yNodbRKgXNWIUjYip2dSAWliBotM28zSXQRRpyiE/RQ8G0VL7EhIFVntgvDegOf4x/HjVp5CPJWISwZOQ/7y8ijyjOxCW0qsPC2QZPLt9ZPS64+4Q3PvTz4Vt3Vfss+HCIrOdYa/Df90UbXaS/VFLgj5n3qpSOba6Njg9VZ6arsXsIxbsCEr0B6mqn2Dgsyo+xh3ELpP6w1KimDuXdkRf9Qf4hI57N6+pXh6woHZf+n+RT4MyN/OKbr+fD0dX2THH0cfJtPxaPrp4/gxeGcvFIqZb2YFadHjtER9JykX32Sy9+qV+ODWIrquZYm41KGdJXq9M7RQkmgJXTs7EDoBzhvUNgoFDWS91Fhvb+s1comsSna9lHbBHCytYQUm2I9XT6VLUwOPISXssehpjgfc3cVAfGpJuJ0ZoJ1otvd7nQ6zhPYUdmYIIb1aYjoYiON2zuHxAGIgyrxJ5g4qAwpTivNRFA69JKmBqQV9MIb9+QUy8FjTiNryJRmdKwZJr1NakXEVCOKbYTav8ekHHcXqcHD4ptfrP9Fpis2mjDeF4eRq+iFro/XZlOAaT5zp9zjnVs9xnPuFR0BowkpaLgnToMEbk6NU2wEKhgW3LOiL+wysu2JfACoMnqbhVBiWfI8sEOhwdHlxdTydnEzOJ9PP2dXl+WT0mWvqvYA/z5lCJgn+YlNROBBzqU1fGRdYVlrKlWbloarRJSR8kc/tOX6kSNeM3j/MrQkXPcJ3Vc0dDh7+BlBLAQIUAxQAAAAIAHwPZ12xufqc2xgAAC9UAAAoAAAAAAAAAAAAAACAAQAAAABkZXZlbG9wZXJfdG9vbHMvSVBUSF9VcGRhdGVyX1RlbXBsYXRlLnB5UEsBAhQDFAAAAAgAfA9nXd5bJDuGCwAAuxoAACIAAAAAAAAAAAAAAIABIRkAAGRvY3MvbWVzX2FnZW50L1VQREFURVJfU1RBTkRBUkQubWRQSwECFAMUAAAACAB8D2ddRrvav6sIAAAcEgAAJgAAAAAAAAAAAAAAgAHnJAAAZG9jcy9tZXNfYWdlbnQvQ09NUEFUSUJJTElUWV9QT0xJQ1kubWRQSwECFAMUAAAACAB8D2ddWDx1LfYDAAC8BwAAKwAAAAAAAAAAAAAAgAHWLQAAZG9jcy9tZXNfYWdlbnQvbW9kdWxlcy9kZXZlbG9wZXJfdG9vbGluZy5tZFBLAQIUAxQAAAAIAHwPZ11sTPhfNgMAAPUFAAAbAAAAAAAAAAAAAACAARUyAABkb2NzL21lc19hZ2VudC9DSEFOR0VMT0cubWRQSwECFAMUAAAACAB8D2ddJVKjU3gDAAAEBgAAQwAAAAAAAAAAAAAAgAGENQAAZG9jcy9tZXNfYWdlbnQvY2hhbmdlcy8yMDI2LTExLTA3LWFnZW50LWRldmtpdC12MTEtY29tcGF0aWJpbGl0eS5tZFBLAQIUAxQAAAAIAHwPZ11/UqOtnQcAABwPAAAYAAAAAAAAAAAAAACAAV05AABkb2NzL21lc19hZ2VudC9SRUFETUUubWRQSwECFAMUAAAACAB8D2ddqzeFJbsEAADwCgAAHgAAAAAAAAAAAAAAgAEwQQAAZG9jcy9tZXNfYWdlbnQvTU9EVUxFX0lOREVYLm1kUEsFBgAAAAAIAAgAnwIAACdGAAAAAA=="

def sha(data):return hashlib.sha256(data).hexdigest()

def root_from(start):
    for p in (start,*start.parents):
        if (p/'Interplex_MES_FE').is_dir() and (p/'Interplex_MES_BE').is_dir():return p.resolve()
    raise RuntimeError('REJECT: expected project with Interplex_MES_FE and Interplex_MES_BE. Run from BE.')

def safe_dest(root,rel):
    if not (rel.startswith('docs/mes_agent/') or rel.startswith('developer_tools/')) or '..' in Path(rel).parts:
        raise ValueError('REJECT: invalid DevKit destination '+rel)
    target=root/'Interplex_MES_FE'/rel
    if target.is_symlink() or not target.parent.resolve().is_relative_to(root/'Interplex_MES_FE'):
        raise ValueError('REJECT: symlink escape at '+rel)
    return target

def load_payload():
    out={}
    with zipfile.ZipFile(io.BytesIO(base64.b64decode(PAYLOAD))) as z:
        if set(z.namelist())!=set(AFTER_HASHES):raise ValueError('REJECT: corrupted payload index')
        for name in z.namelist():
            data=z.read(name)
            if sha(data)!=AFTER_HASHES[name]:raise ValueError('REJECT: payload corruption '+name)
            out[name]=data
    return out

def states(root,data):
    rows=[]
    for rel in sorted(data):
        dst=safe_dest(root,rel)
        raw=dst.read_bytes() if dst.is_file() else None
        found=sha(raw) if raw is not None else None
        expected=ORIGINAL_HASHES[rel]
        if found==AFTER_HASHES[rel]:state='ALREADY'
        elif found==expected:state='CREATE' if expected is None else 'UPDATE'
        else:state='REJECT'
        rows.append((rel,state,found,expected,AFTER_HASHES[rel],raw,data[rel]))
    return rows

def branch(root,repo):
    try:
        cmd=subprocess.run(['git','-C',str(root/repo),'branch','--show-current'],capture_output=True,text=True,timeout=5)
        return cmd.stdout.strip() if cmd.returncode==0 and cmd.stdout.strip() else 'unknown'
    except (OSError,subprocess.TimeoutExpired):return 'unknown'

def show(root,rows):
    print('\nIPTH MES Agent DevKit v1.1 | COMPATIBILITY SCAN | READ ONLY')
    print('Project:',root)
    print('Active branches: FE=',branch(root,'Interplex_MES_FE'),'BE=',branch(root,'Interplex_MES_BE'))
    print('Python:',sys.version.split()[0])
    print('[PASS] Scope: DevKit documentation/template only; no FE/BE runtime code, DB or permissions.')
    for rel,state,found,before,after,old,data in rows:
        print(f'[{"REJECT" if state=="REJECT" else "PASS":6s}] {state:7s} {rel}')
        print('        current=',found or '(absent)',' expected=',before or '(absent)',' after=',after)
        if rel.endswith('.md'):
            print('        doc:',data.decode('utf-8').splitlines()[0])
    print('\nMD DOCUMENTATION INVENTORY:')
    docroot=root/'Interplex_MES_FE/docs/mes_agent'
    existing={p.relative_to(root/'Interplex_MES_FE').as_posix() for p in docroot.rglob('*.md')} if docroot.exists() else set()
    allmd=sorted(existing|{rel for rel in AFTER_HASHES if rel.endswith('.md')})
    for rel in allmd:
        print('  '+('UPDATE ' if rel in AFTER_HASHES else 'KEEP   ')+rel)
    bad=[rel for rel,state,*_ in rows if state=='REJECT']
    partial=any(row[1]=='ALREADY' for row in rows) and not all(row[1]=='ALREADY' for row in rows)
    if bad:
        print('\nVERDICT: REJECT. Wrong v1 baseline / source modified:',bad)
        print('Recollect current DevKit files and ask agent to rebase v1.1. NO WRITES.')
        return 2
    if partial:
        print('\nVERDICT: REJECT. Partial v1.1 installation; inspect source and backups. NO WRITES.')
        return 2
    if all(row[1]=='ALREADY' for row in rows):
        print('\nVERDICT: PASS (ALREADY APPLIED). NO WRITES.')
        return 0
    print('\nVERDICT: PASS. Baseline DevKit v1 verified; safe to apply. NO WRITES.')
    return 0

def atomic_write(dest,data):
    dest.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix='.ipth-v11-',dir=dest.parent)
    try:
        with os.fdopen(fd,'wb') as f:
            f.write(data);f.flush();os.fsync(f.fileno())
        os.replace(tmp,dest)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def backup_dir():return Path.home()/'.ipth_mes_updater_backups'/PATCH_ID

def apply(root,data,rows):
    if show(root,rows):raise RuntimeError('REJECT: scan failed; refusing --apply')
    if all(row[1]=='ALREADY' for row in rows):return
    if [(r[0],r[1],r[2]) for r in states(root,data)]!=[(r[0],r[1],r[2]) for r in rows]:
        raise RuntimeError('REJECT: source changed during preflight')
    backup=backup_dir()
    if backup.exists():raise RuntimeError('REJECT: v1.1 backup location exists; inspect '+str(backup))
    backup.mkdir(parents=True,mode=0o700)
    originals={rel:old for rel,_state,_found,_before,_after,old,_new in rows}
    journal={'id':PATCH_ID,'rows':[{'path':rel,'before_sha256':before,'after_sha256':after,'existed':old is not None}
       for rel,_state,_found,before,after,old,_new in rows]}
    try:
        for rel,raw in originals.items():
            if raw is not None:atomic_write(backup/'files'/rel,raw)
        atomic_write(backup/'journal.json',json.dumps(journal,indent=2).encode('utf-8'))
        for rel,_state,_found,_before,_after,_old,new in rows:
            # Refuse overwrite when changed between scan and current file write.
            dest=safe_dest(root,rel)
            present=sha(dest.read_bytes()) if dest.is_file() else None
            if present!=ORIGINAL_HASHES[rel]:raise RuntimeError('REJECT: source drift: '+rel)
            atomic_write(dest,new)
    except Exception:
        for rel,original in originals.items():
            dest=safe_dest(root,rel)
            if original is None:
                if dest.is_file() and sha(dest.read_bytes())==AFTER_HASHES[rel]:dest.unlink()
            else:atomic_write(dest,original)
        raise
    print('\nAPPLIED v1.1. Backups outside both Git repos:',backup)

def rollback(root):
    back=backup_dir(); journal_file=back/'journal.json'
    if not journal_file.is_file():raise RuntimeError('REJECT: no v1.1 journal found')
    j=json.loads(journal_file.read_text())
    recovered=[]
    for row in j['rows']:
        rel=row['path']; dest=safe_dest(root,rel)
        if not dest.is_file() or sha(dest.read_bytes())!=row['after_sha256']:
            raise RuntimeError('REJECT: file changed after v1.1; refusing rollback: '+rel)
        raw=(back/'files'/rel).read_bytes() if row['existed'] else None
        if raw is not None and sha(raw)!=row['before_sha256']:
            raise RuntimeError('REJECT: backup corrupted: '+rel)
        recovered.append((dest,raw))
    for dest,raw in recovered:
        if raw is None:dest.unlink()
        else:atomic_write(dest,raw)
    archived=back.with_name(back.name+'.rolledback-'+dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    back.rename(archived)
    print('Rolled back v1.1; journal archived:',archived)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    g=parser.add_mutually_exclusive_group(required=True)
    g.add_argument('--scan',action='store_true');g.add_argument('--apply',action='store_true');g.add_argument('--rollback',action='store_true')
    parser.add_argument('--root',type=Path)
    args=parser.parse_args()
    root=root_from((args.root or Path.cwd()).expanduser().resolve())
    if args.rollback:rollback(root);return 0
    if sys.version_info<(3,11):
        print('VERDICT: REJECT - updater requires Python >= 3.11; found '+sys.version.split()[0]);return 2
    data=load_payload(); rows=states(root,data)
    if args.scan:return show(root,rows)
    apply(root,data,rows);return 0

if __name__=='__main__':
    try:raise SystemExit(main())
    except (OSError,ValueError,RuntimeError,zipfile.BadZipFile) as e:
        print('REJECT:',e,file=sys.stderr);raise SystemExit(2)
