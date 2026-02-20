// ===========================
// 1️⃣ Печатаем текст построчно при попадании секции в центр
// ===========================
const sections = document.querySelectorAll('section:not(.november-wrapper)');

// Typing speed settings (faster)
const CHAR_DELAY_MS = 38; // ms per character (чуть медленнее)
const LINE_PAUSE_MS = 240; // базовая пауза после строки (чуть медленнее)
const LINE_PAUSE_RND = 120; // добавочная случайная пауза (0..120)

function isSectionCentered(sec) {
  const rect = sec.getBoundingClientRect();
  const center = window.innerHeight / 2;
  return rect.top <= center && rect.bottom >= center;
}

function typeLines(section) {
  // prevent concurrent typing on same section
  // prevent concurrent typing on same section, but recover if already finished
  if (section.dataset.typingRunning === '1') {
    const allTyped = Array.from(section.querySelectorAll('p, .subtitle, span, h1, h2')).every(l => l.dataset.typed === '1');
    if (allTyped) section.dataset.typingRunning = '0';
    else return;
  }
  section.dataset.typingRunning = '1';

  const lines = Array.from(section.querySelectorAll('p, .subtitle, span, h1, h2'))
    .filter(l => (l.textContent && l.textContent.trim().length) || l.dataset.origText !== undefined);

  // Печатаем строки последовательно
  // reserve heights for ALL lines first to prevent layout jumps while typing
  const reserves = new Map();
  // do NOT reserve min-height for section-2
  const isSection2 = section.classList.contains('section-2');
  if (!isSection2) {
    for (const line of lines) {
      const fullText = (line.dataset.origText !== undefined) ? line.dataset.origText : line.textContent.trim();
      const h = (function measureHeight(el, text) {
        const clone = el.cloneNode(false);
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.opacity = '1';
        clone.style.pointerEvents = 'none';
        clone.style.width = getComputedStyle(el).width;
        clone.textContent = text;
        document.body.appendChild(clone);
        const hh = clone.offsetHeight;
        document.body.removeChild(clone);
        // cap reserved height to avoid excessive layout jumps
        return Math.min(hh, Math.floor(window.innerHeight * 0.45));
      })(line, fullText);
      if (h) { line.style.minHeight = h + 'px'; reserves.set(line, h); }
    }
  } else {
    // remove any minHeight if present (in case of re-entry)
    for (const line of lines) {
      line.style.minHeight = '';
    }
  }

  (async () => {
    for (const line of lines) {
      if (line.dataset.typed) continue;
      line.dataset.typed = true;
      // prefer stored original text when available and non-empty;
      // otherwise fall back to current textContent/innerText trimmed
      const stored = line.dataset.origText;
      const fallback = (line.textContent || line.innerText || '').trim();
      const fullText = (stored !== undefined && stored !== '') ? stored : fallback;
      // reserveHeight already set earlier; ensure visible
      if (reserves.has(line)) line.style.minHeight = reserves.get(line) + 'px';
        // for section-2, always clear minHeight (in case of re-entry)
        if (isSection2) line.style.minHeight = '';
      line.textContent = '';
      line.style.opacity = 1;

      await new Promise(resolve => {
        let i = 0;
        function typeChar() {
          if (i < fullText.length) {
            line.textContent += fullText[i];
            i++;
            setTimeout(typeChar, CHAR_DELAY_MS);
          } else {
            // небольшая пауза перед следующей строкой (базовая + случайная)
            const extra = Math.floor(Math.random() * LINE_PAUSE_RND);
            setTimeout(resolve, LINE_PAUSE_MS + extra);
          }
        }
        typeChar();
      });
    }
    section.dataset.typingRunning = '0';
  })();
}

window.addEventListener('scroll', () => {
  sections.forEach(sec => {
    if (isSectionCentered(sec)) {
      typeLines(sec);
    }
  });
});

// ---------- Initialization: make other sections empty and start first immediately ----------
(function initTypingBehavior(){
  if (!sections || sections.length === 0) return;
  const arr = Array.from(sections);
  // keep first section visible and start typing it immediately
  const first = arr[0];
  // For all other sections, store original text and clear so they remain empty until scrolled
  arr.slice(1).forEach(sec => {
    const lines = Array.from(sec.querySelectorAll('p, .subtitle, span, h1, h2'));
    lines.forEach(line => {
      const txt = (line.textContent || '');
      const trimmed = txt.trim();
      // only store non-empty originals; leave empty/noise alone
      if (line.dataset.origText === undefined && trimmed.length) {
        line.dataset.origText = trimmed;
        line.textContent = '';
      }
      line.style.opacity = 0;
    });
  });

  // Start typing first section immediately
  if (first) {
    // store and clear first section lines so typing starts from empty
    const firstLines = Array.from(first.querySelectorAll('p, .subtitle, span, h1, h2'));
    firstLines.forEach(line => {
      const txt = (line.textContent || '');
      const trimmed = txt.trim();
      if (line.dataset.origText === undefined && trimmed.length) line.dataset.origText = trimmed;
      line.textContent = '';
      line.style.opacity = 1;
    });
    typeLines(first);
  }
})();


// ===========================
// 2️⃣ Ноябрь — масштаб "Ноябрь" и появление всех строк по scroll
// ===========================
const wrapper = document.querySelector('.november-wrapper');
const big = document.querySelector('.november-big');
const contents = document.querySelectorAll('.november-content'); // все строки

// изначально скрываем все строки
contents.forEach(line => {
  line.style.opacity = 0;
  line.style.transform = 'translateY(40px)';
});

window.addEventListener('scroll', () => {
  const rect = wrapper.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  const progress = Math.min(
    Math.max((windowHeight - rect.top) / wrapper.offsetHeight, 0),
    1
  );

  // Первая треть — уменьшаем "Ноябрь"
  if (progress < 0.3) {
    const p = progress / 0.3;
    big.style.transform = `scale(${1 - p * 0.4}) translateY(-${p * 100}px)`;
    big.style.opacity = 1 - p * 0.5;
  }

  // Вторая часть — показываем текст построчно
  if (progress >= 0.3 && progress < 0.8) {
    const p = (progress - 0.3) / 0.5;

    contents.forEach((line, index) => {
      // каждая строка появляется с небольшой задержкой
      const delay = index * 0.2; // задержка по долям от 1
      if (p > delay) {
        const lineProgress = Math.min((p - delay) / 0.2, 1); // прогресс строки от 0 до 1
        line.style.opacity = lineProgress;
        line.style.transform = `translateY(${40 - lineProgress * 40}px)`;
      }
    });
  }
});

// ===========================
// 3️⃣ Кнопки “Да” и “Нет”
// ===========================
const yesBtn = document.querySelector('.button-yes');
const noBtn = document.querySelector('.button-no');
const section6 = document.querySelector('.section-6');

// Показ финального экрана при нажатии "Да"
const finalScreen = document.querySelector('.final-screen');
if (yesBtn && finalScreen) {
  yesBtn.addEventListener('click', () => {
    finalScreen.classList.add('active');
  });
}

let targetX = 65;
let targetY = 60;
let currentX = targetX;
let currentY = targetY;

const safeDistance = 160; // радиус убегания
const edgePadding = 20; // отступ от краев секции

function randomOffset(max = 40) {
  return (Math.random() - 0.5) * max;
}

section6.addEventListener('mousemove', (e) => {
  const rect = noBtn.getBoundingClientRect();
  const sectionRect = section6.getBoundingClientRect();

  const btnCenterX = rect.left + rect.width / 2;
  const btnCenterY = rect.top + rect.height / 2;

  const dx = e.clientX - btnCenterX;
  const dy = e.clientY - btnCenterY;
  const distance = Math.sqrt(dx*dx + dy*dy);

  if (distance < safeDistance) {
    let angle = Math.atan2(dy, dx);
    angle += randomOffset(1.2); // случайный рывок
    const moveDist = safeDistance - distance + 30 + Math.random() * 30;

    let newX = rect.left - Math.cos(angle) * moveDist - sectionRect.left;
    let newY = rect.top - Math.sin(angle) * moveDist - sectionRect.top;

    // ограничиваем по границам
    newX = Math.min(Math.max(newX, edgePadding), sectionRect.width - rect.width - edgePadding);
    newY = Math.min(Math.max(newY, edgePadding), sectionRect.height - rect.height - edgePadding);

    // переводим в проценты
    targetX = (newX + rect.width/2) / sectionRect.width * 100;
    targetY = (newY + rect.height/2) / sectionRect.height * 100;
  }
});

// плавная анимация кнопки
function animate() {
  currentX += (targetX - currentX) * 0.2;
  currentY += (targetY - currentY) * 0.2;

  noBtn.style.left = currentX + "%";
  noBtn.style.top = currentY + "%";

  requestAnimationFrame(animate);
}

animate();

yesBtn.addEventListener('mouseenter', () => {
  yesBtn.style.transform = 'translate(-50%, -50%) scale(1.1)';
});

yesBtn.addEventListener('mouseleave', () => {
  yesBtn.style.transform = 'translate(-50%, -50%) scale(1)';
});
