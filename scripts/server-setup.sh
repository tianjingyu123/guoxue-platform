#!/bin/bash
# 国学平台服务器一键安装脚本
# 适用: Ubuntu 22.04+ / Debian 12+
# 用法: chmod +x server-setup.sh && sudo bash server-setup.sh

set -e

echo "=== 国学平台服务器部署 ==="

# 1. 基础依赖
apt update && apt install -y curl git nginx certbot python3-certbot-nginx ufw

# 2. Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 3. Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 4. PM2
npm install -g pm2

# 5. 克隆项目 (替换为你的实际仓库地址)
# git clone <你的仓库> /opt/guoxue-platform
# cd /opt/guoxue-platform && pnpm install

# 6. 防火墙
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3000
ufw --force enable

# 7. 移动端聊天桥接服务
mkdir -p /opt/claude-bridge
cat > /opt/claude-bridge/server.mjs << 'BRIDGE_EOF'
import http from "http";
import { spawn } from "child_process";
import { readFile } from "fs/promises";

const PORT = process.env.PORT || 3456;
const SESSIONS = new Map();

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>国学平台 · 远程对话</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#1a1a2e;color:#e0e0e0;height:100dvh;display:flex;flex-direction:column}
.header{background:#16213e;padding:12px 16px;text-align:center;font-size:14px;font-weight:600;border-bottom:1px solid #0f3460;flex-shrink:0}
.messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.6;word-break:break-word}
.msg.user{align-self:flex-end;background:#0f3460;color:#e0e0e0}
.msg.assistant{align-self:flex-start;background:#16213e;color:#d0d0d0}
.msg.assistant pre{background:#0a0a1a;padding:8px;border-radius:6px;overflow-x:auto;font-size:12px;margin:8px 0}
.msg.assistant code{font-size:12px;background:#0a0a1a;padding:2px 4px;border-radius:3px}
.msg .time{font-size:10px;color:#888;margin-top:4px}
.loading{align-self:flex-start;padding:10px 14px}
.loading span{animation:blink 1.4s infinite}
@keyframes blink{0%{opacity:0.2}20%{opacity:1}100%{opacity:1}}
.input-area{display:flex;padding:12px;gap:8px;border-top:1px solid #0f3460;background:#16213e;flex-shrink:0}
.input-area textarea{flex:1;background:#1a1a2e;border:1px solid #0f3460;border-radius:8px;color:#e0e0e0;padding:10px;font-size:14px;resize:none;min-height:44px;max-height:120px;font-family:inherit}
.input-area button{background:#e94560;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;flex-shrink:0}
.input-area button:active{background:#c73e54}
</style>
</head>
<body>
<div class="header">国学平台 · 远程对话</div>
<div class="messages" id="msgs">
<div class="msg assistant">你好！我是 Claude。输入任务指令，我会在服务器上执行并反馈结果。<br><br>支持的操作：代码开发、文件操作、服务器管理、数据库查询等。</div>
</div>
<div class="input-area">
<textarea id="input" rows="1" placeholder="输入任务指令..."></textarea>
<button onclick="send()">发送</button>
</div>
<script>
const msgs=document.getElementById("msgs"),input=document.getElementById("input");
function addMsg(role,text){
  const d=document.createElement("div");
  d.className="msg "+role;
  d.innerHTML=text+"<div class=time>"+new Date().toLocaleTimeString()+"</div>";
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
}
async function send(){
  const t=input.value.trim();
  if(!t)return;
  addMsg("user",t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"));
  input.value="";
  const load=document.createElement("div");
  load.className="loading";
  load.innerHTML="<span>...</span> 思考中";
  msgs.appendChild(load);
  msgs.scrollTop=msgs.scrollHeight;
  try{
    const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t})});
    load.remove();
    if(!r.ok){addMsg("assistant","错误: "+(await r.text()));return}
    const j=await r.json();
    addMsg("assistant",j.reply.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/```(\w*)\n([\\s\\S]*?)```/g,(_,lang,code)=>'<pre><code>'+code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+'</code></pre>'));
  }catch(e){load.remove();addMsg("assistant","连接失败: "+e.message)}
}
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
</script>
</body>
</html>`;

http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const { message } = JSON.parse(body);
        // 调用 Claude CLI（非交互模式）
        const claude = spawn("claude", ["-p", message], {
          env: { ...process.env, HOME: process.env.HOME },
          cwd: "/opt/guoxue-platform",
          timeout: 300000,
        });
        let output = "";
        claude.stdout.on("data", d => output += d);
        claude.stderr.on("data", d => output += d);
        claude.on("close", () => {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ reply: output || "(无输出)" }));
        });
        claude.on("error", () => {
          res.writeHead(500);
          res.end(JSON.stringify({ reply: "Claude CLI 执行失败，请检查服务状态" }));
        });
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ reply: "请求解析失败: " + e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
}).listen(PORT, () => {
  console.log(`Claude Bridge running on http://localhost:${PORT}`);
});
BRIDGE_EOF

# 8. 配置 Nginx 反向代理
cat > /etc/nginx/sites-available/claude-bridge << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/claude-bridge /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 9. 启动服务
pm2 start /opt/claude-bridge/server.mjs --name claude-bridge
pm2 save
pm2 startup

echo ""
echo "=== 部署完成 ==="
echo "访问 http://$(hostname -I | awk '{print $1}'):3456 即可开始远程对话"
echo "或通过 Nginx: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "如需 HTTPS: certbot --nginx"
