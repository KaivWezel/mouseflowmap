import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Flowmap from "./fbo";
import lerp from "./utils/lerp";
import { WebGLRenderTarget } from "three";
import map from "./utils/map";
import FBOReader from "./fbo-reader";

const vertexShader = /* glsl */ `
    uniform float uFalloff;
	varying vec2 vUv;

    void main() {
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		vUv = uv;
    }
`;

const fragmentShader = /* glsl */ `
	varying vec2 vUv;
	uniform float uDissipation;
	uniform float uAspect;
	uniform float uTime;

	uniform vec2 uPointer;
	uniform vec2 uVelocity;
	uniform vec2 uPosition;
	uniform float uFalloff;

	uniform sampler2D uTexture;

	float sdCircle( vec2 p, float r ) {
    	return length(p) - r;
	}

	float fill(float x, float size, float edge) {
    return 1.0 - smoothstep(size - edge, size + edge, x);
	}

	void main() {
        vec4 color = texture2D(uTexture, vUv) * uDissipation;

        vec2 cursor = vUv - uPosition;
        cursor.x *= uAspect;

        vec3 stamp = vec3(uVelocity * vec2(1, -1), 1.0 - pow(1.0 - min(1.0, length(uVelocity)), 3.0));
        float falloff = smoothstep(uFalloff, 0.0, length(cursor)) * 1.0;

        color.rgb = mix(color.rgb, stamp, vec3(falloff));

        gl_FragColor = color;
    }
`;

export default class Base {
	constructor(options) {
		// Reference to dom element

		this.dom = options.dom;
		this.width = this.dom.offsetWidth;
		this.height = this.dom.offsetHeight;

		// Adding canvas to dom
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setSize(this.width, this.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.dom.appendChild(this.renderer.domElement);

		/**
		 * Textures
		 */
		this.textureLoader = new THREE.TextureLoader();
		this.texture = this.textureLoader.load("/fluid.jpg");
		this.flowmap = this.textureLoader.load("/flowmap.jpg");

		/**
		 * Scene
		 */
		this.scene = new THREE.Scene();
		this.clock = new THREE.Clock();

		/**
		 * Camera
		 */
		this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 100);
		this.camera.position.z = 3;

		/**
		 * Controls
		 */
		this.controls = null;

		/**
		 * Mouse vectors
		 */
		this.v_Pointer = new THREE.Vector2(0, 0);
		this.v_PointerLast = new THREE.Vector2(0, 0);
		this.v_velocity = new THREE.Vector2(0, 0);
		this.v_velocity.needsUpdate = true;
		this.position = new THREE.Vector2(0, 0);

		/**
		 * FBOs
		 */
		this.flowmap = new Flowmap(this.renderer, { size: 256, vVelocity: this.v_velocity, vPosition: this.position });

		/**
		 * Ojbects
		 */
		this.geometry = new THREE.PlaneGeometry(1, 1);
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				tMap: { value: this.flowmap.texture },
			},

			vertexShader: /* glsl */ `
			precision mediump float;
			precision mediump int;
			
			varying vec2 vUv;
			
			void main() {
				vUv = uv;
				vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
				gl_Position = projectionMatrix * mvPosition;
			}
			`,

			fragmentShader: /* glsl */ `
			precision mediump float;
			varying vec2 vUv;
			uniform sampler2D tMap;
			// uniform float uAlpha;
			void main() {
				vec4 c = texture2D(tMap, vUv);
				float a = 1.; // tDiffuse.a * uAlpha;
				gl_FragColor = vec4(c.rgb, a);
			}
			`,
		});
		this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ map: this.flowmap.texture }));

		/**
		 * Init
		 */
		this.addObjects();
		this.addControls();
		this.setupMouseListener();
		this.render();
	}
	addObjects() {
		this.scene.add(this.mesh);
	}

	addControls() {
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
	}

	onMouseMove(e) {
		const { clientX: x, clientY: y } = e;
		// save last coordinates
		this.v_PointerLast.x = this.v_Pointer.x;
		this.v_PointerLast.y = this.v_Pointer.y;

		// save new coordinates
		this.v_Pointer.x = x;
		this.v_Pointer.y = y;

		const mapX = map(this.v_Pointer.x, 0, this.width, 0, 1);
		const mapY = map(this.v_Pointer.y, 0, this.height, 0, 1);

		this.position.set(mapX, 1.0 - mapY);
	}

	calcVelocity(dt) {
		// calculate pionter velocity in time
		const dx = this.v_Pointer.x - this.v_PointerLast.x;
		const dy = this.v_Pointer.y - this.v_PointerLast.y;

		const velX = Math.round(dx / dt);
		const velY = Math.round(dy / dt);

		this.v_velocity.set(velX, velY);
	}

	/**
	 * Resize handling
	 */
	setupResize() {
		window.addEventListener("resize", this.onResize.bind(this));
	}

	setupMouseListener() {
		window.addEventListener("mousemove", this.onMouseMove.bind(this));
	}

	updateUniforms() {
		const deltaTime = this.clock.getDelta();
		// this.material.uniforms.uTime.value += deltaTime;
		this.flowmap.vVelocity.set(this.v_velocity.x, this.v_velocity.y);
		this.flowmap.vPosition.set(this.position.x, this.position.y);
	}

	onResize() {
		this.width = this.dom.offsetWidth;
		this.height = this.dom.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.camera.updateProjectionMatrix();
	}

	render() {
		const deltaTime = this.clock.getDelta();
		this.controls.update();
		this.calcVelocity(deltaTime);
		// this.updateUniforms();

		this.flowmap.render();
		this.renderer.render(this.scene, this.camera);

		window.requestAnimationFrame(this.render.bind(this));
	}
}

const canvas = document.querySelector(".webgl");
const webGL = new Base({ dom: canvas });

const data = document.querySelector(".data");
