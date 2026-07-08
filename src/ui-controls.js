// UI状態の管理とコールバック
export class UIControlsManager {
    constructor(lightingManager, zebraOverlay, strobeCalcFn) {
        this.lightingManager = lightingManager;
        this.zebraOverlay = zebraOverlay;
        this.strobeCalcFn = strobeCalcFn; // (distance, f, iso, model) => string

        this.state = {
            mainLight: { angle: 6, height: 45, distance: 100, width: 60, heightSize: 60 },
            subLight: { enabled: false, mode: 'rim', angle: 10, height: 30, distance: 150 },
            reflector: { enabled: false, color: 'white', intensityRatio: 0.5, distance: 50, angle: 3 },
            zebra: { enabled: false, threshold: 0.95 },
            camera: { iso: 100, fnumber: 8, strobeModel: 'TT350S' }
        };

        // サブライトのプリセットモード
        this.subLightModes = {
            rim: { angle: 10, height: 30, distance: 150 }, // 奥・低め・弱め
            soft: { angle: 3, height: 45, distance: 100 }  // 3時方向
        };

        this.initBindings();
        this.updateLighting();
        this.updateStrobeSuggestion();
    }

    // UIからの値取得をヘルパー化
    bindNumberInput(sliderId, numId, statePath, callback) {
        const slider = document.getElementById(sliderId);
        const num = document.getElementById(numId);

        if (!slider || !num) return;

        const update = (val) => {
            const numVal = Number(val);
            slider.value = numVal;
            num.value = numVal;

            // 状態の更新
            const keys = statePath.split('.');
            let obj = this.state;
            for(let i=0; i<keys.length-1; i++) obj = obj[keys[i]];
            obj[keys[keys.length-1]] = numVal;

            if(callback) callback();
        };

        slider.addEventListener('input', (e) => update(e.target.value));
        num.addEventListener('input', (e) => update(e.target.value));
    }

    bindCheckbox(id, statePath, callback) {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('change', (e) => {
            const keys = statePath.split('.');
            let obj = this.state;
            for(let i=0; i<keys.length-1; i++) obj = obj[keys[i]];
            obj[keys[keys.length-1]] = e.target.checked;

            if(callback) callback();
        });
    }

    bindSelect(id, statePath, callback) {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('change', (e) => {
            const keys = statePath.split('.');
            let obj = this.state;
            for(let i=0; i<keys.length-1; i++) obj = obj[keys[i]];
            obj[keys[keys.length-1]] = e.target.value;

            if(callback) callback();
        });
    }

    bindSimpleSlider(id, statePath, callback) {
        const slider = document.getElementById(id);
        if (!slider) return;

        slider.addEventListener('input', (e) => {
            const numVal = Number(e.target.value);
            const keys = statePath.split('.');
            let obj = this.state;
            for(let i=0; i<keys.length-1; i++) obj = obj[keys[i]];
            obj[keys[keys.length-1]] = numVal;

            if(callback) callback();
        });
    }

    initBindings() {
        const updateAllLighting = () => this.updateLighting();
        const updateStrobe = () => this.updateStrobeSuggestion();

        // Main Light
        this.bindNumberInput('ml-angle', 'ml-angle-num', 'mainLight.angle', updateAllLighting);
        this.bindNumberInput('ml-height', 'ml-height-num', 'mainLight.height', updateAllLighting);
        this.bindNumberInput('ml-distance', 'ml-distance-num', 'mainLight.distance', () => { updateAllLighting(); updateStrobe(); });
        this.bindNumberInput('ml-width', 'ml-width-num', 'mainLight.width', updateAllLighting);
        this.bindNumberInput('ml-height-size', 'ml-height-size-num', 'mainLight.heightSize', updateAllLighting);

        // Sub Light
        this.bindCheckbox('sl-enable', 'subLight.enabled', updateAllLighting);

        const slModeSelect = document.getElementById('sl-mode');
        if (slModeSelect) {
            slModeSelect.addEventListener('change', (e) => {
                this.state.subLight.mode = e.target.value;
                const preset = this.subLightModes[this.state.subLight.mode];
                if (preset) {
                    this.state.subLight.angle = preset.angle;
                    this.state.subLight.height = preset.height;
                    this.state.subLight.distance = preset.distance;
                    this.syncStateToUI();
                    updateAllLighting();
                }
            });
        }

        this.bindNumberInput('sl-angle', 'sl-angle-num', 'subLight.angle', updateAllLighting);
        this.bindNumberInput('sl-height', 'sl-height-num', 'subLight.height', updateAllLighting);
        this.bindNumberInput('sl-distance', 'sl-distance-num', 'subLight.distance', updateAllLighting);

        // Reflector
        this.bindCheckbox('ref-enable', 'reflector.enabled', updateAllLighting);
        this.bindSelect('ref-color', 'reflector.color', updateAllLighting);
        this.bindSimpleSlider('ref-intensity', 'reflector.intensityRatio', updateAllLighting);
        this.bindSimpleSlider('ref-distance', 'reflector.distance', updateAllLighting);
        this.bindNumberInput('ref-angle', 'ref-angle-num', 'reflector.angle', updateAllLighting);

        // Zebra
        this.bindCheckbox('zebra-enable', 'zebra.enabled', () => {
            this.zebraOverlay.setEnable(this.state.zebra.enabled);
        });
        this.bindSimpleSlider('zebra-threshold', 'zebra.threshold', () => {
            this.zebraOverlay.setThreshold(this.state.zebra.threshold);
        });

        // Strobe
        const bindStrobeSimple = (id, path) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', (e) => {
                const val = el.tagName === 'SELECT' ? e.target.value : Number(e.target.value);
                const keys = path.split('.');
                let obj = this.state;
                for(let i=0; i<keys.length-1; i++) obj = obj[keys[i]];
                obj[keys[keys.length-1]] = val;
                updateStrobe();
            });
        };
        bindStrobeSimple('cam-iso', 'camera.iso');
        bindStrobeSimple('cam-fnumber', 'camera.fnumber');
        bindStrobeSimple('strobe-model', 'camera.strobeModel');
    }

    updateLighting() {
        this.lightingManager.updateMainLight(this.state.mainLight);
        this.lightingManager.updateSubLight(this.state.subLight, this.state.subLight.enabled);
        this.lightingManager.updateReflector(this.state.reflector, this.state.reflector.enabled);
    }

    updateStrobeSuggestion() {
        const suggestionStr = this.strobeCalcFn(
            this.state.mainLight.distance,
            this.state.camera.fnumber,
            this.state.camera.iso,
            this.state.camera.strobeModel
        );
        const el = document.getElementById('strobe-suggestion');
        if (el) el.textContent = suggestionStr;
    }

    // TransformControls などから3D上の位置変更があった場合、状態を更新してUIに反映する
    updateStateFromPosition(lightId, position) {
        // x, y, z -> angleClock, heightAngleDeg, distanceCm
        // distance
        const r_m = position.length();
        const distanceCm = Math.round(r_m * 100);

        // heightAngle (0-90)
        // y = r * sin(phi) -> sin(phi) = y/r
        const heightAngleDeg = Math.round((Math.asin(position.y / r_m) * 180) / Math.PI);
        const clampedHeight = Math.max(0, Math.min(90, heightAngleDeg));

        // angleClock
        // x = r * cos(phi) * sin(theta)
        // z = r * cos(phi) * cos(theta)
        // theta = atan2(x, z)
        let theta = Math.atan2(position.x, position.z);
        // theta = (6 - clock) * (PI/6)
        // clock = 6 - (theta * 6 / PI)
        let clock = 6 - (theta * 6 / Math.PI);
        if (clock < 0) clock += 12;
        if (clock >= 12) clock -= 12;
        clock = Math.round(clock * 10) / 10;

        if (lightId === 'main') {
            this.state.mainLight.angle = clock;
            this.state.mainLight.height = clampedHeight;
            this.state.mainLight.distance = distanceCm;
            this.updateStrobeSuggestion();
        } else if (lightId === 'sub') {
            this.state.subLight.angle = clock;
            this.state.subLight.height = clampedHeight;
            this.state.subLight.distance = distanceCm;
        } else if (lightId === 'reflector') {
            this.state.reflector.angle = clock;
            // レフ板は高さ固定とするので更新しない、または必要に応じて更新
            this.state.reflector.distance = distanceCm;
        }

        this.syncStateToUI();
        this.updateLighting();
    }

    // State オブジェクトの内容をDOMに反映する
    syncStateToUI() {
        const syncNumAndSlider = (sliderId, numId, val) => {
            const s = document.getElementById(sliderId);
            const n = document.getElementById(numId);
            if (s) s.value = val;
            if (n) n.value = val;
        };
        const syncCheck = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.checked = val;
        };
        const syncSelect = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        const syncSlider = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };

        // mainLight
        syncNumAndSlider('ml-angle', 'ml-angle-num', this.state.mainLight.angle);
        syncNumAndSlider('ml-height', 'ml-height-num', this.state.mainLight.height);
        syncNumAndSlider('ml-distance', 'ml-distance-num', this.state.mainLight.distance);
        syncNumAndSlider('ml-width', 'ml-width-num', this.state.mainLight.width);
        syncNumAndSlider('ml-height-size', 'ml-height-size-num', this.state.mainLight.heightSize);

        // subLight
        syncCheck('sl-enable', this.state.subLight.enabled);
        syncSelect('sl-mode', this.state.subLight.mode);
        syncNumAndSlider('sl-angle', 'sl-angle-num', this.state.subLight.angle);
        syncNumAndSlider('sl-height', 'sl-height-num', this.state.subLight.height);
        syncNumAndSlider('sl-distance', 'sl-distance-num', this.state.subLight.distance);

        // reflector
        syncCheck('ref-enable', this.state.reflector.enabled);
        syncSelect('ref-color', this.state.reflector.color);
        syncSlider('ref-intensity', this.state.reflector.intensityRatio);
        syncSlider('ref-distance', this.state.reflector.distance);
        syncNumAndSlider('ref-angle', 'ref-angle-num', this.state.reflector.angle);

        // zebra
        syncCheck('zebra-enable', this.state.zebra.enabled);
        syncSlider('zebra-threshold', this.state.zebra.threshold);

        // camera
        syncSlider('cam-iso', this.state.camera.iso);
        syncSlider('cam-fnumber', this.state.camera.fnumber);
        syncSelect('strobe-model', this.state.camera.strobeModel);

        this.zebraOverlay.setEnable(this.state.zebra.enabled);
        this.zebraOverlay.setThreshold(this.state.zebra.threshold);
    }

    getState() {
        return JSON.parse(JSON.stringify(this.state)); // Deep copy
    }

    setState(newState) {
        this.state = JSON.parse(JSON.stringify(newState));
        this.syncStateToUI();
        this.updateLighting();
        this.updateStrobeSuggestion();
    }
}
