import { now, extend } from '../core/util';
import {
    addDomEvent,
    removeDomEvent,
    preventDefault,
    getEventContainerPoint
} from '../core/util/dom';
import Map from './Map';

const events =
    /**
     * mousedown event
     * @event Map#mousedown
     * @type {Object}
     * @property {String} type                    - mousedown
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'mousedown ' +
    /**
     * mouseup event
     * @event Map#mouseup
     * @type {Object}
     * @property {String} type                    - mouseup
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'mouseup ' +
    /**
     * mouseover event
     * @event Map#mouseover
     * @type {Object}
     * @property {String} type                    - mouseover
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'mouseover ' +
    /**
     * mouseout event
     * @event Map#mouseout
     * @type {Object}
     * @property {String} type                    - mouseout
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'mouseout ' +
    /**
     * mouseenter event
     * @event Map#mouseenter
     * @type {Object}
     * @property {String} type                    - mouseenter
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'mouseenter ' +
    /**
     * mouseleave event
     * @event Map#mouseleave
     * @type {Object}
     * @property {String} type                    - mouseleave
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'mouseleave ' +
    /**
     * mousemove event
     * @event Map#mousemove
     * @type {Object}
     * @property {String} type                    - mousemove
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'mousemove ' +
    /**
     * click event
     * @event Map#click
     * @type {Object}
     * @property {String} type                    - click
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'click ' +
    /**
     * dblclick event
     * @event Map#dblclick
     * @type {Object}
     * @property {String} type                    - dblclick
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'dblclick ' +
    /**
     * contextmenu event
     * @event Map#contextmenu
     * @type {Object}
     * @property {String} type                    - contextmenu
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'contextmenu ' +
    /**
     * keypress event
     * @event Map#keypress
     * @type {Object}
     * @property {String} type                    - keypress
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'keypress ' +
    /**
     * touchstart event
     * @event Map#touchstart
     * @type {Object}
     * @property {String} type                    - touchstart
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'touchstart ' +
    /**
     * touchmove event
     * @event Map#touchmove
     * @type {Object}
     * @property {String} type                    - touchmove
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'touchmove ' +
    /**
     * touchend event
     * @event Map#touchend
     * @type {Object}
     * @property {String} type                    - touchend
     * @property {Map} target            - the map fires event
     * @property {Coordinate} coordinate - coordinate of the event
     * @property {Point} containerPoint  - container point of the event
     * @property {Point} viewPoint       - view point of the event
     * @property {Event} domEvent                 - dom event
     */
    'touchend ';
const CLICK_TIME_THRESHOLD = 300;


Map.include(/** @lends Map.prototype */ {
    _registerDomEvents() {
        const dom = this._panels.mapWrapper || this._containerDOM;
        addDomEvent(dom, events, this._handleDOMEvent, this);
    },

    _removeDomEvents() {
        const dom = this._panels.mapWrapper || this._containerDOM;
        removeDomEvent(dom, events, this._handleDOMEvent, this);
    },

    _handleDOMEvent(e) {
        const type = e.type;
        const isMouseDown = type === 'mousedown' || (type === 'touchstart' && (!e.touches || e.touches.length === 1));
        // prevent default contextmenu
        if (isMouseDown) {
            this._domMouseDownTime = now();
            this._domMouseDownView = this.getView();
        }
        const isRotating = type === 'contextmenu' && isRotatingMap(this);
        if (type === 'contextmenu') {
            // prevent context menu, if duration from mousedown > 300ms
            preventDefault(e);
            const downTime = this._domMouseDownTime;
            const time = now();
            if (time - downTime <= CLICK_TIME_THRESHOLD && !isRotating) {
                this._fireDOMEvent(this, e, 'dom:' + e.type);
            }
        } else {
            this._fireDOMEvent(this, e, 'dom:' + e.type);
        }
        if (this._ignoreEvent(e)) {
            return;
        }
        let mimicClick = false;
        // ignore click lasted for more than 300ms.
        // happen.js produce event without touches
        if (isMouseDown) {
            this._mouseDownTime = now();
        } else if ((type === 'click' || type === 'touchend' || type === 'contextmenu')) {
            if (!this._mouseDownTime) {
                //mousedown | touchstart propogation is stopped
                //ignore the click/touchend/contextmenu
                return;
            } else {
                const downTime = this._mouseDownTime;
                delete this._mouseDownTime;
                const time = now();
                if (time - downTime > CLICK_TIME_THRESHOLD) {
                    if (type === 'click' || type === 'contextmenu') {
                        return;
                    }
                } else if (type === 'contextmenu') {
                    if (isRotating) {
                        return;
                    }
                } else if (type === 'touchend') {
                    mimicClick = true;
                }
            }
        }
        let mimicEvent;
        if (mimicClick) {
            if (this._clickTime && (now() - this._clickTime <= CLICK_TIME_THRESHOLD)) {
                delete this._clickTime;
                mimicEvent = 'dblclick';
                this._fireDOMEvent(this, e, 'dom:dblclick');
            } else {
                this._clickTime = now();
                mimicEvent = 'click';
                this._fireDOMEvent(this, e, 'dom:click');
            }
        }
        if (this._ignoreEvent(e)) {
            return;
        }
        this._fireDOMEvent(this, e, type);
        if (mimicEvent) {
            this._fireDOMEvent(this, e, mimicEvent);
        }
    },

    _ignoreEvent(domEvent) {
        //ignore events originated from control and ui doms.
        if (!domEvent || !this._panels.control) {
            return false;
        }
        if (this._isEventOutMap(domEvent)) {
            return true;
        }
        let target = domEvent.srcElement || domEvent.target;
        let preTarget;
        if (target) {
            while (target && target !== this._containerDOM) {
                if (target.className && target.className.indexOf &&
                    (target.className.indexOf('maptalks-control') >= 0 || (target.className.indexOf('maptalks-ui') >= 0 && preTarget && !preTarget['eventsPropagation']))) {
                    return true;
                }
                preTarget = target;
                target = target.parentNode;
            }

        }
        return false;
    },

    _isEventOutMap(domEvent) {
        if (this.getPitch() > this.options['maxVisualPitch']) {
            const actualEvent = this._getActualEvent(domEvent);
            const eventPos = getEventContainerPoint(actualEvent, this._containerDOM);
            if (!this.getContainerExtent().contains(eventPos)) {
                return true;
            }
        }
        return false;
    },

    _parseEvent(e, type) {
        if (!e) {
            return null;
        }
        let eventParam = {
            'domEvent': e
        };
        if (type !== 'keypress') {
            const actual = this._getActualEvent(e);
            if (actual) {
                const containerPoint = getEventContainerPoint(actual, this._containerDOM);
                eventParam = extend(eventParam, {
                    'containerPoint': containerPoint,
                    'viewPoint': this.containerPointToViewPoint(containerPoint)
                });
                const maxVisualPitch = this.options['maxVisualPitch'];
                // ignore coorindate out of visual extent
                if (this.getPitch() <= maxVisualPitch || containerPoint.y >= (this.height - this._getVisualHeight(maxVisualPitch))) {
                    eventParam = extend(eventParam, {
                        'coordinate': this.containerPointToCoord(containerPoint),
                        'point2d': this._containerPointToPoint(containerPoint)
                    });
                }
            }
        }
        return eventParam;
    },

    _parseEventFromCoord(coord) {
        const containerPoint = this.coordToContainerPoint(coord),
            viewPoint = this.containerPointToViewPoint(containerPoint);
        const e = {
            'coordinate': coord,
            'containerPoint': containerPoint,
            'viewPoint': viewPoint,
            'point2d': this.coordToPoint(coord)
        };
        return e;
    },

    _getActualEvent(e) {
        return e.touches && e.touches.length > 0 ?
            e.touches[0] : e.changedTouches && e.changedTouches.length > 0 ?
                e.changedTouches[0] : e;
    },

    _fireDOMEvent(target, e, type) {
        if (this.isRemoved()) {
            return;
        }
        const eventParam = this._parseEvent(e, type);
        this._fireEvent(type, eventParam);
    }

    // _onKeyPress(e) {
    //     if (!this.isRemoved() && e.keyCode === 48 && e.ctrlKey) {
    //         this.setBearing(0);
    //     }
    // }
});

Map.addOnLoadHook('_registerDomEvents');

function isRotatingMap(map) {
    if (!map._domMouseDownView) {
        return true;
    }
    const view = map.getView(), mouseDownView = map._domMouseDownView;
    return (view.bearing !== mouseDownView.bearing || view.pitch !== mouseDownView.pitch);
}
