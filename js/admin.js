/* 运营后台逻辑：榜单列表、新增/编辑/删除、年份期数排序切换、歌曲上移下移排序。
   数据持久化在 localStorage（覆盖 data/music-list.json 的初始数据）。 */
(function () {
  "use strict";
  var store = window.idolStore;
  var data = null;
  var sortDir = "desc"; // desc | asc
  var editingId = null; // null = 新建
  var editingSongs = [];

  var listEl = document.getElementById("list");
  var msgEl = document.getElementById("msg");
  var countEl = document.getElementById("count");
  var mask = document.getElementById("mask");
  var songEdits = document.getElementById("songEdits");
  var fYear = document.getElementById("fYear");
  var fPeriod = document.getElementById("fPeriod");
  var fDate = document.getElementById("fDate");

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
    });
  }
  function fmtDateDot(d) {
    return d ? d.replace(/-/g, ".") : "";
  }
  function fmtDateDash(d) {
    // 点格式 -> 横杠，供 input[type=date] 使用
    return d ? d.replace(/\./g, "-") : "";
  }
  function todayDash() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function sortCharts(arr) {
    return arr.slice().sort(function (a, b) {
      if (b.year !== a.year) return sortDir === "desc" ? b.year - a.year : a.year - b.year;
      return sortDir === "desc" ? b.period - a.period : a.period - b.period;
    });
  }

  function render() {
    var charts = sortCharts(data.charts);
    countEl.textContent = data.charts.length;
    listEl.innerHTML = "";
    charts.forEach(function (c) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td><strong>' + esc(c.title) + "</strong><br>" +
        '<span style="color:#94a3b8;font-size:12px">' + esc(c.id) + "</span></td>" +
        "<td>" + (c.date || "—") + "</td>" +
        "<td>" + (c.songs ? c.songs.length : 0) + "</td>" +
        '<td class="ops">' +
        '<button class="btn btn-sm" data-edit="' + esc(c.id) + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-del="' + esc(c.id) + '">删除</button>' +
        "</td>";
      listEl.appendChild(tr);
    });
    document.getElementById("sortBtn").textContent =
      sortDir === "desc" ? "排序：倒序 ▼" : "排序：正序 ▲";
  }

  function setMsg(m) { msgEl.textContent = m || ""; }

  // ---- 歌曲编辑 ----
  function renderSongEdits() {
    songEdits.innerHTML = "";
    editingSongs.forEach(function (s, i) {
      var row = document.createElement("div");
      row.className = "song-edit";
      var cover = s.cover || "images/cover1.svg";
      row.innerHTML =
        '<div class="rk">' + (i + 1) + "</div>" +
        '<img src="' + store.asset(cover) + '" alt="">' +
        '<div class="cols">' +
        '<input class="i-cover" value="' + esc(cover) + '" placeholder="封面路径">' +
        '<input class="i-singer" value="' + esc(s.singer || "") + '" placeholder="歌手">' +
        '<input class="i-song" value="' + esc(s.song || "") + '" placeholder="歌名">' +
        '<input class="i-likes" type="number" value="' + (s.likes || 0) + '" style="max-width:72px" placeholder="赞">' +
        "</div>" +
        '<div class="move">' +
        '<button data-up="' + i + '">↑</button>' +
        '<button data-down="' + i + '">↓</button>' +
        "</div>" +
        '<button class="btn btn-sm btn-danger" data-rm="' + i + '">✕</button>';
      songEdits.appendChild(row);
    });
    songEdits.querySelectorAll("[data-up]").forEach(function (b) {
      b.onclick = function () { move(parseInt(b.dataset.up, 10), -1); };
    });
    songEdits.querySelectorAll("[data-down]").forEach(function (b) {
      b.onclick = function () { move(parseInt(b.dataset.down, 10), 1); };
    });
    songEdits.querySelectorAll("[data-rm]").forEach(function (b) {
      b.onclick = function () { removeSong(parseInt(b.dataset.rm, 10)); };
    });
  }

  function syncInputs() {
    var rows = songEdits.querySelectorAll(".song-edit");
    rows.forEach(function (row, i) {
      if (!editingSongs[i]) return;
      editingSongs[i].cover = row.querySelector(".i-cover").value || "images/cover1.svg";
      editingSongs[i].singer = row.querySelector(".i-singer").value;
      editingSongs[i].song = row.querySelector(".i-song").value;
      editingSongs[i].likes = parseInt(row.querySelector(".i-likes").value, 10) || 0;
    });
  }

  function move(i, dir) {
    syncInputs();
    var j = i + dir;
    if (j < 0 || j >= editingSongs.length) return;
    var t = editingSongs[i];
    editingSongs[i] = editingSongs[j];
    editingSongs[j] = t;
    renderSongEdits();
  }
  function removeSong(i) {
    syncInputs();
    editingSongs.splice(i, 1);
    renderSongEdits();
  }
  function addSong() {
    syncInputs();
    var n = (editingSongs.length % 3) + 1;
    editingSongs.push({ cover: "images/cover" + n + ".svg", singer: "", song: "", likes: 0 });
    renderSongEdits();
  }

  // ---- 弹窗 ----
  function openModal(chart) {
    editingId = chart ? chart.id : null;
    document.getElementById("modalTitle").textContent = chart ? "编辑榜单" : "新建榜单";
    fYear.value = chart ? chart.year : new Date().getFullYear();
    fPeriod.value = chart ? chart.period : "";
    fDate.value = chart ? fmtDateDash(chart.date) : todayDash();
    editingSongs = chart ? chart.songs.map(function (s) {
      return { cover: s.cover, singer: s.singer, song: s.song, likes: s.likes || 0 };
    }) : [];
    renderSongEdits();
    mask.classList.add("show");
  }
  function closeModal() {
    mask.classList.remove("show");
    editingId = null;
    editingSongs = [];
  }

  function save() {
    syncInputs();
    var year = parseInt(fYear.value, 10);
    var period = parseInt(fPeriod.value, 10);
    if (!year || !period) { setMsg("请填写正确的年份与期数"); return; }
    var id = year + "-" + period;
    if (!editingId && data.charts.some(function (c) { return c.id === id; })) {
      setMsg("该期榜单已存在（" + id + "）");
      return;
    }
    var songs = editingSongs
      .filter(function (s) { return (s.song || "").trim() || (s.singer || "").trim(); })
      .map(function (s, i) {
        return {
          rank: i + 1,
          singer: s.singer || "",
          song: s.song || "",
          cover: s.cover || "images/cover1.svg",
          likes: s.likes || 0,
        };
      });
    var chart = {
      id: id,
      year: year,
      period: period,
      date: fmtDateDot(fDate.value) || fmtDateDot(todayDash()),
      title: "榜样音乐 " + year + " 第" + period + "期",
      songs: songs,
    };
    if (editingId) {
      for (var k = 0; k < data.charts.length; k++) {
        if (data.charts[k].id === editingId) { data.charts[k] = chart; break; }
      }
    } else {
      data.charts.push(chart);
    }
    store.saveCharts(data);
    closeModal();
    render();
    setMsg("已保存：" + chart.title);
  }

  function del(id) {
    if (!confirm("确认删除该期榜单？此操作不可恢复。")) return;
    data.charts = data.charts.filter(function (c) { return c.id !== id; });
    store.saveCharts(data);
    render();
    setMsg("已删除：" + id);
  }

  // ---- 事件绑定 ----
  document.getElementById("newBtn").onclick = function () { openModal(null); };
  document.getElementById("addSong").onclick = addSong;
  document.getElementById("cancelBtn").onclick = closeModal;
  document.getElementById("saveBtn").onclick = save;
  document.getElementById("sortBtn").onclick = function () {
    sortDir = sortDir === "desc" ? "asc" : "desc";
    render();
  };
  document.getElementById("resetBtn").onclick = function () {
    if (!confirm("重置为初始数据？本地修改将被清空。")) return;
    store.resetCharts().then(function (d) {
      data = d;
      render();
      setMsg("已重置为初始数据");
    });
  };
  mask.addEventListener("click", function (e) {
    if (e.target === mask) closeModal();
  });
  listEl.addEventListener("click", function (e) {
    var t = e.target;
    if (t.dataset.edit) {
      var c = null;
      data.charts.forEach(function (x) { if (x.id === t.dataset.edit) c = x; });
      if (c) openModal(c);
    } else if (t.dataset.del) {
      del(t.dataset.del);
    }
  });

  store.loadCharts()
    .then(function (d) { data = d; render(); })
    .catch(function (e) { setMsg(e.message); });
})();
