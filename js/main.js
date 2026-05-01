(function () {
  const bgLayer = document.getElementById("bg-layer");
  const toggleBtn = document.getElementById("toggle-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const poemText = document.getElementById("poem-text");
  const poemOrigin = document.getElementById("poem-origin");
  const poemCard = document.getElementById("poem-card");
  const bottomBar = document.getElementById("bottom-bar");
  const loadingScreen = document.getElementById("loading-screen");
  const loadingFill = document.getElementById("loading-fill");
  const loadingPercent = document.getElementById("loading-percent");

  let config = { socialLinks: [], customImages: [] };
  let bgMode = "bing";
  let customIndex = 0;
  let bingImageUrl = null;
  let prevBlobUrl = null;
  let isAnimating = false;

  const MODE_LABELS = {
    bing: "Bing壁纸图",
    custom: "流萤图"
  };

  /* ---- 配置 ---- */
  function loadConfig() {
    if (window.BLOG_CONFIG && window.BLOG_CONFIG.socialLinks) {
      config = window.BLOG_CONFIG;
    }
  }

  function getImageList() {
    if (config.customImages.length > 0) return config.customImages;
    return ["bg1.jpg", "bg2.jpg", "bg3.jpg"];
  }

  /* ---- 底栏 ---- */
  function renderBottomBar() {
    if (!config.socialLinks.length) {
      bottomBar.innerHTML =
        '<span style="opacity:0.6;font-size:13px;">请在 config/links.js 中配置社交链接</span>';
      return;
    }
    bottomBar.innerHTML = config.socialLinks
      .map(function (link) {
        var cls = "bottom-link" + (link.disabled ? " disabled" : "");
        var href = link.disabled ? "#" : link.url;
        var title = link.disabled ? "暂不可用" : link.name;
        return (
          '<a class="' + cls + '" href="' + href + '" target="_blank" rel="noopener noreferrer" title="' + title + '">' +
          '<img class="link-icon" src="' + link.icon + '" alt="' + link.name + '">' + link.name + "</a>"
        );
      })
      .join("") +
      '<span class="disclaimer">部分素材来源于网络，侵权必删</span>';
  }

  function setBackground(url) {
    if (!url) return;
    bgLayer.style.backgroundImage = 'url("' + url + '")';
  }

  /* ---- 加载界面 ---- */
  function setLoadingProgress(val) {
    var p = Math.min(100, Math.max(0, Math.round(val)));
    loadingFill.style.width = p + "%";
    loadingPercent.style.right = (100 - p) + "%";
    loadingPercent.textContent = p;
  }

  function finishLoading() {
    loadingFill.style.width = "100%";
    loadingPercent.style.right = "0%";
    loadingPercent.textContent = "100";
    setTimeout(function () {
      loadingScreen.classList.add("hide");
    }, 500);
  }

  /* ---- 今日首次访问判断 ---- */
  function todayKey() {
    return "blog_loaded_" + new Date().toDateString();
  }

  function hasLoadedToday() {
    return sessionStorage.getItem(todayKey()) === "1";
  }

  function markLoadedToday() {
    sessionStorage.setItem(todayKey(), "1");
  }

  /* ---- 模拟进度 + 真实下载 ---- */
  function loadBingWithProgress() {
    return new Promise(function (resolve) {
      loadingScreen.classList.remove("hide");
      loadingFill.style.width = "0%";
      loadingPercent.style.right = "100%";
      loadingPercent.textContent = "0";

      var realProgress = -1;
      var simulated = 0;
      var done = false;

      function finalize() {
        if (done) return;
        done = true;
        finishLoading();
        resolve();
      }

      function onRealProgress(p) {
        realProgress = p;
      }

      var simTimer = setInterval(function () {
        var rand = Math.random();

        if (rand < 0.9) {
          var remaining = 100 - simulated;
          simulated += Math.max(0.3, remaining * 0.01);
        } else {
          var remaining = 100 - simulated;
          simulated += Math.max(1, remaining * 0.4);
        }
        if (simulated >= 100) {
          simulated = 100;
          clearInterval(simTimer);
          finalize();
          return;
        }
        setLoadingProgress(Math.round(simulated));
      }, 50);

      var img = new Image();
      img.onload = function () {
        bingImageUrl = img.src;
        setBackground(img.src);
        clearInterval(simTimer);
        simulated = 100;
        setLoadingProgress(100);
        loadingFill.style.width = "100%";
        loadingPercent.style.right = "0%";
        loadingPercent.textContent = "100";
        done = true;
        setTimeout(function () {
          loadingScreen.classList.add("hide");
        }, 500);
        resolve();
      };

      img.onerror = function () {
        bingImageUrl = "https://bing.img.run/rand_uhd.php?_=" + Date.now();
        simulated = 99;
        setLoadingProgress(99);
        clearInterval(simTimer);
        resolve();
      };

      img.src = "https://bing.img.run/rand_uhd.php";
    });
  }

  /* ---- 背景切换 ---- */
  function applyBingBackground(url) {
    if (url) {
      bingImageUrl = url;
      setBackground(url);
    }
  }

  function applyCustomBackground() {
    var images = getImageList();
    if (!images.length) return;
    var imgSrc = "images/" + images[customIndex % images.length];
    customIndex++;
    setBackground(imgSrc);
  }

  function updateTopButtons() {
    toggleBtn.textContent =
      bgMode === "bing" ? MODE_LABELS.bing : MODE_LABELS.custom;

    if (bgMode === "bing") {
      refreshBtn.classList.remove("hidden");
    } else {
      refreshBtn.classList.add("hidden");
    }
  }

  function onToggle() {
    if (bgMode === "bing") {
      bgMode = "custom";
      applyCustomBackground();
    } else {
      bgMode = "bing";
      if (bingImageUrl) {
        setBackground(bingImageUrl);
      } else {
        updateTopButtons();
        loadBingWithProgress().then(function () {
          setBackground(bingImageUrl);
        });
        return;
      }
    }
    updateTopButtons();
  }

  /* ---- 刷新Bing图片 ---- */
  var refreshCooldown = 0;
  var refreshTimer = null;

  function onRefreshBing() {
    if (bgMode !== "bing") return;

    var now = Date.now();
    if (now < refreshCooldown) return;

    var cacheBust = "https://bing.img.run/rand_uhd.php?_=" + now;

    var img = new Image();
    img.onload = function () {
      bingImageUrl = img.src;
      setBackground(img.src);
    };

    img.onerror = function () {
      bingImageUrl = cacheBust;
      setBackground(cacheBust);
    };

    img.src = cacheBust;

    refreshCooldown = now + 5000;
    refreshBtn.textContent = "5";

    if (refreshTimer) clearInterval(refreshTimer);
    var remaining = 5;
    refreshTimer = setInterval(function () {
      remaining--;
      if (remaining <= 0) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        refreshBtn.textContent = "↻";
      } else {
        refreshBtn.textContent = remaining;
      }
    }, 1000);
  }

  /* ---- 诗句 ---- */
  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function animatePoem(content, origin) {
    poemText.textContent = "";
    poemOrigin.textContent = "";
    isAnimating = true;

    for (var i = 0; i < content.length; i++) {
      poemText.textContent += content[i];
      await delay(70);
    }

    var originFull = "—— " + origin;
    for (var j = 0; j < originFull.length; j++) {
      poemOrigin.textContent += originFull[j];
      await delay(50);
    }

    isAnimating = false;
  }

  async function refreshPoem() {
    if (isAnimating) return;
    var poem = await fetchPoem();
    await animatePoem(poem.content, poem.origin);
  }

  /* ---- 初始化 ---- */
  async function init() {
    loadConfig();
    renderBottomBar();

    var skipLoading = hasLoadedToday();

    if (skipLoading) {
      bingImageUrl = "https://bing.img.run/rand_uhd.php?_=" + Date.now();
      setBackground(bingImageUrl);
      downloadBingImage(function () {})
        .then(function (blobUrl) {
          if (prevBlobUrl) URL.revokeObjectURL(prevBlobUrl);
          prevBlobUrl = blobUrl;
          bingImageUrl = blobUrl;
        })
        .catch(function () {});
    } else {
      bgMode = "custom";
      applyCustomBackground();
      markLoadedToday();
    }

    var poem = await fetchPoem();
    poemText.textContent = poem.content;
    poemOrigin.textContent = "—— " + poem.origin;

    toggleBtn.addEventListener("click", onToggle);
    refreshBtn.addEventListener("click", onRefreshBing);
    poemCard.addEventListener("click", refreshPoem);
    updateTopButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
