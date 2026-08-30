/* ==========================================================
   Instay — 촬영 가이드 생성 화면
   U8 단계: 실패하는 세 경우를 각각 다르게 처리한다.
            ① 빈 입력  — 서버에 보내기 전에 브라우저에서 막는다
            ② API 오류 — 서버가 알려준 이유를 그대로 보여준다
            ③ 지연     — 20초가 넘으면 브라우저가 스스로 요청을 취소한다
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
const featuresError = document.getElementById("features-error");

/* 화면 쪽 제한 시간. 실제 응답이 약 3초이므로 그 6배 이상으로 잡았다.
   너무 짧으면 조금만 느려도 실패로 처리되고, 너무 길면 사용자가 하염없이 기다린다. */
const TIMEOUT_MS = 20000;

/* ---------- 1. 서버에게 물어보기 ----------
   fetch()는 "이 주소로 요청을 보내라"는 명령이다.
   답이 즉시 오지 않으므로 async / await 로 기다린다. (README 해설 참고) */
async function fetchGuide(stayType, features, tone) {
  // AbortController = "요청을 도중에 취소하는 스위치".
  // fetch에는 스스로 시간을 재는 기능이 없어서, 이 스위치와 타이머를 붙여 만든다.
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();          // 20초가 지나면 스위치를 내린다 → fetch가 즉시 실패
  }, TIMEOUT_MS);

  try {
    const response = await fetch("/api/generate", {
      method: "POST",                                   // 본문에 데이터를 담아 보내는 방식
      headers: { "Content-Type": "application/json" },  // "본문은 JSON입니다"라고 알림
      body: JSON.stringify({ stayType, features, tone }),// 데이터를 JSON 글자로 바꿔 담음
      signal: controller.signal                          // 이 요청을 스위치에 연결
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

  } finally {
    // 성공하든 실패하든 타이머를 반드시 끈다.
    // 안 끄면 20초 뒤에 이미 끝난 요청을 취소하려 드는 타이머가 남는다.
    clearTimeout(timer);
  }
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

/* ---------- 4. 오류 표시 ---------- */

/* (1) 입력칸 바로 아래에 뜨는 안내 — 빈 입력용.
       결과 영역이 아니라 문제가 생긴 자리 옆에 띄워야 어디를 고칠지 바로 안다. */
function showFieldError(message) {
  featuresError.textContent = message;
  featuresError.hidden = false;
  featuresEl.classList.add("has-error");
}

function clearFieldError() {
  featuresError.hidden = true;
  featuresEl.classList.remove("has-error");
}

/* (2) 결과 영역에 뜨는 안내 — 서버·네트워크 문제용 */
function showError(message) {
  resultArea.innerHTML = "";
  const box = document.createElement("p");
  box.className = "error-box";
  box.textContent = message;
  resultArea.appendChild(box);
}

/* 사용자가 다시 입력하기 시작하면 안내를 지운다.
   고치는 중인데 빨간 글씨가 계속 떠 있으면 혼란스럽다. */
featuresEl.addEventListener("input", clearFieldError);

/* Ctrl + Enter (맥은 Cmd + Enter)로도 제출되게 한다.
   textarea에서 그냥 Enter는 줄바꿈이어야 하므로 조합키를 쓴다. */
featuresEl.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    // form.submit() 이 아니라 requestSubmit() 이어야 한다.
    // submit() 은 submit 이벤트를 건너뛰어서 preventDefault가 실행되지 않고
    // 페이지가 새로고침되어 결과가 사라진다.
    form.requestSubmit();
  }
});

/* ---------- 5. 버튼을 눌렀을 때 ---------- */
form.addEventListener("submit", async function (event) {
  // form의 기본 동작(페이지 새로고침)을 막는다.
  event.preventDefault();

  const stayType = stayTypeEl.value;
  // .trim() — 앞뒤 공백을 떼어낸다. 스페이스만 잔뜩 넣은 것도 빈 입력으로 본다.
  const features = featuresEl.value.trim();
  const tone     = toneEl.value;

  /* ① 빈 입력: 서버에 보내기 전에 여기서 막는다.
       어차피 실패할 요청을 보내면 AI API 호출 횟수만 소모된다. */
  if (features === "") {
    showFieldError("숙소 특징을 한 줄 이상 입력해 주세요.");
    featuresEl.focus();     // 고쳐야 할 칸으로 커서를 옮겨 준다
    return;                 // 여기서 끝. fetch를 부르지 않는다.
  }
  clearFieldError();

  showLoading();

  // try / catch / finally
  //  try     : 실패할 수 있는 일을 여기에 둔다
  //  catch   : 실패하면 여기로 넘어온다
  //  finally : 성공하든 실패하든 반드시 실행된다
  try {
    const data = await fetchGuide(stayType, features, tone);
    renderGuide(data);
  } catch (error) {
    /* ③ 지연: 20초가 지나 스위치가 내려가면 fetch는 AbortError 라는 이름으로 실패한다.
         ② API 오류: 그 외에는 서버가 알려준 이유를 그대로 보여준다. */
    if (error.name === "AbortError") {
      showError("응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.");
    } else {
      showError(error.message);
    }
  } finally {
    // ★ 버튼 잠금 해제가 finally에 있어야 하는 이유:
    //    try 안에 두면 실패했을 때 실행되지 않아 버튼이 영영 잠긴 채로 남는다.
    endLoading();
  }
});
