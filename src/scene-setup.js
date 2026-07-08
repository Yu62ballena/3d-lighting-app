import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const setupScene = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1d);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    // カメラの初期位置 (器を見下ろすような角度)
    camera.position.set(0, 3, 5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // physicallyCorrectLights は r150 で非推奨となり、useLegacyLights が導入されました。
    // その後 r163 以降で useLegacyLights も廃止され、物理ベースライティングがデフォルトになりました。
    // r0.185.0 では単に toneMapping などを設定するだけでOKです。
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    // Ambient light as a baseline fill (very dim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x3a3a40, 0x3a3a40);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Resize handler
    const onWindowResize = () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', onWindowResize);

    return {
        scene,
        camera,
        renderer,
        controls,
        onWindowResize
    };
};
