#!/usr/bin/env python3
"""Standalone MES2 DB Migration DevKit v1 code/docs installer.

Place in Interplex_MES_FE, run from Interplex_MES_BE:
  python ../Interplex_MES_FE/IPTH_DBMigration_DevKit_v1_Updater.py --scan
  python ../Interplex_MES_FE/IPTH_DBMigration_DevKit_v1_Updater.py --apply

This updater does NOT connect to or modify SQL Server. DB baseline adoption is a
separate operator action performed by developer_tools/IPTH_DBMigrationManager.py.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
from importlib import metadata as package_metadata
import json
import os
import re
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path, PurePosixPath

PACKAGED_DATA_B85 = 'c-q9e36p~CnkD#Gu2(P=$GYsxxPpj^f}()RM2oD7A_#)G|Mv0wYU!@78`V`^(=i#587BBXJnK2<G4u7;vlRutcg_C#fB)t6S2uR@vlnGn7R1q?S5hzZtgB~6apwIl{B;~<UU~_=yD1HprZD*1@5uFUXYXoS``^L8IR`7+d)L3AFiJKMqybY6*KVAHefp=(#_w^zH>Qmn@(*YCum9Iyeh;_>Ug5cB9{uB4_xG6p=YRPeZO*gmU|}v*R_56S|4-KbSI7D@Y0j!+Zaf{U8*@IJj{BQGj{djb+5F;K*?;iy{Shk<2h-W`Klof}#%t4oIhOgs`agK&Kb^_{mBC+hmi?>c-+0cH#>2%g4>Q?hhXYwPf8p>mLHMs(TJ%R_b<kI}#o)hWXram6Y&Q81+BnB<9{%#=dN(hOFJ5Y9aU2HG{?EF8eir=TcmI#FzW!?YKV#<gV4(#0M?2GmYvTyw`Gn<=K7mrCLohVqI5bM2B<!NNYr_OdV;+K01ny$L%P#6Lj7_1ij}d=3XnTH~djH*Ml!xK(^2N#y|8`=y!G90>j~_or|Iv3dxMYVvZkc}+96?~}ACA}G5dH%Aw{H6|fno&a(+omTG-eZs<B}8s<G4j5C}HCmV*8Zs{|s4}>oOR^;1uJLH15){OVR%&xBsODuYc3w-<N6rb0B|P3|L<Jv-p44ZPY>t8uefj^%;zyT#u$4#G_G^@-fCD7#p`NoUkmIh7k<65C_I7|5pse_G}BokpEL||1$>uI~iw)Uy^Z`v~k>aT!yrNF*q<xSSaGynDa}!Z^JI*I<)7~h=U`)Rzh5iqUqmTeA53<yZ%R`|ErF^{%t&0M<&ln{~U<)j|lJ&m&f1t89^<V@(6@RT-e4C*rteI8ZFdwU<$TL2exU{$1#g>DT+osgd$M{_Zafm<**Nv_TTgQuc(jWD2*Y6?J|}FqZI05e^iG;XpE$3iy(dhGpLPtlx6)w|CQ5)3Cc!b*kWLc`s=?N@xOzze>X%N!x^8ZX_z7j-~AQFaVdgf2;?`ezjlWy$3an;_@f}W=ed^U{|ZSWq>DQgMUn8|4bl144F1LEyBP7aK;bxMTR!Pwj{Cbq+7?3N6lJ-jLm?Q6VT@0Buwz>;V_TjFWB-{D|7T+OyHR?-=t!EvVBaAeoUwh<p)JfIQHJ(xlKi>i{;Ep&KJgp;UmoaR6aIX&5YPT$0gU`_HQ#@QjsAYEEEjPc%!3h}#AuJQY3DaVwue|S=8+ywk)%r!lmol8#}Futdp3%}4vr$OL(q)<|3MW0K??l4?o&U|Vi4v>1HX(j&aWhY%r;K^fl&xa{W>49Z1`6X!n0h|wk(peQTjJcj^q4ZG5_b>|DSmG@8g$mVdM|H7>`11+9xrT!QtPS!asavFw#Xa_t(nK&rjU4JqmSDhD5MmJ$%GQec$~*=KcRb_J6<k9meq~jQ)WV{>wN0!!#WKVUUA5_ODei7^6_aV{H1z;+{`AKYT+-6t``JLXiI*s{3~wUks)Lb~!L5Rvrt3rD_h=tTdkv{vF=1QR0VCKZtNVk|8LHK^)ruaon#E7R^vUZ&4KgL8VW@?vJs5aEAMq>yWtb63!2|{w_e#Ki+hH(1*DmNx`HGI}`)|s1x={gh5;zbr9EraUXVmvH)=j&-H%TLD?4lLu<=H{xbme@5-ysfBRFxCwY*1f9ws{KX(S(Gp$QtT0cP_r+=4}t;^;29sKQv{LPEpOC0=;{%sZORv5T{;>jPJ_A~wS#k^)#<XWkF{r_t(@c;dAe#Wk;^Jh3koSv@#xID3!;MWy@Ci;;b;>bK(chkE&VSWv6e{NFPKOn^act42#=_>Nq|DIIWyjafZ=i@(S_VS2b+xhe5zp+RD!=G&SPj>L%Z+~dtYZ6+abMVfOzkdq*SErDF!2kOB{CO@vpRM%qkKz7e3d6trg8d86{pDXU|1bZ9`G2YZ<xfHN7w1=~KkDcG<)4++@0OK1hamHuEKj|^{Hy)4`IjjEOPWVnaQ*`m{_;;0^Vfe_#mvC{^ZEai>@j)oHVHEGhWv|E{xj5z^$26j{WH%0qUioZ1T@l9(-3HHNVrnJH{H)WgPGsg2WGEY=E^2gn^Cu~T~B(H6mW)6pOh5uMU2z*F1yzY2W-k_zM&Oc9--P@665a5?@T$T8L(^V8oH)2<whO+w5>LK-Wvqx*3}wS*KZ<T8s*~iU6-n;I-6`F9I~nedso>_12NQ*mo1Zww{J5DOf&9-(J|K%-j(f0WU0-x%-12|Ep?adVq_8W2Kwg0E%4Wu#D3xhllclFwh0RXkDIobjBIPW{m!Z5#%6ZRek}m+7(7iQww;t1@YgekxcZ$ogZtgT6r~>{*a6>eYZA|02{&m+PuwmM<i+1A^J<+c=h*m>U+!qFdm+LV(+Fd`)4G7O-EeikV5bvD)X=JI$t$>Brgi<fTnN$vx+;;s6lM_R)t{BrZF|c0wtU@+O;!S7gVna=A*vGJAiPY*k?T+FK2v+IODpQI1iGe;HAhK2a%PQc#nR6i&2~y++<fOq6=}wF&CiiV9X?LMlMMCBoz|P!rw5=&q!LN`OtZ4Ok=K+Vp4R}|l#XvXd?8mYt|owQPq9~fZyYLVKTI$0r!d?>=ZP@k=h(w%<hhs@Cv`lh;EA(BB>YhG=N(_XDmmLppZ+{fvx{+_#n(sK5-k!V7oGUX^szCt$7h+ADn=`xY)^iFvK{pHU%9)=77!<_N)5_wefh7BE9DOC*JY3GNb_~j0z1s$BXF}l896FW+O-s~BY;k~$N<rmdsn*DpY;-4xs(<qZ#M6;Zx6pnYqoM<lE9N(OmXG32fkkA6b|}(Vl(o~_0IlsEukp1(67Ub>mL>ah_CMluOa;;CjPtqtxsON$9{i<niX+91ZZpYt=zE16)*bSInWMJR9V?<;!1DHEwQEXP6sO0d+jlnKHcpN+ia_5{98G_bjuJYzDuh(x}o=aNT$fO#TepaU+Oc>A84wB>t$wi!zZH{w^ZI$CUW&$oUL`iRt0qSTz#C~es-oaY<;Vco7tF4m62E8+`Q<USvy0$ui&@lu9IOA;>`xXp2N2|*zP**m8P#9>ax=C<{aLr=F5aI&|l6^mUF#TP-EV5#M!hD^u&FssFpGJj7SW84+iGCpEk6vGp;v?fu*xjEKcO~Qca@H^$rXXn`F_|L&x^VJ5Rs5!0LGiC#BY5%4|;)N<W|=DDDLDIRybqachGum@)Lncs=IA{Z893e%2eQ)yY#~UzS#fQ9<or!?)CI^4nZ~6s@l5kGHckS-P(yC6pg<Ho~OaO=M?1eRQvhr}69=V)N!D^Nnk+x3-J-e)X|Gi}t|-PD4tbtc%KR5bSnn;H{yL{s2LIN^$bGg71+<gQ&JN|9)={TIZyBYys#a>zV>lI@WT7p8V*pDepk5-yF>vb;M;>$Y$0e({E|qStH{2iob_hQ>iY3=#?$d{96O#wO`W0diYp3P$w0Vtv^+H+!)3;`_odg#=E&0d<h{Es(N0NjbuzJ;tns3=EF+QoLvJe9Nx26%g4V+jz`~6!R=vtm$_8Iw9{Sa^q=my)ua)SBG$nrh6bZ>5UXxwv+C5rfm8q98vb`&E|2AySWNx>?9p8@)(|c1U~rVO1NF#C!TJSvc8juT@^;7Aw8JhnA&2J>de&)rV=|r{So3JwbBC7M${>myoXe<lNLFR_5IM_A?cUS&oW}$gN{5-jqI+2OQ!xK{hr>+^(gi+~R*UFV+Y}s?IiT^)U1I_4GSp<$VcpQakMOlh7q!&M+Z!NUeI57)u#15<aRu~VLW<@Gjs#!R!qTe0d0ahU?MKfS+fm*2EOMvGI;ii@?|V`4*e`W6%%;d4bXR?QDKfar#bJ6BFW<ZSSgf=4htjxqrzlm$`OZZZB$?l)n=`gQPd{s#i_6%20L1V`SEg%@f0WzcX(H}aERkUCRk`@%ox0w_^P8qR)}k^zW;7^ok(b&}4DngYn|=Lq$aXy|IEDIaw|bA}zreD0DR{fx7I7>Ez4f8bTt?s8S7o3Lv@CBv)3{Y`gf02&%a%wj2Ig})ctG3A-L{6tu0GU~BA&RIe;6I4+ovB#<x@y(?0UV?+*dZ0OVXB!-Yp97y5EL2JT9E>wb{WO!bDdiWR$p3nqO6SUwXKGL?c{kqn&i_l}FlZ&_#DtGg{Jjsx-l%Na**sVihwsRbXVMB^h^#x|qz%I&S8p?Oc4w@c5=e!7|u+)h@K`mcSQlX@Zmg;IytN#f4{U2Y#liuAE{PE`rJ{7C*33M0PY1#pS*=;%!j}&e3MwA~`O+-%1RvBtkNX=qey$&U`<gOLSWX^XoCZ%;0O$YA(v{>Wo9SLD{U&*>Zw+HAGFPl|#YokaA~ohBj{X-%8s5^apf*N}O}453bHcomfeo7NynvH@Pp7vB6E88jqeJGqm5Px;f6D=jr-bZj_UR2&*E{I@?QUvA$S&{oXRRR^m+P@FkG2RP#BIww3yKjEl}m4~8R8>OJ^mv%6iRif+z;!C?i*{hdvfLDZM?ZQ^NibS0)VvWFXVj@8JKKHe=~pGvz-oXYaS&eyH=xz#8&ws+F)r_aih)aKD;@8&r?#`;xv&uMy*?Zvo<wd~6?*dlSa$F&?kt^_AUXxw|Vokc9E3(kL5grSvCuvO>h+p&LN`~U`%aqGs+tY+LfJfem;<xTf!)^`^bm3vO9KS7uznQ6!;b?5D2#lF8b>3mfoM{Bsgsf1y5a;|i>`3`d{nL(1D0R=s8^1Vy^M4Z`w7E^b<xsz+8b(mnu+|X!svn6~yAdjP0_E4=_u&6toLqPS-y)=)@w?kA6O69?F+G#Nflf#9yy3RJU5-1P5!JRF=r_p)meaN>Z?xr4$g~C>`$DMAMyadnAY*e2aY`=Cq@!NMzNW>#;Fp*-jpw*!zFhi^&SW>;sL~T2>BNI(LwTFDr{#v-4F%f!Qx!RtCcE{G6^5hrNTA+_^d<XbJ-gw@^BXVc$^0Be>wjddJ{r1#7_<5@n5pNtOL}s!U9CFHP6Qb2*#~xMt_{I!?fT(RPfHmtM#>-<Jd5daCO`83nzkTKNOmLpS^XcmW3KY=Xx2p-6p|#NN@QL<yo<b{M)+<~-(+3!5kBX6deAZ7IPt-KL3lPAaadd=+m0KkWheLM85??vjmqsSn%8T(?Y1r(T*NoUhR!h*t4olk_Eq*n=m(uH`=nf!nvZ6_N^w5X%CA9dyOYZDJ=B_6rI*W)6f!u#S2ALgaG0^XR{<o*^Uw_X0=LCl6QS9?m5$BTjI6J0LNbjnWS*A&`KA+7lqS<bV>NMq3CkE3TMjAjtn8md=yF|fk7qO!s4G)by%i;Bt@dL(?FLoj+V3T?WOiu^6*>ZbDgEl-R<HD8pa1U=rh(6Ofc;Pq{t0}{9Np&zc8AmP4>3(_8<gj`YuY~2yFq3Mc=1mg|Zs|Uh1}ne|jZ=9wsOSdC-8Sm9p={|5aOAVsxwZr2Bbku^mSAPKu6)`hS&W2i?Mx1I?J~Gl@1y%5J1LFu@2}+l@sGRzOkHw+)sOU2EGlhHfjcKX4jx`!a?4Qb2EHFiD-djbJb1JsW{h6LT%q&DS0VNFhdDKAQ%002qya0r2E+Z$$u4cIihTR^GTNp5HFm1ZoqRKYFmi_D<=Zw+-uO;E;0?JFN2AB3_4PWQI8@u$-P5d#4VMBQ6`W(t^hxyWc1U7&{;BVvaK2*seLRF<@>=hP$mH&}nQezXy5nA$ckef8Ye^;Bd0M@24NrQ(U=&MQE9aSIHp9VWwK#yQa`_sk*0hRMlkKWeKTVBzzB`B<X5x>FT3=dX0nwY=qlQ+h$K7m|)dol}4((d_nzYU*0kgf)&d;Au6`^CD_%8jSN_~z&6C`QzO+m~~K9=zV+flkTyS)8eZ_fO^*p`A71>n?m+CGT4$*C_Ay{-v8*n@lYjI~Z$z1^uiX=JPK#W8i%+)~4`$$9m=7P}4`k)>_ry0}AKdnClq3)(}{=O>&qrgML(6|Xx{j^+8gq7A&sZWPXyi<7L#m4Vy0x^@faeP|bP&r7#16F6uu=4~=W{YjN5xX7rsIK3}8p)Ue{D@7}7URsZBXA>>cr40&zgqM0*Qhg>Y{`RV$hVd3YpqvkrQTGIogaV!?Zds2S$t6gz&RU;$XufP_Ssn+|YD;#`p9+ahF3EdwkH58G@62lWl5?kYx6}UkcndAbKp)$weXTp%Yt`<Nw$f_1rnk&HqjTEF13w${rRk5s#n_#UGi!WfyQ&P&9g=7sB<oozmFo=Z_)TKi0l>?XFSh0O`PjH}xBa|H0PeN9(?n*q@LY8=V<G*}T<pHW*Y~pHF)CS&YTQyKTJ4e3N4dnIN_!Nv;%@2jj9<eg-wDNs)-CS(62M9_D*uRAQxARn%pkpVi6f?6?{-_gj6FBB@*COdn{?HZb#|k({Y_7&+Jh@9w3%l+JQ>gp0?w7Y^ErNw7xHRf3w307{a*>%!Kc)G#f5ozREA<(Y?!0xNWZTy<`O!+sq1;>H6AMRHr4{9Rvjh;cK6tNw;tM#(~5$RU(7)Fwh!}uaUpOrGj8a7S#r77jkG2wfQEt|*spWk<)tsyP1DwwQe8V)Gxaz*Z~P?Pw_gTZYlAxievjbQ<dHp-n^<)~x>IAOVeJ>-li+`wHMd{)oG1+PlXT%Kp_RA878t$X8Glq3`N@hp3_c(C(s>;nJwH2QHKE+$7f0AWvmba)@a8Y~`u#0%M^QTq?{#VtR%i0q1-jA<^6Trj{R-!<KYW2bM<Fm^@<oi@S3K9d`>+2TmK{EhPlJt6304|oHeJHR5hF^`BR7sFOKVjlsCg*e2hMufLwA$3)(IK(Sjs%htKG43P7%xHtJ06e>bRhM=b5hh-Ax$hEqON>*ZRn``@HYkyt%lT@7Hf{(zyhC+7)a4Y+N|mrT0Oqln0whpB87&<+@^U=IQomwrjgnKYV%BU-N3+dkCIP^Gm9y@4dbb$CHM+t>w%}ExToF&`c+I+MO)e=13li*q*_H=ha-+-nY6$XrOcQ)ayLpaUQt;#wr@m%x|7208=*B_$F6N(G4dYT{AzY$|)sUGr(UBXw+Z5I?4CJ_Qn*iCzb=TBRrX0l*gjl81BfY{kY3IfOW6y3IE&G5VwzTlP?K5%Ir0#0Qn8~*T}r^3>>v;<UN{{=JK)vQsc&{K9imsiydXVl89GICt5px4!(2aziHxJPGe2uOOMW^Szn8@*?MJf1Dt{P_yOoQkxM>pPLCl;M+DIX`(c%#k8I_`e}wq`f!`6G6KdWf5-A%^+E7%2Xb5=QZ8DkLFBvtS)C((b{H?28KT#q}=v@qfaw~pczIj}QCJpy7xfFg!y?Oid8kn3&QiavlN9pytbYn<Ijr*&A>f@K7@u~|+dGcP4#m5gz(4dKgbZh$ksmVR&TZGkAb${{ImE;U!?om%Vk_B#^DV8i1>_t_nMQ5j{AJn~g`JO;I2`hSC%t*fH9x`u-NngXrZm4n+p0k8m%FVt<-b{8sQJYq*=YrsZwI`_xaMOLsd!sC1Sv$8lV+;}K?_9iSPbMP^_2cnO;d)4>Z!-G1>J1DdV^b!@*gM&Gr+MnETkd*alfL#0y$;#6L@w>&`BP=pq@sEUVp;_iH1;g#s6WL1t9F`th-Q~-!Q>oo_e~z-#`15JNm(+wwPS#&4?s}s<x{)gXE%4T^4v4)jA+3Y%zDfic^xif)noA6#!cq!suB0k!zB!BZhfZ8X=4fq+P=Afl1XwMo}ar<@6etf?Bs|yp|H7XRa-97h@H);FF(Z*#B|Sib}Z2VRBL%>xH0MF10SCNy<Je8E4A6{x|lL%$vH~C2;I{!eI$VB_#x;z+YuuevfTBIIH6Y+e!f~bqmiZZDKoCZNFt-{{S2zzEd@Bm12_rR^9i53DYYAKo~i*1zn_<cURSRjx+Klg(l-3L9<|RKa(R6$8gKt_dGwqy?=9+&P^WI&caD~x6m^|9)B=gRRCs)eJDqIk+w-Z8)b~b(4X*oGESH6Pf1Ka<xXM;nOiiNwIagZ6>q-hhg>*h@t@1cj`i5>sP&?_Qz4CKG_#LM9+`x5n10jH#wMQUUb-GbQF&gx2=|<YAy+p7XF}IwFypWF1UEaUvW9oK8n!uCqS=Kw~RmZlwD)#qF^PwM;pkcZfZLk3fiOvz5Zd`>uMIH{a;r3`HQ(=0x5r*T7)n($(*g`+KA#ddL{pPK=+Qs|R)-#-L7ecUsE8CmA9T57ySN;0pcr+#}TdT-dpgZ5!@Z!rC1Xdo@(2d^5di@ML`a>inb$D>h`ehoc)&y$SgZtn8?5>x9{?r~4-jIa{@bXd=GD)#ZyX-_6$u7pt{JFd|!O7wJ++m=)8C|Qin3XHo6CLUMOVyp#AYNJaL6H|`M$6#)<1tVH3spc-dGHxcuEr=_qS+K&3hj5zKDMqf$8JtLGVgaEyX)Nh?XEfxUB@Y(Ki1FPqVLsro#m5%d%?o=h9pJOPGeDY@;k2BjZ3=;eIXN#gm3aKb2M^)EQh=v_V5lBU5eYTGnaa+*<{*Ws@lHRsEH#nepHh__T<lOS%{PuR=YVGDxa_WN<A2lmG0>r0uJqh5+Ssrd{3=U^JDfNOG**dt2Cj5fVx;7xLPkSWmmj5{wAFlDQ%ZGt`3qgetavH>0tDnw75}u?gu<}*=eO=>ptNHvAMAuyPoP3lIpg5aP5}?{9+m9<t<|sm99+L>~NYNq!PHaon&yb+A?qMzIt=~TgrvDbgaHFIyd~P7}BkGJA^t>=pD3Km)hq!WwqDPXFPTlZXcoDPVgRcZ32jaIWZbJtvb<I)DkUU+^&~ZXGsyS(kc2a;IC43x$DKL*ZFt_`h$S|I#ByiG@pH?mfhvk<@|G-;br`Sohw+Y^dL4#?fjEXU98Ln=W7{ITZ`ejVn|c`$<Uf2zvWp>I82|v9ad2^W-q4-oguN9iHNkrX-k;#?IwH6;mtOD3mWi6#o(~KHwoOQFs`)kxxx@=j{OE=pC1i-@MK@h4z?+MN8%%x6z2v%{fxawvwl?BW2?zU%?4JVTC&^l7nSDv)t>987;=Gmu-%mz@!fdS$`%5i*d^{Qh?=9MfBdVJ+N(WYID^(NoiX?6yNkQFSs^#JEs5Og(;dH$<^+d^RMwdxiW9FTvArzUjGp6fN#V4*((Bh+10)%1DSC<L(AaIv&b=FL*KqEI>FhdSQgYm=aO=FBDTGChDtr3YNMAJG2-eZ-o-Erwpf#;)|Hs(NtK%gZFuIIAQoY;=vJVee{njQ3P9=gRpEDKKsBVAV(Dk`5LAqR9AKcJfO0C&<GOmNzOBT<yW_2SzD+5R!mxoyUGKqg(+;<;G?#)3gF2M8t{8h^gc)Ne!{Pf13-5(#+qE_B?`KQVWp~cqJ*Z}lGU#s3_jK}$8-?gLgkS@f6lA?iBG=!3OdtE73YQJ;$+{{1KO;a&Tb$oqpF^lJ8^^Pkl5P$|rLdVXYjkVNqNxHl;_v%s*&h9`s4~=3<bh`yrL$Rj9E|jRz(-H+F%A=q%nLH*ot31!wb@}s!SfDp9VdG-BmX*U(-6{4Od$P?STNX9D*`V|^tNz9_*L+7B8I?xbprpc$jN=E7!-^9u;?|=Ft%H88PL;aq4RxnazO%H_Z@G2TBXshTucH{Pubr^{R`$WhY!E$aKnMV>@$I=-!w>CK3E{QcZNc?A=RKRRM)0~+`J6QA`W|llp9X&LAV&(2=>^rSGfy+#*|;^0bd*Y*fya;|q*H#2>z%{wepq0MQB>;IW}BAU*LhOCq6~VCz5s0wR;zoS%w^(<orm9j*>ANs5sl4pctaCZ`u-u#v8LQ*woCh!R|inYQQEunYV)R|i`?C?^6PxykOkQDHqOiGd0M0yhD~304>yUU?_7B`5$wLbFIN+2-&TUlNqF$F(6VCsPJYT9JD=}*qt$fytt^M`78tn0W0uSpHay?j$YyvCwJH`2`vA8ZmBQDug>f!BcO|17TJfL&uIc9oe@$CDZq%We)nN1PjUNNR3Z0S$DGgrJ608!9hZEiIpE-Mrx|`YSuqeB$&p0}3$B{NImplGq`!oof)R_|RH<9FuSl}EUd{c3KJ8xNRm^YL0p=Pxo9|k(4_tluLDToUIZ><9Z^?rFUl)#2)#mCzqgj(yS&(OSr_K6R%oaEB(t*u^}FAxRW0cuB7Sl7DMZtnr6xMysP7(%Z4`XFX&<sCd~H>qW8l%1xPZ-@T1cmbbvV-yOAU1|FPK1Q!-E!DNDgx%TAqUWzholCQR!L8F{LOm$NxYw>jE*jsqq_#&!>7iB6rr2af+Ur9@Z79cBcx0;S(+vmk+JQ8NIci&UCn3*0XL@%^A<a|R7!FRF9Skm3YiE#`+oVbPyYu$Y^TM{d<Yv@YS*+Zn1|^GE>~)LV=2@w?ysI7nyXF+ktH@3<n|go#DUUYGrO5}l)}CDx`yscg+F4T;^U*}Py|KJ{obpO$hbIf`Pugg0Xq4)^`OaeS<z8=XUfC>AGrv=8$<ee|tx_k{uQ1!`qeSmIi?!VO@LQEOyxY+$<i0mD>!ok&@s&SHo!%2F@9k;4$yL*}-^B$#E`fB@89OkPDfY|wQr+%|5^LI}dm6mD-#c8ZvhvWru2+{y<=d-<UgUK|vuJ}S;PHITH0|5j{3Hcdz7fUXi*+`eE}&6*WZxA5au)c)-zvgYTKLlj?T`4%cd`|P%9fIw7E~xXySTNUIIMIk{&_{>JvzOJaH(^(iB>byM@q4ht!|~$UQXMMd3W5ln}b)DvE_glaliavP`u?gcQTMvYMag3wt$1zI-NA=^n_2an>5!BH#D}3qzknMyW7;%Tj%?4fxlv+xdlr+mXepO+0Q$$Hrdfl^A?r^W0M_j&)ttVM)89aI|^+9F}^?+4;clNeF@{Is|#it_YSY&8{jp*uu8XF3A@YL!=1_(apa+w?m=<DjgA~P?b%_;vuZFWH$na3Qd2;G(r5QY)_*)l=$vZe4=r!Ga&GWX^gEe->QCPpPS<F!EUed4*tE;s<2!VnaoM3u7?^%tw~z7Xg`{t2xh{=XuYGO2SO|t>qrYVder6SQaB*q_{WEGGF1X9~NM;$okgoZIiv~04`s$=d4ibzWycXEzM2~ixHFfF_I|d0#t-F0@KtJZ=WvM1hi>JJ5upYtesKQ>tbAiE{!^&>DJv@ctLY&er5psu<oUYM&njYGDBwG8$MeBVS^p)tsYcw2So}XG@vz;(?rdb_yP8kJepOJX=E2Y=jiDbo@AfFRBxreeg>3dVN#E$HPFjo_7e-v|28ih{vF<*Er+gUw{(@+}c-Ie=%(_R<p2H?^i>DN9ESTs<WR9T+OoH1F!tI1%(O(C`d>Ni%MImXyeOFa(g56YF-TWSY=<h|2Yu}7caL|aXj<Qjet++{FH0B71f5Wr{r+G|_x{Gp24g(qmPae5G1hMcZrx0@VC1W-Q_Cn{YHk}cRSh>H)%$8%2kOMXfpc+vHoZ~<=h2Swp~*ONpFoXAuWzP8@$CloMZ3w=y*Ota58{_cB79(pM(U5;jBWRPfi^YB|i_j8s3!iC<ygjJ*P)rDrFWN7|ySw6B~>*l}Pb50$Fz&>47p>}!%{fi1{vI0K1i{$d4-b&h`bO1_bI#s2PdK?4|qpM))a+jBsJ-RfhKJz)i)u&pUw{Oc3sI$%avpB=u2EVUPhAJWb1S8(-9*@lH)=6b4k<sC5?cT_BMH>5NZDL%ODn62_OJ$s<A7gM^^>~M!4n9y?OmtE+yWq8f(v;`my+v*}ss_K?-fOprt;fVu85UV*F<xWeEj=hsC6znwPK$WqX~pwaKlxxS`eG_V<?~BCUklpxTtxZ~5xr{nQWaiLRjV4FX$W_MnVK#(31`)9kF7VtFVoE1nBwfMK3YB2#!U5nyJ3g=Wv8Qp@Ysl*%eVxWw@I(r+dl#2I-02wT_4r_!XHmK&To0GGQ_(zj%S3@XI3Lid+?)w(`W;^-Dhoj-ww<5-|pElYyiU*_;4#4ed`4_8@=8T3qY*7GpD@W*~aB!U|Rj)#xD)iuXH>mK7EnR>OI(Q-bV<1xB1?_F>}+XDikmXM~wtEe~Rav^;-Vv#1^sj2KPB0&$9se+}53iseCp@*srXWmKQz2XQw;7qP%0ZZxW;O*|LHO1b*C|$%rboLFi;xk36^-spCYM1-svxqrDr)NpS4&>riuWSRK^uK|rQk_4wL$-C>D)@?BxK6XXvDyto&_EK0QF_Q^o*HjCXeY3-MjHhCY2)+#b1Q@9w=Cy{~S=Op4bkY?1alsdk#Juf8{4DQhG9B>`#R!gS-_M{JuBh`VikLOH*m=a3On)78isAr;g|ILD~RNX<vegkgjd;C&A-ypu`5m4QwMQ~QF`rr%I>qhOtT#{>dNfg8DbDXlD_f2!Dr``6}V7rT}Z+6Ia$dvWRtzE70resc7u7^ClNIv$rI670KQfUQHwCziF+C1P}YW6sFUysE($9|1}t{N?>vg*qh6@uK7wT>H;h+FjxNZX^^QbS}NW3&1`w;`CEicy7-rN&igWc6y=uiVdT@FZ;wEGmm*_i;^YRclm^e}uIA_}2K`m9%<xnD)$9*2v^KpxC|hh`&FNJHhM5d^UK@@sJ*m#YG<qXqc8!%Nu!z)~f|HAVkFa9l2GvJ1+QQ-|p&Z^!T#cf4k~R_wJP8N+lTqwhDMvmxXUO9iM%+J-EJhrAQDf15-TDx6)_Uva}W1j2k!Ceez~woi%r>p)zeEi<NjtT0KYw2o;&$7CBQPzuV^fRT`kE&~dBc<J{_X>)<0YX4rBHG}lMr-P@x$0(3fIA~2?o7OhXMRl7HvV0knGm^MtG9bYFKPlRpAOqKkMPBFSDJ;7|;E}b8rG0A8)mAJxcyfWDUBPF(at&9idb#Yz-0~35JN6R(TiG$$%{VARQm_Uq|2=RbFN`ZcQ&Fkd4J9cr*?)jNj8|zQOcpAy<JWKR>?rW8X*;|Q3Ltv`gN~bRh4bMSKO09V@6iLs3mVdpKxPIbt_oO`vzPQlAgVJP>zGsFC?qOd^HmCHVPRZi?RXc-o=~S+?-d-i@EWy&SK`vCmY_<25!yLe;w<2IVi)b<`wp5l{6=l4g*TzlYRgU@!g|6BpHGks))~vhKp>*J?%l<VT45$O0P~71g%ey0QPbpv@CZF@ddYla_Hn_gHU(nKAeZT#WyO0_b<d0S3vac<-kR;>~z*qQth{{-R3&=+0xH-))*kO^Dof&udoQ2N*NWGk6WmbG9@_Ckr-Eq!<s6y=d&1}EDjho0bcgk6bITA1TdtiNKfDoQoq90ZksM;TY>owMlDW*6y*jD*3zjXS>>Kbb{QD(HLZD{q<xD`<a(!Ev$z#hKD6cy2*s881e92vb|(e2eVg++3D22dbt37>5$_BKQsw<ABi0Pop4R&ZRZ-5yViLC!r69@p9%W6mK|m#fSE8qLpV-a!_HAy@SWKQdfwbn;kUXEeI@6_3suI>7sN7br>#9lDjI!v`=XXQV6~rp($e)qV{;JX}`b(O`ZFKgw29*@$^IkwaD*uDmxqRHt7l+0}d4NvX(!s2A6fz?$j;dgu2-6bWZBPG1lH7Pyq&hDz*pP=46#_tB!G?44nT_sVKu%x~J^chrC12HPZTwBo^LfnclpzJ7RBeH<-&%ZEA>X1jL!x%eUBhvsYvR!AcxtOwN0SFX^9r3w9BV&+ofJhA{kv3)%P>t3&|%&C)&5rirEzU$VC$>12SPOFc_R^!0RLgurn(keS{Z|lHCyG!%1zj-#+8&aydCCo*nfa+WWavL8eC1-UMkaPJ=Toz`S&-Tr-9#1rPgw;|1)DH%5Gk$p^N!zhz&AH6)u!TRj&UWl9<zUa1i;mD3!6AiqK?f2eEuNC)5jX8?J^3tlj}UyRT{hdwexq*s$KbLzd2m;_SDN(pv)Z_WE^f%YU;1raqm_L)OeU-P38-qjxla_8!FW8tdaOF4IAgI9>@O|Mz5D1vS#P@aT|%nd_bdCA&4=}4tABp4?Zzsragd9^Js#|`htxdRg;*_S2tA1##ZA3xu~sfB#%ORJOlsr+J@^vTyRVwrL+iE`>bmV7C@5@;LNOoCz6fT|ur{s$e1;EbNmAIm9?JE=s1(a~4H!gEWjvdYdtV=spNoW+iXCBAnqD$%n}Ujy{od@S?rTb|I6ab4<JZN95B##;xLK3YwbiMe=C$tiXb}Cb&+PWCnp$}2u8%cqLtu8}Lr^o&c4>k3_(CUu%sPDf%J;U3>*v`)?$_@48tjGL)(>gD>n;+RmxaZXSq!}g6ZBfQi1$6=Zl^)-%gBuHq?D4kV6d{kJOo9cDS?)oOc5SMt|eXlRf(f0d)C@!_vEuwe+`qLs}`Jhgrrk$H;{RKhbuz*%2v;uY7=@v=B0KX%Z*OsIhJ14Ih02l2Q=%$K|e_9mEsF3jb|yd??|KgjP&MFETay^?9JzB3NAL7Y11y`^j$Zub<5yj;Ec+}SL;oW-^FR0(;n$V!4dvAes$>jQ>0u#2P(O3H@g8_Wz3B>e7Wp42iQR*yzBj|h;&+&=0q?)8#libnQ(W#At>Fa(D7Z6Nnwi16T$^Un8%!G_IdSo5L;N8f?h9Yoc*S4JyW)D)_pf<rpJuX?mN^oE~{F1pO`WIhtYfDOg^Z;8o^+=*)dRa(2**fbQY|7r2!Sr&~px{RgE@_EEJp8^ch!#B)HWopu6g_b)AS{btpsFM1Zis#FM?eo>YDd*uB1H{2?G6F6n)`Vo!;8#}Z8#eLAb_#U0@bRFJQ+vqF{@3Cz{O6khtdREf?;18tjzFN)%-e;XDo1Kmr85z+Jeea<%e%XM_s*4WO0u5gxqaHyvcJh}n+jb(`UKm`-5WyrZYHJNU|A1w1>n$_u35pUT=6;qz{G(xR5v<iN$FZQR86+V#DQ*SWp&9r-b93Et9!W_v8FuY=xfRYyN-0MAyf&JU=(7!fr*vRpZDN(L5vsWFnPxw};tEa=*Y>)84z+c?SI~>$(L}<PGrP3YfESr;Sr+FP}Tr}*C_sa{+4$r$z`V7uzyZ`LWTjQT}DI3KYAUAuMt0(HUvl}dyMI*20P9@7?t9lgutM!4YcvBey*O@tl6stBY^jRJR$Q5pncC%ZB4>^c`i=(*F<A^eEzVt<JFzW@HXv>Ly49*pG8$R|LPat!DaKYrqW1<Yw_We30>mXhaq{m9%SBnUFqJAe`MDrPJ=*sMK0E0%O(hHcH+1Xc<`R(|AuubD=6K|xB-5byL=Nk`oN~0b7ESW)nqR@b4%xoHVkjip2nSkvpi6euh&~wPjJMR|bricM3Z6240v{r7k&1JOBdE-@-$h&L-?oJgYbUljo&LCR9>bBn{_G~s(hV**nkY&5&AtIgJE{CckZi4g~<HhCxmAL5~%(|7j{CpNWA2^L4tHEwCSwY)!uZUXJMu{GC)bvO7S8*rjceK3fAMb<BU|h}OL(0>~6Y7n&a_0+nB4@}957_QP&K9`-Oh~&qY+}W^VXvoij#a|?`Afb;;4$JW`}^to5%VfrNhY(l;?JL9N5oF-z8%lLQm-KyOl}PKx9Vr&(%u4&X<^c_-u3N##!QyAYcHzbr-zrjMXRf@xFpnSYk@_*VlBm4yTQN>YDX^o=S%E9yw+u?Sxs1_`?K9vxNP2%5945a-%)K14c3f&!{(pMYQ14YI4#ySHy=!Rqh+GNO3^~uWpe7JwZ}=lyV32+HtAE;c3?JpEs%RHK#<5+Eq$v*8;seJhPEt~+;k=5@<|>y%X8xpkwlpY^2*$B>DqBveLu-P(Ir;8pU&9~dM<B#F}_8_J5fJRQhC%6rF|VJ!_KgS7>(7#|CAQ|tP32eB!2RYhSjV~I-VbFDG<x`=V7#{Tj9(GU-x?)(FpfCwm%Jo(Q5ZrV7BjL?@LMWG3)kcO;b}n1z<2wsUC))CAZLeYS#1}FCM00xM`h~4xkQuwmVPXQY#mc^4G`9nZpOK9p=0O{;M>XhBcr(a6RE(;;9*ThR4_$!JEBu4Bv<NdD0oV8@=gG<FnamQqmc$2nRAsqqGUWLg!)BTH>l&(YELdbZK%nE<n|~>z(;?Ri=B*I-SpyxiG(ve!dNj48Hfs?!5FUO2dmIb(ZEUys^rRiD!~?Wy|y4RO(b|4So6d^?ZK06}fR;QT~JG9<erbva=PP;Rpnp_LumC)_YSUdqb6@L~`G&hv1v;ZtBRlS7dPBrh@VZtSjgi%Y|NbnKfn*Z0mz*W1+@Q>-pvS&-auZ3<%-4)AfZXh_UGTq<5{gu=W`Dw`Bd;KTfKi?R<r<=Xg-5g0dBj+$}A9{mD6W)_n90t$h<GtqS_K`YG76_qWjz3+#9o*@VKL2CaAHkhW``%JZW1%E$s?xbRlkPS*%d$Edya=yL}V=XGRR>AySQtJIH{L9hRTrs`2#PFQWYk)Kfpon6%qn*(sxm$+Wr<$CG+C=uUaOYx&Ug+Jhjw71`%wS{etQI6<RGgHaS;<X)hiz$6yZPO}AH%s8>lfN^+6Bc}9F){XvHykT7`KAqLWrS-F+X6IXe|kGvKZ#LKUSGcBU?^|}rY`A#`943V_HR{jD&KFr-FvNOOMMY_Z7$dQ{T4U=LOgx|N}zZmEVI;JW1mjfj1QN`cs*mEpsbH*w*OjGvo%SOM^`Z$4;B>8?B;^<gIl@$=rjcFvpi2ul~Y8$HhB3FQ1|hq8$#{Mx1*Rpl;QI8r1oCtV63jjKr=(QdtBn{2MmTb$+-FwTfE^u?pKCd_3IE$JgrN^wfD^&$xNjTk&nSNRFeSt0GoZ4biB@tH~aTv2#3>if4HaUD{y6zWmoW*hi`jy*-Ibp(2MED8RPFmRo|2sGjRRbw`^wn{XxsPgOH@Ml)pEWQtul_Z;7rr_<<*W+=%qc%J8}|F1*j@Ij$P7seZ@nq&oU&Z=Q)e8G!H0%Gf-0)!3>-qYn2yhQrA+Z&mZW+61g84*Z6<ye`XV^tfTi^UOsrpfGpLWUq3zk~ACp?q+w0d%V6u9?6;K(#5|1hUyUvt%udak7L@cO(tBt#pt;a-y=F<N&#sfEu1+WfZO8UylDW@Jk-P%pavy!Oq>ePf>zDVaM6WCB<#H~Mxfxu&N(#Y;o15AIFoYPB-8OmwpW4hn-npx?ON$UpJ@<;olT?#d+5`X=G53d`{M{&l2wad4h}XQ05{d^Xw%?Qx)u1y7(bT53ej};r2x>usczTDUcNU?rMRxgQ*Qp~*VID+JMmk;9e|4tHe1E0U)`zd-f0|1Vk!FBUeN9by+{JR5RTt8=$WsnalKNwurPl51D}887>PJiVb1|poEBQobpvI6{E6^bQbFUQ14(%AxvxHc<AD2|s_5Gwe#F4t7((uGA{ENHqxdx^hws>F)w3qZnMHM{zB;p{Jg1{@A#1%}!=^*}ww!14wG2nh+<SOz)l~fI97ESL?va7JfPIZB?YYyh`lEf4=rpU<)W{7d!D3_Oh;|M-lXc6h-tSg{G~VMqJ6&8lZeLP?@l(WVI4V67|2(lzrQ5kQWXrcz_bm-+FrHPZWa^))%!2a8!@G<NRX(oXI72y=?E+!9Wu!E0c&H9E3=B*ag5%QuuAVfXi}I{_gmWZ)FnjUhgs9rM8v~`0uv$m2z{T3R4Q0@CjMsgaBKz8IG~}~nyh&7urIdHj!EPsT*>)EP);k`;ol$z^@)CHGp7;%Po#4cy<*3fh&gsOhcCJmh6L0f1nr=&#Oq^E}f!Vy~;HL?JSoM3W^{b!D8nI3gJ~N*^eVJ47VoJ~bI4(rV-+R~g&g-Z`xAlGs4d?gd+~I*k=YZ#Nx9Z4I&)=E!Lsy?$^J+I=w0aUjB0f{2MpXUy6MZi+-9vxSNL>wrniOQ*2@L#%$x9RxZ1VkoX*-Xm1(`Js{}v0d3}qDpqLiYDU;rgZ)CECBB?<-*({G>mJ7;s2GgC8bR&+o8+}8!w-7TZ#_MoJ+F|g8P1-q?g-h7W``Po)qj(90cWO&`Ls5@;8K7IM2e^!>)czP```IMjY-LiX?eFvW`?hB`s+*8q~wq&b`%z)oi2)wgY9ZPf2pADh4wPfz?mzMSi9@=76bV(1mq9wi_&mde$l`e&4ONSn_q<7xQ5j>@-eN{#$H~10ON5RsRjCA!4!OO1Wv{&!U3DI76d<hQsY|=KJYME4?<{v8CV5WXrrv@<?nPUl?hvwqKV`JZ%UtDgPoi^uGoacPTYV9e1lx$Wg{vJb&->TZTqt&`uWZG>;LE-Q>GwRFJ;ILUOi7J{bIwlj$DsENf`&n}7DOxk80ugPT57bv~L$lp-^}v{Av8zobp({@kp;9x<tWS?2X<`6;xhWpyg47z%4K}jQ#HSiHmvi&BMG`*wmP@ohnKT#4cfxNIEjYxz4nWWNHB_&&$s*#G$hPqojXZ26P}LLY;YyvskK`~JtGBHf-oZna2=)VJdV%2@u>&${@eQBiXW~s&t)JDmJL29}rrTtlh$knn>VY^N5tZn%eEn4bctIO*APoWUPqBP{zai_h+0{p0*II8fz7f&R(mNIWIG@}*-M=P+t!I0XSPrPX*&VdON9*-jw+gu7S`BFgb$4Sw9iXFon|Q&4_WpemH~8O+td{67wgHP%gfAcMb3l%v-9^?ON!wd{8^_6JBW(N7&h?i5UKp*-O?W1^>Tb+WC8@pWuzJt32T8B`oWQfBMIZ9S>LKgla+dba(e2B2<k?Atsbk}Y%c+bfw;gE!`^riP%cs)<{@G7?Ox}3WGh0(MHl*sKjXZ~LV;+KcO?e)na#8xzZI8Si5`${Moorl#<<bf_`{nWWgGMj+dT2bO<!f^Cgxcw|UV%r8mV3{srPKYLbglkrq&cC0uafkc&28aS$*{WsI~FY7KzynHm}nWfA~izEHR+v>3T^=c|5>}(qqab)oy%O|-j4(uRzZ)HyAy-l<P;s=$vixDf+=@@^P3NqT(D|8cix@F6nIc8?_o~3HVt%-y{UEa9r2E>ovFIaS!$cl{CT5rFX`JBH`O01%;NxXZB<Q?-U+I-DVhqOxx2FBXW#Du<JU9VYp_IZ!hLC4rzZ9`da<acvK_2n^A6!O>dp3~G4HdqBLeo%Z_JU@c9%@B{T+_O`^kAvKFiUg9I#<kWxb~6-B&o^1Nq60Z^$eoTi;7@u09r8X;Bw7ekIe_ZdKI>*Y@rvK4MgzWkY5#{V_-2n&gRxUemz@?bj}5XL&(0Hn23o6X)hHH#WjF@=kizftI`V#SZtAY5ze}^YsBZ=D6UlWZD?2*oN_x=ezDi1Cr%b{nzg+0T6{(_Rqa~Yop*C{%6T*x^V_Fa}8@dvOBZq&zb%rvh4Mh$F`p^@2!P5xU@Hf1?V_kHcuU|F*Kw>Q90{QTOs6-;-lDZW8W!UqUngpjk<mg(?LY9n9Yb^H=!BYYmaAZ10I6jxlYsdcWOGa*_Uk<>OSh5q~&I7{Klp{KZ9<B25+~iiy@U~ul_gxlyK-8+K)lGaR)fnAr2FsLsNvyI{E-}{6WNOxf!bWN;h8{6>aobu!Z#Gg$B6}7iJY4S>Myz^95F`a|pUo_7nK=YTdfc-&Sd?u5aBLtN1p?tIJdPs%!>Bdatj|fdRH>&8Kr2wt(s-F66a#6sL%H?zDheuMxBsQ}FV(&h%_BVKrbr2hw3pnO75Lxds=UhrWAmtVcWD4w}&ZK9ob%hPaBh_D9KLQF0-<uRkkxtve40ZG7L(Jazz>m=_EtfK-;@pL<IswLZ;j^3ZEHisH=2t?kn1!8eARg8?~u|Lo~-Wss0vg!rbJ8>}M6O%Tw+EjfQ3{jP(IVT+!r`_*Y%;Qi+VDD^7dR)z)Bn*+gsYS79<$XpXk8i&)Uz~0J$k_d=1a7U_avgi)WkhZ?#M{z>WwVCOhe>!zAjs33D8M(}$!n`kN4FVMPGk(^W*#aZW)J!FDMfK}0QaNAL&$LxkyeGcBzq+3f<FDo~_UmF@eY3NoLmU_TMrYF4_}Zeg>AVW)+RJ+g^AN^*Kc&`*EWDR*vUN7AXCu;V!^vM8Frmj!&jD3gSqSMc0ujX$E*`ScX1r-$n+9JR#&JIUvuRKAKg(B`Kv2AtkozNFYxcGS%wOOqut$Te70)B($={7>k*3&w^V~GFWI3L&*VRKxQa(6*jMe%__5QHo)4yB={Iak&V>$^ez&dWh$|Dd2lFyv;cW6t0S_IU+tqGG9<KqkKsO+Vc`d8?PDfswmx{iBjSW&<2@OawX(Pw8e@@ab-4((dFCy{yAu2v4qvBX@;FTR<tHPh=Feqetq{80OB0|6PMe=QoHg{3oj<qfG-YoTMKxL2Z2`QV#jIHawGJk-uU_Um_h)2cqLKR@?^GJZU8qs4(#tk$%DV?u4@K$B(M(ck2Rw}x0gyeZXnZv^Jt>Q?R0xxQ^Sg*J(-x`r@Nyo0BS@Gd5AbX46Q#M5(}5kTTU>uuYm)#8NgO;Vjq-S6xPZj)}7nEX-Et4fau)QjHQ4n(r>DJMPOp^S2pXc|bjjQZBYZu#zuEB&XmXzdD?h&3RA6}Zhh^|p4$2B$*w-VCy2^G1zBp~XrzQ%q<RDn34E;(iYeC^H<G%DMxJJ135iX9!%_Z;Zn0pLS@5ywQD6oM>5|{l*0fS{>|XKU+@etd&+rDjlOo_pkGZy>NHowPzW?QTFxysXiXOd8DSF=(j(pq24&MS{q*qTy+$l=9l%^p(o+~g=}s)$gm%J`!1^&W_pX+L&@x`+3t%sy>`bAfgI^<p!e|z9?r-_e#?!+>x*?fK2~NX9lx9#P39XuV-DG`{idpoD>bQgqve=;uaBhQcRy_5P3?0tv;E^5MAPZ`dYI=aGX0`MSue-V16a`vF}e=!>7hUR1O7_$@hKsi-9^))bP0^G@R&C)ZwXuN+-+t0b*!`r*}c7LixlEvfkIR5a`Cax37KqdrWbqhH#u}$2luscl)&{GC$gy{<Nwy-NdI{Z-@mqAUKq2AT%%9N+%2nqIFPP&XTVaCUK8Ej1)r=W>?#Mz18g_~2Rlk<Bf0+Ovz-m(vh{GRB=1)bxWJ6$aH+h_QAg|h*6ulYo%-h1Jl42fQRVk^rj8oh@$$&u@H=5MZa|<ts4Kd>8@`*!lun<B*Vv1~>}Nit!xlB2+4^)^i;Dv@)){#5w`?+B#81QN_uM<EN99>bg6-}1^m)qPZl(0P-o1?J=~F00*ythN<>oKakO|KGdb)(P4cBli6u8ohXQX?1v-;P$^R7LbzR9w1OM4=J1pvGC`2+NHq*f_Jy|Ibu;x-B&20koAXmVOK!zt!5kE2$cF?nt#^dM3<1UqD^Wxao)w4zBdtw&tJtPuQ7M~61gD^(Ow$@?RE?eWuZ5AP;(_H<xgxKeTxlThgyXb(OJaU+gR>1lWB3sIN;<e=MUI%&6@Po$QIBkN7CQ;e<aYXL9L78X6Uw|J^NzAb3k(^us2GQ9Qn>1C$%Y@j<G!k~x?+zxmWZ<^)Vsq<vf{th2^v2ES?4PO&zV9a+%d{j%DSQ$J!w^W#ohdBD|DFZ@ak(aIp#^4OLNd9GnzmC2}a_u9TL~^Vd%{*aoWJ!TkJH5VM-Paebta0!MUm4I}EH6c43uXKK%xePnoc)m|TrVEghip!MRresOL(gBZ`N~!v%Cd96xc3gYJGAy@`#uDoGe!y5AG@I$kIEmheueS)!X^Vjt#Po$Kcl+P-|viTFZ-jhn}Nq6Q+5FEqFUm4{|D=<J-V`lW;Wq@XR-$`7l+Spz3k3bHDU^+laZr44_^mbz4HLD#AhvMIT`sp>E&?2x4a@B-~AS}OIu7lzAp!2>nHD~wN5AWmV-3<Za3d8e9vLceJB$n8(ZEY4?}+SHzuc_H>_Jutxl9@3Zjf@rL3ML>pk%J-@)~sTvwy?%fQ;6CM!1T-qxx(Y?{{CWs6+~eC_(OJbs8@b~3Iy8hLkb(|XP*D|%a3X1SvP4ZQ(7+MH`6DOYOu1e`8Azmk+3FTZ(vvTah=7rw1J!sV5A6~Ar@8|qS-lQkE{f{GL%7GFtdI178;G8<AT-*8VIi{$pnYOO(}F^;qTNWG~OJoNbSvN;QC!EHT=4DW+hw@aB*?Q8jI%(cJtI1zD2P3eX`5SOn<dsD{OO!!mXU}h|2w9;!yH9MTkC5|^gt9xvlS3$vWFQXUJutr1uCAJ$rrtfg2Kcnj)@}DZB?+~elZg0n;HSczjy~>@pzyHl~%>Qm`KfA(8^PpqsW`XpbNj3KJ@Y@xe**RW?pYk58vS-QG;Gz1xT(*C*%Aizri+Hu$3h&`fdA4(0<w3k(^ts&Ypk3`1hfdU-?&oMLu>@=&j>x|z^~kBk15CML2|Ud%96<HQleEe;<Rp{oeUV8Va&vQfI}-(*rPZ5>kD<uNhI@}4$Bx8lhm*B}8Tw+;{o~WxjApYsTxZBDhG5Go^w~f7@mgfCVsm;x?u*52`aMB`VcWr0hY7IRzLy|w9O*w`DX^J%Q&D;{GMo5VguaW5_}8_s?}YitYpb;yHqsZ5<A>eaX1h%z&+MPtgQ8t|G0v45j)b;QKDz-j&XIq1hrYErLu!kSSGX9wxp9qM;Q1@)5H~+^#Vy$?%>E_`WQlyS$R8#WY}fBwxLTI*hQ0mR{j2}s<;K3(%5(FwB|Oy?mPTua*ed*-iTL069lfR?+>eW=Q7vN8K%@opXzb7H7Ta8G`{o48^s95-N600${ME7#-r8`+)b8VG(C|XBF;Xubp_55SywqL4-4Gt56gev>cla|TrPf(8O};j2XiRUT&~gQck=obo%!<3in27)`51UsgPpfyNI4k#x{mgKcBo*!byS;l)Z*6!8_AwkSoZy&4CJ|{%uXf?kp>-+zV!QW8%OLTtU9D{5v(($3sXEp+`WqBrO#O&J@w~hC(BKX4O1M}QRI@oPucMBlOSP%3V{qg7^9EtXV!~_dB)jTB&&61o++k$;czjHf8ACW+-G9&iDXt9XHB?`{W9=0;sq)h$Zo(`=!L?sDx#gm}yG)n;obUYBT~yOrt=nP1dEEqR8WSn*2AjLvF-6gT-OEu{OQtZI1mp5pB5Q2dn+1mf8T3B(#9tMU?$KzTZOFV%^nU#n13fbz=&?v-SKt<~^HaP7!~OL!1r<+--?(w|u|v3A*u<w2N!+pEmGBC1`dRtSVtV(hYg758fe{7fx<Ur%3Y{7WA|Dn1-kC>7uILl&7ZMlN1zdg1^*QQYYnNs=C6-%GCZSd9)suJMWop@J?{!m6XP(FY)lK(<Qadb!dVG_s?LHSa+n3->gPZ2)A)ma<6$d)~L-k0!Zg3(qrZF9Ea&3QpLW5WBz`8^5r8at6%jK$*r|;$!ONx({-l)FJ2$v~*p5pIF_yop{*d735hs{k}(G-3@8cl;&3{jk@Fe4;10!Tu~OL;KcI<vdD`Hr9Ml>CXp??((R==-;NO&(HRGPrcrNpB+3tqYqoL#&!%>i|b}WCYM8&OPl*3Osbw(1~rk<8a67?E8fELwveCHKyqdkQv_IPY1=i9vq(oM7)o~>Ol;-7nDwuSkWBj=DoD_{Iu9tuzQrvy++nX?)PMS7<QoO59aB0>`%J5<KA|tw2~)Cy*A97-q79az1!&9KV|gtGGL5GW7vzPU<m-?fw<J9b_-u{!_{u8WbS|)nPtbxOi9f-$?DV)p@!k>Qb|LF@eS!o+|6kTluo|33DT%2Rd-u1nxKfy8}IBiKJTy3%&tE5yGud-``rM>Ct}y<2C^L0=H)SKTk*NwT$bz*{LO#|qP)OzcOM~#v&W{dyr;|?17i}FqgQuS(-+i~&7zO`C5zT@QJQ>oGJ@xw<-T_Q2;*J1V1d``In<l)XZgeW7%F~iK8d|o_JI*<ZRyXzoS!$p=P$<Gk2yU%q0bG&W*{w$#V<5O4`RDE>|x1h$g8zW{l2rwBHA4X`s^9r`fa79zzryJ5|ZiHcM!(awwHQKdid3wRw9VixohW&dvBYN6=(GJ@IiNuu^noc>TW&`Jf|%mTiaqJHeV`NWJ8=K-2l%Qi*=SRwbPVy7BkTxD|?hFtIm8oe>s;O|JCT%-#oFQe~IUJ2g-|)arVJ)PES$CpzI>%?)DWO4^_(C3{F<>IJya6vi5xX2cbD1qQ6sTo}DC&(4+LWX2&+49i58jKCE-+%6*B9{(rdD;NOQ-?K}UL4daLm_Vgyp@p_MM?>^-wi;us(y`Ry@?GUZv4YSA)<&OXlyVzI<HreLK&N!eRF5V3k;;jcqYChbg6hqkavNj?J`AJZ_-BV@B$M!LQ0JlXC<c!ydU2H{*dnRDkBkf_jrXt_p)iOz$LJj@o9=rJU!$95}MG|VhN;PAZ0TWYszV=#uMAVl?lU1~{Rd8Fm+r6Q~2-)b|g|NP5ZyFyIk6ZPD`m*}H!y6Y)rp(P6-iNCqpKOXT2#?h6fiPt*Wc6LBhp_j8zQC5|<?Zwn5zKzK7+iMgvhJsJy*5B{sO8ILue;zG=CGR4f219ScEBvymG*3-?sCt2sf`w-0SW0D*sfPV8tvgXes0I*FX{I;(v%~|*L`Pp%nyDC{KVrWA7=gY+Nn31=mhR_8Pu|+g`ptN;B<NL*75W^Q=>lx+Q39|c*K5Q4wikY0I$$`|E5}(x7d3LeZZQJPF@^t$a~U#uZTC+9o|2~^isXWwn1$S@08jbeo-wq*n+<G#iR)&%XB9VG0&c*XPoL3UjE)Yvx{VOGj`E(gl?GxIP<-t+AGUGPxbY2*;YeS{7tp;T3G<GV8nRgu^eb_vfB8KKL@5T@~E#%c8CHdlfTTbV?YM}qMX}!>3G?@e|3*n_t_i3klap^ZnM8{&!kY6Yp~rMXxVUVKS|)bpA0P$s4ThosEyE9c^GGZ0Gq89hUiUp3O@G9>E(2;cb$V-9%s#Q*BT$HVheyP{ib{={kwq;T94OWPdi4XR+o6UaT3Dzn!X<a@)c<H;s=|7f@Zl6BkuMgXl-H99Z>vUo5;+<K%u;T$eN?Q#IYr;kqkh`lnV#-9Lw0oF*q8?X1Ev*WTGxfcnb)3))(&9yWwIlviyX+(o=dJtz~$S{`%>lP>GzH;uUt=cG*$o&2`R)-5@!dey&^?U*EiKZa&zDm)&O~&&Hiz9HYgCpPNkQUK=aoAPIUBsdBe=z8j?KV(*<+S?gBpH}7EPFOK}o#`Wd=oT1(Ha~#tK@6FT~b8?GZNDXT{0nV>PT6Z?isV@aB1MNP+VZX|3!OMMgo$-6BVeYC`T1Tn*<p1)LlYcdqWDt$y&D-pn#H;-@*fDa`W8!Ir`?dIZ)j)kwU4QXi4vg%nFr?k2*(|nn-*NY-&-(&8U!joNaC&}~qXKYA#;$RwDdbwM=kJR&CB8+rUd|^q_CD68%ut`tC}v~sk^TT?Vqq4aPg`xBpYO%_q+K7MW#P6wlCaZzF!}@L>YHdqlgm<nfY(+RXuzwdmPqaOim2f7sPs1D482@FgphlHSF7r7Zze#dVqdJi;5PZsPBMr4_z~R1Pt1{3iR`tk&M+wJHwaryZ8Ut*@oaA7-&XH7UH`QjSQn3r_10Bp@L#E}ocq!;2Mby1n+gB-%5She2B5!sSmEvtij~8zFe?!ILj85qMQb4bYy;cUY!){Ix`_A!9Eg5PN0#fO>OWF<f5|gYxjMd1oV+njXN<Pqm*sqi$LssFHbPv%%ckTi7rVotb6Rv`aXgETw`y1ex>uijoPn<C(?=z0BKmowkjVPrBsVa#h^L?w6}G&x*KS`M`Lq3@EqvfEV@zw6qWYyUUs{}FMESYaV^;O3`$CZl)TYkKnSWjc`~c{!t+TCAdCr8DUH$Z#JS_nJLz`!qE};l&|I(kN{es0XXnIO`Y3~whs?Q-cI4-+~ckO0#hh(@p!4nmh4rL0qyf!!Hu<CeU#@XXLth|@|d+ODJmITXdX**hS!;E+Wbo1Q&s<&Y^-8M<dI#gaBSDjIT7a=ul{ZRT}NO=04^I!_ME+P9J;W|@4cb*^Q0zYlxA#GY!6+c;4%Np?q2=)IM?D)rk{2Yl({97BI2aa14exG&M$8YE{tWI}VtG=E*T0id7+=?l*9*_L4nZEz*wy*!dY?H3(&QTrAuv|9TmT~<oE`Ls_iLdpXk=n0js~CXRmu~Fe<ZQHB9F~;SaET+A1xGgB2c0j^CECpxlj896=Uz`U#iLgGLX@=L3OLU-dH1AFn_11MmA47`w3eP-?8pIC`jnGl2exM8+IW058}|u5TDOUr)JukRohgxqzpFO4GYQ6HIeALaOe4WW8wr!t2n5Xz0#cdwTNqKwlz<6esP_ESr>e9t&+r3NYEyYi_Xs7D_l-}ZNi;|UhE<*@EpAo4t(9AgHk{hJ`G(&^FXOg<jUQXaOaj(ITBD3|g6O#_uWL?Exo7DysqnnrZjOHb?Qn2^O+GEfJCVBqyTGW5WL^E|ZVy&&UmoJO?Gwr(ap&Srzeejzi-Cr5U*r(8WtOfr#oHb_pYO5x1T;WUXIb^H6U{baYlf=j?9+#$iPLz~SI`C0vbya~<@9+4CK2p0*U_V;Zc}dmF$VM2>M~}#9#AphW9HcX%`&~RICQhnF~%}FQvIgjuhrZ=fZx-fh7sX=%nhF`=AEjIVzFkWH<#$80D=1z2l&X+%>%c1w}QE-C9q`0dz=p(GYOW*C9(njcuk&18ML{qwgWh~+wY=rxL>T>i)jdTlZh;?BO9mp`g@v<xrWyMAs1SaaR-YoJ59%S*{(i3b`&xLt7FjL0H|~-n??^Rtxy|%H}dNFJ#F6j>kqxK4Xpli2GY9|Vp*rnk-*IPL2#rqy>NC+FH<YCMF2U8t-i&w$?ZNkKg6%Hm#oGF7Athqk(CG;^vf@pLKJY`9Q6^HW@(~#pGRdNHVOC%ReO(koc5J^C!6<B{O&9F2_qh64+0n3RY=kD%9e$m>z$DK@FY?te>Xjz!^>X+eu=oy&P&iKGu={K^{?iDq)`9p%i7S=U34}j)?|{o?)#>I+c9%yG@Vwo%MMyyI+SeAuXDfb(9Vn5{&L{YKR{&J0a|~)<JJMvRX|0qge<=p0a9(&mze7+57%<-m35&7>&3NKZF8%fhVPX+g@NUn^2Fc1pedlm9TTaOeu;`(eKktx-N{%~H@2&D(QS^%Qa{47S+Bj?dbi4J>*h#(_b3Q_MvmsJ&en52;n}*?fok@~(?)mLupcq0D<Id#AH$cRLQH`i+HbWmOSDY^cXzV`5q4h-=9@*c$ma+sl<96?2WAwur6xV|y;=wn@@r5_<=h3wdw6NBP=d<_349%aqc4Xdo_bRqaI5Z@^W_^Th~e4CY@-vCiXiWApu9H2%Lu2xyW8w^K!Af+nO4owT$&nX=l|~ZvVVUPbZafPBJ}ZJXD}U(f+EGC9CU!L*68PCOh6l=vcQ=xG%}H;xJG?6<Q#Tkb;3F^9bD2PlDIz<|Fnnw^W|^l3Ujox7}XN5@;L3<<78I7e((KOTr}XGSP#E^z5-Dfd_?tbcI5uDdk&mO+VL!|pPR&=UGgQ@%LZoeC?frI@j@<>=Kf@Pa7d4&;t&2>N1ngK^;e?a%@^E!Vr27B5S&V4X7O7r+`;KpA8hXzRZed}=+D5tF&=JQ);nhNb?*K}e*GYhv67_WmT;vwo>1yvY1W)w$L+K^v1?tVl7|nKDtE%es=On`HXCZM(B=>ChlH1^omJP|pMkW-ANdtGthx;CIB3~oj@>n+9P^iSBCch}esZ6LgcS~pfS-3}gk^WoW=ywG?e!nG!^F^8^JlNNVlktT_rfp1>Co5Q8F#OpwsrK7y~+7%e)(Ibis;N5q?onk?>~P+(KP&X6cfj{E#?3pdf#@)$B!iggQ(b&TTiXh>i*c(jL3G6xw1O=RZp!Bwlpvw$D`(qKlPjt>7Jr-xjrv%h5Gx}X5idvJ^;wO+Lk&RjKr<c8SM{)Z<&7C(cEla;Y#~V!3YGp^gTI8v5zp?+yzhVa;c1T!p{2OtfE%gGdWmT&Ccq=g5{iBFWr0Gy9}G^u9pjWJjd}x%{&jP26hKum$3Eb$<OoH&g7utNH)a#?`=(E#^TDNJ(t*6T<G$5^saK@pMb0R?7Ba!T9ubv){2=Sf)m|&T?CnU89Ux=Pgd>Essp;gDZQTF>fvg_=Wjg1Ia?F4?j#BfHGsP-LG+OQhZuC_^%Us?jl&U1#!^@BDML~Y=W3V@r0zk0_uJ6PI^`G%-k+&AXKi^kx{hSh<K=ZA-Eih}oPC=n(ZuhK0a<T<^<?Au2z{F8X;nPHIU8vf2tko=x%y+^j6eASC}pj8N<Kl;=Yj(WO`PzpC=5`H7NM<kZf-*=y_p%0L-$)jD*K#QW}p0e9kOTz5ihIh<Fi5@1O7hMG5xpDbb@KJ!&byCxz<_Etc{?Ez(IiI*!ga`H$ey7cqM^W-YiBJ{5{=F%atvBcB++88is;!KG<~+^AugH2$uuTJv4@TpxqCK1#5_We80B;2KrNHFl^s7y~~FN52tmET!&q|J-yuj<uQsdI=Qjj`nY4Y=G8nc5tgc?$~6*hqVjqFykKmNZKYmS&wqZqiCi{kJWczJ_N(=1Zp;{?5P4m6{a5YKWdK_+z(epHjtJ{7cCfeaoA2UymbMFcV;{8smpdMZ+<t$X4`_3opnY7d+zRfV@;VisDfx7i<xPJ21x<w-|5aV6B-r<`Mq2kx3QM1yiL|LgtO~WFBQxdjH)-G30JZ&Fu+$)c>af@!i$tTxqkiy&tn&yw^U;oTMZ>CByb+QjrZSkQpXrqnAI;*FsM($#4<=`TM<eX*#2pQf>%!?wrO4`YT{cI5L_Qp-RhilLw)dlY^5=-I!ukDEK)T;Mat*uQIc{~UDYyNjzTDHGtDm?Bmu-jHw-{EC8aI}-{&c8v^^QMffhD44%K%%Pn9g*wJerp6j^vTI1y@t=hTU(ap0`D&-%={!!8PM{BuBks`ZG34SJuLJ!Hi4GaCMtnU77KAlbq{w2;S5kbGSOgwWeh};ub|_Y&o;Iu~o%<>U?1S#=npz1rOojuUDy^nx6^VrXZbIK>KtXRg2u2G}0NZJ|c5M=VKO{X=}^89c*+WGzjH6N%g+H0q6axGR689-2QZ~R6e3t^`qNuJX-h!#mw|}nqJ))o&T~`XPk03HXD8|ENdJ-)_|{69C7lOg@wVfR9ui|=`PJ~mpetHX~6Q?>2#A5drhsH%NS&T*G`3Ku>P%45c67{4ga7YlHuU8@>j_`cje66G@-a#TdSx!{54lRe>15+<g1Z6xp(S~=XnAp``>9SR%glmJ?2neLE>GC@pwKs#1V=de~IWGmy@!-j1IFc{rDqK{F1iD)w<X#E@d{jZ`-Z@m|OSDxNJ<>VvTC|>cSmrg>p}3q_Sye&Wh_M`0G921sZ3Kn5H}^o=bl95CSGj+8hdou6=v8o}C<CtVewJhNeGv(w{(8;BINN*|d#LoJHR_i0-&Sx*vE$0LNEtQe~pW%IpERu=l`fGlN@f_M5aZnIH`e3<3#PpYh>20NDhtrRg6_eWwL`3?$MWlw}jzrFz9Bo-DYn1P8I~zNDzwNsm~$+WWuOm7g<0S<+bq(Y-67?DgdeZf2)nxzc>MjqDGHi-wyrhEVCPQ@H_OX`R8FN|nm*KDJXfk*rty%?C<}@~A)}dF#Gcro?ZO1{qwEB5$&|PVVB^WOu5v8m;kL{7u!%d{j&WiFN;K%bMM5-ID8-yCUig_Ac^!jZQBT60qAVgR>j>4v-42^=k3(h<{*!SHBvEebh>GjYG|K5<k|{%Z6-wRIy=?5Q0|%LU;IE-u5m766|-c0}Bzmzg~tLI=zIK!@fby!e_Qq7A`&byvlhrPqvnCYtwCh-?Pi=t=sCTV6(1B@v>7%VeY9KO+c75g;izM>%^uV*2Kpd?||dvHSypX-aP(UM+-`F?(Y%S)THCE1n2co*!-pJ7CzZOZpl!MTH0Ts>)muVqbDi;62$N6kAfSkV}T<qQ}JzcQc%;Db!8kI2jY6oZ^if|yVN_U!O%I??}Tr#D875#tK|Gu8A!jf^SiKds`6k_;fG~su^!&y&lM*LbOLh}en_)ww_cNAJ(M8V`N}4jD&5}P*06Q^{5gLgv&79-Tu@OO)wsQ;QCA$to9{yTV|Mo3rWEljWHlu$5|@M|L0w!gmmjnao&3-mv&W~oW9G<l-C1JeL(%Quk-WYTTG`$%7ij+ozZQ9Q(u)%|^ch`wJ`%cbT)M`tbw!uwFX#`a{GighDB%FRIHyhAl5Oga{ge?VyvWpH$%e!Kapm$4=H$MgBKqaijl-)*AYU~><9xTPPto5!n!(dz3^IQ!RhgJydtD{IL_YfbUMA{4;C&o_E{WHIj7RTtLnZNp<=rmehclwlVCb|WQ_pFSJ({oVmH$@7Ey=tb8~|6Sk9;cW^`*3ai=D8d$8kQ1%%@Bc=@j<n^@bxAr~076?Tz}o_FVO^DLR{_?eRLUPfjYnif9ZDGmozc47DK_Hg<1dBJ&r@u<_W}k%Dld?(E7!0Wf>}y(`<g5<e2YX(A|Ly_95DveSRJPK#dC@?Xo-YymnNR9gtwzSlprT9Vse$ghsOZ3RLLcB|jdBE!>p<9ytUZvq=F;~(9}J$P8Vr&<^9RWNxWtOWN^Bj|-YOXTQYae_m!+2Oe^VACq8K<Vz~czmNbXnZ&_v1Pb>I`x3DB(LuhLM<v0IBEG$=F#J8e$-q&jtlcW?aUr=WnZa0r!d?a^g=Z|SK5#3&1oF$ehq!0H>zP(2xPwc-KpEMN#%8#EQGsSKR=A`dJe(^uytb;d1ED2W*kn6m#f<6VzHX&Rh%q=+A<3kFJGNn=kLKwv^C&*0RB#b*y74&jh-j;MD0zu=TD$TJUJ5im6}wnI=*2j?TKpa`7qv$y3Xp9AG;Axwb<)&Brn(iDt`A4mYe%yb0~;yk?vLY<Qvy!=Wf`$RDV=vyvNP+QDr)Cod9Y-EUsU%OoTX!Xk8hO{mrqX+B0=D&>n*!^5`erXxiNMnt5M8RU7u39C%530q&X>&&<C3ia_`tyqZgMjJ8U0x$i5bXl|OVeGBb6OYY6)G)JDrW0eHq5FWmX_1FX=Qje-~|Je8RtcGIO$$mGx^oQ{oAD`8Eb)W2NVS|5kzA?KQ`+CRg&CM?Sz=aT9PM!K}qG{db<v>lls&=hC8x3+_>wN9Mm)U|9viMQ?re(c@a&-c1AdnA{S5{g*?{MiC+b4KG;qi1=)4B>t#`*fzvwWU^yx`+lf`G0_8W4)Y-@0Bk4m)<Mjg5GtlC&?LANXW=2ghVY432DGi5ut%eVt{xW-qk%>8h(c_H4qS*Gk?4uv$YqxO-LfP8ykRaEU7OJNokJN4{gO_}ht^gWvM}iCm|%TL!s1?Tz4TF)c6FRX@~VJ-uE@S<)-(dlgs{AAP360ISV=2TJ(Zf4;E!))vL$*%_X;r>(6SWc81ahz{YHQ~L~*Cn5S3!pfJ~r8`)G*s?O7@@Nx1$M$h8hRr$O`Sm2jY(6e0ZE9L3>Skg^*!@~iaJ%uTPxppD7UfWRg%EEUiTnI|AcaQIEmw{|Sz&Ve7;TTZ=l0u_q}^W~n!G#-Tgiw4tF#A4fN%5qN)cy^e!8c{_NSXp--lB>csZl~`zO9@`_pWrvDf}BsFOE=no;lFa66o0GhgaXvqk+eq^NlZ|I24?=XsyOpt5rz!r8nk#6yFc>LQxkaO=XCs+fCWe0knO+GuUP8A<mY3)(BgB^Wr>E^FP=)D>()K06BvY|U<H|A3j*QzKfG+loFv9xjJUQ;T11e|wv9%(mjXSfe7%`8WZ9w8CzEb~kuekz+)YeTGK8PfIjQ-mf+l`6>Kjp}4hC>FvHk_fIYEFkJl6J@U@#R^vgRAXa&-Gi4Wrdi4%xA~{Fs0lGIX`}$<KGO8WwJ)137kLuJ;wK{C;M*}#oJ+XfCrIvs`-X-3yo8$ZN2GuY851L%70VPUF2c`zu`S(}8YpX0fCu4g2GvGZq{$O;ks}F4PBy1>splI((5&K_WJIA!}+*X*=2al@15%rSnQ0Bvu9%NHSXrC48_M!S~L&xU^Sj%>`%EG#jl1Z}B%Qxc-yRGFKIW2EIa{c<wWQLswTykGe__y9{xTE2M2Is&e@7181vEAWPaoZ3?!Lu$N)V{tvx#TYb@ecZ~xxjmI%`;2wo1_gRm`D@X^?&2DT)dvI`@G?k4du6+_C&279oYkF^BjG^*xsmCo6l#+5ns}=d74q=5^5cewJ5SA?N<cZvwG<DLQ|bJ_t1LPog!z7vOZgCX`?1vPxrlL=9#MKS;BR1jl?H2uJ+#F%HZgwrVEPUbz0pGBEJ%Is&Yzo#&{;CPUo4bUiZCsPd>$%AkCBthtEKuw&ky(8rTFkM0-R!LsnLICpRH=stS$o1RqYz!O2m0u*%!V5AI3l+eWH(@UCsZm(?fP0Wt#EQqORX?+Lm8;%;wgK*e`;+)7=f;Q)Utflm}?a#6tUb3)`vD=nd;@c0G##AsUReuxKFw)i!QJU(ngz*~*B^)|?FpbI+{qpIbNt6jvTusrJY5bl5fsqR0n4F1<wx-_1&Sm`TuWn%*qXjRqP`_GPejL^Gw!xXB%Ra*`jUADFpuAf!%FZS5^VzaSLpUlANq;3-(3P*?ciz>LN-QL-H*zbHBRljHSEs<R!?4sq5H?<@2u^Js^UsJ1tyt0u6cXd5=TDXIKb3Z1ci}eHU^nw~W40$k@`}nfJMm6y?!l@4>JmVK{uSSDo-@WgCB);`EXMOjg;>4G1_aQE~7c2|LAQdfwVx41lHLk&!RMFUt%DoTs{PCFsz<D<9?Pfi^<A;z|ZBZSvdk<=PihU&5Lnf;$`g|f=ODnYbK&M8PIheK%^^Q@g^g_@EiS~Y75RLVfCG$y^)i<r#YK&cnoU!lrzOBa|BO~Kw{VKMRu{-i<+}J-kSBt%qI_tR45PsAx4ux^p98o7cd3h~}np3boyEGA^Flv|sp&LkN&%0!BJ;l))$*gI!zd+Ri3!#I-qpnvj5lfw^u~=`nnQC?7n@wWYpULcnjSlOT4NNAdQ&u~qIikeyp1J;Xobjy*0S*TNe#v?J;5HnM53r1z(RNiN&f{rgxso~Fur<0g$lozZm*`_EGxu8JTMzUo(A3|AfhVqAHBEVSa67$5GHs{yuG<3!D438py}Fa$WlMbjQCIgTuhudenRWZzYwGIsv*>*H`!H_o8A<o=-uQJ~DIGkxR0-h@p_pGqit$QnVvJdrwrMtJq;QDgo438j_}V57<so-Lm%;U~oqt^?)Rif;_4diz;Lm<*%MDi76u~+#bg`)w%|R|&!8Z4Ucl{ayf-$OwxiDRe%%^n+zd4~^Mz6<a9UC9*^iu+*axN0`E<`aWWGy$6KS?w~L>$GV!~TAJ!cHr`2P@MYkI{g;9nQrTzs=j-2l5;>7ENK1yDshw&Vo85h245QDM0=*d;)$`ismO2$M8<c9qS7zZ++lZz8ke?je()1SG6O&pJT)D-518OpYG?;Y-w%zPtj&zKF=@rx!guMy*mc4Nw*Ry%efYZpdk$8czam%rf3I)x?NZe>N`zEIth3ojL8CadxCxMka#_(^@TCL5dFn%0T1piX;)+w{-N*k433dvQ5lyY>j_0SK@&F0to}0hkMnPH!Y1hVFao=<-1S#Bi=W_?-l;cwTY>4EntwI=JH@9nax$<0m)!BCwqG^nFYJ1K==Z5DHr6Bm-MdlIk)^pfCg>6f+6Y)Yf$G*-eA0^wq4KD`-6u^IU4<Vjnv6%t`7O`w=2x`&xki+|T0gu`85&qBOy$uzumlmh_-WWv?dqu0E~<K`^IP_`6SHrwv|zD?ipbd4kDd8=Uc!g|E9OCd#_CRZnRRKF-CP^ijO`bn2G$f`Kv?PA;CCa`&}slMK`<VQZ+ti7kIW3L^W!Dh&TiS)y4>53t@FfF>S;dnO$4_GuI>F+<QB7%s9uNoulpf}@3#sJkMHP^a=p%aQ6KF8ls7v+rRsgSt;^_k2<{g;*y6wHCk0ntWrBOTF&;c9Vs+gk*X0MKe$Qp2j?)X~lD#>R%m*1kJ{@jys;*8_({^AmX*B8Y!UD<4whZz4LYO>vb0FLtfI6%Djs5a4hG)&W*#<PyXR6!wiu(f0Zr=ZX25)8Kf9GHw0A7kKD?uJ-o2R~kU&nK!o+ZMMSa%iNp4r)a-H3(xA&aQPvtAMUee&H8ju)ka;VM*&DfIQ8CXe@Kti^tFg!hAJ$&nE*uYWzg-@qbW^C52AE5?~5KPJ@3HYp(9dH(B6!Xr+`x_tK`=V)ik_T47+CbYb<LmLbF8$>b2bN7cqX&L?OVF?8=lez^(ma&+j223tG4;4dKuLx)DqRBjx)#=#ewtI2De@kZB3A}2pX%_g9pAXg13A7hfzcHQr?XU3{n#;6XScEiB$Vu0v59FO1UruL|AggWqB&{QY?(^S=fA60bb!}W~>!i0Mjv4PYI;%U%I|=ipcx`yeSlVmq=4t$ttTXZ$5`2AOZK-uPn*7xrcNO`rQ2&x%ooU3jSkTq^9KD9+H5)=u?PmV=rk2V6l7y(U-gz*$PKzS^BTe6od0pVZ8nbZHtY2O#%994Z(GADyc5!6*nmb#9;o`41#t{W4>ZuHc6WHz_B<CQyK;c!JD`uQ^haD&dy7h4&)|$W9+HDHsp(QPe!;s;g3?@7(leV?>I~GU9qnbNv_a9Ohpstlm@#cP;<9p1h^EwKDC?%hX$3VTdvD5Lk7krRVz=QZZZ#O%@?FXA(X=4qcmxSH<R?QK<mB5!nv)u6Vp8b;`x;AzC{^=l29~<}FF5ZW}dzeIW@k<};-IGJ#on-UqoN9AI({{INV|n-nz3!BmkKXTBr~MS{_hw78QmXs!USoAvV57V@8wVl2T<=Z4G92IZKmc82@<kqOGE89zP~Y;P_gYw$DK(cWVYfwOW&Z~LymqgF59=E9#96&=QSB}M`9hoYro?EUpnp5@rc)5$40~mlKd(0P_U_tyT*)Wj&!yEZ8=ZTHU)Vu3iV&uYM%G>r+JR|f)hKV2%PEfp(w^!kj1>Tq_w0-FWNyBC){a~?+Cj+DTRk3nw5;H3$E?@;ds9AW+v<b8K;3=*fzR{289v5M-98NoME>PBu<Fi#+<bnQ>2decv#C_iM(ydZ|44W3WwJpphYoXrM>v@K2N^dTo9e~NzFqLvIllaVHa%JYBSKuWOLnZV_G&CFrmUjctoawnOZGqRT1+ma*zY`^=pedF-WQzaGiUdzt-HO})D{SxM0*{mqCQ_sZn=3PgFboA>-)JhHl4;VcFW$)+#G6Ddl7JA+lhS+jg$`G?=Y-R`+F(92Td~rv7zEWOSv`cjoE<{DFo70A}qt#(e<kwvDhd=^4M01LNcqgfgfM#fCXtVa33%EC;K0krXcL4`G77SKKT2;8atC+1r;ocehY;VgpepIN~D#}1{+XO8HkD~DvbytVDs(ozELGLs!uq3u(DUqV9)S05&=#BtEQjxbWq`2N6`88_P6R$fkqn9x;44O;M2tK_N5h7mj)*GgIHVKHjN#5UTFJ+b=@v5bmQinKo^)zp;j>)^RMMsF*({s%Uj^oi0Wt*QJ1%uDfMSK`n}};C;K2eK7BX&pW((!c>eGITugBp7|zKj2xjoCE381F5=zVKNeV9QZ2=;8{PA7LtE%x7&!N128_>i<i18x+DKuSnS#7$D=mQF4@nc*(l-@0<@WJX2QfiJ^?S5a&cr<D(8-DCVm!=(bXw}rLH)mK)yfSlk{w(O|so!-z)h!*kkki5%vbY}7D5)PN+Vfl)47Dy+%`*MDyLlfdTky_fT7IcZ|K-f+iLkv%+r#c{9?StbL_+;xbZ{?!eD8eJ={1iheTQtjzWJP|ah2#cnRBg$72>>|T#P?m9J9Zm9<-c<DJ%kb@wdP8uU&O4N|eLkJ(s#3*tKs>0bi@d>$oG)cFm+NWLDH5A8AdNUMvk^ZU)WyJ&8ff_eckS-B8&4@$1=JwOoFx$tY$r`xmz?l&!21-S1;yCM5y1dr13yXcr1b*e|54Zf08(Py2%e`m@u1la<01M{!;h0ulr6u&T!;^uJq+>Z*_kWe%Sgo0lnnJ?-%x5nbJyXOYWRCV+3hZ&2<$uMHqSH1ip!jpe37We0&KN0MNmE9Ou6_)`y}!u=v)r2B*_2fO+dm#33r^{A9?hZ_uk;i4MkF6t83D`G~TX-sKEXaXzGAD_d?gOXu-Eui@KI}=YJti7RCEdka3sO_*OT7k%X=u4@8$76lo<`(g(UKT-S57EQg&nM2Mo+>;oyUfc&SG^7VEEiAljl#?EYU*>V{-|<5qdj6QY4NCU7eYOO6J^pIc`k$5B}I3X624){)7h%$^p8)N8Ce5SVLKDCGDz>N8TI2qw5~7{$2f+jvHz@6h?_EcELiih!4SYNbnDpclgzHK&9Hy*Yf`~Z&|Ev)6iU=}dHClLTnVa=!%0t%2{{SJ7BJ`a!UPa-QMmMeF@&6D%uo$>H5YdEY>%raKp@>NLyZ>l2HuWw>}l$;I-h>DGaFV4Xgs)rze1`wPYSCkbO$BuM7zG(EvLqls<1i`Q-S$*WYqN#7HZ93(b^`amzf9H#;xb(<6GPzU^2&hiz8hs0bwko7%F}rSS{V*)9))@VvODB7zm%#sY4XmCLiB@dtJL$*_ZLt+|V%+5j(qIh$REWg=1C*cU#gG<E*x>+f%1&&&ir#Thi2fc$|O^_BM-EopTQEvU?SjQ9}f4CZp`GqEILNktE`xc9ppja`zRRa<}Ow^O?%8{_kjZYORqI0w_7EH6yp#*x!Rf_2bcW-iXxKGG|j~0Mo=iOc@l%dmoi&2GO;5iMb%G8ekF94F<lXXL;XR!?!19c*<?qahpL>c_^<n1Q-hFK<{%e+lEJaP9P(|dsE%ol^YZQNsHm>WZ3x*dZ+-FzwX=3EvI-^m_qKH^6AmulYDa%oF#=j$^o(-pLz-giApv@7nZ(KJ8JRUo%u%{2<vw|T|pfHh;we|3kk`#M-6U0+uW=kxT8*~({8!KqDb&7AI-mwDmVa2{=Q*9e61dzvd1kv^bx&5JvICd@5t9G)hpAU(_uE_??L5in+x~D()}<=hKT9a$4-U{wNojY1K(-Ar*_BE;O-=pdMStp1M#8i+oLdhOJXy03Wd`x6-8}*aq8Xq-hSEKWL8Erv*mHGx2@JJvX6)c$<?`+Nq;KhrI%jcMRs=byge;F?ecaeF5Lva810E=waM*R@Y+ASdK!%$Oue)iSG_NY=gdi4+atIf-m9h&l>5K#^{RJkR)*wE84S-f-L?j&8xhRX{4m+o8~G5ZeJRgagE+toG)KuU5x^rMdewb|-@L8iL3%jaTEh;*S3aP>n@?}w!D>2N{kC4)=8*i)_xlfi7fy8'
UPDATE_ID = "IPTH_DBMigration_DevKit_v1_20261107"


class Reject(Exception):
    pass


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def root_from(p: Path) -> Path:
    for parent in (p.resolve(), *p.resolve().parents):
        if (parent / "Interplex_MES_FE").is_dir() and (parent / "Interplex_MES_BE").is_dir():
            return parent
    raise Reject("Cannot locate FE/BE sibling folders; run from Interplex_MES_BE")


def relative(raw: str) -> Path:
    p = PurePosixPath(raw)
    if (p.is_absolute() or ".." in p.parts or len(p.parts)<2 or
            p.parts[0] not in {"Interplex_MES_FE", "Interplex_MES_BE"} or
            any(q in {".env", ".git", "node_modules", "dist", "__pycache__"} for q in p.parts)):
        raise Reject("Unsafe payload path: " + raw)
    return Path(*p.parts)


def target_path(root: Path, raw: str) -> Path:
    rel=relative(raw)
    p=root/rel
    if p.is_symlink() or not p.parent.resolve().is_relative_to(root):
        raise Reject("Symlink or escaping target path: " + raw)
    return p


def bundle():
    data=json.loads(zlib.decompress(base64.b85decode(PACKAGED_DATA_B85)).decode('utf-8'))
    manifest=data['manifest']
    if manifest['update_id'] != UPDATE_ID or not manifest.get('documentation'):
        raise Reject('Invalid embedded manifest')
    parts={}
    declared={x['path']:x for x in manifest['files']}
    if set(declared)!=set(data['payload']):
        raise Reject('Missing/extra payload parts')
    for raw,v in data['payload'].items():
        relative(raw)
        content=zlib.decompress(base64.b85decode(v))
        if sha(content)!=declared[raw]['after_sha256']:
            raise Reject('Embedded payload hash mismatch: '+raw)
        parts[raw]=content
    docs=manifest['documentation']['updated']
    if (not docs or any(p not in parts or not p.startswith('Interplex_MES_FE/docs/mes_agent/')
                       or not p.endswith('.md') for p in docs) or
        not any(p.startswith('Interplex_MES_FE/docs/mes_agent/modules/') for p in docs) or
        'Interplex_MES_FE/docs/mes_agent/CHANGELOG.md' not in docs or
        manifest['documentation']['release_note'] not in docs):
        raise Reject('Mandatory agent Markdown/changelog declaration missing')
    return manifest, parts


def git_branch(root: Path, repo: str):
    try:
        result=subprocess.run(['git','-C',str(root/repo),'branch','--show-current'], capture_output=True,
                              text=True,timeout=5,check=False)
        return result.stdout.strip() or '(detached/unknown)'
    except Exception:
        return '(unavailable)'


def compatibility(root: Path, manifest):
    print('COMPATIBILITY CHECKS:')
    errors=[]
    if not (3,11) <= sys.version_info[:2] < (3,15):
        errors.append('Python >=3.11 and <3.15 is required')
    else:
        print(f'[PASS] Python {sys.version_info.major}.{sys.version_info.minor}')
    req=manifest['requirements']
    for name, spec in req['required_packages'].items():
        if importlib.util.find_spec(name) is None:
            errors.append(f'{name} missing in this Python; activate Backend venv')
            continue
        try:
            version=package_metadata.version(name)
            numbers=tuple(int(x) for x in re.match(r'^(\d+)\.(\d+)',version).groups())
            low=tuple(int(x) for x in spec['min'].split('.'))
            high=tuple(int(x) for x in spec['max_exclusive'].split('.'))
            if not low<=numbers<high:
                errors.append(f'{name} {version} unsupported; required {spec["min"]}..<{spec["max_exclusive"]}')
            else:
                print(f'[PASS] {name} {version} supported')
        except Exception:
            errors.append(f'{name} installed version unverified; expected {spec["min"]}..<{spec["max_exclusive"]}')
    for name in (req['fe_api_anchor'],req['be_api_anchor'],*req['doc_standards']):
        if not target_path(root,name).is_file():
            errors.append(f'Required source/documentation anchor missing: {name}')
        else:
            print(f'[PASS] source anchor {name}')
    print('[INFO] FE branch:',git_branch(root,'Interplex_MES_FE'),
          '| BE branch:',git_branch(root,'Interplex_MES_BE'))
    print('[WARN] This INSTALLER cannot validate SQL Server from offline source. '
          'Run DBMigrationManager --scan before baseline write; this is tooling-only.')
    return errors


def file_states(root: Path, manifest, content):
    rows=[]
    for item in manifest['files']:
        rel=item['path']; p=target_path(root,rel)
        if p.exists() and not p.is_file():
            cur='(not a file)'
        else:
            cur=sha(p.read_bytes()) if p.is_file() else None
        before=item['before_sha256'];after=item['after_sha256']
        if cur==after:
            state='ALREADY'
        elif cur==before:
            state='UPDATE' if before else 'CREATE'
        else:
            state='CONFLICT'
        rows.append((rel,state,cur,before,after))
    return rows


def report(root:Path,manifest,rows,errors):
    print('\n',UPDATE_ID, '—',manifest['summary'])
    for rel,state,current,expected,after in rows:
        print(f'[{state:8s}] {rel}')
        if state=='CONFLICT':
            print('           actual=',current or '(absent)','expected=',expected or '(absent)', 'new=',after)
    print('\nDOCUMENTATION UPDATED:')
    for p in manifest['documentation']['updated']:
        print('  +',p)
    print('DOCUMENTATION REVIEWED / UNCHANGED:')
    for p in manifest['documentation'].get('reviewed_unchanged',[]):
        print('  =',p)
    base=root/'Interplex_MES_FE/docs/mes_agent'
    existing={p.relative_to(root).as_posix() for p in base.rglob('*.md')} if base.is_dir() else set()
    print(f'MARKDOWN INVENTORY: {len(existing)} existing; {len(manifest["documentation"]["updated"])} in patch')
    for name in sorted(existing-set(manifest['documentation']['updated'])):
        print('  =',name)
    reject=errors+[f'File conflict: {x[0]}' for x in rows if x[1]=='CONFLICT']
    if not reject and any(x[1]=='ALREADY' for x in rows) and any(x[1]!='ALREADY' for x in rows):
        reject.append('Partially applied update: manual reconciliation required')
    for err in reject:
        print('[REJECT]',err)
    if reject:
        print('VERDICT: REJECT — no writes permitted')
        return 2
    if all(x[1]=='ALREADY' for x in rows):
        print('VERDICT: PASS — updater already applied; no-op')
    else:
        print('VERDICT: PASS — safe to apply (offline checks only)')
    return 0


def atomic_write(dest: Path, content: bytes):
    dest.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(dir=str(dest.parent),prefix='.ipth-atomic-')
    try:
        with os.fdopen(fd,'wb') as f:
            f.write(content);f.flush();os.fsync(f.fileno())
        os.replace(tmp,dest)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)


def backup_dir():
    return Path.home()/'.ipth_mes_updater_backups'/UPDATE_ID


def do_apply(root,manifest,rows,parts):
    if all(x[1]=='ALREADY' for x in rows):
        print('No changes needed.')
        return
    where=backup_dir()
    if where.exists():
        raise Reject(f'Backup already exists, inspect before applying: {where}')
    where.mkdir(parents=True,mode=0o700)
    old={rel:(target_path(root,rel).read_bytes() if target_path(root,rel).is_file() else None) for rel,*_ in rows}
    journal={'update_id':UPDATE_ID,'files':[{'path':rel,'new_sha':sha(parts[rel]),'old_sha':sha(o) if o is not None else None} for rel,o in old.items()]}
    try:
        for rel,blob in old.items():
            if blob is not None:
                atomic_write(where/'files'/relative(rel),blob)
        atomic_write(where/'journal.json',json.dumps(journal,indent=2).encode('utf-8'))
        for rel in parts:
            atomic_write(target_path(root,rel),parts[rel])
        for rel, blob in parts.items():
            if sha(target_path(root,rel).read_bytes())!=sha(blob):
                raise RuntimeError('Post-apply hash check failed: '+rel)
        print('[PASS] Applied. Code docs/tools only; NO DATABASE CONNECTION OR WRITES.')
        print('Backup/journal:',where)
    except Exception:
        for rel, blob in old.items():
            target=target_path(root,rel)
            if blob is None:
                if target.is_file():target.unlink()
            else:
                atomic_write(target,blob)
        raise


def do_rollback(root):
    where=backup_dir(); journal_file=where/'journal.json'
    if not journal_file.is_file():
        raise Reject('No backup journal found: '+str(journal_file))
    journal=json.loads(journal_file.read_text())
    if journal.get('update_id')!=UPDATE_ID:
        raise Reject('Backup journal version mismatch')
    for item in journal['files']:
        p=target_path(root,item['path'])
        if not p.is_file() or sha(p.read_bytes())!=item['new_sha']:
            raise Reject('Refusing rollback: file changed since update: '+item['path'])
        if item['old_sha']:
            orig=where/'files'/relative(item['path'])
            if not orig.is_file() or sha(orig.read_bytes())!=item['old_sha']:
                raise Reject('Backup corrupted/missing: '+item['path'])
    for item in reversed(journal['files']):
        p=target_path(root,item['path'])
        if item['old_sha']:
            atomic_write(p,(where/'files'/relative(item['path'])).read_bytes())
        else:
            p.unlink()
    print('[PASS] Restored source/docs to prior state. Database not modified by this tool.')


def main(argv=None):
    p=argparse.ArgumentParser(description='IPTH Migration manager + docs standalone code updater')
    group=p.add_mutually_exclusive_group(required=True)
    for flag in ('scan','apply','rollback'):
        group.add_argument('--'+flag,action='store_true')
    p.add_argument('--root',type=Path)
    args=p.parse_args(argv)
    try:
        root=root_from(args.root or Path.cwd())
        if args.rollback:
            do_rollback(root);return 0
        manifest,parts=bundle()
        errors=compatibility(root,manifest)
        rows=file_states(root,manifest,parts)
        status=report(root,manifest,rows,errors)
        if status!=0:return status
        if args.apply:do_apply(root,manifest,rows,parts)
        else:print('SCAN READ-ONLY: no FE/BE/DB changes.')
        return 0
    except Reject as exc:
        print('[REJECT]',exc,file=sys.stderr)
        return 2
    except Exception:
        print('[REJECT] Installer failed safely; review backup and local filesystem state.',file=sys.stderr)
        return 2


if __name__=='__main__':
    raise SystemExit(main())
