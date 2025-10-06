// Enable strict mode for cleaner, safer JavaScript.
'use strict';


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

// ---------------------------------------------------------------------------

// Represents a single moving point with basic physics and lifespan.
class Particle {
    constructor(x, y, velX, velY, accX, accY, lifeSpan, colour, ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;

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
        if (this.posY > this.canvas.height + CONFIG.SCREEN_BUFFER ||
            this.posX < -CONFIG.SCREEN_BUFFER ||
            this.posX > this.canvas.width + CONFIG.SCREEN_BUFFER
        ) {
            this.remove = true;
        }
    }

    draw() {
        this.ctx.fillStyle = this.colour;
        this.ctx.fillRect(this.posX, this.posY, this.width, this.height);
    }
}

// ---------------------------------------------------------------------------

// Spawns a burst of particles that drift and fade.
class Explosion {
    constructor(x, y, colour, ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.maxParticles = CONFIG.EXPLOSION.PARTICLES_MAX;
        this.particles = [];
        this.lifeSpan = Helper.random(
            CONFIG.EXPLOSION.LIFE_RANGE[0],
            CONFIG.EXPLOSION.LIFE_RANGE[1]
        );
        this.primaryColour = colour;

        // Create particles in a circular pattern.
        for (let i = this.maxParticles; i--;) {
            const angle = (i * Math.PI * 2) / this.maxParticles;
            const velX = Math.sin(angle);
            const velY = Math.cos(angle);
            const accX = 0;
            const accY = CONFIG.EXPLOSION.GRAVITY;
            const lifeSpan = Helper.random(this.lifeSpan, this.lifeSpan + 30);
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
                    lifeSpan,
                    colourForParticle,
                    this.ctx,
                    this.canvas
                )
            );
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();

            // Remove finished particles.
            if (this.particles[i].remove) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        for (const particle of this.particles) {
            particle.draw();
        }
    }
}

// ---------------------------------------------------------------------------

// Manages all active fireworks particles and explosions.
class FireworksSystem {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.particles = [];
        this.explosions = [];
    }

    update() {
        // Randomly create a new rising particle
        if (Math.random() < CONFIG.SPAWN_PROBABILITY) {
            this.particles.push(
                new Particle(
                    Helper.random(0, this.canvas.width), // pos x
                    this.canvas.height + 1,              // pos y
                    Helper.random(
                        CONFIG.RISE.VEL_X_RANGE[0],
                        CONFIG.RISE.VEL_X_RANGE[1]
                    ),                                  // vel x
                    CONFIG.RISE.VEL_Y,                  // vel y
                    0,                                  // acc x
                    0,                                  // acc y
                    Helper.random(
                        CONFIG.RISE.LIFE_RANGE[0],
                        CONFIG.RISE.LIFE_RANGE[1]
                    ),                                  // lifespan
                    Helper.getRandomColour(),           // colour
                    this.ctx,
                    this.canvas
                )
            );
        }

        // Update particles - convert finished ones into explosions.
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();

            if (this.particles[i].remove) {
                this.explosions.push(
                    new Explosion(
                        this.particles[i].posX,
                        this.particles[i].posY,
                        this.particles[i].colour,
                        this.ctx,
                        this.canvas
                    )
                );
                this.particles.splice(i, 1);
            }
        }

        // Update explosions.
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].update();
            if (this.explosions[i].particles.length === 0) {
                this.explosions.splice(i, 1);
            }
        }
    }

    draw() {
        // Fade the canvas for trails (alpha on background colour).
        this.ctx.fillStyle = CONFIG.COLOURS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const particle of this.particles) {
            particle.draw();
        }

        for (const explosion of this.explosions) {
            explosion.draw();
        }
    }
}

// ---------------------------------------------------------------------------

// Animation runner that manages time-based updates.
class AnimationRunner {
    constructor(effect, timeStep) {
        this.effect = effect;
        this.timeStep = timeStep;
        this.previousTimestamp = 0;
        this.timeSinceLastStep = 0;
        this.loop = this.loop.bind(this);
    }

    start() {
        requestAnimFrame(this.loop);
    }

    loop(currentTimestamp) {
        const timeDelta = currentTimestamp - this.previousTimestamp;
        this.previousTimestamp = currentTimestamp;
        this.timeSinceLastStep += timeDelta;

        if (this.timeSinceLastStep > this.timeStep) {
            this.timeSinceLastStep = 0;
            this.effect.update();
            this.effect.draw();
        }

        requestAnimFrame(this.loop);
    }
}

// ---------------------------------------------------------------------------

// Helper functions.
class Helper {
    static random(start, finish) {
        return Math.floor(Math.random() * (finish - start + 1)) + start;
    }

    static getRandomColour() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
}

//  Initialise the fireworks system when the window loads.
window.addEventListener('load', () => {
    const canvas = document.getElementById(CONFIG.CANVAS_ID);
    if (!canvas) {
        console.error(`Canvas element with id="${CONFIG.CANVAS_ID}" not found.`);
        return;
    }

    const ctx = canvas.getContext('2d');
    const fireworksSystem = new FireworksSystem(ctx, canvas);
    new AnimationRunner(fireworksSystem, CONFIG.TIME_STEP).start();
});

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
