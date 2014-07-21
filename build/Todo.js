(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = createHash

function createHash(elem) {
    var attributes = elem.attributes
    var hash = {}

    if (attributes === null || attributes === undefined) {
        return hash
    }

    for (var i = 0; i < attributes.length; i++) {
        var attr = attributes[i]

        if (attr.name.substr(0,5) !== "data-") {
            continue
        }

        hash[attr.name.substr(5)] = attr.value
    }

    return hash
}

},{}],2:[function(require,module,exports){
var createStore = require("weakmap-shim/create-store")
var Individual = require("individual")

var createHash = require("./create-hash.js")

var hashStore = Individual("__DATA_SET_WEAKMAP@3", createStore())

module.exports = DataSet

function DataSet(elem) {
    var store = hashStore(elem)

    if (!store.hash) {
        store.hash = createHash(elem)
    }

    return store.hash
}

},{"./create-hash.js":1,"individual":3,"weakmap-shim/create-store":4}],3:[function(require,module,exports){
(function (global){
var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual

function Individual(key, value) {
    if (root[key]) {
        return root[key]
    }

    Object.defineProperty(root, key, {
        value: value
        , configurable: true
    })

    return value
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
var hiddenStore = require('./hidden-store.js');

module.exports = createStore;

function createStore() {
    var key = {};

    return function (obj) {
        if (typeof obj !== 'object' || obj === null) {
            throw new Error('Weakmap-shim: Key must be object')
        }

        var store = obj.valueOf(key);
        return store && store.identity === key ?
            store : hiddenStore(obj, key);
    };
}

},{"./hidden-store.js":5}],5:[function(require,module,exports){
module.exports = hiddenStore;

function hiddenStore(obj, key) {
    var store = { identity: key };
    var valueOf = obj.valueOf;

    Object.defineProperty(obj, "valueOf", {
        value: function (value) {
            return value !== key ?
                valueOf.apply(this, arguments) : store;
        },
        writable: true
    });

    return store;
}

},{}],6:[function(require,module,exports){
var DataSet = require("data-set")

module.exports = addEvent

function addEvent(target, type, handler) {
    var ds = DataSet(target)
    var events = ds[type]

    if (!events) {
        ds[type] = handler
    } else if (Array.isArray(events)) {
        if (events.indexOf(handler) === -1) {
            events.push(handler)
        }
    } else if (events !== handler) {
        ds[type] = [events, handler]
    }
}

},{"data-set":2}],7:[function(require,module,exports){
var globalDocument = require("global/document")
var DataSet = require("data-set")

var addEvent = require("./add-event.js")
var removeEvent = require("./remove-event.js")
var ProxyEvent = require("./proxy-event.js")

module.exports = DOMDelegator

function DOMDelegator(document) {
    document = document || globalDocument

    this.target = document.documentElement
    this.events = {}
    this.rawEventListeners = {}
    this.globalListeners = {}
}

DOMDelegator.prototype.addEventListener = addEvent
DOMDelegator.prototype.removeEventListener = removeEvent

DOMDelegator.prototype.addGlobalEventListener =
    function addGlobalEventListener(eventName, fn) {
        var listeners = this.globalListeners[eventName]
        if (!listeners) {
            listeners = this.globalListeners[eventName] = []
        }

        if (listeners.indexOf(fn) === -1) {
            listeners.push(fn)
        }
    }

DOMDelegator.prototype.removeGlobalEventListener =
    function removeGlobalEventListener(eventName, fn) {
        var listeners = this.globalListeners[eventName]
        if (!listeners) {
            return
        }

        var index = listeners.indexOf(fn)
        if (index !== -1) {
            listeners.splice(index, 1)
        }
    }

DOMDelegator.prototype.listenTo = function listenTo(eventName) {
    if (this.events[eventName]) {
        return
    }

    this.events[eventName] = true
    listen(this, eventName)
}

DOMDelegator.prototype.unlistenTo = function unlistenTo(eventName) {
    if (!this.events[eventName]) {
        return
    }

    this.events[eventName] = false
    unlisten(this, eventName)
}

function listen(delegator, eventName) {
    var listener = delegator.rawEventListeners[eventName]

    if (!listener) {
        listener = delegator.rawEventListeners[eventName] =
            createHandler(eventName, delegator.globalListeners)
    }

    delegator.target.addEventListener(eventName, listener, true)
}

function unlisten(delegator, eventName) {
    var listener = delegator.rawEventListeners[eventName]

    if (!listener) {
        throw new Error("dom-delegator#unlistenTo: cannot " +
            "unlisten to " + eventName)
    }

    delegator.target.removeEventListener(eventName, listener, true)
}

function createHandler(eventName, globalListeners) {
    return handler

    function handler(ev) {
        var globalHandlers = globalListeners[eventName] || []
        var listener = getListener(ev.target, eventName)

        var handlers = globalHandlers
            .concat(listener ? listener.handlers : [])
        if (handlers.length === 0) {
            return
        }

        var arg = new ProxyEvent(ev, listener)

        handlers.forEach(function (handler) {
            typeof handler === "function" ?
                handler(arg) : handler.handleEvent(arg)
        })
    }
}

function getListener(target, type) {
    // terminate recursion if parent is `null`
    if (target === null) {
        return null
    }

    var ds = DataSet(target)
    // fetch list of handler fns for this event
    var handler = ds[type]
    var allHandler = ds.event

    if (!handler && !allHandler) {
        return getListener(target.parentNode, type)
    }

    var handlers = [].concat(handler || [], allHandler || [])
    return new Listener(target, handlers)
}

function Listener(target, handlers) {
    this.currentTarget = target
    this.handlers = handlers
}

},{"./add-event.js":6,"./proxy-event.js":13,"./remove-event.js":14,"data-set":2,"global/document":10}],8:[function(require,module,exports){
var Individual = require("individual")
var cuid = require("cuid")
var globalDocument = require("global/document")

var DOMDelegator = require("./dom-delegator.js")

var delegatorCache = Individual("__DOM_DELEGATOR_CACHE@9", {
    delegators: {}
})
var commonEvents = [
    "blur", "change", "click",  "contextmenu", "dblclick",
    "error","focus", "focusin", "focusout", "input", "keydown",
    "keypress", "keyup", "load", "mousedown", "mouseup",
    "resize", "scroll", "select", "submit", "unload"
]

/*  Delegator is a thin wrapper around a singleton `DOMDelegator`
        instance.

    Only one DOMDelegator should exist because we do not want
        duplicate event listeners bound to the DOM.

    `Delegator` will also `listenTo()` all events unless 
        every caller opts out of it
*/
module.exports = Delegator

function Delegator(opts) {
    opts = opts || {}
    var document = opts.document || globalDocument

    var cacheKey = document["__DOM_DELEGATOR_CACHE_TOKEN@9"]

    if (!cacheKey) {
        cacheKey =
            document["__DOM_DELEGATOR_CACHE_TOKEN@9"] = cuid()
    }

    var delegator = delegatorCache.delegators[cacheKey]

    if (!delegator) {
        delegator = delegatorCache.delegators[cacheKey] =
            new DOMDelegator(document)
    }

    if (opts.defaultEvents !== false) {
        for (var i = 0; i < commonEvents.length; i++) {
            delegator.listenTo(commonEvents[i])
        }
    }

    return delegator
}



},{"./dom-delegator.js":7,"cuid":9,"global/document":10,"individual":11}],9:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 * 
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

/*global window, navigator, document, require, process, module */
(function (app) {
  'use strict';
  var namespace = 'cuid',
    c = 0,
    blockSize = 4,
    base = 36,
    discreteValues = Math.pow(base, blockSize),

    pad = function pad(num, size) {
      var s = "000000000" + num;
      return s.substr(s.length-size);
    },

    randomBlock = function randomBlock() {
      return pad((Math.random() *
            discreteValues << 0)
            .toString(base), blockSize);
    },

    safeCounter = function () {
      c = (c < discreteValues) ? c : 0;
      c++; // this is not subliminal
      return c - 1;
    },

    api = function cuid() {
      // Starting with a lowercase letter makes
      // it HTML element ID friendly.
      var letter = 'c', // hard-coded allows for sequential access

        // timestamp
        // warning: this exposes the exact date and time
        // that the uid was created.
        timestamp = (new Date().getTime()).toString(base),

        // Prevent same-machine collisions.
        counter,

        // A few chars to generate distinct ids for different
        // clients (so different computers are far less
        // likely to generate the same id)
        fingerprint = api.fingerprint(),

        // Grab some more chars from Math.random()
        random = randomBlock() + randomBlock();

        counter = pad(safeCounter().toString(base), blockSize);

      return  (letter + timestamp + counter + fingerprint + random);
    };

  api.slug = function slug() {
    var date = new Date().getTime().toString(36),
      counter,
      print = api.fingerprint().slice(0,1) +
        api.fingerprint().slice(-1),
      random = randomBlock().slice(-2);

      counter = safeCounter().toString(36).slice(-4);

    return date.slice(-2) + 
      counter + print + random;
  };

  api.globalCount = function globalCount() {
    // We want to cache the results of this
    var cache = (function calc() {
        var i,
          count = 0;

        for (i in window) {
          count++;
        }

        return count;
      }());

    api.globalCount = function () { return cache; };
    return cache;
  };

  api.fingerprint = function browserPrint() {
    return pad((navigator.mimeTypes.length +
      navigator.userAgent.length).toString(36) +
      api.globalCount().toString(36), 4);
  };

  // don't change anything from here down.
  if (app.register) {
    app.register(namespace, api);
  } else if (typeof module !== 'undefined') {
    module.exports = api;
  } else {
    app[namespace] = api;
  }

}(this.applitude || this));

},{}],10:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":41}],11:[function(require,module,exports){
module.exports=require(3)
},{}],12:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],13:[function(require,module,exports){
var inherits = require("inherits")

var ALL_PROPS = [
    "altKey", "bubbles", "cancelable", "ctrlKey",
    "eventPhase", "metaKey", "relatedTarget", "shiftKey",
    "target", "timeStamp", "type", "view", "which"
]
var KEY_PROPS = ["char", "charCode", "key", "keyCode"]
var MOUSE_PROPS = [
    "button", "buttons", "clientX", "clientY", "layerX",
    "layerY", "offsetX", "offsetY", "pageX", "pageY",
    "screenX", "screenY", "toElement"
]

var rkeyEvent = /^key|input/
var rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/

module.exports = ProxyEvent

function ProxyEvent(ev, listener) {
    if (!(this instanceof ProxyEvent)) {
        return new ProxyEvent(ev, listener)
    }

    if (rkeyEvent.test(ev.type)) {
        return new KeyEvent(ev, listener)
    } else if (rmouseEvent.test(ev.type)) {
        return new MouseEvent(ev, listener)
    }

    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    this._rawEvent = ev
    this.currentTarget = listener ? listener.currentTarget : null
}

ProxyEvent.prototype.preventDefault = function () {
    this._rawEvent.preventDefault()
}

function MouseEvent(ev, listener) {
    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    for (var j = 0; j < MOUSE_PROPS.length; j++) {
        var mousePropKey = MOUSE_PROPS[j]
        this[mousePropKey] = ev[mousePropKey]
    }

    this._rawEvent = ev
    this.currentTarget = listener ? listener.currentTarget : null
}

inherits(MouseEvent, ProxyEvent)

function KeyEvent(ev, listener) {
    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    for (var j = 0; j < KEY_PROPS.length; j++) {
        var keyPropKey = KEY_PROPS[j]
        this[keyPropKey] = ev[keyPropKey]
    }

    this._rawEvent = ev
    this.currentTarget = listener ? listener.currentTarget : null
}

inherits(KeyEvent, ProxyEvent)

},{"inherits":12}],14:[function(require,module,exports){
var DataSet = require("data-set")

module.exports = removeEvent

function removeEvent(target, type, handler) {
    var ds = DataSet(target)
    var events = ds[type]

    if (!events) {
        return
    } else if (Array.isArray(events)) {
        var index = events.indexOf(handler)
        if (index !== -1) {
            events.splice(index, 1)
        }
    } else if (events === handler) {
        ds[type] = null
    }
}

},{"data-set":2}],15:[function(require,module,exports){
var createElement = require("./vdom/create-element")

module.exports = createElement

},{"./vdom/create-element":22}],16:[function(require,module,exports){
var diff = require("./vtree/diff")

module.exports = diff

},{"./vtree/diff":27}],17:[function(require,module,exports){
if (typeof document !== "undefined") {
    module.exports = document;
} else {
    module.exports = require("min-document");
}

},{"min-document":41}],18:[function(require,module,exports){
module.exports = isObject

function isObject(x) {
    return typeof x === "object" && x !== null
}

},{}],19:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],20:[function(require,module,exports){
var patch = require("./vdom/patch")

module.exports = patch

},{"./vdom/patch":25}],21:[function(require,module,exports){
var isObject = require("is-object")

var isHook = require("../vtree/is-vhook")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (isHook(propValue)) {
            propValue.hook(node,
                propName,
                previous ? previous[propName] : undefined)
        } else {
            if (isObject(propValue)) {
                if (!isObject(node[propName])) {
                    node[propName] = {}
                }

                for (var k in propValue) {
                    node[propName][k] = propValue[k]
                }
            } else if (propValue !== undefined) {
                node[propName] = propValue
            }
        }
    }
}

},{"../vtree/is-vhook":28,"is-object":18}],22:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vtree/is-vnode")
var isVText = require("../vtree/is-vtext")
var isWidget = require("../vtree/is-widget")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vtree/is-vnode":29,"../vtree/is-vtext":30,"../vtree/is-widget":31,"./apply-properties":21,"global/document":17}],23:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],24:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vtree/is-widget")
var VPatch = require("../vtree/vpatch")

var render = require("./create-element")
var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.propeties)
            return domNode
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = render(vText, renderOptions)

        if (parentNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    destroyWidget(domNode, leftVNode)

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    if (updateWidget(leftVNode, widget)) {
        return widget.update(leftVNode, domNode) || domNode
    }

    var parentNode = domNode.parentNode
    var newWidget = render(widget, renderOptions)

    if (parentNode) {
        parentNode.replaceChild(newWidget, domNode)
    }

    destroyWidget(domNode, leftVNode)

    return newWidget
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    destroyWidget(domNode, leftVNode)

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, bIndex) {
    var children = []
    var childNodes = domNode.childNodes
    var len = childNodes.length
    var i

    for (i = 0; i < len; i++) {
        children.push(domNode.childNodes[i])
    }

    for (i = 0; i < len; i++) {
        var move = bIndex[i]
        if (move !== undefined) {
            var node = children[move]
            domNode.removeChild(node)
            domNode.insertBefore(node, childNodes[i])
        }
    }
}

},{"../vtree/is-widget":31,"../vtree/vpatch":33,"./apply-properties":21,"./create-element":22,"./update-widget":26}],25:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var domIndex = require("./dom-index")
var patchOp = require("./patch-op")

module.exports = patch

function patch(rootNode, patches) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument
    var renderOptions

    if (ownerDocument !== document) {
        renderOptions = {
            document: ownerDocument
        }
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./dom-index":23,"./patch-op":24,"global/document":17,"x-is-array":19}],26:[function(require,module,exports){
var isWidget = require("../vtree/is-widget")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("type" in a && "type" in b) {
            return a.type === b.type
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vtree/is-widget":31}],27:[function(require,module,exports){
var isArray = require("x-is-array")
var isObject = require("is-object")

var VPatch = require("./vpatch")
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        hooks(b, patch, index)
        return
    }

    var apply = patch[index]

    if (isWidget(b)) {
        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))

        if (!isWidget(a)) {
            destroyWidgets(a, patch, index)
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            destroyWidgets(a, patch, index)
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties, b.hooks)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                destroyWidgets(a, patch, index)
            }

            apply = diffChildren(a, b, patch, apply, index)
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            destroyWidgets(a, patch, index)
        }
    } else if (b == null) {
        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
        destroyWidgets(a, patch, index)
    }

    if (apply) {
        patch[index] = apply
    }
}

function diffProps(a, b, hooks) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            continue
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (hooks && aKey in hooks) {
            diff = diff || {}
            diff[aKey] = bValue
        } else {
            if (isObject(aValue) && isObject(bValue)) {
                if (getPrototype(bValue) !== getPrototype(aValue)) {
                    diff = diff || {}
                    diff[aKey] = bValue
                } else {
                    var objectDiff = diffProps(aValue, bValue)
                    if (objectDiff) {
                        diff = diff || {}
                        diff[aKey] = objectDiff
                    }
                }
            } else if (aValue !== bValue && bValue !== undefined) {
                diff = diff || {}
                diff[aKey] = bValue
            }
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var bChildren = reorder(aChildren, b.children)

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply, new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else if (!rightNode) {
            if (leftNode) {
                // Excess nodes in a need to be removed
                patch[index] = new VPatch(VPatch.REMOVE, leftNode, null)
                destroyWidgets(leftNode, patch, index)
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (bChildren.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(VPatch.ORDER, a, bChildren.moves))
    }

    return apply
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = new VPatch(VPatch.REMOVE, vNode, null)
        }
    } else if (isVNode(vNode) && vNode.hasWidgets) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    }
}

// Execute hooks when two nodes are identical
function hooks(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = new VPatch(VPatch.PROPS, vNode.hooks, vNode.hooks)
        }

        if (vNode.descendantHooks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                hooks(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    }
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {

    var bKeys = keyIndex(bChildren)

    if (!bKeys) {
        return bChildren
    }

    var aKeys = keyIndex(aChildren)

    if (!aKeys) {
        return bChildren
    }

    var bMatch = {}, aMatch = {}

    for (var key in bKeys) {
        bMatch[bKeys[key]] = aKeys[key]
    }

    for (var key in aKeys) {
        aMatch[aKeys[key]] = bKeys[key]
    }

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen
    var shuffle = []
    var freeIndex = 0
    var i = 0
    var moveIndex = 0
    var moves = shuffle.moves = {}

    while (freeIndex < len) {
        var move = aMatch[i]
        if (move !== undefined) {
            shuffle[i] = bChildren[move]
            moves[move] = moveIndex++
        } else if (i in aMatch) {
            shuffle[i] = undefined
        } else {
            while (bMatch[freeIndex] !== undefined) {
                freeIndex++
            }

            if (freeIndex < len) {
                moves[freeIndex] = moveIndex++
                shuffle[i] = bChildren[freeIndex]
                freeIndex++
            }
        }
        i++
    }

    return shuffle
}

function keyIndex(children) {
    var i, keys

    for (i = 0; i < children.length; i++) {
        var child = children[i]

        if (child.key !== undefined) {
            keys = keys || {}
            keys[child.key] = i
        }
    }

    return keys
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"./is-vnode":29,"./is-vtext":30,"./is-widget":31,"./vpatch":33,"is-object":18,"x-is-array":19}],28:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook && typeof hook.hook === "function" &&
        !hook.hasOwnProperty("hook")
}

},{}],29:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    if (!x) {
        return false;
    }

    return x.type === "VirtualNode" && x.version === version
}

},{"./version":32}],30:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    if (!x) {
        return false;
    }

    return x.type === "VirtualText" && x.version === version
}

},{"./version":32}],31:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && typeof w.init === "function" && typeof w.update === "function"
}

},{}],32:[function(require,module,exports){
module.exports = "1"

},{}],33:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version.split(".")
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":32}],34:[function(require,module,exports){
module.exports=require(28)
},{}],35:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":37}],36:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],37:[function(require,module,exports){
module.exports=require(32)
},{}],38:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property)) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-vhook":34,"./is-vnode":35,"./is-widget":36,"./version":37}],39:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":37}],40:[function(require,module,exports){

var VNode = require('vtree/vnode');
var VText = require('vtree/vtext');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var DataSet = require("data-set");
var Delegator = require("dom-delegator");

Elm.Native.Html = {};
Elm.Native.Html.make = function(elm) {
    elm.Native = elm.Native || {};
    elm.Native.Html = elm.Native.Html || {};
    if (elm.Native.Html.values) return elm.Native.Html.values;
    if ('values' in Elm.Native.Html)
        return elm.Native.Html.values = Elm.Native.Html.values;

    // This manages event listeners. Somehow...
    Delegator();

    var newElement = Elm.Graphics.Element.make(elm).newElement;
    var Utils = Elm.Native.Utils.make(elm);
    var List = Elm.Native.List.make(elm);
    var Maybe = Elm.Maybe.make(elm);
    var eq = Elm.Native.Utils.make(elm).eq;

    function node(name, attributes, properties, contents) {
        return eventNode(name, attributes, properties, List.Nil, contents);
    }

    function eventNode(name, attributes, properties, handlers, contents) {
        var attrs = {};
        while (attributes.ctor !== '[]') {
            var attribute = attributes._0;
            attrs[attribute.key] = attribute.value;
            attributes = attributes._1;
        }
        var props = {};
        while (properties.ctor !== '[]') {
            var property = properties._0;
            props[property.key] = property.value;
            properties = properties._1;
        }
        attrs.style = props;
        while (handlers.ctor !== '[]') {
            var handler = handlers._0;
            attrs[handler.eventName] = DataSetHook(handler.eventHandler);
            handlers = handlers._1;
        }
        return new VNode(name, attrs, List.toArray(contents));
    }

    function pair(key,value) {
        return {
            key: key,
            value: value
        };
    }

    function on(name, coerce) {
        function createListener(handle, convert) {
            function eventHandler(event) {
                var value = coerce(event);
                if (value.ctor === 'Just') {
                    elm.notify(handle.id, convert(value._0));
                }
            }
            return {
                eventName: name,
                eventHandler: eventHandler
            };                
        }
        return F2(createListener);
    }

    function filterMap(f, getter) {
        return function(event) {
            var maybeValue = getter(event);
            return maybeValue.ctor === 'Nothing' ? maybeValue : f(maybeValue._0);
        };
    }
    function getMouseEvent(event) {
        return !('button' in event) ?
            Maybe.Nothing :
            Maybe.Just({
                _: {},
                button: event.button,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey
            });
    }
    function getKeyboardEvent(event) {
        return !('keyCode' in event) ?
            Maybe.Nothing :
            Maybe.Just({
                _: {},
                keyCode: event.keyCode,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey
            });
    }
    function getChecked(event) {
        return 'checked' in event.target ?
            Maybe.Just(event.target.checked) :
            Maybe.Nothing;
    }
    function getValue(event) {
        var node = event.target;
        return 'value' in node ?
            Maybe.Just(event.target.value) :
            Maybe.Nothing;
    }
    function getValueAndSelection(event) {
        var node = event.target;
        return !('selectionStart' in node) ?
            Maybe.Nothing :
            Maybe.Just({
                _: {},
                value: node.value,
                selection: {
                    start: node.selectionStart,
                    end: node.selectionEnd,
                    direction: {
                        ctor: node.selectionDirection === 'forward' ? 'Forward' : 'Backward'
                    }
                }
            });
    }
    function getAnything(event) {
        return Maybe.Just(Utils._Tuple0);
    }

    function DataSetHook(value) {
        if (!(this instanceof DataSetHook)) {
            return new DataSetHook(value);
        }

        this.value = value;
    }

    DataSetHook.prototype.hook = function (node, propertyName) {
        var ds = DataSet(node);
        ds[propertyName] = this.value;
    };

    function text(string) {
        return new VText(string);
    }

    function toElement(width, height, html) {
        return A3(newElement, width, height,
                  { ctor: 'Custom'
                  , type: 'evancz/elm-html'
                  , render: createElement
                  , update: update
                  , model: html
                  });
    }

    function update(node, oldModel, newModel) {
        var patches = diff(oldModel, newModel);
        node = patch(node, patches);
    }

    function lazyRef(fn, a) {
        function thunk() {
            return fn(a);
        }
        return new Thunk('ref', fn, [a], thunk, shouldUpdate_refEq);
    }

    function lazyRef2(fn, a, b) {
        function thunk() {
            return A2(fn, a, b);
        }
        return new Thunk('ref', fn, [a,b], thunk, shouldUpdate_refEq);
    }

    function lazyRef3(fn, a, b, c) {
        function thunk() {
            return A3(fn, a, b, c);
        }
        return new Thunk('ref', fn, [a,b,c], thunk, shouldUpdate_refEq);
    }

    function lazyStruct(fn, a) {
        function thunk() {
            return fn(a);
        }
        return new Thunk('struct', fn, [a], thunk, shouldUpdate_structEq);
    }

    function lazyStruct2(fn, a, b) {
        function thunk() {
            return A2(fn, a, b);
        }
        return new Thunk('struct', fn, [a,b], thunk, shouldUpdate_structEq);
    }

    function lazyStruct3(fn, a, b, c) {
        function thunk() {
            return A3(fn, a, b, c);
        }
        return new Thunk('struct', fn, [a,b,c], thunk, shouldUpdate_structEq);
    }

    function Thunk(kind, fn, args, thunk, shouldUpdate) {
        this.fn = fn;
        this.args = args;
        this.vnode = null;
        this.key = undefined;
        this.thunk = thunk;

        this.kind = kind;
        this.shouldUpdate = shouldUpdate;
    }

    Thunk.prototype.type = "immutable-thunk";
    Thunk.prototype.update = updateThunk;
    Thunk.prototype.init = initThunk;

    function shouldUpdate_refEq(current, previous) {
        if (current.kind !== previous.kind || current.fn !== previous.fn) {
            return true;
        }

        // if it's the same function, we know the number of args must match
        var cargs = current.args;
        var pargs = previous.args;

        for (var i = cargs.length; i--; ) {
            if (cargs[i] !== pargs[i]) {
                return true;
            }
        }

        return false;
    }

    function shouldUpdate_structEq(current, previous) {
        if (current.kind !== previous.kind || current.fn !== previous.fn) {
            return true;
        }

        // if it's the same function, we know the number of args must match
        var cargs = current.args;
        var pargs = previous.args;

        for (var i = cargs.length; i--; ) {
            if (eq(cargs[i], pargs[i])) {
                return true;
            }
        }

        return false;
    }

    function updateThunk(previous, domNode) {
        if (!this.shouldUpdate(this, previous)) {
            this.vnode = previous.vnode;
            return;
        }

        if (!this.vnode) {
            this.vnode = this.thunk();
        }

        var patches = diff(previous.vnode, this.vnode);
        patch(domNode, patches);
    }

    function initThunk() {
        this.vnode = this.thunk();
        return createElement(this.vnode);
    }

    return Elm.Native.Html.values = {
        node: F4(node),
        eventNode: F5(eventNode),
        text: text,
        on: F2(on),

        pair: F2(pair),

        getMouseEvent: getMouseEvent,
        getKeyboardEvent: getKeyboardEvent,
        getChecked: getChecked,
        getValue: getValue,
        getValueAndSelection: getValueAndSelection,
        getAnything: getAnything,
        filterMap: F2(filterMap),

        lazyRef : F2(lazyRef ),
        lazyRef2: F3(lazyRef2),
        lazyRef3: F4(lazyRef3),
        lazyStruct : F2(lazyStruct ),
        lazyStruct2: F3(lazyStruct2),
        lazyStruct3: F4(lazyStruct3),
        toElement: F3(toElement)
    };
};

},{"data-set":2,"dom-delegator":8,"virtual-dom/create-element":15,"virtual-dom/diff":16,"virtual-dom/patch":20,"vtree/vnode":38,"vtree/vtext":39}],41:[function(require,module,exports){

},{}]},{},[40]);
Elm.Todo = Elm.Todo || {};
Elm.Todo.make = function (_elm) {
   "use strict";
   _elm.Todo = _elm.Todo || {};
   if (_elm.Todo.values)
   return _elm.Todo.values;
   var _N = Elm.Native,
   _U = _N.Utils.make(_elm),
   _L = _N.List.make(_elm),
   _A = _N.Array.make(_elm),
   _E = _N.Error.make(_elm),
   $moduleName = "Todo";
   var Basics = Elm.Basics.make(_elm);
   var Color = Elm.Color.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Collage = Elm.Graphics.Collage.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Element = Elm.Graphics.Element.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Input = Elm.Graphics.Input.make(_elm);
   var Html = Elm.Html.make(_elm);
   var Html = Html || {};
   Html.Events = Elm.Html.Events.make(_elm);
   var Html = Html || {};
   Html.Optimize = Html.Optimize || {};
   Html.Optimize.RefEq = Elm.Html.Optimize.RefEq.make(_elm);
   var List = Elm.List.make(_elm);
   var Maybe = Elm.Maybe.make(_elm);
   var Native = Native || {};
   Native.Json = Elm.Native.Json.make(_elm);
   var Native = Native || {};
   Native.Ports = Elm.Native.Ports.make(_elm);
   var Signal = Elm.Signal.make(_elm);
   var String = Elm.String.make(_elm);
   var Text = Elm.Text.make(_elm);
   var Time = Elm.Time.make(_elm);
   var Window = Elm.Window.make(_elm);
   var _op = {};
   var getStorage = Native.Ports.portIn("getStorage",
   function (v) {
      return v === null ? Maybe.Nothing : Maybe.Just(typeof v === "object" && "field" in v && "uid" in v && "visibility" in v && "tasks" in v ? {_: {}
                                                                                                                                                ,field: typeof v.field === "string" || typeof v.field === "object" && v.field instanceof String ? v.field : _E.raise("invalid input, expecting JSString but got " + v.field)
                                                                                                                                                ,uid: typeof v.uid === "number" ? v.uid : _E.raise("invalid input, expecting JSNumber but got " + v.uid)
                                                                                                                                                ,visibility: typeof v.visibility === "string" || typeof v.visibility === "object" && v.visibility instanceof String ? v.visibility : _E.raise("invalid input, expecting JSString but got " + v.visibility)
                                                                                                                                                ,tasks: _U.isJSArray(v.tasks) ? _L.fromArray(v.tasks.map(function (v) {
                                                                                                                                                   return typeof v === "object" && "description" in v && "completed" in v && "editing" in v && "id" in v ? {_: {}
                                                                                                                                                                                                                                                           ,description: typeof v.description === "string" || typeof v.description === "object" && v.description instanceof String ? v.description : _E.raise("invalid input, expecting JSString but got " + v.description)
                                                                                                                                                                                                                                                           ,completed: typeof v.completed === "boolean" ? v.completed : _E.raise("invalid input, expecting JSBoolean but got " + v.completed)
                                                                                                                                                                                                                                                           ,editing: typeof v.editing === "boolean" ? v.editing : _E.raise("invalid input, expecting JSBoolean but got " + v.editing)
                                                                                                                                                                                                                                                           ,id: typeof v.id === "number" ? v.id : _E.raise("invalid input, expecting JSNumber but got " + v.id)} : _E.raise("invalid input, expecting JSObject [\"description\",\"completed\",\"editing\",\"id\"] but got " + v);
                                                                                                                                                })) : _E.raise("invalid input, expecting JSArray but got " + v.tasks)} : _E.raise("invalid input, expecting JSObject [\"field\",\"uid\",\"visibility\",\"tasks\"] but got " + v));
   });
   var infoFooter = A4(Html.node,
   "footer",
   _L.fromArray([A2(Html._op[":="],
   "id",
   "info")]),
   _L.fromArray([]),
   _L.fromArray([A4(Html.node,
                "p",
                _L.fromArray([]),
                _L.fromArray([]),
                _L.fromArray([Html.text("Double-click to edit a todo")]))
                ,A4(Html.node,
                "p",
                _L.fromArray([]),
                _L.fromArray([]),
                _L.fromArray([Html.text("Written by ")
                             ,A4(Html.node,
                             "a",
                             _L.fromArray([A2(Html._op[":="],
                             "href",
                             "https://github.com/evancz")]),
                             _L.fromArray([]),
                             _L.fromArray([Html.text("Evan Czaplicki")]))]))
                ,A4(Html.node,
                "p",
                _L.fromArray([]),
                _L.fromArray([]),
                _L.fromArray([Html.text("Part of ")
                             ,A4(Html.node,
                             "a",
                             _L.fromArray([A2(Html._op[":="],
                             "href",
                             "http://todomvc.com")]),
                             _L.fromArray([]),
                             _L.fromArray([Html.text("TodoMVC")]))]))]));
   var onEnter = F2(function (handle,
   value) {
      return A4(Html.Events.on,
      "keydown",
      A2(Html.Events.when,
      function (k) {
         return _U.eq(k.keyCode,13);
      },
      Html.Events.getKeyboardEvent),
      handle,
      Basics.always(value));
   });
   var ChangeVisibility = function (a) {
      return {ctor: "ChangeVisibility"
             ,_0: a};
   };
   var CheckAll = function (a) {
      return {ctor: "CheckAll"
             ,_0: a};
   };
   var Check = F2(function (a,b) {
      return {ctor: "Check"
             ,_0: a
             ,_1: b};
   });
   var DeleteComplete = {ctor: "DeleteComplete"};
   var Delete = function (a) {
      return {ctor: "Delete"
             ,_0: a};
   };
   var Add = {ctor: "Add"};
   var UpdateTask = F2(function (a,
   b) {
      return {ctor: "UpdateTask"
             ,_0: a
             ,_1: b};
   });
   var EditingTask = F2(function (a,
   b) {
      return {ctor: "EditingTask"
             ,_0: a
             ,_1: b};
   });
   var UpdateField = function (a) {
      return {ctor: "UpdateField"
             ,_0: a};
   };
   var NoOp = {ctor: "NoOp"};
   var actions = Graphics.Input.input(NoOp);
   var taskEntry = function (value) {
      return A4(Html.node,
      "header",
      _L.fromArray([A2(Html._op[":="],
      "id",
      "header")]),
      _L.fromArray([]),
      _L.fromArray([A4(Html.node,
                   "h1",
                   _L.fromArray([]),
                   _L.fromArray([]),
                   _L.fromArray([Html.text("todos")]))
                   ,A5(Html.eventNode,
                   "input",
                   _L.fromArray([A2(Html._op[":="],
                                "id",
                                "new-todo")
                                ,A2(Html._op[":="],
                                "placeholder",
                                "What needs to be done?")
                                ,A2(Html._op[":="],
                                "autofocus",
                                "true")
                                ,A2(Html._op[":="],
                                "value",
                                value)
                                ,A2(Html._op[":="],
                                "name",
                                "newTodo")]),
                   _L.fromArray([]),
                   _L.fromArray([A4(Html.Events.on,
                                "input",
                                Html.Events.getValue,
                                actions.handle,
                                UpdateField)
                                ,A2(onEnter,
                                actions.handle,
                                Add)]),
                   _L.fromArray([]))]));
   };
   var todoItem = function (todo) {
      return function () {
         var className = _L.append(todo.completed ? "completed " : "",
         todo.editing ? "editing" : "");
         return A4(Html.node,
         "li",
         _L.fromArray([A2(Html._op[":="],
         "className",
         className)]),
         _L.fromArray([]),
         _L.fromArray([A4(Html.node,
                      "div",
                      _L.fromArray([A2(Html._op[":="],
                      "className",
                      "view")]),
                      _L.fromArray([]),
                      _L.fromArray([A5(Html.eventNode,
                                   "input",
                                   _L.fromArray([A2(Html._op[":="],
                                                "className",
                                                "toggle")
                                                ,A2(Html._op[":="],
                                                "type",
                                                "checkbox")
                                                ,A2(Html.bool,
                                                "checked",
                                                todo.completed)]),
                                   _L.fromArray([]),
                                   _L.fromArray([A2(Html.Events.onclick,
                                   actions.handle,
                                   function (_v0) {
                                      return function () {
                                         return A2(Check,
                                         todo.id,
                                         Basics.not(todo.completed));
                                      }();
                                   })]),
                                   _L.fromArray([]))
                                   ,A5(Html.eventNode,
                                   "label",
                                   _L.fromArray([]),
                                   _L.fromArray([]),
                                   _L.fromArray([A2(Html.Events.ondblclick,
                                   actions.handle,
                                   function (_v2) {
                                      return function () {
                                         return A2(EditingTask,
                                         todo.id,
                                         true);
                                      }();
                                   })]),
                                   _L.fromArray([Html.text(todo.description)]))
                                   ,A5(Html.eventNode,
                                   "button",
                                   _L.fromArray([A2(Html._op[":="],
                                   "className",
                                   "destroy")]),
                                   _L.fromArray([]),
                                   _L.fromArray([A2(Html.Events.onclick,
                                   actions.handle,
                                   Basics.always(Delete(todo.id)))]),
                                   _L.fromArray([]))]))
                      ,A5(Html.eventNode,
                      "input",
                      _L.fromArray([A2(Html._op[":="],
                                   "className",
                                   "edit")
                                   ,A2(Html._op[":="],
                                   "value",
                                   todo.description)
                                   ,A2(Html._op[":="],
                                   "name",
                                   "title")
                                   ,A2(Html._op[":="],
                                   "id",
                                   _L.append("todo-",
                                   String.show(todo.id)))]),
                      _L.fromArray([]),
                      _L.fromArray([A4(Html.Events.on,
                                   "input",
                                   Html.Events.getValue,
                                   actions.handle,
                                   UpdateTask(todo.id))
                                   ,A2(Html.Events.onblur,
                                   actions.handle,
                                   A2(EditingTask,todo.id,false))
                                   ,A2(onEnter,
                                   actions.handle,
                                   A2(EditingTask,
                                   todo.id,
                                   false))]),
                      _L.fromArray([]))]));
      }();
   };
   var taskList = F2(function (visibility,
   tasks) {
      return function () {
         var allCompleted = A2(List.all,
         function (_) {
            return _.completed;
         },
         tasks);
         var isVisible = function (todo) {
            return function () {
               switch (visibility)
               {case "active":
                  return Basics.not(todo.completed);
                  case "all": return true;
                  case "completed":
                  return todo.completed;}
               _E.Case($moduleName,
               "between lines 169 and 174");
            }();
         };
         return A4(Html.node,
         "section",
         _L.fromArray([A2(Html._op[":="],
         "id",
         "main")]),
         _L.fromArray([A2(Html._op[":="],
         "visibility",
         List.isEmpty(tasks) ? "hidden" : "visible")]),
         _L.fromArray([A5(Html.eventNode,
                      "input",
                      _L.fromArray([A2(Html._op[":="],
                                   "id",
                                   "toggle-all")
                                   ,A2(Html._op[":="],
                                   "type",
                                   "checkbox")
                                   ,A2(Html._op[":="],
                                   "name",
                                   "toggle")
                                   ,A2(Html.bool,
                                   "checked",
                                   allCompleted)]),
                      _L.fromArray([]),
                      _L.fromArray([A2(Html.Events.onclick,
                      actions.handle,
                      function (_v5) {
                         return function () {
                            return CheckAll(Basics.not(allCompleted));
                         }();
                      })]),
                      _L.fromArray([]))
                      ,A4(Html.node,
                      "label",
                      _L.fromArray([A2(Html._op[":="],
                      "htmlFor",
                      "toggle-all")]),
                      _L.fromArray([]),
                      _L.fromArray([Html.text("Mark all as complete")]))
                      ,A4(Html.node,
                      "ul",
                      _L.fromArray([A2(Html._op[":="],
                      "id",
                      "todo-list")]),
                      _L.fromArray([]),
                      A2(List.map,
                      todoItem,
                      A2(List.filter,
                      isVisible,
                      tasks)))]));
      }();
   });
   var visibilitySwap = F3(function (uri,
   visibility,
   actualVisibility) {
      return function () {
         var className = _U.eq(visibility,
         actualVisibility) ? "selected" : "";
         return A5(Html.eventNode,
         "li",
         _L.fromArray([]),
         _L.fromArray([]),
         _L.fromArray([A2(Html.Events.onclick,
         actions.handle,
         Basics.always(ChangeVisibility(visibility)))]),
         _L.fromArray([A4(Html.node,
         "a",
         _L.fromArray([A2(Html._op[":="],
                      "className",
                      className)
                      ,A2(Html._op[":="],
                      "href",
                      uri)]),
         _L.fromArray([]),
         _L.fromArray([Html.text(visibility)]))]));
      }();
   });
   var controls = F2(function (visibility,
   tasks) {
      return function () {
         var tasksCompleted = List.length(A2(List.filter,
         function (_) {
            return _.completed;
         },
         tasks));
         var tasksLeft = List.length(tasks) - tasksCompleted;
         return A4(Html.node,
         "footer",
         _L.fromArray([A2(Html._op[":="],
                      "id",
                      "footer")
                      ,A2(Html.bool,
                      "hidden",
                      List.isEmpty(tasks))]),
         _L.fromArray([]),
         _L.fromArray([A4(Html.node,
                      "span",
                      _L.fromArray([A2(Html._op[":="],
                      "id",
                      "todo-count")]),
                      _L.fromArray([]),
                      _L.fromArray([A4(Html.node,
                                   "strong",
                                   _L.fromArray([]),
                                   _L.fromArray([]),
                                   _L.fromArray([Html.text(String.show(tasksLeft))]))
                                   ,function () {
                                      var item_ = _U.eq(tasksLeft,
                                      1) ? " item" : " items";
                                      return Html.text(_L.append(item_,
                                      " left"));
                                   }()]))
                      ,A4(Html.node,
                      "ul",
                      _L.fromArray([A2(Html._op[":="],
                      "id",
                      "filters")]),
                      _L.fromArray([]),
                      _L.fromArray([A3(visibilitySwap,
                                   "#/",
                                   "all",
                                   visibility)
                                   ,Html.text(" ")
                                   ,A3(visibilitySwap,
                                   "#/active",
                                   "active",
                                   visibility)
                                   ,Html.text(" ")
                                   ,A3(visibilitySwap,
                                   "#/completed",
                                   "completed",
                                   visibility)]))
                      ,A5(Html.eventNode,
                      "button",
                      _L.fromArray([A2(Html._op[":="],
                                   "className",
                                   "clear-completed")
                                   ,A2(Html._op[":="],
                                   "id",
                                   "clear-completed")
                                   ,A2(Html.bool,
                                   "hidden",
                                   _U.eq(tasksCompleted,0))]),
                      _L.fromArray([]),
                      _L.fromArray([A2(Html.Events.onclick,
                      actions.handle,
                      Basics.always(DeleteComplete))]),
                      _L.fromArray([Html.text(_L.append("Clear completed (",
                      _L.append(String.show(tasksCompleted),
                      ")")))]))]));
      }();
   });
   var view = function (state) {
      return A4(Html.node,
      "div",
      _L.fromArray([A2(Html._op[":="],
      "className",
      "todomvc-wrapper")]),
      _L.fromArray([A2(Html._op[":="],
      "visibility",
      "hidden")]),
      _L.fromArray([A4(Html.node,
                   "section",
                   _L.fromArray([A2(Html._op[":="],
                   "id",
                   "todoapp")]),
                   _L.fromArray([]),
                   _L.fromArray([A2(Html.Optimize.RefEq.lazy,
                                taskEntry,
                                state.field)
                                ,A3(Html.Optimize.RefEq.lazy2,
                                taskList,
                                state.visibility,
                                state.tasks)
                                ,A3(Html.Optimize.RefEq.lazy2,
                                controls,
                                state.visibility,
                                state.tasks)]))
                   ,infoFooter]));
   };
   var scene = F2(function (state,
   _v7) {
      return function () {
         switch (_v7.ctor)
         {case "_Tuple2":
            return A4(Graphics.Element.container,
              _v7._0,
              _v7._1,
              Graphics.Element.midTop,
              A3(Html.toElement,
              550,
              _v7._1,
              view(state)));}
         _E.Case($moduleName,
         "on line 296, column 5 to 59");
      }();
   });
   var focus = Native.Ports.portOut("focus",
   Native.Ports.outgoingSignal(function (v) {
      return v;
   }),
   function () {
      var toSelector = function (_v11) {
         return function () {
            switch (_v11.ctor)
            {case "EditingTask":
               return _L.append("#todo-",
                 String.show(_v11._0));}
            _E.Case($moduleName,
            "on line 316, column 42 to 61");
         }();
      };
      var needsFocus = function (act) {
         return function () {
            switch (act.ctor)
            {case "EditingTask":
               return act._1;}
            return false;
         }();
      };
      return A2(Signal._op["<~"],
      toSelector,
      A3(Signal.keepIf,
      needsFocus,
      A2(EditingTask,0,true),
      actions.signal));
   }());
   var emptyState = {_: {}
                    ,field: ""
                    ,tasks: _L.fromArray([])
                    ,uid: 0
                    ,visibility: "all"};
   var startingState = A3(Maybe.maybe,
   emptyState,
   Basics.id,
   getStorage);
   var newTask = F2(function (desc,
   id) {
      return {_: {}
             ,completed: false
             ,description: desc
             ,editing: false
             ,id: id};
   });
   var step = F2(function (action,
   state) {
      return function () {
         switch (action.ctor)
         {case "Add":
            return _U.replace([["uid"
                               ,state.uid + 1]
                              ,["field",""]
                              ,["tasks"
                               ,String.isEmpty(state.field) ? state.tasks : _L.append(state.tasks,
                               _L.fromArray([A2(newTask,
                               state.field,
                               state.uid)]))]],
              state);
            case "ChangeVisibility":
            return _U.replace([["visibility"
                               ,action._0]],
              state);
            case "Check":
            return function () {
                 var update = function (t) {
                    return _U.eq(t.id,
                    action._0) ? _U.replace([["completed"
                                             ,action._1]],
                    t) : t;
                 };
                 return _U.replace([["tasks"
                                    ,A2(List.map,
                                    update,
                                    state.tasks)]],
                 state);
              }();
            case "CheckAll":
            return function () {
                 var update = function (t) {
                    return _U.replace([["completed"
                                       ,action._0]],
                    t);
                 };
                 return _U.replace([["tasks"
                                    ,A2(List.map,
                                    update,
                                    state.tasks)]],
                 state);
              }();
            case "Delete":
            return _U.replace([["tasks"
                               ,A2(List.filter,
                               function (t) {
                                  return !_U.eq(t.id,
                                  action._0);
                               },
                               state.tasks)]],
              state);
            case "DeleteComplete":
            return _U.replace([["tasks"
                               ,A2(List.filter,
                               function ($) {
                                  return Basics.not(function (_) {
                                     return _.completed;
                                  }($));
                               },
                               state.tasks)]],
              state);
            case "EditingTask":
            return function () {
                 var update = function (t) {
                    return _U.eq(t.id,
                    action._0) ? _U.replace([["editing"
                                             ,action._1]],
                    t) : t;
                 };
                 return _U.replace([["tasks"
                                    ,A2(List.map,
                                    update,
                                    state.tasks)]],
                 state);
              }();
            case "NoOp": return state;
            case "UpdateField":
            return _U.replace([["field"
                               ,action._0]],
              state);
            case "UpdateTask":
            return function () {
                 var update = function (t) {
                    return _U.eq(t.id,
                    action._0) ? _U.replace([["description"
                                             ,action._1]],
                    t) : t;
                 };
                 return _U.replace([["tasks"
                                    ,A2(List.map,
                                    update,
                                    state.tasks)]],
                 state);
              }();}
         _E.Case($moduleName,
         "between lines 85 and 122");
      }();
   });
   var state = A3(Signal.foldp,
   step,
   startingState,
   actions.signal);
   var main = A3(Signal.lift2,
   scene,
   state,
   Window.dimensions);
   var setStorage = Native.Ports.portOut("setStorage",
   Native.Ports.outgoingSignal(function (v) {
      return {field: v.field
             ,uid: v.uid
             ,visibility: v.visibility
             ,tasks: _L.toArray(v.tasks).map(function (v) {
                return {description: v.description
                       ,completed: v.completed
                       ,editing: v.editing
                       ,id: v.id};
             })};
   }),
   state);
   var Task = F4(function (a,
   b,
   c,
   d) {
      return {_: {}
             ,completed: b
             ,description: a
             ,editing: c
             ,id: d};
   });
   var State = F4(function (a,
   b,
   c,
   d) {
      return {_: {}
             ,field: b
             ,tasks: a
             ,uid: c
             ,visibility: d};
   });
   _elm.Todo.values = {_op: _op
                      ,newTask: newTask
                      ,emptyState: emptyState
                      ,step: step
                      ,view: view
                      ,onEnter: onEnter
                      ,taskEntry: taskEntry
                      ,taskList: taskList
                      ,todoItem: todoItem
                      ,controls: controls
                      ,visibilitySwap: visibilitySwap
                      ,infoFooter: infoFooter
                      ,main: main
                      ,scene: scene
                      ,state: state
                      ,startingState: startingState
                      ,actions: actions
                      ,NoOp: NoOp
                      ,UpdateField: UpdateField
                      ,EditingTask: EditingTask
                      ,UpdateTask: UpdateTask
                      ,Add: Add
                      ,Delete: Delete
                      ,DeleteComplete: DeleteComplete
                      ,Check: Check
                      ,CheckAll: CheckAll
                      ,ChangeVisibility: ChangeVisibility
                      ,State: State
                      ,Task: Task};
   return _elm.Todo.values;
};Elm.Html = Elm.Html || {};
Elm.Html.Optimize = Elm.Html.Optimize || {};
Elm.Html.Optimize.RefEq = Elm.Html.Optimize.RefEq || {};
Elm.Html.Optimize.RefEq.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   _elm.Html.Optimize = _elm.Html.Optimize || {};
   _elm.Html.Optimize.RefEq = _elm.Html.Optimize.RefEq || {};
   if (_elm.Html.Optimize.RefEq.values)
   return _elm.Html.Optimize.RefEq.values;
   var _N = Elm.Native,
   _U = _N.Utils.make(_elm),
   _L = _N.List.make(_elm),
   _A = _N.Array.make(_elm),
   _E = _N.Error.make(_elm),
   $moduleName = "Html.Optimize.RefEq";
   var Basics = Elm.Basics.make(_elm);
   var Color = Elm.Color.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Collage = Elm.Graphics.Collage.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Element = Elm.Graphics.Element.make(_elm);
   var Html = Elm.Html.make(_elm);
   var List = Elm.List.make(_elm);
   var Maybe = Elm.Maybe.make(_elm);
   var Native = Native || {};
   Native.Html = Elm.Native.Html.make(_elm);
   var Native = Native || {};
   Native.Json = Elm.Native.Json.make(_elm);
   var Native = Native || {};
   Native.Ports = Elm.Native.Ports.make(_elm);
   var Signal = Elm.Signal.make(_elm);
   var String = Elm.String.make(_elm);
   var Text = Elm.Text.make(_elm);
   var Time = Elm.Time.make(_elm);
   var _op = {};
   var lazy3 = Native.Html.lazyRef3;
   var lazy2 = Native.Html.lazyRef2;
   var lazy = Native.Html.lazyRef;
   _elm.Html.Optimize.RefEq.values = {_op: _op
                                     ,lazy: lazy
                                     ,lazy2: lazy2
                                     ,lazy3: lazy3};
   return _elm.Html.Optimize.RefEq.values;
};Elm.Html = Elm.Html || {};
Elm.Html.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   if (_elm.Html.values)
   return _elm.Html.values;
   var _N = Elm.Native,
   _U = _N.Utils.make(_elm),
   _L = _N.List.make(_elm),
   _A = _N.Array.make(_elm),
   _E = _N.Error.make(_elm),
   $moduleName = "Html";
   var Basics = Elm.Basics.make(_elm);
   var Color = Elm.Color.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Collage = Elm.Graphics.Collage.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Element = Elm.Graphics.Element.make(_elm);
   var Html = Html || {};
   Html.Events = Elm.Html.Events.make(_elm);
   var List = Elm.List.make(_elm);
   var Maybe = Elm.Maybe.make(_elm);
   var Native = Native || {};
   Native.Html = Elm.Native.Html.make(_elm);
   var Native = Native || {};
   Native.Json = Elm.Native.Json.make(_elm);
   var Native = Native || {};
   Native.Ports = Elm.Native.Ports.make(_elm);
   var Signal = Elm.Signal.make(_elm);
   var String = Elm.String.make(_elm);
   var Text = Elm.Text.make(_elm);
   var Time = Elm.Time.make(_elm);
   var _op = {};
   var color = function (clr) {
      return function () {
         var c = Color.toRgb(clr);
         var rgb = _L.append(String.show(c.red),
         _L.append(", ",
         _L.append(String.show(c.green),
         _L.append(", ",
         String.show(c.blue)))));
         return _U.eq(c.alpha,
         1) ? _L.append("rgb(",
         _L.append(rgb,
         ")")) : _L.append("rgba(",
         _L.append(rgb,
         _L.append(", ",
         _L.append(String.show(c.alpha),
         ")"))));
      }();
   };
   var pct = function (n) {
      return A2(String.append,
      String.show(100 * n),
      "%");
   };
   var em = function (n) {
      return A2(String.append,
      String.show(n),
      "em");
   };
   var px = function (n) {
      return A2(String.append,
      String.show(n),
      "px");
   };
   var bool = Native.Html.pair;
   _op[":="] = Native.Html.pair;
   var Fact = {ctor: "Fact"};
   var toElement = Native.Html.toElement;
   var text = Native.Html.text;
   var eventNode = Native.Html.eventNode;
   var node = Native.Html.node;
   var Html = {ctor: "Html"};
   _elm.Html.values = {_op: _op
                      ,node: node
                      ,eventNode: eventNode
                      ,text: text
                      ,toElement: toElement
                      ,bool: bool
                      ,px: px
                      ,em: em
                      ,pct: pct
                      ,color: color
                      ,Html: Html
                      ,Fact: Fact};
   return _elm.Html.values;
};Elm.Html = Elm.Html || {};
Elm.Html.Events = Elm.Html.Events || {};
Elm.Html.Events.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   _elm.Html.Events = _elm.Html.Events || {};
   if (_elm.Html.Events.values)
   return _elm.Html.Events.values;
   var _N = Elm.Native,
   _U = _N.Utils.make(_elm),
   _L = _N.List.make(_elm),
   _A = _N.Array.make(_elm),
   _E = _N.Error.make(_elm),
   $moduleName = "Html.Events";
   var Basics = Elm.Basics.make(_elm);
   var Color = Elm.Color.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Collage = Elm.Graphics.Collage.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Element = Elm.Graphics.Element.make(_elm);
   var Graphics = Graphics || {};
   Graphics.Input = Elm.Graphics.Input.make(_elm);
   var Json = Elm.Json.make(_elm);
   var List = Elm.List.make(_elm);
   var Maybe = Elm.Maybe.make(_elm);
   var Native = Native || {};
   Native.Html = Elm.Native.Html.make(_elm);
   var Native = Native || {};
   Native.Json = Elm.Native.Json.make(_elm);
   var Native = Native || {};
   Native.Ports = Elm.Native.Ports.make(_elm);
   var Signal = Elm.Signal.make(_elm);
   var String = Elm.String.make(_elm);
   var Text = Elm.Text.make(_elm);
   var Time = Elm.Time.make(_elm);
   var _op = {};
   var getAnything = Native.Html.getAnything;
   var getKeyboardEvent = Native.Html.getKeyboardEvent;
   var getMouseEvent = Native.Html.getMouseEvent;
   var getValueAndSelection = Native.Html.getValueAndSelection;
   var Backward = {ctor: "Backward"};
   var Forward = {ctor: "Forward"};
   var getValue = Native.Html.getValue;
   var getChecked = Native.Html.getChecked;
   var filterMap = Native.Html.filterMap;
   var when = F2(function (pred,
   getter) {
      return A2(Native.Html.filterMap,
      function (v) {
         return pred(v) ? Maybe.Just(v) : Maybe.Nothing;
      },
      getter);
   });
   var on = F4(function (name,
   coerce,
   handle,
   convert) {
      return A4(Native.Html.on,
      name,
      coerce,
      handle,
      convert);
   });
   var Get = {ctor: "Get"};
   var onsubmit = F2(function (handle,
   value) {
      return A4(Native.Html.on,
      "submit",
      Native.Html.getAnything,
      handle,
      Basics.always(value));
   });
   var onfocus = F2(function (handle,
   value) {
      return A4(Native.Html.on,
      "focus",
      Native.Html.getAnything,
      handle,
      Basics.always(value));
   });
   var onblur = F2(function (handle,
   value) {
      return A4(Native.Html.on,
      "blur",
      Native.Html.getAnything,
      handle,
      Basics.always(value));
   });
   var onKey = function (name) {
      return A2(Native.Html.on,
      name,
      Native.Html.getKeyboardEvent);
   };
   var onkeyup = onKey("keyup");
   var onkeydown = onKey("keydown");
   var onkeypress = onKey("keypress");
   var KeyboardEvent = F5(function (a,
   b,
   c,
   d,
   e) {
      return {_: {}
             ,altKey: b
             ,ctrlKey: c
             ,keyCode: a
             ,metaKey: d
             ,shiftKey: e};
   });
   var onMouse = function (name) {
      return A2(Native.Html.on,
      name,
      Native.Html.getMouseEvent);
   };
   var onclick = onMouse("click");
   var ondblclick = onMouse("dblclick");
   var onmousemove = onMouse("mousemove");
   var onmousedown = onMouse("mousedown");
   var onmouseup = onMouse("mouseup");
   var onmouseenter = onMouse("mouseenter");
   var onmouseleave = onMouse("mouseleave");
   var onmouseover = onMouse("mouseover");
   var onmouseout = onMouse("mouseout");
   var MouseEvent = F5(function (a,
   b,
   c,
   d,
   e) {
      return {_: {}
             ,altKey: b
             ,button: a
             ,ctrlKey: c
             ,metaKey: d
             ,shiftKey: e};
   });
   var EventListener = {ctor: "EventListener"};
   _elm.Html.Events.values = {_op: _op
                             ,EventListener: EventListener
                             ,MouseEvent: MouseEvent
                             ,KeyboardEvent: KeyboardEvent
                             ,onclick: onclick
                             ,ondblclick: ondblclick
                             ,onmousemove: onmousemove
                             ,onmousedown: onmousedown
                             ,onmouseup: onmouseup
                             ,onmouseenter: onmouseenter
                             ,onmouseleave: onmouseleave
                             ,onmouseover: onmouseover
                             ,onmouseout: onmouseout
                             ,onkeyup: onkeyup
                             ,onkeydown: onkeydown
                             ,onkeypress: onkeypress
                             ,onblur: onblur
                             ,onfocus: onfocus
                             ,onsubmit: onsubmit
                             ,on: on
                             ,getChecked: getChecked
                             ,getValue: getValue
                             ,getValueAndSelection: getValueAndSelection
                             ,Forward: Forward
                             ,Backward: Backward
                             ,getMouseEvent: getMouseEvent
                             ,getKeyboardEvent: getKeyboardEvent
                             ,getAnything: getAnything
                             ,when: when
                             ,filterMap: filterMap};
   return _elm.Html.Events.values;
};