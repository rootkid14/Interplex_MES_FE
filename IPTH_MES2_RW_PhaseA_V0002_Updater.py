#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MES2 RW Phase A V0002: installs manual SQL release + agent documentation only.
No SQL Server access, no source changes, no migration execution.
Run from Interplex_MES_BE: python ../Interplex_MES_FE/IPTH_MES2_RW_PhaseA_V0002_Updater.py --scan|--apply
"""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import zipfile
import zlib
from datetime import datetime, timezone

RELEASE = 'IPTH_MES2_RW_PhaseA_V0002_20261111'
B85_PAYLOAD = 'c-pO+bx>Se*QXl`u0ayq-Ra=&P2=tahv440J2b&9xDy-#1cJM}OK^uk@L-eootnCJ^UeG*b?>fo>eN1Us-CK~&RYAo*51lsICxwD0DuIb!m=?4)Gzs!4G#c(#{vN4f4>FUyP7*Y+L}X*6r|LQ#HHBGj9raQj9tvxT%2r;+#G*T&0W|u+1c4Sjf|YlJsg~Eem^X&U0j_#+1S~QlvSl9WThm)tiM0s)z)*_;>Pv6t>$$IOMy^ut%aLI$Tw_dJ1y)iXXHz^u^Y)5+p$3FtWVcM2^6a~;w4<CK+H(y!_{_|t3!G%E%v%6oAc}qoBE}1VVIM)VWtyjYfEj2;BU13b9fN<Cd?`>pT^D-<XGxK0u<&%V6-(FN4%MMNJgN!q2qZ6T42BY9x<(Jh6~EKLC%yh<|2j4UrGK2#8sIKA~0hX%mt^h8T3j7l6A=7G<|XLjwyKEG1`x?ZqtjLJ_3M&)30%g0rp>FYk4~3O;ac;+7KHai?3d%ol{*oh?fY|*<3d|n~hp0S(Ya5rcbtl5s>=tr1+-4kVA}NX+fl86vfDy%8JwqDOmgJqA6h6%QS`5WvDrtJrC{s4bd?UHA?DT3%IqON+5#_W%fZ};UR3e+jjqR%tPB*XOqyxwen>Bk5fbCmMi35oVh}xn2>R}AY*P_GNMW^qC{LlFGV8TlJA<(W*#|V;wu#`!J*1{cWNK!9%JE|eli8uX~caeUibwr0EU@;M2ul6l1wJ~IKdG`xm1ht0V$WxTh5Ydgl%mj?YsbEx(MDbUAc6u@)Sksb(iqXNq1pH4>}2dXUuM12}W(!0~%+ep#4eT(iB11+g$(nwComH9N)H4lks}TI<yI~n}}w%Nao)A{DCNNb?6VVleCn;1H4Z&@`k$QD%rT!?uwO+oJrpz%(_6ZIG<51WZ7s4Di<;KT#?nJ6SaZBO{~XZizGH)9QGZx2o#D-+$C3bjI(Ys@|?%8S#lr|pFQAa0#4*SZ*N6n*BRAb$fFRcPuH8Ut1bGXjA1tf5ZQnduYpuy`tEgIGnI!hUd4)tl1HOufvmOuY4t_|ziXB-iWzkgiNU^?coiKjngc>|FlXpXy6EivQtXZqVLz+FsZ?Oe9fY4TuG@VnWqkXIx9AaQ;9zRfNx_Jg8S|qw+)jB)ZIh4{p8>MyUSrEO@3djUP_QsBVOrn>*Cy=+R%<9>)IBv|Y4?4@G`i#sMts6Hj;~z^a@Xy*CzT^L3J*vN<BQXg##z<LiZ*a5a-(NCe0*=C=9#W(F7w61HYKza)6=G1+L*ryU$WLpJGNgKbpec}j8LM@2aLAz3Cnm_x(^#H`D8(0PxdT~%P1sQvI9R6rA?uN+_Nsm9IPc%VhSabmrxlHG5-Z<@m)!lo&JHk7T%rskSB@vqbTW|<{*gov(W<?PN&#VjtQ*ACYbtD9sK2tH3>zyqpu6;d2sgi$wkddz0HF^V*3Z%52K74;T(Nc;vFG`Q0w`N1-3n}tK$`<;i)5QHE)|_{x6zsRr8I-x?U!hBWIGw6$OOJt#QOlc=5?F>RL-(we?Sv1s(f7emP3>S#+9PM&E3?DT8fQ25(Wmh6*xhEKxD-*n2)Bj<F`Q6}A54I5;gY9fc8&KwtzTe+*H>VY~RKmRA?#%a{;jM%~53p~H+5rlfkX-=emQoAWeD5*I!}H(ken4COofC9H4vjIN@qV&^DV2b*bHiGaGcP<=x{IM$(BaV5*$Xt>(EY$WuNM3B;MTS@tEc~Fh#H1jPI05CxMI|u&bJjh`rrmQTl^WP+>qZhX<i|@Cu^(i&kI2G%_AXfU2CW=F<X{MjH5!t#@I;Hk=WJwooJN4M}FFp-(B3p9W7>h3jn|ZDJ8v8d{;5EaxAck7|PW{dSzYc%6>O2w0oh5ni6B?uWN-bX2V;7y^3vD=w0sERYOB7b0BByg)WilTgw^Vy^<3q2BCH&RNa9&hn3!L3-ddzd&UeL1Xw|?vpm0_8g2{Bleh<cA2jCR#K{Jsg$Q8A3Wg)w1;6G~`ordLj|BSQUzd~d{5aaS0u>cH%^2cJ=f<G6K_XO39b((U+nm^ocjk(mKD+B;VTwO`B8;<F+Mzi_A-Oglys$O}Q;m4{!LO@i&|`}Lcqj`W_NK$^BPq;HE4GSV3_juJX!CBksF@f5(4>jCgD0T+W)yA0MI_Igy#B}eZw<5&XnS&s2JHQ#~*I8=a3)aQ!p_Fo3Qxvdi_)kHzINj{WvzE(&>tcNsuhzPAKr-U+&v=41PZ&mQUarX~!2H<^9(@?`dpXACEv3@iCRvgb}5l`R{E9+CF+O*N#AL~F7dk-(*-qU-XmWpCRw1#aipD3)Rnl-EO$aB?|q!FD~Y~1KJMExVuBs#zwE}MvRpm{x&IfB89dI7-Q#fZPz8FK_$>rz^S35s~m?!y&2K(qx0me7wE5cFvGM#dNq!`cqXrq2Y^NLjeHt%P^e{tPZLICGqBxq97=Ub@$>ph{SfyeR22pPzgOUY9+zh#pfso4LHn^L9KF2IIttvK9GRW2N<GXZ~Wr^7R?P<&ch9R~Z-_F_La$(CXEB1I4dwKK~jbr<*(RPF^n2vs{tO#8cw6Wed-iGbMt`7`I;78AE(5?LgAQwB?tg(e5-)U>CDqR+BylP=@MPmaqT(Rj89$KZ5#=J-9mW;k^idzXaDVa`W7UhS|4cM!DH*{zw&K{*f#f<T|=RmWm}EXTHO-jV;shICA%>=nQ%t;u-cfZuK^+EW2*737*Zz<o@(ji`r;ZJZXZ8nr{)hI~LmMA9uOdHkV}<{HAvi2KuTUrMB&eLl`8LHq1eUb~SZ-sG1FrcwmX{&++z)+CMZ#8guQiW6J~sBCX{;+t`5D8*PC%wXDUGunbiS8`pL4+iBOlfg<uuIi3b={?Xn+sL+Mi-Aj*Qy3;T^WK?1Y_6Hva_<qPnL(OYYnlVFAUw~mXk7c?){Xa;5k)NyRWEMV!_N()v>E#Jl#VG-WjjAv?th+cE#SUf&c3z*TY#J!SXl-ynf+S3XeKS`AgM-52@W$q|w@JOAS1@$d{lg>sd%?RhOap><Q<Gx8ICQANY;Q?0bTvdG_zlwn()d+Q5c695)5qFNqh3#o$!<M&RVr+oEbovoYXG%FF@E;6T<hnaU#+gRR7CNQS<QZSlnDr6Hi?Rtkcj(5P{SbFhWmzjwn#rs@X?Px&HK#+(49jofjCn7&4)<(7|SxQBnwQ{=wzsf+!eN~+fuCTbSlgD@a}F1i*lcv^>)9&28`2`-zl3m04n~hPlMzI!EwqCdiTqcmsf@OlgX}NIp((oYAyv$+16*HFN^)fBv<e@10~I$H|X-JSV1I@mt<vDPpXZg4L=JMT2~p-SArG8V@X`mAu{H2UrZfU%Dqf(B9q2Y)7f+RhN08YEE9%SHV7F@bQYcTmWLv@H_p3Ni^Djaw>n-a<xX*<A2WNW{H-A@ZMi8kUn|vhfWH8ky~vy^%^OwsZpgHJ3Tax7IZ;xy=&SFtBbWNb0%WFt28Goz5jvr}F0+(2fy^=kSmJ=N1NO!UfiI&7lqgi!P=nM`)BKh4r$tiok?EMNDq~~Z%Ok465R%P}0$ax0x+T(8Vzq5zC;X*}U)Cb1PV+28@#1IOk!l)^<iv@Qf(y1*;1jt$s;=3gbfzhb5qsz(<{<{gyGP;gC^|!J9hT9GT`Fg~Z>X{x`Du7g{SC`KlG`^Ngmmu=YHU2@oGvS0T6;APiTZYzW8HI8Sr2ao@Tzy2I|TMcOO_-Q=+e@U)Vawv0|mu15%u=r*B&L-@X;E-R{5p9wqlD>qfTt0m*(V<&tE?jC!99cly^Lw#1j-IwL>0f*Mz>gT*OZ;I;EV|DM~@h;%(gA5E0yzEBJat?#61GE_0P_z23F7H?@|GYsx<pq0nE!Qh=8cc8V&c9wb1Ze&{U_B77#FJEP1dsZgbkHt%A+RH~l#i@dscKm2R1mm)zhqT4NEy_EJ2E*k3~9>;Y#aBx#V4nEM>lzXQo%DhE3lDM(|+hC+qR+(AYU{AqLY460nnGlUwsTQ{Cfi{7ff#^z!IX#^jaj(-`0*5#W?YV)S*QGg%-2vW{YF#Wbr=-2^YN|Wl(4Gn`gO}(A_Cv<^8wO39JLLl5`mC~nPgkF(a{(3EhzK8IBb7^i4QP|3U!2O6HO`0ituXfBz|ed?G6AH09K(L~d0P|G5El)>!EFxQOk=dR`qom$bhQNHlic@t%eT!lGkd))%0KU&p@jN_1-fD%yij0l^NK?0q~2K*;G;b}+Ip0N{M5$SP;V|@(e3YAxrM;R9^(F1^yK&x30zBc>pK%BC#Un#+?nKkq4)S6ci-<`+rISQ%gVcT=XiNf+o5{gJUXd<V#Hn2JiA0}^N^2%VEB$0UZN=w4OuOH-3Q|gsMyY=y5<b<Jo!JZ22z{{qeOFq+qdKL9d8~f70Deo93pu`TyK2@#PzDS?T&f=u0IB)ws|bz000v-06^{^>km#NO(|87^nV4&n5Kfu3_DiagVxCyIyLPf8ZnYFEt#Sd$h;;CUy*P?Qxq7l2YxkNZMhrQfT5TO=y8lRwf1;gpGj=U!q8uQW`JlpE}gn7ZN7C?IxITnn~6*LX7Dx(19IaC%bM=n&}qqp&k&ISoSWcP-=s`JYX-bLp=pn5B-~IaroqS4BWXnykrzzZk_gXCrEIRiV0oO3g94-;`UNJs{Ck;&jeOpwfLa)yapWN=iP$tfs1Jp6Jf9ev3tYU3l`WmcM<MargMnTrdI^R(bg0&ik$gOQ8+W36^>3TAVa{ctRQ8;1t|^&iVL(%}96tDOdD|=5`(9~#OD&S1QyS_Zm}xyahM795A-r<Dt(6S$P#@ih?X6*hccm~R*{IMoVy3+FvZ;r(B{v`HdXklNp12)N8xjplWgf3{2CYb1DK;N<tt?TwC%bT%f+120gQ>`yUna?wp{q(E%`l5(#3JXLy-k)a?=g$By<vVT>gxBN2z+q9?!U2>#W$L?Ng4<i`n(=Qksg4wU>gAbnLS@}m~68LqdzTwz7m7(Rp}i6!u@GlxfKQv21xKDC$Ai>l}Ph#E$V_FPvHsoHbZpYAhx_*X~5Y#DJf17BE{^6v#(oDop*F%)k_9a+C7Ny!EcHkh*DbG-Wf8U8JuP?@H!}IMge!``aXQwn6rWSUEQ#ii7B39-lCr!9ArpGeq==ds+_FJ18GK*^6)l029~}xdrX-xv363uV^p`@j!y&oLi>WxjL)9zO5;xNFW97!&g`GPV{`}Qx$^`~I(D@;Ddwla%QhNAJwBn`Kr5B(6YNi|NFYpxS<RqsFfk=lq7|A@{<ZQKtqQFJd>t8n_By#K?o?gjit<eaEsM7i-I2Cmrh$kC64gIm#t%1r^-4lxG1Yv=6f*~}W8iF6TA_L5c$d2gMXfB8-!T1lRdA|P%qB;~gx{-OV<2wqY}qt#acs>k)eL$gD;ShJ`qsnQAb(8z5!Q~G^)Ua%iffYze4kMNX6|xRwPSVDVU%jF{RidsYN0JV^6+!6Z4bu$RA7oxcw;nb6!a69FK9DqpoRiE0HU33`*4lZ|B2VCoTAZGKv?}<-t`gsZdB(J0?*UodX)K&bg-RY-_{=YBISMQyZ3;$_KVklkLG!-91gkP)r1EY0HE+sqgho-UP??&%1BX3T}qAB&Ma1I#d(Dn$9F-?Rm0G>Qhq2qJ&UBZPNR-y0^%D>J&;U?O-X^u0b&Qx>v%55EwZh$EzJNxL!hr8K5uD<1xOo>^R3;9Hf<jwD`X#BzGvsndwG5kab=2<GXp-kO1w@78PkvmR@^O|*UTKcmqfDeS~r2q98J28xpjv0KeE=@#i1w^GkzMTp<z-H1RpO*?z*ymlB3s}ctz%lt->zQnOf#-tCT%Gw6XI;W?<lMp<wEsp-&65zC*hCgK)xe8piY86Vif3O%*DgkwF~vg&a<1A>Xk<J-vZCDoN4r0a3>wU2<!s2v{duC=_Fr7P^Qf>DZ%cs3U_4($@KqIFjU?6Ko46+ST0A^vUGlbn+J49_}@+X0+mO%eo2w&O{X{R8%G*%75f4?2~)(S)Q>Sk*;0iM5@Gvc*@dx*145S3yC`BNijx}RQ6+H%GkDMTZ#o3HU68rIsA4Dbv*BvumR~3jjhVtvN|8;<TAOCOEG%0QmkeiC)~1itnPxT1KOiclE5;QD8%6V9y6bdg}W{Oy6<&wq^>skjk9-Imq}OeG#Ps7j7H>XN;MzZKPhgPUV=>zA;Lb8=6jq`*H*#>_f~8pnc?aFh&r?-aVu$DP52JqFa%97_X(4Dx}qUvi>{Z}$It|p2%o%cCIc9y@){ZfD$-A*B5`zDsn?ZY^9q3?bvP#sRslu5u*rJ6+50a}S7YfORLAk`Ls5wpOj?@b1mVVZS%cty6qt`s@QYJ?&sM5<ZhjK6@Z%iA?htsH1OmO?6t(jbSbNXp&o-(FeY$TAcIrC$<@F4%Hk5;jZM)EoJ1RN%?QCJ})muleQYI*@C$KMF)Mbo9<&K!`2E(u7#t$1e$+!#z!7eu`IV{v-HR7~i-~^Tv6cdIa1gj`+AXmmR#`HGYBX^;L5;5!#FbA&C1IkW*MFReyy-_;ng0Yc~tM2|1K$aPLd16<YZ_5uAAAg?giL?DXyn4io`|YuJM+xel$;fdpcjEizwAf2@O?_IWv8Dm=Vk!(j^H&?cr;JIvdMaGZ_{z(?6y9k9^evuUMLNWO)(}p4Cbu=f?uF*j?C6>?7O{3R)UgUu_r#bCO8s~R(E#uhn-ss7W3#TGo~$aG`feVG%UOfpO<{0@2J^Gzvx>Y%UM}AIuT%Kvfo2p!M)Ay&Y;uTsAc`2DjBQ~mh6KF(4&;Pk4t@nD2Es-7k?C=X-irr}@7^^(y!8jsL$HJo$eGRyEqYs_x6hcE2Wm7vZfPryG`od6B4^RUW9_0>Fp~`^zsL{uT-c{{k_p0zN7<haqYj1*!+<$PV+UuXB5^!CKtdx7G6xGFK!2;o_<+=s07y9AU;laKVyKHP+>ePnNv99M#_SApxUQ-!2b4y1LXfDfin5F<A%$?D{~CCD%}<YBxKMyCga|^GlwF#M4<lz6bIEc>Jb$uVH+P^laT#G&rEHxl?OG|4L9P3#`+5)IvHWKO-_YGPv9%D&IsE#{L(J-%(5t|DMTs}HnIQiLpsHVLYoeRR@tHY`3(}?N!Q6hVe%%hlM5$ltHu0Enm=a`m=reG!ij9Sb8!Ny7)FafKA}o<7eHA8^=~?Ye#sPPde6W2rg4>ZHPC^WOZ>Z_(6R0NiqGJ|QTFGY6hfXq9U4s$rS#7r~i+$UZH4G0j)XdFP5|0K}tt|2wYcRWN6#9PeV%NCh=^n((NH|G7m>4wbus|UwkOhy4o_}Tk$@E=UO+??ZbKGy&L8qK;Krn|n)ws$^QO`#lO?tLRnhQAB6Fcn0(b69@gE_&sVy0rX;@+4Wh8k&Qt|o(FJ+QNEsd-CwtU2;M?y;ytOxRx)Jx3Ic21>OybC^;WUCAcM1KDBh{={w@LZdAnLuUO8;tklU|K$ig*!cFW={8BWz?=sjP9t|S#B5#TBCHA>hDfh+ef>^<5aHMIE?-~~j)t6C`P&|6#2eiNM)(hyaeKE5q^RgxKB`Am!G<v(C{F_)ZQauk6#!<%%5!$GhqneH92!)u7K)T8>rEThcvf-}t|miyd5WNIVWSD(j|86iI0wDTJ_Sy1HXtdXxM}c>f~FLtsC%588>~Gh2%yq?t%XF)uGt6#mSFvpMNu}@6nFn#cw>td)%LmiCYH25AFbPrm_hkHc-x-5T(NhYZH*>r?1p-9$$`0~9`>)ukdS@p5lnNuv9`5~ueGO8bViUdj|3EWH)w3C+qRrX-w5_cnCKA@1a~Yt_rvwha1qPS=@vac4#n$Nv13xLkE_H+sM7bSIGcfJaX+Ifqd)7CW)cYgAYnK0oY6%dKbtGHSLO2wy<soa@%oU?zg#w>SnK2KWlU-;N_p?bpnMWF74AgWrM}kj@LGY4i?wy+5tWT7?S(=K%g$aGon0kaQpXP<^<IYYd#QTpy-(yQd1VTOa9G=llkGv@;|yINlH{4k+4*&5)5(JoJy8~a0_9Nnxvfb=;p~)FaKTJ^AQ;B(97rY4?Zdgdk63&ZVIinPDX76&L2^rO01?8msZ`bTP{R0{)tRZNt3_c#f5O*ik%67^U9$nkL2gv*12%2lYIIG_>d8Heb^K_kpOB4=^^5J!Eozu;%(Jc8%i9x~u9lKbk$V(_;yt&y+qeQhh-ZT;KDFm<m{rOB$IZxbPQM#B{x?Uh2BH|ZwLIOg*WT-XA3F`ZMzud_s}8TUKi|M?=WDN`A@gzyPNwQyJGg%Kt{)BIsjYyluX<}`EHmZA5dy(}KH|)3!2{M~L7LxqB{tDZiRIq9JtO{IwAeMkK&pPvE`HzOe=1tkWW_k&ajR)4sIj_2TxmvsSC(Q}fXP+06Xe3rt?hZtR7`|uL`c#SS{hnrl<Q=~^KjpI;LF8>#(JfrVwl5gD)3IeGJouu$shV8z6Bp0Ht3qp{h2j&9{SX7;IMN2bbq`55V@qzfd=kIqN^n=GyPFh+<!nQn}MDirsYB^HJIXC;Yi0X!)ti+w0%64UI?~^9<?Lk*jWu)Q_EpFMrj<QREX`Y#e*xFxL-HpA1_^RyR>$+J^TCr-7KPw*$62x0Dvqk03iK8%p(2UEDokFY<A`@M#h%r_O5KER>t<0zYW95&dJTf!SSEV*@MN=>bK!oj9J|OW3JyK&Mtn;ewH0K^wu+qsuo5v(e>k^Yx3KmVw2*K!VhyATZ<kErBI<ojDngi3W#`iNG5J1dcv;A+Qa>)Z7trtxmUYXQHBulu<s)Nn-mH&=!Oo{W8t5VZAcyRtt|13`I)c>joF2fDupVhxXP;$kqR6i-)z&5QeSz^Riw4JyVjnir`n%)jiDD(6+^xmt)u79eKY#i)3>#Ag2_4A6S>3uPE1!Q*1{8cOcQ=7u{y51K5Fk(f42fH8r8yex9g6ny1R2ir~9vDChy~j&6}JNToYA^2(5If^dC3(XD$hNeVYuPgCi?SN?6dvqI|9kv+h=n4c$PepD<zVE*LCb*i53IziLl#oG}C4#K(CfYBfxT2#7N}H#jh|O!rad#o}q#*F`zUp=hlvXSdgSkVf7pvr}US_pSP<f>KKHf{Lr5LF@>q1`XR3?XIc8Nj+nAeTxa(05hpZJ>xpc{U}Cryc3JJ(j$*Shfjgh^NScLo$P0*`|Yl9wdQOjLfq)<u9ka;2)*{XWy7js7vd+Fzk6QF-)i>jZ?F5o|KIim{-@{vcMPzpY8ffZ{ub=)Mq(P0Aax^EDNT@+meGIy2aez4xAV=_hn$y1vDz;243ddxUPq?&jv$}ZRXPVDW2s$85lXY9nE(q$gJPBLBYce8sfBQ`O2iLyi}vl-#stz>-`82-Q-tNQg#`b0eiv>NY!21Iz*8I@NL;JL#ncs{MY`t`H{JZg7hLU5HU2=stkEBJhm<xSw<=(UyEjApE_vU6x|zuFs?Hy0<Ij2xkyJxEd(Zi4j5Y5)lqERm)m}z+oz3cAF5XVQ`*FpjPcSW_I#XUL^ZjhJcge;3Nur(9PB#rMx)gDgCb&qwq>sH$agYR;jrBL`7!@~RR7v9b2zj=#tHxp&h?X^7YxUd+Z<ynw_?D3@JbIots5I;k8@O9ZU0Y301H=xC1Uor;7EGeo?B9>bj9$E3K0&RAUKxJOvw2h0bO^ynd=OmL>b!H}ZEGP?>|(m;F}*u?dnPHZD4UWtA2DczEasrISwi_7G84ecgoX6+Kbom!UR~fZARIE8zf3t5C0}cthG;HXwxI-NDCu~Suy^P%>*jCI5WOvHTbALGgJYnPDK6ctw2~|CB%uGoCq4QyE#>HfsrW(wqN;AATMjNQnDLdnH1I{D@opAbRfs7b|2W(eeZjJpw+)k2oEAoZrKyrAcZzqN;#@vi%WgzoaV>k{THI}KThL1KFomG*#Wai3z#LG>Yl694A}djgOkZq*la`cG|DKh&>YJHLrZ4ZZZi!<`mxE+tgOtPullowx;VI=C&#!?13OHn*!R6erMBF#~vR|>4t*@BM@r&Qic6tZ!G$LNUBi)~KF2*G^`TWJHi=QQCOrA;*vG^{-7N=iagp(mk(>JgYA0y7Lhrm)>JFG|fb*8B}0^gN~=qt3?Ov-mdIzOKqUMTX#mtWmVBbRhq^Ar|eSA26*AV|SAtpN>=irY1?2C_Cb7!P!hKmHLP_1#4pH*f&J^D6*A;Qv29jKqx8BxI!&#C}Iavc`%%5f9eynilPSt|KluCALwNx-g(RKu^z^naC@tbXRsH18fhet)#^CJwn8N>h=LmoX9!hTonc78pMA}=dv6}yFIX%ZYqkBr@OkJ@VC-U(r5S;IIf}Ux@Uk=E}Ny;B%r{!%X{Juask>5WF*a~f8J85)QKAuXw5qew^4PoLvKta`uPqq*(Wz&-F_@yb*OODEApdn#xG(NT0hPVgRUMeAe^dBrX=Ik#m3$K`V@9MkeBfJYWw_-L})eV`mm4>rn8SKpQNoIxfY3{6xM%~_PxfrJfENwdB<Z`G_DLhl^xJ6OUZz<sz!&avhEA6o?vI|=oBwBKFA*m+hD@zjC3-6re4+=fL?JGmNJR~lfc;>?WB-x`qDdx6W{bIv<V++!+?A}>%>`TC4TXT>&=bT^hTkZvfI)jGk$b0TbWCN$rgK#!rp?P!b3gs+Vf4Z#Oy<;J!|o$fZxsLg;qyQgFjEEQI_dLfa8&|&-Lc!RsijG^!<|=6wx<-Cj7WxTlhO~v$LC`qf@!6N;k-c#WDjAdWkRda`Y&2O2_wviTItZZ)D>I5bsdt%Lgjunj%G-)93Qj59)u6I(n}hp_w2akL0?geWjL9zCqkA@k{wwZno*OK8zStGI_lD-LUARiAjP-p5&;QPO@oG5T{(dTMG9(GOVj0bND@F#4zq{tqO6dq9dUd9}~FUI4C875--9G?}R)_ys&Vm;)G5KMQ&%m3f^I*4{}nK;rKZ$T!pG+o?PIP!-YyA03xnANk16qp>P5V)C852gJSZ<8}Q*HI`0ATZTY0rcIW&A3i5^PleIQ^C?B8!*o@{fc2AAu_$9*4_s(#9(+{_z>p2Se4Mr=(pa)BW*UR}I^tj|O!%q^*?i4yUJ!Pe^I?a4x$~ShF3RU-{&r2&#1Q~2x6K7%<YzGp1RyeFW*%SQa+M!9uc5f;utC5r<lH^`*UI0kYK7D8M4s0j{b;J;FTCZf=eHhV9e1AxKmB$`pOk*nbP)tcr2IXMU-O?t@)&{{TV_KpVnBRI#(JOs8moiON2Ce)osT@qgQz)Gmmjfg+>b+Z*+D=^_ke)Xp(XC6usY>qbIuY+bz&z%ucyN97A`~sR!d<Yg8Hsm*hsCSU&~!-iJ(12$?X8bt>MRsJeQPcLp!yI4&EL9+)GXDEb@*X^laNt;zM5yNPUF`8g!JRIZl|7F=Qtta+W@yYEJiNA8uPEPg-!zpficphqb(X8`kbi*ZTiRk$N3A<2f2L|hCB94%*(B>j^uM`8dEW-Kl@_KRC{1Z5?Hg}JuZ9?rn={Qc86XGyud1hVPJ9L{@;g@{?8~31pLcKll~<Cx&8ka842NEJPhzB_Rp^WU)Ture{&DuPwt=n$-lUo*#C03@=x@iRmNXvRKkC?=J*r*r;h&%OiA=_sro;ee=5kon8YOiqMrN{`{%;^7gmt`A1%|$V1!qI|6-5;wZ8$;)c=|NFJtU@Ap'
SOURCE_PINS = {
  "Interplex_MES_BE/app/api/v1/endpoints/WoValidation.py": "0670895d757801e09596fa5a5173cd63942cac98c64c4e45d3130b8f9b949eb7",
  "Interplex_MES_BE/app/api/v1/endpoints/batchallocation.py": "7f1a09de75de3f45955f7462ea6a98993a3a6a3cefb21226de57d2c4617c4e50",
  "Interplex_MES_BE/app/api/v1/endpoints/traceability.py": "0e29e50eb470299e21afbcb79a96dd930b4bf0272ac904c6eae9ae4d8b78a67a",
  "Interplex_MES_FE/src/components/production/ActiveJobView.jsx": "2017d8a78eb8f36f051f5508dd6303174f9367d1e786fd862c200567f70b23c6",
  "Interplex_MES_FE/src/components/production/FrameBatchAllocator.jsx": "a320cf77932823342fd32fe719619caf90fe22fd751c3b92ef7e95f65191e883",
  "Interplex_MES_FE/src/components/traceability/TraceabilityView.jsx": "c815d6862a7ab96616414deee86deb6aed3c19761cd5f4b5ad56f1a806af76d3"
}
CHANGE_MARKER = '[MES2_RW_PHASE_A_V0002]'
CHANGE_APPEND = "\n\n[MES2 RW Phase A V0002] 2026-11-11 — Manual SQL release: MES_ReworkJobs, MES_ReworkInputs, MES_ReworkOutputs and Batches_Master freeze lifecycle. Apply DB SQL separately. [MES2_RW_PHASE_A_V0002]\n"
INDEX_APPEND = "\n\n### RW Phase A (2026-11-11) [MES2_RW_PHASE_A_V0002]\n- `docs/mes_agent/rework/RW_PHASE_A_SCHEMA.md`: RW schema and contracts.\n- Backend `database/sql_updates/V0002__rework_registry`: 00_PRECHECK / 01_APPLY / 02_VERIFY.\n"


def sha_bytes(value): return hashlib.sha256(value).hexdigest()

def project_root():
    cwd=Path.cwd().resolve()
    if cwd.name!='Interplex_MES_BE' or not (cwd.parent/'Interplex_MES_FE').is_dir():
        raise RuntimeError('REJECT: run from <project>/Interplex_MES_BE; sibling FE folder required.')
    return cwd.parent


def payload_bytes():
    zipdata=zlib.decompress(base64.b85decode(B85_PAYLOAD.encode('ascii')))
    with zipfile.ZipFile(io.BytesIO(zipdata)) as z:
        result={}
        for name in z.namelist():
            path=Path(name)
            if path.is_absolute() or '..' in path.parts or not name.startswith(('Interplex_MES_FE/','Interplex_MES_BE/')):
                raise RuntimeError('Embedded payload contains unsafe path.')
            result[name]=z.read(name)
        return result


def build_plan(root, files):
    plan={}
    for name,data in files.items():
        dest=root/name
        if dest.is_file():
            existing=dest.read_bytes()
            if existing!=data:
                raise RuntimeError('REJECT: existing release path has different content: '+name)
            plan[name]=(None, existing)
        else:
            if dest.exists():
                raise RuntimeError('REJECT: release path is not a regular file: '+name)
            plan[name]=(data, None)
    extra={
      'Interplex_MES_FE/docs/mes_agent/CHANGELOG.md': (CHANGE_MARKER,CHANGE_APPEND),
      'Interplex_MES_FE/docs/mes_agent/MODULE_INDEX.md': (CHANGE_MARKER,INDEX_APPEND),
    }
    for name,(marker,append) in extra.items():
        dest=root/name
        if not dest.is_file(): raise RuntimeError('REJECT: required MD missing: '+name)
        old=dest.read_bytes()
        text=old.decode('utf-8')
        if marker in text:
            plan[name]=(None,old)
        else:
            plan[name]=(old+append.encode('utf-8'),old)
    return plan


def scan(root):
    errors=[]
    if sys.version_info[:2] != (3,11):
        errors.append('Python 3.11 expected; got '+sys.version.split()[0])
    else: print('[PASS] Python',sys.version.split()[0])
    for name,expected in SOURCE_PINS.items():
        f=root/name
        if not f.is_file(): errors.append('Required source missing: '+name)
        elif sha_bytes(f.read_bytes())!=expected: errors.append('Source SHA256 mismatch: '+name)
        else: print('[PASS] source SHA256',name)
    for name in ('Interplex_MES_FE/docs/mes_agent/rework/RW_RULES_LOCKED.md',
                 'Interplex_MES_BE/database/sql_updates/V0001__raw_material_lots_usage/02_VERIFY.sql'):
        if not (root/name).is_file():
            # RW audit doc is essential; V0001 VERIFY may be missing from repo even if migration was run; not a hard gate for independent RW.
            if 'RW_RULES_LOCKED' in name: errors.append('RW Phase0 docs missing: '+name)
            else: print('[WARN] Prior SQL release not present locally:',name)
    print('[INFO] Database schema is NOT checked by the Python updater; run 00_PRECHECK.sql manually.')
    files=payload_bytes()
    try:
        plan=build_plan(root,files)
        for name,(data,old) in plan.items():
            print('[CREATE]' if old is None else '[APPEND]' if data is not None else '[OK]',name)
    except Exception as ex:
        errors.append(str(ex));plan={}
    if errors:
        for err in errors: print('[REJECT]',err)
        print('VERDICT: REJECT (no file or DB changes)');return None
    print('VERDICT: PASS (local source and documentation compatibility only)')
    return plan


def backup_root():
    return Path.home()/'.ipth_mes_updater_backups'/RELEASE


def apply(root,plan):
    changes=[(name,new,old) for name,(new,old) in plan.items() if new is not None]
    if not changes:
        print('[PASS] Release files already installed. Database not accessed.');return
    bak=backup_root()
    if bak.exists():
        raise RuntimeError('REJECT: backup folder already exists; inspect it before retrying: '+str(bak))
    bak.mkdir(parents=True,exist_ok=False)
    manifest=[]
    try:
        for name,new,old in changes:
            bp=bak/'previous'/name
            if old is not None:
                bp.parent.mkdir(parents=True,exist_ok=True);bp.write_bytes(old)
            manifest.append({'path':name,'was_present':old is not None,'installed_sha256':sha_bytes(new),'old_sha256':sha_bytes(old) if old is not None else None})
        (bak/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
        for name,new,old in changes:
            dest=root/name;dest.parent.mkdir(parents=True,exist_ok=True)
            tmp=dest.with_name(dest.name+'.rw_v0002_tmp')
            try:
                tmp.write_bytes(new);os.replace(str(tmp),str(dest))
            finally:
                if tmp.exists(): tmp.unlink()
            print('[APPLIED]',name)
    except Exception:
        # immediate rollback of files this installer altered, no DB operations
        for item in reversed(manifest):
            name=item['path'];dest=root/name;old=(bak/'previous'/name)
            if old.is_file():
                dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(old.read_bytes())
            elif dest.is_file() and sha_bytes(dest.read_bytes())==item['installed_sha256']:dest.unlink()
        raise
    print('[PASS] Installed RW V0002 SQL and docs; SQL Server was not accessed.')
    print('Backup:',bak)


def rollback(root):
    bak=backup_root();mf=bak/'manifest.json'
    if not mf.is_file(): raise RuntimeError('REJECT: no backup manifest at '+str(mf))
    items=json.loads(mf.read_text(encoding='utf8'))
    for item in items:
        dest=root/item['path']
        if not dest.is_file() or sha_bytes(dest.read_bytes())!=item['installed_sha256']:
            raise RuntimeError('REJECT: installed file modified/missing: '+item['path'])
    for item in reversed(items):
        dest=root/item['path']
        if item['was_present']:
            src=bak/'previous'/item['path'];dest.write_bytes(src.read_bytes())
        else:dest.unlink()
        print('[RESTORED]',item['path'])
    print('[PASS] Only repository files restored. DB schema was not touched or rolled back.')
    print('[CAUTION] If SQL V0002 was already executed, these source files should normally remain versioned.')


def main():
    ap=argparse.ArgumentParser(description='RW Phase A manual SQL release installer')
    mode=ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--scan',action='store_true')
    mode.add_argument('--apply',action='store_true')
    mode.add_argument('--rollback',action='store_true')
    args=ap.parse_args()
    try:
        root=project_root()
        if args.rollback:rollback(root);return 0
        plan=scan(root)
        if plan is None:return 2
        if args.apply:apply(root,plan)
        else:print('SCAN is read-only: no files or SQL Server modified.')
        return 0
    except Exception as ex:
        print('[REJECT]',ex)
        return 2

if __name__=='__main__':sys.exit(main())
