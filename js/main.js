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
  const loadingPercentFill = document.getElementById("loading-percent-fill");
  const loadingBar = document.getElementById("loading-bar");
  const loadingStatus = document.querySelector(".loading-status");
  const cursorGlow = document.getElementById("cursor-glow");
  const cursorTrail = document.getElementById("cursor-trail");
  const clockTime = document.getElementById("clock-time");
  const clockDate = document.getElementById("clock-date");
  const particlesCanvas = document.getElementById("particles-canvas");

  let config = { socialLinks: [], customImages: [] };
  let bgMode = "bing";
  let customIndex = 0;
  let bingImageUrl = null;
  let prevBlobUrl = null;
  let isAnimating = false;
  let particleSystem = null;

  const MODE_LABELS = {
    bing: "Bing壁纸图",
    custom: "流萤图"
  };

  function loadConfig() {
    if (window.BLOG_CONFIG && window.BLOG_CONFIG.socialLinks) {
      config = window.BLOG_CONFIG;
    }
  }

  function getImageList() {
    if (config.customImages.length > 0) return config.customImages;
    return ["bg1.jpg", "bg2.jpg", "bg3.jpg"];
  }

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
      '<div class="bottom-bar-glow"></div>' +
      '<span class="disclaimer">部分素材来源于网络，侵权必删</span>';
  }

  function setBackground(url) {
    if (!url) return;
    bgLayer.style.backgroundImage = 'url("' + url + '")';
  }

  function setLoadingProgress(val) {
    var p = Math.min(100, Math.max(0, Math.round(val)));
    if (loadingPercent) loadingPercent.textContent = p;
    if (loadingPercentFill) {
      loadingPercentFill.textContent = p;
      loadingPercentFill.style.clipPath = "inset(0 " + (100 - p) + "% 0 0)";
    }
    if (loadingFill) loadingFill.style.height = p + "%";
    if (loadingBar) loadingBar.style.width = p + "%";
  }

  function finishLoading(instant) {
    if (loadingPercent) loadingPercent.textContent = "100";
    if (loadingPercentFill) {
      loadingPercentFill.textContent = "100";
      loadingPercentFill.style.clipPath = "inset(0 0 0 0)";
    }
    if (loadingFill) loadingFill.style.height = "100%";
    if (loadingBar) loadingBar.style.width = "100%";
    if (loadingStatus) loadingStatus.textContent = "Complete";
    if (instant) {
      loadingScreen.classList.add("no-slide");
    }
    setTimeout(function () {
      loadingScreen.classList.add("hide");
    }, instant ? 0 : 500);
  }

  function todayKey() {
    return "blog_loaded_" + new Date().toDateString();
  }

  function hasLoadedToday() {
    return sessionStorage.getItem(todayKey()) === "1";
  }

  function markLoadedToday() {
    sessionStorage.setItem(todayKey(), "1");
  }

  function loadBingWithProgress() {
    return new Promise(function (resolve) {
      loadingScreen.classList.remove("hide");
      if (loadingFill) loadingFill.style.height = "0%";
      if (loadingPercent) loadingPercent.textContent = "0";
      if (loadingPercentFill) {
        loadingPercentFill.textContent = "0";
        loadingPercentFill.style.clipPath = "inset(0 100% 0 0)";
      }
      if (loadingBar) loadingBar.style.width = "0%";
      if (loadingStatus) loadingStatus.textContent = "Initializing";

      var realProgress = -1;
      var simulated = 0;
      var done = false;

      function finalize() {
        if (done) return;
        done = true;
        finishLoading();
        resolve();
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
        finishLoading();
        done = true;
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

  function loadCustomWithProgress() {
    return new Promise(function (resolve) {
      loadingScreen.classList.add("no-slide");
      loadingScreen.classList.remove("hide");
      loadingScreen.offsetHeight;
      loadingScreen.classList.remove("no-slide");
      if (loadingFill) loadingFill.style.height = "0%";
      if (loadingPercent) loadingPercent.textContent = "0";
      if (loadingPercentFill) {
        loadingPercentFill.textContent = "0";
        loadingPercentFill.style.clipPath = "inset(0 100% 0 0)";
      }
      if (loadingBar) loadingBar.style.width = "0%";
      if (loadingStatus) loadingStatus.textContent = "Initializing";

      var simulated = 0;
      var done = false;

      function finalize() {
        if (done) return;
        done = true;
        finishLoading();
        resolve();
      }

      var simTimer = setInterval(function () {
        var remaining = 100 - simulated;
        simulated += Math.max(1, remaining * 0.05);
        if (simulated >= 100) {
          simulated = 100;
          clearInterval(simTimer);
          finalize();
          return;
        }
        setLoadingProgress(Math.round(simulated));
      }, 80);

      var img = new Image();
      img.onload = function () {
        setBackground(img.src);
        clearInterval(simTimer);
        simulated = 100;
        setLoadingProgress(100);
        finalize();
      };
      img.onerror = function () {
        clearInterval(simTimer);
        finalize();
      };
      img.src = "images/" + getImageList()[0];
    });
  }

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
    var btnText = toggleBtn.querySelector(".btn-text");
    if (btnText) {
      btnText.textContent = bgMode === "bing" ? MODE_LABELS.bing : MODE_LABELS.custom;
    } else {
      toggleBtn.textContent = bgMode === "bing" ? MODE_LABELS.bing : MODE_LABELS.custom;
    }

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

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function animatePoem(content, origin) {
    isAnimating = true;
    poemText.innerHTML = "";
    poemOrigin.textContent = "";

    var cursor = document.createElement("span");
    cursor.className = "typing-cursor";

    for (var i = 0; i < content.length; i++) {
      if (!isAnimating) break;
      var charSpan = document.createElement("span");
      charSpan.textContent = content[i];
      charSpan.style.opacity = "0";
      charSpan.style.transform = "translateY(10px)";
      charSpan.style.display = "inline-block";
      charSpan.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      poemText.appendChild(charSpan);

      if (i === content.length - 1) {
        poemText.appendChild(cursor);
      }

      await delay(30);
      charSpan.style.opacity = "1";
      charSpan.style.transform = "translateY(0)";
      await delay(40);
    }

    if (cursor.parentNode) cursor.remove();

    var originFull = "—— " + origin;
    for (var j = 0; j < originFull.length; j++) {
      if (!isAnimating) break;
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

  function initCursor() {
    if (!cursorGlow || !cursorTrail) return;

    let mouseX = 0, mouseY = 0;
    let trailX = 0, trailY = 0;

    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorGlow.style.left = mouseX + "px";
      cursorGlow.style.top = mouseY + "px";
    });

    function animateTrail() {
      trailX += (mouseX - trailX) * 0.15;
      trailY += (mouseY - trailY) * 0.15;
      cursorTrail.style.left = trailX + "px";
      cursorTrail.style.top = trailY + "px";
      requestAnimationFrame(animateTrail);
    }
    animateTrail();

    var interactiveElements = document.querySelectorAll("a, .top-btn, #poem-card");
    interactiveElements.forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        cursorGlow.style.width = "40px";
        cursorGlow.style.height = "40px";
        cursorTrail.style.width = "60px";
        cursorTrail.style.height = "60px";
        cursorTrail.style.borderColor = "rgba(255, 200, 120, 0.35)";
      });
      el.addEventListener("mouseleave", function () {
        cursorGlow.style.width = "20px";
        cursorGlow.style.height = "20px";
        cursorTrail.style.width = "40px";
        cursorTrail.style.height = "40px";
        cursorTrail.style.borderColor = "rgba(255, 200, 120, 0.2)";
      });
    });
  }

  function initClock() {
    if (!clockTime || !clockDate) return;

    function updateClock() {
      var now = new Date();
      var hours = String(now.getHours()).padStart(2, "0");
      var minutes = String(now.getMinutes()).padStart(2, "0");
      var seconds = String(now.getSeconds()).padStart(2, "0");
      clockTime.textContent = hours + ":" + minutes + ":" + seconds;

      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, "0");
      var day = String(now.getDate()).padStart(2, "0");
      var weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      var weekDay = weekDays[now.getDay()];
      clockDate.textContent = year + "/" + month + "/" + day + " " + weekDay;
    }

    updateClock();
    setInterval(updateClock, 1000);
  }

  function initParticles() {
    if (!particlesCanvas || typeof ParticleSystem === "undefined") return;
    particleSystem = new ParticleSystem(particlesCanvas);
    particleSystem.start();
  }

  function initCardMouseEffect() {
    if (!poemCard) return;

    poemCard.addEventListener("mousemove", function (e) {
      var rect = poemCard.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      poemCard.style.setProperty("--mouse-x", x + "%");
      poemCard.style.setProperty("--mouse-y", y + "%");
    });
  }

  async function init() {
    loadConfig();
    renderBottomBar();
    initCursor();
    initClock();
    initParticles();
    initCardMouseEffect();

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
      await loadCustomWithProgress();
      markLoadedToday();
    }

    var poem = await fetchPoem();
    await animatePoem(poem.content, poem.origin);

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
