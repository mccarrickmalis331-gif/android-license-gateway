const ORIGIN = "https://android-license-worker.mccarrickmalis331.workers.dev";
const APK_PROCESSOR_ORIGIN = "";

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/manifest.webmanifest") {
      return Response.json({
        name: "安卓卡密验证后台",
        short_name: "卡密后台",
        start_url: "/",
        display: "standalone",
        background_color: "#f5f7fb",
        theme_color: "#1769aa"
      }, { headers: { "content-type": "application/manifest+json; charset=utf-8", ...corsHeaders() } });
    }
    if (request.method === "GET" && url.pathname === "/api/dashboard-info") {
      return Response.json({
        ok: true,
        mobile: true,
        capabilities: ["heartbeat", "md5-signature", "rc4-transport", "timestamp-validation"],
        timestampWindowSeconds: 300,
        apkToolUrl: APK_PROCESSOR_ORIGIN ? "/apk" : ""
      }, { headers: corsHeaders() });
    }
    if (url.pathname === "/apk/status" || url.pathname === "/apk/process" || url.pathname.startsWith("/apk/out/")) {
      return proxyApk(request, url);
    }
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(adminPage(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          ...corsHeaders()
        }
      });
    }

    return proxy(request, url);
  }
};

async function proxy(request, sourceUrl) {
  try {
    const targetUrl = new URL(sourceUrl.pathname + sourceUrl.search, ORIGIN);
    const headers = new Headers(request.headers);
    ["host", "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor", "content-length", "x-forwarded-host"].forEach((key) => headers.delete(key));

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual"
    });

    const outHeaders = new Headers(response.headers);
    Object.entries(corsHeaders()).forEach(([key, value]) => outHeaders.set(key, value));
    outHeaders.delete("content-encoding");
    outHeaders.delete("content-length");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders
    });
  } catch (error) {
    return Response.json(
      { ok: false, message: error && error.message ? error.message : "proxy error" },
      { status: 502, headers: corsHeaders() }
    );
  }
}

async function proxyApk(request, sourceUrl) {
  if (!APK_PROCESSOR_ORIGIN) {
    return Response.json(
      { ok: false, message: "云端 APK 处理服务还没配置。需要先部署 Docker 版 APK 处理器。" },
      { status: 503, headers: corsHeaders() }
    );
  }

  try {
    let pathname = "/api/process";
    if (sourceUrl.pathname === "/apk/status") pathname = "/api/status";
    if (sourceUrl.pathname.startsWith("/apk/out/")) pathname = "/out/" + sourceUrl.pathname.slice("/apk/out/".length);
    const targetUrl = new URL(pathname + sourceUrl.search, APK_PROCESSOR_ORIGIN);
    const headers = new Headers(request.headers);
    ["host", "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor", "content-length", "x-forwarded-host"].forEach((key) => headers.delete(key));

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual"
    });

    const outHeaders = new Headers(response.headers);
    Object.entries(corsHeaders()).forEach(([key, value]) => outHeaders.set(key, value));
    outHeaders.delete("content-encoding");
    outHeaders.delete("content-length");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: outHeaders });
  } catch (error) {
    return Response.json(
      { ok: false, message: error && error.message ? error.message : "apk processor proxy error" },
      { status: 502, headers: corsHeaders() }
    );
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "*"
  };
}

function adminPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#1769aa">
  <link rel="manifest" href="/manifest.webmanifest">
  <title>卡密验证系统</title>
  <style>
    :root{color-scheme:light;--bg:#f5f7fb;--panel:#fff;--line:#dfe5ef;--text:#172033;--muted:#667085;--brand:#1769aa;--danger:#b42318}
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,"Microsoft YaHei",sans-serif}
    .wrap{max-width:1180px;margin:auto;padding:22px 14px}.top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px;margin-top:14px}.grid{display:grid;grid-template-columns:100px 120px 120px 1fr 110px;gap:10px;align-items:end}
    label{display:block;font-weight:700;font-size:13px} input,select,textarea{width:100%;min-height:38px;border:1px solid var(--line);border-radius:6px;padding:8px;margin-top:6px;background:#fff;color:var(--text)}
    textarea{height:110px;font-family:Consolas,monospace}.code{height:180px}.bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    button{min-height:38px;border:0;border-radius:6px;background:var(--brand);color:white;padding:0 13px;cursor:pointer;font-weight:700}button:disabled{opacity:.55;cursor:not-allowed}.ghost{background:#fff;color:var(--text);border:1px solid var(--line)}.danger{background:#fff;color:var(--danger);border:1px solid #f0b8b0}
    .muted{color:var(--muted);font-size:13px}.status{min-height:22px;margin-top:10px;font-weight:700}.created{display:none}.table{overflow:auto}table{width:100%;min-width:960px;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.key{font-family:Consolas,monospace;font-weight:700}.actions{display:flex;gap:6px;flex-wrap:wrap}
    .cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}.security{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.security>div{border:1px solid var(--line);padding:12px;border-radius:6px}.security b{display:block;margin-bottom:5px}.ok{color:#067647}
    .flow{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}.flow>div{border:1px solid var(--line);border-radius:6px;padding:12px;background:#fbfcff}.flow b{display:block;margin-bottom:4px}.drop{border:2px dashed #8aa4c4;border-radius:8px;padding:24px;text-align:center;background:#f8fbff;cursor:pointer}.drop.drag{background:#eaf4ff}.terminal{white-space:pre-wrap;background:#111827;color:#d7fff5;padding:14px;border-radius:8px;min-height:126px}.wide{grid-column:1/-1}.mini{font-size:12px}.link{color:var(--brand);font-weight:700}
    @media(max-width:800px){.grid,.cards,.security,.flow{grid-template-columns:1fr}.wrap{padding:12px}.top h1{font-size:24px}.panel{padding:13px}button{min-height:44px}.table{margin:0 -13px;padding:0 13px}}
  </style>
</head>
<body>
  <main class="wrap">
    <div class="top">
      <div>
        <h1>卡密验证系统</h1>
        <div class="muted">当前后台地址：<b id="serverUrl"></b></div>
      </div>
      <button id="copyServer" class="ghost" type="button">复制后台地址</button>
    </div>

    <section class="panel">
      <label>管理密钥
        <input id="token" type="password" value="change_this_admin_token">
      </label>
      <div id="status" class="status"></div>
    </section>

    <section class="panel">
      <div class="bar"><h2 style="margin:0">统一安全验证</h2><span class="muted">安卓与后台使用同一套协议</span></div>
      <div class="security" style="margin-top:12px">
        <div><b>卡密心跳</b><span class="ok">已启用</span><p class="muted">后台记录最后心跳时间，失效或禁用后拒绝进入。</p></div>
        <div><b>MD5 签名</b><span class="ok">已启用</span><p class="muted">请求和响应均验签，检测内容被修改。</p></div>
        <div><b>RC4 加密传输</b><span class="ok">已启用</span><p class="muted">业务数据加密后再通过 HTTPS 发送。</p></div>
        <div><b>时间戳验证</b><span class="ok">已启用</span><p class="muted">允许误差 5 分钟，并配合随机数阻止重复请求。</p></div>
      </div>
    </section>

    <section class="panel">
      <h2>生成卡密</h2>
      <form id="form" class="grid">
        <label>数量<input name="count" type="number" min="1" max="200" value="1"></label>
        <label>时长<input name="duration" type="number" min="1" value="1"></label>
        <label>单位<select name="unit"><option value="minute">分钟</option><option value="hour">小时</option><option value="day" selected>天</option><option value="month">月</option><option value="year">年</option></select></label>
        <label>备注<input name="note" placeholder="例如：测试卡"></label>
        <button id="createBtn" type="submit">生成</button>
      </form>
      <div id="created" class="created">
        <p><b>刚生成的卡密</b> <button id="copyCreated" class="ghost" type="button">复制全部</button></p>
        <textarea id="createdText" readonly></textarea>
      </div>
    </section>

    <section class="panel">
      <div class="bar">
        <button id="refresh" class="ghost" type="button">刷新</button>
        <button id="deleteAll" class="danger" type="button">删除全部卡密</button>
        <span id="count" class="muted"></span>
      </div>
      <div class="table">
        <table>
          <thead><tr><th>卡密</th><th>状态</th><th>有效期</th><th>设备</th><th>激活/心跳</th><th>备注</th><th>操作</th></tr></thead>
          <tbody id="body"></tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="bar"><h2 style="margin:0">验证 + APK 保护一体化</h2><span class="muted">生成卡密、注入验证框、混淆、可选 VMP 壳放在同一套后台里</span></div>
      <div class="flow">
        <div><b>1. 生成卡密</b><span class="muted">上方直接生成各种时长的卡密。</span></div>
        <div><b>2. 拖入 APK</b><span class="muted">选择已经编译好的 APK 文件。</span></div>
        <div><b>3. 加验证和混淆</b><span class="muted">自动加入卡密窗口、心跳、MD5、RC4、时间戳。</span></div>
        <div><b>4. 下载成品</b><span class="muted">输出重新签名后的保护 APK。</span></div>
      </div>
      <div class="cards" style="margin-top:14px">
        <div>
          <div id="cloudDrop" class="drop">
            <b>点击选择 APK 文件</b>
            <p class="muted">也支持把 APK 拖到这里；内置浏览器不支持拖拽时，请直接点击选择。</p>
            <input id="apkFile" type="file" accept=".apk" style="display:none">
          </div>
          <div class="bar" style="margin-top:12px">
            <button id="processApk" type="button" disabled>一键加验证并保护 APK</button>
            <button id="checkApkTool" class="ghost" type="button">检测云端处理器</button>
          </div>
          <p class="muted mini">云端版本只需要打开这个后台。APK 会上传到云端处理器，处理完成后在这里下载。</p>
        </div>
        <div>
          <label>云端 APK 处理入口
            <input id="localToolUrl" value="/apk" readonly>
          </label>
          <label>统一后台地址
            <input id="protectServer">
          </label>
          <div class="cards" style="grid-template-columns:1fr 1fr;margin-top:8px">
            <label>App ID<input id="protectAppId" value="demo_android_app"></label>
            <label>App Secret<input id="protectSecret" type="password" value="change_this_app_secret"></label>
          </div>
          <label>RC4 Key
            <input id="protectRc4" type="password" value="change_this_rc4_key">
          </label>
          <p><label><input id="protectObfuscate" type="checkbox" checked> 使用 R8 混淆验证模块</label></p>
          <p><label><input id="protectVmp" type="checkbox"> 完成后调用 VMP 壳</label></p>
        </div>
        <div class="wide">
          <div id="apkStatus" class="terminal">等待 APK...</div>
          <p id="apkDownload"></p>
        </div>
      </div>
      <div class="cards" style="margin-top:14px">
        <div>
          <p class="muted">给 Android Studio 源码项目用的配置和脚本也保留在这里。</p>
          <button id="copyConfig" type="button">复制安卓配置</button>
          <button id="copyInstall" class="ghost" type="button">复制一键接入命令</button>
          <textarea id="configCode" class="code" readonly></textarea>
          <textarea id="installCode" class="code" readonly></textarea>
        </div>
        <div>
          <p class="muted">VMP 壳需要你自己的加固工具。放到 <b>tools\\vmp\\packer.bat</b> 后即可由上面的开关调用。</p>
          <button id="copyObfuscate" type="button">复制混淆打包命令</button>
          <button id="copyVmp" class="ghost" type="button">复制 VMP 加壳命令</button>
          <button id="installApp" class="ghost" type="button" hidden>安装后台到安卓桌面</button>
          <textarea id="obfuscateCode" readonly></textarea>
          <textarea id="vmpCode" readonly></textarea>
        </div>
      </div>
    </section>
  </main>

  <script>
    var cards = [];
    var selectedApk = null;
    var pendingCards = {};
    var hiddenKeys = {};
    var deletedBefore = null;
    var apkToolReady = false;
    function q(s){ return document.querySelector(s); }
    function apiToken(){ return q("#token").value.trim(); }
    function setStatus(text, isError){ q("#status").textContent = text || ""; q("#status").style.color = isError ? "var(--danger)" : "var(--brand)"; }
    function setApkStatus(text, isError){ q("#apkStatus").textContent = text || ""; q("#apkStatus").style.color = isError ? "#fecaca" : "#d7fff5"; }
    function serverUrl(){ return location.origin; }
    function localToolUrl(){ return (q("#localToolUrl").value || "/apk").trim().replace(/\\\/+$/, ""); }
    function esc(v){ return String(v == null ? "" : v).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
    function dt(s){ return s ? new Date(s * 1000).toLocaleString("zh-CN", {hour12:false}) : "-"; }
    function dur(s){ if (s == null) return "-"; var d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60); if(d)return d+"天"+(h?" "+h+"小时":""); if(h)return h+"小时"+(m?" "+m+"分钟":""); return Math.max(1,m)+"分钟"; }
    function actionButton(action, key, text, cls){ return '<button class="'+(cls||"ghost")+'" data-a="'+action+'" data-k="'+esc(key)+'" type="button">'+text+'</button>'; }
    async function copyText(text){ await navigator.clipboard.writeText(text); setStatus("已复制"); }
    async function api(path, options){
      options = options || {};
      options.headers = Object.assign({"content-type":"application/json","x-admin-token":apiToken()}, options.headers || {});
      var response = await fetch(path, options);
      var text = await response.text();
      var body;
      try { body = text ? JSON.parse(text) : {}; } catch (e) { throw new Error("服务器返回不是 JSON：" + text.slice(0, 120)); }
      if (!response.ok || body.ok === false) throw new Error(body.message || "请求失败");
      return body;
    }
    function render(){
      q("#count").textContent = "共 " + cards.length + " 张";
      if (!cards.length) {
        q("#body").innerHTML = '<tr><td colspan="7" class="muted">暂无卡密。生成后会马上显示在这里。</td></tr>';
        return;
      }
      q("#body").innerHTML = cards.map(function(c){
        var controls = c.status === "disabled" ? actionButton("enable", c.cardKey, "启用") : actionButton("disable", c.cardKey, "禁用");
        controls += actionButton("reset", c.cardKey, "重置") + actionButton("delete", c.cardKey, "删除", "danger");
        return '<tr><td><div class="key">'+esc(c.cardKey)+'</div>'+actionButton("copy", c.cardKey, "复制")+'</td><td>'+esc(c.status)+'</td><td>'+dur(c.durationSeconds)+'<br><span class="muted">到期：'+dt(c.expiresAt)+'</span><br><span class="muted">剩余：'+(c.remainingSeconds == null ? "-" : dur(c.remainingSeconds))+'</span></td><td>'+esc(c.deviceId || "-")+'<br><span class="muted">版本：'+esc(c.appVersion || "-")+'</span></td><td>激活：'+dt(c.activatedAt)+'<br><span class="muted">心跳：'+dt(c.lastHeartbeatAt)+'</span></td><td>'+esc(c.note || "")+'</td><td><div class="actions">'+controls+'</div></td></tr>';
      }).join("");
    }
    function saveUiState(){
      sessionStorage.setItem("licensePendingCards", JSON.stringify(pendingCards));
      sessionStorage.setItem("licenseHiddenKeys", JSON.stringify(hiddenKeys));
      sessionStorage.setItem("licenseDeletedBefore", JSON.stringify(deletedBefore));
    }
    function restoreUiState(){
      try { pendingCards = JSON.parse(sessionStorage.getItem("licensePendingCards") || "{}"); } catch (_) { pendingCards = {}; }
      try { hiddenKeys = JSON.parse(sessionStorage.getItem("licenseHiddenKeys") || "{}"); } catch (_) { hiddenKeys = {}; }
      try { deletedBefore = JSON.parse(sessionStorage.getItem("licenseDeletedBefore") || "null"); } catch (_) { deletedBefore = null; }
    }
    function reconcile(remoteCards){
      var now = Date.now();
      var remoteKeys = {};
      (remoteCards || []).forEach(function(c){ remoteKeys[c.cardKey] = true; });
      Object.keys(pendingCards).forEach(function(key){
        if (remoteKeys[key] || Number(pendingCards[key]._pendingUntil || 0) <= now) delete pendingCards[key];
      });
      Object.keys(hiddenKeys).forEach(function(key){ if (Number(hiddenKeys[key]) <= now) delete hiddenKeys[key]; });
      if (deletedBefore && Number(deletedBefore.expiresAt || 0) <= now) deletedBefore = null;
      var combined = (remoteCards || []).concat(Object.keys(pendingCards).map(function(key){ return pendingCards[key]; }));
      var seen = {};
      cards = combined.filter(function(c){
        if (!c || !c.cardKey || seen[c.cardKey] || hiddenKeys[c.cardKey]) return false;
        if (deletedBefore && Number(c.createdAt || 0) <= Number(deletedBefore.createdAt || 0)) return false;
        seen[c.cardKey] = true;
        return true;
      });
      cards.sort(function(a,b){ return Number(b.createdAt || 0) - Number(a.createdAt || 0); });
      saveUiState();
      render();
    }
    async function load(){ reconcile((await api("/admin/cards")).cards || []); }
    function mergeCreated(list){
      (list || []).forEach(function(c){
        if (!c || !c.cardKey) return;
        c._pendingUntil = Date.now() + 120000;
        pendingCards[c.cardKey] = c;
        delete hiddenKeys[c.cardKey];
      });
      reconcile(cards);
    }
    function delayedSync(){
      [3000, 12000, 45000].forEach(function(delay){
        setTimeout(function(){ load().catch(function(e){ setStatus(e.message, true); }); }, delay);
      });
    }
    function updateSnippets(){
      q("#serverUrl").textContent = serverUrl();
      q("#protectServer").value = q("#protectServer").value || serverUrl();
      q("#configCode").value = 'static final String DEFAULT_BASE_URL = "' + serverUrl() + '";';
      q("#installCode").value = 'powershell -ExecutionPolicy Bypass -File tools\\\\apply-license-box.ps1 -TargetProjectDir "C:\\\\你的安卓项目" -ServerUrl "' + serverUrl() + '"';
      q("#obfuscateCode").value = '.\\\\gradlew.bat assembleShielded';
      q("#vmpCode").value = 'powershell -ExecutionPolicy Bypass -File tools\\\\build-protected.ps1';
    }
    function setApkFile(file){
      if (!file || !file.name.toLowerCase().endsWith(".apk")) return setApkStatus("请选择 APK 文件", true);
      selectedApk = file;
      q("#processApk").disabled = !apkToolReady;
      if (apkToolReady) setApkStatus("已选择：" + file.name + "\\n点击“一键加验证并保护 APK”开始处理。");
      else setApkStatus("已选择：" + file.name + "\\n卡密后台可正常使用，但云端 APK 处理器尚未部署，暂时不能上传处理 APK。", true);
    }
    async function checkApkTool(){
      setApkStatus("正在检测云端 APK 处理器...");
      try {
        var response = await fetch(localToolUrl() + "/status", { method:"GET" });
        var body = await response.json();
        if (!body.ok) throw new Error(body.message || "工具未就绪");
        apkToolReady = true;
        q("#processApk").disabled = !selectedApk;
        var urls = (body.accessUrls || []).join("\\n");
        var tools = body.tools || {};
        setApkStatus("云端处理器正常\\n访问地址：\\n" + (urls || "当前后台转发") + "\\n\\nR8 混淆：" + (tools.r8 ? "可用" : "未找到") + "\\nVMP 壳：" + (tools.vmp ? "可用" : "未安装"));
      } catch (error) {
        apkToolReady = false;
        q("#processApk").disabled = true;
        setApkStatus("云端 APK 处理器还没有连上。\\n需要先部署 Docker 版 APK 处理器，再把后台里的 APK_PROCESSOR_ORIGIN 填成云端地址。\\n" + (error.message || error), true);
      }
    }
    async function processApk(){
      if (!selectedApk) return setApkStatus("请先选择 APK 文件", true);
      q("#processApk").disabled = true;
      q("#apkDownload").innerHTML = "";
      setApkStatus("正在处理 APK...\\n正在加入验证窗口、心跳、MD5、RC4、时间戳，并执行混淆。");
      var qs = new URLSearchParams({
        fileName: selectedApk.name,
        serverUrl: q("#protectServer").value || serverUrl(),
        appId: q("#protectAppId").value,
        appSecret: q("#protectSecret").value,
        rc4Key: q("#protectRc4").value,
        obfuscate: q("#protectObfuscate").checked ? "1" : "0",
        vmp: q("#protectVmp").checked ? "1" : "0"
      });
      try {
        var response = await fetch(localToolUrl() + "/process?" + qs, { method:"POST", body:selectedApk });
        var body = await response.json();
        if (!body.ok) throw new Error(body.message || "处理失败");
        var url = body.file && body.file.startsWith("http") ? body.file : localToolUrl() + body.file;
        setApkStatus("处理完成\\n包名：" + body.packageName + "\\n原启动页：" + body.launcher + "\\n统一后台：" + body.serverUrl + "\\n安全传输：卡密心跳 + MD5 签名 + RC4 加密 + 时间戳验证\\n" + body.obfuscationMessage + "\\n" + body.vmpMessage);
        q("#apkDownload").innerHTML = '<a class="link" href="' + esc(url) + '">下载处理后的 APK：' + esc(body.fileName) + '</a>';
      } catch (error) {
        setApkStatus("处理失败：\\n" + (error.message || error) + "\\n\\n如果提示云端处理器未配置，说明还差部署 Docker 处理器这一步。", true);
      } finally {
        q("#processApk").disabled = !selectedApk || !apkToolReady;
      }
    }
    q("#token").addEventListener("change", function(){ localStorage.setItem("adminToken", apiToken()); });
    q("#refresh").onclick = function(){ load().then(function(){ setStatus("已刷新"); }).catch(function(e){ setStatus(e.message, true); }); };
    q("#form").onsubmit = async function(e){
      e.preventDefault();
      var btn = q("#createBtn");
      if (btn.disabled) return;
      var f = new FormData(e.target);
      var payload = { count:Number(f.get("count")), duration:Number(f.get("duration")), unit:f.get("unit"), note:f.get("note") };
      if (!Number.isFinite(payload.count) || payload.count < 1 || payload.count > 200) return setStatus("数量必须是 1-200", true);
      if (!Number.isFinite(payload.duration) || payload.duration < 1) return setStatus("时长必须大于 0", true);
      btn.disabled = true; btn.textContent = "生成中"; setStatus("正在生成卡密...");
      try {
        var result = await api("/admin/cards", { method:"POST", body:JSON.stringify(payload) });
        var list = result.cards || [];
        q("#createdText").value = list.map(function(c){ return c.cardKey; }).join("\\n");
        q("#created").style.display = "block";
        setStatus("生成成功：" + list.length + " 张");
        mergeCreated(list);
        delayedSync();
      } catch (err) {
        setStatus(err.message, true);
      } finally {
        btn.disabled = false; btn.textContent = "生成";
      }
    };
    q("#copyCreated").onclick = function(){ copyText(q("#createdText").value); };
    q("#copyServer").onclick = function(){ copyText(serverUrl()); };
    q("#copyConfig").onclick = function(){ copyText(q("#configCode").value); };
    q("#copyInstall").onclick = function(){ copyText(q("#installCode").value); };
    q("#copyObfuscate").onclick = function(){ copyText(q("#obfuscateCode").value); };
    q("#copyVmp").onclick = function(){ copyText(q("#vmpCode").value); };
    q("#cloudDrop").onclick = function(){ q("#apkFile").click(); };
    q("#apkFile").onchange = function(){ setApkFile(q("#apkFile").files[0]); };
    q("#cloudDrop").ondragover = function(e){ e.preventDefault(); q("#cloudDrop").classList.add("drag"); };
    q("#cloudDrop").ondragleave = function(){ q("#cloudDrop").classList.remove("drag"); };
    q("#cloudDrop").ondrop = function(e){ e.preventDefault(); q("#cloudDrop").classList.remove("drag"); setApkFile(e.dataTransfer.files[0]); };
    q("#checkApkTool").onclick = checkApkTool;
    q("#processApk").onclick = processApk;
    var installPrompt;
    window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); installPrompt=e; q("#installApp").hidden=false; });
    q("#installApp").onclick = async function(){ if(!installPrompt)return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt=null; q("#installApp").hidden=true; };
    q("#deleteAll").onclick = async function(){
      if (!confirm("确认删除全部卡密？这个操作不能恢复。")) return;
      setStatus("正在删除全部卡密...");
      try {
        var result = await api("/admin/cards", { method:"DELETE" });
        q("#created").style.display = "none"; q("#createdText").value = "";
        setStatus("已删除 " + result.deleted + " 张卡密");
        deletedBefore = { createdAt:Math.floor(Date.now()/1000) + 5, expiresAt:Date.now() + 120000 };
        pendingCards = {};
        cards.forEach(function(c){ hiddenKeys[c.cardKey] = Date.now() + 120000; });
        cards = [];
        saveUiState();
        render();
        delayedSync();
      } catch (err) { setStatus(err.message, true); }
    };
    q("#body").onclick = async function(e){
      var b = e.target.closest("button"); if (!b) return;
      var action = b.dataset.a, key = b.dataset.k;
      try {
        if (action === "copy") return copyText(key);
        if (action === "delete") {
          if (!confirm("确认删除 " + key + "？")) return;
          await api("/admin/cards/" + encodeURIComponent(key), { method:"DELETE" });
          hiddenKeys[key] = Date.now() + 120000;
          delete pendingCards[key];
          cards = cards.filter(function(c){ return c.cardKey !== key; });
          saveUiState();
          render();
          delayedSync();
          return setStatus("已删除 " + key);
        } else {
          var updated = await api("/admin/cards/" + encodeURIComponent(key), { method:"PATCH", body:JSON.stringify({ action:action }) });
          cards = cards.map(function(c){ return c.cardKey === key && updated.card ? updated.card : c; });
          render();
        }
        delayedSync(); setStatus("操作成功");
      } catch (err) { setStatus(err.message, true); }
    };
    updateSnippets();
    q("#token").value = localStorage.getItem("adminToken") || q("#token").value;
    restoreUiState();
    checkApkTool();
    load().catch(function(e){ setStatus(e.message, true); });
  </script>
</body>
</html>`;
}
