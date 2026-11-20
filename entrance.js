// Match the reference phase order, independent of markup order.
document
  .querySelectorAll("#entrance .right .word b")
  .forEach((letter, i) => letter.style.setProperty("--i", i));
const shapePhases = {
  circle: 0,
  square: 1,
  triangle: 2,
  ring: 3,
  pill: 4,
  star: 5,
};
document.querySelectorAll("#entrance .right .shape").forEach((shape) => {
  const kind = Object.keys(shapePhases).find((name) =>
    shape.classList.contains(name),
  );
  shape.style.setProperty("--i", shapePhases[kind] ?? 0);
});
const entrance = document.querySelector("#entrance"),
  destination = document.querySelector("#destination"),
  website = document.querySelector("#website"),
  login = document.querySelector("#login");
let busy = false,
  current = "home";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.querySelectorAll(".side").forEach((side) => {
  let pointerFrame = 0,
    pointerX = 0,
    pointerY = 0;
  side.addEventListener("pointermove", (e) => {
    if (busy || reduced || e.pointerType === "touch") return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (busy || reduced) return;
      const r = side.getBoundingClientRect();
      const x = (pointerX - r.left) / r.width - 0.5,
        y = (pointerY - r.top) / r.height - 0.5;
      side.style.setProperty("--mx", x * 35 + "px");
      side.style.setProperty("--my", y * 35 + "px");
      side.style.setProperty("--cx", x * 10 + "px");
      side.style.setProperty("--cy", y * 10 + "px");
    });
  });
  side.addEventListener("pointerleave", () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    ["--mx", "--my", "--cx", "--cy"].forEach((v) =>
      side.style.setProperty(v, "0px"),
    );
  });
  side.addEventListener("click", () => enter(side));
});
function content(target) {
  current = target;
  website.hidden = target !== "home";
  login.hidden = target !== "login";
  if (target === "home" && website.getAttribute("src") === "about:blank")
    website.src = "./home.html";
  document.querySelector("#switch").textContent =
    target === "home" ? "LOGIN" : "官网 / OUFU";
}
async function enter(side) {
  if (busy) return;
  busy = true;
  content(side.dataset.target);
  destination.hidden = false;
  destination.inert = true;
  side.classList.add("selected");
  entrance.classList.add("departing");
  const options = {
    duration: reduced ? 0 : 800,
    fill: "forwards",
    easing: "cubic-bezier(.55,0,1,.45)",
  };
  const letters = [...side.querySelectorAll(".word b")];
  const animations = letters.map((b, i) =>
    b.animate(
      [
        { transform: getComputedStyle(b).transform },
        {
          transform:
            "translateY(" +
            innerHeight +
            "px) rotate(" +
            (i % 2 ? 35 : -30) +
            "deg)",
        },
      ],
      { ...options, delay: reduced ? 0 : 250 + i * 35 },
    ),
  );
  side
    .querySelectorAll(".description,.number,.enter,.shapes,.orb")
    .forEach((el) =>
      animations.push(
        el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: reduced ? 0 : 300,
          delay: reduced ? 0 : 250,
          fill: "forwards",
        }),
      ),
    );
  await Promise.all(animations.map((a) => a.finished));
  await entrance.animate(
    [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }],
    {
      duration: reduced ? 0 : 900,
      easing: "cubic-bezier(.77,0,.18,1)",
      fill: "forwards",
    },
  ).finished;
  entrance.hidden = true;
  destination.inert = false;
  busy = false;
  (current === "login"
    ? document.querySelector("#username")
    : document.querySelector("#back")
  ).focus();
}
// A shared curtain covers the old view before revealing the next one.
const switchCurtain = document.createElement("div");
switchCurtain.className = "switch-curtain";
switchCurtain.hidden = true;
switchCurtain.setAttribute("aria-hidden", "true");
document.body.appendChild(switchCurtain);

function resetEntrance() {
  entrance.getAnimations({ subtree: true })
    .filter(a => !("animationName" in a)).forEach(a => a.cancel());
  entrance.classList.remove("departing");
  document.querySelectorAll(".side").forEach(side => {
    side.classList.remove("selected");
    ["--mx", "--my", "--cx", "--cy"].forEach(v => side.style.setProperty(v, "0px"));
  });
}

async function switchView(target) {
  if (busy) return;
  busy = true;
  destination.inert = true;
  entrance.inert = true;
  const oldOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  const activeAnimations = [];
  const slide = async (from, to, duration) => {
    const animation = switchCurtain.animate(
      [{ transform: from }, { transform: to }],
      { duration: reduced ? 0 : duration,
        easing: "cubic-bezier(.77,0,.18,1)", fill: "forwards" }
    );
    activeAnimations.push(animation);
    await animation.finished;
  };
  try {
    switchCurtain.dataset.view = target;
    switchCurtain.textContent = target === "login" ? "LOGIN" : "OUFU";
    switchCurtain.hidden = false;
    await slide("translateY(100%)", "translateY(0)", 650);
    // Change views only while the curtain fully covers the viewport.
    if (target === "entrance") {
      resetEntrance();
      entrance.hidden = false;
      destination.hidden = true;
    } else {
      content(target);
      entrance.hidden = true;
      destination.hidden = false;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    await slide("translateY(0)", "translateY(-100%)", 900);
  } finally {
    switchCurtain.hidden = true;
    activeAnimations.forEach(animation => animation.cancel());
    document.documentElement.style.overflow = oldOverflow;
    destination.inert = false;
    entrance.inert = false;
    busy = false;
  }
  const focusTarget = target === "entrance"
    ? document.querySelector('.side[data-target="' + current + '"]')
    : target === "login" ? document.querySelector("#username")
    : document.querySelector("#switch");
  focusTarget?.focus({ preventScroll: true });
}

document.querySelector("#back").onclick = () => switchView("entrance");
document.querySelector("#switch").onclick = () =>
  switchView(current === "home" ? "login" : "home");
document.querySelector("#reveal").onclick = () => {
  const input = document.querySelector("#password"),
    show = input.type === "password";
  input.type = show ? "text" : "password";
  document.querySelector("#reveal").textContent = show ? "隐藏" : "显示";
  document
    .querySelector("#reveal")
    .setAttribute("aria-label", show ? "隐藏密码" : "显示密码");
};
document.querySelector("form").onsubmit = async (event) => {
  event.preventDefault();
  if (busy) return;
  const username = document.querySelector("#username").value.trim();
  if (!username) { document.querySelector("#message").textContent = "请输入用户名。"; return; }
  try {
    sessionStorage.setItem("oufu-demo-session", JSON.stringify({ username, role: "student" }));
  } catch {
    document.querySelector("#message").textContent = "浏览器限制了本地会话，请允许存储后重试。"; return;
  }
  busy = true;
  document.querySelector("#password").value = "";
  switchCurtain.dataset.view = "login";
  switchCurtain.textContent = "WELCOME";
  switchCurtain.hidden = false;
  await switchCurtain.animate(
    [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
    { duration: reduced ? 0 : 700, easing: "cubic-bezier(.77,0,.18,1)", fill: "forwards" }
  ).finished;
  location.href = "./student/index.html";
};
