/* ==========================================================
   Instay — 화면 밝기(라이트/다크) 전환

   이 파일은 <head> 에서 불러온다. 이유는 아래 1번 주석 참고.
   두 페이지(index.html, guide.html)가 함께 쓴다.
   ========================================================== */

const THEME_KEY = "instay-theme";   // 브라우저에 저장할 때 쓸 이름표

/* ---------- 1. 저장된 선택을 화면이 그려지기 전에 적용한다 ----------
   ★ 이 부분이 <head> 에 있어야 하는 이유:
     화면이 다 그려진 뒤에 색을 바꾸면, 사용자는 "밝은 화면이 잠깐 번쩍였다가
     어두워지는" 것을 보게 된다. 눈에 띄고 고장처럼 보인다.
     <head> 의 스크립트는 본문이 그려지기 전에 실행되므로 번쩍임이 없다. */
(function applySavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") {
      // <html> 태그에 data-theme="dark" 같은 표시를 붙인다. CSS가 이걸 보고 색을 바꾼다.
      document.documentElement.dataset.theme = saved;
    }
  } catch (error) {
    // 브라우저가 저장소를 막아둔 경우(시크릿 모드 등)에도 페이지는 정상 동작해야 한다.
    // 저장만 안 될 뿐이므로 아무것도 하지 않고 넘어간다.
  }
})();

/* ---------- 2. 지금 화면이 어느 쪽인지 알아낸다 ---------- */
function getCurrentTheme() {
  const chosen = document.documentElement.dataset.theme;
  if (chosen) return chosen;          // 사용자가 직접 고른 적이 있으면 그 값

  // 고른 적이 없으면 운영체제 설정을 따르고 있는 상태다.
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/* ---------- 3. 버튼 글자를 지금 상태에 맞게 바꾼다 ----------
   버튼에는 "지금 상태"가 아니라 "누르면 될 상태"를 적는다.
   지금이 밝으면 버튼에는 "어둡게" — 누르면 무슨 일이 일어나는지 알려주는 편이 낫다. */
function updateButtonLabel(button) {
  const isDark = getCurrentTheme() === "dark";
  button.textContent = isDark ? "밝게" : "어둡게";
  button.setAttribute("aria-label", isDark ? "밝은 화면으로 전환" : "어두운 화면으로 전환");
}

/* ---------- 4. 버튼을 연결한다 ----------
   이 파일은 <head> 에서 실행되므로, 이 시점에는 버튼이 아직 만들어지지 않았다.
   그래서 "HTML을 다 읽었을 때 알려달라"고 예약해 둔다. */
document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("theme-toggle");
  if (!button) return;

  updateButtonLabel(button);

  button.addEventListener("click", function () {
    const next = getCurrentTheme() === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = next;   // 화면 즉시 반영
    updateButtonLabel(button);

    try {
      localStorage.setItem(THEME_KEY, next);         // 다음 방문에도 기억
    } catch (error) {
      // 저장에 실패해도 이번 화면은 이미 바뀌었다. 기억만 안 될 뿐이다.
    }
  });
});
