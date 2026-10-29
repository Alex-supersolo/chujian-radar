/* 初见雷达结果页：把模型结果翻译成中国本土社交语境。 */
(function(){
 const D=window.DIMS;
 const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
 window.computeGap=(a,b)=>Math.round(clamp(D.reduce((sum,d)=>sum+Math.abs((a[d.key]??50)-(b[d.key]??50)),0)/D.length*1.8,8,96));
 window.gapWord=g=>g>=70?'你以为的自己，和陌生人先看到的你，像是两个频道':g>=45?'你身上有一处信号，常常会先替你说话':'你对自己的第一印象判断，基本没有跑偏';
 function bar(v,c){return `<div class="bar"><div class="fill ${c}" style="width:${clamp(v)}%"></div></div>`}
 function section(n,t,sub,body){return `<section class="sec"><div class="sec-head"><span class="sec-idx">${n}</span><h2 class="sec-title">${t}</h2></div><p class="sec-sub">${sub}</p>${body}</section>`}
 window.renderReport=function(data,ctx){
  const scores=data.scores||{}, self=ctx.selfScores||{}, tags=(data.tags||[]).slice(0,3), dims=data.dims||{};
  const gap=ctx.gap, scenes=data.scenes||[], tweaks=(data.tweaks||[]).slice(0,3), evidence=(data.evidence||[]).slice(0,4);
  const dimHtml=D.map((d,i)=>{const x=dims[d.key]||{};const a=clamp(scores[d.key]??50),b=clamp(self[d.key]??50);return `<div class="dim"><div class="dim-head"><span class="dim-name">${esc(d.name)}</span><span class="dim-scores"><span class="o">${a}</span> / <span class="s">${b}</span></span></div>${bar(a,'other')}${bar(b,'self')}<p class="dim-read">${esc(x.read||'')}</p>${x.cost?`<p class="dim-cost">${esc(x.cost)}</p>`:''}</div>`}).join('');
  const sceneHtml=scenes.map(s=>`<div class="scene"><span class="scene-name">${esc(s.name)}</span><p class="scene-read">${esc(s.read)}</p>${s.fix?`<div class="scene-fix"><b>你可以试试</b>${esc(s.fix)}</div>`:''}</div>`).join('');
  const tweakHtml=tweaks.map((t,i)=>`<div class="tweak"><div class="tweak-n">${i+1}</div><div class="tweak-body"><h5>${esc(t.title)}</h5><p>${esc(t.do)}</p>${t.why?`<p class="why">${esc(t.why)}</p>`:''}</div></div>`).join('');
  return `<div class="report"><section class="cover fade-in"><span class="cover-tag"><i></i>初见雷达 · 你的第一印象</span><h1 class="cover-headline">${esc(data.headline||'你是那种，刚见面有点神秘，聊两句就有意思的人')}</h1><div class="gap-block"><div class="gap-num-wrap"><div class="gap-label">第一印象落差</div><div class="gap-num num" id="gapNum">0<small>/100</small></div></div><p class="gap-desc">${esc(window.gapWord(gap))}。<br><span>这不是好坏，是别人第一眼抓住的信号。</span></p></div><div class="tags">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></section>
  ${section('01','陌生人第一句心里话','如果你刚坐到一个全是陌生人的饭局里，别人最可能先这样理解你：',`<div class="prose-block first-thought"><h4>第一眼归类</h4><p>${esc(data.firstThought||data.projection||'看起来有一点距离，但不像难相处。等你开口之后，别人会很快重新判断你。')}</p></div><div class="quote-card">“${esc(data.misread||'我本来以为你不太想聊，后来发现你只是还没进入状态。')}”</div>`)}
  ${section('02','你身上最先被看见的 3 个信号','第一印象不是判决，是陌生人拿到的几条线索。',`<div>${evidence.map((e,i)=>`<div class="evi"><span class="evi-n">0${i+1}</span><p>${esc(e)}</p></div>`).join('')}</div>`)}
  ${section('03','你的社交雷达','七个维度不是给你排名，而是看看你通常从哪扇门进入一段关系。',`<div class="radar-card"><div id="radarHost"></div><div class="radar-legend"><span class="lg other"><i></i>陌生人第一眼</span><span class="lg self"><i></i>你的自我判断</span></div></div><div class="bias-note"><b>${esc(data.typeName||'你的类型：慢热但有记忆点')}</b><br>${esc(data.typeDesc||'你不一定是全场最先开口的人，但一旦接上话，别人通常会记住你。')}</div>`)}
  ${section('04','七个社交维度，逐条看','分数只是方便你看形状，真正有用的是下面每句具体描述。',`<div>${dimHtml}</div>`)}
  ${section('05','放进中国人的日常社交里','同一个第一印象，在不同场合会变成不同的剧情。',`<div>${sceneHtml}</div>`)}
  ${section('06','怎么给自己一个“我可以聊”的信号','不是让你变外向，只是给陌生人一个继续靠近的台阶。',`<div>${tweakHtml}</div>`)}
  <div class="closing"><div class="closing-mark">“</div><p class="closing-line">${esc(data.closing||'你不需要立刻让所有人喜欢你，只要让对的人有机会认识你。')}</p><p class="share-caption">${esc(data.shareCaption||'测完才发现：我不是难接近，我只是开场比较慢。')}</p></div><div class="report-actions"><button class="btn btn-primary" id="btnShare">生成分享卡片</button><button class="btn btn-ghost" id="btnRestart">换一张照片再测</button></div><p class="disclaimer">这是 AI 基于照片与社交场景做的娱乐性模拟，不代表陌生人的真实想法，也不是对你的评价。</p></div>`;
 };
 window.mountReport=function(root,data,ctx){const host=root.querySelector('#radarHost');if(host)window.renderRadar(host,{other:D.map(d=>clamp(data.scores?.[d.key]??50)),self:D.map(d=>clamp(ctx.selfScores?.[d.key]??50)),labels:D.map(d=>d.name)});const e=root.querySelector('#gapNum');if(e){let t=0;const id=setInterval(()=>{t+=Math.max(1,Math.ceil((ctx.gap-t)/8));e.innerHTML=Math.min(t,ctx.gap)+'<small>/100</small>';if(t>=ctx.gap)clearInterval(id)},35)}};
})();
