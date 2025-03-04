const data = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [91.14478,29.658272] }, properties: { type: 1 } }
    ]
};

const style = [
    {
        filter: true,
        renderPlugin: {
            type: 'text',
            dataConfig: {
                type: 'point'
            },
            sceneConfig: {
                collision: false,
                fading: false
            }
        },
        symbol: {
            textName: 'hello',
            textSize: 14,
            textPitchAlignment: 'map'
        }
    }
];

module.exports = {
    style,
    data
};
