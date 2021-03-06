goog.provide('ol.events');
goog.provide('ol.events.EventType');
goog.provide('ol.events.KeyCode');

goog.require('ol.object');


/**
 * @enum {string}
 * @const
 */
ol.events.EventType = {
  /**
   * Generic change event.
   * @event ol.events.Event#change
   * @api
   */
  CHANGE: 'change',

  CLICK: 'click',
  DBLCLICK: 'dblclick',
  DRAGENTER: 'dragenter',
  DRAGOVER: 'dragover',
  DROP: 'drop',
  ERROR: 'error',
  KEYDOWN: 'keydown',
  KEYPRESS: 'keypress',
  LOAD: 'load',
  MOUSEDOWN: 'mousedown',
  MOUSEMOVE: 'mousemove',
  MOUSEOUT: 'mouseout',
  MOUSEUP: 'mouseup',
  MOUSEWHEEL: 'mousewheel',
  MSPOINTERDOWN: 'mspointerdown',
  RESIZE: 'resize',
  TOUCHSTART: 'touchstart',
  TOUCHMOVE: 'touchmove',
  TOUCHEND: 'touchend',
  WHEEL: 'wheel'
};


/**
 * @enum {number}
 * @const
 */
ol.events.KeyCode = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};


/**
 * Property name on an event target for the listener map associated with the
 * event target.
 * @const {string}
 * @private
 */
ol.events.LISTENER_MAP_PROP_ = 'olm_' + ((Math.random() * 1e4) | 0);


/**
 * @typedef {EventTarget|ol.events.EventTarget|
 *     {addEventListener: function(string, Function, boolean=),
 *     removeEventListener: function(string, Function, boolean=),
 *     dispatchEvent: function(string)}}
 */
ol.events.EventTargetLike;


/**
 * Key to use with {@link ol.Observable#unByKey}.
 *
 * @typedef {{bindTo: (Object|undefined),
 *     boundListener: (ol.events.ListenerFunctionType|undefined),
 *     callOnce: boolean,
 *     deleteIndex: (number|undefined),
 *     listener: ol.events.ListenerFunctionType,
 *     target: (EventTarget|ol.events.EventTarget),
 *     type: string}}
 * @api
 */
ol.events.Key;


/**
 * Listener function. This function is called with an event object as argument.
 * When the function returns `false`, event propagation will stop.
 *
 * @typedef {function(ol.events.Event)|function(ol.events.Event): boolean}
 * @api
 */
ol.events.ListenerFunctionType;


/**
 * @param {ol.events.Key} listenerObj Listener object.
 * @return {ol.events.ListenerFunctionType} Bound listener.
 */
ol.events.bindListener_ = function(listenerObj) {
  var boundListener = function(evt) {
    var listener = listenerObj.listener;
    var bindTo = listenerObj.bindTo || listenerObj.target;
    if (listenerObj.callOnce) {
      ol.events.unlistenByKey(listenerObj);
    }
    return listener.call(bindTo, evt);
  }
  listenerObj.boundListener = boundListener;
  return boundListener;
};


/**
 * Finds the matching {@link ol.events.Key} in the given listener
 * array.
 *
 * @param {!Array<!ol.events.Key>} listeners Array of listeners.
 * @param {!Function} listener The listener function.
 * @param {Object=} opt_this The `this` value inside the listener.
 * @param {boolean=} opt_setDeleteIndex Set the deleteIndex on the matching
 *     listener, for {@link ol.events.unlistenByKey}.
 * @return {ol.events.Key|undefined} The matching listener object.
 * @private
 */
ol.events.findListener_ = function(listeners, listener, opt_this,
    opt_setDeleteIndex) {
  var listenerObj;
  for (var i = 0, ii = listeners.length; i < ii; ++i) {
    listenerObj = listeners[i];
    if (listenerObj.listener === listener &&
        listenerObj.bindTo === opt_this) {
      if (opt_setDeleteIndex) {
        listenerObj.deleteIndex = i;
      }
      return listenerObj;
    }
  }
  return undefined;
};


/**
 * @param {ol.events.EventTargetLike} target Target.
 * @param {string} type Type.
 * @return {Array.<ol.events.Key>|undefined} Listeners.
 */
ol.events.getListeners = function(target, type) {
  var listenerMap = target[ol.events.LISTENER_MAP_PROP_];
  return listenerMap ? listenerMap[type] : undefined;
};


/**
 * Get the lookup of listeners.  If one does not exist on the target, it is
 * created.
 * @param {ol.events.EventTargetLike} target Target.
 * @return {!Object.<string, Array.<ol.events.Key>>} Map of
 *     listeners by event type.
 * @private
 */
ol.events.getListenerMap_ = function(target) {
  var listenerMap = target[ol.events.LISTENER_MAP_PROP_];
  if (!listenerMap) {
    listenerMap = target[ol.events.LISTENER_MAP_PROP_] = {};
  }
  return listenerMap;
};


/**
 * Clean up all listener objects of the given type.  All properties on the
 * listener objects will be removed, and if no listeners remain in the listener
 * map, it will be removed from the target.
 * @param {ol.events.EventTargetLike} target Target.
 * @param {string} type Type.
 * @private
 */
ol.events.removeListeners_ = function(target, type) {
  var listeners = ol.events.getListeners(target, type);
  if (listeners) {
    for (var i = 0, ii = listeners.length; i < ii; ++i) {
      target.removeEventListener(type, listeners[i].boundListener);
      ol.object.clear(listeners[i])
    }
    listeners.length = 0;
    var listenerMap = target[ol.events.LISTENER_MAP_PROP_];
    if (listenerMap) {
      delete listenerMap[type];
      if (Object.keys(listenerMap).length === 0) {
        delete target[ol.events.LISTENER_MAP_PROP_];
      }
    }
  }
};


/**
 * Registers an event listener on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * This function efficiently binds a `listener` to a `this` object, and returns
 * a key for use with {@link ol.events.unlistenByKey}.
 *
 * @param {ol.events.EventTargetLike} target Event target.
 * @param {string} type Event type.
 * @param {ol.events.ListenerFunctionType} listener Listener.
 * @param {Object=} opt_this Object referenced by the `this` keyword in the
 *     listener. Default is the `target`.
 * @param {boolean=} opt_once If true, add the listener as one-off listener.
 * @return {ol.events.Key} Unique key for the listener.
 */
ol.events.listen = function(target, type, listener, opt_this, opt_once) {
  var listenerMap = ol.events.getListenerMap_(target);
  var listeners = listenerMap[type];
  if (!listeners) {
    listeners = listenerMap[type] = [];
  }
  var listenerObj = ol.events.findListener_(listeners, listener, opt_this,
      false);
  if (listenerObj) {
    if (!opt_once) {
      // Turn one-off listener into a permanent one.
      listenerObj.callOnce = false;
    }
  } else {
    listenerObj = /** @type {ol.events.Key} */ ({
      bindTo: opt_this,
      callOnce: !!opt_once,
      listener: listener,
      target: target,
      type: type
    });
    target.addEventListener(type, ol.events.bindListener_(listenerObj));
    listeners.push(listenerObj);
  }

  return listenerObj;
};


/**
 * Registers a one-off event listener on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * This function efficiently binds a `listener` as self-unregistering listener
 * to a `this` object, and returns a key for use with
 * {@link ol.events.unlistenByKey} in case the listener needs to be unregistered
 * before it is called.
 *
 * When {@link ol.events.listen} is called with the same arguments after this
 * function, the self-unregistering listener will be turned into a permanent
 * listener.
 *
 * @param {ol.events.EventTargetLike} target Event target.
 * @param {string} type Event type.
 * @param {ol.events.ListenerFunctionType} listener Listener.
 * @param {Object=} opt_this Object referenced by the `this` keyword in the
 *     listener. Default is the `target`.
 * @return {ol.events.Key} Key for unlistenByKey.
 */
ol.events.listenOnce = function(target, type, listener, opt_this) {
  return ol.events.listen(target, type, listener, opt_this, true);
};


/**
 * Unregisters an event listener on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * To return a listener, this function needs to be called with the exact same
 * arguments that were used for a previous {@link ol.events.listen} call.
 *
 * @param {ol.events.EventTargetLike} target Event target.
 * @param {string} type Event type.
 * @param {ol.events.ListenerFunctionType} listener Listener.
 * @param {Object=} opt_this Object referenced by the `this` keyword in the
 *     listener. Default is the `target`.
 */
ol.events.unlisten = function(target, type, listener, opt_this) {
  var listeners = ol.events.getListeners(target, type);
  if (listeners) {
    var listenerObj = ol.events.findListener_(listeners, listener, opt_this,
        true);
    if (listenerObj) {
      ol.events.unlistenByKey(listenerObj);
    }
  }
};


/**
 * Unregisters event listeners on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * The argument passed to this function is the key returned from
 * {@link ol.events.listen} or {@link ol.events.listenOnce}.
 *
 * @param {ol.events.Key} key The key.
 */
ol.events.unlistenByKey = function(key) {
  if (key && key.target) {
    key.target.removeEventListener(key.type, key.boundListener);
    var listeners = ol.events.getListeners(key.target, key.type);
    if (listeners) {
      var i = 'deleteIndex' in key ? key.deleteIndex : listeners.indexOf(key);
      if (i !== -1) {
        listeners.splice(i, 1);
      }
      if (listeners.length === 0) {
        ol.events.removeListeners_(key.target, key.type);
      }
    }
    ol.object.clear(key);
  }
};


/**
 * Unregisters all event listeners on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * @param {ol.events.EventTargetLike} target Target.
 */
ol.events.unlistenAll = function(target) {
  var listenerMap = ol.events.getListenerMap_(target);
  for (var type in listenerMap) {
    ol.events.removeListeners_(target, type);
  }
};
