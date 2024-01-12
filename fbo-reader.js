import { DoubleSide, Group, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Scene } from "three";

export default class FBOReader {
	constructor(renderer, { minWidth = 256 } = {}) {
		this.renderer = renderer;
		this.autoUpdate = false;

		this.scene = new Scene();
		this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.000001, 1000);

		this.fbos = [];
		this.fboMap = new Map();

		this.minWidth = minWidth;

		this.group = new Group();
		this.scene.add(this.group);

		this.setSize(window.innerWidth, window.innerHeight);

		// this.raycaster = new Raycaster();
		// this.mouse = new Vector2();

		// this.currentObj = null;
		// this.currentU = 0;
		// this.currentV = 0;

		// this.offsetX = 0;
		// this.offsetY = 0;

		// this.grid.appendChild( this.hotspot );
	}

	hide() {
		this.hideAll();
		this.currentObj = null;
	}

	attach(fbo, name, formatter) {
		if (fbo.image) {
			fbo.width = fbo.image.width;
			fbo.height = fbo.image.height;
		}

		const width = this.minWidth;
		const height = (fbo.height * width) / fbo.width;

		const material = new MeshBasicMaterial({
			map: fbo.texture,
			side: DoubleSide,
		});

		const quad = new Mesh(new PlaneGeometry(1, 1), material);
		if (!fbo.flipY) quad.rotation.x = Math.PI;
		quad.width = width;
		quad.height = height;
		quad.scale.set(width, height, 1);
		this.group.add(quad);

		var fboData = {
			width: width,
			height: height,
			name: name,
			fbo: fbo,
			flipY: fbo.flipY,
			visible: true,
			quad: quad,
			material: material,
			formatter: formatter,
		};
		this.fbos.push(fboData);
		this.fboMap.set(quad, fboData);

		this.layout();
	}

	detach(f) {
		var p = 0;
		for (var fbo of this.fbos) {
			if (fbo.fbo === f) {
				this.fbos.splice(p, 1);
			}
			p++;
		}
	}

	layout() {
		const [first] = this.fboMap.values();
		let totalH = first ? -first.height * 0.5 : 0;
		for (const [quad, data] of this.fboMap) {
			quad.position.y = totalH;
			totalH -= data.height;
		}
		this.group.position.set((-this.width + this.minWidth) * 0.5, this.height * 0.5);
	}

	refreshFBO(f) {
		for (var fbo of this.fbos) {
			if (fbo.fbo === f) {
				const width = this.minWidth;
				const height = (f.height * width) / f.width;
				fbo.width = width;
				fbo.height = height;
				fbo.quad.width = width;
				fbo.quad.height = height;
				fbo.quad.scale.set(width, height, 1);
			}
		}
	}

	hideAll() {
		this.fbos.forEach((fbo) => (fbo.quad.visible = false));
	}

	setSize(w, h) {
		this.width = w;
		this.height = h;

		this.camera.left = w / -2;
		this.camera.right = w / 2;
		this.camera.top = h / 2;
		this.camera.bottom = h / -2;
		this.camera.updateProjectionMatrix();

		this.layout();
	}

	/* readPixel(obj, u, v) {
            this.currentU = u;
            this.currentV = v;

            if (this.currentObj === null) return;

            const fbo = obj.fbo;

            const x = ~~(fbo.width * u);
            const y = ~~(fbo.height * v);

            let types = {};
            types[UnsignedByteType] = Uint8Array;
            types[ByteType] = Int8Array;
            types[ShortType] = Int16Array;
            types[UnsignedShortType] = Uint16Array;
            types[IntType] = Int32Array;
            types[UnsignedIntType] = Uint32Array;
            types[FloatType] = Float32Array;
            types[HalfFloatType] = null;
            types[UnsignedShort4444Type] = Uint16Array;
            types[UnsignedShort5551Type] = Uint16Array;
            types[UnsignedShort565Type] = Uint16Array;

            var type = types[fbo.texture ? fbo.texture.type : fbo.type];
            if (type === null) {
                console.warning(fbo.texture ? fbo.texture.type : fbo.type + ' not supported');
                return;
            }

            const pixelBuffer = new type(4);

            this.renderer.readRenderTargetPixels(fbo, x, y, 1, 1, pixelBuffer);
            const posTxt = `X : ${x} Y: ${y} u: ${u} v: ${v}`;
            const dataTxt = obj.formatter
                ? obj.formatter({
                      x: x,
                      y: y,
                      u: u,
                      v: v,
                      r: pixelBuffer[0],
                      g: pixelBuffer[1],
                      b: pixelBuffer[2],
                      a: pixelBuffer[3],
                  })
                : `R: ${pixelBuffer[0]} G: ${pixelBuffer[1]} B: ${pixelBuffer[2]} A: ${pixelBuffer[3]}`;
            this.label.innerHTML = `${posTxt}<br/>${dataTxt}`;

            const ox = (~~(u * fbo.width) * obj.quad.width) / fbo.width;
            const oy = (~~(obj.flipY ? (1 - v) * fbo.height : v * fbo.height) * obj.quad.height) / fbo.height;
            this.hotspot.style.width = `${obj.quad.width / fbo.width}px`;
            this.hotspot.style.height = `${obj.quad.height / fbo.height}px`;
            this.hotspot.style.transform = `translate3d(${ox}px,${oy}px,0)`;
            this.label.style.bottom = obj.quad.height / fbo.height + 'px';
        } */

	render({ clear = false } = {}) {
		this.renderer.autoClear = false;
		this.renderer.setRenderTarget(null);
		if (clear) this.renderer.clear();
		this.renderer.render(this.scene, this.camera);
		// this.renderer.autoClear = true;
		// if (this.autoUpdate) this.readPixel(this.currentObj, this.currentU, this.currentV);
	}
}
