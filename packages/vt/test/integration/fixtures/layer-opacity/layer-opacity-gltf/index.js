const data = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [91.14478, 29.658272, 4000] }, properties: { type: 1 } }
    ]
};

const scale = Math.pow(2, 7) / 60;

const style = [
    {
        filter: true,
        renderPlugin: {
            type: 'gltf-lit',
            dataConfig: {
                type: 'native-point'
            },
            sceneConfig: {
                gltfAnimation: {
                    enable: true
                }
            }
        },
        symbol: {
            scaleX: scale,
            scaleY: scale,
            scaleZ: scale,
            markerOpacity: 1,
            markerFill: '#f00'
        }
    }
];

module.exports = {
    style,
    data
};
