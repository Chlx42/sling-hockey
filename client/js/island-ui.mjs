// 小木桌首页；所有操作复用游戏的共享事件处理。
const leaf = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M26 5C12 2 3 9 6 19c2 7 11 9 16 3 4-4 5-10 4-17Z" fill="currentColor"/><path d="m7 27 13-15M12 21l-1-7m5 3 6 1" stroke="#fff9e9" stroke-width="2" stroke-linecap="round"/></svg>`;
const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>`;
const sprout = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 19C6 20 4 13 5 9c8-1 13 3 11 10Zm0-4c-1-8 4-12 12-11 0 8-4 13-12 11Z" fill="currentColor"/></svg>`;

export function islandMenu(icons) {
  return `<section class="screen soft island-home" data-screen="menu" aria-label="广告位招租首页">
    <div class="island-shell">
      <header class="island-header">
        <div class="island-brand"><button class="brand-leaf" data-act="chlx-note" aria-label="翻开叶子上的小纸条">${leaf}</button><span>Chlx 的小木桌<small>MADE FOR A LITTLE FUN</small></span></div>
        <nav class="home-tools" aria-label="常用设置">
          <span class="open-sign"><i></i>随时来玩一局</span>
          <button class="icon-btn" data-act="settings" aria-label="设置" title="设置">${icons.gear}</button>
          <button class="icon-btn" data-act="sound" aria-label="关闭声音" title="声音"><span class="snd"></span></button>
        </nav>
      </header>
      <main class="island-main">
        <div class="island-intro">
          <div class="island-heading">
            <span class="eyebrow"><span></span>给自己，三分钟的好心情</span>
            <h1>广告位<em>招租</em></h1>
            <p>一张小木桌，一次小较量。<br>拉住、瞄准，把快乐弹到对面。</p>
          </div>
          <div class="island-scene">
            <div class="scene-orbit" aria-hidden="true"></div>
            <img class="island-art" src="./assets/island-club.svg" width="680" height="500" alt="树荫下的木制冰球桌" draggable="false">
            <div class="table-tag"><span class="tag-puck" aria-hidden="true"></span><span>小桌子，大乐趣<small>Chlx WAS HERE</small></span></div>
            <span class="scene-spark" aria-hidden="true">✳</span>
          </div>
        </div>
        <div class="panel welcome-panel">
          <div class="welcome-heading"><span class="welcome-kicker">LET’S PLAY</span><h2>今天，怎么玩？</h2><span class="club-ticket" aria-hidden="true">快乐<br>免费</span></div>
          <section class="practice-card" aria-label="人机练习">
            <div class="practice-heading"><span class="practice-icon">${sprout}</span><div><h3>先来练练手</h3><p>和 AI 陪练，找到你的节奏</p></div><span class="mode-tag">单人</span></div>
            <div class="difficulty-picker" role="group" aria-label="练习难度">
              <button data-level="easy" aria-pressed="false"><span>轻松</span><small>慢慢来</small></button>
              <button data-level="normal" aria-pressed="false"><span>标准</span><small>刚刚好</small></button>
              <button data-level="hard" aria-pressed="false"><span>困难</span><small>认真了</small></button>
              <button data-level="extreme" aria-pressed="false"><span>极限</span><small>火力全开</small></button>
            </div>
            <button class="btn btn-primary quick-play" data-act="quick-play"><span>开始练习</span>${arrow}</button>
            <div class="practice-foot"><span id="quick-level-note">节奏适中，适合日常练习</span><button class="text-button" data-act="ai">难度说明</button></div>
          </section>
          <div class="mode-divider"><span>也可以，一起玩</span></div>
          <div class="other-modes">
            <button class="mode-btn mode-online" data-act="match"><span class="ic">${icons.globe}</span><span class="mode-copy"><span class="t">在线匹配</span><span class="d">优先真人，无人时 AI 陪练加入</span></span><span class="mode-arrow">${arrow}</span></button>
            <button class="mode-btn mode-friend" data-act="friend"><span class="ic">${icons.friends}</span><span class="mode-copy"><span class="t">邀请好友</span><span class="d">分享一个房间，就能一起玩</span></span><span class="mode-arrow">${arrow}</span></button>
          </div>
          <div class="field island-name"><span class="name-avatar" aria-hidden="true">${leaf}</span><label for="nick">你的昵称</label><input id="nick" maxlength="40" autocomplete="off" spellcheck="false" aria-describedby="name-note"></div>
          <span class="sr-only" id="name-note">可选；留空会使用随机昵称。</span>
          <nav class="footer-links" aria-label="更多内容"><button class="btn btn-ghost" data-act="help">${icons.help}<span>怎么玩</span></button><span class="footer-dot" aria-hidden="true"></span><button class="btn btn-ghost" data-act="board">${icons.podium}<span>排行榜</span></button></nav>
        </div>
      </main>
      <footer class="island-footer"><div class="footer-intro"><span class="footer-star" aria-hidden="true">✳</span><span>一点手感，<br><b>就能玩得开心。</b></span></div><div class="quick-rules"><span><b>01</b><span>按住冰球<small>你半场里的都可以</small></span></span><i>→</i><span><b>02</b><span>向后拉带<small>像一只小弹弓</small></span></span><i>→</i><span><b>03</b><span>松手发射<small>先清空半场就获胜</small></span></span></div><button class="text-button" data-act="help">查看玩法 ${arrow}</button></footer>
    </div>
  </section>`;
}

export function islandHelp() {
  const diagram = (step) => `<svg class="rule-diagram" fill="none" viewBox="0 0 240 148" role="img" aria-label="${['按住自己半场的冰球', '向后拉伸弹力带，反向瞄准', '松手让冰球穿过中间洞口'][step]}"><rect x="29" y="8" width="182" height="132" rx="13" fill="#ead9b8"/><rect x="39" y="18" width="162" height="112" rx="6" fill="#fff9ed"/><path d="M39 44h68m26 0h68" stroke="#c5a46c" stroke-width="8"/><path d="${step === 1 ? 'M39 108 119 126 201 108' : 'M39 108h162'}" stroke="#607d65" stroke-width="3" stroke-linecap="round"/><circle cx="${step === 2 ? 120 : 119}" cy="${step === 0 ? 80 : step === 1 ? 120 : 58}" r="12" fill="#d78e6b" stroke="#a96549" stroke-width="2"/>${step === 0 ? '<circle cx="119" cy="80" r="20" fill="none" stroke="#d78e6b" stroke-width="1.5" stroke-dasharray="3 4"/><path d="m131 85 18 10-8 3-4 9Z" fill="#315344" stroke="#fff9ed" stroke-width="2"/>' : step === 1 ? '<path d="M119 97V67m-5 7 5-7 5 7" stroke="#d78e6b" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 4"/><path d="M145 90v27m-5-6 5 6 5-6" stroke="#315344" stroke-width="2" stroke-linecap="round"/>' : '<path d="M120 95V79m-5 7 5-7 5 7M120 35V23m-5 6 5-6 5 6" stroke="#315344" stroke-width="2" stroke-linecap="round"/>'}</svg>`;
  return `<div class="help-lead"><span class="section-kicker">HOW TO PLAY</span><h2>三步，找到手感。</h2><p class="sub">像玩弹弓一样。先清空自己的半场，就赢了。</p></div>
    <ol class="play-steps">${[['按住冰球','自己半场内，停下或慢慢滑动的球都能拿。'],['压带，向后拉','把球拖到底线弹力带，再向后拉。拉得越远，力度越大。'],['松手，穿过洞口','瞄准中间的小洞，松手发射。往右后方拉，球向左前方弹。']].map(([title, text], i) => `<li>${diagram(i)}<div><span class="step-number">0${i+1}</span><h3>${title}</h3><p>${text}</p></div></li>`).join('')}</ol>
    <div class="rule-callout"><b>双方同时出手，不用等回合。</b><span>球的颜色不代表归属，落在你半场的球都归你操作。</span></div>
    <details class="rule-details"><summary>比赛时间与操作小技巧<span>＋</span></summary><div><p><b>3 分钟一局：</b>时间到时，剩球较少的一方获胜。相同则加时 60 秒，先领先的一方获胜。</p><p><b>细调方向：</b>拉满后手指还可以继续向后拉，左右挪动，方向会调得更细。</p><p><b>取消瞄准：</b>电脑按 Esc 或右键；手机把球拖回场内再松手。人机对战可用左上角菜单暂停。</p><p>加时赛默认关闭辅助线，可在设置中调整。</p></div></details>`;
}
