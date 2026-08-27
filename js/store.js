/* 共享数据层：官网与后台共用，自动根据当前页面位置计算相对路径前缀。
   基础数据来自 data/music-list.json，运营后台的增删改查覆盖保存在 localStorage。 */
(function () {
  "use strict";
  var IN_ADMIN = window.location.pathname.indexOf("/admin/") !== -1;
  var ASSET = IN_ADMIN ? ".." : ".";
  var CHARTS_KEY = "idolmusic_charts_v1";
  var LIKES_KEY = "idolmusic_likes_v1";

  // 资源相对路径：封面在 json 中以 "images/xxx.svg" 表示（相对仓库根）
  function assetPath(p) {
    if (IN_ADMIN) return "../" + p;
    return p;
  }
  function dataUrl() {
    return ASSET + "/data/music-list.json";
  }

  function readJSON(key) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  }
  function writeJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  function loadBase() {
    return fetch(dataUrl(), { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("数据加载失败: " + res.status);
      return res.json();
    });
  }

  // 读取榜单：优先用 localStorage 覆盖，否则用基础 json 并初始化
  function loadCharts() {
    var local = readJSON(CHARTS_KEY);
    if (local && Array.isArray(local.charts)) return Promise.resolve(local);
    return loadBase().then(function (base) {
      writeJSON(CHARTS_KEY, base);
      return base;
    });
  }

  function saveCharts(charts) {
    writeJSON(CHARTS_KEY, charts);
  }

  function resetCharts() {
    return loadBase().then(function (base) {
      writeJSON(CHARTS_KEY, base);
      return base;
    });
  }

  // 点赞：每设备对每首歌累加，封顶 10
  function getLikes() {
    return readJSON(LIKES_KEY) || {};
  }
  function likeSong(chartId, rank) {
    var all = getLikes();
    all[chartId] = all[chartId] || {};
    var cur = all[chartId][rank] || 0;
    var next = Math.min(10, cur + 1);
    all[chartId][rank] = next;
    writeJSON(LIKES_KEY, all);
    return next;
  }
  // 计算展示用的总赞数 = 基础赞 + 本机赞
  function totalLikes(song, chartId) {
    var dev = (getLikes()[chartId] || {})[song.rank] || 0;
    return (song.likes || 0) + dev;
  }

  window.idolStore = {
    IN_ADMIN: IN_ADMIN,
    asset: assetPath,
    dataUrl: dataUrl,
    loadCharts: loadCharts,
    saveCharts: saveCharts,
    resetCharts: resetCharts,
    likeSong: likeSong,
    getLikes: getLikes,
    totalLikes: totalLikes,
  };
})();
