/* 糖心 Vlog 外部播放器跳转 - Surge request/response script */
(function () {
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
  const jumpEnabled = !["no", "0", "false", "off"].includes((options.jump || "yes").toLowerCase());

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

  function targetUrl(url) {
    if (customScheme) return customScheme + encodeURIComponent(url);
    const selected = players[player] || players.lenna;
    let shouldEncode = selected[1];
    if (encodeMode === "yes") shouldEncode = true;
    if (encodeMode === "no") shouldEncode = false;
    return selected[0] + (shouldEncode ? encodeURIComponent(url) : url);
  }

  /* 网页发现视频地址后会访问此虚拟接口；请求不会发往互联网。 */
  if (typeof $request !== "undefined" && /^https:\/\/tx-player\.local\/notify/.test($request.url || "")) {
    try {
      const query = new URL($request.url).searchParams;
      const videoUrl = query.get("url") || "";
      const title = query.get("title") || "糖心Vlog";
      if (jumpEnabled && videoUrl) {
        $notification.post(title, "点击通知跳转播放器", player, {
          action: "open-url",
          url: targetUrl(videoUrl)
        });
      }
      return $done({ status: 204, body: "" });
    } catch (error) {
      console.log("[tx-player] notify: " + error);
      return $done({ status: 204, body: "" });
    }
  }

  const response = $response || {};

  const pagePatch = function (settings) {
    if (window.__txExternalPlayerInstalled) return;
    window.__txExternalPlayerInstalled = true;

    function currentVideoUrl() {
      const videos = Array.from(document.querySelectorAll("video"));
      const active = videos.find((video) => !video.paused && (video.currentSrc || video.src));
      const video = active || videos.find((item) => item.currentSrc || item.src);
      return video ? video.currentSrc || video.src || "" : "";
    }

    let lastVideoUrl = "";
    function notifyWhenReady() {
      if (!settings.jump) return;
      const url = currentVideoUrl();
      if (!url || url === lastVideoUrl || url.startsWith("blob:")) return;
      lastVideoUrl = url;
      const title = document.title || "糖心Vlog";
      const endpoint = "https://tx-player.local/notify?url=" + encodeURIComponent(url) +
        "&title=" + encodeURIComponent(title) + "&_=" + Date.now();
      fetch(endpoint, { mode: "no-cors", cache: "no-store" }).catch(function () {});
    }

    setInterval(notifyWhenReady, 1000);
    document.addEventListener("play", notifyWhenReady, true);
  };

  try {
    const body = response.body || "";
    if (!/<\/head>/i.test(body)) return $done({});
    const settings = { jump: jumpEnabled };
    const injected = `<script id="tx-external-player-patch">(${pagePatch.toString()})(${JSON.stringify(settings)});<\/script>`;
    const headers = Object.assign({}, response.headers || {});
    ["Content-Encoding", "content-encoding", "Content-Length", "content-length", "Transfer-Encoding", "transfer-encoding"].forEach((key) => delete headers[key]);
    $done({ body: body.replace(/<\/head>/i, injected + "</head>"), headers });
  } catch (error) {
    console.log("[tx-player] " + (error && error.message ? error.message : error));
    $done({});
  }
})();
