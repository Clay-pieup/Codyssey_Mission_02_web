/* ==========================================================
   Instay — 촬영 가이드 생성 화면
   U5 단계: 아직 AI를 부르지 않는다. 가짜 데이터로 화면 흐름만 완성한다.
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

/* ---------- 1. 가짜 데이터 만들기 ----------
   ★ 중요: U7에서 진짜 AI가 돌려줄 JSON과 "똑같은 모양"으로 만든다.
   모양이 같아야 U7에서 이 함수만 통째로 갈아끼우면 되고,
   아래 renderGuide()는 한 줄도 고치지 않아도 된다. */
function makeMockGuide(stayType, features, tone) {
  return {
    scenes: [
      "도착 컷 — " + stayType + " 입구를 정면 고정 샷으로, 3초",
      "공간 전경 — 거실에서 창밖이 보이도록 와이드로 천천히 팬, 4초",
      "특징 클로즈업 — \"" + features + "\" 중 가장 눈에 띄는 것 하나, 3초",
      "사용 장면 — 실제로 쓰는 손 동작을 가까이서, 4초",
      "마무리 — 해질 무렵 전경으로 빠지며 " + tone + " 톤 자막, 3초"
    ],
    caption:
      "여기서는 짐 풀자마자 아무것도 안 해도 됐다. " +
      stayType + "인데 " + features + ". 다음엔 이틀 잡고 올 것.",
    hashtags: ["#" + stayType, "#숙소추천", "#감성숙소", "#국내여행", "#1박2일"]
  };
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

/* ---------- 4. 버튼을 눌렀을 때 ---------- */
form.addEventListener("submit", function (event) {
  // form은 원래 눌리면 페이지를 새로고침한다. 그 기본 동작을 막는다.
  event.preventDefault();

  const stayType = stayTypeEl.value;
  const features = featuresEl.value.trim();
  const tone     = toneEl.value;

  showLoading();

  // 진짜 AI 호출은 몇 초가 걸린다. 지금은 가짜 데이터라 즉시 끝나므로
  // "만드는 중" 상태가 보이지 않는다. 일부러 1.2초 기다려 흐름을 확인한다.
  // U7에서 이 setTimeout 자리가 실제 fetch 호출로 바뀐다.
  setTimeout(function () {
    const data = makeMockGuide(stayType, features, tone);
    renderGuide(data);
    endLoading();
  }, 1200);
});
