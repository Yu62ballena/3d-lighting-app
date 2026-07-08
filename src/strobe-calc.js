import { strobeProfiles, formatPower } from './strobe-profiles.js';

/**
 * 距離に基づく逆二乗則による光量減衰の計算（相対値）
 * 基準距離 (referenceDistance: 100cm = 1m) に対する相対的な光量強度を返す。
 * RectAreaLight の intensity に掛ける。
 * @param {number} distance_cm 被写体までの距離(cm)
 * @param {number} referenceDistance_cm 基準距離(cm)
 * @returns {number} 減衰率
 */
export const calculateDistanceAttenuation = (distance_cm, referenceDistance_cm = 100) => {
    // 距離が0に近づきすぎないようにクランプ
    const d = Math.max(distance_cm, 1);
    const ref = Math.max(referenceDistance_cm, 1);

    // (基準距離 / 実際の距離)^2
    return Math.pow(ref / d, 2);
};

/**
 * ストロボ実機での出力提案値を計算する
 * @param {number} distance_cm 距離(cm)
 * @param {number} fNumber 想定F値
 * @param {number} iso 想定ISO
 * @param {string} strobeModel ストロボ機種ID (例: "TT350S")
 * @returns {string} 表示用テキスト
 */
export const calculateStrobePower = (distance_cm, fNumber, iso, strobeModelId) => {
    const profile = strobeProfiles[strobeModelId];
    if (!profile) return "不明な機種";

    const distance_m = distance_cm / 100;

    // 1. 必要GN = 距離(m) × F値
    // ISOが100以外の場合は必要GNを補正: ISOが200なら必要なGNは 1/sqrt(2) 倍になる。
    // 一般に GNはISO100基準。ISOを上げると実質GNは上がるので、必要GNを割る。
    const isoFactor = Math.sqrt(iso / 100);
    const requiredGN = (distance_m * fNumber) / isoFactor;

    // 2. 出力パワー比 = (必要GN / フル出力時GN)^2
    // フル出力時GNは profile.gn
    let powerRatio = Math.pow(requiredGN / profile.gn, 2);

    // 3. ソフトボックス透過減衰分の加味 (仮に1段分減衰すると仮定 = パワー2倍必要)
    const softboxAttenuationStops = 1.0;
    powerRatio *= Math.pow(2, softboxAttenuationStops);

    return formatPower(powerRatio);
};
