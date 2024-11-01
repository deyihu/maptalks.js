// import OverlayLayer from './OverlayLayer';
import VectorLayer from './VectorLayer';

const options = {
    'geometryEvents': false,
    'hitDetect': false,
    'enableAltitude': true,
    'forceRenderOnMoving': true,
    'forceRenderOnZooming': true,
    'forceRenderOnRotating': true,
};

class LinkLineLayer extends VectorLayer {

}
LinkLineLayer.mergeOptions(options);
export default LinkLineLayer;