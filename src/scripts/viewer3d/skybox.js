import { EventDispatcher, PlaneGeometry, ShaderMaterial, Mesh, Color, DoubleSide, FrontSide } from 'three';
import { AxesHelper, Group, LineBasicMaterial, BufferGeometry, BufferAttribute, LineSegments } from 'three';
import { Configuration, gridSpacing, viewBounds } from '../core/configuration';
import { EVENT_CHANGED } from '../core/events';

export class Skybox extends EventDispatcher {
    constructor(scene, renderer) {
        super();

        // Modern color scheme - clean white/light gray
        this.topColor = 0xffffff;
        this.bottomColor = 0xf5f5f5;
        this.verticalOffset = 500;
        this.exponent = 0.3;

        this.scene = scene;
        this.renderer = renderer;

        this.__gridSize = Configuration.getNumericValue(viewBounds) * 5.0;
        this.sky = null;
        this.__gridGroup = null;

        // Modern gradient shader
        this.plainVertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        this.plainFragmentShader = `
            uniform vec3 bottomColor;
            uniform vec3 topColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                float blend = max(pow(max(h, 0.0), exponent), 0.0);
                gl_FragColor = vec4(mix(bottomColor, topColor, blend), 1.0);
            }
        `;

        var uniforms = {
            topColor: { type: 'c', value: new Color(this.topColor) },
            bottomColor: { type: 'c', value: new Color(this.bottomColor) },
            offset: { type: 'f', value: this.verticalOffset },
            exponent: { type: 'f', value: this.exponent }
        };

        this.plainSkyMat = new ShaderMaterial({
            vertexShader: this.plainVertexShader,
            fragmentShader: this.plainFragmentShader,
            uniforms: uniforms,
            side: DoubleSide,
            depthWrite: false
        });
        this.plainSkyMat.name = 'PlainSkyMaterial';

        // Create sky dome
        this.__createSkyDome();

        // Create modern grid
        this.__createModernGrid();

        Configuration.getInstance().addEventListener(EVENT_CHANGED, this.__updateGrid.bind(this));
    }

    __createSkyDome() {
        // Large plane for background - simpler than sphere
        const skyGeo = new PlaneGeometry(this.__gridSize * 4, this.__gridSize * 4, 1, 1);
        this.sky = new Mesh(skyGeo, this.plainSkyMat);
        this.sky.rotation.x = -Math.PI / 2;
        this.sky.position.y = this.__gridSize;
        this.sky.renderOrder = -1000;
        this.scene.add(this.sky);
    }

    __createModernGrid() {
        if (this.__gridGroup) {
            this.scene.remove(this.__gridGroup);
            this.__gridGroup = null;
        }

        this.__gridGroup = new Group();
        this.__gridGroup.name = 'ModernGrid';

        const gridSize = this.__gridSize;
        const spacing = Configuration.getNumericValue(gridSpacing);

        // Main grid parameters
        const divisions = Math.round(gridSize / spacing);
        const halfSize = gridSize / 2;

        // Create custom grid with gradient opacity
        const gridGeometry = new BufferGeometry();
        const gridPositions = [];
        const gridColors = [];

        // Grid line colors
        const mainLineColor = new Color(0xd0d0d0);
        const subLineColor = new Color(0xe8e8e8);
        const accentColor = new Color(0x6366f1); // Purple accent for center lines

        // Create grid lines
        for (let i = 0; i <= divisions; i++) {
            const pos = -halfSize + (i / divisions) * gridSize;
            const isCenter = Math.abs(pos) < spacing * 0.5;
            const isMajor = i % 5 === 0;

            // Calculate fade based on distance from center
            const distFromCenter = Math.abs(pos) / halfSize;
            const fade = Math.max(0, 1 - distFromCenter * 0.3);

            let color;
            if (isCenter) {
                color = accentColor.clone();
            } else if (isMajor) {
                color = mainLineColor.clone();
            } else {
                color = subLineColor.clone();
            }

            // Apply fade
            color.multiplyScalar(fade * 0.8 + 0.2);

            // Horizontal line (along X)
            gridPositions.push(-halfSize, 0, pos);
            gridPositions.push(halfSize, 0, pos);
            gridColors.push(color.r, color.g, color.b);
            gridColors.push(color.r, color.g, color.b);

            // Vertical line (along Z)
            gridPositions.push(pos, 0, -halfSize);
            gridPositions.push(pos, 0, halfSize);
            gridColors.push(color.r, color.g, color.b);
            gridColors.push(color.r, color.g, color.b);
        }

        gridGeometry.setAttribute('position', new BufferAttribute(new Float32Array(gridPositions), 3));
        gridGeometry.setAttribute('color', new BufferAttribute(new Float32Array(gridColors), 3));

        const gridMaterial = new LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });

        const gridLines = new LineSegments(gridGeometry, gridMaterial);
        gridLines.position.y = -5;
        this.__gridGroup.add(gridLines);

        // Add ground plane with subtle gradient
        const groundGeo = new PlaneGeometry(gridSize, gridSize);
        const groundMat = new ShaderMaterial({
            uniforms: {
                centerColor: { value: new Color(0xfafafa) },
                edgeColor: { value: new Color(0xf0f0f0) },
                radius: { value: halfSize * 0.8 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 centerColor;
                uniform vec3 edgeColor;
                uniform float radius;
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    float dist = length(vPosition.xy);
                    float blend = smoothstep(0.0, radius, dist);
                    vec3 color = mix(centerColor, edgeColor, blend);
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            side: FrontSide,
            depthWrite: true
        });

        const ground = new Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -6;
        ground.receiveShadow = true;
        this.__gridGroup.add(ground);

        this.scene.add(this.__gridGroup);
        this.scene.needsUpdate = true;
    }

    __updateGrid(evt) {
        this.__gridSize = Configuration.getNumericValue(viewBounds) * 5.0;

        // Update sky
        if (this.sky) {
            this.sky.scale.set(this.__gridSize / 1000, this.__gridSize / 1000, 1);
        }

        this.__createModernGrid();
    }

    toggleEnvironment(flag) {
        // Keep grid visible in modern mode
        if (this.__gridGroup) {
            this.__gridGroup.visible = true;
        }
        this.scene.needsUpdate = true;
    }

    setEnvironmentMap(url) {
        // Not used in modern style
    }

    init() {
        this.toggleEnvironment(false);
    }
}
