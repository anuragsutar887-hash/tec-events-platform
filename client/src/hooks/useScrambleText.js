import { useState, useEffect } from 'react';

const CHARS = '01<>/{}[];_+=*#%!&$?~█▓▒░ABCDEF0123456789';

export function useScrambleText(targetText, options = {}) {
  const { delay = 0, speed = 35, duration = 800 } = options;
  const [displayText, setDisplayText] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
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
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [targetText, delay, speed, duration]);

  return { text: displayText || (delay > 0 ? '' : targetText), isDone };
}
