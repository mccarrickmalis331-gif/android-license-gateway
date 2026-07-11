const ORIGIN = "https://android-license-worker.mccarrickmalis331.workers.dev";

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
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
    .cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:800px){.grid,.cards{grid-template-columns:1fr}.wrap{padding:12px}}
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
      <h2>一键接入验证框</h2>
      <div class="cards">
        <div>
          <p class="muted">手机端现在可以在验证页直接改后台地址；下面是当前后台地址对应的配置代码。</p>
          <button id="copyConfig" type="button">复制安卓配置</button>
          <textarea id="configCode" class="code" readonly></textarea>
        </div>
        <div>
          <p class="muted">本地工程已加入脚本：<b>tools/apply-license-box.ps1</b>。给其他 Android 项目一键加验证框时运行它。</p>
          <button id="copyInstall" class="ghost" type="button">复制一键接入命令</button>
          <textarea id="installCode" class="code" readonly></textarea>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>APP 保护</h2>
      <div class="cards">
        <div>
          <p class="muted">已支持 R8/ProGuard 混淆，生成 protected 版本时会先混淆。</p>
          <button id="copyObfuscate" type="button">复制混淆打包命令</button>
          <textarea id="obfuscateCode" readonly></textarea>
        </div>
        <div>
          <p class="muted">VMP 壳需要你自己的加固工具。放到 <b>tools\\vmp\\packer.bat</b> 后运行保护脚本即可。</p>
          <button id="copyVmp" class="ghost" type="button">复制 VMP 加壳命令</button>
          <textarea id="vmpCode" readonly></textarea>
        </div>
      </div>
    </section>
  </main>

  <script>
    var cards = [];
    function q(s){ return document.querySelector(s); }
    function apiToken(){ return q("#token").value.trim(); }
    function setStatus(text, isError){ q("#status").textContent = text || ""; q("#status").style.color = isError ? "var(--danger)" : "var(--brand)"; }
    function serverUrl(){ return location.origin; }
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
      q("#body").innerHTML = cards.map(function(c){
        var controls = c.status === "disabled" ? actionButton("enable", c.cardKey, "启用") : actionButton("disable", c.cardKey, "禁用");
        controls += actionButton("reset", c.cardKey, "重置") + actionButton("delete", c.cardKey, "删除", "danger");
        return '<tr><td><div class="key">'+esc(c.cardKey)+'</div>'+actionButton("copy", c.cardKey, "复制")+'</td><td>'+esc(c.status)+'</td><td>'+dur(c.durationSeconds)+'<br><span class="muted">到期：'+dt(c.expiresAt)+'</span><br><span class="muted">剩余：'+(c.remainingSeconds == null ? "-" : dur(c.remainingSeconds))+'</span></td><td>'+esc(c.deviceId || "-")+'<br><span class="muted">版本：'+esc(c.appVersion || "-")+'</span></td><td>激活：'+dt(c.activatedAt)+'<br><span class="muted">心跳：'+dt(c.lastHeartbeatAt)+'</span></td><td>'+esc(c.note || "")+'</td><td><div class="actions">'+controls+'</div></td></tr>';
      }).join("");
    }
    async function load(){ cards = (await api("/admin/cards")).cards || []; render(); }
    function updateSnippets(){
      q("#serverUrl").textContent = serverUrl();
      q("#configCode").value = 'static final String DEFAULT_BASE_URL = "' + serverUrl() + '";';
      q("#installCode").value = 'powershell -ExecutionPolicy Bypass -File tools\\\\apply-license-box.ps1 -TargetProjectDir "C:\\\\你的安卓项目" -ServerUrl "' + serverUrl() + '"';
      q("#obfuscateCode").value = '.\\\\gradlew.bat assembleShielded';
      q("#vmpCode").value = 'powershell -ExecutionPolicy Bypass -File tools\\\\build-protected.ps1';
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
        await load();
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
    q("#deleteAll").onclick = async function(){
      if (!confirm("确认删除全部卡密？这个操作不能恢复。")) return;
      setStatus("正在删除全部卡密...");
      try {
        var result = await api("/admin/cards", { method:"DELETE" });
        q("#created").style.display = "none"; q("#createdText").value = "";
        setStatus("已删除 " + result.deleted + " 张卡密");
        await load();
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
        } else {
          await api("/admin/cards/" + encodeURIComponent(key), { method:"PATCH", body:JSON.stringify({ action:action }) });
        }
        await load(); setStatus("操作成功");
      } catch (err) { setStatus(err.message, true); }
    };
    updateSnippets();
    q("#token").value = localStorage.getItem("adminToken") || q("#token").value;
    load().catch(function(e){ setStatus(e.message, true); });
  </script>
</body>
</html>`;
}
