// 小岛主题的首页；所有操作继续使用游戏原有的 data-act 事件。
const leaf = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M26 5C12 2 3 9 6 19c2 7 11 9 16 3 4-4 5-10 4-17Z" fill="currentColor"/><path d="m7 27 13-15M12 21l-1-7m5 3 6 1" stroke="#fff9e9" stroke-width="2" stroke-linecap="round"/></svg>`;
const sun = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="6" fill="currentColor"/><path d="M16 2v3m0 22v3M2 16h3m22 0h3M6 6l2 2m16 16 2 2M6 26l2-2M24 8l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const sprout = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27V15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M16 19C6 20 4 13 5 9c8-1 13 3 11 10Zm0-4c-1-8 4-12 12-11 0 8-4 13-12 11Z" fill="currentColor"/><path d="M11 27h10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;

export function islandMenu(icons) {
  return `<section class="screen soft island-home" data-screen="menu" aria-label="广告位招租首页">
    <div class="island-shell">
      <header class="island-header">
        <div class="island-brand"><button class="brand-leaf" data-act="chlx-note" aria-label="翻开叶子上的小纸条">${leaf}</button><span>Chlx 的小木桌<small>MADE FOR A LITTLE FUN</small></span></div>
        <div class="weather">${sun}<span>宜 · 玩一小会儿</span></div>
      </header>
      <div class="island-main">
        <div class="island-intro">
          <div class="island-heading">
            <span class="eyebrow">放轻松，欢迎上岛</span>
            <h1>广告位<span>招租</span><i aria-hidden="true">✦</i></h1>
            <p>一张小木桌，一场好时光。<br>把快乐，弹到你这边。</p>
          </div>
          <img class="island-art" src="./assets/island-club.svg" width="680" height="500" alt="草地小岛上的木制弹射冰球桌，四周有树木与小花" draggable="false">
          <div class="island-caption"><span></span> Chlx WAS HERE <span></span></div>
        </div>
        <div class="panel welcome-panel">
          <div class="paper-tab" aria-hidden="true">${leaf}</div>
          <div class="welcome-heading"><span class="welcome-kicker">LET’S PLAY</span><h2>今天，和谁玩？</h2><p>选一种喜欢的方式，开始吧。</p></div>
          <div class="stack">
            <div class="field island-name"><span class="name-avatar" aria-hidden="true">☺</span><label for="nick">你的昵称</label><input id="nick" maxlength="40" autocomplete="off" spellcheck="false"></div>
            <button class="mode-btn mode-practice" data-act="ai"><span class="ic">${sprout}</span><span class="mode-copy"><span class="t">人机对战</span><span class="d">先热热手，找到自己的节奏</span></span><span class="mode-arrow">${icons.chev}</span></button>
            <button class="mode-btn mode-online" data-act="match"><span class="ic">${icons.globe}</span><span class="mode-copy"><span class="t">在线匹配</span><span class="d">遇见对手，来一场即兴较量</span></span><span class="mode-arrow">${icons.chev}</span></button>
            <button class="mode-btn mode-friend" data-act="friend"><span class="ic">${icons.friends}</span><span class="mode-copy"><span class="t">好友对战</span><span class="d">留个位置，邀请朋友一起玩</span></span><span class="mode-arrow">${icons.chev}</span></button>
          </div>
          <div class="footer-links">
            <button class="btn btn-ghost" data-act="board">${icons.podium}<span>排行榜</span></button>
            <button class="btn btn-ghost" data-act="help">${icons.help}<span>玩法</span></button>
            <button class="btn btn-ghost" data-act="settings">${icons.gear}<span>设置</span></button>
            <button class="btn btn-ghost" data-act="sound"><span class="snd"></span><span class="snd-t"></span></button>
          </div>
        </div>
      </div>
      <footer class="island-footer"><div class="quick-rules"><span><b>01</b> 拖住冰球</span><i>→</i><span><b>02</b> 向后拉</span><i>→</i><span><b>03</b> 松手发射</span></div><p>先清空自己的半场，就赢啦。</p><span class="footer-flower" aria-hidden="true">✿</span></footer>
    </div>
  </section>`;
}
