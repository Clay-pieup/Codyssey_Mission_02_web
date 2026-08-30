/* ==========================================================
   Instay — 촬영 가이드 생성 화면
   U7 단계: 서버(api/generate.py)가 Gemini를 호출해 진짜 촬영 가이드를 만들어 준다.
            화면 쪽 코드는 U5에서 만든 renderGuide()를 그대로 쓴다.
   ★ 이 파일은 file:/// 로 열면 동작하지 않는다. 서버가 없기 때문이다.
     반드시 배포 주소에서 확인할 것.
   ========================================================== */

/* ---------- 0. 화면 요소를 미리 찾아둔다 ----------
   HTML에서 id로 요소를 하나 찾아와 이름을 붙여 두는 작업.
   매번 찾지 않고 한 번만 찾아 두면 아래 코드가 짧아진다. */
const form       = document.getElementById("guide-form");
const stayTypeEl = document.getElementById("stay-type");
const featuresEl = document.getElementById("features");
const toneEl     = document.getElementById("tone");
const submitBtn  = document.getElementById("submit-btn");
const resultArea = document.getElementById("result-area");

/* ---------- 1. 서버에게 물어보기 ----------
   fetch()는 "이 주소로 요청을 보내라"는 명령이다.
   답이 즉시 오지 않으므로 async / await 로 기다린다. (README 해설 참고) */
async function fetchGuide(stayType, features, tone) {
  const response = await fetch("/api/generate", {
    method: "POST",                                   // 본문에 데이터를 담아 보내는 방식
    headers: { "Content-Type": "application/json" },  // "본문은 JSON입니다"라고 알림
    body: JSON.stringify({ stayType, features, tone })// 데이터를 JSON 글자로 바꿔 담음
  });

  // 서버가 4xx / 5xx로 답하면 여기서 멈춰 세운다.
  // 이 줄이 없으면 오류 응답을 정상 데이터로 착각하고 화면을 그리려다 엉뚱하게 터진다.
  if (!response.ok) {
    // 서버는 {"error": "..."} 형태로 이유를 알려준다. 그 문구를 그대로 쓴다.
    let serverMessage = "";
    try {
      const errorBody = await response.json();
      serverMessage = errorBody.error || "";
    } catch (parseError) {
      // 서버가 아니라 플랫폼이 낸 오류라면 본문이 JSON이 아닐 수 있다. 그건 무시한다.
    }
    throw new Error(serverMessage || ("서버 응답 오류 " + response.status));
  }

  return await response.json();   // 돌아온 JSON 글자를 다시 데이터로
}

/* ---------- 2. 결과를 화면에 그리는 함수 ----------
   데이터를 받아서 화면을 만드는 일만 한다.
   데이터가 어디서 왔는지(가짜인지 AI인지)는 이 함수가 알 필요가 없다. */
function renderGuide(data) {
  resultArea.innerHTML = "";   // 이전 결과를 비운다

  // (1) 촬영 장면 5컷
  const scenesTitle = document.createElement("h2");
  scenesTitle.textContent = "촬영 장면 5컷";
  resultArea.appendChild(scenesTitle);

  const list = document.createElement("ol");
  list.className = "scene-list";
  data.scenes.forEach(function (scene) {
    const item = document.createElement("li");
    item.textContent = scene;   // ★ textContent — 이유는 README 참고
    list.appendChild(item);
  });
  resultArea.appendChild(list);

  // (2) 캡션 초안
  const captionTitle = document.createElement("h2");
  captionTitle.textContent = "캡션 초안";
  resultArea.appendChild(captionTitle);

  const caption = document.createElement("p");
  caption.className = "caption-box";
  caption.textContent = data.caption;
  resultArea.appendChild(caption);

  // (3) 해시태그
  const tagTitle = document.createElement("h2");
  tagTitle.textContent = "해시태그";
  resultArea.appendChild(tagTitle);

  const tagWrap = document.createElement("div");
  tagWrap.className = "tag-list";
  data.hashtags.forEach(function (tag) {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.textContent = tag;
    tagWrap.appendChild(chip);
  });
  resultArea.appendChild(tagWrap);
}

/* ---------- 3. "만드는 중" 상태 ----------
   버튼을 잠그는 이유: 사용자가 조급해 여러 번 누르면
   U7 이후에는 그 횟수만큼 AI API가 호출되고 요금이 나간다. */
function showLoading() {
  submitBtn.disabled = true;
  submitBtn.textContent = "만드는 중...";
  resultArea.innerHTML = "";
  const msg = document.createElement("p");
  msg.className = "placeholder";
  msg.textContent = "가이드를 만들고 있습니다...";
  resultArea.appendChild(msg);
}

function endLoading() {
  submitBtn.disabled = false;
  submitBtn.textContent = "가이드 만들기";
}

/* ---------- 4. 임시 오류 표시 (U8에서 제대로 만든다) ---------- */
function showError(message) {
  resultArea.innerHTML = "";
  const msg = document.createElement("p");
  msg.className = "placeholder";
  msg.textContent = message;
  resultArea.appendChild(msg);
}

/* ---------- 5. 버튼을 눌렀을 때 ---------- */
form.addEventListener("submit", async function (event) {
  // form의 기본 동작(페이지 새로고침)을 막는다.
  event.preventDefault();

  const stayType = stayTypeEl.value;
  const features = featuresEl.value.trim();
  const tone     = toneEl.value;

  showLoading();

  // try / catch / finally
  //  try     : 실패할 수 있는 일을 여기에 둔다
  //  catch   : 실패하면 여기로 넘어온다
  //  finally : 성공하든 실패하든 반드시 실행된다
  try {
    const data = await fetchGuide(stayType, features, tone);
    renderGuide(data);
  } catch (error) {
    showError("가이드를 만들지 못했습니다. (" + error.message + ")");
  } finally {
    // ★ 버튼 잠금 해제가 finally에 있어야 하는 이유:
    //    try 안에 두면 실패했을 때 실행되지 않아 버튼이 영영 잠긴 채로 남는다.
    endLoading();
  }
});
