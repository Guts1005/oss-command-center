// Native Web Audio chime and Desktop Notification Service

export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle dual-tone ascending chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // AudioContext might be blocked until user gesture
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

export function sendDesktopNotification(
  title: string,
  body: string,
  onClick?: () => void
) {
  // Play subtle sound if enabled
  const soundEnabled = localStorage.getItem('oss_sound_enabled') !== 'false';
  if (soundEnabled) {
    playNotificationSound();
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'oss-alert-' + Date.now(),
    });

    if (onClick) {
      notif.onclick = () => {
        window.focus();
        onClick();
        notif.close();
      };
    }
  } catch (e) {
    console.warn('[Notification Error]:', e);
  }
}
