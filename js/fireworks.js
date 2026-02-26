// Enable strict mode for cleaner, safer JavaScript.
'use strict';

// ---------------------------------------------------------------------------
// CONFIG
// All the tunable numbers live here — speeds, sizes, counts, colours.
// Keep magic numbers out of the classes below.
// ---------------------------------------------------------------------------

const CONFIG = Object.freeze({
    CANVAS_ID: 'canvas-fireworks',
    SPAWN_PROBABILITY: 0.025, // Chance to spawn a rising particle each frame.
    SCREEN_BUFFER: 10,        // How far off-screen a particle can go before it's removed.
    TIME_STEP: 8,             // ms between updates. Bump this up to slow things down.
    // Explosion particles
    EXPLOSION: {
        GRAVITY: 0.01,        // Downward pull on explosion particles.
        MAX_PARTICLES: 20,    // How many particles per explosion.
        LIFE_RANGE: [30, 80]  // Min/max lifespan of explosion particles.
    },
    // Rising particles
    RISE: {
        VEL_Y: -3,                // How fast they rise.
        VEL_X_RANGE: [-0.5, 0.5], // A bit of random horizontal drift.
        LIFE_RANGE: [40, 70]      // Min/max lifespan of rising particles.
    },
    COLOURS: {
        BACKGROUND: 'rgba(0, 0, 0, 0.1)' // Semi-transparent fill each frame — lower alpha = longer trails.
    }
});

// ---------------------------------------------------------------------------
// ENTITY
// A single moving point with basic physics and a lifespan.
// Used for both rising particles and explosion fragments.
// ---------------------------------------------------------------------------

class Particle {
    constructor(x, y, velX, velY, accX, accY, lifeSpan, colour, ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;

        this.width = 3;
        this.height = 3;
        this.isDead = false;

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

        // Tick down the lifespan — mark as dead when it runs out.
        this.lifeSpan--;
        if (this.lifeSpan <= 0) {
            this.isDead = true;
        }

        // Also mark as dead if it's drifted off screen.
        if (this.posY > this.canvas.height + CONFIG.SCREEN_BUFFER ||
            this.posX < -CONFIG.SCREEN_BUFFER ||
            this.posX > this.canvas.width + CONFIG.SCREEN_BUFFER
        ) {
            this.isDead = true;
        }
    }

    draw() {
        this.ctx.fillStyle = this.colour;
        this.ctx.fillRect(this.posX, this.posY, this.width, this.height);
    }
}

// ---------------------------------------------------------------------------
// EXPLOSION
// Spawns a burst of particles that drift outward and fade.
// ---------------------------------------------------------------------------

class Explosion {
    constructor(x, y, colour, ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.maxParticles = CONFIG.EXPLOSION.MAX_PARTICLES;
        this.particles = [];
        this.lifeSpan = Helper.random(
            CONFIG.EXPLOSION.LIFE_RANGE[0],
            CONFIG.EXPLOSION.LIFE_RANGE[1]
        );
        this.primaryColour = colour;

        // Fan particles out in a circle.
        for (let i = this.maxParticles; i--;) {
            const angle = (i * Math.PI * 2) / this.maxParticles;
            const velX = Math.sin(angle);
            const velY = Math.cos(angle);
            const accX = 0;
            const accY = CONFIG.EXPLOSION.GRAVITY;
            const lifeSpan = Helper.random(this.lifeSpan, this.lifeSpan + 30);
            // Every third particle gets a random colour for a bit of variety.
            const colour = i % 3 ? this.primaryColour : Helper.getRandomColour();

            this.particles.push(
                new Particle(
                    this.x,
                    this.y,
                    velX,
                    velY,
                    accX,
                    accY,
                    lifeSpan,
                    colour,
                    this.ctx,
                    this.canvas
                )
            );
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();

            // Remove dead particles.
            if (this.particles[i].isDead) {
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
// SCENE
// Keeps track of all active rising particles and explosions.
// When a rising particle dies, it's swapped out for an explosion at that spot.
// ---------------------------------------------------------------------------

class FireworksScene {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.particles = [];
        this.explosions = [];
    }

    update() {
        // Maybe spawn a new rising particle this frame.
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

        // Update rising particles — when one dies, trigger an explosion at its position.
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();

            if (this.particles[i].isDead) {
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

        // Update explosions — remove them once all their particles are gone.
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].update();
            if (this.explosions[i].particles.length === 0) {
                this.explosions.splice(i, 1);
            }
        }
    }

    draw() {
        // Lay down a semi-transparent fill each frame — this is what creates the trails.
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
// LOOP
// Fixed-timestep animation loop — no need to touch this.
// Just pass it a Scene with update() and draw() and it handles the rest.
// ---------------------------------------------------------------------------

class Loop {
    constructor(scene, timeStep) {
        this.scene = scene;
        this.timeStep = timeStep;
        this.lastTime = 0;
        this.accumulator = 0;
        this.tick = this.tick.bind(this);
    }

    start() {
        this.rafId = requestAnimFrame(this.tick);
    }

    // Not used here — call this if you ever need to halt the loop.
    stop() {
        cancelAnimationFrame(this.rafId);
    }

    tick(currentTimestamp) {
        const timeDelta = currentTimestamp - this.lastTime;
        this.lastTime = currentTimestamp;
        this.accumulator += timeDelta;

        // Only update and draw once enough time has built up.
        if (this.accumulator > this.timeStep) {
            this.accumulator = 0;
            this.scene.update();
            this.scene.draw();
        }

        this.rafId = requestAnimFrame(this.tick);
    }
}

// ---------------------------------------------------------------------------
// HELPER
// Pure utility methods — nothing project-specific goes in here.
// ---------------------------------------------------------------------------

class Helper {
    static random(start, finish) {
        return Math.floor(Math.random() * (finish - start + 1)) + start;
    }

    // Random hex colour.
    static getRandomColour() {
        const letters = '0123456789ABCDEF';
        let colour = '#';
        for (let i = 0; i < 6; i++) {
            colour += letters[Math.floor(Math.random() * 16)];
        }
        return colour;
    }
}

// ---------------------------------------------------------------------------

// Kick everything off once the page has loaded.
window.addEventListener('load', () => {
    const canvas = document.getElementById(CONFIG.CANVAS_ID);
    if (!canvas) {
        console.error(`Canvas element with id="${CONFIG.CANVAS_ID}" not found.`);
        return;
    }

    const ctx = canvas.getContext('2d');
    const scene = new FireworksScene(ctx, canvas);
    new Loop(scene, CONFIG.TIME_STEP).start();
});

// Polyfill for cross-browser requestAnimationFrame support.
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
