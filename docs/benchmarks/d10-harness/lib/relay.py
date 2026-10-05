# -*- coding: utf-8 -*-
"""d10-harness · relay.py — OpenAI-compatible 中转站调用 + 记账。

- 配置来自 harness config.json + 仓库根 .env（D10_API_BASE_URL / D10_API_KEY / D10_MODEL / D10_API_FORMAT）；
- 中转站不返回 cost 字段 ⇒ 成本 = usage × 配置单价（fail-closed：单价取保守偏高值，宁停勿超）；
- provider-default sampling：不传 temperature/top_p/top_k；
- 每次调用返回 {content, usage, cost, elapsed}；cost 恒由 usage 计算，绝无 NaN/None。
"""
import io, json, os, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))


def build_request_body(model, messages, max_tokens):
    """请求体 single source of truth：relay.chat 实际发送的 body（含 stream:false）。"""
    return {"model": model, "messages": messages, "max_tokens": max_tokens, "stream": False}


def serialize_request_body(body):
    """请求体序列化 single source of truth：**必须与 relay.chat 实际发送完全一致**
    （json.dumps 默认 ensure_ascii=True——中文/emoji 会变成反斜杠-u 转义，真实字节更大；
    UB 计算与预调用预留都要以这里的字节数为准，Review P1）。"""
    return json.dumps(body)


def request_body_bytes(model, messages, max_tokens):
    """实际待发送 HTTP body 的 UTF-8 字节数（UB 与 relay.chat 共用同一 serializer）。"""
    return len(serialize_request_body(build_request_body(model, messages, max_tokens)).encode("utf-8"))


def load_env():
    cfg = {}
    env_path = os.path.join(REPO_ROOT, ".env")
    if os.path.exists(env_path):
        with io.open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                cfg[k.strip()] = v.strip()
    return cfg


class Relay:
    def __init__(self, config):
        self.config = config
        env = load_env()
        api = config["api"]
        self.base = env.get(api["baseUrlEnv"], "").rstrip("/")
        self.key = env.get(api["apiKeyEnv"], "")
        self.model = env.get(api["modelEnv"], "")
        self.fmt = env.get(api["formatEnv"], "")
        self.max_output = int(api.get("maxOutputTokens", 8192))
        p = config["pricesPerMToken"]
        self.price_in = float(p["input"])
        self.price_out = float(p["output"])
        self.price_cached = float(p["cachedInput"])

    @property
    def ready(self):
        return bool(self.base and self.key and self.model)

    def _cost(self, usage):
        pt = int(usage.get("prompt_tokens", 0) or 0)
        ct = int(usage.get("completion_tokens", 0) or 0)
        cached = 0
        details = usage.get("prompt_tokens_details") or {}
        if isinstance(details, dict):
            cached = int(details.get("cached_tokens", 0) or 0)
        uncached = max(pt - cached, 0)
        cost = (uncached * self.price_in + cached * self.price_cached + ct * self.price_out) / 1_000_000.0
        return round(cost, 8), {"prompt": pt, "completion": ct, "cached": cached, "total": pt + ct}

    def chat(self, messages, max_tokens=None, timeout=300):
        if not self.ready:
            raise RuntimeError("relay not configured (missing .env values)")
        url = self.base + self.config["api"]["endpoint"]
        body = build_request_body(self.model, messages, max_tokens or self.max_output)
        req = urllib.request.Request(
            url,
            data=serialize_request_body(body).encode("utf-8"),
            headers={"Authorization": "Bearer " + self.key, "Content-Type": "application/json"},
            method="POST",
        )
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8", "replace")
            data = json.loads(raw)
            content = ""
            try:
                content = data["choices"][0]["message"]["content"] or ""
            except Exception:
                pass
            usage = data.get("usage") or {}
            cost, usage_n = self._cost(usage)
            return {
                "content": content,
                "usage": usage_n,
                "cost": cost,
                "elapsed": round(time.time() - t0, 3),
                "raw_usage": usage,
            }
        except urllib.error.HTTPError as e:
            raise RuntimeError("relay HTTP {0}: {1}".format(e.code, e.read().decode("utf-8", "replace")[:300]))
        except Exception as e:
            raise RuntimeError("relay error: {0}".format(str(e)[:300]))
