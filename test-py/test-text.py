import os
import sys
import requests


def _parse_text(data):
    try:
        choices = data.get("choices")
        if choices:
            msg = choices[0].get("message") or {}
            return msg.get("content") or ""
        candidates = data.get("candidates")
        if candidates:
            content = candidates[0].get("content")
            if isinstance(content, list) and content and isinstance(content[0], dict):
                return content[0].get("text") or ""
            if isinstance(content, dict):
                parts = content.get("parts")
                if isinstance(parts, list) and parts:
                    return parts[0].get("text") or ""
        output_text = data.get("output_text")
        if output_text:
            return output_text
    except Exception:
        pass
    return ""


def chat_completions(model, messages, thinking_budget=None, max_tokens=None, thinking=None, stream=False, api_url=None, api_key=None):
    url = "https://modelservice.jdcloud.com/v1/chat/completions"
    key = "YOUR_API_KEY_HERE"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "stream": bool(stream),
    }
    if thinking_budget is not None:
        payload["thinking_budget"] = thinking_budget
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    if thinking is not None:
        payload["thinking"] = bool(thinking)
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return _parse_text(data)


def main():
    prompt = "世界最长的河流是什么？"
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
    # model = "Gemini-2.5-pro"
    model = "Kimi-K2-0905"
    messages = [{"role": "user", "content": prompt}]
    try:
        text = chat_completions(model, messages)
        print(text)
    except requests.exceptions.RequestException as e:
        r = getattr(e, "response", None)
        txt = r.text if r is not None else ""
        sys.stderr.write(f"HTTP错误: {e} {txt}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
