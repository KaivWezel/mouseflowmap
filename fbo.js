import * as THREE from "three";
import { WebGLRenderTarget } from "three";
import { FloatType, RGBAFormat, NearestFilter } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
export default class Flowmap {
	constructor(renderer, { size = 1, vVelocity, vPosition, uniform = { value: null } } = {}) {
		this.renderer = renderer;
		this.size = size;
		this.alpha = 1.0;
		this.dissipation = 0.98;
		this.falloff = 0.15;
		this.aspect = window.innerWidth / window.innerHeight;

		this.uniform = uniform;

		this.vVelocity = vVelocity || new THREE.Vector2();
		this.vPosition = vPosition || new THREE.Vector2();

		this.renderTarget = new WebGLRenderTarget(this.size, this.size, {
			type: FloatType,
			format: RGBAFormat,
			minFilter: NearestFilter,
			magFilter: NearestFilter,
			stencilBuffer: false,
		});

		this.options = {
			width: this.size,
			height: this.size,
			type: THREE.FloatType,
			format: THREE.RGBAFormat,
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			depth: false,
			stencil: false,
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

				uFalloff: { value: this.falloff },
				uDissipation: { value: this.dissipation },
				uAlpha: { value: this.alpha },

				uAspect: { value: this.aspect },
				uVelocity: { value: this.vVelocity },
				uPosition: { value: this.vPosition },
			},
			depthTest: false,
		});
		this.flowmapMaterial.needsUpdate = true;
		this.mesh = new THREE.Mesh(this.geometry, this.flowmapMaterial);
		this.scene.add(this.mesh);
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


        vec3 stamp = vec3(uVelocity , 1.0 - pow(1.0 - min(1.0, length(uVelocity)), 3.0));
        float falloff = smoothstep(uFalloff, 0.0, length(cursor));

		color.rgb = mix(color.rgb, stamp, vec3(falloff));

        gl_FragColor = color;
    }
`;
