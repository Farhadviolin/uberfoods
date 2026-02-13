/**
 * Animation Utilities
 * For creating smooth animations
 */

/**
 * Easing functions
 */
export const easing = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};

/**
 * Animates a value from start to end
 */
export function animate(
  start: number,
  end: number,
  duration: number,
  easingFn: (t: number) => number = easing.easeInOut,
  callback: (value: number) => void
): () => void {
  const startTime = performance.now();
  let animationFrameId: number;

  const animateStep = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFn(progress);
    const currentValue = start + (end - start) * easedProgress;

    callback(currentValue);

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animateStep);
    }
  };

  animationFrameId = requestAnimationFrame(animateStep);

  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}

/**
 * Animates scroll to a position
 */
export function animateScrollTo(
  target: number,
  duration: number = 500,
  element: HTMLElement | Window = window
): Promise<void> {
  return new Promise((resolve) => {
    const start = element === window 
      ? window.pageYOffset 
      : (element as HTMLElement).scrollTop;
    
    const distance = target - start;
    const startTime = performance.now();
    let animationFrameId: number;

    const animateStep = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing.easeInOutCubic(progress);
      const currentPosition = start + distance * easedProgress;

      if (element === window) {
        window.scrollTo(0, currentPosition);
      } else {
        (element as HTMLElement).scrollTop = currentPosition;
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateStep);
      } else {
        resolve();
      }
    };

    animationFrameId = requestAnimationFrame(animateStep);
  });
}

/**
 * Fades in an element
 */
export function fadeIn(element: HTMLElement, duration: number = 300): Promise<void> {
  return new Promise((resolve) => {
    element.style.opacity = '0';
    element.style.display = 'block';

    const startTime = performance.now();
    let animationFrameId: number;

    const animateStep = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing.easeOut(progress);

      element.style.opacity = String(easedProgress);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateStep);
      } else {
        resolve();
      }
    };

    animationFrameId = requestAnimationFrame(animateStep);
  });
}

/**
 * Fades out an element
 */
export function fadeOut(element: HTMLElement, duration: number = 300): Promise<void> {
  return new Promise((resolve) => {
    const startOpacity = parseFloat(getComputedStyle(element).opacity) || 1;
    const startTime = performance.now();
    let animationFrameId: number;

    const animateStep = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing.easeIn(progress);

      element.style.opacity = String(startOpacity * (1 - easedProgress));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateStep);
      } else {
        element.style.display = 'none';
        resolve();
      }
    };

    animationFrameId = requestAnimationFrame(animateStep);
  });
}

