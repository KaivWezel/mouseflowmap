import * as THREE from "three";

export default class Particles {
	constructor(renderer, scene, flowmap) {
		this.renderer = renderer;
		this.scene = new THREE.Scene();
		this.flowmap = flowmap;
		this.clock = new THREE.Clock();

		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

		this.loader = new THREE.TextureLoader();

		this.images = ["./public/fluid.jpg", "./public/sand.jpg"];
		this.textures = this.images.map((image) => {
			this.loader.load(image);
		});

		this.geometry = new THREE.PlaneGeometry(4, 3, 128, 128);
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				tMap: { value: this.textures[0] },
				tFlow: { value: this.flowmap },
				uTime: { value: 0 },
			},
			vertexShader: /* glsl */ `
                uniform sampler2D tMap;
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = 2.0;
                }
            `,
			fragmentShader: /* glsl */ `
                uniform sampler2D tMap;

                varying vec2 vUv;

                void main() {
                    vec4 c = texture2D(tMap, vUv);
                    gl_FragColor = vec4(c.rgb, 1.0);

                }
            `,
		});

		this.addObject();
	}

	addObject() {
		this.mesh = new THREE.Points(this.geometry, this.material);
		this.mesh.position.z = -1;
		this.scene.add(this.mesh);
	}

	render() {
		this.renderer.render(this.scene, this.camera);
	}
}
