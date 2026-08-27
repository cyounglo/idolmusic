/* 官网首页交互：期数切换 + 榜单渲染 + 点赞（每设备累加封顶10） */
(function () {
  "use strict";
  var store = window.idolStore;
  var chartEl = document.getElementById("chart");
  var sel = document.getElementById("periodSelect");
  var dateEl = document.getElementById("periodDate");
  var data = null;

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
    });
  }
  function sortDesc(a, b) {
    if (b.year !== a.year) return b.year - a.year;
    return b.period - a.period;
  }

  function renderOptions() {
    var charts = data.charts.slice().sort(sortDesc);
    sel.innerHTML = "";
    charts.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.title + "（" + (c.date || "") + "）";
      sel.appendChild(o);
    });
    if (charts[0]) sel.value = charts[0].id; // 默认展示最新一期
  }

  function renderChart(id) {
    var c = null;
    data.charts.forEach(function (x) {
      if (x.id === id) c = x;
    });
    if (!c) c = data.charts[0];
    if (!c) return;
    dateEl.textContent = "发布日期 " + (c.date || "");

    var songs = (c.songs || []).slice(0, 30); // 仅展示前 30 名
    chartEl.innerHTML = "";
    if (!songs.length) {
      chartEl.innerHTML = '<p style="color:#64748b">该期暂无歌曲。</p>';
      return;
    }
    songs.forEach(function (s) {
      var row = document.createElement("div");
      row.className = "song" + (s.rank <= 3 ? " top" + s.rank : "");

      var dev = (store.getLikes()[c.id] || {})[s.rank] || 0;
      var liked = dev > 0;
      var maxed = dev >= 10;

      var info = document.createElement("div");
      info.className = "meta";
      info.innerHTML =
        '<div class="song-name">' + esc(s.song) + "</div>" +
        '<div class="singer">' + esc(s.singer) + "</div>";

      var img = document.createElement("img");
      img.className = "cover";
      img.src = store.asset(s.cover);
      img.alt = s.song;

      var rank = document.createElement("div");
      rank.className = "rank";
      rank.textContent = s.rank;

      var like = document.createElement("button");
      like.className = "like" + (liked ? " liked" : "");
      like.disabled = maxed;
      like.title = maxed ? "已点满10个赞" : "点赞";
      like.innerHTML =
        '<span class="heart">♥</span><span class="count">' + store.totalLikes(s, c.id) + "</span>";
      like.addEventListener("click", function () {
        store.likeSong(c.id, s.rank);
        var d = (store.getLikes()[c.id] || {})[s.rank] || 0;
        like.className = "like liked";
        like.querySelector(".count").textContent = store.totalLikes(s, c.id);
        if (d >= 10) {
          like.disabled = true;
          like.title = "已点满10个赞";
        }
      });

      row.appendChild(rank);
      row.appendChild(img);
      row.appendChild(info);
      row.appendChild(like);
      chartEl.appendChild(row);
    });
  }

  sel.addEventListener("change", function () {
    renderChart(sel.value);
  });

  store.loadCharts()
    .then(function (d) {
      data = d;
      renderOptions();
      renderChart(sel.value);
    })
    .catch(function (e) {
      chartEl.innerHTML = '<p style="color:#dc2626">' + esc(e.message) + "</p>";
    });
})();
