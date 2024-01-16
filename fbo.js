import * as THREE from "three";
import { WebGLRenderTarget } from "three";
import { FloatType, RGBAFormat, NearestFilter } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Pane } from "tweakpane";
export default class Flowmap {
	constructor(renderer, { size = 1, vVelocity, vPosition, uniform = { value: null } } = {}) {
		this.params = {
			alpha: 0.9,
			dissipation: 0.98,
			falloff: 0.15,
			size: 1,
		};
		this.renderer = renderer;
		this.size = size;
		this.aspect = window.innerWidth / window.innerHeight;

		this.uniform = uniform;

		this.vVelocity = vVelocity || new THREE.Vector2();
		this.vPosition = vPosition || new THREE.Vector2();

		this.options = {
			width: this.size,
			height: this.size,
			type: THREE.FloatType,
			format: THREE.RGBAFormat,
			minFilter: THREE.LinearFilter,
			magFilter: THREE.NearestFilter,
			depthBuffer: false,
			stencilBuffer: false,
		};

		this.fbo = {
			read: new WebGLRenderTarget(this.size, this.size, this.options),
			write: new WebGLRenderTarget(this.size, this.size, this.options),
			swap: () => {
				[this.fbo.read, this.fbo.write] = [this.fbo.write, this.fbo.read];
				this.uniform = this.fbo.read.texture;
			},
		};
		this.fbo.swap();

		this.scene = new THREE.Scene();
		this.camera = new THREE.OrthographicCamera(
			-this.size / 2,
			this.size / 2,
			this.size / 2,
			-this.size / 2,
			0.01,
			1000
		);
		this.camera.position.z = 1;

		/**
		 * Ojbects
		 */
		this.geometry = new THREE.PlaneGeometry(this.size, this.size);
		this.flowmapMaterial = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				tMap: { value: this.uniform },

				uFalloff: { value: this.params.falloff },
				uDissipation: { value: this.params.dissipation },
				uAlpha: { value: this.params.alpha },

				uAspect: { value: this.aspect },
				uVelocity: { value: this.vVelocity },
				uPosition: { value: this.vPosition },
			},
			depthTest: false,
		});
		this.flowmapMaterial.needsUpdate = true;
		this.mesh = new THREE.Mesh(this.geometry, this.flowmapMaterial);
		this.scene.add(this.mesh);

		this.initPane();
	}

	get texture() {
		return this.fbo.read.texture;
	}

	render() {
		this.renderer.setRenderTarget(this.fbo.write);
		this.renderer.render(this.scene, this.camera);
		this.renderer.setRenderTarget(null);
		this.fbo.swap();
		this.flowmapMaterial.uniforms.tMap.value = this.uniform;
	}

	initPane() {
		const pane = new Pane();
		pane.addBinding(this.params, "dissipation", { min: 0, max: 1 });
		pane.addBinding(this.params, "falloff", { min: 0, max: 1 });
		pane.on("change", () => {
			this.flowmapMaterial.uniforms.uAlpha.value = this.params.alpha;
			this.flowmapMaterial.uniforms.uDissipation.value = this.params.dissipation;
			this.flowmapMaterial.uniforms.uFalloff.value = this.params.falloff;
		});
	}
}

const vertexShader = /* glsl */ `
    uniform float uFalloff;
	varying vec2 vUv;

    void main() {
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		vUv = uv;
    }
`;

const fragmentShader = /* glsl */ `
    precision highp float;

    uniform sampler2D tMap;

    uniform float uFalloff;
    uniform float uAlpha;
    uniform float uDissipation;
    
    uniform float uAspect;
    uniform vec2 uPointer;
    uniform vec2 uPosition;
    uniform vec2 uVelocity;

    varying vec2 vUv;

    void main() {
        vec4 color = texture2D(tMap, vUv) * uDissipation;

        vec2 cursor = vUv - uPosition;
        cursor.x *= uAspect;


        vec3 stamp = vec3(uVelocity * vec2(1.0), 1.0 - pow(1.0 - min(1.0, length(uVelocity)), 3.0));
        float falloff = smoothstep(uFalloff, 0.0, length(cursor)) * uAlpha;

		color.rgb = mix(color.rgb, stamp, vec3(falloff));

        gl_FragColor = color;
    }
`;
