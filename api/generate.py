"""
Instay — 촬영 가이드 생성 API

숙소 정보를 받아 Gemini에게 촬영 가이드를 만들게 하고,
그 결과를 화면이 쓸 수 있는 JSON 형태로 돌려준다.

Vercel은 api/ 폴더의 .py 파일을 각각 하나의 서버 함수로 만든다.
이 파일은 api/generate.py 이므로 주소는 /api/generate 다.
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import requests

# ---------- 설정 ----------
MODEL = "gemini-3.5-flash-lite"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    + MODEL
    + ":generateContent"
)
# (연결까지 5초, 응답까지 20초) — 둘을 나눠 잡으면 어디서 막혔는지 구분된다
TIMEOUT = (5, 20)


def build_prompt(stay_type, features, tone):
    """AI에게 보낼 지시문을 만든다. 출력 형식을 여기서 못 박는다."""
    return f"""당신은 숙소 협찬 숏폼 영상을 기획하는 콘텐츠 디렉터입니다.
아래 숙소 정보를 보고 촬영 가이드를 만드세요.

숙소 유형: {stay_type}
숙소 특징: {features}
영상 톤: {tone}

규칙:
- scenes: 촬영할 장면 5개. 각 항목은 "무엇을 / 어떤 앵글로 / 몇 초" 가 드러나는 한 문장.
- caption: 숏폼에 올릴 캡션 초안 1개. 2~3문장. 광고 티가 나지 않는 자연스러운 말투.
- hashtags: 해시태그 5개. 각 항목은 # 으로 시작.
- 모든 내용은 한국어로 작성.
- 아래 JSON 형식만 출력하고 다른 말은 덧붙이지 마세요.

{{"scenes": ["", "", "", "", ""], "caption": "", "hashtags": ["", "", "", "", ""]}}
"""


def call_gemini(prompt, api_key):
    """Gemini에 요청을 보내고, 응답 안의 JSON을 꺼내 파이썬 사전으로 돌려준다."""
    response = requests.post(
        GEMINI_URL,
        headers={
            # 키를 주소(?key=)가 아니라 헤더에 담는다.
            # 주소에 넣으면 서버 접속 기록에 키가 그대로 남는다.
            "x-goog-api-key": api_key,
            "Content-Type": "application/json",
        },
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            # "JSON만 뱉어라"는 지시. 프롬프트로만 부탁하는 것보다 확실하다.
            "generationConfig": {"response_mime_type": "application/json"},
        },
        timeout=TIMEOUT,
    )
    # 4xx / 5xx면 여기서 예외를 일으킨다.
    # 이 줄이 없으면 오류 응답 본문을 파싱하다 엉뚱한 곳에서 터진다.
    response.raise_for_status()

    # Gemini의 응답은 여러 겹으로 싸여 있다. 실제 답은 이 경로에 있다.
    payload = response.json()
    text = payload["candidates"][0]["content"]["parts"][0]["text"]

    # 그 답은 아직 '글자'다. 데이터로 되돌린다.
    return json.loads(text)


def validate_guide(guide):
    """AI가 약속한 모양대로 줬는지 확인한다. 아니면 ValueError."""
    if not isinstance(guide, dict):
        raise ValueError("응답이 객체 형태가 아닙니다.")

    scenes = guide.get("scenes")
    caption = guide.get("caption")
    hashtags = guide.get("hashtags")

    if not isinstance(scenes, list) or len(scenes) == 0:
        raise ValueError("scenes 항목이 비어 있습니다.")
    if not isinstance(caption, str) or not caption.strip():
        raise ValueError("caption 항목이 비어 있습니다.")
    if not isinstance(hashtags, list) or len(hashtags) == 0:
        raise ValueError("hashtags 항목이 비어 있습니다.")

    # 화면이 글자만 다루도록 모두 문자열로 맞춘다
    return {
        "scenes": [str(s) for s in scenes],
        "caption": caption.strip(),
        "hashtags": [str(t) for t in hashtags],
    }


class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        # ---------- 1. 요청 본문 읽기 ----------
        length = int(self.headers.get("content-length", 0))
        raw_body = self.rfile.read(length) if length > 0 else b""

        try:
            data = json.loads(raw_body)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "요청 본문이 올바른 JSON이 아닙니다."})
            return

        stay_type = str(data.get("stayType", "")).strip()
        features = str(data.get("features", "")).strip()
        tone = str(data.get("tone", "")).strip()

        # ---------- 2. 필수값 확인 ----------
        if not features:
            self._send_json(400, {"error": "숙소 특징을 한 줄 이상 입력해 주세요."})
            return

        # ---------- 3. 키 확인 ----------
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            # 키가 없으면 호출해 봐야 무조건 실패한다. 미리 멈춘다.
            self._send_json(500, {"error": "서버에 API 키가 설정되어 있지 않습니다."})
            return

        # ---------- 4. AI 호출 ----------
        try:
            guide = call_gemini(build_prompt(stay_type, features, tone), api_key)
            guide = validate_guide(guide)

        except requests.Timeout:
            self._send_json(504, {"error": "AI 응답이 너무 늦습니다. 잠시 후 다시 시도해 주세요."})
            return

        except requests.HTTPError as error:
            status = error.response.status_code if error.response is not None else 502
            if status == 429:
                message = "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
            elif status in (401, 403):
                message = "AI 서비스 인증에 실패했습니다."
            else:
                message = "AI 서비스에 문제가 있습니다. 잠시 후 다시 시도해 주세요."
            self._send_json(502, {"error": message})
            return

        except (json.JSONDecodeError, KeyError, IndexError, ValueError):
            # AI가 JSON이 아닌 것을 주거나, 약속한 모양을 어겼을 때
            self._send_json(502, {"error": "AI 응답을 이해하지 못했습니다. 다시 시도해 주세요."})
            return

        except requests.RequestException:
            self._send_json(502, {"error": "AI 서비스에 연결하지 못했습니다."})
            return

        self._send_json(200, guide)

    def _send_json(self, status_code, payload):
        """파이썬 사전을 JSON 글자로 바꿔 브라우저에게 돌려준다."""
        # ensure_ascii=False 를 빼면 한글이 \uXXXX 로 바뀌어 나간다.
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
