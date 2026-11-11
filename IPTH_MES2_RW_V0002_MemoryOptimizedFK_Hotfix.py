#!/usr/bin/env python3
# MES2 RW V0002 SQL memory-optimized WO FK erratum.
# Repository patch ONLY. Does not connect to or modify a database.
import argparse, base64, hashlib, io, json, os, sys, zipfile, zlib
from pathlib import Path

RELEASE = 'IPTH_MES2_RW_V0002_MemoryOptimizedFK_Erratum_20261111'
SQL_ROOT = 'Interplex_MES_BE/database/sql_updates/V0002__rework_registry/'
MARKER = '[MES2_RW_V0002_MEMORY_OPTIMIZED_FK_ERRATUM_20261111]'
PINS = {'00_PRECHECK.sql': ['371ffc7c699793d773dfb1c9dfec6bde9c46cbd9c07aa757b51e5377ab7a9aff'], '01_APPLY.sql': ['669884c94f7c954a568958b4221ea8c328c458d011f3bf0b63f5469d23ecbb55', 'b0820023f90fa747221ea603486504e702c87185730fd744c523b7a23df43f86'], '02_VERIFY.sql': ['6ef36ab2be9efb259d94146c89a445310e4dab6f0b9a40299894be7f53f0b8a1', '97db7f8d3f2be51d4938c73f57cf7414a79f028168c55b2b46f79200ad16fe68'], 'RELEASE_NOTES.md': ['11c5db998df521909f3e80627232059807f977cdf28c544e25a8f2c91999da4a', '8902c47a050fb5cd31e069e4132b7e06e4b2f3cbccc34736c05f71b560edc283'], 'SHA256SUMS.txt': ['8327971cc4c594fece4556256eba2f56e94ec3e1d1a14afb4ff4ac28670fc8b9', 'd703220b797b8573623310eefaf2381edeb5c974fa7e7431e59524a5f16a169b'], '03_DIAGNOSE_STATE.sql': ['a8881ef181bf1e5c8dfac069799efbc60ab117a9e2b6c40e9af76fb4b63452b5']}
NEW_SHA = {'Interplex_MES_BE/database/sql_updates/V0002__rework_registry/00_PRECHECK.sql': 'c5a6148cb96f9e89c2c32299f97c94bcd8500f96d9a0dcdfc21f95ce6183583d', 'Interplex_MES_BE/database/sql_updates/V0002__rework_registry/01_APPLY.sql': '4056af94581e6e88884cf664ff7eb13f3b5111c77d655c2432bceb83049ea56a', 'Interplex_MES_BE/database/sql_updates/V0002__rework_registry/02_VERIFY.sql': '42bd6cf90b43789a1e9c1ed687d11093d473178bd7e2cf9886b6ba59d029c1b8', 'Interplex_MES_BE/database/sql_updates/V0002__rework_registry/03_DIAGNOSE_STATE.sql': 'a8881ef181bf1e5c8dfac069799efbc60ab117a9e2b6c40e9af76fb4b63452b5', 'Interplex_MES_BE/database/sql_updates/V0002__rework_registry/RELEASE_NOTES.md': '4d1d57a6a1ef2df5c62e284a697863b1a8cb21cedc92d78ce32325b9f3d7a8f6', 'Interplex_MES_BE/database/sql_updates/V0002__rework_registry/SHA256SUMS.txt': '9227589dbf9ae93218c512b8fca8230c7d10b619bcb4855cdc9c893d7825c7f9', 'Interplex_MES_FE/docs/mes_agent/changes/2026-11-11-rw-v0002-memory-optimized-wo-fk-erratum.md': '29daa0d093716b417601555e2351faf3ec4761079610caa1eb5a43764585de02'}
PAYLOAD = 'c-pm^Wo(^GvaXkznVFfH9WztR%*?RtWsI4bVmoGr#LR5R%*@QpjJbOs>1s6l>i(KJUw=}oTP;0ON%eMBb*achKw<&_09e2zo}Gb-ow=(K6aYYq0RSlcwJYlgv~YE{x9~JllvFbklVmYB0h*YaxLL5cx!4=IJO8z`aAVPAWo2bIGIF&5Il0>XHCfrX0bRXVSXqr!R3*h_B*o>K|2lr4{nc%k8}-|f);Ym6G>Li16KWU?xYF;?<t#<!2_QeQ8A5@no<!0dMRym&2qdgCHIRQ!>57bo^1}9MZK0Wg2jAK1?Py!5r`fXJ3pqD$1yL$zqrKLr`MakQeJr%6M>9$lhi^j<4O}GUFbz0oGG(+Zq6=-GEbTlZqt0aSAAU%5wGm#0;S?8e!72716O6@*m9HV)sK`eXcSZr`96u5tbrt((C23DWsMVRt$XF-?HS6I_;`n9lHGF*#<JR1+ve|wtRK;|F#bs5vm{<sHk2uM(<iURt|HJOw2J)!f)C`N^jnod~ryC2|bigFVEu^uKSqi$rz+#ov<_u4#1d4gm%GQOXqk-WiC)A}YrM(jVWN*<W0fT_CRpLSlrR?wyJKWJsN>7ZS@g|jR>oMtcwK3ZJRxNPtFy$tMd4JC0;bgDS2B?+bI>D#N-wQBSpVG~p(tY5Dw(-5<bEwJwriZs{NdICyEp2cUq61n@*zQFNvoAsEt}aLv=6&iTYcYf}mOf-pnZZEo-B^v>3-yk$&0)rDdy8Xq&qzMXavf(GR}pE(kPz(Gmn%o5Peb<JbPMmD_NW@-fiduR2Cego*>>nBsO@*fkw82(>ARw=2Y<?%dY@9tHas+7;7tXMu=7H%2<>(uS}@1qY^3RXGd;tazBM39upDKX-_EPYYA2Phu(d`Jn&Vpa@=~|#wBw<VLn-i)Rhw5bi2o=y-Bd~Y682Ls0kO$MeHC7SbbY;}6Upnl&8}{ljg0K*b6qcLa7tH|N3clbJnD~+vmTN+mAi}l+ZHIT9G}wXVRn!zSjX#=vzZTf%?Qb`B3P^dm9J`e)f@~xxS8a&rDUnbWW-vV%2*tW1EU)6L?S(w1@?A?&@rwzA0gEc(Hc&Tdo3AKn)ZeVa${7&>1i1{gF=md2usYMXPqjx3$=u}u{)v_WR?CDvA%$_-Ir7J5IjuJedWO;qh$$glqwC(LU|cCvK=Y~T1_zUmV%$<`(Bi8#MGpTIl$L+Q_U3l^kgapI$2Yf5(tvrYI~{Ypu*Um64ZRd@8n^@Gtbn|<q^5lGtyK331C0(W45ECduL?>rC<}Z)5z*v13k;}QW0Ixjx1MysnOI4rwb;ghSHr_7tCY0a<SzvYnI8|^KO6Hiy+^2Q2s1-v|nlk85-j)lf=#XbY?USdfL~NgpgD{Wu~he<6uP@oPy@Xm&%UIjiGR2F$IBhI&H)RNm1~4olW?fi}*{^c11j#l2_`I1DmEd7t+N&S>HI_r-{+_@%$!bOEp&Ff^8r*nMq5)_Shs<e`k{%XuI*JCj)&kPrkdGS<HOBg5VzmpAYZgGRkMo){9n2-N_@2eX{6q6cNG7GCoXTB)>tk)yyMCK-4^HcGHmkTvI8#rp-<Y_tcUIl%PYrVlHqoG{{zR2kKSQo<5hxZ3bR`tQ5;6T_JoV^m;#z<VCsDA-$jj#RwO!|DeDb(;T3%fi>3nz?N|KJ_B`qhRL)wCW*dH*XIb~d-!-<eEfkhav$Wf#aj?nsQEdqe8N$xTe+9JRq=D?%87!taMwZK=d4knQM0pZk-J3K+thCCQR1xZCw|6;PnEr>`C#BJ<65hSUbgOyZjZuy@0=$S`!IIvds#x}Sg>kwJY(oOmQ^*SfX1c_=-{KJxw3#0dQ<$SAb@p;GA7M)BvR#TuP~OZl<FK63pShv6L3rLEANgM^u~<!vnMIzfB~qYu<A<O?1N}5t6+7TbKKQFt`S=SXypIsMLzRR(5n!?zcNTepnrj5q)pgCelcpK@^3=^y7Z^H4-Nn*CjU#s|6?I%GZIx%QPBAx701_eTOEDb=-%}?0WfLyTx7WoGH1Xhm<^Dk$%c6H6U8QA``D488Js5=Z8?G5VZaZ^Pa4#|P@00e-~5Wl<kRU7v2YQdXU`t0wu$avn*=iziHn{y{aqs8>bTQrSc#QImYnezk1_%vSSSk^<OHv?`gQo(0*m*AO9`C8Q3^N%GV)_CQ)YyIS!2?m_i-VU!D4h}3eMpE1}HoAma;$^_8s#nWrggT;#1BKQ9v##?F!Fqqgg7)^e6OE0~G=J6uX{lh%AwOhm;B%G%8k$*&kLSO}_e8@18GU@z0cGSL>`IpBSWDHd(CqW1J;mk!H-XKofdw>sOgvJ8U_>K7apI>F-P^?&6FSh*&(0-=_(*@Kj@nWmT>B@pZ3pa8Vo-bLcN7Ck9kr%507CP;dY*^}jMAv@K}C21l*Q3E+Jbcrs;=g$XE?J|Gj&*EG853lA3oyAF&41O#vbnX&N#o=G2mJs2kVt&mgJOjQ^SjSh_VlXbD!4(>Y;eOyRFE^;rIuVs-qv!{pJ%Uz%N2@xbU<TMdPX*zT;P1A%Xqr4|<)C+6W(f;AYxOKMlVfh3Ol@_$QDT!2sm-zZL#$hh&PIR%bx|Dl>#d|jN%bt)V-HlI{4Pkn;3!!LO-RVMmo-hqui_K_9#&-!R9t-3q^Stq6pe!ohO>;5BFY)-Qri|Xiv)@W(jw0MkN?8f8#r@Lr@hmx}P9r4fb(`B}H1#JYFVljaO)*KhLeq*7TCk8|rV~gP(3lRseYi8>h?|;25o3B`vnd>=EI=Q0Vb|R|Y<8O<?p$LP{Bc#qbh2my^tCzFh`B(ivIStL$?AsmZP_r|PSd@%BV7TjDRwN|C^3q>@GQ-v#Eh^m2u9NASim$3VBx^CPuMcG7+kqU624yO=<bV+Ys8O$?j;m&iVOAVYL{EEBD76?c+M$I1k8225qe|7UkjIvmA1i5B;{Mu*qByc>ZR+7;*&AYQpC*<R?DT<^X!LoL;4w!KvL8{P=OMg%c67b<Lnd91%GO5zRWIMQ>BT#6u)77x*KWN_uWKs(WIdh@hgnoE5#QiHnCrlVrpF#B^F|9>eLFm!t402DQO63$vR<2{?P(ZV@fUWIEU1k-oX?vMG$q|gZTCc%;!PTqJKQ4e(jm2cF>K*TBDFFq%vAqjz&INOBbc}Y0d)WTf=mX&6I0HsaDA7EvSn{gM>rk4xY7{v(gg0WirUz3R&Y=_9$brq`{lp^2<oLTC|8g;dTd7Yq$^9T4IVrnXwed_+v3VU3{Z70sxn+_Lk_yj!9C;9{lM!EpHK~heg_}D!;Aj1`Z>i4c8CCK-XH=G6jkuf?_S;I5%N-^CpWoux|tFue2}9f}|j29N`md#!Jj$2}C$<o^3gsm{(JValE9}sfx9fsy#U;Ah8yF78l;N#0XB3uZb)P9g1lp#HSUc30w>Fh<`cm1OHM2_*l<3H^SJniZ%Gd+FsqnW9QE5(|vG{MlpzZUunUHd3d8bH}|h;<>8v4#Rv5=s*ccoPq#zS=w{{KRVVP&&4Hs6la`qS@zDxL_mx$_@BJS5(@u1F_bjI#sIel<;HUG*6!E62zmuINYJ>P;<<^B6Pl(S3<8)xuu=3*rW1m@_gpPEzh2#msQ%&AlxPMr5P^1LVk_Y98gQt1Y<c*|ySD4oD;{bJJKQ}6j4^4QJhkLanITQ&s#3@iiuNi^Rl`DQ{LB(-jqVD5Pe>B9~Ci!k%i$b5R2;^)0lDDH-1qVeW<A46?gRI%R4QB^St?{YRnwNe<eDz5R&eodDe(%vjvfxgXmTQ0Mwym3NQKSl7eT4PE@=dw4t<;41^CHdQ|7vvuxl5NByCzvJWc?&S)TE_zdKbEy_$v0NNX32NM2IYtik+;-g=Gz{UAOeRBEoUx7ra<`RIcTs5xu~BPCi(7;IQeB_SoMfl)N~GB4Z=#_zPbN8v|>Hso|Y{ziowyDw$ehovX2pP^tq*GGmo>5VE(f(L9D|F43Mcp<cK#S5$kF!ZDycCVr!X|KY$c`-)pZvf`J?ugNLjNWAJNp%am4q{(#uuI~nuSR(*<CMPHqSh0Sp_Q=19!L=My>rN?EnfhUqUxNDfyjaDN2@#j7=OtX5w_ytMHo`>AMtq^wcUoR3e8Qs{pb!5tqzA!J^CZ_`jk$hM63TWur&>Cy@m5`WYY;wllZit8IXTlP0M+_3_-3$wdM!O-v5wT7hedtzz|Zy5g4W-=<oDcpS1-mmqB}hSif^2qo7LHQV5Yz0XwW40()^Sg)G9(JV26Xot$);WnNZ|Oq2rxi@GN&|Uy{ByBbUZF=@<%wD3Uy;?c3Fok$)d6V(xJgb!`5!UqKg4+7$>k1y<57z#%>)W5JI)P;0z=uGJ>hjlSJqTGTLCCZLc-7d-jA-B}#m!^DxX$bc&L$0(L4jUhzC9j-Z5QL$Z=!wL82(y5poZ|-_C|J!|6G&@2gx=mBhjHStvL+t&DeS!99y3p9FOoqbsiv)UO*%<7?;wDO7I1>gij*|T=qiuOiW!8@=+w$txk-7IB2c@zM``ZaQQBN~mgvfKkUN}+4xE!q9j8_kG_2X;nbjyyYPqO$01&6l)Cy>pWHsB|YkWNsKu17QyNn2`bDUfKA{EZg&(N@BhIMe(zwX-vK&>AH+iUjA|&9|jc4ToR8P!DH@T*hu4Q>~#j8&OUq2vNWADx^ZSUzI~bMTzOuHoYVn%{Hn``N$wg_pCxit7<F>_jLvEVfogMB*n<?NpRrZp{HU(_a^ld&4)7UJEH_}PAy~(B8zdcK#uyRV|#4-2K;TCy^mGMmN=xTi^$j&?%_<w=2hu5s=`^5i4b8BV_l&Of?i0`I2hF-osQRn_V^JPCQrm*NIh+RC&nYRG7FP^?%>+H$BZhG3SvSYid|woxZgtzpck|)e0R<-OW-1@Ha}H!BYgZGnM84)^#Uh!*x0_C+^Sy>8jXPl%FsG%Jc1v{O9VAY>5N4B1co;~<zL2b&J8@3o-$E%&yHTl2$Nm(rt*>G;jrp8gZH}_Z*2scck+gYE-RSonpNJ3O9hv<e3<Xjl#WUUvbA%SW@7QTVD?Ff#?9wCCO5TM9olxh6_Z0c`QUzQeFjQijeZv3o-+MO5Eskh^|(<+=^y4vs+=)+Z2N>LBp3GZoZ4JCOCC{?T0!>9%BvBcC*MkDPcwM<eAI)1?kSbQb}4yJ^uGnbgv+xL8}{XzvXObncM$b59o-!6ZvA_tsK#*p?aN;&KLa`dAom|fitI+3lB%*&{}U=sXl=Ny@}l}b8Pz%=gSJJ8FD*x%)xfFU#n0!tW#9JMnn>vf$-ifDznnQytr>TTxw_5S5GQHtR(d==t)VpPI-7apY;X1%v~P3;xLF%Pf=cXSyYSxGW^|dHCq7XLecmSk@syP4sI`pA{(CARa|sxEbe=|oBBu1(i=pXg$aEN})IsJwg)nu9Q^gJWUL`0^9M05D@pA2}m3BM+O@{hL>xdlRD^vXeM4ur$7RFCb<MmQn^-|mV-?(AE86!>E3+1pw_`&Mm23tf=*^fSyR4U&?YZEUg-{2BzL3kd-q*l4!T&gKCBNNUsPcV!@H#>QiobfXgyD63z052eFQUGnu=6H!F(li(`nh{3wqkM`-VVmdg3+J3|xL*Fds|KtW`K~_OF~PMqMlZQ?cFf{|wFkY5!)(*Dn9=d<k7Bb-(wnX|yo)#({@27#Ddg!EAswjul1VIT-&WDqZhGHsy}Dqma`?W(3$VIo6Kqed=h-NHGgY|!l2HX`|4P(~J>3EVe}KNfAS>EQx<^f7>3#HYzB-l*xFuCSF;nu+mV&$e<Dev4wg-&`9tgk5QeQ!S?ouxoY37k_DK16q_9GEDii2*4kY3z~25J$HMlpx&&W#cG#dd%_(A#trhpAWhmL;YtT2Lo61HcV&BQjcnRjY1pLWx*DG<4tt;~*<0sxwM*48IW&GGT*B%}Vt(-E4xsEWQDD(4HCUJEYrf>wsnu^9e#E(#SkK01j52whSe-f5pIGkWHwO)Ss2I@XRl7!>6<SF+MftBRgnzLhT1a8FJRvLPzpVwRM%Y3Z7rXb?4fl!?%mvzc%gaRb%cS79|iYqw8156U-gu3=`BLD+;*3noC^^h><m_W--qe=jhtmJ-H#Sq2}LlYA0AB*AM8{sj%ze(ns1h;TAL5$*RbP5EMIv-!^>fx)d`rlAkD5`+?lvU5w;La3|+D*y-VbCIBL>BQ%RUlN@h+qWnYcSKFP+28q>I2c4z0lyhX`HFIO=(gC@+Q|_hpTMfH~30yNakJ%t(56c(1{v8QyWKNM%YKe4NX+o#q$X0>;3muL$xpSL=X_Q1XK%R66Uq<cgLr607MTu4?3u0C9#YG-2svsJCog)&#Ye%Kchn1R<-9xZY$j8xwlT#t0`6P<YOPqpQli0>0d*6PDPPy+IZV3^6z=8-)uN919l03NCnCSL7a$=w#C&GSIO!)Hae1%|442YeTeKfDqN~e*r;(!jzn~pYGBZqQU@s~RK*49SpYkKDeb{7a%iFkiE!7aNPbGwp`5WduuzfaiN_ZWYa8%&LG7Sqo1EKu$wk4-gal6Ise@D4A84!dzNX|i5L(dq!Bl8$S{#$Hx}7RMwfTnBL{MF?#hg;Cj*@&feWp&%0xY^a7MOj()L|4hid>QAsbO&IfryBV+fib>7M9CT1eLdaan@S=1s+Ws@cXd>`;Y&AF`Q=vZUi#n5KD*APNuzFsDw-vPK^Lf0KXrNz&oB~7B13&#IS6;=Eik8#&G}?<|*~$Ly>}THk;ek!CIRvm&XBdw^fsZ!kHZF*0-;azdhz*h$^+U!M(12qy%dZYwcX^FodpK7vp5z%J+=~Yy?lfO=Za@kYGwXuQ2b(n^D^dlE^TcIds;g-sjSC`8SbpoSvi)_QJvC=eJ<FQ;iuMR|HSt%A6gZVIYkkX?@Hv_-8T`sNj8yFe1=u3=!dQ+U{5iYjlbN`!R%VjJqai|IA-15(pC1VSF4IH{8C9R)06-KB0HFFG%QT0PgsiBvlCqklk(#=wy5!$-ovop$w#JIu`KEO~VZK`wIC(EZ&Ea7WB|${jh)GKmi-F*rxjc_v41C>dceS=gpi9nST=6E+74q^CN=J8rT!G3$fexndga~e?&!2(Y3!){XkbONIgZCC1mPr9vofIEYgRthYmI;t7EZjAY!K2m>qt~r*li{Xd_ZJ{ISGiFVjC3}(2@6&jJ0UkX-RD4@9lAmR&k4WLYk$7tFRmWO!N>(Kci@U?^zBZjq;fx(bn)bMZ!E?xNN!<BfbX&8azqY>Z88?}ntpolOuA0#gbgu$1^Ytkb?=2J3?##2z*Za)wK|>|nM0%vhB&Nt3ts#HNW152UG!igJT-XxMHj~LP}8*VMwgN5401?V?8o%q;*LWUEGdVwc^9WmwviBaAs`Eg18I-&2*6Ebe@+b{ms<xh4isF*yR~=BNGUc89}0V8^c>o}q8uD)Yo|evd3K5mkh$RR<cC^qNAU*nqC+w(!TB7*VHC3a8S&&!orb<_V5C*DBp`dhQc6bk8odKizUgjku5@BO6T`nxe#ZCjXGn~zrJ{R~D}!<fxsppht9}Xr_x~K*tCI_)-4LtZaM0Z*!qaW{K!~dTA|a>2%WYGC`s(_k!*n*fOg;1^zy-Cab%MY^M}tM!WLiTf#t;rT6dXaNa$qN9`t9BD<Hf+?k=)*~ajS|kmR>HIMY9bTsbf-J&l~s#Or@ypyh98H_hcJ#%n-S7pVWH_Y)5!@T(l1Mxjl?=g+}{+;}mGD<tW~UVw*XT(2e|7uk_*26y#jT^Ze8UneR*V=gJNKx2F#*v*IST(vA*K(MAHOPnIWTgOwPGyL8AGvCOqHFbUFo+Sn<>f>N03=B=kO9lmPRY1x>2Be*{OS%7crV;3_bSBm~{4$mq?Ha|gad;6=2I3KU-5oKYr{L(>~%KU|eO@rRdXufJD)8SNs!Yr+Zpjyg6mI+590YBLbqsa7<>Q=A~MME?^#`&!F;gW`feXHP-;#cO2={LB4_qH$NS(gcj06-l+0HFAvdYh`Gf~4qQo~ER%E~&=sU>>Wp=DNm<?zf}`T<BQV%}5f;9Es8JN?@WYe2|QzRJP5bj0j<jp$h_&Ss9)C*8gqi+ei+yNL161hF)qvyd)s@a;{Xl*}ouj<~*ik>p0%98YK1S<H`S6%Dh;{=JDZ2347{qIsUe_>-b)mp9_vtrrBe69+~K0Be1?S-$*$^oiJ{IXy?pFf2run-bk6F%(ht-Fy3oo(w9_vvp(n5N4z%)`DT;_JtZFj7X{u9_U|$M`8hjyOAnqMKi^QLnZjI~iwd`dbGDZ;+s}R_Oi6|-`BOlMgUA`ID^+b|&Ec~Bo>PA@D>B|(=;CJ#%o0m;%6x1%!#RZ&JJ=xT%KlDn<kriWUVI_lm`kSTR=0oVG&9%dWR9iS1HY<>v8>P30bLhzCM~P}z-mc|)2+<?Rxnc^BQFfY(3NH{`O_VLhGe$v;j_kodYiRLfE)cAsc2|Jhmg{OfX!nA`i)tJ^s@dD<*wL;aqWyOUi(J7x~}2(VTpkP=QNdT6>4Y7%S5WzNM|8@<m$pj9f>*iLW}C=mdrS2e-Z;j$w!|y3DgaD1QX)@ohG96n@;tXT;EAGEDGJR_Fns@7~L;g0@=*aAkdQktHY{8tl8Q{L_CGX$w-9Y)8_AmnBia79s(!`f)ie5IB0V2@3=Fb7YczmuA8FvTBrH*RM$o9nQpA#JL?BX3QwNhc-<>wm?r6FMD)Ru5j^ywewMzKJxq;G<JfI>>V$_x@|>F+V0-DbY_tAyAZy|?3k3{2BAy>JeX6z6+xm&bKrXV4B6~{2^~X1@>w5I!K&{`Z#Z}45SPEDGn^N&|%<O*FBO_KM1Zz15`EPx<*?C-sSdZ|?ITfl7o+BoooHA+gJE16_E0Pm#@%I$v(fD*JiH5OxWx1;lqeN#+c46I4Xe!!k;hYRH4Q}b@PgFn5>ZG=9COWptK?4VC(4_&Mm~<*=@`E2SmfXr_4*8#?8stC#llW+PgALvsX7dmBJsQ%Lv7c+r5x(O*Eonu_>pPCA^S-mNJa8*hIX*Tn?=ke37zcQYeT923i1KSj&Wt_QRO?#N6JaWz(o(n9-GntBXY5kMUb^0ChSRoWXkI;62F4Yi!Vrf0P^=I6X@~XDGHy3iq?^&GrbhHY<H)E-YI}LKM;sR@kl3jL<xeR=2<1pU(G3$m1e2;^F85V)gLvD+j`AkZCtN}foX^e<_b3^?0O&J0OxVDSKAU$NL4DN>x@(m5K5GP-An2XjZd8D$`aaY!1K7%~?W09*Q3TKar*ezT^@3CseAG898=OtQu_vUQ7D!v&tPz?72K(up3S-&fIuO#;I|=q*`qL7@Vbqfnl3nNbVR-NUNh5|hO;dbCD7*DDv{q@%!DBoPkJ2eFV(_sZbT{Cs)Qs`o+1*vLb9}e`>8&Ir;(TI+i}`dXkB@v<`0{KC^tivP^}%A<w;7R5)<G!{@_Ll4WfEB?)~EN$I~Wi2lI^^-d5Vd1h2RIlN)rXE`MOfspQr?z^PV*G?^NvC9u`b2Dh$jaS(TulG)f^F3b!?r0={V)+@X7<u4Ub2CHEc}I3$MCxRwb|4bv2E3tx)_`tCGm$S5sJjgs8fuuE{MOW5(TB>Izy)5BZhyP2~Q`DH3pgQrLmj&-2Ax51%eS+M{@_(_pC+<NF}P$2pWfSow4%F|e}sD3{_`1<1MRiuYRx(aPUUvkxmo^*<0$~qAYM##aSxay&Z9R(T%1EO07iPOjC-rFSF_-N*3_F7`~O|(|z(sX9sHPGaW-za0&^QK1}k?8~fw2`Ut;_4*XK?mK1Ci>r$lRbQZN!y<ry)(`IIYP6`d04eewQU@rS?^U((SWNZO`pexDMYVa{;0|7RKyN!a&NpxY)@*b{FM<Wu4Uy~lff`})&lkFlihuf;(SA}=!_gPP4`@abXl$D(Fh8(ngJL|P7?=5X}>GA?9u$#*dipm$?$vTR)Kndr#j0!yi6BcN^uQ>>?Uqr^TR(6k<$TjH`!y8@aOZC7AzZoDT0iEjL{;3Mi<Xe%Mdv?nK5-es8KnHa+51FFT0AMUcXGvZ8j)<9f4rih&UBi5`QsKfHDsskCYs|s?-L9P>k%(*1lUnEp1`XjXzo)MbRmSQwOnj&1fS!3l1y5mqiPmajy@NyW!!nrkT`&QH8uC-0Vv(+YX0(4`N1M5s6nlY@*XkWWDoaHo9FItD7|c7U3f!<w?y1`4}de6AaEy)GU^VJ5(v08kmRt6AYRJ9sNB4VNiI9bg)(-NWDDr*CZT_?IPlD-cj2WEkfjt-?K92Z>aj57^YLiPpHbT+6iUZaxKNHzgr1Suz4MGlLI33Y5SV@GY865#+gO9ZkOsXjcUULP5W=<1*n$W_e^M2^_Jl;O;k7@Ab;@l)yxIf>ihB=#<P;{yraTHwwvFJiVdioZmhA;zD`frGauz%eXsdo_!8LAYOT>Dp>Ar?S{{`^6zSWmO2zpHKPOO+sTN-@!&+7PjSy6YMCcjfRjk_6x?l<?lpK~UV~GNPDg3c)Lq9*b7J{u(0$e?t!B`avs@q9T1x8y>+F~uK@%6QB;}>xZNt>2xn2JB_Gb~kfRTPoID+zPQ>^jivjDO$@kvX{@Gc?{t*`LX1YcoHt=j!sh73aP+3W6$WpCnK(t!X@yE$uFfjLU4ErG<mj%1@Wus&-Ca9ZO2sl}Ez6iY`$*!b|xTTT|^Dr)eA30thF~>_X&$!N}Xw2)KtV=`+VGFkDW~9D%+J&n^5fD$xwTvH+J-S3iX8bKsi?+RQswjx`i(MqelbEGLkdhS}MyJ;kx-_Xmh?{fg;PNAnmFk(rwvV_ecHvgY1HnxS@;J30!ntf+Q<_lJmuVNX6=7Jj&mnPb+3h4?MZyV_QZ+H_eNY%arO-J-1@Y4|R$x!*P_opTQiqR&Kzwl9Wd;vny$8*2Yl;6o&$#xmj2LxbCIkxdQGx{7+ijDy4<FWN0+dmeH)ZM#H#IrfpUKT>S+Az1PKD&+p*6juW_aUNIT^<tSk3GiLZ>vrtMXzHr#cy!6<(w0nig@V%>=d$BAhSv$a>bs9Xf()^1W-jc`P`bt?l~vDfQE*;?7@xEqEaIso&_=EdMqJjGy-u-9fkBoJBC1hK&|_{2pqgrWFWNpDa29-a708IiuIIxvH5=U?#E=I9kV*GuP;(gjDV~6NdL6sG>#_Fy%$*g{z~y1YOu;=Um@02=^e%X2cbM^-L(7_$to8ML-_1#@^8`F$#*ZqEONfqdy&J~-Bq&ul$tR}1K76g&u~u$>+T7g=8Ouv(KKimkK({3UI|gm}1^KO3x795HA4I$juEl%uP|l5OS)$Ym2p{9Yil#gLH7;2dfJuRK_~#HCFhp2C2|$su1jKMkElK-=8dlpKYbuK<yc&?2&$DA*L(EBHBQcM<@YV<aQM~>XD<v+LAtSE%JqvM`B@tU8Y%~@UK*km354(K+)VmUHlt*P{5(7cWc1O58m^fw4Pc(kzG@04B+wgR=SACT?cc(PEm=DjYZ!#yRx~;sW+?}pU+kUObbXqB#O>Tt`^I8`jvm-C}kRa+;%T1R<IVK{P;wNZwM6I}TA;q5K_%VEzopS3$=mPk?@k%>M;+<89?VC$A-JC!>O-oEHSRE>jpj54O)S7{?Xb{sK<3!-sn2R*~aq)ciF+75Mo>w=W(Xb|%Hf%WVR`Zk@iQK{7%Y=yiYi4UZbxLbm?N|OfWibIil3`?cELd>b?q$hP>U`j`d`nv^G&1F^v1F&*Lhv74>O-6%Up-Q-Qh}8R)B6EHq_V7v{KWSGMRD4zUupZx@@=yt-VU#o(Yrq$c8o7K(V~KvnJR4bx@YzDqZH%9d6RrR(rkXgX81WoHm&M%mXNvm(p)sOJ_aw1s+>7_!>nQ(+TIk?3%hAu@1w~zc}Ax#Wg8wzlKn!j!$w0ge?`s9a!2DlBzfU)Q?Qp3Nyc8621xSx)Nk8c+~iHa{lI^K;WD>Ni)irtd7mD}czvYH*8OGu7GHakZ3l<iMCL3?ZYFQ!F0Xo%fkygv1*x8(alhqH)8m8DPqZq$k0mbN0<;F<qEr?kQNCLz`i_0Yb;RX0gAb1*5r2DnhVUK`@?2G&$OH5aN?MiNyn``~N`RWF?_@L`dvFD@u{1EWs~R6iOaHVHC!Tk?Jx7U%1jhZj8U4}!-%}q9?QZRZzf&GC06_jfO?}j4MA^Bx)ie~<n1P-^s>umC2vJnX?RMovnuL>=lM`X)kqXfnD!8Chi`T1tNnd|wR`;q`S_g>yBzUtL47<f74mW45ssbsdVq;F?k$Eu=NFH}c`q(HUWV(wr3!$!GLrX(jxmV#o@Z+{uVF|M>E1*qdkC{~pWFP<+8#P=Ljpko*=*#Qk`LfB+$C^6*Hd-0O@Ux1(D+%`K^dglLi0qm+;v7>h3Qggo!H-(o(@hmj@85p58cr&MoW{ks!64DM6-P|1#V*H*3(~^?_q{n#jnqeIMB)|3<xKLKhAYZP2QMFcZI?@Hu6lnqzWlp24fRD786g1xdKdt};Qz6v)L+(gGIL{buy8Xnv9fRkvY1($I9mN>Pj*&zZYDOizkgQ{lgHoIWpc1^aB}rxa&iXRIM{ewm@|Q#m@Ms>EL>epfbI@|C6*2v6RzYus9krM1_$Ey@L{<hF7#D|Jsg`By*=RE2XitJ(3n#)^-0jbb8b<+ehbR#;_q!wXu9CV9-duZm9_?~pcAiMc;I}#oH?}&>1Ud$;V2#63RIc!1qwK*IAS5*z&7)<v?McR$bv%paW6*+ncFWehb&9QyMO9l?1CqC>KCHJre&;C^tY7WQP=bWZ}_sA=2Tca2})}B^@=N#$?4;!?Xjh*69P3CHqr%hW|z)+jGxx|IZs@Z;_koq#_1W)mUtcW`dvIfA-4yfpf0=q&inGriOWK6)W)Mr$)SD!S_oM{8)Qh>w~^30cucrBE6k&{KHCG0vMShz{DP0fi}a#QyW*Uo!z<Gq{IY~LK68HJ+PP_CWb{Y3y6=GUa_d#=PSPo{=Z$&7XCWYVlHHFqVgaqGY+42^`wYclYkOW9dD7XU)j0{56}Yx_u#4BC8$4}Gp{OJ+Cr%1~e~N-Rxe2iAmfsV-n)75=o>k$j+hUhma%OS2si#0Xlq)>8<IZ86-30REQ?f+|8M49Kl$TU4@XtgO<)9(>Od_@`AD%Ey-$_<8+GXV;s()=GnWQd82>)71&>Le-$zUy6$*TIvggYWv_qBOZ?PS1b2DwZJ_e+cv@vDj8^J{`WGmX~0IqQ+CY$KJfJcLiq2p63#gciePe_Vs)dt45$e81d*y}A!hFD^=;Mp5+s=O)ltw!NbPxgR;wp(4&-u8u$_eO`Yjj2sYrBbdQN|9l$qlY&;Tp)4S|q90I-P^6BUfs`O;ez4lS%u;WK3f+gmzGbLZzsV0nL8R*}a2cSdcPPUFp#P1NUg-Mu!Vgjy#t<@nGHGpU<f7)_!KZ*ZS^@qfsACiU4~XH+hkm+5;~VY+v!|?z)u^WZ29h32h=xw$caiSY*=_y`zldS8jeE8Xq|2Oimh)JxuTEnH(}N~?-J+Mkn*3!Ra1Bu$!-<GlkzORl1=n@^nXiG2DyE>ivJ|&4ASvycbz_1di7X3z{<>ySlSG()D%3GjjPuw48f^B~v%<bN6OXETfN<NFOGF0|)V4{wUkl6?9Hf>U4I0SQq5^Hyoo1s6;-eBy;<T(nZA1fgjPJaV)AqW(SO^Al5G+yW!x4yNs7w728waUVi;A}Ci@5!Mti`tq33Rb!@SS2`rY;pzQ~Qt?)`q#k2Vb5p?)Rgwsi=xK;FfX?bCqW`>_jU@T~?=)qKz+sXsc9Trjl4jE`EpiS92PTtfi#&<D)TnN(qH#pM-nL%MR>NR5m8VCnO>evGIaF_W)Srnl^p~v-OHSOx-uX+bG(fNA4|?Wkb<EF0#U6_r7X>JhU~hz(*2pQEa)Qp#LCu%QRvP@z43w<km^tJ4|vh^(JulOg9fLe?}qiWHf>PRJhu$A`b?R3Gx5${QbXQ02tuE+z0$m@;_VE{zV>v`Y$%F{S*7och7%e?@<1mub}_r{<Dz(FYXVl|BbT#Kl%SGZT^c7i}znHbp8|l&(PvuXb9^6YM}8?@IP<ie}TW!{4d|hD)La!f1_aj8rBd1z%#?&tN#OptR*!'
DOC_APPEND = {
 'Interplex_MES_FE/docs/mes_agent/CHANGELOG.md':
   '\\n' + MARKER + ' Correct RW V0002 cross-storage FK for memory-optimized Master_WO_Log (SQL Server 10778); 4 supported FKs retained; manual SQL only.\\n',
 'Interplex_MES_FE/docs/mes_agent/rework/RW_PHASE_A_SCHEMA.md':
   '\\n' + MARKER + ' RW header WO is a logical reference: Master_WO_Log is memory-optimized on audited Dev; SQL Server 10778 prohibits disk-to-memory FK. Backend Phase B must validate WO, whereas 4 other FKs stay enforced.\\n',
}

def sha(data): return hashlib.sha256(data).hexdigest()

def root_from_cwd():
    cwd=Path.cwd().resolve()
    if cwd.name!='Interplex_MES_BE' or not (cwd.parent/'Interplex_MES_FE').is_dir():
        raise RuntimeError('Run from project Interplex_MES_BE with sibling FE repo')
    return cwd.parent

def release_files():
    raw=zlib.decompress(base64.b85decode(PAYLOAD.encode('ascii')))
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        result={}
        for item in z.namelist():
            p=Path(item)
            if (not item.startswith(('Interplex_MES_FE/','Interplex_MES_BE/'))
                    or p.is_absolute() or '..' in p.parts):
                raise RuntimeError('Unsafe embedded path: '+item)
            result[item]=z.read(item)
        return result

def scan(root):
    print('RW V0002 SQL compatibility hotfix | SQL Server 10778 (memory-optimized WO)')
    issues=[]; plan={}
    if sys.version_info<(3,9):issues.append('Python >=3.9 required')
    for path,new in release_files().items():
        target=root/path
        if target.exists() and not target.is_file():
            issues.append('Non-file path: '+path);continue
        old=target.read_bytes() if target.is_file() else None
        if sha(new)!=NEW_SHA.get(path):issues.append('Embedded release checksum mismatch: '+path);continue
        base=target.name
        accepted=PINS.get(base,[])
        if path.startswith(SQL_ROOT) and base=='03_DIAGNOSE_STATE.sql' and old is None:
            accepted=[]  # older V0002 pre-compilation-erratum release did not ship this file
        if accepted and (old is None or sha(old) not in set(accepted+[sha(new)])):
            issues.append('Missing/modified release artifact: '+path);continue
        if not accepted and old is not None and old!=new:
            issues.append('Different existing file: '+path);continue
        plan[path]=(old,new)
        print('[OK]' if old==new else '[CREATE]' if old is None else '[UPDATE]',path)
    # For a safe patch, V0002 existing file set MUST be intact;
    # 03_DIAGNOSE_STATE.sql may be absent if the previous erratum was not applied.
    for path,append in DOC_APPEND.items():
        target=root/path
        if not target.is_file():
            issues.append('Required Markdown missing: '+path);continue
        old=target.read_bytes()
        try:decoded=old.decode('utf-8')
        except UnicodeDecodeError:
            issues.append('Markdown not UTF-8: '+path);continue
        new=old if MARKER in decoded else old+append.replace('\\n','\n').encode('utf-8')
        plan[path]=(old,new)
        print('[OK]' if old==new else '[APPEND]',path)
    if issues:
        for x in issues:print('[REJECT]',x)
        print('VERDICT: REJECT (no changes made)')
        return None
    print('VERDICT: PASS — artifact hashes verified; no DB connection performed')
    print('NOTE: SQL schema compatibility is evaluated separately by 00_PRECHECK.sql.')
    return plan

def backup_location():return Path.home()/'.ipth_mes_updater_backups'/RELEASE

def apply(root,plan):
    changes=[(p,o,n) for p,(o,n) in plan.items() if o!=n]
    if not changes:
        print('[PASS] Already installed; nothing to change');return
    backup=backup_location()
    if backup.exists():raise RuntimeError('Backup directory already exists; inspect: '+str(backup))
    backup.mkdir(parents=True)
    entries=[]
    for name,old,new in changes:
        ent={'path':name,'was_present':old is not None,'installed_sha256':sha(new)}
        if old is not None:
            dest=backup/'previous'/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(old)
        entries.append(ent)
    (backup/'manifest.json').write_text(json.dumps(entries,indent=2),encoding='utf-8')
    installed=[]
    try:
        for name,old,new in changes:
            dst=root/name;dst.parent.mkdir(parents=True,exist_ok=True)
            temp=dst.with_name(dst.name+'.rw_v0002_memfk_tmp')
            try:
                temp.write_bytes(new);os.replace(temp,dst)
            finally:
                if temp.exists():temp.unlink()
            installed.append((name,old))
            print('[APPLIED]',name)
    except Exception:
        for name,old in reversed(installed):
            dst=root/name
            if old is None:dst.unlink(missing_ok=True)
            else:dst.write_bytes(old)
        raise
    print('[PASS] Patched SQL and Markdown ONLY. No database access or changes.')
    print('Backup:',backup)

def rollback(root):
    backup=backup_location();mf=backup/'manifest.json'
    if not mf.is_file():raise RuntimeError('Backup manifest not found: '+str(mf))
    entries=json.loads(mf.read_text(encoding='utf-8'))
    for ent in entries:
        p=root/ent['path']
        if not p.is_file() or sha(p.read_bytes())!=ent['installed_sha256']:
            raise RuntimeError('Modified/missing installed file, cannot rollback: '+ent['path'])
    for ent in reversed(entries):
        p=root/ent['path']
        if ent['was_present']:
            p.write_bytes((backup/'previous'/ent['path']).read_bytes())
        else:p.unlink()
        print('[RESTORED]',ent['path'])
    print('[PASS] Local artifacts restored; DB never modified.')

def main():
    ap=argparse.ArgumentParser(description='RW V0002 manual SQL FK compatibility erratum')
    gr=ap.add_mutually_exclusive_group(required=True)
    for flag in ('scan','apply','rollback'):gr.add_argument('--'+flag,action='store_true')
    args=ap.parse_args()
    try:
        root=root_from_cwd()
        if args.rollback:rollback(root);return 0
        plan=scan(root)
        if plan is None:return 2
        if args.apply:apply(root,plan)
        return 0
    except Exception as ex:
        print('[REJECT]',type(ex).__name__,str(ex));return 2
if __name__=='__main__':sys.exit(main())
