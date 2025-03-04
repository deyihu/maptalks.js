const path = require('path');

const data = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [13.411523913043766, 52.53168811873488] }, properties: { type: 1 } }
    ]
};
const scale = Math.pow(2, 2);

const style = [
    {
        renderPlugin: {
            type: 'gltf-phong',
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
            url: 'file://' + path.resolve(__dirname, '../../../resources/gltf/box.glb'),
            scaleX: scale,
            scaleY: scale,
            scaleZ: scale,
            rotationX: 90,
            polygonOpacity: 1,
            polygonFill: '#fff'
        }
    }
];

module.exports = {
    style,
    data,
    containerWidth: 256,
    containerHeight: 256,
    view: {
        center: [13.411523913043766, 52.53168811873488],
        zoom: 19,
        pitch: 50,
        bearing: 60
    }
};
