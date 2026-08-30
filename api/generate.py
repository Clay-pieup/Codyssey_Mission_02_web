"""
Instay — 촬영 가이드 생성 API

U6 단계: 아직 AI를 부르지 않는다.
화면이 보낸 값을 그대로 되돌려주기만 한다(메아리).
목적은 "브라우저 → 서버 → 브라우저" 통로가 뚫렸는지만 확인하는 것.

Vercel은 api/ 폴더 안의 .py 파일을 각각 하나의 서버 함수로 만든다.
이 파일은 api/generate.py 이므로 주소는 /api/generate 가 된다.
"""

from http.server import BaseHTTPRequestHandler
import json


# ★ 클래스 이름은 반드시 handler(소문자)여야 한다.
#    Vercel이 이 이름을 찾아서 실행하기로 약속되어 있다.
class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        """POST 방식으로 요청이 왔을 때 실행된다."""

        # ---------- 1. 요청 본문 읽기 ----------
        # 브라우저가 보낸 데이터는 '본문(body)'에 담겨 온다.
        # 몇 글자인지 먼저 확인해야 그만큼 읽을 수 있다.
        length = int(self.headers.get("content-length", 0))
        raw_body = self.rfile.read(length) if length > 0 else b""

        # ---------- 2. 글자를 데이터로 바꾸기 ----------
        # 네트워크로는 글자만 오간다. JSON 글자를 파이썬 사전으로 되돌린다.
        try:
            data = json.loads(raw_body)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "요청 본문이 올바른 JSON이 아닙니다."})
            return

        stay_type = str(data.get("stayType", "")).strip()
        features = str(data.get("features", "")).strip()
        tone = str(data.get("tone", "")).strip()

        # ---------- 3. 필수값 확인 ----------
        # 화면에서도 막지만, 서버에서도 한 번 더 막는다. 이유는 README 참고.
        if not features:
            self._send_json(400, {"error": "숙소 특징은 필수입니다."})
            return

        # ---------- 4. 응답 만들기 (U7에서 이 부분이 AI 호출로 바뀐다) ----------
        # ★ 모양은 U5의 가짜 데이터와 완전히 동일하다.
        #    그래야 화면 쪽 renderGuide()를 한 줄도 고치지 않아도 된다.
        result = {
            "scenes": [
                "[서버 응답] 이 문장은 api/generate.py 가 만들어 보낸 것입니다.",
                "[서버가 받은 값] 숙소 유형: " + stay_type,
                "[서버가 받은 값] 숙소 특징: " + features,
                "[서버가 받은 값] 영상 톤: " + tone,
                "[안내] U7에서 이 자리가 실제 AI 응답으로 바뀝니다.",
            ],
            "caption": "아직 AI를 부르지 않았습니다. 지금은 서버가 받은 값을 그대로 돌려주는 중입니다.",
            "hashtags": ["#통로확인", "#U6", "#" + (stay_type or "미입력")],
        }

        self._send_json(200, result)

    def _send_json(self, status_code, payload):
        """파이썬 사전을 JSON 글자로 바꿔 브라우저에게 돌려준다."""
        # ensure_ascii=False 를 빼면 한글이 \uXXXX 형태로 바뀌어 나간다.
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
