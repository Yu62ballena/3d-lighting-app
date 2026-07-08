export const strobeProfiles = {
    "TT350S": {
        name: "Godox TT350S",
        gn: 36, // ISO100, 105mm
        minPower: 1/128,
        maxPower: 1/1,
        stops: [1/128, 1/128*Math.pow(2, 1/3), 1/128*Math.pow(2, 2/3),
                1/64, 1/64*Math.pow(2, 1/3), 1/64*Math.pow(2, 2/3),
                1/32, 1/32*Math.pow(2, 1/3), 1/32*Math.pow(2, 2/3),
                1/16, 1/16*Math.pow(2, 1/3), 1/16*Math.pow(2, 2/3),
                1/8, 1/8*Math.pow(2, 1/3), 1/8*Math.pow(2, 2/3),
                1/4, 1/4*Math.pow(2, 1/3), 1/4*Math.pow(2, 2/3),
                1/2, 1/2*Math.pow(2, 1/3), 1/2*Math.pow(2, 2/3),
                1/1]
    }
};

export const formatPower = (powerRatio) => {
    // 1/3段刻みで最も近い値を探して文字列化するユーティリティ
    // 1/128 〜 1/1
    if (powerRatio > 1.0) return "フル出力以上 (光量不足)";
    if (powerRatio <= 0) return "-";

    // 近似値を探す
    const exactPowers = [1/128, 1/64, 1/32, 1/16, 1/8, 1/4, 1/2, 1/1];

    let closestIndex = 0;
    let minDiff = Infinity;

    // 1/3段の計算は概算で表示 (e.g. 1/8 +0.3)
    let bestMatchStr = "";

    exactPowers.forEach((basePower) => {
        const steps = [
            { ratio: basePower, str: `1/${Math.round(1/basePower)}` },
            { ratio: basePower * Math.pow(2, 1/3), str: `1/${Math.round(1/basePower)} +0.3` },
            { ratio: basePower * Math.pow(2, 2/3), str: `1/${Math.round(1/basePower)} +0.7` },
        ];

        steps.forEach(step => {
            // maxPowerを超えない範囲で
            if (step.ratio <= 1.05) {
                const diff = Math.abs(Math.log2(powerRatio) - Math.log2(step.ratio));
                if (diff < minDiff) {
                    minDiff = diff;
                    bestMatchStr = step.str;
                }
            }
        });
    });

    // 1/1 を超える微小なオーバーの丸め処理 (1.05までの許容)
    if (bestMatchStr === "1/1 +0.3" || bestMatchStr === "1/1 +0.7") {
         return "1/1";
    }

    return "約 " + bestMatchStr;
};
