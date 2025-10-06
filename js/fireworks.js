// Enable strict mode for cleaner, safer JavaScript.
'use strict';


let canvas, ctx;
const explosions = [];  // Active explosions
const particles = [];   // Rising particles

// Using our own timing to control update speed.
let previousTimestamp = 0; // Timestamp of the previous frame
let timeSinceLastStep = 0; // Time in ms since last update

// Centralised immutable object to make config changes a little easier.
const CONFIG = Object.freeze({
    CANVAS_ID: 'canvas-fireworks',
    SPAWN_PROBABILITY: 0.025, // Chance to spawn rising particle per frame
    SCREEN_BUFFER: 10,        // Extra space around edges before removing particles
    TIME_STEP: 8,             // Time in ms between updates
    // Explosion particles
    EXPLOSION: {
        GRAVITY: 0.01,        // Downward acc for explosion particles
        PARTICLES_MAX: 20,    // Max particles per explosion
        LIFE_RANGE: [30, 80]  // Lifespan of explosion particles
    },
    // Rising particles
    RISE: {
        VEL_Y: -3,                // Upward vel for rising particles
        VEL_X_RANGE: [-0.5, 0.5], // Random horizontal vel for rising particles
        LIFE_RANGE: [40, 70]      // Lifespan of rising particles
    },
    COLOURS: {
        BACKGROUND: 'rgba(0,0,0,0.1)' // The alpha is used here to control the fade speed of particles
    }
});

window.addEventListener('load', init);

function init() {
    canvas = document.getElementById(CONFIG.CANVAS_ID);
    if (!canvas) {
        console.error(`Canvas element with id="${CONFIG.CANVAS_ID}" not found.`);
        return;
    }
    ctx = canvas.getContext('2d');
    requestAnimFrame(animationLoop);
}

// Update the state of particles and explosions.
function update() {
    // Randomly create a new rising particle
    if (Math.random() < CONFIG.SPAWN_PROBABILITY) {
        particles.push(
            new Particle(
                Helper.random(0, canvas.width), // pos x
                canvas.height + 1,              // pos y
                Helper.random(
                    CONFIG.RISE.VEL_X_RANGE[0],
                    CONFIG.RISE.VEL_X_RANGE[1]
                ),                              // vel x
                CONFIG.RISE.VEL_Y,              // vel y
                0,                              // acc x
                0,                              // acc y
                Helper.random(
                    CONFIG.RISE.LIFE_RANGE[0],
                    CONFIG.RISE.LIFE_RANGE[1]
                ),                              // lifespan
                Helper.getRandomColour()        // particle colour
            )
        );
    }

    // Update particles - convert finished ones into explosions.
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();

        if (particles[i].remove === true) {
            explosions.push(
                new Explosion(particles[i].posX, particles[i].posY, particles[i].colour)
            );
            particles.splice(i, 1);
        }
    }

    // Update explosions.
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].update();

        // Remove finished explosions.
        if (explosions[i].particles.length === 0) {
            explosions.splice(i, 1);
        }
    }
}

// Render the current frame.
function draw() {
    // Fade the canvas for trails (alpha on background colour).
    ctx.fillStyle = CONFIG.COLOURS.BACKGROUND;
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
    constructor(x, y, velX, velY, accX, accY, lifeSpan, colour) {
        this.width = 3;
        this.height = 3;
        this.remove = false;

        this.posX = x;
        this.posY = y;
        this.velX = velX;
        this.velY = velY;
        this.accX = accX;
        this.accY = accY;
        this.colour = colour;
        this.lifeSpan = lifeSpan;
    }

    update() {
        this.velX += this.accX;
        this.velY += this.accY;
        this.posX += this.velX;
        this.posY += this.velY;

        // Mark for removal if life span is exceeded.
        this.lifeSpan--;
        if (this.lifeSpan <= 0) {
            this.remove = true;
        }

        // Mark for removal if off screen.
        if (this.posY > canvas.height + CONFIG.SCREEN_BUFFER
            || this.posX < -CONFIG.SCREEN_BUFFER
            || this.posX > canvas.width + CONFIG.SCREEN_BUFFER) {
            this.remove = true;
        }
    }

    draw() {
        Helper.drawRect(this.posX, this.posY, this.width, this.height, this.colour);
    }
}

// Spawns a burst of particles that drift and fade.
class Explosion {
    constructor(x, y, colour) {
        this.x = x;
        this.y = y;
        this.maxParticles = CONFIG.EXPLOSION.PARTICLES_MAX;
        this.particles = [];
        this.lifeSpan = Helper.random(CONFIG.EXPLOSION.LIFE_RANGE[0], CONFIG.EXPLOSION.LIFE_RANGE[1]);
        this.primaryColour = colour;

        // Create particles in a circular pattern.
        for (let i = this.maxParticles; i--;) {
            const angle = (i * Math.PI * 2) / this.maxParticles;
            const velX = Math.sin(angle);
            const velY = Math.cos(angle);
            const accX = 0;
            const accY = CONFIG.EXPLOSION.GRAVITY;

            // Alternate between primary and random colours.
            const colourForParticle = i % 3 ? this.primaryColour : Helper.getRandomColour();

            this.particles.push(
                new Particle(
                    this.x,
                    this.y,
                    velX,
                    velY,
                    accX,
                    accY,
                    Helper.random(this.lifeSpan, this.lifeSpan + 30),
                    colourForParticle
                )
            );
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].remove === true) {
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

class Helper {
    // Generate a random integer between start and finish.
    static random(start, finish) {
        return Math.floor(Math.random() * (finish - start + 1)) + start;
    }

    // Draw a filled rectangle at the given position and size.
    static drawRect(top_left_x, top_left_y, width, height, colour) {
        ctx.fillStyle = colour;
        ctx.fillRect(top_left_x, top_left_y, width, height);
    }

    // Generate a random hex colour string (e.g. #A1B2C3).
    static getRandomColour() {
        const letters = '0123456789ABCDEF';
        let color = '#';

        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
}

// Main loop where we update state, draw, schedule next frame.
function animationLoop(currentTimestamp) {
    const timeDelta = currentTimestamp - previousTimestamp;
    previousTimestamp = currentTimestamp;
    timeSinceLastStep += timeDelta;

    // Update and draw only if enough time has passed.
    if (timeSinceLastStep > CONFIG.TIME_STEP) {
        timeSinceLastStep = 0;
        update();
        draw();
    }

    requestAnimFrame(animationLoop);
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
