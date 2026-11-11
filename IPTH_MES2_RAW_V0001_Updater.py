#!/usr/bin/env python3
"""MES2 RAW V0001: code-only SQL/docs installer. Does NOT connect to databases."""
import argparse
import base64
import datetime as dt
import hashlib
import json
import os
import shutil
import sys
import tempfile
import zlib
from pathlib import Path

RELEASE = 'MES2_RAW_V0001_SQL_DOCS_20261109'
PAYLOAD = 'c-rNC>vG#hy5OtyCbeZr2fRw6Br8gV5@|<ciBw1_j!(IY1c9c6F$iz~P%<-`s{M5y;M6|hJjs5S?nVP7Wyx{2W_DAVjEGxzfBoHW{rB(O`CLZ+cdy0YzdMgInao4^d34zwj^1=@e(a^SnM_CSt&FnT+0X6X+wMjGZFPn(eD^W>82#`+Dir~bH%Ei^`_ZrUdc85aZ1-;37o*`X7vi-0_Pi%5l^;Jw-+wQf^=7NmXjJM);-CNPf75FMUK5ut3>>(j@ZHRvxTzHMA+a@cqXk^XFS$t;OkFQaw{h6vT>$g;#nqsD_H*~_U9Ej}b@8G0Yj<$|<^w&yl|95Fk`DsD7|Qgu7!TYBJ<vs*rDLaX=_Z9mj<+4*-AV6Lx|oS+5K7@jzM$2MJNPr6POG9nmx-IjiIAVAx5#8l<MC9(WmWWI_=X$Z!i_8z$s)>vnG^ud)2<_;ScLM{^_H|&F$-?tTR|Mro%5^fpGP}9WBm=fanrvPVH|&2%=u<jT;E9%hcLHA7FQ5tVGv221WYy&4{`Eo8paPINJYAU`KHpB{;^1<6k`qKTE0)C%k#H`_VszcHyU2Id!6>61A9EC)sNLgYWeO}68E7pQ-G`7<6c!#fZNQ)x2j*nif*sNIPsk$zKC^~{m#urcXZzCbbtF=#50)2c!kIZ4^`qQTne7JNMtAhDER4$81glPbAUa?X`aF~H5k*sg`>qBegcem9wUIyNW*6o0<w)3h+Z{>O-1woE9apbMS#GJonp(K!qdXScSbJ2jBOa)pTyNQ=v%tXC`?0iWE$K?E7M+uu2}^_@v?ml1OyP|WekC|F57BLD};n;yhuDLrhxsC{G16d_BE!eX%Y^f_Af^l=fmsjO%!A>(?q(y@E1uC-NGx;G`L+b+7pH$eg<g<&<G*`y&H+aB9zBsXD5m?5zJuvGngyir>X7i(2U+JvPB~Gq~eDNJ_OTvAOGrxflmWe=Szf?eQ6-mc^suu-8zkDXEdeiU(?Tc;S$yq@}(h=xrFO@`Ay=^<fZG~1raRcDv3S)0^Mn+shmy1<+>ZoE7$u3FI~E@%0%DI64#UNBnX3Sspc~0=Ky!;LAY2IXNx33{-aizW<eN=ha^D8qgV;--8Uw>LATwx?0zG1+sZiyATz&3IIh_g4uA{|NG-URqH`*IIS=C{?z))AVE}6cPPVg?)5p#ZGR90~iVuzn?>eWKnxS4YD?}L5H0l5>-{y@~(T+r{c{#A@)MAY<py|KY>mx0O9C(l<kyCGuSQ!1I3f~$d=HgW4=Q*q<$dK;<!|@QQjnHErFaaD`%$dUzdGS0F_%RPy*wAhX;$BEUek@ZamYp3fl<={t7=8`Ee<n+y32Nzvo1J>d(vlR|rc|`Mlo?DPb_Apk%x$s+AOva7dll3D#>jhf)xlZYOZz%B&bhIgs7A&uIh{&IRtvXrfH#0kozn_1EktHucj`@$<GBAjJ6Fr>4)~tl)R_yY9i<tl4&om9V2n}$heY)wr5(9+lTSWyH%CksnYg?eUW;D;+U#_vb5ZMD0!38Cc_wCy6#nCW0_1^#0p0H;44jA{OKFF26hH8gb>n!9MPcm0LYc$VjMNjbmW;`AVJT--Bv7s4;9jeV_`JW;5S1eqDS}{ZQ3z85JQcxZMJ$DDnr`@_O%edXg!!Ww{@iZvw@`2h8Qlj-93iV<l$<B>K8P17sYXDsfv4ynW^L3hcq;Z}nj%{PjD*Ps2mu5}RSe`5J`B3s3rOcBDEtq=VPFJA{c99&&@DhIhyMk&`$i3v^LZRZSz0TJHALw{-#?n{H(Q7P?!o@yQDZ6_yHjs^=uh@qd;7bMsekCz_ombR>ApX8kD5o5=DuwCd%K56Uj1m|u2Pd4oRy;Dn3mkcu_uTAQEReWKak$xQR}EV-Gc!djs1Fk-)p+fT>zqN?oAJ;`yO07+?!7JTg^#pzj=6Y;LCk)EhVRkSM%Z-j3aT$uuJ~J!@+B7g)Gj)olY9{qn1B8Z0<IEn8(q9Y#lY=k7j+c55qOxgQh=`d+zS8>+T)6-d?k@J82y4wWeO(Z+zuER%JR)#%p=F{Qc&E@B7}tL{9wH{+?`3cXu0J{jlz}4jYr{UaP(bAn{>?TCHZ&1yD`v^2qZJzh*KkItf9=cc-$o+uEDd>;7KDYr(?n&B=7Px#z(qwEzncSbMF>(FA}qIjm16`|_Y!_oUbI59P**%w4nv3Q7}>chKD5bsMev;q<^eloPjg2>8}G*l)lR@jvyWgI3dXr-yP^?)vq8xi@X>0h%-?2b0#smqZj`uC1qswQ{+0s>!R<y}Iasxa{_>N7sY)**oC<*WJsj3y=a;FTKb4S!`ky_>TVIC;|XF_*KQH9l-u@IZC}Gm}jH(&ILZ>081gO5FSbwVWyr@KY)t{Q}avn!jYSe7MbT5UdTKQ9s}MYBTqUg+s&vTEM>Y*x@}r~K|%YTEJx%$+O$#f1q=(NZW(iec-*$uxZ)LC)@UP|!)wD9Ufig{bmV>Q3<OU+1IC%liJcv=g-Zet)c;7LZ~^{`6CKLrp1CbS6^DSq8UAS%l!j~682kXX0Om=0AkHF}m0J6sf_PYDcVwGbB0H_(S_evgkDpfN#wA^q?BzlCqT3#JM<8>%L*(_xsP?RpYXAJN|1JwPzEqTHpbEx`4{I*ydpOIhRnhgNUW>|st=ra&BLHBT#K0HCgNv$R?gKzAOah3cFwX+-$N&t%@AUm+P$x;V4x;-Qw1{z~f)5xU!x*&!H9y?>Q+$H9ZcJ<F18ytzUHT5{ffDzZv5B^BvP3+C{W3;3D4h%%)Ok>kX-7*ylmz!2QFbDM{h_i!4jo)^^FNI42;v$Z^~If=-VsEIAVHkdtB4H}0g<`Mt;AKq+(4!RA3#w*W=&#vb2+SLpR=)gSu&CVu4c$`3AyfY_KB25ZxkYVhXLmLzVI{=c!|U@0IsA)r7}tb(ic<0x!U_aJAeT1-v$}r`AdlZ3l>QUF_A;m;QN|KG)0ZQZc4R>pSfG4^e#{iFq%rg2M7&TdGwSWbKM@i?Ox{$1daLO<*?TN9gXx3u6CF${2&HA>6MWpH-a?kvomb~6ajla1R6ZM25cMk+Lzs}ZNcnT<1$kmur%Ie)?Qu<?E>^Cv2wJqcTR7T^0&p4zrqTTv&>>2ci)Fk?bJR-!!BytXZ@SrwdnVb$?;g8NP8%F)Q(z#^Dz?q&rd%My91znd@_HI8D9RBUq#stD`ro?C<M@i`1qN9`2w%nFM-LB$&oKp51-Y85Amw~Sdfm;`7$CkA09kU2k^5Gzra=*phst!RyFWbe8T@2z5ls8=)%iJN(R0-!8M<Ewzdfj=Wi?!fXTGgd&NGBSB`)`(SyQ&rT&Ee$mDDee}dp48;fT+XrBXw2K@oN&M2sHPYk+$0XV-F!zFxmmZOKpwyHS0i{q4$2L&IpAWif}0=;q?EvJD~rs2BRHv`;8P{s8sy1$(duZLnw?Q27<0g3`g4vZ583IY1R*jl%JKZpi!<^Dj}@IPtb6>H;u_z@rjv~}L=zS@2<XmUwyPk@JZfMrdQT|3Bqa0X;>KLa5BQ~WwEulH)jpZCh?y}Ee?J3bV>n~Mwj3M{Goj^#m1pZUrFc$xNNrlU)ROV1mP9v;2#k1pcdm3LkSQ*D+ZO4VT1xs+6n+F6jIO$#ClI9bN-43L4-AW5@lKo{+HjdJ|dD&l!@xR^ymiylAomp+gf-pZD9CejS}k?^VukR~I%h)9_ge)5})x?Yu896t5*{xV8?RaA>l0Fog2UukZFcQSn^0^XgxQcus^&w%&QZFYCktbdGNjLEA$V`Ro8QxVFr9lf)k+k>q}eH-Z>H1V8=tGL6zBk0%Sd}#-Mx&E+z1AOTPGdI**fF??S8u3ZvP+dwvgvyh>uh@^=tt|ewa6yX!wgQ52ivFT$63@)Gbh>Bfm+gzK#-X#f{U_|fp9=mW-zdTTeSbaJC&6tHAx*p(sD<IGp#R}?k)MFJ<K2A)XD$VV6w?C;Bjek^V+*08;u|kr4;Wu4TPAU4lxw9(A*euE4^iwafu#n(8cBIn;aT)|!YxNz8i`~B;!7}4xYB!d)gBH-MQN?TDS$)Y1{gC%ZC}L*NF{uQ7;~kp_g~rZnQKP{C62^ZGDB-qD^or64Vb5UuX?cL*J@Pqx#Q%O4qIShj<6-5W788%Q2QIj1l^<PghWYBQ|%(GK)m1#&e;Aw{+5P;Wt+atDzIMs7+Db<HVl+1M&>AQu|kN>sYAAM$*OSR{wJy3x*sEQ{o->ZPL+v~0`%FAy(c>pZGj30=h4TT$iFRs;h`xB_!RgOy~9!JlEsJ?Mqj+`gSt3($-$An7U*K{bS^|--ar)AmJBUt<rBPfH6v{}H1CE0Ta2fhCkS*_L?31hI}JD>v(457UihsI6xu%R4~&KJXQ|ejZqrQ~^%tm*V<Xpt4}4$$Z1;w+gmX1{BCGD%MH_hUPho6aX0VWJ_2KSs-LvAo6XNjcd;}<ii~w#KsuMpABzt&(`4W+lhaDa9jO=!h>Xl=?cLAS4GKBZKpS=)h?Ov`t(8riDJaL_G{K_-e!A!=B>|`ItQ)_@dDy-lKQMaIyzrT4Gym%4%tm1fp$P`6UleD4~I7Vq-^meFe{7cy{Utaclo25qIBxt0I`8-aF=x7%EV%tP~oqZzyn2jR7#!mS%?7n1@tO3}nzV)=uwW4r6SKIp5w#JL>4Se`n*tf>cASFy08@ZA3uMf(X+75rjet0%~Em;U-Z&YyqRbl#EgJ82!@N7suq5f~=cHdmz|MD~odVNWyM+HY^F0in|P{SM@<8D|`_fai`2hp*zvdptV7i71%Zl7Ls#hOL(Qx<Z-#q*9hJqIy+EzUdL-u3zQhph&D(=5!A-&Zi5-eNWZ&8_!qd!XpMzV_K64f@=t`w8y38~y^Oalr~+_wY^s@(eS1tgo(p4i<mvCSKvu{S6Zs$Xm>r12wdr-CUmuOnJFJzw9=*cDL8;F#)^Z8-l`ykn6k|l^{J@`C#`=`{v>rRErNo_^rRcwY|M|7N^TH(2Dc52ETe&9vrMofZ*VRc-Q?P&Mt0-pwD$dHKE<!UjLPwUsjfoZ}+IMn>W4lUv9c$E5Gm9_csi1_HK26n4>tj>ue2g*@*C?s6YQ(Xid)M+44;wLqFA@E9}@sx3_h14WQW?(0}v!Z*OnoXvl`1e50_;XTGDb^|_DdNUPq+pH{4Jh1@BZSDgR00uy_>7OnNxu?A6G+_P8;vB4FdLRVkFRSG<4&HeXr@~KY|-p$Vpq$dH9{Aclxft<M*xJ>$sY|RTLo~MGyrB#)lI!|?8>FIes!Obj!zBbC=GTfoDy=GN^oF(yirSCn5Bb|kDx_$yBenig=q?>~1GMsC7m2v5Ge*opzF*sVvCJv`|=~+CEVWQp`F&1jprmi|qam+WX)55QaH~m5P{B4h>rdV!qmj>N8Fx%c)cesuaw_ZA?#?T>XPb=e>(ARm{eCVxb0po1l#8%n6O{dRg?;3X%(XM6fD>SVPLD1uh&ux_-{PBdD^2!%}II+2k1+o`Rn&QXnC%lyt{|PAPI0Kv3^!)Sdini<<8x~#K-W3qoBiGlCtohg4(e0b-W}xnW9mINZHk9FXp!2%c1Fy`K^W9##^}~-^AbnYoD(Yu>dh^@r?D~;Zpu3U@ki%0#mHCvSW@RoF_WZ@8_u@Ao3Z+lpwdvC$U5#FXhMvbd_^EAsj&i}%F>=|GE6<pcdCe({qv6^1^G64`zHD6Dh^NQwUtWUrE;?Z?6S@>Bp%e*Boj~KPkd#KnJXH!ov@sI15-M2<mlShe*iFpNVRj6kwXe^9&Yh({;T+lZjXLF^e{pfz1~OTly73;%B#FU{$0{QuclYWjcuxdbtLO<Hw%>NQjLUk(j-{Z5c+)<==yr~6@4iUlFvN^?*ZcHZ{Lhr_QpXx}Tdj!}@=b#<HsD_tg|XkXGPA@yPBSl#{D4cUFgT0RlDTv<f&WHJfmIp~nBiUscd-h~WNVsA8<Un5M3n!2=c@XyJ231gQbwkfL%@qNTw-3HyWkw0)VL!#-uFimsGdxmdTulnBO}ktJ1P1|R^EFusG?jP>tmt>4tJ6wZ2!$-<Ey@=f-}rAdjDW{g8CJtqi7L^2(lB-Ac4L5cY=sAnl~iN+=GF<$$$O-3IuFx{42olZwUwORxJR+Qo{c~B#sRrDQMl_9xRP7C*+h^^(Tob<_I4Ufm6zXkE2wjIdPVg&M^Nryc-4_fsjr?3&C<O8?<v5RqW9VNY4hK=0MN(hcbk5i|MsjFF`5X#m}-Z`<I}_x_LjtY$+fN?E4}L{<eT!r{AESjHUsmWT*@LW0Y@eG3@cLw%D?j^sN{B5~|>_L_oC*8798aF4TZ+2a&MQcTLoJ6LIL=1X2UHcD8f)V(xx$8;yW8zM393z*=R_Y;bvzmiG+TRPnp87k-c;zwuA%`bq?5U6w4ceZdLXCSbicUj}jo1Y}4Csx>`MZ4s%D{~<tg_1d4teH5^t4ww+kzZeJkT8OiD|9=4jPvhGcyo#9h@uaWtRng=YCiifovu@KT%YLb^0_@()P}$?u>{TxD75Kc~g`t|Ys46X=JQlxF0j73Y6fH|TmGjv8=sL7!OA}^Ed7q3!qto-Zh(~a15I>y7Fnz|UwXy1(-Z^MgZRER~M$$%R;p^+ZNDqEXzeBl<kqbvxdobw=Qr+@^K8riDv!kmhalF?%J9a-Of%mULrNHZXn+^x7;#A=qZygmP(bH#E?-+O~LgSfkAYLz0yoUWy&=&@}AkwIRZ1t7UmA3F02)&NHN6Xt3q2{HfRF(Ms_hRV9b87E%mPmAR%g?Td^=rCF%qk$NU@IBFP@c+7q_{iK+IBo_{A<BUtqI0<z`2lLuss$JL3Ss`8`B7|8;r6k$5_L|kBNy&55Sy?gktY1Q*b6T7qOzcZi3tx=(XMHzzwnI0~Z8iB_^Uki2YPz`0>8)sQFp84E4(@>hW;NbXy=K6JZd2a)i<v#58noX{zXbN;7vh=W1N63(k}?O8U6bV?=CN@0cO&P_rRmB&y6ebqe)e?W^;=Jr*^!NEUX-ta58D?1T|5=3ELji|?`1!<4#zt>jRRo!m9XwYNKCjk@Ohc?E3X+1Z*@gj-eb6?-7zzyLa~D}|TuU>^X@i7>c;d1nW+*Qctb5iF|0i?Z7#Vb>e%0aD6A2bB#gqiOf%@q7^?e#1Tm_koXuh+IIE!9Y^FDLVX8MrZT}Qzxc8+uFi>ld;JNu`XHk#}mvJ9g8hoTS5h!ToaC!Q9!wI0+Ikjri7e2$9-eFC~jdgkz#BT^2R2Ie!MC9t@_LL2kX@$F{#Ej<s7f-`@Z!G2g=7)^`Mm_svc663>`8N5x+}CNaEy2thLVKIk$~NKP>K;Dsy;{?k5?E+l8C>DS_hJE_|gSC?Qy7Sz+}tYTY{f3e^mMJ@Y|~e4-mzq0*nmxpM*WT$n8gjzSM2&dIMO5;=vWHf2Dbs!JD1bF`8H&phU$%orV^OeM#b{@gVT3j?^L8Gr-ECp@B(Uzq|TT4S#%D(03hc{>~p6BGl$Acx&C=OZIJ!#vZNzRX-0*_<gb=c03D6%*=Oq-6%KObd-;KpU+*j4>&6o&?l(3?C|`&2#6Q2_|UcEJ60!Fot&%?v`T8Qn*b7;=Nff>5Zy_8K#6SJX9q!mV?_Zh-ktXg2Ky<LhUQgF!F6MZmheebzr9nF;?n{?P#|&r(+-jFuY-6vl`EvYV{E%sQ$sUENF5pX|)x?&W?MF>@MRlf}R^vL&6M*8WK%OsEtv@8|#v8oFprfD*F(@1Y_;$u?h_qc6MS=Zei=~suABr67*nd2nK+lC{L9;OK_(Np=yLmr6t(G2)24$s7>I{xB?a1&?+Fo+7i2f1iLW-4+$oS6q34KF(D_iV%l-Q!uIsSO0ADb#M{%aiXoCMg~Z}THeY1i9|{Xw^40{pe<c;tEJ3y)8s8(WT20lclM?Ah`!G*V&ScRvXXb?*%}4oz7engYv9n{hBLk3cq0%tqu3spyYpmkbv?F6%m*2qRk2M45j)6eNL9_tSVk0}md+fHfRvruNFcwmGC=y}kQ;KJ)ZJWA5m^zB<V&{l6cTNJ7niSwRi->aoX;GwD+6k$qJ(djU{}jq`nGf;%)HKAHfO6y0HX=DP4hq%#LHFVscLx0{&OICBnqC1?%j}h4$;jF>%36^(@v-`)VDm5+OCx4MhI~hf6^6JYG*iy)A4Q4C{^tvrA9cX6`KXb`x|_y5BZ<<hv{C><q{a$d3IihVRJy@R(^Luuy4p`P-k4H3HmYz{w2j&d$^f!d<ik`u$1()9Z&;c43HxzaAIX&_9RMZ;2SEy|2_Te9q0HZ95~o#T>Y-OxWhDDDL!lKB=ciI9?!p1HI@X%jDG~x81c^oRqG2IQGBXWPYWI29Edt59Y+e*Yur=6gMRljq`@;(dc%ginQb#r5I-rql&=cXNrS}|bzNThd&<1O$2kW`QW?(udXiAGYh#`;IAM;Tdp+c=pfN!|73A_&gaJb=`>b;p4zN6v|W0LwKRF5a2+I5gVo{4vFaUZVEhNWg51RcwwVT<8O1A?SzNm;9s&Y;=`jXN9_7#lLgfb#@K0F8GV#voh}sHRNW^*l7vsYL%xm)h(3K?-Wjk|ZVQ=an${1Uux0$bQm=2P6X^Z-Pc$t&<`(O_+g$WGX+^XjTvQLDi+DViOHA`hYRA!2>(YRD{+aT2ou&=Xkfr+f~uU9yLH5Fg||*RTb9KGBJxW-JV8*sbJr_I6+a$a%hgNX8593X2Y0Ss*#8^8R{X1a!tH>x2=}I63c`<-uHo8w-U8!qDlD{@FBQ<iq~~Y8)l`WU4>c*yind(td+y<Ht9nr^wZAFI-%5$H{C&ggHl{hs?{pCVa9Gcr}SlmK&xME;LlQS&`BHNNwVEe_<*0b2^q$>V7tM}KpiY~nB_i=>0*+C^d&XFAof@#ow%SGd$>DU5=^N3A$$x#(V&EVRZ#?79t=(RcYe1_nM%M?chf~eEI9%(JvWR+H66CyXGk3p?Jc4^T7K;RNEg#7aCk;J#D9268{PhbS1D^|YhfB0w^BN$)fIRisx&O+<4h?XO8v?^vcmTB9lifn0d28nwjw}4r@;&~IX9Bj%gT5f$ZqhB_4K}<s?JWNT^h3#1)Wd*i?t(x{4qG_y$e(nq3b~Pf>LtKFozVZ1nlg@)(SkBX%R>LI%<X9P+>458yse)`=Oz1H0dt4GLl@&tCd;RArszr0f7YIoliM`L_1(kuyuats&=gW8Pgs!SBcS4q9ie!*;;`GyzxL`uC8c<rZ1Hhw@mNcIqIlzsYdpfuDpk>k`eh^ZEQM54}tL+z^oE4z?P=DCZeU4YL1D*RkZ*`)`7Lmuw;NQ*Vmt0t#pmw4V!Gbx?99CZ2p70Ov!#R4FtGX$~W|E7JGP6U(88s*FR|NAMUpr?!M>l9n|aoZvCk49ya!;yI%dM)jHfg+;xu{ySuGv^JsFkcep>9x`#*8sej~()jn8WqqTSB)pzUr^=ad9&-0HC>+W8|Kic1GxNiM$ufE@Kr;{VE>G|+L^QbXt?RnGv#^lg%?d?iYDxyD>t?9&Xx(5f7X0z!|cAIW<()16HntS_4jlHA8L(e_*_F%p(w>4=t4)>?~-o$e!4No3U>z*j5gFUA+?h9MFvy1qJUHe&a%$>!Vatd4Bbd_5d`_YHfin8emSvR&jR`x$NG2-uI7j?ik?H$=N#y9gKhk~F51x4wb{x*3WU))oDXGe4ByEp*)ps$qtOvsDT9J5-d1l0Q%buZR!9paifV^z9>W9igArAwpVi+#3B!4X(;o}fgpAh&+=PE8DyHk?f_E}asf8l;<^>Pmm4hEVBR{nOEktgR3pvy)X>$iS&x>NLgu3k%9}RX63xaBEk(WE6Y9V_!VgGg_^~_y$dD47I%+AmGLe%&}|KT!DSV`JoC){E$0jkJq?zRaPELGPEt@1zNgl{3}9Cm;mi<*{k7{oDWW!OFJw51f4bQBOQH|gt+Xeaq}j-I53*2pqwD)>i|e@gAjMuG(v*bHElhQ%VMS2m{Uhi*ym@+=yPU8VUVhndQb!X*{DW&H$^QZ##g=LU#>qKBYq4iSrt|W@(^^)jQZ6h$`rK*t&pf7z)*LkOtEjdn}mV1TT60hOI__=%l+);bPGO);K8)|JkC9E?CU5V&4D7;cxza>^JMjTob%b8px5+cwK$(?<0*!qANg+Li~B~k&hY4L2&?7su(lu15i|w@zRHoJaa7o?+`-kcV2V4(t=AO_Re6Xjv^;>OU+ades?oXCIuti4v-)eJl9j~snA&%Kx%+<MpprG4Sv5KSA(?DOt%i+QP_zOa#vWWn{$MpoE%zs_nSP|`X|ZSlm1!#i#*=s1eWZ^PP;A*gegJhLAGj!;IYFvq0~_m;V@rk4jIS4?B7sbKJFWO8Zyp^ZgAFdifSQ?>q+h8~E+Fg5=^aR6)Rxs}m2>4(5*=5pRFM2s+{5%|MUUhh%gvP}<wI$70E&+iU|{PrX~^z3y@6Gyd41h9j-@6P#VA<H)~Wh{kIr7#@^qOAq6ZeX+GA&xYEyWe&l#PiO77TA>WlqD9P)#u06NnRc#)BTg3+fG!ww{cm30#*Ap8m|)!PJ$tgV7jt9@=m2gsXH`%{it((ww0Y76AHW~+@C&IB^ph{RM&l>g{xCqs#Q%X(}q*^QT}g{=x3{%$$@?Ua5Wc)b>QPJ!1^=zxdhvy6CK+!X9jZ22tjwX2b2d%6<XBA>kS*@bQ}LocOz<dwbm*aE<qJBW#}55`I=!;9i$%y4AB_o&m+of`V_sOdA9jd94q8`V8p9W3A~oUodE3o;SWd%MMpyaOIf@+wY*az5s*dAE6GJdoH?tJSge9kHduTPl;*A#Ju8<+5U5xXbuV65KKg=w8EMs;B5LLGBBf#O`I&3S4>dZ*LP&V!+0_lc49^X?5!X-E_Gl-NFLhgwkkPvjvs!Vb?9?TGiU4UWaN1S_9OGlPp)WG*wKN=mT}ZdasIiQqBv!L2n!di6e4<XcW_|5d%U>?+@K2>^`OPkk`6+y2UDY+hqKW*)J|XyQqs$3dVRmMuqxg^t>-%hLP!)jz27W64dCCN~BoUI2CEd^rMRf<BhHq%`Z-3Dyn*VtR|0TIecK;TQyv@TBQ}?!rCfYA$=1qpmT468E!2i4Mw|=Z}=RtUs|CxbhKMdvvpkCr5@bIRf5lTbl<)CB0&L8Jc)e=sFQ0S3bJkHNT%<HB5l<QUh@D9ArW8H2XmleR@Rk^J=?a}*NI<0@1#r`dWuLYDQ4?9A_>w@$a2!uxNV$uF={8bS2&EQxII=zRV-=FG^Me1w@S78MwcWmTS)d$@m3V(%p<(wX-p>0uOmn5?JdL4wy}r(d4z5gBt(}Ejxh&+Im!!2$L7Gd+E?d<!xSMyKQ!pHnmuW@#8bVOMAkH@wZJ@GgS`83N)c!d)dKJ3W5IF>1u$c`k_jWL1%P#xxeRJRj?hd>tIZ0&sXLXbn>`>b=d&okGe#0kkM{Fv&TG^N=#Zsg1Ud<0PBf{Q=ImsLsyqrn0cz|>u`dF)B~o^AT~{jjwWdM)T1(E_ABSUzh|&*9Y=!3?^&70Qgltltx05?q(;C(vkWmX4vUK~n9G%{pE>M7LE{UGaiZbQoN~js^mKpk_EvGf}e%%sHPnF#6zShF-02C?5I(Y^~$6>zGVwoVxtxVpc*00E78+335$W^N~&)cBHIi*uj^cwN%9^q_GMl|XeC4T{(vV=jLb@-?);|;9*sH!yK51uz{y?c+W$O>_5`IL`uhq|@bUK>EGac<SS9@op73QtNWUl5v77`k-m76-_I{1vAwtdf&dENux?mpt~WPm;8CD1DF-fdEq%$WtAm`UW4yC8>ii#11SeLcRbPL7?7o*n5JSqHe52{ug9gP60sbC=wcxhM-6vSO2CpGI0q1v<@Bensu13=rdy_k<&Qb!cx)Ajl*FYP0>~dsI?GkKeL|$fp$aiB$Jp9FWVXy4QxJn6Im`uMn|*PK=Vz9J@ZPNVWrJ(dQRu39P^P^%6<fxE)bPXEH+0A)x}t!!3atTi-h3<^tP0ncLK-}A*KqOA3%+)SOA-XdbL158Odkfc$^ksv5IuF_=exaIyEB|TLC37Y~!6!pNK-NUZ*LNB<CZyn6qk0j=2&U$82-XI@F08ctRMR#Rg0xQHO()1@-{YoMsPb{%RdQ<_=!Sy~&?S(hw;5E#{^r#AKN2{%TI(xO2fcPuRKJ7WzaSo}0=M($dJzZ*p?>WpUChS$GIO$BJ%g31iq3$#2pUasxv%{$mkLRoSsx(<G0&zeevfrKDTgcUI0uH%iGX3K+$#C!td5)S8SUUCf5Pj{}-|DDzb-9iz&?D7dXzz~d_Mlr$~H8BQ#2mpa&`m4KSEE^1_4)RZ|v(S7{^G~LtOYEJK{eW-#vZ=<q_c6JQIS1d)Px)^!l;>=L`-or-Y1dc_F$uAEW4dQf713*y|H$7rE=iQEuHDbyRnq4IuoD5|UQ6Wa}+ruHb8`SRT{21ni6{2)H$c@bC3WvY*4N>cxSm~rVvhgl@60|=u$n(%9IgqB5r-Wh>AW%sq;!~b%g&F1Hf?Y3cPXVWJZzGV4$Y$@QrTnI!g83Y$hz_c%PMghbYSJw2aH3JGxqMy)>Y3AEiV8M(m2)=j-7qFDS<&xk4;}R-Kwg1vr92VH5CHJF1tnBk2B86wez%|*qg7z56bfL<0fdXw!CX2akY^2Qi~SNNp2rJxS1#>I(`hNo+_$cUgG!&*k(oslA|S|jhz!76gswUJ#ROYT?y*s+(ZD4e6!aTn7=_-rX}*U9Vqle=6k-Yvv`>d}oF%1=D)WQ_q~<^@6UALQPOz;t3Z+Icv*&X*$$4jzI#q;(s9dL(sbdp?*toqd%=M1@Dqz;df&(4IPiAiNDdnKHc1!6{I+}R7UZ51fS>QjoOFQk&r0^9sjmOQ~avv*|F-5n2A(1W5vQsYwxNjhQV1U@y5&~4A%S|fQ%86p=^v@`J%jKiAV<WXx>4K7dE*)O?+6H|sPi7@o%@iX8TTu)Ml%@};=xnn_kV}U1j$_PNM{TrY?XoFBsO85~miW2D8gk)^EzBKDhs(V;d;ryK#^w_?<3_RmnsSLZo==Cz(v1zrU_#H8t9;R^v-u<`qw-<N2BrUbxxdp$bx_1iRE@PXg%##x-4rx??~dFL=A<iJLQ1(-NhQ6*(i_Z}NgXD3bm5Ia?HdbfUW&`+oSERW@@=6`sI@^|v_QJzsXm6+4}6t}0Fyh$JQ}P5l>V9n#}Wy;0&<iwtKNj%T{L*c*6~~HnB*m*A2KnmDRYMhrrEB1p3*XeYF^3!!1Nu^n@ntiW2?+rh_YZEbOf``C?}quXtz8m%K)!qt+FealL_TozD~w9lFE_9<Js6rJ6k<?R@>dIM5VbkM%fga*Q^n*OnY0hdRukW@pqUX)i!Dx&!pfeMCy;{yi`ZIij>BpvsBa+sU5vWwF4t2edTAy^k-l=9CI}u7Rn&V{VNqQ)INRf@WtT}|H#F_H??o5hUdJYuD|Lr2I)1Mp$H%$zW`_@$XqZYL+rHR+aFVGYD=qBP9AdDX3-c-?bFS5E*5T*DvlyMhO^a`-J*&uv=4$)7HBeh8_7<g4JSriI!Kp4uRYfjV8Ef$d?)~s9|>Q~7qbl^Ajl;6jP~GdBB@$~OkGk1Y6aKWMq`<}`X-zbqyZOEs*sLbTY)$>#u>eVbjl?af>NQhVvd{u^;5P7@K=oL+9LWCfy$r)Y=lajMWCQYrWu{Y_|$>a9P9d1N+tQQ>qIpQFB!;r6s&j{<8gjINlvE<=*lIKAAkL#5cE@Ec&e(C&Q+(pI(064&S$otjzD*nibT$|{1gTXKaB9<Mx%akUEgi)@9+QTR%5&RdoUjxhvl()hsoSLKdSHUHuf9;$q(D1$Z9$6ZF53)MI%w<hqsdktcyccn=?}vY7!uFc}t=~pIxp@d7Uz6MR_?>l{uHrNyNJsU#LZcr3YZa=~Ri@Rj+0elsP_olS+RyS&rWK$CQ>AlEVy$pB#(6Nfp9uZ1SP0%!!KT)5e6h#QV4gJjlvj!lOn(fGcT%p*U9^Kbbdppv=njE|{|{f~^7*{vy7;mA+ZkSe-(yjv01@K8Bh8S_*X%vQVwS$n}sLuEi39+c6hMDdkBCO#KDL>rq=k5zf7{v`j747OE^YaZx&e<pI4c6F&YNl?D*Sw{e9MV^G02N|p-@l2Tg`Z%PG~d~k~}t_L)Z^7wzVN@+4|yz{m1*B69;j2?k`QnKbFA25SW-ydQAAech&2=^<MiuoTt&TU;E%gu=4%GEo1!ES2)SZYc8m^ZtmM+;rBH$Qy5p{RmCV%I1?mU<6AiXZF8inr;+AcN}kwyu_VEOtM)2gl+Fo#A9B+nT~&P&%}$48Me*wOXY=mYSvKGv-fVegUkAUn?~^e=PP0hUvmZ6#*^3ak^XsLaip{%;*ufUA4x1qCQ52jgdzci(cr6(!3tpPUzG1YkW+pl~i5IbJHn(<LU<NRDH0&0zGvD&ZiKxgu;*F%{!bV3Rr$1Z;)+0^uB+LYg5lMQB!&(xyMBqOr^K<Ld^yA?&R%x*W+eh8Nzw!oTv{UR__<v!9K3(tqm864P`O4$;5X_W9Kl8qRCQ!(nq`PHvGc6cvZY)m&=331XhzO&;Wr&-^zQgK2me;N7hF%Yg9)cG0joem=xgfT&%YH=RU6X$%boO+hMF``!&^C_i?ptHe4GQ>N@(DR~OyuZU=tI%&RJfl6Ta8T+>r~GgY1CSr@OxT(wm(JM37Qh7*}RpjU|;Zz_O905Z)9&<#K-sJx9eli|*~EQUIf?jsKaIi_%iygq=UxQ{Yo4-PQOl+tmnLL8ILn-h5nMaK3w@**6djMTi$y`9MF!mo@s^yWQjFric8UciB+a)z<$?|?e@Tyjo72|!<*q6yDMQEbf>inc^Wtki4;%6XWRR-p)nefHQxg7vX=1uwdc#xBWW=b278&0)fEQPQ<Zc|zpJq7|&n%xnIvqM49Lg&ofd$dp_K`Uqz@XjzljB`!i~X9b|zrMx3s^cCe9Kpx4e0-blDvIA~XavZ9DpKPX3H-cP(QO&1{wtHBR2dvJQD}{Cxre{qU1acf=7<9~afkp}1*&$acKw04_rowRj$ZAIgv~crk!fot<3!3lT^(oXpcPWscmk@fYXqt|3G|~B*>f(c7;fVW{su~>Ytc%eio{h`P5q}x>dtz&fjh(pI9aOUgw=B7r%H?S4fhhz=1>tB)ZF6Y3vq(7f?nbP7!cL@XbB|3L;js>jT=j_ZNrkp5Z!oy*=UYSKHcuzDdX8}H7i$r5+t+oJDAy<!N)a8*RtK&7mi;t0=Y?X#@#kuNT!a69hJVH?HLj$ED*yT_Nb|&bOc+V4ltUMjZNyOu*XT>^7SGDX6+}qr@CW_hgq8BlS%(wJ({&yOvJ)H*ptC38vZKBE=-#lxiT%*G6c>{Ww^W7Ltbp|S(9lQS)I?`A+u8>{x5?N-@fPv;zNs?Tu`@0*2d0F!NuY$^3Y7>Hpe9Sg%F3V(MQTMF)ZTM-`eXhryH!YWHl}LVm$du3+Ex|W(q`tLv0Iba-^m|2<>Xzx@|w^W&aBk3jc*qXF_gWg2HQW@49D1FfT<p~UBdmM-hWsac8AP%{RaV=YGS2}Ip_>LK%UMzS*oo@vU<!z3si}~BM^>-04eqls<T<G*G&3IO~o&2Iw^uM+o%mDw!^M~V>@mJmyDZ=6Kzx|ol7Hhkz`KY+AEnCV;qy4I3x$D)r`ru*g-J(^O)=J80~A^m%voo(`awHmb4)811uic7MEQh??2UbI7s%&kp)5?wT~~`=G=;fb1>Ff_>Q<n>F6pNC+4Q`fJ>PqW>B*V{GgOq<%-BLXT{RbDW1mXMs0cilrqmyFrc=e^Qf#6(W_n!`$||AsG~g?1w+-bi?-jrtz9}f{PWV-P$i0EE=P%}sYD=ekyT==XIKj)Q0^Z^s3_rp*bFeh%R2D2#%ZsEXy3>!38taRJyJ>z^?_jrqtS&(-7Vx;{qw*6TagL=rLx0l$3H0tZn<uWbB9y{RuGvMBCAeg9cIxzaFk3eNE>xboNl&~l4nzJ_FbvO022a0oc*lNNG_C(SkWC0n-N<;mqA)^!%~Bfv>3RUEIDvt`CR|;kN*QrhxE+'


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def fail(msg: str):
    print('[REJECT] ' + msg)
    raise SystemExit(2)


def project_roots():
    fe = Path(__file__).resolve().parent
    root = fe.parent
    be = root / 'Interplex_MES_BE'
    if fe.name != 'Interplex_MES_FE' or not be.is_dir():
        fail('Updater must be placed in Interplex_MES_FE alongside Interplex_MES_BE.')
    if Path.cwd().resolve() != be.resolve():
        fail('Run from Interplex_MES_BE (cd ~/IPTH_Traceability/Interplex_MES_BE).')
    return root, fe, be


def source_sha(path: Path):
    return sha(path.read_bytes())


def content_bytes(s: str):
    return s.encode('utf-8')


def safe_target(root: Path, rel: str):
    if '\\' in rel or '..' in Path(rel).parts or Path(rel).is_absolute():
        fail('Unsafe relative path: ' + rel)
    p = root / rel
    if p.is_symlink() or (p.exists() and not p.is_file()):
        fail('Unsafe symlink/nonfile target: ' + rel)
    if not p.resolve().is_relative_to(root.resolve()):
        fail('Path escapes project: ' + rel)
    return p


def read_conf():
    return json.loads(zlib.decompress(base64.b85decode(PAYLOAD)).decode('utf-8'))


def desired_append(old: bytes, suffix: str):
    try:
        prior = old.decode('utf-8')
    except UnicodeDecodeError:
        fail('Documentation is not UTF-8.')
    marker_begin = '<!-- MES2_RAW_V0001_MANUAL_SQL BEGIN -->'
    marker_end = '<!-- MES2_RAW_V0001_MANUAL_SQL END -->'
    if marker_begin in prior or marker_end in prior:
        if prior.endswith(suffix) and prior.count(marker_begin) == 1 and prior.count(marker_end) == 1:
            return old
        fail('Partial or modified V0001 documentation marker detected; manual review needed.')
    return content_bytes(prior.rstrip('\n') + '\n' + suffix)


def plan(root, conf):
    problems=[]; actions=[]; already=[]
    if sys.version_info < (3,11):
        problems.append('Python 3.11 or newer is required.')
    for rel, target_sha in conf['expected'].items():
        p=safe_target(root,rel)
        if not p.is_file():
            problems.append('Missing source: '+rel)
        elif source_sha(p)!=target_sha:
            problems.append('Source hash mismatch: '+rel+' (collect current code and request compatible package)')
        else:
            print('[PASS] Source SHA256 '+rel)
    for rel, val in conf['new'].items():
        p=safe_target(root,rel); b=content_bytes(val)
        if p.exists():
            if source_sha(p)!=sha(b): problems.append('Existing file conflicts with release: '+rel)
            else:already.append((rel,'SAME',None,None))
        else: actions.append((rel,'CREATE',None,b))
    for rel,suffix in conf['append'].items():
        p=safe_target(root,rel)
        if not p.exists():
            problems.append('Required handoff doc missing: '+rel)
            continue
        old=p.read_bytes()
        try:
            new=desired_append(old,suffix)
        except SystemExit:
            problems.append('Documentation marker conflict: '+rel)
            continue
        if new==old:already.append((rel,'SAME',None,None))
        else:actions.append((rel,'APPEND',old,new))
    if actions and already:
        problems.append('Partial V0001 install detected; review local files before retrying.')
    for rel,verb,_,_ in actions: print(f'[{verb:6}] {rel}')
    for rel,verb,_,_ in already: print('[SAME  ] '+rel)
    print('\nMARKDOWN TOUCHED:')
    for rel,_,_,_ in actions+already:
        if rel.endswith('.md'): print('  - '+rel)
    if problems:
        for e in problems:print('[REJECT] '+e)
        print('VERDICT: REJECT; do not run --apply.')
        return None
    print('VERDICT: PASS for SOURCE + SQL-ARTIFACT INSTALL only.')
    print('DB SCHEMA: NOT VERIFIED here. Execute 00_PRECHECK.sql manually on each target DB.')
    return actions


def atomic_write(path: Path, contents: bytes):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix='.mes2v0001_',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as f:
            f.write(contents);f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)


def apply(root, actions):
    if not actions:
        print('[PASS] Already installed; no changes. SQL execution is still manual.')
        return
    backup_dir=Path.home()/'.ipth_mes_updater_backups'/RELEASE/dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup_dir.mkdir(parents=True,exist_ok=False)
    changes=[]
    try:
        for rel,verb,old,new in actions:
            p=safe_target(root,rel)
            if old is not None:
                bak=backup_dir/rel
                bak.parent.mkdir(parents=True,exist_ok=True)
                bak.write_bytes(old)
            atomic_write(p,new)
            changes.append({'path':rel,'action':verb,'after_sha256':sha(new),'had_before':old is not None})
        info={'release':RELEASE,'project_root':str(root.resolve()),'changes':changes}
        (backup_dir/'apply_manifest.json').write_text(json.dumps(info,indent=2),encoding='utf8')
    except Exception as exc:
        for entry in reversed(changes):
            p=root/entry['path']
            if entry['had_before']:
                atomic_write(p,(backup_dir/entry['path']).read_bytes())
            elif p.exists():p.unlink()
        fail('Apply failed and completed file writes reverted: '+type(exc).__name__)
    print('[PASS] SQL files + agent Markdown installed. Database NOT accessed or changed.')
    print('Backup: '+str(backup_dir))


def rollback(root,conf):
    base=Path.home()/'.ipth_mes_updater_backups'/RELEASE
    matches=sorted(base.glob('*/apply_manifest.json')) if base.exists() else []
    if not matches:fail('No updater backup manifest found.')
    manifest_file=matches[-1]
    data=json.loads(manifest_file.read_text())
    if data['project_root'] != str(root.resolve()):fail('Backup belongs to a different project root.')
    for e in data['changes']:
        p=safe_target(root,e['path'])
        if not p.exists() or source_sha(p)!=e['after_sha256']:
            fail('Rollback blocked: post-update file has changed: '+e['path'])
    for e in reversed(data['changes']):
        p=root/e['path']
        if e['had_before']:atomic_write(p,(manifest_file.parent/e['path']).read_bytes())
        else:p.unlink()
    manifest_file.rename(manifest_file.with_suffix('.rolled_back'))
    print('[PASS] Installer files restored. SQL Server NOT touched; rollback never reverses SQL.')


def main():
    pa=argparse.ArgumentParser(description='MES2 RAW V0001 source/docs installer: never executes SQL')
    group=pa.add_mutually_exclusive_group(required=True)
    group.add_argument('--scan',action='store_true')
    group.add_argument('--apply',action='store_true')
    group.add_argument('--rollback',action='store_true')
    args=pa.parse_args()
    root,fe,be=project_roots()
    conf=read_conf()
    if args.rollback:return rollback(root,conf)
    print('IPTH MES2 RAW V0001 | manual SQL + docs release')
    actions=plan(root,conf)
    if actions is None:raise SystemExit(2)
    if args.scan:
        print('SCAN read-only. No SQL Server connection or filesystem modification.')
    else:apply(root,actions)

if __name__=='__main__':
    main()
