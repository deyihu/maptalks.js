import OverlayLayerRenderer from './OverlayLayerCanvasRenderer';
import LinkLineLayer from '../../../layer/LinkLineLayer';
import { LineString } from '../../../geometry';
// import { getPointsResultPts } from '../../../core/util';

class LinkLineLayerCanvasRenderer extends OverlayLayerRenderer {

    draw() {
        this._drawLines();
        return this;

    }


    drawOnInteracting() {
        this._drawLines();
        return this;
    }

    _drawLines() {
        const layer = this.layer;
        if (!layer) {
            return this;
        }
        const map = this.layer.getMap();
        if (!map) {
            return this;
        }
        this.prepareCanvas();
        if (!this.context) {
            return this;
        }
        const lines = this.layer._geoList.filter(g => {
            if (g instanceof LineString) {
                g._getPainter();
                return true;
            }
            return false;
        });
        lines.forEach(line => {
            this._drawLinkLine(line);
        });
        this.completeRender();
        return this;
    }

    _drawLinkLine(line) {
        const map = this.layer.getMap();
        const coords = line.getCoordinates();
        if (!coords || !coords.length) {
            return this;
        }
        if (!line._painter) {
            return this;
        }
        const symbolizer = line._painter.symbolizers;
        const lineSymbol = symbolizer[0];
        if (!lineSymbol) {
            return this;
        }
        const altitude = line._painter.getAltitude();
        const { lineColor, lineWidth, shadowBlur, shadowColor, vertexs, offsetX, offsetY } = lineSymbol.symbol || {};
        const renderPoints = line._painter.getRenderPoints()[0][0];
        const glRes = map.getGLRes();
        const pixel = map._pointAtResToContainerPoint(renderPoints, glRes, altitude);
        const ctx = this.context;
        ctx.strokeStyle = lineColor || '#000';
        ctx.lineWidth = lineWidth || 1;
        if (shadowBlur) {
            ctx.shadowBlur = shadowBlur;
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.shadowColor = shadowColor;
        ctx.beginPath();
        ctx.moveTo(pixel.x + offsetX, pixel.y + offsetY);
        if (Array.isArray(vertexs)) {
            for (let i = vertexs.length - 1; i >= 0; i--) {
                const vertex = vertexs[i];
                if (Array.isArray(vertex)) {
                    const [x, y] = vertex;
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();
        return this;

    }
}

LinkLineLayer.registerRenderer('canvas', LinkLineLayerCanvasRenderer);

export default LinkLineLayerCanvasRenderer;
