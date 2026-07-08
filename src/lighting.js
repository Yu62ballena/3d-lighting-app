import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { calculateDistanceAttenuation } from './strobe-calc.js';

/**
 * 球座標から直交座標への変換 (Three.js の仕様に合わせる)
 * @param {number} angleClock 時表記(0-12) 6=手前(z+), 3=右(x+), 12=奥(z-), 9=左(x-)
 * @param {number} heightAngleDeg 高さ角度(0-90) 0=水平, 90=真上
 * @param {number} distanceCm 距離(cm)
 * @returns {THREE.Vector3}
 */
const getPositionFromSpherical = (angleClock, heightAngleDeg, distanceCm) => {
    // 距離をメートル換算 (Three.jsは通常1単位=1mが扱いやすい)
    const r = distanceCm / 100;

    // 時表記からラジアン (6時 -> 0度(手前), 3時 -> 90度(右))
    // 12時間で一周(2PI)なので、1時間 = 2PI/12
    // 6時を基準(z軸正方向)とする
    // 3時が右(x軸正方向)になるように、反時計回りを正とするなら角度は -(時計-6)
    const theta = (6 - angleClock) * (Math.PI / 6);

    // 高さ角度 (0度=水平, 90度=真上(y軸正方向))
    const phi = THREE.MathUtils.degToRad(heightAngleDeg);

    const x = r * Math.cos(phi) * Math.sin(theta);
    const y = r * Math.sin(phi);
    const z = r * Math.cos(phi) * Math.cos(theta);

    return new THREE.Vector3(x, y, z);
};

export class LightingManager {
    constructor(scene) {
        this.scene = scene;

        // RectAreaLightを使用するための初期化
        RectAreaLightUniformsLib.init();

        // 基準となる光量 (1m距離での intensity)
        this.baseIntensity = 50.0;

        // --- メインライト ---
        this.mainLight = new THREE.RectAreaLight(0xffffff, this.baseIntensity, 0.6, 0.6); // 60cm x 60cm
        this.scene.add(this.mainLight);
        this.mainLightHelper = new RectAreaLightHelper(this.mainLight);
        this.mainLight.add(this.mainLightHelper);

        // --- サブライト ---
        this.subLight = new THREE.RectAreaLight(0xffffff, this.baseIntensity * 0.5, 0.3, 0.9); // 30cm x 90cm (ストリップ)
        this.scene.add(this.subLight);
        this.subLightHelper = new RectAreaLightHelper(this.subLight);
        this.subLight.add(this.subLightHelper);
        this.subLight.visible = false;

        // --- レフ板 (疑似光源としてRectAreaLightを使用) ---
        // 反射光なので柔らかく、やや広めの面とする
        this.reflector = new THREE.RectAreaLight(0xffffff, 5.0, 0.8, 0.8);
        this.scene.add(this.reflector);
        this.reflectorHelper = new RectAreaLightHelper(this.reflector);
        this.reflector.add(this.reflectorHelper);
        this.reflector.visible = false;

        // 初期状態の更新
        this.updateMainLight({ angle: 6, height: 45, distance: 100, width: 60, heightSize: 60 });
        this.updateSubLight({ angle: 10, height: 30, distance: 150 });
        this.updateReflector({ angle: 3, distance: 50, intensityRatio: 0.5, color: 'white' });
    }

    updateMainLight(params) {
        const { angle, height, distance, width, heightSize } = params;

        // 位置の更新
        const pos = getPositionFromSpherical(angle, height, distance);
        this.mainLight.position.copy(pos);
        this.mainLight.lookAt(0, 0, 0);

        // サイズの更新 (cm -> m)
        this.mainLight.width = width / 100;
        this.mainLight.height = heightSize / 100;

        // 逆二乗則に基づく光量の更新
        const attenuation = calculateDistanceAttenuation(distance);
        this.mainLight.intensity = this.baseIntensity * attenuation;
    }

    updateSubLight(params, isEnabled = true) {
        this.subLight.visible = isEnabled;
        if (!isEnabled) return;

        const { angle, height, distance } = params;

        const pos = getPositionFromSpherical(angle, height, distance);
        this.subLight.position.copy(pos);
        this.subLight.lookAt(0, 0, 0);

        const attenuation = calculateDistanceAttenuation(distance);
        // サブライトはメインより弱めの基準値とする
        this.subLight.intensity = (this.baseIntensity * 0.3) * attenuation;
    }

    updateReflector(params, isEnabled = true) {
        this.reflector.visible = isEnabled;
        if (!isEnabled) return;

        const { angle, distance, intensityRatio, color } = params;

        // レフ板は少し下から見上げる角度(水平に近い)をデフォルトとする
        const heightAngle = 10;
        const pos = getPositionFromSpherical(angle, heightAngle, distance);
        this.reflector.position.copy(pos);
        this.reflector.lookAt(0, 0, 0);

        // 色と強度の更新
        const baseRefIntensity = color === 'silver' ? 15.0 : 8.0;
        const attenuation = calculateDistanceAttenuation(distance, 50); // レフ板は50cm基準とする

        // レフ板自体の色は白で固定し、intensityで強さを表現
        this.reflector.color.setHex(color === 'silver' ? 0xe0e0ff : 0xffffff); // 銀は少し青白く
        this.reflector.intensity = baseRefIntensity * intensityRatio * attenuation;
    }
}
