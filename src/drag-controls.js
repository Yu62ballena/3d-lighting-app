import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class DragControlsManager {
    constructor(camera, domElement, scene, orbitControls) {
        this.camera = camera;
        this.domElement = domElement;
        this.scene = scene;
        this.orbitControls = orbitControls;

        this.transformControls = new TransformControls(camera, domElement);
        this.transformControls.setMode('translate'); // 移動のみ

        // ギズモのサイズを少し小さく
        this.transformControls.setSize(0.5);

        this.scene.add(this.transformControls);

        // ドラッグ中はOrbitControlsを無効化する
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.orbitControls.enabled = !event.value;
        });

        this.onChangeCallback = null;

        this.transformControls.addEventListener('change', () => {
            // ドラッグ操作による位置変更をコールバックで通知
            if (this.onChangeCallback && this.activeLight) {
                this.onChangeCallback(this.activeLightId, this.activeLight.position);
            }
        });

        this.lightsMap = {};
        this.activeLight = null;
        this.activeLightId = null;

        this.setupRaycaster();
    }

    registerLight(id, lightObj, helperObj) {
        // TransformControlsはMesh等アタッチ可能なObject3Dを必要とするが、
        // RectAreaLightHelperはLineなのでアタッチ可能。
        // ただしヒット判定のために見えないMeshを仕込む方が確実。
        const size = 0.2;
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false }); // 非表示のヒットエリア
        const hitMesh = new THREE.Mesh(geometry, material);

        lightObj.add(hitMesh); // 光源の子にする

        this.lightsMap[id] = {
            light: lightObj,
            hitMesh: hitMesh
        };
    }

    setupRaycaster() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        this.domElement.addEventListener('pointerdown', (event) => {
            // TransformControlsの操作中なら何もしない
            if (this.transformControls.dragging) return;

            const rect = this.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, this.camera);

            // 登録されたhitMeshのリストを作成
            const hitMeshes = [];
            const idMap = new Map(); // hitMesh -> id

            for (const id in this.lightsMap) {
                // サブライトやレフ板など、非表示のものは無視
                if (this.lightsMap[id].light.visible) {
                    hitMeshes.push(this.lightsMap[id].hitMesh);
                    idMap.set(this.lightsMap[id].hitMesh, id);
                }
            }

            const intersects = raycaster.intersectObjects(hitMeshes);

            if (intersects.length > 0) {
                const hit = intersects[0].object;
                const id = idMap.get(hit);
                const lightObj = this.lightsMap[id].light;

                this.attach(id, lightObj);
            } else {
                // 何もクリックされなかったらデタッチ
                this.detach();
            }
        });
    }

    attach(id, lightObj) {
        this.activeLightId = id;
        this.activeLight = lightObj;
        this.transformControls.attach(lightObj);
    }

    detach() {
        this.activeLightId = null;
        this.activeLight = null;
        this.transformControls.detach();
    }

    onDragChange(callback) {
        this.onChangeCallback = callback;
    }
}
