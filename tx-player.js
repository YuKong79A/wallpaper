/* 糖心 Vlog 外部播放器跳转 - Surge response script */
(function () {
  const response = $response || {};
  const rawArgument = typeof $argument === "string" ? $argument : "";
  const options = Object.fromEntries(
    rawArgument.split("&").filter(Boolean).map((part) => {
      const [key, ...rest] = part.split("=");
      return [decodeURIComponent(key || ""), decodeURIComponent(rest.join("=") || "")];
    })
  );

  const player = options.player || "lenna";
  const customScheme = options.scheme && options.scheme !== "none" ? options.scheme : "";
  const encodeMode = options.encode || "default";

  const pagePatch = function (settings) {
    if (window.__txExternalPlayerInstalled) return;
    window.__txExternalPlayerInstalled = true;

    const players = {
      lenna: ["lenna://x-callback-url/play?url=", true],
      SenPlayer: ["SenPlayer://x-callback-url/play?url=", true],
      "SenPlayer-dl": ["SenPlayer://x-callback-url/download?url=", true],
      Infuse: ["infuse://x-callback-url/play?url=", true],
      Fileball: ["filebox://play?url=", true],
      VidHub: ["vidhub://x-callback-url/play?url=", true],
      IINA: ["iina://weblink?url=", true],
      Alook: ["Alook://", false],
      VLC: ["vlc://", false],
      KMPlayer: ["kmplayer://", false],
      NPlayer: ["nplayer-http://", false],
      Safari: ["", false]
    };

    function currentVideoUrl() {
      const videos = Array.from(document.querySelectorAll("video"));
      const active = videos.find((video) => !video.paused && (video.currentSrc || video.src));
      const video = active || videos.find((item) => item.currentSrc || item.src);
      return video ? video.currentSrc || video.src || "" : "";
    }

    function targetUrl(url) {
      if (settings.scheme) return settings.scheme + encodeURIComponent(url);
      const selected = players[settings.player] || players.lenna;
      let shouldEncode = selected[1];
      if (settings.encode === "yes") shouldEncode = true;
      if (settings.encode === "no") shouldEncode = false;
      return selected[0] + (shouldEncode ? encodeURIComponent(url) : url);
    }

    function installButton() {
      if (document.getElementById("tx-external-player")) return;
      const button = document.createElement("button");
      button.id = "tx-external-player";
      button.textContent = "外部播放";
      button.style.cssText = "position:fixed;right:14px;bottom:92px;z-index:2147483647;padding:9px 13px;border:0;border-radius:999px;background:#ff3250;color:#fff;font-size:14px;font-weight:600;box-shadow:0 3px 12px #0008";
      button.addEventListener("click", function () {
        const url = currentVideoUrl();
        if (!url) {
          alert("尚未取得视频地址，请先开始播放后再试。");
          return;
        }
        location.href = targetUrl(url);
      });
      document.body.appendChild(button);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", installButton, { once: true });
    } else {
      installButton();
    }
    new MutationObserver(installButton).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  };

  try {
    const body = response.body || "";
    if (!/<\/head>/i.test(body)) return $done({});
    const settings = { player, scheme: customScheme, encode: encodeMode };
    const injected = `<script id="tx-external-player-patch">(${pagePatch.toString()})(${JSON.stringify(settings)});<\/script>`;
    const headers = Object.assign({}, response.headers || {});
    ["Content-Encoding", "content-encoding", "Content-Length", "content-length", "Transfer-Encoding", "transfer-encoding"].forEach((key) => delete headers[key]);
    $done({ body: body.replace(/<\/head>/i, injected + "</head>"), headers });
  } catch (error) {
    console.log("[tx-player] " + (error && error.message ? error.message : error));
    $done({});
  }
})();
