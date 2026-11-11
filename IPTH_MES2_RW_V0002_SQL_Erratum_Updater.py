#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MES2 RW V0002 T-SQL binding erratum. Repository-only patch; NO DB access.
Run from Interplex_MES_BE:
  python ../Interplex_MES_FE/IPTH_MES2_RW_V0002_SQL_Erratum_Updater.py --scan
  python ../Interplex_MES_FE/IPTH_MES2_RW_V0002_SQL_Erratum_Updater.py --apply
"""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import zipfile
import zlib

RELEASE = 'IPTH_MES2_RW_V0002_SQL_Erratum_20261111'
SQL_ROOT = 'Interplex_MES_BE/database/sql_updates/V0002__rework_registry/'
B85_PAYLOAD = 'c-pm^bxa*w|L%8jcZw8uHtr6^-5rW-q_}N14#nNw-L*IrcWsfP8>eWIBE|LBbCa8sb8_!r@B5oI$z-ie=E+*g^PSH;v(yw};qU+e01|)*$Ib{VCuz3^2>_TR2LR;%jLJJgEWyt9mYycc(wZg`(rgwW2*?cNYRTs6VsGN+{HJT_%BI84&dzCK0=D#U0^9w$SlPHjz+P<Z946vwYD)U7f9~DWKXzT2z<-@Gap{4;vCwU~|5}Swq?2H7HKPQ{hj<E-#wIN4@yJPGu3mlawep}1^ppw_YMWDero`^_G4B1n+|;S7%TBk*lfiYja_ath8y4adC!A>=pS%0m=o0$7Q8bl@5QB#uLV~dBSGYC66dPO~@UYccDdd5R;=1HBzPJ@8I;4+;o6O)L^(DNVLghQg4o?h4jD~2oC?c{HW!**}r)TN;+hI2Oqp~*`A3?;-F36#&+1}IQ?E&LlxE!X<HuXgT^Biu^%2VldIj+Q(8(bB*k5l(t1qO;FRu6Z>F!`)D3Syq>5fA0>H-l*`PY(2PLb&DId2+*~?Pt)3Gmdx-{09B~lkry*5yKe6=*ps!J7}DD5(<Yr#piGm<0<-0O!=K5UP@WD*&_jKRf5a==CB2KX>O=Q)iJbv2@F~GICspSmkf5hGq}go7z=246??EP{i`s?>3-7KA;NbaU*lLg(>^}NFcmT1Fx1V`#vwnfa9CmJLdD}19PYk)#!{QqP@QeyBzl%=bZ!mo$F?Pm_y&@8f_`{^RfKPd{T0DkCZEn&8F!=oBn0VC(T>h21M#|z)0jk<MF%`0<-Ow^ZQr<Mj$rhrSpw+vQ@!2pi#d`z-C#Q<3yOHj8^RMgM6~A(EN7T1CK%Kkii`nGz}Qd8WzGc)NPmQUfrbqLFN4dKe>u;0T;UF&SL{zHYY-Qw-bLOq59|JzzL!<dwR^JP6BThF??7B~Y@+E$y3#mGM+lTZsjS=t%!czRVVn0IlDb87J$cO&xk~3`Zd=a=q2?=8l)yh|4VG|cmfzSQFgscQh-s6_Q7xgUg4%wY5us~b+|2-+Jk+$N=o50q(`8sj&!sVi?ORLrww$SCiE?3l<qw|NsQF0?!MrIpUt7{73p6A(mKq6XEs`=~OC}sH<l5vvpzsM<8_3F~JxC@)WfeVmLNgm}uZT<<=0KlQlw62Tg93%=bs7-#ZF0P9-gdUDgCPAdlhGB@j$x_D`aLt~zx*IS=^c!nKRn^HT6e_-vxgoccQMNs<LfN?4o2<24t!5Iw=H?cyXdpf$YO0EWe&VGwIDV(K0{R&xic&9vyWg*d>`e5>zT{k&;OBHW$SisV!Ep?-M>jF=v~|r_5k!D%iueVJ~@^6VV!mUr~tWKbf8x~Qafe{>Z=tR=w7pBw|73qHgly3rs=L-$W{}?XCHdmE+#sA2l=uwT=FKo0<KVXGf}l(Iuug?{zKsC7P5ORdh6yIMh+ggZ{3}}y?|rkf!vw%<&B=#{fckn)9e@r<|kf=TK>@Zz?P59W4Fu#W>Fjg9YvW6-lO;-tBYkfTh)&c2v$<Ne|<~ky3%o1aA_1m^o;l?y*6VMygXw;yL4^!a<bTG;2I7EMRbPQ?#xW_3z0pF+B7@@sv9GL%xy0@%0Af$SFF+3R2tc$w_)8<cq2{oKNXXGD*F{i$!Q+|9e&Ujx$n0;XOf_gzE~AMdYZvI=;s0a)h3T(%m746|0*0fQsGE`)qb4kxieBm43!2~vUx;N+oVW3rjjqOy|xV_Wke7-yV3Gx?ek<c!}OB3FTXJ>?;fn~;eRlRt#D83RBoQM7}z^nRg5A66{}#on=}@1tK&=TjmJXXT&ue$xS!xDLjC&Ft&Jghgpp$WP<#1#=iE{;MGK3c@>MHjnUs7{#r|{W8s6e8<(h_-jTP5#$RcnpTEYEBm&Z6t;4Jpfruk9Qbm(ied6Cdz@c`NHmqB5TOvEnekTsTyHhGKe02WMcm~clBeBf&)mlPht5lbhldbm`Z_G1H7GOd(o*l6%8!{X^Q1+IHY@aM+LwegQl9)5DMc0>9Wok!`Xz#;uMdnuGJn6fI`&>&|ynM<vvLdFKB%+GL|^j39J)jXX7m*n5kPi*hZd+-~Rd^{%K<_0ybwXjPGJGd#;W&4Zho&o*(H@%zBJ^JgQz+vU3mopsQ($Dzmc6`eL#vLWA4%%I5O;6idq`7prK7##2TBD8kNVmJ#S;ET(vWI1ukFBQl%5K*ng#rPtxWt$nX^x~s5YDv@!S@7=CbJO3@Vc#wivn8yemw!xujYmy(s-lQtWpg)AwQPGf?v0hb%~W)d@9|@CWVXIlzzXN;*I~+T0*!JDPzxRvB_yrXmjUR7NOvL5Ck;Of0!Abf-~T`mYCmF7&fIoNQ+enh34-rTwQS!H0RF^@2adnkK1Fv6@U-s0!uS@GoXX-FmS|8^|H~w)R|?oYEXsO^0I-=)~tY;l$Yle0>BGbLH&4ntRw9ZJi%Ylm5v49b~sb0Io*G>$3&}!Q`Q_wUZT%C$%6XGuJoKy%~ypQjMDMErW>;H%?`y9-_jYup><8(M163xN}nWRtT+0kPK+0DdLSNX;6R0EYm$asI_v)dsD<CfPH+_LHJTJ`J$2wd@FgUjBb6sRLumU0KIWw}k~CLLp+{qMRgwVhxC$aX*Fw*rifT5_vC???q=0Ro=Le&}XC+F%=!xnrJ~UZpKl17E`Pc^eI7+1co<Ta_DH=$h_e@{W1=EzLBa*9dA&O2>5}c^}>PaEDim3`TS5aEKjDRe$o4Hgz+#|C;DQZ;x<_B@;WbD?yC<oWR`oo8#5puTGqT+ZHC=;CzN6RipAmmXAk(|Px-~>-K;yxNgdHaY1`8j&G7dYNryEr4FiX5R|Egr4+_PSaBu6}c`eAUQg*W>!B!=kg!17bwRR=XHG6ue9r&k=KDtR7tsjkMP%|6MK~Rz^^(BOdi_96b-bamNL@UAb3KavRF;6dJ=-<$DU$$*IAE>ioKt{Wh%><%#n$WXz4O{BF#8wUYh=&ZxTm+%3d#vaZwru?605E1W0ICCzt|JZyWHNF`@LbRZwc1<TIqzBQ!v!)W%1liEL!==jvugd7e4;Kl#|6#io*;xy5b){vL^KTPyZchhx+AM4YtNrMxH#|Zq#IzCN>a#N)vypwre`Nv(3Rtnn~C1wGUhb50aavCfKXOFp`ia3g$)lR+7%`4p5>>S+~?QPC;wk?9^C<eJ(Baqrzf?P2gg(l=WD0z^1eDC2_Vu%z>5%=Wo89&}O^DZ0%?AaWloRV~w8>I>|Vj2n(t~lq`EUA9j=aQB>&oazbbAHX$(E_8rm6mfhLzZ|p)iAFthoIg!_%9*b6!nj|zl&zIYq0r)ndZ)6?L0x%7t9MB;eE85-%nnExh~pG3zaK?Nmw62vfv#cK<uJn8AxE|Bk*N;rwr|@;v_<wlULcXAZy2$GBowl8w3p*z?@+jQDU=s5^^K{kEJBA3RFV3<;Jdd{gCSS%X~|x>B=CL!ypl&`CQMHn3gp{;d@6fc4Pq@mO?$>l+sP)RfS!=(eJfvWj!t`ywVgIRw2Ih711;%oS%fTS1<aX?7eyr3GxKe-mJ2NbCJ(^mKdYQ#m2@@5$AX)bN!@i;kkd2R(iue++gXo(}*ySmz(+swY$v^1YA;BT~X3^yB7m5U(w5P=0WdE#nlpSC)E~$M9``m`9qG|i8(J5=3<7_9@qy2=HJIh6{$2Hq7(RY=Yfaa-ya6S-&z>aGjGENiK7+A`zX|&*67A`wuQS-<aqGe$=uvIBrjO^t$Lg<L6>?J(4*#GcDnoDk**`EPqdFoOh|oOK*>hM?FYr4K!RBU3CV*`PYX`)@{r)6)-+`wZW`K`1eLpAiI1j#bzMjxy?9@*nx{zZ`;t#^{W1*1&oi%WrfJa$7gpAl`%1=IHAU8+8l143^xjbb$#;nIyKCG)0#g!Z!*%3^!Uol|61<GJ^vb?EQ<`+QaIr)!S|WcMeWX&;l7@w!|7}iQZ`-QP_Ld}^QPNb;?#cvm<Fa>Lp%Sp{x4<}t9H6|5vfm*C)W)jC^?AP^h!CrO2~m+BadRdNK{NDql_wwyisfs{qN9!!BC(7>+M{B=WRIrIDUFA_Gs>dph`O=kkfNip7&l--kj7()OT_I7P&sxoBFY+RkH6|^TQ<*_X{VV~?sXy5O9z{th*wu<<SQ3fyfcBn8<F}#0saW@)v{2vb%sti)8VNF1KAK}W>eH!Xx1_OY;^uwqjs$~uibK#K;;cTp82q(X|fPS?c-CBjxZd$+VqHFFv_H;$X8Q;6|B$UC*R<V&8mx7Wyk@lUh<m`-k+;C!Pq~S<J4avyx#ARebU>R&XAGt$?DwOs0TL1O8C8XSDj8??7^$yUTB4mvZQbIVl^c0k8P9@u2QB{I&AZt>;QbW3cT&b)K-lKci!;fKF>y^THeZ6SW=>jq}n_S<`(Hb(n$C8>7h1;oeuyMTRIoDKLP$(hM-ygzPu;^K=Yp=<^Qw{X-F$ci)%`osHkd5YqC06#OkesiA8X_4;VXue7w<!C%*TM`9@Hnz1+YEFUD30csPOxgojxi$qh@V`-t@z@<`)j@EvU#s^y?fvIC;Io)#$YypD1Vo8!vzEoJLAK8tzz{n>vmc8n=;_Ubo}vISjeDg@H@!{m8Kr+Ph)t|Q^#l()195A~B{a_R@v?_RCPYIWmUUX_bUNvUJxC2rGF+D9!6+7foxrsv`Z*!K=TcbwX^XY|uQYdmfa#(y%txLG@Usaza7-nax5@56qH{CW7fjh>%(@RuOlo+h+#u6L|&CU#8Gpi0RA$4kM==|x3HmoD+noiX++u1!4kk<|tt|Ms`~<~n<MRC&+F`Hw7`2AzZ!LMv5Z>AfgbE*ZMLz&U<S#*4ZM8^P{O_eU`%>PVJS8{}}vyluC)^dNnvmM@0RQ^j(W&M|ip+xLn+$6g~=EcR9*4jdN>@zUll5tW5^Htx+><L25@%O416k~ADl8)j`%+t)j_^o`Rdv}lVUDhyH#1pGLkb}Kh<){6VL1Z{Jrxhug@KHc~07M|BGp4W_xVvU6IkY8y7!eiZSq!|~*8t1B__?Zd`wRd%5xg+YwZryV~yZk*op1(QGIogq|I?DQzFe(~SM-9lL))6HdZlAhizx6aYA7Q0V`MJwcH2Xa>hykxFSdVR9vXp5{ey?@QVyL_6K7HHbN;IcKYb5O;#g?KjWSlmfCHNT1YWuAI?!o?>lgM!b`*>7vO?6|1LOMxU3(IhaX$=+tsvJPtJwonQQMCAOSI(5Q*gjs?nZ~PmVFipN%CMD|4|Z2p;M`;={@wERg2d1;*TYmTmZU2P_vx{9LZNLGV@swrTItM_H0TD4LkzM1al%T&%0^i<#NSz-kLNYx=MV9$=z}MF3gn<YPGp1=8%05R;Eoc5?wDecro49l36FZ`>3gy3C@i>w1;Iil%wv9|L!>OO{IOcz_}6*Vclof8BpwF1V97_fwL(u{p`7Uv*QY3G(B0+B1MX##)-ezl<Mkrdm>@I6Du0r+N5WA7A%Xxem5Q}$%`Lkb8nNMDba%{Omh7+QOATP<dKJtwq4xA7p0!LB;f2``DWu$$u>h9x_Axf{GSdvkn2kyIx;dx73Z9si)u$SNcP}k8QY`kLAfdD{Ws!<>hNAM1<;w(TRDBR<>H`<EY{8C8c=k~1og3rPhR}twU)tV029?O^?7q;+0Uz~j4dm4aN6wf}*L+A`H?|sJ9}9=StVtk&f^QmO6k(`8*?Atk)(42{4p@eNLD$s4n0VOpnLU8=MTi2jbd1Sqo+}9G1gjVCIfUj^{ROCqp|_%6(~F7L<1SqN{gi{ZA77rYW4r?tPfQNeZ=0BiudD{4haWxNuO61WqX?pE%mNPHHUvP<#+YbP%#mH-B`-egVdANho|_%HsdidHv<T%sOH$in1pSCiXe@<A7dH*6bDO~LTWIsjuFZ@%MQ@UeJTag~oF-p4Oi0aNa5V0(vo&I;C+dx(j+G|M>+^BVOEfIT5_N8!$CBy#RwAZP%;-PyJdv=V)?H(XQAmE?^3a&3m_{OdGJbySdCB-*pC*!7LDz-E15OHFen$c2TUwYl_g2dIU|&50SMTJS&=mlY(VOp?clfiQy6outo@DKV`~$5~zqdrxwg(!zF5<EmlMa#L$10i=*i?1lKB*T;T{Z9d2tp8Sa@q=+27o4qK-JE=pu*}y$IwJ3JX$D=T0VBKqbUkKwJPej_s$LMmqPi(6=#_IX6C)W+n5*5!q@Vd(|bNw=o<P4VakMjEOyM2a4lZsC)76Y-wxj+acGolb^vDU4u*!bHBM1?Hd}$~GZ&sMH-etJciEoNFYlvm+W|$4jL<pQTt|k^<u607fwDDJSIEx>dQU3n7o^H(PI2#jb;xfJ@N@FTbV=t&(G?GqIO*gfj$Jza#Ghl;h;Abg4awf32o{>C#2&tV48+00VKDY1ltQDG--G!QF8%w0K0GvwiIt)7sNgMiHc}_Om{aH1t3_B&&9Niaz^hK+KnBVf##ec%sWX;#L-;I>vs}GKyD?3T?CDWg(%tYib!06whMrkHG-u(l4=4~Ap<fMK@$jxhMC|FHh9DZamr&nJDtjJN@kt5-AKsbblu!|S4)F|VUBdMBi5K!mj?Dv+1nk6dg}`o5!cswiQhBX4UCf-0swG9mU}|<hqJ#uFO8@c!@eqHSjWrW7r5*qFd%tRA)Eo=a6kU=yvfx$1#4`!->|Hde?3$!-cVCc}gVw~(G;#kPnk(0j8v*19h7isZTAwrviG~iq!q(@#R<Hi&4Q%Q(lNE;kSyFU~M1w&cYs}!RQu?v^apT;ZsJ+X%i)SQQoPNy8_l-<4<SV&wMsBw^uu-DkA9&O659r_7zf!4SIj|b=uqUQU>5~Oe)l;WVYgI}3_efb_=_szDTQYNJCi_hZEg`4~fA3Nw+FG-9=@d#0lc)KO80wtgb4uc#jOc_r!jm~`^I6s~=3~fIm~NTyr-JG@>ycdAHBI=zj$Pss*K%32Vr^T=Ym4-3jIO#8N>psg?LLN$GDnbCYY~g5W<jq8>SkhXE)weGaGsTXv?=S=ob;SRXG7uv0XNk8*(-UFW4R@$uxwlG9?q!DyW^;1yW*HWUS^_;=FBRhEc+Ha?~r+?;q!uo=B6Vom_NQ2JMIu+{h`N+uf~LZ$F%1cUq^qe*qzR$3;MlUv|UXO;FpXO#=$o#T*qk3;phGS4>m#CtYmMv70E;?(<=L&iS=e82xP~m1FEEel2#yR=N5NejK|E^oR9QfELi?OR)q}MnGz4E{iU~)6Hem{Yl-6dWZu|OoJ7A#sq79ZxxeS^X~5*)V`-lDxBxlvx$*g#-PS`R5_6^a+jNAjopH>iK$YM<_U2w~q)w=T+)P}ylEBzKa+>P4k}08*od~hG|5}-&#8khm*cnL3sc{`T_V)KfWwthI3A**Zb4vIWImSF%pGo-7^kVSD;!+wP2Wv}Mm9<74MgOpb>okH=ApV``+EsmEfHUqQ{{uN6^28q-p_TcCBlfG<;~CJUlfREXOM0?+@fIb#7F&xeAH0Wzv7VV$c`Uu*=<rP6oplbdPWh2|z$r&(>>_wlCnp$3)xtp<rxmB1cOC>Q=PH2Rg936vRBG5S6YC}3Tq}gzm?}G&$0IlEwfklQm|<%_R{dD~a_uXe8SnUcq-|~%vTxG%E00d~cr_~exf||mS2<8YXrcfJ%J}%^^Zi#d0*D$y75_I)fL!M{X7+9OsZEZ0`L!qKqg+-X-~^)+1_mS;{s#0Gso>IrQ_d&#&aQ6%ZSXJQ`CZq7emu0}9AV?5s!YD3OrV;sdUtoqgJRVK{@Ck8sz^Eai!sWnA&_MrX@P(utb*i2D<x<y{<(?Izlc01%r3d&+T@>riZp5?c=#8Xz5xIf|5HHKloRLV;nmbu)?|fvLTINORA4#KMlN#84{<4k+)q4(Q(=KvIV&iUKk?`<hJrl(Bh?n2?x6k}G1e<XO0gZlYiIjKbM6b#ng;H(#rJj#HF+);8ntx`wnN*1dZ&ZyyDl=5U;aJ4zep5d<nR#GQ+a4fv;*4Z5Xev}@rRRADLOdYa;(j4$Ua6<X%6{8TbHKa(NoJ+(UbEIXtp}W{4O_36~G<XGB$$o#Yp%X)qokR<O;;6Prr%3_Vs?cwPl2tH5HG~{H_qc^8Vv<{w7=%^;B!(2januMBw&`L{9R-&)FAegS?Fmw&PD<SeLH%Uts>Zpri|#buTagKolYXpz$9E4_qcv^5U{8s(+|oQ%hV+`mX>Y_s{ySvSW2W>YjYF_)!u#b@iT(%iSJcij=VhkAXfG7u7j?c^;<}^03nhwzfuPOwMD5dXpQ7c=?EA;JCm+;d3w%f~h@WgWG_Gv&cI^43yOJ5BrlS-XddiDFCaVr3Z8#`1AP7@6atR-Lwy3qSp4K*Q^PXk*AS%7ht(pcrg=9^w+mYilEHhaO>P|a~|AX1|k7>2?IC{)epprEBkSX3c<@=gc90=Kc-SrdGE@4_zHU07h@NsH*uw4b~y66B1ghDn2Y(%UflVnz|;C+qb%xg#3;P3ywF4;ltfH#mB+=c4rj;b&=`VY_dmM^FFpfg-3oP2`|wb2o4x&_i{tp{=-c_DD=73wxTGw1V}>pXzrq$RsfKcRm!?m3kdySFVhBk>7!HWu!GPqer$;d=t%I0{i+;tsc6QCmD7T63i+bbs?b|$H?j7jqr6Wvwc1sFTx)5&{hFWb!@dxqaz_F?z`|Km*7IXTU@a0b*h2F2@rq{A1V7MdENJsUXJV7u&8LV$WyYcVHP@bk<;)ixKrM_yW;<!_(dgPJtB$vI^Rf|A&Uk~lIsD#ol$TTjv7%vl17`OUh#WiZkspyIFJG5@q!T0(s#}mtRqhbLrSS4S+y))9+W)lU?XzRxqBSS`mBWTt3>_p5yJsCgW8#&xi**msu)-lHd6_VL>ItbCbrW6gmA&-z$>W1#$XrVBk9HWkz?@!&P3~vKFQSTfVt%H3o_hY~a*l8C|fu_2Sk{y_~*~1CF7>`XV&kn6Y&W(I`w|#JhzND{bt|$YZK1i&}8+0n$`g|qp2_A#;d@1YfWazx*qrPYr;M%|>IPV!#r%X#4QQC{gzLpG>x(TOcQ{MI9ri?owfz9V1coF$B!2LNQs}T9Z1kJ52b&#Y0zs3PgakAplUYOeasijS`;p{}AMmEd-bdl0`25n)@l;Io@SK>QC%6sPbGfNtq!8X**(I~hl-}UyFv>oif2rntCv!2d8BLCBEFKSUX46p!zD*XS;Z8Cq{=49^5=3wb+0<yAngs_=ggB-2?_>GgDlb3~q<F6C!!Q%dx`&j;1i^bf@!P&;%lEo4X20`2${(NLRq)a=m@?(vhc}Kkg%TX;i?z~->RCO$B9igkVt7ZW=TDw>@70R)^E??x`P~ITl%Dc+}(P8k;#S_AFoIY*x2?lq9MS>SF??iJ|tj;&ZUI!kISyD#W4}{t?l&#K2bak&fzcw~;>E(B9{A8^@JHhxkCuUlRp@f1Fo7SUQpcn4kQ%@fI@@_#uX-imSYQ62~p$p+xteQ|oxo-A7*y~Ykxz|Dj#$l^n7Jh^Y|HZ=xjzz$iO*c9ov(H_L;W&Wt+;%OJbX*dn6>2^jRbgM+5*+3gtu<VTuc|MdjzpVd3eI3_g&Pqdb(clIM%+Kd==@^7SXdd(Vc#_XFHT}uSdrC#eQ^1p3Zx(no9Aa=E{dGvCyf%aeH*$8D4aE7qsgrq2|VQG22!o@WWf@DuQFvaBUdhhm)(<Mn$cS}t41H`+;7wV5+u?Tpt|gt)e*q1tKsVEiaHSVeKh@3(hT7_uURX-;qoW09Oatd#m<l7KvCpl3CkAm46W+>XYWr&EIn(ofSR*X>kM3j!1-_H#!r`$2Bb4^4Fk{+80}zpQ_uyGCHNqYQI$31B7Q}<RfD{#ntS|G3NW^mC%f$j4na%F@ZIWYC`c9Vmlh#2{2?PbqnY4QRmjs3jJdbxqXC0LZBUEH%NpfHX>8F1Ga(fObNA7;DZ{_xwUL$Y*w#3eBhnd^aN%<3E-yk&eMzh>hlXrn_^}~CTJfv6lm7@S_Kyf=M>0P#Z{8>aCB8{*qFiD#GU^3u^FtD&J8x8qX&%b2zp<MQa44&m^NdrcdB+3vOe~y=aOi0DF1YO_(SmgF%1j2VD{*?ao%!dvaBs}0wB)!`X9KbI${)u*RKRMmyIUZCn5p<Wx2TCj+}L3?pwvG5Y?;{2Vj5bKP+lLVPbVpZX253Dn2^E~zvyAX<RCaI>3v*j622|Xc3nx0d^YYNah&w=%yZ54l709v8@w`SDg21O)>mlETs@uL_32ACb1_A%acCy1N0B0V)Q0u1>^s3b!vxe@Mjp`5R=F?{r;XpAxZVYDJirwQA{A?^8Si@Ch^Z;Qfx(0Q|L;lozem6uz<+ax!oOwzo%{bSi;Mi<{0s1J-G2vtf9qzU|CeLGe@p)x;r^BuBK)rc-M@wZjXHk|#}NH*fX~16|6Tn5)_)-R-*^?MDZ(TC^?ZasZRgLtlPLb`{SU<@eM$'
ORIGINAL_SHA256 = {'01_APPLY.sql': '669884c94f7c954a568958b4221ea8c328c458d011f3bf0b63f5469d23ecbb55', 'RELEASE_NOTES.md': '8902c47a050fb5cd31e069e4132b7e06e4b2f3cbccc34736c05f71b560edc283', '00_PRECHECK.sql': '371ffc7c699793d773dfb1c9dfec6bde9c46cbd9c07aa757b51e5377ab7a9aff', '02_VERIFY.sql': '97db7f8d3f2be51d4938c73f57cf7414a79f028168c55b2b46f79200ad16fe68', 'SHA256SUMS.txt': '8327971cc4c594fece4556256eba2f56e94ec3e1d1a14afb4ff4ac28670fc8b9'}
MARKER = '[MES2_RW_V0002_SQL_COMPILE_ERRATUM_20261111]'
CHANGELOG_APPEND = '\n\n' + MARKER + ' 2026-11-11 - RW V0002 SQL erratum: defer CHECK binding with sp_executesql; verify diagnostic safeguards; manual SQL only.\n'
SCHEMA_APPEND = '\n\n' + MARKER + ' SQL erratum: corrected APPLY binds IsFrozen/FrozenAtUTC after they are added; use 03_DIAGNOSE_STATE.sql before retry; PRECHECK and schema design unchanged.\n'
DOC_APPEND = {
    'Interplex_MES_FE/docs/mes_agent/CHANGELOG.md': CHANGELOG_APPEND,
    'Interplex_MES_FE/docs/mes_agent/rework/RW_PHASE_A_SCHEMA.md': SCHEMA_APPEND,
}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def project_root():
    cwd = Path.cwd().resolve()
    if cwd.name != 'Interplex_MES_BE' or not (cwd.parent/'Interplex_MES_FE').is_dir():
        raise RuntimeError('REJECT: run from <project>/Interplex_MES_BE with sibling FE folder.')
    return cwd.parent

def embedded_files():
    raw = zlib.decompress(base64.b85decode(B85_PAYLOAD.encode('ascii')))
    data = {}
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        for name in z.namelist():
            p = Path(name)
            if p.is_absolute() or '..' in p.parts or not name.startswith(('Interplex_MES_FE/','Interplex_MES_BE/')):
                raise RuntimeError('REJECT: invalid payload path.')
            data[name] = z.read(name)
    return data

def scan(root):
    errors = []
    if sys.version_info < (3, 9): errors.append('Python 3.9+ required.')
    precheck = root/SQL_ROOT/'00_PRECHECK.sql'
    if not precheck.is_file() or sha(precheck.read_bytes()) != ORIGINAL_SHA256['00_PRECHECK.sql']:
        errors.append('Original 00_PRECHECK.sql missing/modified; refusing DDL-release patch.')
    release = embedded_files()
    plan = {}
    for name, new in release.items():
        dest = root/name
        if dest.exists() and not dest.is_file():
            errors.append('Non-file path blocks release: '+name); continue
        old = dest.read_bytes() if dest.is_file() else None
        short = Path(name).name
        if short in ORIGINAL_SHA256:
            if old is None:
                errors.append('Required original file missing: '+name);continue
            if sha(old) not in (ORIGINAL_SHA256[short], sha(new)):
                errors.append('Source checksum mismatch: '+name);continue
        elif old is not None and old != new:
            errors.append('Unrecognized existing file: '+name);continue
        plan[name]=(new if old!=new else None,old)
        print('[UPDATE]' if old is not None and old!=new else '[CREATE]' if old is None else '[OK]',name)
    for name, extra in DOC_APPEND.items():
        dest=root/name
        if not dest.is_file():
            errors.append('Required Markdown absent: '+name);continue
        old=dest.read_bytes()
        try: doc=old.decode('utf-8')
        except UnicodeDecodeError:
            errors.append('Markdown is not UTF-8: '+name);continue
        new=old if MARKER in doc else old+extra.encode('utf-8')
        plan[name]=(new if old!=new else None,old)
        print('[APPEND]' if old!=new else '[OK]',name)
    if errors:
        for e in errors:print('[REJECT]',e)
        print('VERDICT: REJECT — no changes permitted. SQL Server NOT accessed.')
        return None
    print('[PASS] SQL PRECHECK unchanged (SHA256 verified).')
    print('VERDICT: PASS — compatible SQL erratum package; database status NOT assessed.')
    print('SCAN is read-only; Python updater never executes SQL.')
    return plan

def backup_dir():
    return Path.home()/'.ipth_mes_updater_backups'/RELEASE

def apply(root,plan):
    changes=[(n,new,old) for n,(new,old) in plan.items() if new is not None]
    if not changes:
        print('[PASS] Erratum already installed; no file or SQL changes.');return
    bak=backup_dir()
    if bak.exists():
        raise RuntimeError('REJECT: backup folder already exists; inspect before retry: '+str(bak))
    bak.mkdir(parents=True,exist_ok=False)
    entries=[]
    for name,new,old in changes:
        e={'path':name,'was_present':old is not None,'installed_sha256':sha(new)}
        if old is not None:
            bp=bak/'previous'/name
            bp.parent.mkdir(parents=True,exist_ok=True)
            bp.write_bytes(old)
        entries.append(e)
    (bak/'manifest.json').write_text(json.dumps(entries,indent=2),encoding='utf-8')
    changed=[]
    try:
        for name,new,old in changes:
            dest=root/name
            dest.parent.mkdir(parents=True,exist_ok=True)
            tmp=dest.with_name(dest.name+'.rw_v0002_erratum_tmp')
            try:
                tmp.write_bytes(new)
                os.replace(tmp,dest)
            finally:
                if tmp.exists():tmp.unlink()
            changed.append((name,old))
            print('[APPLIED]',name)
    except Exception:
        for name,old in reversed(changed):
            dest=root/name
            if old is None:dest.unlink(missing_ok=True)
            else:dest.write_bytes(old)
        raise
    print('[PASS] SQL release and Markdown patched. Database NOT accessed or modified.')
    print('Backup:',bak)

def rollback(root):
    bak=backup_dir()
    mf=bak/'manifest.json'
    if not mf.is_file():raise RuntimeError('REJECT: backup manifest absent: '+str(mf))
    entries=json.loads(mf.read_text(encoding='utf-8'))
    for e in entries:
        dest=root/e['path']
        if not dest.is_file() or sha(dest.read_bytes())!=e['installed_sha256']:
            raise RuntimeError('REJECT: installed file missing/modified; refuse rollback: '+e['path'])
    for e in reversed(entries):
        dest=root/e['path']
        if e['was_present']:
            dest.write_bytes((bak/'previous'/e['path']).read_bytes())
        else:dest.unlink()
        print('[RESTORED]',e['path'])
    print('[PASS] Repository files rolled back; DB unchanged. Do not deploy old erroneous SQL.')

def main():
    p=argparse.ArgumentParser(description='MES2 RW V0002 SQL erratum, no database access')
    g=p.add_mutually_exclusive_group(required=True)
    for flag in ('scan','apply','rollback'):g.add_argument('--'+flag,action='store_true')
    a=p.parse_args()
    try:
        root=project_root()
        if a.rollback:rollback(root);return 0
        plan=scan(root)
        if plan is None:return 2
        if a.apply:apply(root,plan)
        return 0
    except Exception as ex:
        print('[REJECT]',str(ex))
        return 2

if __name__=='__main__':sys.exit(main())
