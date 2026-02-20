/**
 * World Loader — game-like loading screen for first-time user initialization.
 * Shows an animated overlay while both server init and client init happen behind it.
 */

const LOADER_SUBTEXTS = [
    'Preparing your adventure...',
    'Setting up your world...',
    'Almost there...',
    'The tavern awaits...',
];

let stepInterval = null;
let allStepsDone = false;
let finishResolver = null;

function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const PARTICLE_COUNT = 60;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: -Math.random() * 0.5 - 0.1,
            opacity: Math.random() * 0.5 + 0.1,
            hue: 250 + Math.random() * 30,
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
            p.x += p.speedX;
            p.y += p.speedY;
            p.opacity += (Math.random() - 0.5) * 0.01;
            p.opacity = Math.max(0.05, Math.min(0.6, p.opacity));

            if (p.y < -10) {
                p.y = canvas.height + 10;
                p.x = Math.random() * canvas.width;
            }
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity})`;
            ctx.fill();

            // Glow effect
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity * 0.15})`;
            ctx.fill();
        }

        requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

/**
 * Shows the world loader overlay and starts the step animation.
 * Call finishWorldLoader() when init is complete.
 */
export function showWorldLoader() {
    const loader = document.getElementById('worldLoader');
    if (!loader) return;

    allStepsDone = false;
    finishResolver = null;

    // Hide the preloader (dark blur overlay) since world loader replaces it
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.style.display = 'none';

    loader.style.display = 'block';
    initParticles();

    let currentStep = 0;
    const steps = document.querySelectorAll('.loaderStep');

    stepInterval = setInterval(() => {
        // Mark previous step as completed
        if (currentStep > 0 && steps[currentStep - 1]) {
            steps[currentStep - 1].classList.remove('active');
            steps[currentStep - 1].classList.add('completed');
        }

        // Activate current step
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('active');
            currentStep++;
        }

        // Update progress bar
        const progress = Math.min((currentStep / steps.length) * 85, 85);
        const bar = document.getElementById('worldLoaderBar');
        if (bar) bar.style.width = progress + '%';

        // Cycle subtext
        const subtext = document.getElementById('worldLoaderSubtext');
        if (subtext) {
            subtext.textContent = LOADER_SUBTEXTS[currentStep % LOADER_SUBTEXTS.length];
        }

        // All steps done
        if (currentStep >= steps.length) {
            clearInterval(stepInterval);
            stepInterval = null;
            if (steps[steps.length - 1]) {
                steps[steps.length - 1].classList.remove('active');
                steps[steps.length - 1].classList.add('completed');
            }
            allStepsDone = true;

            // If finishWorldLoader was already called, resolve now
            if (finishResolver) {
                doFinish(finishResolver);
            } else {
                // Show waiting message
                const subtext = document.getElementById('worldLoaderSubtext');
                if (subtext) subtext.textContent = 'Finishing up...';
            }
        }
    }, 1000);
}

/**
 * Completes the world loader animation and fades out.
 * Returns a promise that resolves when the loader is fully hidden.
 * If steps are still animating, waits for them to finish first.
 */
export function finishWorldLoader() {
    return new Promise((resolve) => {
        if (allStepsDone) {
            // Steps already done, finish immediately
            doFinish(resolve);
        } else {
            // Steps still animating — accelerate them
            if (stepInterval) {
                clearInterval(stepInterval);
                stepInterval = null;
            }
            // Rapidly complete remaining steps
            const steps = document.querySelectorAll('.loaderStep');
            let delay = 0;
            for (const step of steps) {
                if (!step.classList.contains('completed')) {
                    delay += 300;
                    setTimeout(() => {
                        step.classList.remove('active');
                        step.classList.add('completed');
                    }, delay);
                }
            }
            // After all steps are accelerated, finish
            setTimeout(() => {
                allStepsDone = true;
                doFinish(resolve);
            }, delay + 400);
        }
    });
}

function doFinish(resolve) {
    const bar = document.getElementById('worldLoaderBar');
    if (bar) bar.style.width = '100%';

    const subtext = document.getElementById('worldLoaderSubtext');
    if (subtext) subtext.textContent = 'Welcome to your world!';

    // Brief pause to show completion, then fade out
    setTimeout(() => {
        const loader = document.getElementById('worldLoader');
        if (loader) {
            loader.style.transition = 'opacity 0.6s ease';
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                // Remove preloader if it still exists
                const preloader = document.getElementById('preloader');
                if (preloader) preloader.remove();
                resolve();
            }, 600);
        } else {
            resolve();
        }
    }, 1500);
}
