import * as THREE from 'three';
import { USDZLoader } from 'three/addons/loaders/USDZLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const showError = (message) => {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
    console.error(message);
};

const hideLoading = () => {
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
};

/**
 * モデルの読み込みとセンタリング、スケール調整
 * usdz を優先し、失敗したら glb にフォールバックする
 */
export const loadModel = (scene) => {
    return new Promise((resolve, reject) => {
        const usdzLoader = new USDZLoader();
        const usdzPath = 'assets/models/cat-placeholder.usdz';
        const glbPath = 'assets/models/cat-placeholder.glb';

        // 読み込み完了後の共通処理
        const processLoadedModel = (object) => {
            hideLoading();

            // バウンディングボックスを計算してセンタリング
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // 原点に配置
            object.position.x += (object.position.x - center.x);
            object.position.y += (object.position.y - center.y) + (size.y / 2); // 底面を0に
            object.position.z += (object.position.z - center.z);

            // 適切なサイズにスケール (器のサイズ程度 = 約15〜20cm想定、Three.js空間では0.2くらい)
            const maxDim = Math.max(size.x, size.y, size.z);
            if(maxDim > 0) {
                const targetSize = 0.2; // 20cm
                const scale = targetSize / maxDim;
                object.scale.setScalar(scale);
            }

            // 影の設定 (RectAreaLightは影を落とさないが、将来的な拡張のため)
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // 材質調整 (必要に応じて)
                    if (child.material) {
                        child.material.roughness = 0.5;
                        child.material.metalness = 0.1;
                    }
                }
            });

            scene.add(object);
            resolve(object);
        };

        // 1. usdz を試行
        usdzLoader.load(
            usdzPath,
            (usdz) => {
                console.log('Loaded USDZ model successfully.');
                processLoadedModel(usdz);
            },
            undefined, // onProgress
            (error) => {
                console.warn(`Failed to load USDZ from ${usdzPath}. Trying GLB fallback...`, error);

                // 2. 失敗した場合は glb へフォールバック
                const gltfLoader = new GLTFLoader();
                gltfLoader.load(
                    glbPath,
                    (gltf) => {
                        console.log('Loaded GLB fallback model successfully.');
                        processLoadedModel(gltf.scene);
                    },
                    undefined,
                    (fallbackError) => {
                        hideLoading();
                        const msg = `Failed to load both USDZ and GLB models.`;
                        showError(msg);
                        reject(new Error(msg));
                    }
                );
            }
        );
    });
};
