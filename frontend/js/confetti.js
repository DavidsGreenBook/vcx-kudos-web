// Lightweight canvas-based confetti celebration effect
(function () {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrame = null;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    const colors = ['#EE0033', '#FF2B56', '#FFB800', '#FFD200', '#FFFFFF', '#FFA000', '#C40028'];

    function createParticle() {
        return {
            x: canvas.width / 2 + (Math.random() - 0.5) * 400,
            y: canvas.height * 0.45,
            w: Math.random() * 10 + 6,
            h: Math.random() * 6 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 14,
            vy: Math.random() * -15 - 5,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 12,
            gravity: 0.35,
            drag: 0.98,
            alpha: 1,
            decay: Math.random() * 0.015 + 0.008
        };
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.rotation += p.rotationSpeed;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        }

        if (particles.length > 0) {
            animationFrame = requestAnimationFrame(render);
        } else {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }

    window.triggerConfetti = function (count = 120) {
        resize();
        for (let i = 0; i < count; i++) {
            particles.push(createParticle());
        }
        if (!animationFrame) {
            render();
        }
    };
})();
