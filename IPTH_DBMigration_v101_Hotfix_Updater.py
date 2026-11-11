#!/usr/bin/env python3
"""Standalone IPTH DB Migration Manager v1.0.1 source/docs hotfix updater.

Place in FE, execute from BE. `--scan` does not write files or access DB;
`--apply` modifies only the manager and docs. Real SQL baseline verification is separate.
"""
from __future__ import annotations
import argparse,base64,hashlib,importlib.util,json,os,subprocess,sys,tempfile,zlib
from pathlib import Path,PurePosixPath

PAYLOAD_B85 = 'c-p*sY16V?m)&1^eH==$?U#9Ia6$!VWKhvmL}n0BL{S0tx5v9Xom8qjLswGq!&MgQK6~%8*E(x)6~$kXe)b*vcK_?2iobm8uYdY$vQoy{kX`t0qTl_?d7+<m*G{wt1VWm3xjX(#gFzUFAdvX$AO5<fQKTo??}tiD7UzF6^}8Nk+`lFE%}yS+^*25A^_zYBTk~(X-%@u!|6RM?e<A;7`MP_)-0r@4`&<2fxrF}NZC%b`*7(JB{Lt1+Pd~f%?XQ3OPsLxce)s;QcfQ+69NI5!F_JZI^mogC*x@DqW%wt=?eG7S{Qoh|eo+nExg@rB^K=-)f6*w+z#!DZ4HPv@i^2^Yc1#e&bQm%X#MDX1F+hv5OwzVU$V4HSz#$7ENb>g;2X}rUb?2ARe~+l^5QPvp0$VzW;UMBrkVV2E{)-5kmZ8Ju?}sQ!ShkJArVUa$hG8fO88~iOD60SU`G@~Strzq5_sG6!zlzTHzgxdv8^7lMeaLEy2`}}PiLlh9^^z5Y**`|szgMuMBlxda$|fL#bbfhKC`iEu=wK#=;1-Nn2#%P>@3L;#1Z=_-4j~qfIgkN6j`eQ~wqO%QNYWrEi-3PKp<|$}BZvi~D304O`MYErkYN}O1d^0#LE!J}4s4?qV*D~8|04wt#{DHfnhX5DUmOJM7GYx$30a_lK%hZjhK}g4ZGr@7;3jC0zuqJIFH?eqY>2>N2(>BPLSWDVapT_>XTrE`ST<xpCSp0b<=7_b=p;!J7z{g>?m!fZ+5~R@mcVt;!YKrTV4OfP!^9j6`i~U%Ux)qgf56p(pcY89ETa|u>m0YDe;MS~A0W1F*Rb_pq1O5rQ2x6uIj3RxZ;Apf1I0{?#3{=#Op<^w+;Mc&)F}g`9K-(Afd6&}fnoDE{RRbNi20lOUzac#2QBNb&wu`hzY<%wv_D|g+*D7j+aLb;A1h=>|9wFJ{Q1HASKSY;njhc2KOg-!9{I=9?Q;HQMq<CzAjozw-NYU22R0L<NX#_Je_0wvE#rqO60sqKz|eor=r?~9We~p|M6h22{^vRTw@%*vz5#zPP5alZ{{F8d_^)}uI)st14gT1GLa-lJNy3C|5{3x}`2m(PP+dncT?a`JLQowtL6rCb$b=00H*m<GZU5`HyJ_^>*MDA8OXFW2_K#ox)Bg)p{|9mM|6%g}^RHq%GHlEGQ)KafMbkgnwXUyXcXER3gPZHTzk#0o0>|E`CZ*~oz`xp@QpfohVm&U0#W6gu;Saq+p;gwY4uwN^)F;1<))C)pFFu?{gXQ{iis=g~<Y2SooLA1hjwH7f7O7Jm2vloyt(I<^K%16K@pvFks>k4~jn`^5_RQ>Dzb}VeWfl;Xaz?c9)FsNhuC<L!v-CFKL~_fjYP(CLqluqQ>GJF_0hZ|0e6kUze414x7y7t8)Ze!^cinbkk$6h;_ZYn0HV#x;T=@CNeY7qK^)B;7Z*v9j-Rk;k@(fVYdfsNvkEG?{js;<Mjwj`haxXBCIMkVyYpk?kd9@E`{$`3krg_}u6mke?bYM!GH95Fl8u6+-LsKsTu%35iE86?xvA`Ej0kAk0<xUEmdZ)r&D1+8`(j8#8Fsg8!{=vfPS0X-=pZ+W?0mqwR&}pkxZ=NebmRyNRDn57HqumRS!6b0*Oy^Fq)y&6~asW+(*KAvT%}bO5K1Q<B^@rV3tkNKklsn@My%X9OC`-2U_k`F|DA7C({6!nbV07J|7^mj8XV;MD^7XykMf$zPF2?Kv;tx9PgU%fq4~Enyz$wbdTTcakoiBOw0WZ<*z}vb+gfEYziiu38E!a$(S^YpWZxUpG=zh>-Y5>fvG{I9<O}Z#K-=L>?3mJE}y(Ql-F@dR%y3S~7E48{-;}LW|a{Zbm+-rwjTC=xLG44p0pDs}AGou#V6p4%PbGdhCf}u29SlwcmjM2ksTSV6(HK;Qae*T;jv*(W4s9ax=r2K3py+M<9=j&yyyegBaA2@XFRLQ!R9}S-76|7WwZS>8NmK}mYf#05RRHpP+uh*k?%9!yL-1{}G*88}(;r{$SXD-{J@~2`VX|mLiNU*~`yp_B_#;Z)5KK6JQW@rvx99z}21-_~<+Ya4SMxu{b7KhfT+?Ck0Pk>cSU(U%qo9%AnY<qN71Pq>~Hr0!r4SsQIwPAyU)^h7~I~244<`>N9yyuJG8^S!e3<39n!l{X&Zorkju{6iv1-mrqnR#q~l<}@Xq=6R*7mkT$m@@L@2r0vd#5)}(cJ-L^UhpKRLF4kK)w?^I)b7_bC_MV`!tZ0cgYspey*nMt@CDFDejaSM>Faq|xAfXlyZ1ISLR-kC&mN0@yRQgn**gT$=GYRrIghq%=CN@$>?%7#t>r%cHjhW;N{(`~4%H85h#NhgF{zZvmp1~@s4<&`3NoEi?<$`yUPi7&G9Di9<g(~N?sZ9D7~Jcv2cOr?^D5?SQBR+#TXbGEpbS>2!V_m!w(H_KW>;D}!ZKc6qI++nxVf&?UiNpAwij{b^*LYdC_Z#1uZr|~@0;}N>uqWyi2I0seHP3ZJ(weI<&5nXbk^le+?>$o4f^hl9jCn%{rL20%=Q)dJtgu7jnewKg3od(kuvr!ZL24<E~tCZdv~2M@rh#F8uL`Wigc((oa%U}-4E%5n}wD%O3&$pFYH{O)j&BG?sohb0Kao*!|+$-+&n{7^houd>K&?zb(rj)hD+-W3YA_!LYL|8$9u3>zsbo}Xg;<L5HR;7;_RRGQ43vXWn{<kH8bBwV<C>>YIuDw>WE}IqXx2!Jk;97N2(-jyQN3Dl4qRf*Qilr)Pd(uW!CgA2zVZbK>K~7N_)3}C-ogOsj1PW)EnHE(YSoBuLg6asG4&TZdf1{H~I2ulXoZEj?xk~eyF}c;v&q;RB>)&8k@x%zjEnPxjmtgnpRFHo7pmJvFkQ=c7w3mpL2bL3XAj{xrtk&Y7DXtwf^=q!L{a$ZlhuVu<}m1On!p!*)5Et8!08uYYShlw%D-S@p`njdNbrao#E_<YxJK(l>(=JNjA&h_u?`q=x4RXnH6qrz{RdPC>tT^vk=!S%Wlw5^%Eq+*Z!n^cF)2V+3cMXOjj0al8?f^8)$d*megyb!(!V+pw?M%RwKEdfQM;{-+}(IM)58LFh?pWmuQ6Ss~d%jrj4t_gbZ-OHX?e<aUZEe6d0_jBhL0_+b%&B-Kep{Ht$wa3`a*qS3P7}dr0~WWd%LYla`py67UhS>#*L3sH=s7iP*p3M-yEQE;({_rW`acEwcBzGXX0@``Kt97NgYG06~d~(+%7~c5$l*O<ED8xanTU!PJ^H_VfG@uIC475rR7*oQUgLf_h9ivp;zNuFHkxS^M9Cb~Uz|S^AcOwzZwc(WDYYyF?Axi@bT25~Avrg~y|p?(kv1<AR}@-4XeD7tv)bbeT!$R*uqgH{rGL!--*cW^C!$zAabZ`WqSf!+jiP-6+24+JqT}AF(zfdoyaV2CBopp0;bkr7TZtjz8p53S_oUf8o)9juzM?=8Kb!JjuuDD9>>6z_-u5#@X0Xv)f!HA25x5u}ejXAB83BIyh6e!~0kycc7|4Y;#BbMAfVdkX1)Ns@YL$YZ_#UH0GDM57Ml=(m4fNqT{Zb5mb8B_@1<DChsWTi8XLCz&6(A#8aQt<Mu&sWmK+|n~nDE3e!BT^PeY+UUq$egsgkgpFZH8CK@`5Bs036i)(P7k3NmJW5C0Gk?`XxHbslPT0jqd3K_2lWkvj=ULxkD30sk`Rh%6=A<Ur1o*iOaZRAEp4`$$gTzw?(jwN}B*gyzjMAs$1*;YY$@L4v=)egvTl6a1;ATt~8>f4)C=|ZnU+h=7}sGX3PM3QTj-@57@q26szx6<oqJXoChmNVo}16V&e%LS~jHWYIP__Fb%bOa48`36;3zFMn(@D|^@pUt?C_t=qts>jObGu`1IFdw~FW(x%BVLDjb5jaa9uL;*n%iccTeB{l^tVZkeadn3HRi{mK566`;I&q&$*hA&VyW2dshrM8SPOP$5Lc1l-iPq)vFFWr`mc~y&7v$8-Yn-uv$-b~G9jeO6I`?n3_d)p+C{^4?qg>h5y62smZTKv0cKeH$Uz8DJPGE@Ax%SYxzCW+E_o;ndG}s!TZZaV>o(>&Rs59T8fO)r%AyMiNkB{oU;YY^c(ocAKhxebou{*AybaA=@PaZyQT!~^>Z@HZfU*qz!wywwn#V2ue@c!1S*7Vfsl}OU&$|Ks7#mQ?mi+qoJj)kNuU)N(4tTrI8GX80lvOEx4G#Tv;b~ZnZTs`ePU#E@7nWNBK;r#*Fb+my)6j!=3Injd>9KMeBRYYmbd+AAt$Co_<4~?Ujm1%dn>Ct2r%sR%j@pZ%5gZ5q9-nVWh3^|sDAFcU!o_%*c@?iRlny==U9$9b2Nwv7;SrZ<+YL1EZ^<djx%GdYaO&}~(y6xVZ>)*FmV55%!+VBX11KhmF8O<)ZOFJ6BJYT5YQmcz16McTerqa`ydw65DHntx@jXKmO4PHWfer5Ryurz)v5jA|mSj4Kn{BYF;kOY-l*8@9Zt??Yw(5(hkICk2Hzi9efi*1<E^u!#2(qqvj!j%@BTP}LNjGTCB>ssf2c4>A3VY@?k_^c~mC|JzX<^gIfSLG0lf?3;KxajQiOe*rbH4uZ^Ah4h5VRX%@C%A7#b#ZSWT4U(W%n==<KP1c0H}y82+8|HvI>9dkMmI%zyZ%<@MePAnEk1g_YyK6{A!#HD<Y4AMZV+6;MwWDHov=gGP;Vai(Vs)UPe2KJ@OWXszN!IgcIL=HmABRCb##wK*6e$Es$QezmlQVP;B%Q9!fu(GYAv`(feYDXI1X+pc|3HV*PLEB`!Q52K`rh6hMgyOeVMNaY*I-(jfHyl3ZOOKoSJA-P1~Qrvss#Ee#L8?_$~X|)^YjCH;EQ4XLsCa4fX~5N`hVbJMM<h%HnI?5a+|V=dv^HD;aPWUU@sx#Kydj?52q-=ev`%Z6Dv%tmgGPP$kfi?AYwiz%ci6SqoM_C2}Y$QZp^zBeV9lyh~qm2F%2=RXFk{*;@#HNi@7-9KV_qkvf+e?vIcFMtO1d3G21F(K9vD@no$aYPC_o4~FSH(LwqhO#*gkch36_J&#_ADb^5G%{5jy^}OP9eYWf2qHhbQV_E^lWGmdWkS(Jx2bCVJW#^(VZHr(eRSllw=4%i>(@N?s!3NYxh9hmsZ>j1W*;uP!+{(LQ?{&_ZAMHP&3v(Np^F)NTYpH!5I&7_+Tu;5^);ZZLtgidlN|#o)f}DH}ua9OwGL?vzG}%fMz+&Fy8r-Nqbik`%g~0c%95c*DiR($fQytJa&sGb%+a$b@Y<z2WwI2Em4q<&L?VjmTs;xAYpOlf8>OalId2K52p7Be_WY{d4i!koMW&I>|2*uq;_v>}-T-x@5Mammf$hoOpnwx-(N>iL@^hM)yC4}7xEovdR?&hb{D;xLq5~yxAG<Vsk`BrLWAYG!^V6M48;aZqe>LhoIbcft#J9Iq@wKP*YR1DC;9d6xrEkRfBl_7aLmLO&9n?o5j?vB`M-vIg9c2+r8w>t(MV}Up8bdKcp+oR0a!zqJfiTuUq7e?Q!vp8@((!?F-oigu={r<;T?a2-~ZY&VEuHu)+V1Ot>m#~-zP<3~UPFad&^<(I7cS}P)G@a$zX-co<vSvV2-y7<Ki_<D)`UhI}hH%>L?}ApdaWX(?p?W9Wy!fD5jgO$PH_Yc-ELra5b?1`#sMpZ;jKjH%+o9m|DxuKkGdf$;md&6=6?z1el&eAYE|#=`T`zjfz{^qln%A~l>Uff?t>Ud3-;;3c?|<x5-@74#JgU<OtyMP?+^Y07w;v?^>4Tf}j+y7O+i(4gmZYoyOg7M){xESpzER%-O~0u##D#ov5^m4<Fq&RNDGinWur%M!`*z@d2Jdzc<D=w6SncPBe;TAYO-*TaI<m*AJ(+$vdepcfrFwIGcv)HdvXcpUbFI<?erzV>G~ZX#DX-T+d`1}_m*dcViAi)MC<wVx5BqAn`>C<T!rR*VM66}_D$7r$)1)$g`KK{9JE0i(s!TmOJW4=A(P#XvxqcDeT4=5i?DSoz(lV;y$=F(uA91^tf?Ab71?2+WHd)$z*Eg+pYIvPm*o<gC>DXs@eDZJ2V91KZ+gyL_c+)|~s@H#wsabuptrBx?_U6UrRZQg0$P9?>a3eb`+emkOv;RUKxBCfpH?xM=+hG3Ze6Wzub#^>k=Qgkc>QdvUiPU-|fZh4PNhF*7x(n6ke7(kyXXQDrPCR9&pljhxo2^RFyLl>;hn`%=sr?Csjw9)4gu?=#K=L<nD7<7isL`ia?G>}e)TcOFNpX#h_r>zu|E^{B)PFU}W^eFm`a|p@Vjou%#fuc`Xog1Iik+BR>wxQ5A4%}ZHL71Tc5|vfn74cnRi*pdTNG#ZF2-i&>|6Iw<MJscSK!kxEpi193Eo$)tZ0rEQxkFFOO5$dE<a|)6#|TNELDSkPKei_2>T0!d?!$v6*dEkllIchVER7ZayYfIZpQF6^1$$I+|Fllwh5t)kqV}8?#(+V)P_5+wW_DeytkQkRi{}T10|^S-FtgUduO*lB>f}XQ@=?;ec6^@vYF?kM_Dg7MMcJ)e1{GvvXw4L14stV@A#2t2Xmlu<}ke$?4-HX=p}hM=~+Dzq$NdUKKmDCetN?ay<aSlStZ_2ul-)LyY;WrN|}Iz>`{Hk2NYc%e`CEkoYC-c1gzimm7Drt{TyE6Bkwmogy;fYpm2>!#O@+Vo}XvwC%La{RxyGFt@(Pg-J_|-Iy2zQ2g$|s$Kd|$k54PSdYwzdV6fA#C6Zo(XbJNs-GoI0eTM{%<y<oK>9GfcZ!44P#;HbtazjVYQNw7dCixgwZEMDjSMr$}#N>(gHFNRQy+`GQ8`iH!ccDBPg#{@Hyu@0AId1yo^rN21jz3ssgGySL#659E(qi%andkE!IKH5mkzU^VJ<aC#YdGdEB<9@WU}Yg>8E=H?{V9pl($Av%*V0G?d|?)K<Gci7mCzfm_|F&~445;iLK}PUsXBVO*v~1$eO{{#+$<}PU_Mavvuuvd!r=Ctei*K$LvLGu;9;U5y?(Vx$pMC!V{<gRFZ2VH(A#@`Gqx)8O?95xH{Bt=b0Cs@m*odipIM;KbMozUUfYu1u>8ekDm1G($hzV_k3MrT-tbIFg%eYbqmNoXI_~9oBf`Dk+>sx4K+!LzO+my}eVw`FqFZ&3?+;g_Y7^h!%jf;J2}N--fObo&jsPE;)0F3|eCnog<3k^k;h_iggV(aUYU(q`vJ)#}s)5)Mr&C(c7GG(ZGvuTMx6DiQ&?=>4)Q~SjiLp+MUN7T2_*N}X4{+V$!@z4D{JmPkN=mLHIn^28Kg}o_tzOj|cD84C8ap=&^?ko3GwGQ61=2&)#b+U1Nv(-$hlL0o!*(o4eg;^}erq?aReDtz<eH7!<TPn_EenI{o3xp(7Pi;6F3ClCl7mYbQS(uksPB%&(7yR2ZjI^IfSn#GJ%wk&jv?#*lxQDCVY)yCY}!QxP^~|Ac;!jj3-=@gMgKD*p-C^Jr;X{MD6tLy^fBx1P`ICDy=i`p!W$lHb?j`^g&1o;K%<4Cn^h2ELZpjf6=@o6y@x+nU$;LM;H}#l#EbiK<&{^5i|iRKm>Q`itua=BcKF8C!k0X&DGID{)8IpckZ1FwAs>GFQy-q8xjtI1#ci$0mT|uVbq<~CnjJHPX{#(2jrmd<e&>6~XJ>6^(%7u2>0VmTmaTT>k-uDu<*zv(C)2OE5<Z9Ycmw6;!~MqhI>celb7@RQt04!Ks$0L&YFcq@_mk3eZh{@4?p|%+@?DIU!1k7#&tC1?&xS5k3FXahsBQVytve{Vc*xu9_8}>g?-yMwkj7Apj&s$&ZL{Bm#ApKuG^xO8TWg@>*GnlCcS-e-%I&==haHr#mD(C^z9$o@3QTUU@*%r2vsWRUt}t2@=pIu)t9r%vU1wP$_sApPsb25??#tYsuY4aCG+}4m$-Sx&#Qbd4D9f|0C28l$Z@=_Ow;1;}L22ndW{Y|F0w!K6sQ9c_&Ay{MCIdXY>9t?3(_22pu3mu4_>^}*r^$?6Ag9ZZaWH92Ed#>PEAw43O^U;aF*(|z<2kiqtjBX_%I&cOkF`dw@)ozaY-c&d+2(qYSBr1gyvj7XZ8_uWGzTl3yxuM9<s}Ten4rYZ<?V)n-<&vIy4765w*-$@pHUT5VAX<0`S>G|C!$Za;odm)vwe9ZqR5%z6>D;egLJC2&Qnl4H+)+LmJNejO`&2i7*`%jzHDgAYNH1zJ|<S|g@4^wr{iZ6tuO6QRSsd~)hU<P2P7L5YhDJS^|NRi(=zFc?k&pon|Wq5q?aGzt=9pe$~Idi_C5yp6|lo5_=;W0KR0OIRJRNFme52?dhTrOuPahuk9K|Ej>n5lyCl_18(}_FvN)x=)p_f1d;<&tXg1nj&JyAdAEj0{DJR)(*@aQ5HXU=_T2yqnCe@Xo!)0)OiSMUyztNlo4SXfq=Fi#MXso~C$jNYd7n#s)bidPnyQ+L^VSTR}d)=AFs{aKh+e>Z<-F04h0F&mO$R+FL#P{c+E1Ce^s_!_k1^P%8U6F1VF@i-BY1^MiOjY=+;CRNDIXOnh4se`-zW?YepGm+S*Gp|v##kDt)6@`b+y{+XYh7T#f|F&V%-gg2rca%*t&Rlybav~ryA<z63AdY_o(q=Otg5jXu6Yd{L3pKE@pW?yFJq36-qK1K`}8?&2tvj&SFwMXgC4}3xyjj`xY8KW_4z2E^GwI;>fzvgVzj20bGfc41EdViwD?k8ZnZ!jMNx~n(tRSv?ho1B%^daoijcD|B%Y0MRSDYT`hL3O)8l|Nj0ntC?HnRLIVcTl`^ju!7`tY>*?6>r+xom%+cy&bd7$jVP6#s>(fmV-y%W1?&Fi@d|GAsObQTS7Zc$9Ncco7fQoh}v{f+V14T(%)E06L{#oSVoPO!_#i4UYZnGnEmW>(pn$448q!VE!YT+c2<Pddx}$9`uCeIbSriK(pxbB1ce8$>j!4EXFV{deAZER<WoZDF_QqvCvusZs?*og=YqCcRHve2!wyX$(a^qSvdZM|{n10o}Scy%Tn32fSSIyX-~?HsGTQC-MRQ^<o7*x1*!w3m9~b4YT$lRx4!`JWzD;xF)-SIqUTn_^3aAjXH~t)!lHwxFU8DdYLwS<$5_-<3=MM-*!sZf!Kj$SWW{SwIzZZ{kh#w^S%A$1Dv>A-RgUdVEOiM+}O}hXZZA$SBmER_Acp}N)HWaNYf8(9E{e3@H_)o{r0uO;l@g6Gb<nR`<o3sG#&_gZa3ffFr7%}d^##U%4pZDTw0Gi5U>r2WT*A|X0|NPa}Dk6Fi)SD^Ov3F<mS}g(ZiA7KGVo@(T6Dg@Ih@}Cil*0=+1PR{ApKuyA>RvQ|a>zlIGNgn(aMu0&v*mSaY2&19n-y(P`JT@qpRHEpA-`j{Lf{!lNTgj%!1}km@4G$fiD$kKOh0eyEpA?T&{g(d|>>)`y;F^>=;5p7pFZHY1lN#V_}iCMq`|pP+1c@mwf^e;~fyZP4A?pHY5T@!<P5>!02EzW)^VquqDU$a@ZG-AEOrcgI(!E78F0eHrX_lj(_aSooFmmQzdNbzickPc8WlORBEOu>QKnyQJh3JBK|ydtRr2s)o4UN+rc!na7*=+4rEv@Ur+4N`B4Io1|NlD@}NjB-OP%XwgWyk(V|}omhfT^aq7WT77Ee&cgZVL~Y&RcMMW+@8k06e(Ev*_J;FMRq3RR7WCXn?`))sV7yng8?(mOx&wf#27JkPUyDFSWLdt$&^eFCL7;e?eLU6h@wA-Dwp?#PUYy75$vrGjxo~+*ciUsjyI}pB``G++V0$AuB;yb6bwD0zd(jew)p5r+R-4;ZT+$;z8jcXcQI!7Nomc$lHKNOLxT}Mh*zSB<Kc@lg)q@E&a8;(K%V|Gf&PP?X-IEt7-s!!D{`Kr09_^=AY!0K1PYMk{+<1^^)2#c#)pgL%o^kEGzN?zk=Br0-P>NS){XYDi+@V>|ev`c}zK`|pImGFiz1`GU0<g-BudL#qvF}lpX&5_<M{-c1L{=#jU37;w;De05fJ8v?;``>WdS6JZet;fTDZ`+0=c<iv&_OZBQ8}p`fNJB>jI^P)6tsJ=VB)H~9xtrq34k^@T6?=*`CGd8!D-`SGKYE3D>xQdV*N%?JZwmV`2|rurj30+C3KNB4oPCfy>T?E>rElG5_=uS`dzJHzr()?ea*vb4r-zWMh7*Czgr&MhS&IEk3Lndd=J^&d<*Gu)%_4KHQ5g&if_7^6~gBfRGd<B)JjrMU9+137o_Y!^q5_8K;2{Iy$T@473T)us+=Cz?VgRRG|filsz)t`U&nS;>gnfjs~V`H->=71_^EWEV$=fzY(8GL8(xuY*07)5R42TZYMDc)0@-#i+fCE#=fc*eoefr>^Fil&?e?6@=At$c0=T?EZIIVGlfAoL984F~&Zrhr_{P4pJ1BU<DwW#Bk?=beomWQ}w!jv$HNL3Axk|56Y<p5WHa{z^A>ELBG^)TU))d1I-CTdBx+fSz8LrIK`=~VD%{_2d76u<pki&F+;QhH4gr)4ei`_=prANhMQGtfp7ewgul<`^#o~1as-VSRCAoJVS@~|Dcfb*D)v(CQv_&Mp4(aUd59C;3o(QNAdeD;DQUp*g-JMm|3P^7<Wt7Mt}L_(g_as$$?L5ruQSDTPbhdfTLy#1mN{5!x2=sRgM6XBJq81C%-L7pD-o_u3ByKd!H)UL?5%TQS33VeDi493^w0DF%(Ye2W83#9r(I4|CUvoc~ZUR}(sH&m5Dqy-v0XF9|A&YCTGR%yeJY!8O+qy+kh{kO3R4x<jAyyDXCu!kzRv^z}f82LyQZN1VyT)+;Y%ivO{!OV}aML@9qd#4PCoXvfbwk6u#(<miVjWs(%;H(as+g`J^jmpjuY?i^2fbdcAc<43S9}ZBezT2$DRWSM4@{(?Q>+sy!uv=^>U65r=c=zF~+$@h+O{uS4?Yeg9RhMdxi-o;6VSd%Uu<(w`KA?86DiHjvE*j|Yd(F4&-FER<L99+c0IJfI?`V^%^T^}wqkxkpUybSNv<%K_Y<{`q#hk$}1)r<6iHL+2Pvo$Xw{Ct-^grBl&^t}H@9m-_4TQ;2ed;qct;kSBz3Z8jM41j};jO>Co}1o5v8SC~GuECe`B}BgecY>xZRepd*|E`6iZB4q`n;mD@I7wW_ebwt#Paxb-@Kk^1V*J&c`ngRy(twv-E+_p8|d*ePU_yI+gtQq%;0Y(5A35Ith3gNlC1*-4sYDLgHzEqKqV^;4XHSB$I)Uu{&=q=7&D#IT_!n1ph`JPHT|e|5bYA+se{&Nh^PBcW8T>}f)z3trZ0pUp9=I;o8MhoIcPCIJjDy{WG*AQb;>ulMu7G>^7M|8XA=+k9q&F~LuwdRxdnU4WYg>>`>CSC5Vo$=$<mDI`);N~jZ<?q=+mc70$Hx`ZgifCTV5Q?23qzq&<~tmR<AWb`+QUzaA3B078`h=j;Cup9JaH~`geXTfdM|1>Vw*Kj-Q|jYDHU-Di)9K8XJ_H+2^>DmDTXP1<HZE54zc%m;ELOG{(mvb?N5ltdF(J3Rn4VtHKMux<{Cs42C!(jmLp>WM(K}KN;YV{RB19H8%w_ttm{s<aP9B9Ih9Zw3olHNYJcTH931_Zda}KUK3yI2sf051U`GZ{fFOqciU7W3Ye2GN`|%(ZvBd+9(CjLj&q>kvs<;x6%~0Um(kKv;eDqxz0Oc}n+z#S?2Z*`)?qT@QQwqV6B)41taZ?EEUL2nXIg0&$KmQblaX*M@n=Co8<M?8DfKE3rlSSnUv^in7n=5Pvb`Z6-56GVxH`mtHhl<FXx4u{)(<FVFI{X~B<ubJhPRs3W?If`CVsi+R4;}#s=c}*hzSutQD2OmCQ=LT#oW^GuYH}&8j}oV&g{&XNc$<x6I^wrs;}3oL$8L*=6$;CHFpn>zKetI)U}{Wjk~eS>dvJ6{ke7rx}(m%R)YKSu{<BVmWN~nyTGk=5ztw(YfeRJ#VomyT11C&FgqD}HGGc7SbZ_57e=RTUS>*MOlp@7&urxTr+AlGu?dL}@HTd!+Q1#Q%^-Qaq(KojdbGt!iw&e~c?V4|k6tSkj74};w|Mx1*{F12S#jJ4;b{oP#iserjup&V>eH6f2k1(4CU&z)&1!IJ)j#2_4CuN39R5O6Flk?{Q5_!r{57DQJ3-Pq0iW@3)hh?Pa%G{6c0~v6TJHfh3p6Kxflqda57u;?-puZ3rOUL}7PhbRrz=HB89-QgNtxMx`D!W9Yuqc5{BzT<Xcy%IH9f^K6Cxk4<GGf4<Y^tW@mcaPIO?1L(bKyWRtnfu7uyy1?{irjb9TYoUjX(`+xUPWK$tYuSp`4u^kM4)FGtoP0lTPDDG2*$4(`gXEUl)U#g9fqJQi9k!ek0W6vJwHN?WaO06v;n{7Apw6@2HY_sUSn(1bKVn4H6Iob7OGz-&KkYEDYasj_I0Q~#B^%Rrl_^xRa{hV~2w(JdamspZl8)GPkzRh=5q;8>zcXX>+GgLe+38j`xULCb(<Nkz;pXr*4xh#^dST##oOOtmKAb2wpigbKEu)<``1lQJovel#8EO!PgSvFq%3yq$|IeO1Q5;_G&gSxWQmma%zm@1Ag;eXRNhJtmO10G{_Yoow1J(m>I+)PXCdl;4mKIl*_*`m~$B7p+$3NtU6xTmEU9&x8#(gDyC^%%9!~`W$(Aa)jSAsR|%n1r(W5xW~o%Yo{ReQweFq4TY;!JM~Wk5}4|@vj{9*pD&MttGRo<Te(2k4L3Vi(ehw5eqIkRB7@ID5i;fk9Z#DPdYLS$iGr*<Iaj?`7oYVb<JT{&{h6Cy^W<q7W_{WFkT&&2w4#aBRFA3Ef0Sn6E?itAY}Kp|s3wl83u%ErQY8h$I}-^<hOdgv<!s!(AsrGp<mbkhKr(RD7ghsLeOr&LXE4D)E9Ubr$*reRt<~&Mm)E0VuD`YJX}_Z*7>%jNjz)9Lx1mL)7!=S_5~Vs3z*bkyrrKP+69=OH<(CuArP_7iZ73~#`)Cy_FDW%9nurN;orjuMTa1O$;Y4Na32iI)uiL9#KS}h8z;%oDjEyMO%$K9cUy%q0dRL$NAo%@+Q8PJbB~00^S4aiA0+BF4E6xW_`PM9Ri)(s@@^pN*Zv?*B^rl!*?!ov{bYgJ_%ub0jMy@f<RtUf2I`)%7(BAt64%X>%*}za)qn59Y1K;yHDZ1kxLOOE;^)<(;-@7!Nk7OT9=3=Pkp9DJ2n#S-dtxMd@LI#^%%otirG^mF8O!fjorbB*PJ6_Z$-S;A-^}x2()vbFv+t-&);#I}bL*UlbF=g;2*ZtQ#-SD;51ZO1;+=9rWb%F;|RAtNaseS6qHT+w=+n`40)$B*eb;Rcc50{>BudWT*Dc(eZlT{c=v$UHT)vR4Ab5m)qd)^8z)ynN+Om7YrT9gQujxVd%kH&j2vW6P6{waw7Uc$saX0MfCq`k~_Mhxf4w8TxJfW0@@tXMdHtNk+*^sc&Ug}v){Z(Ij6&x7v3Xz6}u1TqwlO!CO7`f_K>Xs@T68e)2vN~e?A=N#&OXU}mMkc+dzczG%8w3f2UAz6A~I)1-PA`e1t#<mPEIYQ4x;^b!j&@T^`LJ3kXl3r_*lf5P1uO(vp0OZyus;``_KL`4q{R!=q6M0)t9^+19|L{&&99Msw%-o4fW^VkCS$Qf0c-|^@eV6F>E}f+IFo&;3gM^u2IhESc`<g7U#f!bP<<)h~)qJ^;<}S$n6q99_j&)AFxn}^O+BvTf-OaOZKP%S){Zgl`cW^(Vl*}Y;c`(gn-o>Bu?(T}(Ok>%Y_7`QYijj1qz$6-ox?|Wp0yk#6T4qq;bWVzhvGtf}Mw7li9$TEi%~bhItSo<7pEd6Kde<}uV*8Rb>lHYonrv8o<F&Xk*Pd7M@;Is6-PvF1gM%C;{C0E0$FKTByIQKH?q}Z<lN;JyY59hAEZupJo(0Q2kM>UHeIPf53U(0UqEarOs1zV1TMvLoPwYu8dyFdI0pkq{;J#3chPl1ZSKl1)E@&4oL2}X)cV<{urzQbBBfkHk29cb#(T5RUkM*DtvBmzddY5jM*<tiXCAVC)zRAvNHRQ&?O<twt!M$9|60B}+$^1j+Hvc+4$Ue1Vx(PD5!Xwz~5E<?1QSJQ+Th%G0O-oH?e<*k1?nC(WyL;um=s0g1+~)T~P0JJIzGjPC0UVz1X0I4sxWmIFI<vUfzE^y3P*qz&;z9b+NriM;>y|yZsdsobS$F(qG~EDQ9T(yN7bm6rb(=ZiG%!}ur*vAtTF1B{ts(5TRt&Q2Raz50P3ZlHB15zh5vkkb-1b^>HpeteKFh;e?b)|Zyl>c|i`=%r`T{88&-fO+bIWe9IMo;9)#hPcK!Q<_;ju!W;ZhEmQ|+V7)*S=f9GHId*|v2{IVNy6cV7OKiX9itv%#69SZbV@*KN1k;Z6?Js^8B0`<UV%V$)p2AiRKD<MW*`8a<f<YRubQG^<_3Jb!*_WJa^wD&cSYXF;Sqc|<?(EG{p^R62A=i}ilDFZqx1`uHAILyt3^Dkms&?MLb3?lXQo4;`JN(9xKOTgM7yfqAl+c8F$46ghqLGyi~jq31OD_DPhQX`<scWrpH=lLzhoaUCp%TK)XfeLRRtu+6^Ze44QNaD5rbtW!Gi**IN^Yl*G=B#Df4o$_o`8d1+-;FHd{(ibUx7YN}|t6w8|z(h<o36=E7SISq^Wnt-F|HA9~E!c7kayu-q$K9jOM$7`zxS@L|uIH?*bJXUGox%(DOfKoGHUAOeab{Hx)SywxdI`-1U=t&*N3n0#!&6mW1Q6r3AL%j+qmC7D@8_m^Kzh%c%2JHk=y?rStU>!yy6n&LT5Vn2`^}FZT%_9$I#rE#XFS<W7OutC%BPEOhDorx?{xx_%O4Gt=??+p$|}6bk6~(I(aVj0eFIq1p90r#x5T?qZl(kN)DT=hALqi8Yh7xjf1sElBMIRgK{lhI;qOncvX<=f-oz+T<NC@x<DvG=%j(+0kmmG!Y9PpN0F~`N0f~)4*1VBP?HavUrRwQnMm4(ixPS)3z4I!+e|mke`|}?~sZH1jY_uDIi3;?ZoR^Igg|$O)Qsl!YNDL>c@Vf6t(ZmQDrN;Jir7XaY@C%c2@xI-EuFKH&ajBb~qhM=X!J?EuTlY!uxFp87*{Ksz#BPiiZ*1|yI;gE0G`y@Fyf2ku^NX#%H;Wzf>As9pCR7?sZ8GoaBUn5q9g@EFeckS+Z7Mc^cKYoe4kf7B-oLTdQ+Yh$gGQ}uc5dD(beU;U)7RJs6{}2)&0=$Wz4=q}7TtT}QTm-w){&k-YpYkTab^32ZxtKcOj@b7SRyU<R@sTA9MlQ_dszp-^Rk}qg`H;nkT9FIz9#fM4gkNo4W1kUHYJV3P}5>RMa%oxtB)Fv_wsbtd`r(5g2gMC`}oe-mif*$3J0(C@>;&R$?bOcdL7j3GnC?$PWLT0oX;!eM^L)f5h)-x^+Q}<!$LfWzSV&pHD1X#CC9vzHiG0w%4%cvc(M6S1FpdOx;<BEOs<Y7n34c&O2g2GE5RFUg$FE8(Oij<oBHISR_6HyI)3<E4Av+DR&4KHj2aJAXI|9sfPdR+XukvIpbSI3yFW~gwE7WLuR=igY16I?SHJps<`l&o(Vo>;fIs)x&PGocmYlVh2X!pn4gx3|BHU~vhTG#R^8&HNDEIPi5P?Jkthrlk^pYqgk<(^Fu1;rK|4y!1Dk*)67wL^_!AKccf_BxTZRPapbJw<qDrKp8)VPOwc9zP~ur47Qq|IP|DmT^Zd3m~5hEMS%Dt+%o2$!)H6w-EO7nPv&>hIEZweelmN=a<A+~=hCXsaF6(6^`C=_l^UnvYG!gWWsaLe^k<395c8>5U?jNV^kXB?KChPD%fM*g{T&U1=jJwXXwtJH&apzehqlQ<5v`&7#(Rz7CE{7@0d*`+OPS8E)mS#$j(PJrH`DZhT@0wuAezk_{pJTA{cqeInN8?>JdShjt&SI%9Kzhjo%#2sd+w8Dtg;Wz+4hH)vtrB4A3>y7=x$x_cOubfrgCtB)S=osX*DMj((DIP^=~>iG^zr;f7HS^97r%@+Bw@1K9F0<M8Pz<w(%1xQ}E{k>N<>XKaZ-)@{|wcfOIL3&6xEvfY#_|6}*h!Zi-SjL~1lwI5Dw7v;N{|Lx~dF{Lz%IaGgsv^9_7jDeoXVF4)&BoZo;u|@Mm0=C>txf-uN<ZCEm7^Wbyp%CTjv%3J5IR|_3+;PzSE32OiU3Z!8t(+_^40I{>PNx39i2}0ZCcP0GcU|?eHnfr_3bOIWIE}g>o<=pwu@$;W{`iE@;4B+Xo&9c{$O|Y4~xsru@z`cgcH2)-N3K7T6OFwZQ*46o?Gy{J?zeI*dEqCxsZPr>pV#oxyg1ZRC+%vRS$YKqWWVPGW#j^x+{*md_1mwQTOlnA83CY6h5o+VM_FG&Kdj(A`RX)c&rA1(<9sxAs}0R?YTTbP<&2YL~Hn+tewZW%}y?dr@~M^2JGcmfghIp0lQW@MTsve-wGglf;*eqqF1$=(xs)GbKAJi`JC-M>+n{Jt{}-e=Op3fiYyAPU_%``*=;>}YQY-mZ~NKsg?r3e746dvjP~s4*g}{}u*tkNPx*DNshk=><xv}`((|{KH0XZE!~HzVM+<^o2fy=q69EsmQEj)S%LJjA=jTu@O*`EwT1e35ct4#7`+132H2YqEGU);Le$d-_gI;5Y5%FW=7`lJ<E&x!)rpOBa$~D;t`CLJ7ugB!>^v|U9qttl!c=6TV)x0)Rh2Y>%wYeyTlx^J!wif)nxry1g#WF|2w4*`nqp{Bx*r}q&z0()#etYtc+IqdThclyjGFbqxfY?q0_=H=M*Jz6H0dO|r3AkO`?eDn?FYW2dVe>dQAi{cgE;Z%|BrHB6XBdaA`9-wIFV0B4qS@ZX6XNlmr%7)}z|K>m^=@XKmvGz~dBTdc&@=wxFVu}0KdJSwYklkBp>=$=!f;{wnRnED`rfXuVjDu<VAAW$hyK?C+vgTpa<WA1QtMKGf=&E@H+sAMl;xVJwp=c>PVKq9E%l-OoD8KyLpzo;>1waQan$n^e*;n0OkFvLXKiM7%Rm7k*QNnp{|_Eu{@*?_{pXS5I2v?CsZ%Dfnw`AXo>gVJd9v-p;pn*t?z?ZJ{F-)$<L^h&M`N_B)90eBfh;8wLqx*b7b?vxPlb(;S|3NV#}74?3!Ttyf48Ehw9@Gv#S-~iW133Ei*<9fs6(A&w0EMNnnLf=XwlmH!5_~!48e5MCPvXd(QZjU`3MyiofP)Gacmcn2O<;TdJgTUTXjwXt5u0*6jCG{y^Flhc7gjx>N`%F7-eD(-P#XyNgwu~)B6fvN$I=I5@GbHw>OJ^WjG$pi>@>WR+kfb+x}42EsoCSuqE4@_Na+HSZu7Dbthi7jzjpAoy!fv9R}>1o<F?*(#x6UEU2tebSzxN2*gAb1%e>0pdyMQHV<G2Dk_a2AU0z^|G6``FLwx)`fBgBDwS#pW?wfiNicbK?k6MJEUy*XoL2gvXuO!nUXKr5ho4C6tKjJjE;k5fNQo}=^X8@7Z_hhLSVLgyuare*ip-=c%`yYd*=JW1<j0RgTdN#4=KDURN$4d-uc%+8x6-s!$%Ra;T8MVEIxk1;%+##fs}Rp*hseU{rl;L;z~1ie!YN0mLh0WQ?U4R*4u`no=4@nX^X}uzClf(BQk`OPQH$|K1Q<~I!|QDjP6zOMMlqko)t-Wsti|LC-Jf1rc-Afb++_|-bn2kZ{<eh;-}ENgceIz-@CocDLD6eZwC5+`1{wtiXX8Vy;dRHA)c|de%u8!#7VBQ-%1L7Mec&Tzvq3ZNC|ncezr<+Z-Hx4BYiW&!<xXnDaa|Bs@5y+!qE~|22$ibC+={d+t)`LE&enVzPAfzJ3ExTjtx~L1?*AM#ICaO%jUXhAlV+JXcfrrlJn1F<LC|#Wll??qL0&Bw6H%yN<k@4_M*i&lQs1xnarE`qsi2c)+9jUbM^yA65jkuJJnD8>+ai{m7JPS((DGM1z?N8CH9)^zWTqXj7w>E<t-4Lz7<oHpvyk>lFr2cKOCKkVS(^xJNAg>?^<I+H66pjJZ*i8LUf6zz*ADZ*?+OzRtzNEF7<QCS%I%^6=(dG&OPOLTI0M*Y+ZCXt7d}*=brECl(PX^!t8rnC6>@m&|9#dV80U-K89-{tSK;_QH-TGOMcy{i>oQImuT8r3(#>opTUBH?(e7!pCg1uTqR&pdm0bCB8`FFDFJypLfx+s!yE9LVQ(djThZZWucvia^VJsuf)zJsiUR{yuE_CRFHY!BJ;cnXO#%!b9R$sMB4pe?q%j6%>YLH&2^#WmMU1H%KWD3~V%6_q5{$5D)zVRpZn|o}vhdI_^o5!JO6|Lpw#~{75dOjK8{5*%edG|Uy10j*eqpTXMG1H%ryh+w|8XK>-J(XsOcGIItn{2JMD+_eQom!=bR=BEk-7Q1#!ll0;oE!bH0V&h55K>wvFJ1XRXd*0)0Cm;HZ>^atUHu&!n?GC+EK3bMJ{z}G^CBd5e=Ww6sE^?M*Gd3seK(U06>Z`7zzjs9e|e$>dtio2Q%t7=uJT9oEiW~6p*4XACYYq)N{Z=5GNYzA!zAzFSl;ni&AV~!ZQfo)Pwa;89~xg7C4BFvn-NdYLq~#0&FER1zoj-Gke`leYzg1}Bi5583Z+-rGCL~cc+51t(_hUtiuDWb)}|kV6pdRrEU9^%Q!oA$BzL^l0Ghw{Y#on6yK4g-^>1b(xS%WFbCZJ>M)z5{7BD{hOX*j3klmMSXj)SZ<U9G-TQ}@>q|o*FrwjT`S5L1NPJi;Ea}Uqsn!MN>D`im4&nB0K%JvYn<-r3ubgs?j0i6S_4gRt1+p24<Z(CtcX;(L_WUBPkd<C$ud=_sTOU3;Fs|5jK^|1)nwM_m%Yk4_D9P&;qcEzHSrc@>qOJnTj(yc9BK&$<|%;u18_U2;B8Nk${q9-vT?Qu4{Y3^gVw5Vgu-2k&ap*%NoZFt+gz2N%uuf@}PEi(Y$w)6xlJKd2-KWjPiym8nvw>O`wizWU8XnbeqefWKPwP%J#34^Wiw1fJ<{NUxf+H=4?%qs8RW%s;Z&lj@y(tz-rJZz6f``|Cn^>Pkz`)X3DOSsTmO)GP5s{r<5TzTUuyUchjD&|Q(t(N?F>q%@dc%q2V!h8*i`sVRk)1KpjbKh^`Wi1n9kgr$b^Fj|HbHt$L`1MJzQ3{;1%&7mU`+X&BUY$|DIo{t{0+X8sLu}&l{2W3vRGh&wWq1QbK*V+gcA=3iqx%r0W^mgZvaT^T-m7NEEtA>A?i0Nx@@k7}L<omI^_QRDB&@_o{@SzQ1hp#0acet0WxS|pqpUm+DSD)x@e?tf4w)lFfJx+&yUO$0wafsg_dSF%U5ntdF*0tr?VlKNBzoE1)Ovl}^BP0!rWh?%77<mPQ4sTFe<^8vya*EO>S!UE>7(@d&EAO1Nq`P^odjvbRNIFq5hz+<`JIFS1$#;f{~6p<<IR~ftW(Wu6g`lyN$Jgd16GD*zHH#@r+H>o)|oX<;|(jL2U%1<vnj1FE8<1{9V!6+y}b92?6Xs_^IpNOaDOIzjVbuR53ygNrbK~l41G~<jRx6y?t4VOPTfHwOnp&*#bc8LYCBbF-ijKj?E3Z?hHE}D5@i7;S>W46_%yC^dh^-1U-~)_p|_wm)$dlJrd(hDJM#h~FY_ioa{9pTt!1rh5vuBb0ktOEgtHpWeC0RWjSq5~dn#vyi$PH4lD|o;Ca#CP*wfF*?tzL<Ne@SMTzEN2%EaY5oJ-+tPJ)B}=s=mhQ2wyHdj-Fv>?#{!?>h=)+J1_qC*y>+K<%lyo%V5~BwlAjQ?o@`ni<r1v_Hg80UdJC`YIf)vJ|bb4jn&6lMd@{erbcd^q0*|XDl5xyl*OSYdQ#b#nQMV0^6R#E7olTLq^tzVLtkv?2}dt(AXHQeJvjvp?XrE@nIcJqH-~s3>u?Xn-)hW#)AuvzqU{x4ekwh=v3I8Aa`GLeHw6~MQ`=5!2S%F>e)S5!)$tPu=%)!;G!>neSAj!AV`LF*kd=lLb~5%3k!>B%PoQGlS+G&idP2<s_3qT!Pk8{ME++|hk@>=tKy)1;uJIKe&cYM{jdKD{mazh{#0$=8gM7fCL7Q<Lv-4BvqN!xwE6<sYVRs;JDyCj`Dq0M=ZTfdA|v~oQ5McwBzMPyL3gXjdqV1gt?lS$Fw}AzC?~X6R8gfKH@DG*m0&G)XOeeWt?^Tuy5~WDU`S*=6@!nGgpk$b?MdFcd`j%NIn-~?kA9c?V`M;&8a~4<%x@ziz?0P3?%>y|zlF%Ie@R!U8dZ-K<JK>!Wd0XbRGHQ>c)8Qv%;l!xQ2RD?J0tH=F)r%0E&3r>+MM?;_w=&n*KaHu?aC_(5VPRihpP6G^Iwp?+)%;}1P<Grv4Yi#pr_erZS&_><JqGR@@=vPVh0t0ivzUAa4lc|xM05eMXHGK!DE3mHR8vJ3D(7WIbG~>q(?vt_)W`IAUaiI%>=p($b-jwkp60HEwZPg*<{UN;2`;>OnkMZ=wB6g)S`ft<Dvkm4}SoF_pHKi22${s8tvyAQGT^qrPcv=@fl9bmmPO5)o#>Ud-t=p!QjUoD?T1xFAl@v<LsOY2fs`Kzml5L#gy$YAtn#S@dv$HKI@3u2oeMl=cEm;+sf2w<3H&w&y@FIAaI;*CKg~7FT896H8g~KJOmew*1m&a+@W#m9LUHX$hp4o%KhnBTZdBsh&D|wwg~DT0i)Hbn2%`esFX@rp@UQ6%!{+S1GXH$T=r7nPl-EO&ByabD%KTf1m1QXk$KK3gkh21#vu`SJPG5fw-|GNf3jHT_IjrXCOIDc##GmuXNPrX(^+M_j4pHv^;vtsJxo)b0xD4RQ@SGaHKG@hel&Ni8C{*qjXze*F2qsC@$E0w=W}lOz&f9Wo~xkv3^rNx8x6X+S-TzX&lo}SV}Kk`n1&f{?61y4vhEv|fToqoJg$TL@RZLtUHzfl$Ibe6)X5XKmcChva?wd{a7pjOhyvL2dZXd$Z3sMAnE*+Ixu28doHzb1gW@1y4QBKu?nqgDfjR9#aM-ZGFH+>I#aB_|sm2TUbEaK@y~TSEOGE!sUT0x@TT^X{r-LhDyT|ZURo~%4Ub9vm>&PWitqi(p=k?xiPUqI)p|`;P;?rPZ7Y@V&6@Xs<ehyDb4nJMpd5y-2@b$9B-E6LX_*YF&((E;>Ig%KVP8XaieyylGC1Lt8_vQ4n&s%kRjS-08kAQ2=AuQe3`+!8u8uTWdmIg*A;?B{TlP}P<qjbeyzdtGDHd<~3dA{5^GiU!UCpEv$dxz=@YVJZI+3f3CODHBd?DM;55}LzXuTQ^KOq=<RxV{Lw1evCMz=H$Rtdm;+3`h0Kh+9q;f5TLUr&1Y2<g=xYud7vsZ9&K9tsY~04H|2w3`I3GPeHKNmRiydkGd`rVnCSbQzQ8Q{IvGp*!?+x3{TMZ(pu&F5AbD3zt7bw6!n;QtpmOE&j3d#^Yca&hfQ??=4}&;Tm%7`&({jJWh?y|7bhJ*zT1qM2d3NJykL*qBrpCK#QYjxOmv7>`%?m+&ol0=U(yz01H+$KbFTwfNa=~S=qy#0?`*Dq-dW7AFLTV|o^w{nZvUDwOLf#y#J|B=Og(qAz&iLJSkq}OoIFW;Q{)VE8xnW2y*Y<?l%|D3qo^eH>_`51q+{V+M|7+>?NAJp^z?kr3W$*p#7F;pq=)js?_xE{jA{L;n07z?X^r-W9OrQyicbme$4|rj37-vGitjYzq)%1aM){;ReLm}hSZ}j-fTJEUsag6$$?e0AeQXD&(!XHEv#)EsD|YiK;FT8ks^z=OxTTTU>xK(1M6Rc;9((NlO#3yTq;I_;6R#y1I>W_ll^+Ovz2#eZ$Rp*#XjT4fanh+jUPaPQv|G~zmzWsD&0P5eLv2u}rf0;G>Fa&hpXl%S@-54g{cvZ<VkCi<gH};t2q+N5PB-iGyOQ0gH9oJ+{|FpiSu0B7!Sh^GFwjWU^JKo}$O2n}d&soS=h;7#vltdUQ=L22{X`4+$&XeEN0zio9spDeWJI*Y4p&T>t`0^Ct$*Z$K*vZ>0yp~AzjLzXiC=G?w<bC@*R{)2;s3q$IiBtJqgj>HkDb~NaQ_j^4mf`Uo8;blk}_UH_~Vp;r~1t}z}YSBo`JF`JBwqgrc3w+8F?3PyaRp@R_a#sx^_OUaTycFg;hGeL^oLRBAw&GphX8FSwm?<dJ=skYc@|Equh0`ku#6BpmPJb-njLxs1f7hbO95~Q5Cqp7$=E%re6Y}f`px=p!xgAySYx2of_#VxD|rm)cHwL;kT21DuriM^(3#-cK%eevN3jVY1+sK<fq>tN&%Ug&Bb5A-{(KFuR9y#a711nx#hfC|6F@a28TBCtB;;vZ&U}_Q-}73CL-otWhwJ#)%?<@uP*y-d_d<><u&G6Q}n$|Z_EjF1}vIO9?a!x`JOF$3$Ae!tuv~$jkayScaqhP2hAzB=u*4&86QD+rOU{T5koE7HV58wuQ@_Q45>E2Cxr$IqS({->^?jbRwXp6TnglU`}!V$-LYYRF@1m$Dq<t^j$h@9DtVJPpT8|-{nvfxzh-2QP0*WwKW6b1Dwn)=g2d|AZD*4D>Rj%TeIcr5W-efDm~}!wZD{`Sj$n!D=27O6!C==TIA$>HbaKaQoBMnR2HtrKg8jRpy;{%s=3HtykaS4Vme!AM)t$`i;_+35W~0U!QJ9_*H9tn{YeZ-U{LWOR(l)>0vva+;AMu@sa;qb_SMWhAONj5M`0_BahquSkc*0#ZWO_-ZFNqi8p18VY96wHHzO8gyZl9QnQS$Coq6%xtVB^#u-V+ra0~l6|oe$-ARcJo9^XOT}Ckx&U4}44H_)$0hthCyasLvW`c&vAO+Jrdml)w7Cjq}Y8hmc;rYH-g96^(Az?m@d`GC37+bRxF<yX$&PRmHmbB)tG)e{2*QMdPX9)Q7j{a#5*(g7==2RL`O`_I;rDJW=`0n#UP?9(}@si<|KLD&6L_Hsi`|c{T@*tJ|^MkWO{2)PC22rc%<8Ql?X#XK#H&J>t&2n?AyaeQM%-Wy#inu)#$6f(|fd%XEb$^6NA4RU96zHp?wnk3Mv#hCq5{kBRGagW7vMo80KruJr=5KfJ1gq{RjwAmCd#W7Wub1>c?PHLrn@58O3jB|oxXaRE^C-WoUBSLoBt?&n9tdUTIWB$s{Cn^4d7+el_A{GadlAK4?L%K'
UPDATE_ID = 'IPTH_DBMigrationManager_v101_hotfix_20261107'

class Reject(Exception): pass

def sha(b:bytes)->str: return hashlib.sha256(b).hexdigest()

def locate(start:Path)->Path:
    for parent in (start.resolve(),*start.resolve().parents):
        if (parent/'Interplex_MES_FE').is_dir() and (parent/'Interplex_MES_BE').is_dir():return parent
    raise Reject('Cannot find sibling FE/BE directories. Run from BE.')

def safe_path(root:Path,s:str)->Path:
    parts=PurePosixPath(s)
    if parts.is_absolute() or '..' in parts.parts or len(parts.parts)<3 or parts.parts[0] not in {'Interplex_MES_FE','Interplex_MES_BE'}:
        raise Reject('Unsafe embedded path '+s)
    if any(x in {'.env','.git','node_modules','dist','__pycache__'} for x in parts.parts):
        raise Reject('Excluded embedded path '+s)
    dest=root.joinpath(*parts.parts)
    if dest.is_symlink() or not dest.parent.resolve().is_relative_to(root.resolve()):
        raise Reject('Symlink or escaping destination: '+s)
    return dest

def unpack():
    raw=json.loads(zlib.decompress(base64.b85decode(PAYLOAD_B85)))
    manifest=raw['manifest']
    if manifest.get('id')!=UPDATE_ID:raise Reject('Invalid patch ID')
    rows=manifest['file_changes']
    if set(raw['embedded'])!={x['path'] for x in rows}:raise Reject('Embedded file list does not match manifest')
    content={}
    for row in rows:
        p=row['path'];body=zlib.decompress(base64.b85decode(raw['embedded'][p]))
        if sha(body)!=row['after_sha256']:raise Reject('Patch payload checksum mismatch: '+p)
        content[p]=body
    mandatory={'Interplex_MES_FE/docs/mes_agent/CHANGELOG.md',
               'Interplex_MES_FE/docs/mes_agent/database/DB_MIGRATION_RUNBOOK.md'}
    if not mandatory.issubset(manifest['documentation_updated']):
        raise Reject('Mandatory changelog/runbook not declared')
    if not any(p.startswith('Interplex_MES_FE/docs/mes_agent/changes/') and p.endswith('.md')
               for p in manifest['documentation_updated']):
        raise Reject('Release-note Markdown required')
    return manifest,content

def compat(root:Path,manifest:dict)->list[str]:
    problems=[]
    if sys.version_info<(3,11): problems.append('Python >=3.11 required')
    else: print('[PASS] Python',sys.version.split()[0])
    for dep in ('sqlalchemy','pyodbc'):
        if importlib.util.find_spec(dep) is None:problems.append(f'Missing {dep}; use Backend Python environment')
        else:print('[PASS] dependency',dep,'available')
    for raw,expected in manifest['read_only_guards'].items():
        p=safe_path(root,raw)
        if not p.is_file() or sha(p.read_bytes())!=expected:
            problems.append('Pinned V0000 baseline artifact changed/missing: '+raw)
        else:print('[PASS] pinned baseline unchanged:',raw)
    for repo in ('Interplex_MES_FE','Interplex_MES_BE'):
        try:
            b=subprocess.run(['git','-C',str(root/repo),'branch','--show-current'],capture_output=True,text=True,timeout=3).stdout.strip()
        except Exception:b='(unknown)'
        print('[INFO]',repo,'branch:',b or '(detached)')
    print('[INFO] Offline updater cannot verify SQL schema. Run Manager --scan after applying.')
    return problems

def states(root:Path,manifest:dict):
    report=[]
    for row in manifest['file_changes']:
        p=safe_path(root,row['path'])
        existing=sha(p.read_bytes()) if p.is_file() else None
        if existing==row['after_sha256']:state='ALREADY'
        elif existing==row['before_sha256']:state='UPDATE' if existing else 'CREATE'
        else:state='CONFLICT'
        report.append((row['path'],state,existing))
    return report

def report_status(root:Path,manifest:dict,results:list,errs:list)->bool:
    print('\n'+UPDATE_ID+' — '+manifest['summary'])
    for path,state,current in results:
        print(f'[{state:8s}]',path)
        if state=='CONFLICT':print('   Found checksum:',current or '(missing)')
    print('\nMARKDOWN UPDATED:')
    for p in manifest['documentation_updated']:print('  +',p)
    docroot=root/'Interplex_MES_FE/docs/mes_agent'
    existing=sorted(str(p.relative_to(root)) for p in docroot.rglob('*.md')) if docroot.is_dir() else []
    print('MARKDOWN INVENTORY:',len(existing),'files currently present')
    bad=[r[0] for r in results if r[1]=='CONFLICT']
    if bad:errs.extend('Source/document hash mismatch: '+x for x in bad)
    if any(x[1]=='ALREADY' for x in results) and any(x[1] not in {'ALREADY','CONFLICT'} for x in results):
        errs.append('Partially applied patch; do not continue automatically')
    for e in errs:print('[REJECT]',e)
    if errs:
        print('VERDICT: REJECT — no writes permitted');return False
    if all(x[1]=='ALREADY' for x in results): print('VERDICT: PASS (already installed; no-op)')
    else:print('VERDICT: PASS (compatible for local source/docs patch)')
    return True

def atomic(path:Path,b:bytes):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(dir=str(path.parent),prefix='.ipth-tmp-')
    try:
        with os.fdopen(fd,'wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def backup_path()->Path:return Path.home()/'.ipth_mes_updater_backups'/UPDATE_ID

def apply_patch(root:Path,manifest:dict,content:dict,results:list):
    if all(state=='ALREADY' for _,state,_ in results):
        print('No files changed.');return
    backup=backup_path()
    if backup.exists():raise Reject('An existing patch backup requires operator review: '+str(backup))
    backup.mkdir(parents=True,mode=0o700)
    previous={path:safe_path(root,path).read_bytes() if safe_path(root,path).is_file() else None for path in content}
    journal={'id':UPDATE_ID,'files':[{'path':p,'old':sha(b) if b is not None else None,'new':sha(content[p])} for p,b in previous.items()]}
    try:
        for p,b in previous.items():
            if b is not None:atomic(backup/'files'/p,b)
        atomic(backup/'journal.json',json.dumps(journal,indent=2).encode())
        for p,b in content.items():atomic(safe_path(root,p),b)
        for p,b in content.items():
            if sha(safe_path(root,p).read_bytes())!=sha(b):raise RuntimeError('Post-write hash verification failed')
        print('[PASS] Manager/docs patched; SQL Server was NOT accessed or modified.')
        print('Backup:',backup)
    except Exception:
        for p,b in previous.items():
            dst=safe_path(root,p)
            if b is None:
                if dst.is_file():dst.unlink()
            else:atomic(dst,b)
        raise

def rollback(root:Path):
    backup=backup_path();path=backup/'journal.json'
    if not path.is_file():raise Reject('Missing backup journal '+str(path))
    journal=json.loads(path.read_text())
    if journal.get('id')!=UPDATE_ID:raise Reject('Backup ID mismatch')
    for row in journal['files']:
        dst=safe_path(root,row['path'])
        if not dst.is_file() or sha(dst.read_bytes())!=row['new']:
            raise Reject('Refusing rollback of modified file: '+row['path'])
        if row['old'] is not None:
            old=backup/'files'/row['path']
            if not old.is_file() or sha(old.read_bytes())!=row['old']:
                raise Reject('Backup corrupted: '+row['path'])
    for row in reversed(journal['files']):
        dst=safe_path(root,row['path'])
        if row['old'] is None:dst.unlink()
        else:atomic(dst,(backup/'files'/row['path']).read_bytes())
    print('[PASS] Rolled back source/docs; no database changes.')

def main():
    p=argparse.ArgumentParser()
    g=p.add_mutually_exclusive_group(required=True)
    for flag in ('scan','apply','rollback'):g.add_argument('--'+flag,action='store_true')
    p.add_argument('--root',type=Path)
    args=p.parse_args()
    try:
        root=locate(args.root or Path.cwd())
        if args.rollback:rollback(root);return 0
        manifest,content=unpack()
        problems=compat(root,manifest)
        st=states(root,manifest)
        if not report_status(root,manifest,st,problems):return 2
        if args.apply:apply_patch(root,manifest,content,st)
        else:print('SCAN is read-only; no files, DB tables or ledger modified.')
        return 0
    except Reject as exc:print('VERDICT: REJECT — '+str(exc),file=sys.stderr);return 2
    except Exception as exc:
        print('VERDICT: REJECT — updater internal failure ('+type(exc).__name__+'); no SQL access.',file=sys.stderr);return 2

if __name__=='__main__':raise SystemExit(main())
