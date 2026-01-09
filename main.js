/**
 * sustain.brussels - Presentation Background Animation
 * Three.js implementation for looping video background
 * Duration: ~25 seconds with seamless loop
 */

import * as THREE from 'three';

// ============================================
// Configuration
// ============================================
const CONFIG = {
    // Timing (in seconds)
    duration: {
        total: 25,
        seq1: { start: 0, end: 4 },      // Enjeux
        seq2: { start: 4, end: 10 },     // Ecosystem
        seq3: { start: 10, end: 20 },    // Leviers
        seq4: { start: 20, end: 25 }     // Impact
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
        nodeCount: 25,
        connectionDistance: 3.5
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
let geometricShapes = [];
let currentSequence = -1;

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
    createParticles();
    createNetwork();
    createGeometricShapes();
    createAmbientLight();

    // Events
    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();
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
        const radius = 5 + Math.random() * 8;

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

    // Create line connections
    updateNetworkConnections();
}

function updateNetworkConnections() {
    // Remove old lines
    if (networkLines) {
        scene.remove(networkLines);
        networkLines.geometry.dispose();
    }

    const positions = [];
    const colors = [];
    const colorPrimary = new THREE.Color(CONFIG.colors.primary);
    const colorSecondary = new THREE.Color(CONFIG.colors.secondary);

    for (let i = 0; i < networkNodes.length; i++) {
        for (let j = i + 1; j < networkNodes.length; j++) {
            const distance = networkNodes[i].position.distanceTo(networkNodes[j].position);

            if (distance < CONFIG.network.connectionDistance) {
                positions.push(
                    networkNodes[i].position.x,
                    networkNodes[i].position.y,
                    networkNodes[i].position.z,
                    networkNodes[j].position.x,
                    networkNodes[j].position.y,
                    networkNodes[j].position.z
                );

                // Gradient color based on distance
                const t = distance / CONFIG.network.connectionDistance;
                colors.push(
                    colorPrimary.r, colorPrimary.g, colorPrimary.b,
                    colorSecondary.r, colorSecondary.g, colorSecondary.b
                );
            }
        }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
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
    } else {
        newSequence = 4;
    }

    if (newSequence !== currentSequence) {
        transitionSequence(currentSequence, newSequence);
        currentSequence = newSequence;
    }
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

function triggerTransitionEffects() {
    transitionIntensity = 1;
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
    const seq = CONFIG.duration.seq2;
    let networkOpacity = 0;

    // Fade in during sequence 2, fade out after
    if (loopTime >= seq.start - 0.5 && loopTime < seq.end + 1) {
        const fadeInProgress = Math.min(1, (loopTime - seq.start + 0.5) / 1);
        const fadeOutProgress = loopTime > seq.end ? Math.max(0, 1 - (loopTime - seq.end)) : 1;
        networkOpacity = fadeInProgress * fadeOutProgress * 0.8;
    }

    // Update node positions and opacity
    networkNodes.forEach((node, i) => {
        const ud = node.userData;

        // Gentle floating motion
        node.position.x = ud.originalPosition.x + Math.sin(time * ud.speed + ud.phase) * 0.3;
        node.position.y = ud.originalPosition.y + Math.cos(time * ud.speed * 0.7 + ud.phase) * 0.3;

        node.material.opacity = networkOpacity;
    });

    // Update line opacity
    if (networkLines && networkLines.material) {
        networkLines.material.opacity = networkOpacity * 0.4;
    }

    // Update connections occasionally
    if (Math.floor(time * 2) % 2 === 0) {
        updateNetworkConnections();
    }
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
}

// ============================================
// Start
// ============================================
init();

// Log for debugging
console.log('sustain.brussels animation initialized');
console.log(`Loop duration: ${CONFIG.duration.total} seconds`);
