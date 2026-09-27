#!/usr/bin/env python3
"""LinuxForge V49 edge terminal gateway.

Browser-facing WebSocket gateway. It accepts short-lived HMAC tickets minted by
LinuxForge's authenticated application server and proxies only PTY operations
to a local/runtime HTTP service. No runtime credential is ever sent to a
browser.
"""
from __future__ import annotations
import base64, hashlib, hmac, json, os, select, socket, struct, threading, time, urllib.parse, urllib.request

BIND=os.environ.get("FORGE_TERMINAL_GATEWAY_BIND","127.0.0.1")
PORT=int(os.environ.get("FORGE_TERMINAL_GATEWAY_PORT","18081"))
ALLOWED_ORIGIN=os.environ.get("FORGE_TERMINAL_ALLOWED_ORIGIN","")
RUNTIME=os.environ.get("FORGE_RUNTIME_HTTP_ENDPOINT","http://127.0.0.1:18080").rstrip("/")
RUNTIME_TOKEN=os.environ.get("FORGE_RUNTIME_SERVICE_TOKEN","")
TICKET_SECRET=os.environ.get("FORGE_TERMINAL_TICKET_SECRET","").encode()
MAX_OUTPUT_BYTES=int(os.environ.get("FORGE_TERMINAL_MAX_OUTPUT_BYTES","64000"))

class GatewayError(Exception): pass

def b64u(b:bytes)->str: return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
def ub64(s:str)->bytes: return base64.urlsafe_b64decode(s + "="*((4-len(s)%4)%4))

def verify_ticket(token:str)->dict:
    if not TICKET_SECRET: raise GatewayError("Terminal ticket secret is not configured")
    parts=token.split(".")
    if len(parts)!=2: raise GatewayError("Invalid terminal ticket")
    payload, sig=parts
    expected=b64u(hmac.new(TICKET_SECRET,payload.encode(),hashlib.sha256).digest())
    if not hmac.compare_digest(sig,expected): raise GatewayError("Invalid terminal ticket signature")
    data=json.loads(ub64(payload))
    if int(data.get("exp",0)) < int(time.time()): raise GatewayError("Terminal ticket expired")
    for key in ("userId","labId","environmentId","sessionId"):
        if not isinstance(data.get(key),str) or not data[key]: raise GatewayError("Invalid terminal ticket claims")
    for key in ("bindingGeneration", "runtimeLifecycleGeneration"):
        if not isinstance(data.get(key), int) or data[key] < 1: raise GatewayError("Invalid terminal ticket generation claims")
    return data

def runtime_call(path:str, body:dict)->dict:
    req=urllib.request.Request(RUNTIME+path, data=json.dumps(body).encode(), method="POST", headers={"content-type":"application/json","authorization":f"Bearer {RUNTIME_TOKEN}"})
    with urllib.request.urlopen(req, timeout=10) as r: payload=json.loads(r.read())
    if not payload.get("ok"): raise GatewayError(payload.get("error",{}).get("message","Runtime request failed"))
    return payload["value"]

def ws_accept(key:str)->str: return base64.b64encode(hashlib.sha1((key+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()

def recv_frame(sock:socket.socket):
    head=sock.recv(2)
    if len(head)<2: return None,None
    b1,b2=head; opcode=b1&15; masked=bool(b2&128); n=b2&127
    if n==126: n=struct.unpack("!H",sock.recv(2))[0]
    elif n==127: n=struct.unpack("!Q",sock.recv(8))[0]
    mask=sock.recv(4) if masked else b""
    data=b""
    while len(data)<n:
        chunk=sock.recv(min(65536,n-len(data)))
        if not chunk: return None,None
        data+=chunk
    if masked: data=bytes(c ^ mask[i%4] for i,c in enumerate(data))
    return opcode,data

def send_frame(sock:socket.socket,data:bytes,opcode=1):
    n=len(data); head=bytes([0x80|opcode])
    if n<126: head+=bytes([n])
    elif n<65536: head+=bytes([126])+struct.pack("!H",n)
    else: head+=bytes([127])+struct.pack("!Q",n)
    sock.sendall(head+data)

def client(sock:socket.socket, addr):
    try:
        request=b""
        while b"\r\n\r\n" not in request and len(request)<16384: request+=sock.recv(4096)
        text=request.decode(errors="replace"); lines=text.split("\r\n")
        headers={};
        for line in lines[1:]:
            if ":" in line:
                k,v=line.split(":",1); headers[k.lower().strip()]=v.strip()
        if headers.get("upgrade","").lower()!="websocket": raise GatewayError("WebSocket upgrade required")
        if ALLOWED_ORIGIN and headers.get("origin", "") != ALLOWED_ORIGIN: raise GatewayError("WebSocket origin denied")
        query=urllib.parse.urlparse(lines[0].split()[1]).query; params=urllib.parse.parse_qs(query)
        ticket=params.get("ticket",[""])[0]; claims=verify_ticket(ticket)
        sock.sendall(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: "+ws_accept(headers["sec-websocket-key"])+"\r\n\r\n").encode())
        opened=runtime_call(f"/v1/environments/{urllib.parse.quote(claims['environmentId'],safe='')}/pty-open",{"sessionId":claims["sessionId"],"shell":claims.get("shell","bash"),"cwd":claims.get("cwd","/home/linuxforge"),"cols":120,"rows":30,"runtimeLifecycleGeneration":claims.get("runtimeLifecycleGeneration")})
        send_frame(sock,json.dumps({"type":"ready","sessionId":opened["sessionId"],"cwd":opened["cwd"]}).encode())
        session=opened["sessionId"]; stop=False; sock.setblocking(False); output_bytes=0
        while not stop:
            readable, _, _ = select.select([sock], [], [], 0.08)
            if readable:
                sock.setblocking(True)
                opcode, data = recv_frame(sock)
                sock.setblocking(False)
                if opcode is None or opcode == 8:
                    break
                if opcode == 9:
                    send_frame(sock, data, 10)
                    continue
                if opcode != 1:
                    continue
                msg = json.loads(data)
                typ = msg.get("type")
                base = f"/v1/environments/{urllib.parse.quote(claims['environmentId'], safe='')}"
                if typ == "input":
                    runtime_call(base + "/pty-input", {"sessionId": session, "data": str(msg.get("data", ""))})
                elif typ == "resize":
                    runtime_call(base + "/pty-resize", {"sessionId": session, "cols": msg.get("cols", 120), "rows": msg.get("rows", 30)})
                elif typ == "signal":
                    runtime_call(base + "/pty-signal", {"sessionId": session, "signal": msg.get("signal", "")})
                elif typ == "close":
                    stop = True
            out = runtime_call(f"/v1/environments/{urllib.parse.quote(claims['environmentId'], safe='')}/pty-read", {"sessionId": session})
            if out.get("data"):
                chunk = str(out["data"])
                remaining = MAX_OUTPUT_BYTES - output_bytes
                if remaining <= 0:
                    send_frame(sock, json.dumps({"type": "error", "message": "Terminal output limit reached."}).encode())
                    stop = True
                else:
                    encoded = chunk.encode()
                    if len(encoded) > remaining:
                        chunk = encoded[:remaining].decode(errors="ignore")
                        stop = True
                    output_bytes += len(chunk.encode())
                    send_frame(sock, json.dumps({"type": "output", "data": chunk}).encode())
            if out.get("exited"):
                send_frame(sock, json.dumps({"type": "exit"}).encode())
                break
        try: runtime_call(f"/v1/environments/{urllib.parse.quote(claims['environmentId'],safe='')}/pty-close",{"sessionId":session})
        except Exception: pass
    except Exception as e:
        try: send_frame(sock,json.dumps({"type":"error","message":str(e)}).encode())
        except Exception: pass
    finally: sock.close()

def main():
    if not RUNTIME_TOKEN: raise SystemExit("FORGE_RUNTIME_SERVICE_TOKEN is required")
    if not TICKET_SECRET: raise SystemExit("FORGE_TERMINAL_TICKET_SECRET is required")
    srv=socket.socket(); srv.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1); srv.bind((BIND,PORT)); srv.listen(128)
    print(f"LinuxForge V49 terminal gateway listening on {BIND}:{PORT}")
    while True:
        sock,addr=srv.accept(); threading.Thread(target=client,args=(sock,addr),daemon=True).start()
if __name__=="__main__": main()
