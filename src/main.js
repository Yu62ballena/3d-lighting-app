import { setupScene } from './scene-setup.js';
import { loadModel } from './model-loader.js';
import { LightingManager } from './lighting.js';
import { ZebraOverlay } from './zebra-overlay.js';
import { DragControlsManager } from './drag-controls.js';
import { UIControlsManager } from './ui-controls.js';
import { PresetsManager } from './presets.js';
import { calculateStrobePower } from './strobe-calc.js';

let sceneContext;
let lightingManager;
let zebraOverlay;
let dragManager;
let uiManager;
let presetsManager;

const init = async () => {
    try {
        // 1. シーンの初期化
        sceneContext = setupScene('viewport-container');
        const { scene, camera, renderer, controls } = sceneContext;

        // 2. ライティングとポストプロセスの初期化
        lightingManager = new LightingManager(scene);
        zebraOverlay = new ZebraOverlay(renderer, scene, camera);

        // 3. UIの初期化
        uiManager = new UIControlsManager(lightingManager, zebraOverlay, calculateStrobePower);
        presetsManager = new PresetsManager(uiManager, renderer, scene, camera);

        // 4. ドラッグコントロールの初期化
        dragManager = new DragControlsManager(camera, renderer.domElement, scene, controls);

        // 光源をドラッグ可能に登録
        dragManager.registerLight('main', lightingManager.mainLight, lightingManager.mainLightHelper);
        dragManager.registerLight('sub', lightingManager.subLight, lightingManager.subLightHelper);
        dragManager.registerLight('reflector', lightingManager.reflector, lightingManager.reflectorHelper);

        // ドラッグによる位置変更をUIにフィードバック
        dragManager.onDragChange((id, pos) => {
            uiManager.updateStateFromPosition(id, pos);
        });

        // 5. モデルの読み込み
        const model = await loadModel(scene);

        // 被写体サイズの変更イベントをモデルに反映
        uiManager.onSubjectSizeChange = (sizePercent) => {
            if (model && model.userData.baseScale) {
                const ratio = sizePercent / 100;
                model.scale.setScalar(model.userData.baseScale * ratio);
            }
        };

        // 6. アニメーションループ開始
        let time = 0;

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update(); // Damping用

            time += 16.6; // approx 60fps

            // ゼブラオーバーレイが有効な場合はComposerで描画、そうでない場合は通常のRendererで描画
            const postProcessRendered = zebraOverlay.render(time);
            if (!postProcessRendered) {
                renderer.render(scene, camera);
            }
        };

        animate();

    } catch (e) {
        console.error("Initialization failed:", e);
    }
};

// リサイズイベントの連携
window.addEventListener('resize', () => {
    if (sceneContext && zebraOverlay) {
        const container = document.getElementById('viewport-container');
        zebraOverlay.setSize(container.clientWidth, container.clientHeight);
    }
});

// DOMロード完了後に初期化
document.addEventListener('DOMContentLoaded', init);
