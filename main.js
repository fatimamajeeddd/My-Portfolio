const TOTAL_FRAMES = 300;

// Support both #scroll-canvas and #hero-canvas
const canvas = document.getElementById('scroll-canvas') || document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderPercent = document.getElementById('loader-percent');

const images = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let currentFrameIndex = 0;
let targetFrameIndex = 0;
let animationFrameId = null;
let loaderDismissed = false;

// Default fitMode to 'contain' (shows 100% of frame) or 'cover' (full bleed)
let fitMode = 'contain';

// Format image URL
function getFrameUrl(index) {
  const paddedIndex = String(index).padStart(3, '0');
  return `./public/frames/ezgif-frame-${paddedIndex}.jpg`;
}
// Set up Canvas Resolution for Retina / High DPI displays
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  drawFrame(Math.round(currentFrameIndex));
}

// Find nearest loaded frame if target frame is downloading
function getBestAvailableImage(targetIndex) {
  if (images[targetIndex] && images[targetIndex].complete && images[targetIndex].naturalWidth > 0) {
    return images[targetIndex];
  }

  for (let delta = 1; delta < TOTAL_FRAMES; delta++) {
    const prev = targetIndex - delta;
    if (prev >= 0 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
      return images[prev];
    }
    const next = targetIndex + delta;
    if (next < TOTAL_FRAMES && images[next] && images[next].complete && images[next].naturalWidth > 0) {
      return images[next];
    }
  }

  return null;
}

// Primary Frame Rendering Function (drawFrame / renderFrame)
function drawFrame(index) {
  const img = getBestAvailableImage(index);
  if (!img) return;

  const cWidth = canvas.width;
  const cHeight = canvas.height;
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;

  if (!imgWidth || !imgHeight) return;

  const canvasAspect = cWidth / cHeight;
  const imgAspect = imgWidth / imgHeight;

  let drawWidth, drawHeight;

  if (fitMode === 'contain') {
    // CONTAIN FIT: Ensures 100% of the image sequence is visible without any cropping
    if (imgAspect > canvasAspect) {
      drawWidth = cWidth;
      drawHeight = cWidth / imgAspect;
    } else {
      drawHeight = cHeight;
      drawWidth = cHeight * imgAspect;
    }
  } else {
    // COVER FIT: Full screen fill
    if (imgAspect > canvasAspect) {
      drawHeight = cHeight;
      drawWidth = cHeight * imgAspect;
    } else {
      drawWidth = cWidth;
      drawHeight = cWidth / imgAspect;
    }
  }

  const x = (cWidth - drawWidth) / 2;
  const y = (cHeight - drawHeight) / 2;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cWidth, cHeight);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, x, y, drawWidth, drawHeight);
}

// Alias for renderFrame compatibility
function renderFrame(index) {
  drawFrame(index);
}

// Silky Smooth Animation Loop using Linear Interpolation (Lerp)
function animate() {
  // Easing factor 0.08 for smooth, luxury inertia transition
  const ease = 0.08;
  const diff = targetFrameIndex - currentFrameIndex;

  if (Math.abs(diff) > 0.001) {
    currentFrameIndex += diff * ease;
    drawFrame(Math.round(currentFrameIndex));
  } else if (Math.round(currentFrameIndex) !== Math.round(targetFrameIndex)) {
    currentFrameIndex = targetFrameIndex;
    drawFrame(Math.round(currentFrameIndex));
  }

  animationFrameId = requestAnimationFrame(animate);
}

// Calculate Target Frame from Scroll Position & Update Active Nav Link
function updateTargetFrame() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  const maxScroll = (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;

  if (maxScroll > 0) {
    const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScroll));
    targetFrameIndex = scrollFraction * (TOTAL_FRAMES - 1);
  }

  // Active section link highlighting
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');

  let currentSectionId = '';
  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 200;
    if (scrollTop >= sectionTop) {
      currentSectionId = section.getAttribute('id');
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${currentSectionId}`) {
      link.classList.add('active');
    }
  });
}

// Dismiss Loader Screen
function dismissLoader() {
  if (loaderDismissed) return;
  loaderDismissed = true;

  if (loader) {
    loader.classList.add('hidden');
  }
}

// Preload all 300 image frames into memory
function preloadImages() {
  const safetyTimeout = setTimeout(() => {
    dismissLoader();
  }, 2500);

  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    const frameIndex = i - 1;

    img.onload = () => {
      images[frameIndex] = img;
      loadedCount++;

      const percent = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
      if (loaderBar) loaderBar.style.width = `${percent}%`;
      if (loaderPercent) loaderPercent.textContent = `${percent}%`;

      if (frameIndex === 0) {
        drawFrame(0);
      }

      if (loadedCount >= Math.floor(TOTAL_FRAMES * 0.9)) {
        clearTimeout(safetyTimeout);
        dismissLoader();
      }
    };

    img.onerror = () => {
      loadedCount++;
      if (loadedCount >= Math.floor(TOTAL_FRAMES * 0.9)) {
        clearTimeout(safetyTimeout);
        dismissLoader();
      }
    };

    img.src = getFrameUrl(i);
  }
}

// Double click to toggle fit mode (contain / cover)
window.addEventListener('dblclick', () => {
  fitMode = fitMode === 'contain' ? 'cover' : 'contain';
  drawFrame(Math.round(currentFrameIndex));
});

// Window Event Listeners
window.addEventListener('resize', () => {
  resizeCanvas();
  updateTargetFrame();
});

window.addEventListener('scroll', updateTargetFrame, { passive: true });
window.addEventListener('wheel', updateTargetFrame, { passive: true });
window.addEventListener('touchmove', updateTargetFrame, { passive: true });

// Start Application
function init() {
  resizeCanvas();
  updateTargetFrame();
  animate();
  preloadImages();
}

init();
