/**
 * sustain.brussels - Presentation Background Animation
 * Three.js implementation for looping video background
 * Duration: ~25 seconds with seamless loop
 */

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// ============================================
// Configuration
// ============================================
const CONFIG = {
    // Timing (in seconds)
    duration: {
        total: 30,
        seq1: { start: 0, end: 4 },      // Enjeux
        seq2: { start: 4, end: 10 },     // Ecosystem
        seq3: { start: 10, end: 18 },    // Leviers
        seq4: { start: 18, end: 23 },    // Impact
        seq5: { start: 23, end: 30 }     // Partners
    },
    // Colors
    colors: {
        background: 0x0a1628,
        primary: 0x00d4aa,
        secondary: 0x4a9eff,
        accent: 0x7c5cff,
        white: 0xffffff
    },
    // Particles
    particles: {
        count: 800,
        size: 2,
        speed: 0.0003
    },
    // Network
    network: {
        nodeCount: 40,
        connectionDistance: 8
    }
};

// ============================================
// Global Variables
// ============================================
let scene, camera, renderer;
let clock, startTime;
let particles, particlesMaterial;
let networkNodes = [];
let networkLines;
let networkConnections = []; // Store individual connection states
let geometricShapes = [];
let currentSequence = -1;
let svgGroups = []; // Store loaded SVG groups
let svgLoader;

// Matrix background
let matrixCanvas, matrixCtx;
let matrixColumns = [];
const MATRIX_CHARS = '01アイウエオカキクケコ<>{}[]|/\\+=*';
const MATRIX_CONFIG = {
    fontSize: 14,
    opacity: 0.03,
    speed: 0.1,
    color: '#00d4aa'
};

// ============================================
// Initialization
// ============================================
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.background);
    scene.fog = new THREE.FogExp2(CONFIG.colors.background, 0.035);

    // Camera
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 30;

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Clock
    clock = new THREE.Clock();
    startTime = 0;

    // Create elements
    createMatrixBackground();
    createParticles();
    createNetwork();
    createGeometricShapes();
    createAmbientLight();
    initSVGLoader();

    // Events
    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();
}

// ============================================
// Matrix Background (Very subtle)
// ============================================
function createMatrixBackground() {
    matrixCanvas = document.createElement('canvas');
    matrixCanvas.id = 'matrix-bg';
    matrixCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 5;
        opacity: ${MATRIX_CONFIG.opacity};
        pointer-events: none;
    `;
    document.body.appendChild(matrixCanvas);

    matrixCtx = matrixCanvas.getContext('2d');
    resizeMatrixCanvas();

    // Initialize columns
    initMatrixColumns();
}

function resizeMatrixCanvas() {
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;
    initMatrixColumns();
}

function initMatrixColumns() {
    const columnCount = Math.floor(matrixCanvas.width / MATRIX_CONFIG.fontSize);
    matrixColumns = [];
    for (let i = 0; i < columnCount; i++) {
        matrixColumns.push({
            y: Math.random() * matrixCanvas.height,
            speed: 0.3 + Math.random() * 0.7,
            chars: Array.from({ length: 25 }, () =>
                MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
            )
        });
    }
}

function updateMatrixBackground() {
    // Fade effect (higher = shorter trails, less bleeding)
    matrixCtx.fillStyle = 'rgba(10, 22, 40, 0.25)';
    matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

    matrixCtx.font = `${MATRIX_CONFIG.fontSize}px monospace`;

    matrixColumns.forEach((col, i) => {
        const x = i * MATRIX_CONFIG.fontSize;

        // Move column down
        col.y += MATRIX_CONFIG.speed * col.speed * MATRIX_CONFIG.fontSize;

        // Reset when off screen
        if (col.y > matrixCanvas.height + 300) {
            col.y = -200;
            col.speed = 0.3 + Math.random() * 0.7;
        }

        // Draw characters
        for (let j = 0; j < 15; j++) {
            const charY = col.y - j * MATRIX_CONFIG.fontSize;
            if (charY > -50 && charY < matrixCanvas.height + 50) {
                // Head is brighter
                if (j === 0) {
                    matrixCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                } else if (j < 3) {
                    matrixCtx.fillStyle = MATRIX_CONFIG.color;
                } else {
                    const alpha = Math.max(0.1, 0.7 - j / 15);
                    matrixCtx.fillStyle = `rgba(0, 212, 170, ${alpha})`;
                }

                // Occasionally change character
                if (Math.random() < 0.01) {
                    col.chars[j] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
                }

                matrixCtx.fillText(col.chars[j], x, charY);
            }
        }
    });
}

// ============================================
// Particles System (Background data flow)
// ============================================
function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.particles.count * 3);
    const velocities = new Float32Array(CONFIG.particles.count * 3);
    const colors = new Float32Array(CONFIG.particles.count * 3);
    const sizes = new Float32Array(CONFIG.particles.count);

    const colorPrimary = new THREE.Color(CONFIG.colors.primary);
    const colorSecondary = new THREE.Color(CONFIG.colors.secondary);
    const colorAccent = new THREE.Color(CONFIG.colors.accent);
    const colorOptions = [colorPrimary, colorSecondary, colorAccent];

    for (let i = 0; i < CONFIG.particles.count; i++) {
        const i3 = i * 3;

        // Position - spread in a large sphere
        positions[i3] = (Math.random() - 0.5) * 80;
        positions[i3 + 1] = (Math.random() - 0.5) * 80;
        positions[i3 + 2] = (Math.random() - 0.5) * 80;

        // Velocity for animation
        velocities[i3] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

        // Color
        const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        // Size
        sizes[i] = Math.random() * CONFIG.particles.size + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.userData.velocities = velocities;

    // Shader material for particles
    particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0.6 }
        },
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            uniform float uTime;

            void main() {
                vColor = color;
                vec3 pos = position;

                // Subtle wave motion
                pos.x += sin(uTime * 0.5 + position.y * 0.1) * 0.3;
                pos.y += cos(uTime * 0.3 + position.x * 0.1) * 0.3;

                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            uniform float uOpacity;

            void main() {
                float dist = distance(gl_PointCoord, vec2(0.5));
                if (dist > 0.5) discard;

                float alpha = smoothstep(0.5, 0.0, dist) * uOpacity;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, particlesMaterial);
    scene.add(particles);
}

// ============================================
// Network Visualization (Ecosystem)
// ============================================
function createNetwork() {
    const nodeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const nodeMaterial = new THREE.MeshBasicMaterial({
        color: CONFIG.colors.primary,
        transparent: true,
        opacity: 0
    });

    // Create nodes
    for (let i = 0; i < CONFIG.network.nodeCount; i++) {
        const node = new THREE.Mesh(nodeGeometry.clone(), nodeMaterial.clone());

        // Distribute nodes in 3D space
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const radius = 8 + Math.random() * 14;

        node.position.x = radius * Math.sin(phi) * Math.cos(theta);
        node.position.y = radius * Math.sin(phi) * Math.sin(theta);
        node.position.z = radius * Math.cos(phi) - 5;

        node.userData = {
            originalPosition: node.position.clone(),
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 0.5
        };

        networkNodes.push(node);
        scene.add(node);
    }

    // Initialize connection states
    initNetworkConnections();
}

function initNetworkConnections() {
    // Initialize connection states for all possible node pairs
    networkConnections = [];
    for (let i = 0; i < networkNodes.length; i++) {
        for (let j = i + 1; j < networkNodes.length; j++) {
            networkConnections.push({
                nodeA: i,
                nodeB: j,
                currentOpacity: 0,
                targetOpacity: 0,
                delay: Math.random() * 200, // Random delay for staggered appearance
                phase: Math.random() * Math.PI * 2, // For subtle pulsing
                active: false,
                // Lifecycle properties
                birthTime: -1, // When the connection started appearing (-1 = not born yet)
                lifetime: 1.5 + Math.random() * 3, // How long the connection stays visible (1.5-4.5s)
                cooldown: 1, // Time before connection can reappear
                cooldownDuration: 0.5 + Math.random() * 1.5 // Random cooldown (0.5-2s)
            });
        }
    }
}

function updateNetworkConnections(time, baseOpacity, isFadingOut = false) {
    // Calculate which connections should be active based on distance and lifecycle
    networkConnections.forEach(conn => {
        const nodeA = networkNodes[conn.nodeA];
        const nodeB = networkNodes[conn.nodeB];
        const distance = nodeA.position.distanceTo(nodeB.position);

        // If network is fading out, force all connections to fade out together
        if (isFadingOut) {
            conn.targetOpacity = 0;
            // Reset lifecycle so connections are ready for next appearance
            conn.birthTime = -1;
            conn.cooldown = 0;
        }
        // Check if connection is in cooldown
        else if (conn.cooldown > 0) {
            conn.cooldown -= 0.016; // Approximate frame time
            conn.targetOpacity = 0;
        }
        // Check if connection can be active (within distance and base opacity)
        else if (distance < CONFIG.network.connectionDistance && baseOpacity > 0) {
            // Closer connections are more visible
            const distanceFactor = 1 - (distance / CONFIG.network.connectionDistance);

            // Birth the connection if not yet born
            if (conn.birthTime < 0) {
                // Random chance to be born (not all connections appear at once)
                if (Math.random() < 0.02) { // 2% chance per frame to start
                    conn.birthTime = time;
                    // Randomize lifetime for variety
                    conn.lifetime = 1.5 + Math.random() * 3;
                }
            }

            // If connection is born, calculate its lifecycle
            if (conn.birthTime >= 0) {
                const age = time - conn.birthTime;

                // Check if connection has exceeded its lifetime
                if (age > conn.lifetime) {
                    // Connection dies - start cooldown
                    conn.birthTime = -1;
                    conn.cooldown = conn.cooldownDuration;
                    // Randomize next cooldown duration
                    conn.cooldownDuration = 0.5 + Math.random() * 1.5;
                    conn.targetOpacity = 0;
                } else {
                    // Connection is alive - calculate opacity with fade in/out
                    const fadeInDuration = 1.2; // Slow fade in (1.2 seconds)
                    const fadeOutDuration = 0.8;
                    const fadeOutStart = conn.lifetime - fadeOutDuration;

                    let lifeFactor = 1;
                    if (age < fadeInDuration) {
                        // Slow fade in with easing (ease-out curve for smoother start)
                        const t = age / fadeInDuration;
                        lifeFactor = t * t * (3 - 2 * t); // Smooth step easing
                    } else if (age > fadeOutStart) {
                        // Fade out
                        const t = (age - fadeOutStart) / fadeOutDuration;
                        lifeFactor = 1 - (t * t); // Ease in for fade out
                    }

                    conn.targetOpacity = baseOpacity * distanceFactor * 0.7 * lifeFactor;
                    conn.active = true;
                }
            } else {
                conn.targetOpacity = 0;
                conn.active = false;
            }
        } else {
            // Not in range or base opacity is 0
            conn.targetOpacity = 0;
            conn.active = false;
            // Reset birth time if out of range
            if (distance >= CONFIG.network.connectionDistance) {
                conn.birthTime = -1;
            }
        }

        // Add subtle pulsing effect (only when visible)
        if (conn.targetOpacity > 0) {
            const pulse = 0.85 + Math.sin(time * 0.8 + conn.phase) * 0.15;
            conn.targetOpacity *= pulse;
        }

        // Smooth transition towards target opacity (slower fade in, faster fade out)
        // Use faster fade out when network is globally fading out
        let transitionSpeed;
        if (conn.currentOpacity < conn.targetOpacity) {
            transitionSpeed = 0.015; // Slow fade in
        } else if (isFadingOut) {
            transitionSpeed = 0.08; // Fast fade out when network disappears
        } else {
            transitionSpeed = 0.04; // Normal fade out
        }
        conn.currentOpacity += (conn.targetOpacity - conn.currentOpacity) * transitionSpeed;

        // Clamp very small values to 0
        if (conn.currentOpacity < 0.001) {
            conn.currentOpacity = 0;
        }
    });

    // Rebuild line geometry with individual opacities encoded in vertex colors alpha
    rebuildNetworkLines();
}

function rebuildNetworkLines() {
    // Remove old lines
    if (networkLines) {
        scene.remove(networkLines);
        networkLines.geometry.dispose();
    }

    const positions = [];
    const colors = [];
    const colorPrimary = new THREE.Color(CONFIG.colors.primary);
    const colorSecondary = new THREE.Color(CONFIG.colors.secondary);

    networkConnections.forEach(conn => {
        if (conn.currentOpacity > 0.001) {
            const nodeA = networkNodes[conn.nodeA];
            const nodeB = networkNodes[conn.nodeB];

            positions.push(
                nodeA.position.x, nodeA.position.y, nodeA.position.z,
                nodeB.position.x, nodeB.position.y, nodeB.position.z
            );

            // Encode opacity in color brightness
            const opacity = conn.currentOpacity;
            colors.push(
                colorPrimary.r * opacity, colorPrimary.g * opacity, colorPrimary.b * opacity,
                colorSecondary.r * opacity, colorSecondary.g * opacity, colorSecondary.b * opacity
            );
        }
    });

    if (positions.length === 0) return;

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 1, // Full opacity since we control brightness via vertex colors
        blending: THREE.AdditiveBlending
    });

    networkLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(networkLines);
}

// ============================================
// Geometric Shapes (Abstract representations)
// ============================================
function createGeometricShapes() {
    // Hexagons representing structure
    const hexagonShape = createHexagonGeometry(1.5);
    const hexMaterial = new THREE.LineBasicMaterial({
        color: CONFIG.colors.primary,
        transparent: true,
        opacity: 0
    });

    for (let i = 0; i < 5; i++) {
        const hex = new THREE.LineLoop(hexagonShape.clone(), hexMaterial.clone());
        hex.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 30,
            -10 - Math.random() * 20
        );
        hex.rotation.z = Math.random() * Math.PI;
        hex.userData = {
            rotationSpeed: (Math.random() - 0.5) * 0.005,
            originalOpacity: 0.3 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2
        };
        geometricShapes.push(hex);
        scene.add(hex);
    }

    // Circles representing cycles/processes
    for (let i = 0; i < 4; i++) {
        const circleGeometry = new THREE.RingGeometry(1, 1.1, 64);
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.colors.secondary,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        circle.position.set(
            (Math.random() - 0.5) * 35,
            (Math.random() - 0.5) * 25,
            -15 - Math.random() * 15
        );
        circle.userData = {
            rotationSpeed: (Math.random() - 0.5) * 0.003,
            pulseSpeed: 1 + Math.random(),
            originalOpacity: 0.2 + Math.random() * 0.2,
            phase: Math.random() * Math.PI * 2
        };
        geometricShapes.push(circle);
        scene.add(circle);
    }
}

function createHexagonGeometry(radius) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        points.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
        ));
    }
    points.push(points[0].clone()); // Close the loop
    return new THREE.BufferGeometry().setFromPoints(points);
}

// ============================================
// SVG Loading and Display
// ============================================
function initSVGLoader() {
    svgLoader = new SVGLoader();
}

/**
 * Load an SVG file and add it to the scene
 * @param {string} path - Path to the SVG file (e.g., 'assets/svg/icon.svg')
 * @param {Object} options - Configuration options
 * @param {number} options.scale - Scale factor (default: 0.01)
 * @param {THREE.Vector3} options.position - Position in 3D space (default: 0,0,0)
 * @param {number} options.color - Color override (default: uses SVG colors)
 * @param {number} options.opacity - Opacity (default: 1)
 * @param {boolean} options.centerOrigin - Center the SVG on its origin (default: true)
 * @returns {Promise<THREE.Group>} - The loaded SVG group
 */
function loadSVG(path, options = {}) {
    const {
        scale = 0.01,
        position = new THREE.Vector3(0, 0, 0),
        color = null,
        opacity = 1,
        centerOrigin = true
    } = options;

    return new Promise((resolve, reject) => {
        svgLoader.load(
            path,
            (data) => {
                const paths = data.paths;
                const group = new THREE.Group();

                // Calculate bounding box for centering
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                paths.forEach((path) => {
                    const shapes = SVGLoader.createShapes(path);

                    shapes.forEach((shape) => {
                        // Get shape bounds
                        const points = shape.getPoints();
                        points.forEach(p => {
                            minX = Math.min(minX, p.x);
                            minY = Math.min(minY, p.y);
                            maxX = Math.max(maxX, p.x);
                            maxY = Math.max(maxY, p.y);
                        });

                        // Create mesh from shape
                        const geometry = new THREE.ShapeGeometry(shape);
                        const material = new THREE.MeshBasicMaterial({
                            color: color !== null ? color : (path.color ? path.color : CONFIG.colors.primary),
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: opacity
                        });

                        const mesh = new THREE.Mesh(geometry, material);
                        group.add(mesh);
                    });
                });

                // Center the SVG if requested
                if (centerOrigin) {
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;
                    group.children.forEach(child => {
                        child.position.x -= centerX;
                        child.position.y -= centerY;
                    });
                }

                // Apply transformations
                group.scale.set(scale, -scale, scale); // Flip Y for correct orientation
                group.position.copy(position);

                // Store reference and add to scene
                svgGroups.push(group);
                scene.add(group);

                console.log(`SVG loaded: ${path}`);
                resolve(group);
            },
            (xhr) => {
                // Progress callback
                console.log(`Loading SVG: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
            },
            (error) => {
                console.error(`Error loading SVG: ${path}`, error);
                reject(error);
            }
        );
    });
}

/**
 * Load multiple SVGs at once
 * @param {Array} svgConfigs - Array of {path, options} objects
 * @returns {Promise<THREE.Group[]>} - Array of loaded SVG groups
 */
function loadMultipleSVGs(svgConfigs) {
    return Promise.all(svgConfigs.map(config => loadSVG(config.path, config.options)));
}

/**
 * Remove an SVG group from the scene
 * @param {THREE.Group} group - The SVG group to remove
 */
function removeSVG(group) {
    const index = svgGroups.indexOf(group);
    if (index > -1) {
        svgGroups.splice(index, 1);
        scene.remove(group);
        // Dispose geometries and materials
        group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}

/**
 * Update SVG opacity (useful for animations)
 * @param {THREE.Group} group - The SVG group
 * @param {number} opacity - New opacity value (0-1)
 */
function setSVGOpacity(group, opacity) {
    group.traverse((child) => {
        if (child.material) {
            child.material.opacity = opacity;
        }
    });
}

// ============================================
// Lighting
// ============================================
function createAmbientLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
}

// ============================================
// Animation Loop
// ============================================
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();
    const loopTime = elapsedTime % CONFIG.duration.total;

    // Update matrix background
    updateMatrixBackground();

    // Update progress bar
    updateProgressBar(loopTime);

    // Determine current sequence
    updateSequence(loopTime);

    // Update particles
    updateParticles(elapsedTime);

    // Update network
    updateNetwork(elapsedTime, loopTime);

    // Update geometric shapes
    updateGeometricShapes(elapsedTime, loopTime);

    // Camera movement
    updateCamera(elapsedTime, loopTime);

    renderer.render(scene, camera);
}

function updateProgressBar(loopTime) {
    const progress = (loopTime / CONFIG.duration.total) * 100;
    document.querySelector('.progress-fill').style.width = `${progress}%`;
}

function updateSequence(loopTime) {
    let newSequence;

    if (loopTime < CONFIG.duration.seq1.end) {
        newSequence = 1;
    } else if (loopTime < CONFIG.duration.seq2.end) {
        newSequence = 2;
    } else if (loopTime < CONFIG.duration.seq3.end) {
        newSequence = 3;
    } else if (loopTime < CONFIG.duration.seq4.end) {
        newSequence = 4;
    } else {
        newSequence = 5;
    }

    if (newSequence !== currentSequence) {
        transitionSequence(currentSequence, newSequence);
        currentSequence = newSequence;
    }

    // Update logo animation based on loop time
    updateLogoAnimation(loopTime);
}

function transitionSequence(fromSeq, toSeq) {
    // Exit animation for current sequence
    if (fromSeq > 0) {
        const exitingEl = document.querySelector(`.seq-${fromSeq}`);
        if (exitingEl) {
            exitingEl.classList.add('exiting');
            exitingEl.classList.remove('active');

            // Clean up after exit animation
            setTimeout(() => {
                exitingEl.classList.remove('exiting');
            }, 600);
        }
    }

    // Enter animation for new sequence (slight delay for overlap)
    setTimeout(() => {
        const enteringEl = document.querySelector(`.seq-${toSeq}`);
        if (enteringEl) {
            enteringEl.classList.add('active');
        }
    }, 150);

    // Trigger camera/particle effects on transition
    triggerTransitionEffects();
}

let transitionIntensity = 0;
let lastLogoState = null;

function triggerTransitionEffects() {
    transitionIntensity = 1;
}

function updateLogoAnimation(loopTime) {
    const logoContainer = document.getElementById('logo-container');
    const seq5Element = document.querySelector('.seq-5');

    if (!logoContainer) return;

    const seq5 = CONFIG.duration.seq5;

    // Define timing thresholds
    const cloudStart = seq5.start;            // 23s - seq 5 starts, container hides, cloud appears
    const partnersHide = seq5.start + 4;      // 27s - partner logos fade out, sustain stays

    let newState;

    // Determine state based on loop time
    if (loopTime >= cloudStart) {
        // During sequence 5 - container hidden, cloud visible
        if (loopTime >= partnersHide) {
            newState = 'cloud-sustain-only';
        } else {
            newState = 'cloud-all';
        }
    } else {
        // During sequences 1-4 - container visible
        newState = 'container-visible';
    }

    // Only update if state changed
    if (newState !== lastLogoState) {
        // Remove all state classes
        logoContainer.classList.remove('position-bottom', 'position-hidden', 'logos-visible');
        if (seq5Element) {
            seq5Element.classList.remove('partners-hidden');
        }

        switch (newState) {
            case 'container-visible':
                // Container visible at bottom with all logos
                logoContainer.classList.add('position-bottom', 'logos-visible');
                break;

            case 'cloud-all':
                // Container hidden, cloud shows all logos
                logoContainer.classList.add('position-hidden');
                break;

            case 'cloud-sustain-only':
                // Container hidden, cloud shows only sustain
                logoContainer.classList.add('position-hidden');
                if (seq5Element) {
                    seq5Element.classList.add('partners-hidden');
                }
                break;
        }

        lastLogoState = newState;
    }
}

function updateParticles(time) {
    particlesMaterial.uniforms.uTime.value = time;

    // Base rotation
    particles.rotation.y = time * CONFIG.particles.speed;
    particles.rotation.x = Math.sin(time * 0.1) * 0.1;

    // Boost opacity during transitions
    if (transitionIntensity > 0) {
        particlesMaterial.uniforms.uOpacity.value = 0.6 + transitionIntensity * 0.25;
        transitionIntensity *= 0.95;
        if (transitionIntensity < 0.01) transitionIntensity = 0;
    } else {
        particlesMaterial.uniforms.uOpacity.value = 0.6;
    }
}

function updateNetwork(time, loopTime) {
    const seq2 = CONFIG.duration.seq2;
    const seq4 = CONFIG.duration.seq4;
    const seq5 = CONFIG.duration.seq5;
    let networkOpacity = 0;
    let activeSeqStart = 0;
    let isFadingOut = false;

    // Check if we're in sequence 2, or sequences 4-5 (continuous)
    const inSeq2 = loopTime >= seq2.start - 0.5 && loopTime < seq2.end + 1;
    const inSeq4to5 = loopTime >= seq4.start - 0.5 && loopTime < seq5.end;

    if (inSeq2) {
        activeSeqStart = seq2.start;
        const fadeInProgress = Math.min(1, (loopTime - seq2.start + 0.5) / 1.5);
        const fadeOutProgress = loopTime > seq2.end ? Math.max(0, 1 - (loopTime - seq2.end)) : 1;
        networkOpacity = fadeInProgress * fadeOutProgress * 0.8;
        isFadingOut = loopTime > seq2.end;
    } else if (inSeq4to5) {
        // Sequences 4 and 5 are continuous - no reset between them
        activeSeqStart = seq4.start;
        const fadeInProgress = Math.min(1, (loopTime - seq4.start + 0.5) / 1.5);
        // Fade out near end of loop for seamless transition
        const fadeOutProgress = loopTime > seq5.end - 1 ? Math.max(0, 1 - (loopTime - (seq5.end - 1))) : 1;
        networkOpacity = fadeInProgress * fadeOutProgress * 0.8;
        isFadingOut = loopTime > seq5.end - 1;
    }

    // Update node positions and opacity with staggered fade-in
    networkNodes.forEach((node, i) => {
        const ud = node.userData;

        // Gentle floating motion
        node.position.x = ud.originalPosition.x + Math.sin(time * ud.speed + ud.phase) * 0.3;
        node.position.y = ud.originalPosition.y + Math.cos(time * ud.speed * 0.7 + ud.phase) * 0.3;

        // Staggered node appearance based on index
        const nodeDelay = (i / networkNodes.length) * 1.5; // Spread over 1.5 seconds
        const timeSinceStart = loopTime - activeSeqStart + 0.5;
        const nodeProgress = Math.max(0, Math.min(1, (timeSinceStart - nodeDelay) / 0.5));

        // Smooth easing for node appearance
        const easedProgress = nodeProgress * nodeProgress * (3 - 2 * nodeProgress);
        node.material.opacity = networkOpacity * easedProgress;
    });

    // Update connections with smooth transitions (every frame for smooth animation)
    updateNetworkConnections(time, networkOpacity, isFadingOut);
}

function updateGeometricShapes(time, loopTime) {
    // Calculate visibility based on current sequence
    let shapeOpacity = 0.3;

    // More visible during seq 1 and 3
    if (loopTime < CONFIG.duration.seq1.end ||
        (loopTime >= CONFIG.duration.seq3.start && loopTime < CONFIG.duration.seq3.end)) {
        shapeOpacity = 0.5;
    }

    geometricShapes.forEach(shape => {
        const ud = shape.userData;

        // Rotation
        shape.rotation.z += ud.rotationSpeed;

        // Pulse effect
        const pulse = 0.8 + Math.sin(time * (ud.pulseSpeed || 1) + ud.phase) * 0.2;
        shape.scale.set(pulse, pulse, 1);

        // Opacity
        shape.material.opacity = ud.originalOpacity * shapeOpacity;
    });
}

function updateCamera(time, loopTime) {
    // Subtle camera movement
    const cameraSpeed = 0.05;

    // Gentle orbit
    camera.position.x = Math.sin(time * cameraSpeed) * 3;
    camera.position.y = Math.cos(time * cameraSpeed * 0.7) * 2;

    // Look at center
    camera.lookAt(0, 0, 0);

    // Dynamic zoom based on sequence
    let targetZ = 30;

    if (loopTime < CONFIG.duration.seq1.end) {
        // Slow zoom in during enjeux
        const progress = loopTime / CONFIG.duration.seq1.end;
        targetZ = 34 - progress * 4;
    } else if (loopTime < CONFIG.duration.seq2.end) {
        // Pull back for network view
        targetZ = 32;
    } else if (loopTime < CONFIG.duration.seq3.end) {
        // Standard view for levers
        targetZ = 30;
    } else {
        // Dramatic zoom in for impact
        const progress = (loopTime - CONFIG.duration.seq4.start) / (CONFIG.duration.seq4.end - CONFIG.duration.seq4.start);
        targetZ = 30 - progress * 6;
    }

    // Smooth zoom transition
    camera.position.z += (targetZ - camera.position.z) * 0.04;
}

// ============================================
// Window Resize
// ============================================
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeMatrixCanvas();
}

// ============================================
// Video Export
// ============================================
let isRecording = false;
let mediaRecorder;
let recordedChunks = [];

function startRecording() {
    if (isRecording) return;

    // Create a canvas that combines everything
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1920;
    exportCanvas.height = 1080;
    const exportCtx = exportCanvas.getContext('2d');

    const stream = exportCanvas.captureStream(60);
    mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000
    });

    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sustain-brussels-loop.webm';
        a.click();
        URL.revokeObjectURL(url);
        console.log('Recording saved!');

        // Remove recording indicator
        const indicator = document.getElementById('rec-indicator');
        if (indicator) indicator.remove();
    };

    // Reset to start of loop
    clock.start();

    // Add recording indicator
    const indicator = document.createElement('div');
    indicator.id = 'rec-indicator';
    indicator.innerHTML = '⏺ REC';
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff0000;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 14px;
        z-index: 9999;
        animation: blink 1s infinite;
    `;
    document.body.appendChild(indicator);

    // Add blink animation
    const style = document.createElement('style');
    style.textContent = '@keyframes blink { 50% { opacity: 0.5; } }';
    document.head.appendChild(style);

    isRecording = true;
    mediaRecorder.start();

    console.log('Recording started... Will stop after 25 seconds');

    // Capture frames
    function captureFrame() {
        if (!isRecording) return;

        // Draw background
        exportCtx.fillStyle = '#0a1628';
        exportCtx.fillRect(0, 0, 1920, 1080);

        // Draw matrix canvas
        exportCtx.globalAlpha = MATRIX_CONFIG.opacity;
        exportCtx.drawImage(matrixCanvas, 0, 0, 1920, 1080);
        exportCtx.globalAlpha = 1;

        // Draw Three.js canvas
        exportCtx.drawImage(renderer.domElement, 0, 0, 1920, 1080);

        // Draw text overlay using html2canvas would be complex,
        // so we capture the whole screen instead
        requestAnimationFrame(captureFrame);
    }
    captureFrame();

    // Stop after one full loop
    setTimeout(() => {
        stopRecording();
    }, CONFIG.duration.total * 1000 + 500);
}

function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    mediaRecorder.stop();
    console.log('Recording stopped');
}

// Keyboard shortcut: Press 'R' to start recording
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        startRecording();
    }
});

// ============================================
// Start
// ============================================
init();

// Log for debugging
console.log('sustain.brussels animation initialized');
console.log(`Loop duration: ${CONFIG.duration.total} seconds`);
console.log('Press R to start recording (25s video export)');
