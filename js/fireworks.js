// Enable strict mode for cleaner, safer JavaScript.
'use strict';

const SPAWN_PROBABILITY = 0.025;    // Chance to spawn a rising particle per frame
const TRAIL_ALPHA = 0.1;            // Trail fade speed
const RISING_PARTICLE_SPEED_Y = -3; // Upward speed of rising particle
const GRAVITY = 0.01;               // Downward acceleration for explosion particles

let canvas, ctx;
const explosions = [];  // Active explosions
const particles = [];   // Rising particles

window.addEventListener('load', init);

function init() {
    canvas = document.getElementById('canvas-fireworks');
    if (!canvas) {
        console.error('Canvas element with id="canvas-fireworks" not found.');
        return;
    }
    ctx = canvas.getContext('2d');
    animationLoop();
}

// Main loop where we update state, draw, schedule next frame.
function animationLoop() {
    update();
    draw();
    requestAnimFrame(animationLoop);
}

// Update the state of particles and explosions.
function update() {
    // Randomly create a new rising particle
    if (Math.random() < SPAWN_PROBABILITY) {
        particles.push(
            new Particle(
                random(0, canvas.width),    // pos x
                canvas.height + 1,          // pos y
                random(-50, 50) / 100,      // vel x
                RISING_PARTICLE_SPEED_Y,    // vel y
                0,                          // acc x
                0,                          // acc y
                random(40, 70),             // life span
                getRandomColor()
            )
        );
    }

    // Update particles - convert finished ones into explosions
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();

        if (particles[i].remove === true) {
            explosions.push(
                new Explosion(particles[i].pos_x, particles[i].pos_y, particles[i].colour)
            );
            particles.splice(i, 1);
        }
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].update();

        // Remove finished explosions
        if (explosions[i].particles.length === 0) {
            explosions.splice(i, 1);
        }
    }
}

// Render the current frame.
function draw() {
    // Fade the canvas for trails (tweak alpha for longer/shorter trails)
    ctx.fillStyle = `rgba(0,0,0,${TRAIL_ALPHA})`;
    // ctx.fillStyle = `rgba(255,255,255,${TRAIL_ALPHA})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].draw();
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].draw();
    }
}

// Represents a single moving point with basic physics and lifespan.
class Particle {
    constructor(x, y, vel_x, vel_y, acc_x, acc_y, life_span, colour = 'red') {
        this.width = 3;
        this.height = 3;
        this.remove = false;

        this.pos_x = x;
        this.pos_y = y;
        this.vel_x = vel_x;
        this.vel_y = vel_y;
        this.acc_x = acc_x;
        this.acc_y = acc_y;
        this.colour = colour;
        this.life_span = life_span;
    }

    update() {
        this.vel_x += this.acc_x;
        this.vel_y += this.acc_y;
        this.pos_x += this.vel_x;
        this.pos_y += this.vel_y;

        // Mark for removal if life span is exceeded
        this.life_span--;
        if (this.life_span <= 0) {
            this.remove = true;
        }

        // Mark for removal if off screen
        if (this.pos_y > canvas.height + 10 || this.pos_x < -10 || this.pos_x > canvas.width + 10) {
            this.remove = true;
        }
    }

    draw() {
        drawRect(this.pos_x, this.pos_y, this.width, this.height, this.colour);
    }
}

// Spawns a burst of particles that drift and fade.
class Explosion {
    constructor(x, y, colour) {
        this.x = x;
        this.y = y;
        this.max_particles = 20;
        this.particles = [];
        this.life_span = random(30, 80);
        this.primary_colour = colour;

        // Create particles in a circular pattern
        for (let i = this.max_particles; i--;) {
            const angle = (i * Math.PI * 2) / this.max_particles;
            const vel_x = Math.sin(angle);
            const vel_y = Math.cos(angle);
            const acc_x = 0;
            const acc_y = GRAVITY;

            // Alternate between primary and random colors
            const colourForParticle = i % 3 ? this.primary_colour : getRandomColor();

            this.particles.push(
                new Particle(
                    this.x,
                    this.y,
                    vel_x,
                    vel_y,
                    acc_x,
                    acc_y,
                    random(this.life_span, this.life_span + 30),
                    colourForParticle
                )
            );
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].remove) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].draw();
        }
    }
}

// Polyfill for cross browser requestAnimationFrame support.
window.requestAnimFrame = (function () {
    return (
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function (callback) {
            // Fallback to 30 FPS
            window.setTimeout(callback, 1000 / 30);
        }
    );
})();

// Generate a random integer between start and finish.
function random(start, finish) {
    return Math.floor(Math.random() * (finish - start + 1)) + start;
}

// Draw a filled rectangle at the given position and size.
function drawRect(top_left_x, top_left_y, width, height, colour) {
    ctx.fillStyle = colour;
    ctx.fillRect(top_left_x, top_left_y, width, height);
}

// Generate a random hex color string (e.g. #A1B2C3).
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';

    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
