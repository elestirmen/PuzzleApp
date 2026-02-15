/**
 * PuzzleApp Sound Effects – Web Audio API
 * Sentetik ses efektleri, harici dosya gerektirmez.
 */
const SFX = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return ctx;
    }

    // Unlock AudioContext on first user gesture (required on mobile)
    function unlock() {
        const ac = getCtx();
        if (ac.state === 'suspended') ac.resume();
    }
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });

    function play(freq, type, duration, volume, ramp) {
        try {
            const ac = getCtx();
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ac.currentTime);
            if (ramp) osc.frequency.exponentialRampToValueAtTime(ramp, ac.currentTime + duration);
            gain.gain.setValueAtTime(volume, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.start(ac.currentTime);
            osc.stop(ac.currentTime + duration);
        } catch (e) { /* silent fail */ }
    }

    return {
        /** Parça seçildiğinde – kısa tık */
        tap() {
            play(800, 'sine', 0.08, 0.15);
        },

        /** Parça takas edildiğinde – yumuşak swoosh */
        swap() {
            play(400, 'sine', 0.15, 0.12, 600);
        },

        /** Yanlış/iptal – kısa boop */
        cancel() {
            play(300, 'triangle', 0.1, 0.1, 200);
        },

        /** Kazanma – artan melodiler */
        win() {
            const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
            notes.forEach((f, i) => {
                setTimeout(() => play(f, 'sine', 0.25, 0.15), i * 120);
            });
        },

        /** Buton tıklama */
        click() {
            play(600, 'sine', 0.06, 0.1);
        },

        /** Generate / başarı */
        success() {
            play(440, 'sine', 0.12, 0.12, 880);
        }
    };
})();
