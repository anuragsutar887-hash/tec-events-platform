import { useState, useEffect } from 'react';

const CHARS = '01<>/{}[];_+=*#%!&$?~█▓▒░ABCDEF0123456789';

export function useScrambleText(targetText, options = {}) {
  const { delay = 0, speed = 35, duration = 800, oncePerSession = true } = options;
  const hasPlayed = oncePerSession && typeof window !== 'undefined' && sessionStorage.getItem('hero_scramble_played');

  const [displayText, setDisplayText] = useState(hasPlayed ? targetText : '');
  const [isDone, setIsDone] = useState(Boolean(hasPlayed));

  useEffect(() => {
    if (hasPlayed) {
      setDisplayText(targetText);
      setIsDone(true);
      return;
    }

    let timeoutId;
    let intervalId;
    let startTime;

    timeoutId = setTimeout(() => {
      startTime = Date.now();

      intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const charsDecoded = Math.floor(progress * targetText.length);

        let result = '';
        for (let i = 0; i < targetText.length; i++) {
          if (targetText[i] === ' ' || targetText[i] === '\n') {
            result += targetText[i];
          } else if (i < charsDecoded) {
            result += targetText[i];
          } else {
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }

        setDisplayText(result);

        if (progress >= 1) {
          clearInterval(intervalId);
          setDisplayText(targetText);
          setIsDone(true);
          if (oncePerSession) {
            sessionStorage.setItem('hero_scramble_played', 'true');
          }
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [targetText, delay, speed, duration, hasPlayed, oncePerSession]);

  return { text: displayText || (hasPlayed || delay === 0 ? targetText : ''), isDone };
}
