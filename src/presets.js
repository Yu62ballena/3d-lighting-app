export class PresetsManager {
    constructor(uiControlsManager, renderer, scene, camera) {
        this.uiControlsManager = uiControlsManager;
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.presetsKey = 'lighting_presets_v1';

        this.initDOM();
        this.renderList();
    }

    initDOM() {
        const saveBtn = document.getElementById('save-preset');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const nameInput = document.getElementById('preset-name');
                const name = nameInput.value.trim() || `Preset ${new Date().toLocaleTimeString()}`;
                this.savePreset(name);
                nameInput.value = ''; // clear
            });
        }
    }

    takeScreenshot() {
        // スクリーンショットを取るために一度レンダリング
        // EffectComposer等を使用している場合は、最終的なキャンバスの内容を取得する
        // preserveDrawingBuffer: true が必要
        this.renderer.render(this.scene, this.camera);

        // 軽量化のため、低解像度のJPEGなどにリサイズしてから保存するのが望ましいが、
        // 今回はMVPなので単純にキャンバスから取得する。サムネイル用。
        const dataUrl = this.renderer.domElement.toDataURL('image/jpeg', 0.5);
        return dataUrl;
    }

    savePreset(name) {
        const state = this.uiControlsManager.getState();
        const thumbnail = this.takeScreenshot();

        const preset = {
            id: Date.now().toString(),
            name: name,
            date: new Date().toISOString(),
            state: state,
            thumbnail: thumbnail
        };

        let presets = this.getPresets();
        presets.unshift(preset); // 最新を上に

        // ローカルストレージ制限対策: 最大20件
        if (presets.length > 20) {
            presets = presets.slice(0, 20);
        }

        try {
            localStorage.setItem(this.presetsKey, JSON.stringify(presets));
            this.showToast('保存しました');
            this.renderList();
        } catch (e) {
            console.error("Failed to save preset to localStorage", e);
            this.showToast('保存に失敗しました (容量オーバー等)');
        }
    }

    loadPreset(id) {
        const presets = this.getPresets();
        const preset = presets.find(p => p.id === id);
        if (preset) {
            this.uiControlsManager.setState(preset.state);
            this.showToast('読み込みました');
        }
    }

    deletePreset(id) {
        let presets = this.getPresets();
        presets = presets.filter(p => p.id !== id);
        localStorage.setItem(this.presetsKey, JSON.stringify(presets));
        this.renderList();
    }

    getPresets() {
        try {
            const data = localStorage.getItem(this.presetsKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    renderList() {
        const listContainer = document.getElementById('presets-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        const presets = this.getPresets();

        presets.forEach(p => {
            const item = document.createElement('div');
            item.className = 'preset-item';

            const thumb = document.createElement('img');
            thumb.className = 'preset-thumb';
            thumb.src = p.thumbnail || '';

            const info = document.createElement('div');
            info.className = 'preset-info';

            const nameEl = document.createElement('div');
            nameEl.className = 'preset-name';
            nameEl.textContent = p.name;

            const dateEl = document.createElement('div');
            dateEl.className = 'preset-date';
            dateEl.textContent = new Date(p.date).toLocaleString();

            info.appendChild(nameEl);
            info.appendChild(dateEl);

            const delBtn = document.createElement('button');
            delBtn.className = 'preset-delete';
            delBtn.innerHTML = '×';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if(confirm(`「${p.name}」を削除しますか？`)) {
                    this.deletePreset(p.id);
                }
            };

            item.appendChild(thumb);
            item.appendChild(info);
            item.appendChild(delBtn);

            item.onclick = () => this.loadPreset(p.id);

            listContainer.appendChild(item);
        });
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }
}
