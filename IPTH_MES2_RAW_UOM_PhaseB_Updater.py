#!/usr/bin/env python3
"""MES2 RAW UOM Phase B updater. FE location, run from BE. No SQL writes."""
import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

RELEASE = 'MES2_RAW_UOM_PHASE_B_v1_20261109'
BUNDLE = 'c-rl~YjY#Xbs+jzvZ+}S=)sF`Hrec6kVH4BAwh}+=do-CSpW(|O#@Y!Du8T=Ld3`u*BfhFv6AdvujO@UMkCo8J$B?P$MrQCd-Vb1`5)9Dxcd|CIVUr#GV1|=-97T^h9)F7P{_*1$@9*0PF_uUPS35GQ!DIhYTNFbZl`6wINdEBo<1q%J-3$kx{hn+cb&S~+HmZKb$*Bsa_@Wa%9PdaIBu6+v6^cdU6T!1!*$y1+0?gsUe~be&!$$N*?yy{(=P6B2aR&MywS1p{4q3TO51iYVB9<ObB+JpvD9IDo>}a5n>0)RrM&-$nm)7hc?N5oWk-9vD{Oslml-WsLA}pvhU;3U$Bt~P%PgDW?D8$+Tm4n`+%!9^+ccSHx)-L)438Pmt>aqVK67m585d^mnGLh@y3BUmw$ZY_W!8^i3TrIYgAUVd?GZcdx|V%T-`V5GY<fDKgD342{No&TI;Oi}cxEasr@7hdw5%Eecf)}d+NRz0V3syBpsfM3=(4)iXqYbiKr3mP7iP=Lv9gJi^sE;A(1L|E9mg|ao+hmgCThMQfbsdd#wAR2+w*#`c$lsY0QNGBgZQA=GCi97)iaxkHyTdQu0vDXykxsZhh{8)>$py}Wwx=W;}hlirO|qhy<1)Qkvilb*|)z94b!=X<CctClScQ4^E)+Qwrdi8*d*tJ1Um>IxyoO&8Z4zO;21kNd7SeAdX;_$23T8T(+9<OPQO`sZ#pdplf%&lt?3)dM@9I_G59F=`0mPO=Q=&FnL2yp3P&7p1mg(hF|*z2_RoUXVXsW;gW#EK8eR(DO0%zjor5@cZg$0^doW=>l0R3LI4G_hFsBQ^@+aW2)Eif!UI#4C-nhbU2We$q13oj}*b|L2e0b4l!2iKb<$$R*tyUcnkvACdfBc_4{(Z0dzFF($VAGJ$)C~&uKXu%(Gt7mDCus!_5KQ<mVG9vt_Y^SN1jKtjfIO#draIVPCkO1w?RxK6T@EsPuyU48D{zfM6`HWN<#`gGgrhKFW&n&YOeSVQvp&;6Bmm)>-JWZ+<6JI>G;@eB6{Dn)NCrgm9Qm64x(hUaKvX#)LH0Uzcm+xFioqC4OEyqwu+}u}bMrNmrhO;E6f6g(2Cs=}!;YV<>f8L4kSetWv>-eJ76`a#)=zuDq~W37L!?Op1qz7jsPe{D<n;mj-JkwI(wa(Y@&mB@LlVc#X|S#f!UZ`7ikw={^%*=aECYYL%m6esFD$3$0fR^JQ)eD+LQeLm09WD#PAkLId982&4ql0@1$JM_Au~Rr4MMmL5<09-z}&b7kxBup$uM9}90du=0G72${u6Cya%{6$DYA{da;3OkE*%`+wUc$H{f)!D@(Lh+2EXqb9%x1fP7j%>|5PC`(4GeL3=x)|@WuJhEpNv$>hyNQ0KO_8f@0zS08JS}31mXehWESXi|z`ud#x7l+U%B;=P78kX>^SY15O6;B9Ic$kXc`8ebBc^V_@-vG+#*zGzqQqgpP1B{G|W@NS`ZgdcU~w)^_>nG_HX$02RmNeSqRLJmmlJ_Ylo1#Y%~N^XT^a$7QxN{5w|J`to!3_V(?~pO)Fz+0izw7%`fr>g`xwmjF+_H?6w4eGbHG)+IdYx#+wy{BC)RmB09t@>8~Zd-KC>mU?^m9kz3O^Ix~qD{SNT`m;8(0XbRg%U}1{xpjN<IqN#Zk8M`Hz4;r48_2%+{_s;~4?nZn^QOhRx7VNI-<w~s&2@in$mM|h3lyN85=%U9IaQ+tAT72`mv#UolK3np+%`SWI0w)@n|e0IIGS)RY=aYyKr}v@U9UPX#6ZWKK(Cku%ZF_>bGCDtN@qwCIW_?N@U89rX%ZH73m@T2(dJ#pX?dp{BX9=~N>8@mo%WyeeJy?SsJH_UFN{_XzfZHl31<=h<jn4df(a>nQNbS-OYo;m3^{2O7bYx;rO@4;idH1x{b4kW19>D~>N@A=Eptmnm;kvw&SP|Zy65GT@6ZqL$f!LBu(izkx%pIXu1+X--*aVUhuRL4=<$@kbp&v^P*+#@4zOsjU2u7*sFj__B6X;uB=A%nA;XUOizjiv%HJ};w1T1T#kR=>O>l`m1i4_4Kkb<IdAI3LHv@Ky{Z-BRGBhR(rOeD{N_P=5vpKd~EEk`a4p!KcQe|U{Rc>#74$OgV?cHAgUmL7+uz%NX8)moG<fOFcuA^KwyuMx2c2uYx94i#50@{KpMKj=p+Yc0!mI)?e^?+19<Waufp|$eWLk>V{ZCo0l7wD#VPKuB9e%X;TTMc?qj4tQ{bSnQ#&gB%3f(U;QhQM>P@1<fJrE@LXF!qQQG=+=#>+#=HW-tg$7_ggbO%Rpo@H!n(&05ZR>e&<*g|+6FzcyHH_!|I<1A<|5J;R<4KXX|7_U3Ob)+FJ;MFa@}*j+%kXH%LIrz@pZr>#PfdpQt#DD**(i@?q|#MjAVz~9f+5n7~!uLdI^kO>6o=mxq3-!%>*6`ZT#mL$Wtfw0D31M&$Z8jgB3SY_eYEKn9Lqa|PDgco#0Z-n15I-OSkP#sU`jtWlm|LAd&wITllsw&@J|362dI(*1>haX8XzX4hVD1O7gWR-(Gkp7?oKG}wU{`F^RmVLyEN0q(olkJ@ywqIs%4?o;vAn;0?pp6`W>Y@)pX1%)9W8JVhNrxxJ*r?_Rsc?G`_<)EguPep!X7ONCXixfo(g=cf+fU1T2c_6n4eNzj=O)++)5p#rydGw=Spon<07Tyh=>oPDj8TZ~9+^O(;)H)yg@U4w>Hmef@bq-J&0tl3GKg-8ZjglWD$ZW<J5#@^BZd3m6qt^Xi?GSjz}C%k@kU15|MaR#1;nq_*{E8PBt7|rY-V4dR^QT;9R8Z}2;bvW|GwvtzW+G<^K@u)L#miuNOYz`21^*^q?M<(3~8@^TVV)lZ6k(~K5@=_^f#g!cffVDma)c`{BM+&hC)<P($03!JQ)7Z752sVz!>N>Z*P8DWAOJcEmpg|{%MajhrhI&toE;;3DW>(UNt;3cc!B5Kt}~MP;PJj5ey8lH9*u<d+-Op{73ddug`4g|8sb<Roq#J#|HiQ<*#pVKCQ9RyOmOTGw6zM*Ky(Gv5)hQebz}&BD|BtGyam>g}reBTLb?J4oOZljgRrx0V8{yYZFt(H~566Bdideiy*y)b-QJ>s;N*n=pKLvAreghn(#$NM4f6}K%+H2?&>&!HHdAY3#N>8x$K}j9Ud26QdE)lWj2gnt9$5svlLD)emii;8Kz1C@yjmtt7~r3nhtYE1st?Ll8MC0D#=Wvc<`ijP{CK?=Doi6?&-nNPHB2IJaaMDDYSqe2N40_JGv7_CG1m1mHieE58pf8DXy1xf-#jD>DvSy&9KL8dhe*Re^fc$EpC^m8HgJEaJpTFXD>CkgT1XJfJmq0YFJu@NAbr9Z_;jYV{5xSVw)mMEF{cDAk}IjQoYW7Q96y8%D)A`RW2(y?e6fewm}#C^7Gr9{|@?K<@WmHJ)taa?F~OHvkLtks~h5*KdGSW=*R5s+v{IeSmn#lL-aRB`D01ip90s>>R$*LU!@i}iZdX6%@9?MQWX{M^%^zCP@}<Eju_GxeMYbU5aRZ4vY82WN5$^-dwzZTqozFuJ~G)nL3taku*LWolbx9nO)9EBjrMU3RL}`}jWx@qQEs}f<APaU!hczdkIv8tUU@c^VP?=<#05g*2jlUhx6Dg<cjj_zr}!V<V>^4rO|FRr9%Nu2#0to?Oy9M0RVVWOJ5BhqFWg{=mj`Ae?Cg;qvGADz_j+khGwe9%@I<<X(AgE|9THB1k)Dd6yRf%{Tvlei%ykr3_$xpo_1mc~3$-;KZwFr$5>3?dgv(FE`WW0Dp$OXMrRKGW9+8HrI&O*+XxR7UND=KhD&nzybP)ia$ioRb)0`v12XcG;vt3p$!bdP;K4LpxettwQ67-vthabL&(r*WF`aSsl_T~rZEn%srbSPq<_xi)1+jwN>0(a{4y6Kn!6Bi3`9>0hX3y)Fub%8FOJ(cb9mUOmqzYncU6XnV7ov{;-lh+fwY(j!N$>2gQ2c@YWz@TfYi9KslK4Mr+Am%6W_=Ma(aV-Xsy_>|E3ydzns_urMsu3<h46;a}9c7^%whI3|6t)-l55to;-;B_Ll>Xkab)v*0Am9~#7R59Fomw!nI5rSoyF39$b~~9LOCN>oZWSWYHtBTYAleY35edYQ;u6OaIV;705a5X#dsT@uJURcxyJ$MWTN$7FqMA-fu~A=oX>Sy+jk_hZA2KKh!k(&=m(^N8LHKKnWIU-Zn#M8!vbBv?OOd^=DA<L<qe%8Y>O6ncd0tuPfvpWT{+mZdFp>{$Z~j7<&)cX){K<R&_A1gC<>!m<p~kbnb$j!Z4F-RIuq{t$S5VveX`j1nYe6uGYp@jhVLuWPAyWAP-j&}qEPEUEA9gYPSe3u&#5w%7C(aU;A)Ysf|AbG5zd=34hJPr`q<VYv=Um6)9vs#hUe{=sv02x>z5bM4+}?ag{QTNgF!HufuJ6PhNNFkwo-%0K#a-2ikt$$t@|WPwSz(8k-DIua?e(v^Y?C`8zB={qHRySx6}ndf<sUV&KWb!u)X4rIHL{K2cR+LvKiq{+KPaQr0_pp7`}XF4u=3NR_lAE~X6qC{2^RZH#Tpe`twSyxa0@+OH&Y2dMsce10F$KXAn26`ZKlG`x=2805Zr?M%kHqRPYkOC=-hSqN<{QCO~#9L6vhOTCin`WiP<$3z>J8)(x4Ly5Z)UN9EteBnWelgAi9Wlj?R+*oC`hogYvBwkY%ckZ@1}OwpDg0NL@}<!Nf_xx=FJIJVxk-;Mi@t&LuPBKn4prAi3yA^P!mhs>1oOZ!NOWw2f-Z#B&jwNY$T(6wUffwA6(*0!1*}6D>bMW<&%skbjJ1L}=m>MTyLW2!xzWfFNNf_eKuQ69+=s3p{lpfIg46kHoh4C``Y5y0FmmEqb=~LC+LIMP{J*a}cPs?f`HNkZTeaeq8@uHcw7Ec@O2z_yR&tNJvib;j565f%3qYKLs0%1#v}$AtGf#2|#_K>RJJ&bltBCT{Yzn#)%1vT?Y-X+gGOZLAU=^O-E{zFoZS}BBU2x)2<gium99_dL3m#ZIN_RH^WxC#=sQ5qRutY0&rf$(X^QdzlYZlZX2wF&nQs7BT*@+aSQt-q;M+-(o&a5t4V{=t^o1CVpWw*<O13Q6(tL5Dp^c0Oh<8i#L6JxE$v>5uocNtMueXlu50wu5hivO_7G@Re#kd4xnBS^d}0tAP7f7zQ1zw0Dk4Y``mSjvm<nS9WN-j{ylap)k9vJbLzY3w?G7b)sR!CI`Le#I834;4o~N6I3>gVNo;jgrOc2=c9Zji^zH50jc^-=_-pyg^Z65<Y>M;>PA_k<MQ}ZuKXakN`PAl*2mjuF5D@wdTY*W4pX%bi;VXy`BgZ3g&TE6RbT2?nTotaMO+D0dJfm6JQ%|Z4R4BjR^^0Zyd1jpl<mhdTN_0jeFY`(l#Ipygl@xGmSz|pIlrTyYTWw%tuz$Gyge#F0NBC)lDR78R_%x(2<BfPVB@YV+OUpfen@Q&j?ubG%T|7s(M{2Rabdx-UFqAGNmj`SIcdf{Un2kAW1heuE3Cprn6KFL{jt<|gZ^jm!{=~&n&?wLrkI}D~xv-bOso%4wPM(zJyfHx8B#`G!RruPZ*@fCXH@Yi~zU*fT45ZUbHK&pfh%SXHGgt9RJ<qU%A1-y;4ii)XcZrfd4TZYXPUTWvW(ug#IkTp5VU3x68@4a1$?eS4^e|HCw&vavfqz)eO?8R-{;I89qyzA-}A+E5y*ET_o^}Xr@6>d541V;$DK}?`l_^3gOXr7EDWprY05eum#G44a`m8%Sbt})*-9XOOj;eSdVdk~~KnPXOZCdG8piaz${o2$`w%At}}&XSTM0`G@EqW?;)8L8%T$}lmhMf#nIy$Ytes_M1GVYJRGj?8(yn_8PuV!tzLVnl+zYsu0kYNeA@a{sD5z~2=ZlNOE;w4f<UEp-O=DOQp}WVXPZL$u%?l$B@C>^H8&>+d_3otlOx)9E1lKPZL3HSxAQXcD1$Fk8uWJnpm7Uo_7xT!C3XFfK(gmP2Lj;X)`QL&IqnIgw@>4msyP0-#`Scp9ev9zL=0Tl>4R#zLtm7#<jyKKw&Ik0Cq!=y8Qrn!}&B0oq2JdAB#;*JCvKNnO>tz5Z=i<VoD#{0I}Z{{cSQ!;c+SyS@1b14|~T5bL@IDCeFzaisrPBSy`e3{n!~_&|tW@A0ORKgOH|AQ<<m?-OQ_&Dd*K(Haa#_Uh+H)N4+87CL7L&>>V{Lot!lVhaO&<X$Q<BbDoh0^3IwXVK7=inQn}2`is^d!t?tx7WBRpRr0Ye9nH^3z&Gg@<me35cHF@PcdVjo^5Yp<qbUycv1+cxd`bvIucWx7^Hp<Mvz`RHsu2->zKm-Hg2zfxzEa57{q?E!k#)vVVur-w>N)NW8LAe>?ZRwxGw}H{j|m;XW*m<f3H95vlsBz_W{M)!+)}XxG+=c@8Ijc>(qNBA)`AKaG3BZtGZA6FVbrz0K&g=Hd1&tl?jPwCAeI?pyZ^(OVPBjXt23>QGYBMmnOV*q!=NS$*PZLbNH?#O~1Ssq-4SGVm8s#tI$46_I8)}_Cc&hp!F7#lLcKRh$Qp5s!re^5<p*L4^*V!4|SO+?K2|+W&W@<0iaMof0o+7Ep8hf#(9nwi;~7B+FI)CPJ7qrsA+Bd7xM*dUah;04ZN52&+#N^F-9~2I_Vebs-qQ*R#LTTPNb>w!vgiKh_b4}LCa`YpcGSmK(9dtzi80VidLyY9vYr#C8qQeWkko)4-J$|zm86!ROd|H>$RH*tSbTZsRi;7s?HNRCf9XA^68pj+|>^yiTO$VI?efA;hI$C4Y-){Ri13oI@NWAMoHEN_2OUyegEi)e&6Wh>Ajjm&&$&&TtWUIQ;1i>69`0#QWRlDOCrr^pwH;})~QG?wSTG?WGVv{i|8^xZocW<UjK6q1mvg8ZVrEJvkMD<lexWLe1!UH^Y;2z9o7V5|BqN=;`$RSRKjb$zoON)#FO?zJRM1;b2!Z7T&dkTEgNm}6_0PZ<D6S`h%tR+V`UqAS|_n!4}w}5avPerH=lM`3saVBpfy~7X7doX^V^$WS(K-v?wZ`#*yC}&Iy%|@25g*vG7{GTKS&7`t4f6oPv2SxJmRN1ex*y1k``BhY!&7lU;ngYoSR-AD2=zyz3;tHDxV&hfGioTdghq~;|zW(H5$NMWYN-T7aL8hl~AEg*|@OIm71x%RTfdxbhCA*t-VkL@p8FiHejrcrg`By_JMWYgl|tkxFF#C=bNyV8MbfKp2Ng5Y{%$>0MDRNh$!#P!bgz98TKwdGu&D;!`=aAi~m9owdWg_3lN^gl1wk)QKtu;wR+G)#WlR<EPgZk(641b#|o(U?{*Ex=O<MeM%iGz7kKEj>ZZHbK@|jNhTEB8rM|h>Xwbhfj@fD*kj%y7G1Hy(A=2vAth$*EgD+<La0j#srm~A%E}?*}(qCz#yn%Y5|3=L(w3@HOnyU`{nis96WnI>_iT|VKSd{L)a&dQigH?*_J0*6o_s*UB;T%yE+rp5C0|$+M(7<?2z`EJN14z&)2jSw7SINE;J$fP&J_OE0&&@O1v2{kRpOs;u04cpZRVKCy6e(&k+v=a{O>Sa~qBX%wmWL;<QX@%7Z`RsBG2L!*drE=T+8;PgmfRj=Kegtvu$Wv%$hcG8gGx=iAR>EaMXw*xMz@E{KOb!~n<9@%m-FjJ5YraL>nQjb?76>Vt>MQ?MF~E=W6LYO=ooe#cM_EQZU5^D-y$wZIHEmdGb2rtRX^(Oi|^fDf7%8ias8=76aPyre1Wz0&Mm`XbuRX>&|Yo$<31NAH0hu&hLEE4w1(2MP2m%g*``wALa~X{QZy}Xg((yrq0@MFtaNjttmyXoXEv)3|4)?N1aX9>h~CB!aW37f6oJf1fGR$c2_Z26^eDB`9DL<)C6~1HnR6c-rBQ(922x-hDPX$lxWFs3RVF@o7%Y%oE)?<$1vJ}ikKEkZn$vPzk8ynB!y|sDMNe;HSLaz1R3)QT&pv?nX9@sou=-ZudC==}LG<CfCOBb*I_mULfKJ>`@NRO`2;9^m9Z=S+Za+I;VE(%}ID9{MjXsbTsO!@j7iq#~x6BIdiKwj+<9Y_0PW+gJM;KlL|L*T?mn#%tBAy2(ipoV(VV9j4K*oSD-=0<w(w{_#ssfk2Jc#CRKYS!H`(f8*wU*&|s1UAQ5x@qI0t@3Rf1hpa?I1JRvS9B)59qV6Gaksw?&lTf*28XH>FU{3r=Oi;ofp}870nE=JnB7{EZ*!~q3~?#k?NIrShp^;P8y(PF{&?|6^B9RMkhP_Y>Ii^ehX%d{?0l|5L9|r*x4IboHp*W+4(`|#Tgq69_jv@E6sR(teo#4lM?6}c+B{Q-qRSvV+lxQ=G9)e3s$^iZ?vr1^R+9#;-j)p_X4h&9%$=C4OO7!d_fWfJ-lqf^4TSTvE9uUatk4di8Tcs!{i<+DjxH!ZvmKQ76&Z<2(a&=supTLMo!Zn=J}dJ<E60|4+hf~0273nJ<Q_|;jZ*=;digj07+&UpbM-HO)gpmt^IhW(0Osf8lb^vtDqqwCe@z9W@j&fAG*wIf|l_-TM*2Ry%CKe;Zpjs#=RDR@MjBr2>A@5E?A`6Y_5PL8|{^F<gv=i)K0}CrB9_%e3#ghflhm^BmP9`CujoQgibim29K^H%Edrz$>==*LPHq09ovzRpZ6i}nQe<hKS0viLP6gQ*!(M<b;XYyqQ!vP##2<7ArC+w@K7bKuU%=%WLVc5XxP?n0k*~Sl^G4~;?Oby6{)Iv$8>832&*u=6O&w#G6)3k8&{*Gg)gC&3I!GDbA^bgTr3baDR{U@xS`>p_MXygp)id|6U$CUfD?D?p|rsS2Px?6%mAASr{{Gn``J_sZ-FsJLEw-Gn@daLYts{RC#~VbJO~t}#lw8J{z!GbOZhgt!ZuB>=2{){#ZD&J!mKz-RebZ>v2^sjPaD&+Y%>e*v_Y%^n?DB10^|b$*R{GR;6${BR|^R1QQX4_wI!}~ZiOkq6)(5ct8k1)ECt6(bNqwqW~?Afg5mMZOh^*w0@J5H==GhA%E3xfM~;hmLPGTjuR;PbmUAiVR)S}c7Luk+Ttu1Z0u2f;V?CTuM}v6L8Aag`jwkN&{0c);olzOCahp8L6*UF@A_Bu~p{t4_L)WfC7U=+)G$mkx-orz@b!S0Dt2J{xaEOPRrX#CX8Mdmhb8x=!e1<F}ztigyA=!9u4XkAj8TTwO?#pZgz1<-KjMzP1)2KU_S<ALbjTm?8O<Y=7Rxp3uSw1uRhGY$srqA5MK~6UM)H~?V7xAhJFjq+KL#tsI^rNUTx~e0lr`vLgy$6TLLDzvc6Ol7v+m1`8knI^FidZRhB~-T&N7qDr4(He$F`rGz=>i7-uOI#8-=lYu*Xd8~b9tS9nCGuVNlh6t+^qs*>iI8z#OP3dkIv^=>WO7r9>!gb>|N?Q;obwxg3f>U-~SKZH_szat%K2prr$(8-vv}LYdY*zvuKKnb-mPL1WMyde)wPi-~anRV_rOyDk)3BPotNDZnEEBx338LaCai{9>Mv;Uoh^7V5v=qu3<sK3i=8$*gWU3lL+vI74`(fQOHxT^Y#gvjAZ|F3o-2f>YnC{3d#9+DNkm)u3?klzjTd`V9GHHKxE%wIYAmf&^ANb#$pEtpemLQ(2@Dh_Ri);@n92+F)|GH&{nG}o5`##6{m}g)L*1%;VX^!wD6%2QrXtIlv7c2aJCSy2u<h?dB5j%twujvHM^IlX(#tZ{k4oL7O@|tst5%Mm8wA7N-&o|zSerK=fHv-3m=aj9%n$s!Pw|V^4J!pSHq*Gs`CQ$;qmWKW3&d7V|fM>bff4pq{`?g6XD3RNqW>wqZ&d`f*D2VWfona@Mr8I^JAd9i$}-jx7WYuF}q2J$Eo$(oBxcJK`8dBhUdoL>9P9oV@tTBMWvA!!%u4DME`TUnI45fc|xI4^BDE^WbVD05H-yglF0{*X{icIdwoXJ=Ek7p1j@Uj-2_IyPaDubFr9p*Is6y<d?nd(2$O(7aGN4EVdr(tI*41Fo{rJ3)nm1>y0x}CfGlahV0WPTqPQ5PW=-fwUnJl5T|=6d%^}bNtqLvt<Q2ylFcbcGC$1P3IHPwyhDpRrfmdN){_c){qXUpMn{*70YV6&~cA`;qEQ`i0BDUR$L#p_wAJ&e?%eyg7A#OEmP-hDPPo={x-P~u=7bC61nXp?g4#jIdZza<Ecu0?A)aXEe-H3*ZdkHk-IwBtPeqW*yOTE3h!q(s2&!%4jqm*FsS3o2sgy8p&MZRM-YBj$q3MnS}tK!h$t_(H)heTYAFj?tH(NtiP)`@&pmvjO}V-b*WZa-gMNk=51hEcBrU;a16hNSJj8k;SV$V;LpZBoVun*AGBelEjf8KwA`O-Ef%{1KRdXc{D(8_54KvYDc!DE>4$f}TB2a%Xq@@DS_g|L()T!dt7!TsAJu=|SS+Mrm5{<dHxEgRmtYZWZHi^}o3O7xfI5u87r6nK6T&S2@futNwzQ!BDyl1#3Mw`><VaT=5!j6v#WszHtR_0_3UhHU8Ux$AYYhWA8WF%s@e<w4C}w{w(cZv3mE&G^#RH*&2RW-okQ;*MDDTyL+3(9hMSz5@J-nZJc9l-+_5ynU`t32-Qo5v5DSyojT<n;}wqfM$4fR?vdcNP(6%{b|GRWe1YPG@noFI;2TAe%gJN6x9fD>r99|Ydrqn2(&oF^%FS7IB4GYHP#O={4zA?HVh95uH#e=`lWx@OA`>PRJK8Z_t){N@-}2JW6LspY*>)~WIeWftzHiKG=wR|AF=o=E;VG(31R%ZVgA~B#2fg^P+mK5QP2p8HO#>l5$^}p2w%`?D8bJvT*O-;@X?+DNR97drpoXv4<QB+*qqF5CG-9?G$!)e?BS9t39N!J5z2;9_zFW(%W17oJK#etZP2mu+(hIZJ>n6m9)kH;{5M$Do;|IQDM0DzmE)g4k(qZ-6o1cP_$KS}YO4I0*mi}KXmg4@{G}wj?omasq19ri~2*3O_>o&oFG%%L{69~BZ_?)6AbABR`V56y#kzx^B8&xf;DA~;x*tam4A<&){C>XD5)SlN}r-KJzE}ecSdM(A*j&{Ht8FQ?9hH(<o*ZRVD%(jge*~{z#JP`h%*%x8`6`M4(#}5h@P2K4onL{VLz!GCAd9NW?EYpG%13y)^i*p>|sCd|%i#nuUw8Dqqbi6n(2ak)9d-RZ_jtJ72Ee!IHSh0R#*frQgV#$KU9_E{K`W(W+Hv(Di6t#vkcvlWS4}-_VY=pI~kz26HaD+w+_R{EKNk`nr83u}A&CK@UXB8F0Q0>G<X6Q?RcPdSuD&C?*8&MmWXR>zHaB5kB87l~L%3{so$9Pw`b9?<s7s%Cxf8l$#IsC*DIpzY~O2jqZ9QcCQkM=M_7SvwT^MFz19_Blb^codc5gwT0iC*qDAXY@D^npmqB&CyC^+7ykEyuZ8V~GoB6?g>vVqKWy9IX@jd*@iY8VxZ?aL>wvb>Ae@y_W%z1nyuldl-ODkFGelNLNm@B0>QV1U;@nsaB{N*r0)Wm=d5K?}-h#TAU53p(tNvl5HB}nB}hNSTiVeW{LWsJh3Fd;|DzhlzMoY=SZG(W|?qqIW8Q^=NDpuFg8EqOH~x96<nm2PWGxNMBN5Dr`(GW?AtBQK)6i{e2orb6#hleaE{!+@sKAq$!NFbcwVM+w6Vk>*%n}F3y4Z=Dn=(p=nv)_PahmHL)r}$*#QkGkt>9G0~O^7^M<>6)vx$?6iA&M6%|M=U7FFs!!mSUEN>=-Lh0l1l=#?@cu%9dNpM+3;+*tCM+wC5E4Bgc3z%luwEF(^otQ#!gzN)p3^P~?GlNSE<&6#LN@fV$E`b;JT@&;@pZX(=gX*3^yTe{%WIKMZ60{>1U1B?4gACeH^?}4@vJMwC^y5F!Gd6-t#ji7{SA|i7eiY!H`w0qj@$fzo(l@4`5uEd-@G}&LcSr1mw_gu#`VnveflrL6vv)*PGL@nI`t9{Uf~J*PTT9=0^Za6x(9c^<JWosAdx>sjeM9JF1EknzAVDpAd^cC4%kjlUEK#*PB$C^kzXhH1%TMg&@T6D3w5xGd@J1b%#-S;Fei;m<7snx|Fa;*VQ7sZO0XgG6_#@Ah!#f3yvss4d@LikjpjlwCY&Mav9hKMLfmiUK#5M<eTd2nFZ6&tAJXL6d|BOfC(TI`eF`;8>5&jVm?t}+Q?6`splXteUSFCVpy5ShzQQ~xWZ)cOY+yyQ?s^$KU>~p`R_c{5z${Q&C;O_`Ept!p)6#=8&88xHB5-`-w;sM5c9-4>)hTDG~_?(QY%3<X=uKbuy^T-bWU~GC2I@o+_4L_j(jz4E9*!aJu&!4gm751osm}#>5?e$N4@C3_arLkVm)E@$!1oSYGSl3QGWvqO1z)<>b+WIK-FBwK@HFGR%K&cl73_|{=S>0enr(W1*L_0E)@l{YgVKa-PtjAGj_~|(4B)~vD^++;;yK+I}vTGvgsH)#6oRYSb;Lb=)xeF&_Ah58Mh=kWHx-BbP!#~?)Uwm)-_U6MQ_7?o}r)8D`V=+C}5Fc~68_F09gHs&6#l{V2>0L3NS?Q}<2&K9E4`&OEQmk}R@_(N5^FFb@2*6PB!^MFu1c5gN)OL>OCVGDVS!(Yft*6K(`eY|_hj+)g!%e$RJ3X&68@ZG!EGF!#oyhqNIJPLWe8%Cc>Jt0nd&A$L<cYzWgp^Zpz!MpMSq`uIBqN)wMuCSAg-=d6QSs+^Prka>^brq}=sfqrT%pnh*#`@pYK*?>qk{dvz4<ks+Hd0pzhLN&^}ws&g3m$RfLdBc9QQ|0<}>gC6GY=q=tDOYWnyob%0w?$8hKXlmnHE;sUkc*q>oxTl4-xzNTeP}>@-q%n4G~&d}5CM#1%+uevLv~uPl<fv~1W{eqn~&PMy6w{EdN^Jc7_~4u5Gk#hJhxR~>us_)IO($SYt)K!8JNWk<AGc}ByeJD=9D3Y5{$SswkH3PBv>d&1X5t;jo#WG%H86;q{4A$hOyS4ceuC27aGl#x6^Ie)$n`mg@s=}R3kQlv2+FaDdJCeBT8nz;Nbr-@5Rr-|B%!}U+pqs6cAG|?~8rJX2NnqU5!UGO8YjR3v>K+Y6L9qW!dP8=WGSQ-AZjYosmzim@dzu<J9E_21BKTYfBG!xPIeO8uwEuoAGcJr(+%Kr+>$}ypffg-QPEl!{~2)jc+$HiTcry+BrpnfGelXi(x)B_QB*ekGEPdx=pHvk#2whHFopa&4+>btmg-6j=iR5-RclO1VM`ZL6n7-EyL2Qb0m3$>99b;R-P!gy{4Dg^3T<N1eBQq+DH3WZ5@N-_0#yQMiF1$$KM@hga62EM*};2HDrUB{m$Ndq-l0&XO$wj9h#dGyU*AJ&9Bx5C6o-Nc$Gqb#rFl#{unL)Lh+OjR9H+S=0*^-_=~AOS|*3L8R=!VPpy*<iL1tyB^{z8r6W#!voAsCA)<uPTv5Y>=R&kI|78{u3>=lB5=ML5%B@B_q`p;tBGPx7p6{&&nef8^7amPt)n-nBco>&^$smUUf#5FIIJ)xYjkujJ?oJ7vsZRU9i+pS94MCOCh|~v*TnvYBJ`;FwSE<XG(}D85v73tGT6OYpx)x!EtiI?FeBmFeclV&r%w*deTF}?9|#)q4@#h3YB1(C9erulWNRL2&#GoD}Pby6%H6opUq~cqfCysRj)M|aZc~Y{zoHg@Qi}u`Xl{CikKwR!XLOD@Y<pZ7f09uVJ&|=_1x7Cn2j0&8qy})0%{FlRUK#V;t?v9sn)CkwmbZ!&pzl4KkNR%1RKWcs;YJxL>^95$B?{W(b76Gi0PM(;aq`u!n}%%$qqvu6+<M^w(M+jksmfTXh-sbAP<^UEsWnojwsGJKk(JA1VwAqFmo}nL5Ry&iKR^*vuUbXl4YXA3%|zI!262vTS5uE7!e;CW4E}mwOy74R3<BM#ZOg4wx}!yF@6t~<kh*tgt3s}f(;|KC%NRErYOoX-BOVvlE$(EzB<7`pGfUcae?O)DEl_ZM8{1h>(t{d<ub2ok47?8ALd<Z#<8N_#97FSw)5J}WHPICOIb-PzFX>WNWY26`ioUPV~g5phViJvKjR9voVyliHSh;nh6igz#8`~O!K;u8`dGc7C?ORwj=zQK2q!B!a|Ln^1XPoB@E&V>s<JG4R)ayuqePsjjjuV>v0M=2g_9C(Rdy9<(y0)@6nMoRbtV{~F>Rw;A+Jli!#?OGYZ8lWM0UZC0Ke0AC}mOaz8hG`OWg@s4Cv*yLBJ~ExH$qUqv|;=%<<_u1PCmin_bYVWQ4=H=R@b8(IP+rqnWH;NlYv}are6yEIHg6U8f{L(!^+s%9gfFsun84W3CcFE=rpWM$O=kN$eA*@Q&n{x}?7&n|r-14oM-F`~L63<6e@#jo+1Vl4*vu>nmYFwahx*AbdW08XbjXyaO{9y1M2&F=$z*O7NwEatKbUFn7pOQLY_aoamP#2NS+9NGHI4k`5ll`NT&jA<V^*ta7O%<rUyUGt45l&_lY?CilcO&MBCUeA(9Ek%}DTLjp?In?Axv@pO!(#ltg<ci8*;k&N5Q1v8poaHIL<uMN81BB=G3<1-qMvUfwDpnmsD;*ThGSbPW2s8TxEF7Cu4k$RWqOQKP17q1JEw7WL{e~C(JHOh&RDO#TT6#{QGkI{qVD4gGa;Em#hT?eydvd|mu1|J!7BSoKfq@b3)ojmeJd<r>aCyBcmfi@wfgxvb-!TDkF?b3vySd$$s+`XvBLXOL)o#J~S@n5n+hkxnW*zz2q%QG#{zy68BZ+I_zE_9elz5+a>+z_gtfp}(jL;0#*H^r+sZmEyXTTazzm1;JTH&)2N3+`HG{oH&if66e^zd{ZM)9;j<C??647r3pd*SW=oEs2wxL-8dhbSZeD>0J6{SMZ(SyY?Cty^Orc51;%O`PT{F^Xt2a7sdCuH(BUa09t5N|4ID7;czPsm7vH1-Ss2kCh7{MBWM(9vC7m-zj)XCu2VB9+G+gV@+<O&T*6W9j(hQgz)^n99QRWt7MfA6T%6$QS#4xxun`x}1|em<w!{W6t#odJrHMF+ngt4LeiLuv<+Jb?{<ja<4|GjsR<X1b!<tS(JqZ@vPp(`mN*A4~u!zo0)M+_)`6h(p=Hy7QTOJIKo!~*QT?2ExY4TV$u@ig&Sc*knaIX!WK8aZsvE@q(v>ohCz|~)#_gGmUU31IlnT}m7zrb&wg8aL~Uje?-J!RNg7pns_MKnp*9bVU{0)r<nQ10`q+v8atovaH4F#y9^%EWtw0fu5@>1(cSdL9rYG!~O%vOJzYz1f_&ca&~b<5iF<Uw;1O$J=z*_fIP9;`ZhjMo^)E=EU8ygt9DEafhG4N?Nx!e{JE-Wk2oeSGDo5MpD$$BQI;7j4J%8&*kt)|Cjr0>-Ofy`)spV-eQNt?`&-G(p0;{k1&1x&&2h2dgWVQXD;pcmBm)ytx+b1Vg`7yO%@f{<S%G6Y13uRyS`0?{36+6LiPLjB(2pdy637#wU2$C6xt(ga;joE!StYc?8H<J{FSEmmUVmcQ5#hwS^S>Bm#T35rgWAz%d>Sr5{dNuVLE2IqKlXb>mHYT$v?-=dt`CN#~_jtyE_SjVMkXu4nrfjX#g|5{u8SXKXC++@S3e}Z4Ljb{1k8$gYo^Mv+d!>SZm}HB&8&T)j)>h#K24O{@zP+y(zVBM>V@6Kx4oudh%iELu@|Bp5EU4w|%y;bp)`$lI>XH0VsKW_?<m<wMMJ8%@>ULj4VAufEgA%MZ8zPbHq}g0NjG9ASYKwQ0(2%1>1B*Ix<%gTCKi>hAb-nNIz%4`|!u?jYy2iSz47i3RVeu{J(zm!=I@TVEcP-6|?W{y;TA<0zUUW0Ma*)hX1KT-1+Z!(+uC>f@>Y?%YZ;c6SS*Utr1l<#VNeFH8Vw3G8x}jUO0*vOc0jp89gpQ{RImV`Nj9J{0%Vq;Brn-8M+P-H}l}D&0h3S4rJIx&tffp+a*8K>tgLGys7%;`*~Smw$2OVKu4d04ch~mQHz@n2+5!0J<TYH{<cQ9em)g?%e^xdmQvUOer<xB!Wuk$?Ax2qY8gp)I0D^)%7d=B?ispDoLfX?B3FNfGljyx%h2nc=J2x)*3-geUH`V@-^Cbc(c*GYCgbxN3u~KC@WyIVI{efDRqG^8Ku-h+%pG5y4VKRl>DiPPYe8YB6lJVe8j?x~1-V`fKX$M@olym??%uPhpig~8iY*{A8-#_I4wVpt6^GRmeU|j}an3cp4gkb_oU6m=@Yn1bRtu$)Xdv_$ie=geih=Sw!R0kI)3Lb_BQAOk47tbRgqYx@%#y2bpf=(mH-TsPPmCX5r#KI<a+(|dhIy!<Fn>Q((1~ZtfZBLIB$Z)jbNXeyK&0pA7^pk^xXq0k**Ie1++h^Zpi-6Lzx459+?(&(X~t7hgfR=`PejI})8(zYA0Zubeee38J3>^6^5bm>|6tiFTNx#K@j46Ll^aa?Bu!)s67%|#zUaJ7G81PKv;)lbi{HIe@YuW_%^wPr;chC!_U;%k7MC>8%+4$_@{x_bts}U=Quv>|HcT~iBZz*v%R2|feOB2jG4!Od^`lB<ugr?&O;*{i?3CCxd|^*^O7AjJkfL-Dy8UIcl3eo%o<Us;2*(FUZ}AFaLb!!=j-;mZ)1iAO2I11)6Wj}{C7zB;QjNV?F&c=B?!oAVVPlSR{mOD}_25-qPuM$H1lD(nm)Hhpad=}ZZu1x)p`IQ6usJ(PzK?Lv#@Azu`Yv~jz6q<2KOf_XAZiexuwL2M`5kneUE#IAj;k-GIeYi?5#h%kQItwM>BTFAhCi%eE-b0vsAZKl$}F|-ba2aAvD0xKqt;A^Zw|Ur_|F7kG$Udn_$02oK3|WyqbQ!lV#qA)KTF-y9Bi>A@zo;We)Yc46-A+YOOr?}@vdDGf9gyUY=+0mWw+>PUyR;vt6qIKgZ0Pbds+$gG#|M(*C+dt!{JS+(Gdn(T*g^s!{TDy*3DMy05RY9^T*zc+Ud3Ms!AmA$?N8+hlkp2v&xmofP0AB2c@^SOYe**ZWtax3vihc0WLG_l8#!M^1vn7ABi?Rn2v)pRJZN{9la+-fCg+Vj#f5Zr&Gt<t0@~H?m{me(c(j%9>zwOVE=o76)mAqd<1|1>SAER+vg5mvC;yQ9F(Bngl|q875EuZH(+<i(Jfc32al33!AY7wfdy}c`N*bHzkklUy*^lZ+!F`($)xkv_kCV$Jl;ulyg)(1Jnmizb(bh?*{osI>0b}5Vf>KAn*UksX*T&zh*4=IiS;d&;21v|yJ^+yq(aH5jVc@#Jw}~l6X<gjW#f*n1vDzXVj;E;q7t(;;n8Af$e7dWd45`rUU0Ta=9V|=#-=fsSS4R}AB*5G8^%9AQEluMQgJ&!8h#Ife-e3(0x>8CYl?P|gO6xPkG_n?H33uYR)6gZeFUT0=3i>D$-gD0HRfOPHjI%c_mPuU{r>e4s=ElWjz6|fQo-N2QqFmWa$(tZ>)fGB&S!;AARYy!zT^`j|AjIUdq?ej@KV4Rq83HWttg?nJuLOjy+%U|w_Bm7>Z3vUwdupHy>~>#X`1NP_GU?bAB;5*Mw6>J#O02w!9-S8$a0#X8qiDaY_f3`HBch82{>?f_KKTm3P0I?Iu=Ya+J&;>UPnrj4j5hA*3y*<DxVvhSUQ=5LPqJ#k1JcxV<?04#;{KU_Uc<aIewg7rd<ma=CYIAJsNYLyRP42Z4xz(xwKQ-sIdKmy^Yf0A;YqiaTip^&sN(UErWh02?6s9(P+|S;tE1hQhqu{TIYo_FKAYY6K~gJf(0k241_k@8zZx%5=y6weQwu-Yo20p+E2D6KBorcQ!HHZ@bEp%!QulZi0#Rs6$E4d-r=Rhfpdt7+@040vyDzqgPA{CJm0>1c%Vo?<4LMAF*VMolkjE~y<a!kDk*80F}Sz)7CYK!MZu)w@0XoCg>2t&yR7WQ)K!Vk8w-5(cS;&txKq;DTwE#tyOdcOoi!E{R~lc(>`)Y#NxDv9WLXB1C(7d5-B=H|TA3kH%o}w1_d^lVrO4~2rOM0Iqmu>w75^Yka9n(=rU;4nIjIN*B_g$m9If(9a=Df`Jt$Haas(Rb*#}aX&uJP|0`QYSuBlHC-*HV_2fio~$0~b!J9jCMC&K4m5@KV6c;ld^<K=P`G!xbinJDyEVCxgBWq!kR^x9WXOXbo*u~MQ`w8M!5ct_Tp0RA1l>PF)|v7Y8DKbkfYvY+hskshnD#T0aW)clxX7X~S}ha1H*3O3-xVg7`n`N;_Kl}$eICh@p`oaB3lmC`OdC>1x~i=Ad_q{xh|XBkQCj+igAF<vYoVVW_Qtd1`j5PK;Sh>@<-&U!W1X|<|G?DafdB&@{3rY$^-5{rO&w2ThywWuI4GgnBg)&H>DG>v+^Bckgjb4;}qZIXXGtZ)RV2OC~{-X}k1AyCiAbV+vZCA%pB9W}2J8dAiCVexYd{|;A<QJn{SM-@`vy3ITGG|#9I1NF3N!Zuk{+xlgDn&ER&Z?Sl#j*xzZL3QVT7L|UU>>cbDD~X+GH>hfl6L9EZx9ZgU@s53+sqp);9H(1$>SpYvt6IMa7qH3>67FD?Kl|6P76u94yZGYG`S|6)bDYT7k`)o2HAs>)S4zeJIXJXyRfTsWK_QZE+<f4hxC+t;s5iBoReWb5moQK7kt&2A6QvEJ4JO=F;iI01F{NmuK?>37NUxWiPxu`arSOU@>Z;iaScWwkheJ>Gpatb3-a&HKj`^bFxLEGBVf0!`HqGi(hD~iFEq8#WpYE0pPuEL%qtk)^TltHbylK}vj%9bfJOxH^Q`XCM`co@xitb--07XD!X0>UE;{G;L2WD_=njLuE%do9VWxw>IW)k<wP*_vXduG$?-UltCRco5<ehxFAL@$T@f;!O#j51U?#BaQ$@1|9QzeT&BVSCiC(RyZ!7VmrhtDSz`uz_vMm)8vu3mzF>wjk4w{|Io%)vGyiTV7~xJ5J4LDGdoe80C3x)cQFUTJpusbtMX2dDFx34KMZ`dgDL@vt{_#4c7$OBEB3^v3}fRm%xstdF2+Q()j!t=nM@8cIRomno6&5B&k=Sp}LY(+K&xf3DB#Lmy|+d{-l8<)KY&3=+t<09**-hmd$3_me~Tq%AWLWev>gg<5Or*$mppI%}dp*r>Ie_=zx(kgl34UYih{Pvni|o3@}f;i3Ru7A4Ro5wFNyowH>V;8u@A?{H`@X1j54>Y=ob47^>#U3Fq+9DaIA1G3YPyl$ofpUJbM^T`n?4^eS2e9mAFx-L5MeWZ1OYWIDsjV9lrHXj+m;#|4^AaS)~@JSmusKjXUv<UUL3IaF(nB91ZO5O&W48p8~jnqg-#ZHMQnFyq{?C``QF?s3Hq6%-d_+4iQF!!9=+hM|;T-+En2c6n0DdZ1~wEa(n~S*3^gmIdAQx=qIgRhdFX3=x6Zwc2KmV~m{AscT$f@wZb-Axim>hAkvEpu$Byt5;Vff~Q&b5dmw(kJQ9TS{^P2Zz>IX%+T9u=D6V|>KLMxLI|#5!7gZwF2(uWX$__L{Ol|i9LG~p&|*Y*w-#)Qp-V_E9>A^!TLl;@cMcX$3kPEGCyEIyDL^YF=K@~9c^{u7t<vu(!&+FS`=#fvWqP!6tE(mkGaFb8+@H6YfIsR=IGkF>;<v%-MoL#fEY>G}<Y`QNeOH5|^@+x>x;wiTU=7F{b!=o_L@KVBiHyrO@uF#v+>(D{I||sh?AVn@XU%ClJmr^1DmhCAI=UO|2C)U2EU*+}I2^)3CV_x2UM7^zK`X11Qr?wC7^6L?<r(Ap$dRR`_9cJ-(}A||7Xv&1lCQA*#<Qu-9&ni&pk>}{ce;Io1NYU^>Q)#Q!PmfnW9E!{9rdcn<m9SeZBjVq3eyT=wmEuX0-c{D$yop+l>nHdK1)nKBs^kk5+@1rakEzNDtJ#}YQaOXdC1}`BoEW<-WqHifbH~~mG?kMy@rMRxJcU#vIp}XVYfqMtx&3Sd1~=X0YVcc<49|(t18;tB>m`%hQT;*mU<iA?<GtF$k3&Z^fCQ9mMgYak&4=cVUNTNAEFluw?n6-Du_7LZ~_{_J;6p|F|T8i!Q^nhZA_-nx4^79RG$}=JCk2alA_RRoRA)1%$PVHJ>Gx~1p#Y!PcrNnm4y@b<NyXb2J7x5cf7q{**b-RPj|KtD<|xot<ph>9n+R#YW9j)xS}u7>NBAH`9N6_z#F7<WEjD4A)X>;4w?lDdkJ6u^tf=6$e0kw9b0~ToiLUN0V6A{NM;yoV8>-5dstH^J##WSH<ca03qG%gg^9<nYgM4b`DnvZa-g*<W%TLN?tbOH>4D5$U%Qgc25D`{f(xAXF!P$PJ3{s^C0w+QUoQ-#w!*by07l&b?EvA=K_Z!yw1y~exK!TU-`g%%xGnVWxuqr+n12Q~xU`8*Nh4fC6Zcp%{Z7(>83#5PZ-=&nujB#%g~6TTwq820^+a<{(;xIqx1Z8&t{n84(hY^<u({SwlX63vjo;-7t~9iuD_LqkW@Xx<lr?cXt=b1uEhS!GL4?rs`0+~|u|koFtUdM3L$<cYWUYB<>3Y6C$Nzqf@$17yo?m777rS`z(e+Q>W0iwFc(S>!+ZJ*{3d((rRWQNmV)#pT@x@2L6g13Z^M!eg3T|WK)b&5xtkvWB?!_0D<1zBlU{lxup8WpA#lS$jt_@&da_=?X19I~nOmh00E>Oz_CjC|^-P^sr`D^?9*;J0HugR`3(ei(?`t8j>8ay?PZd|D`#dZ}vh^XcddVNX>m06e1ho3pbC1B{kwQ^y7Kb*ZI&G|wm{9Li*#m7h!X~aL9I<ln&g)BAFP&MW?qde9yzfxSNgK&nFSVoK^gJzjliJ{|oN#q@J>Zm-2f6gIloX!?zPB#up#Y$;YP)dzFKfISz$LOO2VMTWeO++r{3t%v4X}vPhh)Lw)i3f;5AL=ePS)riXWYqs2Gg=tp+UMN{sw4kvo0tBIv?(jzTsir*(99LQpcoMObI3R3+uty!tAU1Xs`V;<1=@P6d3*CCi*;|WKXD}a(JN`mxyS<Xrye{8Nz=A`P{IS(YycuPBW)9~Qf>A%yqWJucyWx#a19)}Na;NF5ig_pEl&sKSAYtxjB8%eP`me1d_K}?h|}u`%^jN)BJ|fVsg}6%Iwrcar(4@><6nQqzK)ehfJtxO-uw@?gEu-JG0Zgo6Lz?Vg+0n!zaRPGwCaQxr)Y?gPczJx;y6*@=!g*~T9?Oae<#9E6!;hUWhxQ3W$3Z)NsJpqn_<#0qx_iEVj@Q-e$j*{&zP^tYIqqzQY2|qhjao5@abOCyA1Uz_PS11CjF!Qh|+i*X{R+OIFhg;1ysdhHiv~MZm)k<=A~m)RHW-N1qLFRyUr;pz(gD@V6Jj&5tz|uT>B)8M}wf&qga8`sVdZ!eznI*T_^ZuBWuXSP6BB<9dPUsbP>~GgiPW_@Y4srhWY4tlk1;=zIIS#hqpJsMkNk(@^##TioCv(e)u}^jh(%x^5xX#@Lw=fzG<{UH@f*g^BlK(`rPb$YZbR=>dEUuS@I0ZUH_y8mH{PBeTGFM{t-`mh358+!@Y7KAc=(Py>`b-Y2=m(4MtX~(pUpsq_IXiyc$y%OI_IKSgYahEH&93%PnDQ7q6l53-+W0is;V)*1R5pNW{m21Z~hvYreLJIc&vx+fv<7!m<TT9(Gd_zQ8S@doBX%>wO^l>BGL)HQRaWLe0z$KDC_lQ)0%@S)vPKyL?zWsK7rJVCjADloR|Z55qj&an4yvXb%~Yo&@7(*j}r?Nv`~|dC5O)d&QtSUp<s6{&sQasC39uD}sfs^gKM{T!B4<zcv<~E2JY142?-hXNte7OjIGJ-bbmuI4u4i06Nly0@qhYAeL!+pevsmUd^)Bp3v!Zq!U<CsFM)F#dM-*&LJi^pOb{P#jjP~`SSClC@aKbJ$qb)KLxHi{BBr2lRBm_F){-57J)d^$R&oAB(5M<l#S@l=WB^Qj#uhJ(qj@!L%JByDBWiJ0N<Z%AgzDA9XK2|OFN}XN%uSOOJ748oY2wuZ$d|_DWdak_PFkv{pz%<(H8e)X2!f?W{kd@QSfhG`o<o9ER%a*41Z(X)2LnLzIr*7b-%g`%7%~Fc@uf@@aJu0cDz^$ncnf743+pVzK`|(IB(Vqqr@`IuZlfJIHKU^(~>DpUk#>-DNe!$ql_<LWKq%{#DW_77N{K}rdZn3-}N07Q(muD1N6p$QIg_3M6Dov)Oa@a#rKAv(w6I`j*{?1p)sl2@^c6cC&PxZ)-rGs86GqB@CzP#S$nQ7YaGrmD5f<mXorg79GWgxs=%5!xHzys&>xG}S4^d+z&@Gc&Ib=IlTgUelTyC!)Vw^v=@j5(cQIH9HNrd|CLQhVp6>1eBRb{z7rAyFgNH=;!S6o&D_(nCoG0@#oR%%1N3}ip32bV=iNTud#QP3uIV<e`eOwX91N6OiT(e_P*<EA^E$hO}!ji0pW!CTC&oObiP{(yHOdF5LR@fOGOz<C0XA857Gc$#y)56@`%)-on$bHM|oUs(FZoNdNv&S$-m3!7<Gq8PjW+q!$O6S;tNtH{XOI+5eT=@Q0@vwBdetIz@yMJ(&Bi8*j_D-{ppU$+yksPicMm_xI4m&GvY!weuGlle7I^_9ahD`?@7}(|E9e#aw_Ow)CGH$EtwDT?FTmAeMLd5Q#wgr3#XE~T+xEkh&s-R~G)(gw&d96OHyH2MA!*!c5c7uY0=*;p=jR-hHZ4|*=@9_vA9=y;r>aZ{5GZ*EcBp`sru&UWKU=&wyBc+~;Md<*oKJ9y!6}yZplQzo6mh~;LO$^w4UNf7WiSx@dik_VI*ck_CkIrGR(ja>?2>o3JnT7>N0p)<S&eX$(GekmAh0l}%yts8)wrP1Ctn6R__Tipnad!9b!$`0+d4zk$cve%@^sG9sB8z1<5fnTI#-(6Iyp9qGi;4_5mmc*2Q>SuN4qq6ZW0z^<J)4<ziwrrnB&~oFRs=S)I3rF(Ja!I-LU=)Am=)|y&uthrQ|OQI3L=tge$cZ33{J<S0y<0-#^u1Tnhk^zZklEHFzyxS@=g;bZ3HL0h>SL6QDl%<T48AVv++zpLg*;QP0Go>wu(DXvWDlG?P{wpgM<)^vwQ^^*6i2myc~m({Adi^x=XXwqG_%3$(~7z{*2|>8HRnHA#~n{kr@vUKo9{JltBYnj*TkxS~eZ=bgilkd*Uz(hNHtaV7Z*^Kwev(C1aszJva|JzD8_b?i<3o)rzGapPW&!h6SCUT?GLd2uQz7W=4x5$S{5^8YX8?HQ;mVG5hg;`2=yg*6P)19C`A;GA&4EIy?lO&r*F$9H#6r9;wLM*14cd^bnXRE)7sQs%FjTd4%im7ub&P{3VkYnP;zUdlHk+_KyO7#ZQw0g%oxRn67J5A!sik1l$22YMNPoznmvTmtkpV^{SK8xapZdZ`^lJp2p@8yJ6R9W=OLs6qRg#b{6<}1vwkWrU7vyjb$+$4Tzg2!UYQg&c>TCdp7<ETL&mtGx4$r$<eS^kBb|pfzfc?W+JPH!F(>VicSNH;{bF({t0jdf&r93R3g?1`-++(5Gkf&WMM5J<GKuwI=!3_8E1?Vm*~C>>>t@)+pMqh(@WR#_|_o@%wmQMr6B?HO!+)jDgOgN*-!ySk$`v-$SY&FO~Ij%U!tcdIE;aDO%vcKBgDXraatEt#0H54pek4k0$PG@n*v`A8wGe9hstwy=yCyzt?u8aT@w0$5dQu-tbvvUvg0Q%OwPZf5mU%OgM0y)#eXRZMici#UtIIZMWXyQ4}d=i=oTIcD0D9!_I9CAm?2P5WTc0vgqi+|92AJ-VIm1;;!w0B@@I+}&bJM_2MW*!J&afe4t43c&oSqQaQOaxff;?XD>05<Mx-z}QZkOKxgZJ?G&U})x#I;nC87W*$s|=9K!oL0ApKPg%{-*bU(P5U#x$x{3nl@IjlgnL5r_?WTu%e3M$=SzC`H;+qfN7BwS&c2RIc8{($$n<LpNO@gTtk%ngS2{txE|DxWRXMgV1A#03}pI87Yl&$)GJ(cr>zdV1!{IBry>Loz3y^{{0b!<N%8}|H#Tnt-3^6A&2vTy7=;iWzcS5O?Z+G@S5<F!n$BbK)j;p5z^bQ1@F@~#{rF(6WY-$c<gTUISIYbg(vPxi(zfort8>9v66uNP#ljdOixOnlzMJ0PpVEnqWit?fx3AX&NV=MN70K(3R_02ir=|>M<^k*@kyfIh(883WzW(%Z6+PC61=>hg}@h@Lj4G_nG~mtsGf`VpaI{cJk3*CTP_xOuj|<BBq<BH%y`c=&X%N6Ab&*P7#JPjImlnpC;C1RRHsz}n^e@fNhuXj6dkx0utsWx6KT0$2j;me{3*0749&%#W^xRHj|v8l>)hMoctahoO~3V2+I!Pn%pts2bd1MV)2NRln?B<z!&zR)b&01&4UI&U%d<J!fNIOIpXY_NTnSVeAxEL%99UBd=XYwg9<a6Ur3Fl>M<kAtfIEGBt;(jTa$xK@|JZKlbFzSxe<6d>z@&zj$T~Ijs~Au}zcgIbeC1-KtOt9y<;PW84bXe5AWb;s2;V6TxPa@x*z-V-rRf5R;|&maTM7XS89hP<$-KC~y@JXDyuRqaZaa1syWlRUK=F}*oyf+80u9_rox+mbW*fCHgKlI8MR=XIl+4$@ukL~<Yt_M=L&eBMflaq#JhPW`>}}q%+eDEYCv%XO0@HAMfMmq^NG=GeDsges?6jOdYBKl$SicY)uCQxLtL!YB#Xfbtg(fR>HKF$a+ioJ)=jL;r{Dh`mLmd|zqkY>py9T;*s8b-a7LXJ5CX5r=)thYBaGztbKB6Lgl}umqBh}INhTX>Go)QMtR(k-XJg6VE78svYS1z9MRogV{ICW6pY;Md%lc1s=4Kby>Z}dON0t?9kjb%G1p|aKN#f<LS5SbOeo<gn;4sR6Cpl$`7k#W1dIg$GS<P^v+aZDaEl(~x7!TbRNvz}rhiG*LT0=j`fPtw1He`FG;h(s4*Z2j&}f57P!AM<A`A(w!11B?{dfQ4s)t#g(?Q;Z#8SyF<dV!ImRRrqSGS#{>WMoW~jxPnZc*+rZsu?^r+0Fj8zk1&&bGB8=ehC<Cu8h9CDtm98T;jU8E25v8ktB6J!AHBf5^pytgumbJ2%=vW4#0i-<fdb7@nYIPX2>8NZ2pzLNRtv}^3ui88)vhKIxMBuKO3bL&>BYNw3Sm+zpCY=+Y29{+vBdNYJss_oPPfaOrFVHx;TB*jm7kV&_GlmpJYer!nsQqgkrnjeE(a$t64daZO^%f$k3XBh>E>$%A{ojfWa6p;ttaShq*)9Axb%<TJtB8B#f0<A*MD<NWP?a49>VjCkL2))(CiFFoDA$0&Kasx<B23dX(NYbn?Qy{M~W-rjJp6lqHa%k-4K*`WW6f6`sU_NPJr2@3j640JyT4s9jEJ&M@M;fgueMR!QgRR=&UZT90*($s&<Ud9kOnqCo(dr1vWSm(vAx+hFy@W7b!h(_d+M+26kM4b3+k$@>DhxNJ+9d4ocrBZB)=Al&<Q{z0x5o?^XEDQJH_twIfRlHZ^}pOUoblCX;GR?8k_Aaj6stPvL^W;2j^C!=`23LMMXnZ4jc88!s+-)JX~VghPlNj@;~%wGxB@qFQGF-3r!W;zk@Xp#45@V;jwsuJM9q@{L2rNnSn_T0_Tl@vsxY-DqH~qE%n@z%}McJ;=+`4hG0Cyzm10o^5o1D|d4gDl7d{q|5=~wFte$5eH5K4+oHkkg`A<fp)b#Ex-#Jgey6YCt>D}RM}Bm_ceJjJHjLYi(CL8gPgcfa6lnNoepC}vm7D#`2ttc1Qx9_2lmmu#KRn5{<smaag7Fg-dz~gA20BIfbQ-1hOy6bP-R{XbW)XMrDx7Jp+oWzrFPAsS2-{dt7;?zt3B=p?RD7Zx)el)-B-0wJ+;v%M%4A`ObPJPYQR>~p_1V7s6mZWf>2}Q8-FS{9$y=$xZrC9?xbU^kphxl;p@b~W{jD7VQJBvH;l&O!rV-uFkh=J8q13hW*;m+s4Xql9?ThwwHdQIyU>_3XO?DX7Yl{Og=%%Sw%Ay#<77x{!p@cp)dzD6bM?9EgQcZeW4=1SI8&WjUYIG&SB<%a#=QApe!-kI3lGdiV|JlxR2vOr{=uTLR9#wLny(TxW0w;n&O-}Xnq8PPW)=&}jiuVMSv3}y8^(i~rG=RpSQq>$JXl(str?AFbIzQr7Z%L<#?1VzF*{pbsxDURW@sS=qcK-oG8+Z6_F#EovHoD$crZIVQ!CVK=7U<TzOYb-71aujr3Zy&vrwIZ{b?-CE*nO5acM4QA(K}mP*+u7T6$nCG?uF7g1I!mytuURV8(<cF4t?b%Z>S^nZ}GUztmWO<;*SAYjaD>RkOZm03?<kEHBk++Nu^7W@i^>8p}%n5Yt$M<u@KQ%=+@IQ8&%S1#@n0VX0OxR2R$#^+KUmU0kj%0<31L@Oimz)}{tu!3k;&HVL+=vA6_qTUauxvokXb3k!3NDy+3uU7D>L^Yb&yh5F*`?CkRF;^OksT&+4YTP@5lnhzc<yl%6{Se~D6EEbmL8Vj)ROG}H!%t8TX)G(J83yp=^+=E3R$>rMogF@AKuuxs9*9r^O`MKE#i`BWg*&1y<*XJgKQAoqXIXtr;-pgj$IR3%1*+;~(V-2;iUG{BcnJBWpEv#9vM1igQk6~Ipw3#`V`?fr2Ce%cm7hc3pFjgn#Fa9KFpqg~>``O(X)F=&pHQd>RRCR{a7^kE|o41AN<VKUCE7hc~wCW$2NH?|=w+MqtkWtmw@4VSrcK?2`ulMhhIUcwDD~f6^ZRvVm>fEGrXxoJ1byYZCP)ia1J*k**!7c(Hg<>%lo}@lcN_+fl4iy~7jT}yiPNcx~rMrc&#*^Te6NJZ8iLPJV$#b*21BMU)62GaQfT@$a3992My=oHnr_}_+2TEz6nEof1AIDRX90lw?Hf#!i(8ATGP6mU){|8o^oG1'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def load_bundle():
    return json.loads(zlib.decompress(base64.b85decode(BUNDLE)).decode('utf-8'))


def locate_roots():
    fe = Path(__file__).resolve().parent
    root = fe.parent
    be = root / 'Interplex_MES_BE'
    if fe.name != 'Interplex_MES_FE' or not be.is_dir():
        raise RuntimeError('Place this updater directly under Interplex_MES_FE, alongside Interplex_MES_BE.')
    if Path.cwd().resolve() != be.resolve():
        raise RuntimeError('Run this updater from Interplex_MES_BE.')
    return root, fe, be


def target(root, rel):
    p = Path(rel)
    if p.is_absolute() or '..' in p.parts or '\\' in rel or not rel.startswith(('Interplex_MES_FE/', 'Interplex_MES_BE/')):
        raise RuntimeError('Unsafe path in updater manifest')
    dest = root / rel
    if dest.is_symlink() or (dest.exists() and not dest.is_file()):
        raise RuntimeError('Unsafe symlink or non-file target: ' + rel)
    if not dest.resolve().is_relative_to(root.resolve()):
        raise RuntimeError('Path traversal blocked: ' + rel)
    return dest


def config_url(be, root):
    key = os.environ.get('DATABASE_URL')
    if key:
        return key
    for f in (be / '.env', be / 'app' / '.env', root / '.env'):
        if not f.is_file():
            continue
        for line in f.read_text(encoding='utf-8-sig').splitlines():
            if re.match(r'^\s*(?:export\s+)?DATABASE_URL\s*=', line):
                value = line.split('=', 1)[1].strip()
                if value and value[0] == value[-1] and value[0] in ('\"', "'"):
                    value = value[1:-1]
                return value
    raise RuntimeError('DATABASE_URL not present in environment or backend .env')


def check_database(be, root):
    # SQL metadata ONLY. Never echo connection URL / raw errors containing credentials.
    from sqlalchemy import create_engine, text
    from sqlalchemy.engine import make_url
    url = make_url(config_url(be, root))
    if url.get_backend_name() != 'mssql':
        raise RuntimeError('Expected SQL Server (mssql+pyodbc) target')
    if url.host in ('0.0.0.0', '::', '[::]'):
        url = url.set(host='127.0.0.1')
    engine = create_engine(url, pool_pre_ping=True, connect_args={'timeout': 5})
    required = {'IPTH_BOM_LIST': {'IDBOM','Component','Unit'},
                'ModelConfigs': {'ModelNO','JsonData','routingData'}}
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME IN ('IPTH_BOM_LIST', 'ModelConfigs')"))
            found = {}
            for row in result:
                found.setdefault(row[0].lower(), set()).add(row[1].lower())
            for table, fields in required.items():
                missing = {c for c in fields if c.lower() not in found.get(table.lower(), set())}
                if missing:
                    raise RuntimeError(f'SQL schema mismatch: dbo.{table} missing {sorted(missing)}')
            db_name = conn.execute(text('SELECT DB_NAME()')).scalar()
            print(f'[PASS] Read-only DB schema check: {db_name}; BOM IDBOM/Component/Unit and ModelConfigs JSON fields available')
    finally:
        engine.dispose()


def platform_checks(be, root):
    problems=[]
    if sys.version_info < (3,11) or sys.version_info >= (3,14):
        problems.append(f'Python {sys.version_info.major}.{sys.version_info.minor} outside supported 3.11–3.13')
    else:
        print(f'[PASS] Python {sys.version_info.major}.{sys.version_info.minor}')
    for name in ('sqlalchemy','pyodbc'):
        try:
            __import__(name)
            print(f'[PASS] dependency {name} importable')
        except ImportError:
            problems.append(f'Missing Python dependency: {name}')
    try:
        ver=subprocess.run(['node','--version'],capture_output=True,text=True,timeout=5,check=True).stdout.strip()
        major=int(re.search(r'v?(\d+)',ver).group(1))
        if major < 18:
            problems.append(f'Node {ver} too old (required >=18)')
        else:
            print('[PASS] node '+ver)
    except Exception:
        problems.append('Node.js version unavailable (required >=18)')
    for label,path in [('FE',root/'Interplex_MES_FE'),('BE',be)]:
        try:
            result=subprocess.run(['git','-C',str(path),'branch','--show-current'],capture_output=True,text=True,timeout=5)
            if result.returncode==0: print(f'[INFO] {label} branch: {result.stdout.strip() or "DETACHED"}')
            else: print(f'[INFO] {label} git branch unavailable')
        except Exception:
            print(f'[INFO] {label} git branch unavailable')
    try:
        check_database(be, root)
    except Exception as exc:
        # Print explicit safe schema mismatches only. DBAPI errors may contain credentials/DSN.
        safe = str(exc) if str(exc).startswith(('SQL schema mismatch:', 'DATABASE_URL not present', 'Expected SQL Server')) else 'database connection/metadata verification failed (details suppressed to protect secrets)'
        problems.append(safe)
    return problems


def planned(root, bundle):
    m = bundle['manifest']
    updates={}
    errors=[]
    applied=[]
    for rel, meta in m['patches'].items():
        p=target(root, rel)
        if not p.is_file():
            errors.append('Missing required source: '+rel)
            continue
        current=p.read_bytes(); h=digest(current)
        new=bundle['source'][rel].encode('utf-8')
        if digest(new)!=meta['after']:
            errors.append('Corrupt updater payload: '+rel)
        elif h==meta['after']:
            applied.append(rel)
        elif h==meta['before']:
            for anchor in m['expected_interface'][rel]:
                if anchor not in current.decode('utf-8','replace'):
                    errors.append(f'Interface marker missing in {rel}: {anchor}')
            updates[rel]=new
        else:
            errors.append(f'Source hash mismatch {rel} (expected {meta["before"][:12]}..., current {h[:12]}...). Collect latest source.')
        print(f'[SOURCE] {rel} current={h[:12]} expected={meta["before"][:12]} after={meta["after"][:12]}')
    for rel,h in m['creates'].items():
        p=target(root, rel)
        new=bundle['creates'][rel].encode('utf-8')
        if digest(new)!=h:
            errors.append('Corrupt docs payload: '+rel)
        elif not p.exists():
            updates[rel]=new
        elif digest(p.read_bytes())==h:
            applied.append(rel)
        else:
            errors.append('Documentation already exists with different content: '+rel)
    for rel, marker_text in m['appends'].items():
        p=target(root, rel)
        if not p.is_file():
            errors.append('Required documentation file missing: '+rel)
            continue
        b=p.read_bytes()
        try:
            value=b.decode('utf-8')
        except UnicodeDecodeError:
            errors.append('Non-UTF8 docs: '+rel)
            continue
        marker='<!-- '+RELEASE+' -->'
        if marker in value:
            if value.count(marker)!=1 or marker_text.strip() not in value:
                errors.append('Documentation marker modified/partial: '+rel)
            else:
                applied.append(rel)
        else:
            updates[rel]=(value.rstrip('\n')+'\n'+marker_text).encode('utf-8')
    for rel in sorted(m['creates']):
        print('[MARKDOWN] '+rel+' '+('CREATE' if rel in updates else ('READY' if rel in applied else 'REJECT')))
    for rel in sorted(m['appends']):
        print('[MARKDOWN] '+rel+' '+('APPEND' if rel in updates else ('READY' if rel in applied else 'REJECT')))
    docs=root/'Interplex_MES_FE'/'docs'/'mes_agent'
    print('MARKDOWN INVENTORY:')
    for p in sorted(docs.rglob('*.md')):
        print('  '+str(p.relative_to(root)) + (' [modified]' if str(p.relative_to(root)) in updates else ' [reviewed/unchanged]'))
    # reject partially applied packages instead of silently mixing states
    patch_rel=set(m['patches'])|set(m['creates'])|set(m['appends'])
    if applied and updates:
        errors.append('Partial patch detected (some outputs already applied and others pending). Stop for manual reconciliation.')
    return updates,errors


def atomic_write(dest, data, mode=None):
    dest.parent.mkdir(parents=True,exist_ok=True)
    fd,temp=tempfile.mkstemp(prefix='.ipth_uom_',dir=str(dest.parent))
    try:
        with os.fdopen(fd,'wb') as f:
            f.write(data); f.flush(); os.fsync(f.fileno())
        if mode is not None: os.chmod(temp,mode)
        os.replace(temp,dest)
    finally:
        if os.path.exists(temp): os.unlink(temp)


def perform_apply(root, updates):
    backup=Path.home()/'.ipth_mes_updater_backups'/RELEASE
    if backup.exists():
        raise RuntimeError('Backup directory already exists; inspect before re-running: '+str(backup))
    backup.mkdir(parents=True)
    metadata={}
    for rel,data in updates.items():
        p=target(root,rel)
        existed=p.exists()
        b=p.read_bytes() if existed else b''
        mode=(p.stat().st_mode & 0o777) if existed else None
        if existed:
            dest=backup/'originals'/rel
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(b)
        metadata[rel]={'existed':existed,'before_sha256':digest(b) if existed else None,
                       'after_sha256':digest(data),'mode':mode}
    (backup/'manifest.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
    done=[]
    try:
        for rel,data in updates.items():
            p=target(root,rel)
            atomic_write(p,data,metadata[rel]['mode'])
            done.append(rel)
    except Exception:
        for rel in reversed(done):
            p=target(root,rel)
            if metadata[rel]['existed']:
                atomic_write(p,(backup/'originals'/rel).read_bytes(),metadata[rel]['mode'])
            elif p.exists():
                p.unlink()
        raise
    print('[PASS] Applied '+str(len(updates))+' source/docs changes. DB not modified.')
    print('Backup:',backup)


def perform_rollback(root):
    backup=Path.home()/'.ipth_mes_updater_backups'/RELEASE
    history=backup/'manifest.json'
    if not history.is_file():
        raise RuntimeError('Rollback manifest not found: '+str(history))
    meta=json.loads(history.read_text(encoding='utf-8'))
    for rel,item in meta.items():
        p=target(root,rel)
        if not p.is_file() or digest(p.read_bytes())!=item['after_sha256']:
            raise RuntimeError('File changed since patch, cannot roll back safely: '+rel)
    for rel,item in meta.items():
        p=target(root,rel)
        if item['existed']:
            atomic_write(p,(backup/'originals'/rel).read_bytes(),item['mode'])
        else:
            p.unlink()
    print('[PASS] Rolled back '+str(len(meta))+' files; backup retained:',backup)


def main():
    parser=argparse.ArgumentParser(description='MES2 RAW UOM config updater (no DB writes)')
    modes=parser.add_mutually_exclusive_group(required=True)
    modes.add_argument('--scan',action='store_true')
    modes.add_argument('--apply',action='store_true')
    modes.add_argument('--rollback',action='store_true')
    args=parser.parse_args()
    try:
        root,fe,be=locate_roots()
        bundle=load_bundle()
        print(RELEASE,'— Code/Markdown only; no SQL migration')
        if args.rollback:
            perform_rollback(root);return
        platform_errors=platform_checks(be,root)
        updates,patch_errors=planned(root,bundle)
        errors=platform_errors+patch_errors
        for e in errors:print('[REJECT]',e)
        if errors:
            print('VERDICT: REJECT — no files or DB changed.');sys.exit(2)
        if not updates:
            print('VERDICT: PASS — already installed (no writes).');return
        print('VERDICT: PASS — compatible; '+str(len(updates))+' files to update')
        if args.apply:
            perform_apply(root,updates)
        else:
            print('SCAN is read-only. Execute --apply after reviewing output.')
    except Exception as exc:
        # no raw DBAPI exception details (may include connection URL)
        message=str(exc)
        if not any(message.startswith(s) for s in ('Place this updater','Run this updater','Unsafe','Backup directory','Rollback manifest','File changed','Corrupt')):
            message=type(exc).__name__+'; inspect source state or contact agent (secret fields omitted)'
        print('VERDICT: REJECT —',message)
        sys.exit(2)


if __name__=='__main__':
    main()
