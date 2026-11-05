import { prefersReducedMotion } from '../hooks/useReducedMotion';

/**
 * A small burst of emoji floating up from an element (sending a cheer, a request…).
 * Plain DOM so it outlives the component that triggered it; removed when done.
 */
export function burst(from: Element | null, emoji = '💛', count = 7) {
  if (!from || prefersReducedMotion()) return;
  const rect = from.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'burst-layer';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'burst-particle';
    s.textContent = emoji;
    const angle = (Math.PI * (0.15 + (0.7 * i) / Math.max(1, count - 1))) * -1;
    const dist = 60 + Math.random() * 50;
    s.style.left = `${rect.left + rect.width / 2}px`;
    s.style.top = `${rect.top + rect.height / 2}px`;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist - 30}px`);
    s.style.setProperty('--rot', `${(Math.random() - 0.5) * 60}deg`);
    s.style.animationDelay = `${i * 30}ms`;
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1400);
}
