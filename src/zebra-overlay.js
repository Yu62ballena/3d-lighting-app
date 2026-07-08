import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * 白飛び警告用カスタムシェーダー
 * 輝度が閾値を超えたピクセルにゼブラ柄を描画する
 */
const ZebraShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "threshold": { value: 0.95 },
        "time": { value: 0.0 },
        "resolution": { value: new THREE.Vector2() }
    },

    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,

    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float threshold;
        uniform float time;
        uniform vec2 resolution;

        varying vec2 vUv;

        void main() {
            vec4 texel = texture2D( tDiffuse, vUv );

            // 輝度計算 (Rec.709)
            float luminance = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));

            if (luminance >= threshold) {
                // ゼブラパターンの生成
                // 画面座標系での計算を行うためにgl_FragCoordを使用
                // 右上がりの斜線
                float stripeWidth = 10.0;
                float coord = (gl_FragCoord.x + gl_FragCoord.y) / stripeWidth;

                // timeを足してアニメーションさせることも可能(今回は静的でもOKだが一応)
                // float pattern = mod(coord - time * 2.0, 2.0);
                float pattern = mod(coord, 2.0);

                if (pattern < 1.0) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // 黒
                } else {
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // 白
                }
            } else {
                gl_FragColor = texel;
            }
        }
    `
};

export class ZebraOverlay {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.composer = new EffectComposer(renderer);
        this.composer.setPixelRatio(window.devicePixelRatio);

        // 1. 通常のレンダリングパス
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // 2. ゼブラオーバーレイパス
        this.zebraPass = new ShaderPass(ZebraShader);
        this.zebraPass.uniforms["resolution"].value.set(
            window.innerWidth * window.devicePixelRatio,
            window.innerHeight * window.devicePixelRatio
        );
        this.composer.addPass(this.zebraPass);

        // 3. OutputPass (Tone mapping)
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);

        this.isEnabled = false;
        this.threshold = 0.95;
    }

    setSize(width, height) {
        this.composer.setSize(width, height);
        this.zebraPass.uniforms["resolution"].value.set(
            width * window.devicePixelRatio,
            height * window.devicePixelRatio
        );
    }

    setEnable(enable) {
        this.isEnabled = enable;
    }

    setThreshold(threshold) {
        this.threshold = threshold;
        this.zebraPass.uniforms["threshold"].value = threshold;
    }

    render(time) {
        if (this.isEnabled) {
            // this.zebraPass.uniforms["time"].value = time * 0.001; // 必要ならアニメーション
            this.composer.render();
        } else {
            // パスが無効な場合は通常のrendererで描画(軽量化のため)
            // RenderPassだけでComposerを回しても良いが、
            // そもそも使わないなら renderer.render の方が早い
            return false;
        }
        return true;
    }
}
