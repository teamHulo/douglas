var SECTION_ID_ATTR$1 = 'data-section-id';

function Section(container, properties) {
  this.container = validateContainerElement(container);
  this.id = container.getAttribute(SECTION_ID_ATTR$1);
  this.extensions = [];

  // eslint-disable-next-line es5/no-es6-static-methods
  Object.assign(this, validatePropertiesObject(properties));

  this.onLoad();
}

Section.prototype = {
  onLoad: Function.prototype,
  onUnload: Function.prototype,
  onSelect: Function.prototype,
  onDeselect: Function.prototype,
  onBlockSelect: Function.prototype,
  onBlockDeselect: Function.prototype,

  extend: function extend(extension) {
    this.extensions.push(extension); // Save original extension

    // eslint-disable-next-line es5/no-es6-static-methods
    var extensionClone = Object.assign({}, extension);
    delete extensionClone.init; // Remove init function before assigning extension properties

    // eslint-disable-next-line es5/no-es6-static-methods
    Object.assign(this, extensionClone);

    if (typeof extension.init === 'function') {
      extension.init.apply(this);
    }
  }
};

function validateContainerElement(container) {
  if (!(container instanceof Element)) {
    throw new TypeError(
      'Theme Sections: Attempted to load section. The section container provided is not a DOM element.'
    );
  }
  if (container.getAttribute(SECTION_ID_ATTR$1) === null) {
    throw new Error(
      'Theme Sections: The section container provided does not have an id assigned to the ' +
        SECTION_ID_ATTR$1 +
        ' attribute.'
    );
  }

  return container;
}

function validatePropertiesObject(value) {
  if (
    (typeof value !== 'undefined' && typeof value !== 'object') ||
    value === null
  ) {
    throw new TypeError(
      'Theme Sections: The properties object provided is not a valid'
    );
  }

  return value;
}

// Object.assign() polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, 'assign', {
    value: function assign(target) {
      if (target == null) {
        // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) {
          // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

/*
 * @shopify/theme-sections
 * -----------------------------------------------------------------------------
 *
 * A framework to provide structure to your Shopify sections and a load and unload
 * lifecycle. The lifecycle is automatically connected to theme editor events so
 * that your sections load and unload as the editor changes the content and
 * settings of your sections.
 */

var SECTION_TYPE_ATTR = 'data-section-type';
var SECTION_ID_ATTR = 'data-section-id';

window.Shopify = window.Shopify || {};
window.Shopify.theme = window.Shopify.theme || {};
window.Shopify.theme.sections = window.Shopify.theme.sections || {};

var registered = (window.Shopify.theme.sections.registered =
  window.Shopify.theme.sections.registered || {});
var instances = (window.Shopify.theme.sections.instances =
  window.Shopify.theme.sections.instances || []);

function register(type, properties) {
  if (typeof type !== 'string') {
    throw new TypeError(
      'Theme Sections: The first argument for .register must be a string that specifies the type of the section being registered'
    );
  }

  if (typeof registered[type] !== 'undefined') {
    throw new Error(
      'Theme Sections: A section of type "' +
        type +
        '" has already been registered. You cannot register the same section type twice'
    );
  }

  function TypedSection(container) {
    Section.call(this, container, properties);
  }

  TypedSection.constructor = Section;
  TypedSection.prototype = Object.create(Section.prototype);
  TypedSection.prototype.type = type;

  return (registered[type] = TypedSection);
}

function load(types, containers) {
  types = normalizeType(types);

  if (typeof containers === 'undefined') {
    containers = document.querySelectorAll('[' + SECTION_TYPE_ATTR + ']');
  }

  containers = normalizeContainers(containers);

  types.forEach(function(type) {
    var TypedSection = registered[type];

    if (typeof TypedSection === 'undefined') {
      return;
    }

    containers = containers.filter(function(container) {
      // Filter from list of containers because container already has an instance loaded
      if (isInstance(container)) {
        return false;
      }

      // Filter from list of containers because container doesn't have data-section-type attribute
      if (container.getAttribute(SECTION_TYPE_ATTR) === null) {
        return false;
      }

      // Keep in list of containers because current type doesn't match
      if (container.getAttribute(SECTION_TYPE_ATTR) !== type) {
        return true;
      }

      instances.push(new TypedSection(container));

      // Filter from list of containers because container now has an instance loaded
      return false;
    });
  });
}

function unload(selector) {
  var instancesToUnload = getInstances(selector);

  instancesToUnload.forEach(function(instance) {
    var index = instances
      .map(function(e) {
        return e.id;
      })
      .indexOf(instance.id);
    instances.splice(index, 1);
    instance.onUnload();
  });
}

function getInstances(selector) {
  var filteredInstances = [];

  // Fetch first element if its an array
  if (NodeList.prototype.isPrototypeOf(selector) || Array.isArray(selector)) {
    var firstElement = selector[0];
  }

  // If selector element is DOM element
  if (selector instanceof Element || firstElement instanceof Element) {
    var containers = normalizeContainers(selector);

    containers.forEach(function(container) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.container === container;
        })
      );
    });

    // If select is type string
  } else if (typeof selector === 'string' || typeof firstElement === 'string') {
    var types = normalizeType(selector);

    types.forEach(function(type) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.type === type;
        })
      );
    });
  }

  return filteredInstances;
}

function getInstanceById(id) {
  var instance;

  for (var i = 0; i < instances.length; i++) {
    if (instances[i].id === id) {
      instance = instances[i];
      break;
    }
  }
  return instance;
}

function isInstance(selector) {
  return getInstances(selector).length > 0;
}

function normalizeType(types) {
  // If '*' then fetch all registered section types
  if (types === '*') {
    types = Object.keys(registered);

    // If a single section type string is passed, put it in an array
  } else if (typeof types === 'string') {
    types = [types];

    // If single section constructor is passed, transform to array with section
    // type string
  } else if (types.constructor === Section) {
    types = [types.prototype.type];

    // If array of typed section constructors is passed, transform the array to
    // type strings
  } else if (Array.isArray(types) && types[0].constructor === Section) {
    types = types.map(function(TypedSection) {
      return TypedSection.prototype.type;
    });
  }

  types = types.map(function(type) {
    return type.toLowerCase();
  });

  return types;
}

function normalizeContainers(containers) {
  // Nodelist with entries
  if (NodeList.prototype.isPrototypeOf(containers) && containers.length > 0) {
    containers = Array.prototype.slice.call(containers);

    // Empty Nodelist
  } else if (
    NodeList.prototype.isPrototypeOf(containers) &&
    containers.length === 0
  ) {
    containers = [];

    // Handle null (document.querySelector() returns null with no match)
  } else if (containers === null) {
    containers = [];

    // Single DOM element
  } else if (!Array.isArray(containers) && containers instanceof Element) {
    containers = [containers];
  }

  return containers;
}

if (window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', function(event) {
    var id = event.detail.sectionId;
    var container = event.target.querySelector(
      '[' + SECTION_ID_ATTR + '="' + id + '"]'
    );

    if (container !== null) {
      load(container.getAttribute(SECTION_TYPE_ATTR), container);
    }
  });

  document.addEventListener('shopify:section:unload', function(event) {
    var id = event.detail.sectionId;
    var container = event.target.querySelector(
      '[' + SECTION_ID_ATTR + '="' + id + '"]'
    );
    var instance = getInstances(container)[0];

    if (typeof instance === 'object') {
      unload(container);
    }
  });

  document.addEventListener('shopify:section:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onSelect(event);
    }
  });

  document.addEventListener('shopify:section:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onDeselect(event);
    }
  });

  document.addEventListener('shopify:block:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockSelect(event);
    }
  });

  document.addEventListener('shopify:block:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockDeselect(event);
    }
  });
}

function n$2(n,t){return void 0===t&&(t=document),t.querySelector(n)}function t$3(n,t){return void 0===t&&(t=document),[].slice.call(t.querySelectorAll(n))}function c$1(n,t){return Array.isArray(n)?n.forEach(t):t(n)}function r$4(n){return function(t,r,e){return c$1(t,function(t){return t[n+"EventListener"](r,e)})}}function e$3(n,t,c){return r$4("add")(n,t,c),function(){return r$4("remove")(n,t,c)}}function o$2(n){return function(t){var r=arguments;return c$1(t,function(t){var c;return (c=t.classList)[n].apply(c,[].slice.call(r,1))})}}function u$1(n){o$2("add").apply(void 0,[n].concat([].slice.call(arguments,1)));}function i$1(n){o$2("remove").apply(void 0,[n].concat([].slice.call(arguments,1)));}function l(n){o$2("toggle").apply(void 0,[n].concat([].slice.call(arguments,1)));}function a$1(n,t){return n.classList.contains(t)}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var isMobile$2 = {exports: {}};

isMobile$2.exports = isMobile;
isMobile$2.exports.isMobile = isMobile;
isMobile$2.exports.default = isMobile;

var mobileRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i;

var tabletRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino|android|ipad|playbook|silk/i;

function isMobile (opts) {
  if (!opts) opts = {};
  var ua = opts.ua;
  if (!ua && typeof navigator !== 'undefined') ua = navigator.userAgent;
  if (ua && ua.headers && typeof ua.headers['user-agent'] === 'string') {
    ua = ua.headers['user-agent'];
  }
  if (typeof ua !== 'string') return false

  var result = opts.tablet ? tabletRE.test(ua) : mobileRE.test(ua);

  if (
    !result &&
    opts.tablet &&
    opts.featureDetect &&
    navigator &&
    navigator.maxTouchPoints > 1 &&
    ua.indexOf('Macintosh') !== -1 &&
    ua.indexOf('Safari') !== -1
  ) {
    result = true;
  }

  return result
}

var isMobile$1 = isMobile$2.exports;

var browser = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/**
 * DOM event delegator
 *
 * The delegator will listen
 * for events that bubble up
 * to the root node.
 *
 * @constructor
 * @param {Node|string} [root] The root node or a selector string matching the root node
 */
function Delegate(root) {
  /**
   * Maintain a map of listener
   * lists, keyed by event name.
   *
   * @type Object
   */
  this.listenerMap = [{}, {}];

  if (root) {
    this.root(root);
  }
  /** @type function() */


  this.handle = Delegate.prototype.handle.bind(this); // Cache of event listeners removed during an event cycle

  this._removedListeners = [];
}
/**
 * Start listening for events
 * on the provided DOM element
 *
 * @param  {Node|string} [root] The root node or a selector string matching the root node
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.root = function (root) {
  var listenerMap = this.listenerMap;
  var eventType; // Remove master event listeners

  if (this.rootElement) {
    for (eventType in listenerMap[1]) {
      if (listenerMap[1].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, true);
      }
    }

    for (eventType in listenerMap[0]) {
      if (listenerMap[0].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, false);
      }
    }
  } // If no root or root is not
  // a dom node, then remove internal
  // root reference and exit here


  if (!root || !root.addEventListener) {
    if (this.rootElement) {
      delete this.rootElement;
    }

    return this;
  }
  /**
   * The root node at which
   * listeners are attached.
   *
   * @type Node
   */


  this.rootElement = root; // Set up master event listeners

  for (eventType in listenerMap[1]) {
    if (listenerMap[1].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, true);
    }
  }

  for (eventType in listenerMap[0]) {
    if (listenerMap[0].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, false);
    }
  }

  return this;
};
/**
 * @param {string} eventType
 * @returns boolean
 */


Delegate.prototype.captureForType = function (eventType) {
  return ['blur', 'error', 'focus', 'load', 'resize', 'scroll'].indexOf(eventType) !== -1;
};
/**
 * Attach a handler to one
 * event for all elements
 * that match the selector,
 * now or in the future
 *
 * The handler function receives
 * three arguments: the DOM event
 * object, the node that matched
 * the selector while the event
 * was bubbling and a reference
 * to itself. Within the handler,
 * 'this' is equal to the second
 * argument.
 *
 * The node that actually received
 * the event can be accessed via
 * 'event.target'.
 *
 * @param {string} eventType Listen for these events
 * @param {string|undefined} selector Only handle events on elements matching this selector, if undefined match root element
 * @param {function()} handler Handler function - event data passed here will be in event.data
 * @param {boolean} [useCapture] see 'useCapture' in <https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener>
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.on = function (eventType, selector, handler, useCapture) {
  var root;
  var listenerMap;
  var matcher;
  var matcherParam;

  if (!eventType) {
    throw new TypeError('Invalid event type: ' + eventType);
  } // handler can be passed as
  // the second or third argument


  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // Fallback to sensible defaults
  // if useCapture not set


  if (useCapture === undefined) {
    useCapture = this.captureForType(eventType);
  }

  if (typeof handler !== 'function') {
    throw new TypeError('Handler must be a type of Function');
  }

  root = this.rootElement;
  listenerMap = this.listenerMap[useCapture ? 1 : 0]; // Add master handler for type if not created yet

  if (!listenerMap[eventType]) {
    if (root) {
      root.addEventListener(eventType, this.handle, useCapture);
    }

    listenerMap[eventType] = [];
  }

  if (!selector) {
    matcherParam = null; // COMPLEX - matchesRoot needs to have access to
    // this.rootElement, so bind the function to this.

    matcher = matchesRoot.bind(this); // Compile a matcher for the given selector
  } else if (/^[a-z]+$/i.test(selector)) {
    matcherParam = selector;
    matcher = matchesTag;
  } else if (/^#[a-z0-9\-_]+$/i.test(selector)) {
    matcherParam = selector.slice(1);
    matcher = matchesId;
  } else {
    matcherParam = selector;
    matcher = Element.prototype.matches;
  } // Add to the list of listeners


  listenerMap[eventType].push({
    selector: selector,
    handler: handler,
    matcher: matcher,
    matcherParam: matcherParam
  });
  return this;
};
/**
 * Remove an event handler
 * for elements that match
 * the selector, forever
 *
 * @param {string} [eventType] Remove handlers for events matching this type, considering the other parameters
 * @param {string} [selector] If this parameter is omitted, only handlers which match the other two will be removed
 * @param {function()} [handler] If this parameter is omitted, only handlers which match the previous two will be removed
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.off = function (eventType, selector, handler, useCapture) {
  var i;
  var listener;
  var listenerMap;
  var listenerList;
  var singleEventType; // Handler can be passed as
  // the second or third argument

  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // If useCapture not set, remove
  // all event listeners


  if (useCapture === undefined) {
    this.off(eventType, selector, handler, true);
    this.off(eventType, selector, handler, false);
    return this;
  }

  listenerMap = this.listenerMap[useCapture ? 1 : 0];

  if (!eventType) {
    for (singleEventType in listenerMap) {
      if (listenerMap.hasOwnProperty(singleEventType)) {
        this.off(singleEventType, selector, handler);
      }
    }

    return this;
  }

  listenerList = listenerMap[eventType];

  if (!listenerList || !listenerList.length) {
    return this;
  } // Remove only parameter matches
  // if specified


  for (i = listenerList.length - 1; i >= 0; i--) {
    listener = listenerList[i];

    if ((!selector || selector === listener.selector) && (!handler || handler === listener.handler)) {
      this._removedListeners.push(listener);

      listenerList.splice(i, 1);
    }
  } // All listeners removed


  if (!listenerList.length) {
    delete listenerMap[eventType]; // Remove the main handler

    if (this.rootElement) {
      this.rootElement.removeEventListener(eventType, this.handle, useCapture);
    }
  }

  return this;
};
/**
 * Handle an arbitrary event.
 *
 * @param {Event} event
 */


Delegate.prototype.handle = function (event) {
  var i;
  var l;
  var type = event.type;
  var root;
  var phase;
  var listener;
  var returned;
  var listenerList = [];
  var target;
  var eventIgnore = 'ftLabsDelegateIgnore';

  if (event[eventIgnore] === true) {
    return;
  }

  target = event.target; // Hardcode value of Node.TEXT_NODE
  // as not defined in IE8

  if (target.nodeType === 3) {
    target = target.parentNode;
  } // Handle SVG <use> elements in IE


  if (target.correspondingUseElement) {
    target = target.correspondingUseElement;
  }

  root = this.rootElement;
  phase = event.eventPhase || (event.target !== event.currentTarget ? 3 : 2); // eslint-disable-next-line default-case

  switch (phase) {
    case 1:
      //Event.CAPTURING_PHASE:
      listenerList = this.listenerMap[1][type];
      break;

    case 2:
      //Event.AT_TARGET:
      if (this.listenerMap[0] && this.listenerMap[0][type]) {
        listenerList = listenerList.concat(this.listenerMap[0][type]);
      }

      if (this.listenerMap[1] && this.listenerMap[1][type]) {
        listenerList = listenerList.concat(this.listenerMap[1][type]);
      }

      break;

    case 3:
      //Event.BUBBLING_PHASE:
      listenerList = this.listenerMap[0][type];
      break;
  }

  var toFire = []; // Need to continuously check
  // that the specific list is
  // still populated in case one
  // of the callbacks actually
  // causes the list to be destroyed.

  l = listenerList.length;

  while (target && l) {
    for (i = 0; i < l; i++) {
      listener = listenerList[i]; // Bail from this loop if
      // the length changed and
      // no more listeners are
      // defined between i and l.

      if (!listener) {
        break;
      }

      if (target.tagName && ["button", "input", "select", "textarea"].indexOf(target.tagName.toLowerCase()) > -1 && target.hasAttribute("disabled")) {
        // Remove things that have previously fired
        toFire = [];
      } // Check for match and fire
      // the event if there's one
      //
      // TODO:MCG:20120117: Need a way
      // to check if event#stopImmediatePropagation
      // was called. If so, break both loops.
      else if (listener.matcher.call(target, listener.matcherParam, target)) {
          toFire.push([event, target, listener]);
        }
    } // TODO:MCG:20120117: Need a way to
    // check if event#stopPropagation
    // was called. If so, break looping
    // through the DOM. Stop if the
    // delegation root has been reached


    if (target === root) {
      break;
    }

    l = listenerList.length; // Fall back to parentNode since SVG children have no parentElement in IE

    target = target.parentElement || target.parentNode; // Do not traverse up to document root when using parentNode, though

    if (target instanceof HTMLDocument) {
      break;
    }
  }

  var ret;

  for (i = 0; i < toFire.length; i++) {
    // Has it been removed during while the event function was fired
    if (this._removedListeners.indexOf(toFire[i][2]) > -1) {
      continue;
    }

    returned = this.fire.apply(this, toFire[i]); // Stop propagation to subsequent
    // callbacks if the callback returned
    // false

    if (returned === false) {
      toFire[i][0][eventIgnore] = true;
      toFire[i][0].preventDefault();
      ret = false;
      break;
    }
  }

  return ret;
};
/**
 * Fire a listener on a target.
 *
 * @param {Event} event
 * @param {Node} target
 * @param {Object} listener
 * @returns {boolean}
 */


Delegate.prototype.fire = function (event, target, listener) {
  return listener.handler.call(target, event, target);
};
/**
 * Check whether an element
 * matches a tag selector.
 *
 * Tags are NOT case-sensitive,
 * except in XML (and XML-based
 * languages such as XHTML).
 *
 * @param {string} tagName The tag name to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesTag(tagName, element) {
  return tagName.toLowerCase() === element.tagName.toLowerCase();
}
/**
 * Check whether an element
 * matches the root.
 *
 * @param {?String} selector In this case this is always passed through as null and not used
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesRoot(selector, element) {
  if (this.rootElement === window) {
    return (// Match the outer document (dispatched from document)
      element === document || // The <html> element (dispatched from document.body or document.documentElement)
      element === document.documentElement || // Or the window itself (dispatched from window)
      element === window
    );
  }

  return this.rootElement === element;
}
/**
 * Check whether the ID of
 * the element in 'this'
 * matches the given ID.
 *
 * IDs are case-sensitive.
 *
 * @param {string} id The ID to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesId(id, element) {
  return id === element.id;
}
/**
 * Short hand for off()
 * and root(), ie both
 * with no parameters
 *
 * @return void
 */


Delegate.prototype.destroy = function () {
  this.off();
  this.root();
};

var _default = Delegate;
exports.default = _default;
module.exports = exports.default;
}(browser, browser.exports));

var Delegate = /*@__PURE__*/getDefaultExportFromCjs(browser.exports);

var pageTransition = (() => {
  const pageTransitionOverlay = document.querySelector("#page-transition-overlay");
  const animationDuration = 200;
  if (pageTransitionOverlay) {
    pageTransitionOverlay.classList.remove("skip-transition");
    setTimeout(function () {
      pageTransitionOverlay.classList.remove("active");
    }, 0);
    setTimeout(() => {
      // Prevent the theme editor from seeing this
      pageTransitionOverlay.classList.remove("active");
    }, animationDuration);
    const delegate = new Delegate(document.body);
    delegate.on("click", 'a[href]:not([href^="#"]):not(.no-transition):not([href^="mailto:"]):not([href^="tel:"]):not([target="_blank"])', onClickedToLeave);
    window.onpageshow = function (e) {
      if (e.persisted) {
        pageTransitionOverlay.classList.remove("active");
      }
    };
  }
  function onClickedToLeave(event, target) {
    // avoid interupting open-in-new-tab click
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();

    // Hint to browser to prerender destination
    let linkHint = document.createElement("link");
    linkHint.setAttribute("rel", "prerender");
    linkHint.setAttribute("href", target.href);
    document.head.appendChild(linkHint);
    setTimeout(() => {
      window.location.href = target.href;
    }, animationDuration);
    pageTransitionOverlay.classList.add("active");
  }
});

/*!
* tabbable 5.3.3
* @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
*/
var candidateSelectors = ['input', 'select', 'textarea', 'a[href]', 'button', '[tabindex]:not(slot)', 'audio[controls]', 'video[controls]', '[contenteditable]:not([contenteditable="false"])', 'details>summary:first-of-type', 'details'];
var candidateSelector = /* #__PURE__ */candidateSelectors.join(',');
var NoElement = typeof Element === 'undefined';
var matches = NoElement ? function () {} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
var getRootNode = !NoElement && Element.prototype.getRootNode ? function (element) {
  return element.getRootNode();
} : function (element) {
  return element.ownerDocument;
};
/**
 * @param {Element} el container to check in
 * @param {boolean} includeContainer add container to check
 * @param {(node: Element) => boolean} filter filter candidates
 * @returns {Element[]}
 */

var getCandidates = function getCandidates(el, includeContainer, filter) {
  var candidates = Array.prototype.slice.apply(el.querySelectorAll(candidateSelector));

  if (includeContainer && matches.call(el, candidateSelector)) {
    candidates.unshift(el);
  }

  candidates = candidates.filter(filter);
  return candidates;
};
/**
 * @callback GetShadowRoot
 * @param {Element} element to check for shadow root
 * @returns {ShadowRoot|boolean} ShadowRoot if available or boolean indicating if a shadowRoot is attached but not available.
 */

/**
 * @callback ShadowRootFilter
 * @param {Element} shadowHostNode the element which contains shadow content
 * @returns {boolean} true if a shadow root could potentially contain valid candidates.
 */

/**
 * @typedef {Object} CandidatesScope
 * @property {Element} scope contains inner candidates
 * @property {Element[]} candidates
 */

/**
 * @typedef {Object} IterativeOptions
 * @property {GetShadowRoot|boolean} getShadowRoot true if shadow support is enabled; falsy if not;
 *  if a function, implies shadow support is enabled and either returns the shadow root of an element
 *  or a boolean stating if it has an undisclosed shadow root
 * @property {(node: Element) => boolean} filter filter candidates
 * @property {boolean} flatten if true then result will flatten any CandidatesScope into the returned list
 * @property {ShadowRootFilter} shadowRootFilter filter shadow roots;
 */

/**
 * @param {Element[]} elements list of element containers to match candidates from
 * @param {boolean} includeContainer add container list to check
 * @param {IterativeOptions} options
 * @returns {Array.<Element|CandidatesScope>}
 */


var getCandidatesIteratively = function getCandidatesIteratively(elements, includeContainer, options) {
  var candidates = [];
  var elementsToCheck = Array.from(elements);

  while (elementsToCheck.length) {
    var element = elementsToCheck.shift();

    if (element.tagName === 'SLOT') {
      // add shadow dom slot scope (slot itself cannot be focusable)
      var assigned = element.assignedElements();
      var content = assigned.length ? assigned : element.children;
      var nestedCandidates = getCandidatesIteratively(content, true, options);

      if (options.flatten) {
        candidates.push.apply(candidates, nestedCandidates);
      } else {
        candidates.push({
          scope: element,
          candidates: nestedCandidates
        });
      }
    } else {
      // check candidate element
      var validCandidate = matches.call(element, candidateSelector);

      if (validCandidate && options.filter(element) && (includeContainer || !elements.includes(element))) {
        candidates.push(element);
      } // iterate over shadow content if possible


      var shadowRoot = element.shadowRoot || // check for an undisclosed shadow
      typeof options.getShadowRoot === 'function' && options.getShadowRoot(element);
      var validShadowRoot = !options.shadowRootFilter || options.shadowRootFilter(element);

      if (shadowRoot && validShadowRoot) {
        // add shadow dom scope IIF a shadow root node was given; otherwise, an undisclosed
        //  shadow exists, so look at light dom children as fallback BUT create a scope for any
        //  child candidates found because they're likely slotted elements (elements that are
        //  children of the web component element (which has the shadow), in the light dom, but
        //  slotted somewhere _inside_ the undisclosed shadow) -- the scope is created below,
        //  _after_ we return from this recursive call
        var _nestedCandidates = getCandidatesIteratively(shadowRoot === true ? element.children : shadowRoot.children, true, options);

        if (options.flatten) {
          candidates.push.apply(candidates, _nestedCandidates);
        } else {
          candidates.push({
            scope: element,
            candidates: _nestedCandidates
          });
        }
      } else {
        // there's not shadow so just dig into the element's (light dom) children
        //  __without__ giving the element special scope treatment
        elementsToCheck.unshift.apply(elementsToCheck, element.children);
      }
    }
  }

  return candidates;
};

var getTabindex = function getTabindex(node, isScope) {
  if (node.tabIndex < 0) {
    // in Chrome, <details/>, <audio controls/> and <video controls/> elements get a default
    // `tabIndex` of -1 when the 'tabindex' attribute isn't specified in the DOM,
    // yet they are still part of the regular tab order; in FF, they get a default
    // `tabIndex` of 0; since Chrome still puts those elements in the regular tab
    // order, consider their tab index to be 0.
    // Also browsers do not return `tabIndex` correctly for contentEditable nodes;
    // so if they don't have a tabindex attribute specifically set, assume it's 0.
    //
    // isScope is positive for custom element with shadow root or slot that by default
    // have tabIndex -1, but need to be sorted by document order in order for their
    // content to be inserted in the correct position
    if ((isScope || /^(AUDIO|VIDEO|DETAILS)$/.test(node.tagName) || node.isContentEditable) && isNaN(parseInt(node.getAttribute('tabindex'), 10))) {
      return 0;
    }
  }

  return node.tabIndex;
};

var sortOrderedTabbables = function sortOrderedTabbables(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
};

var isInput = function isInput(node) {
  return node.tagName === 'INPUT';
};

var isHiddenInput = function isHiddenInput(node) {
  return isInput(node) && node.type === 'hidden';
};

var isDetailsWithSummary = function isDetailsWithSummary(node) {
  var r = node.tagName === 'DETAILS' && Array.prototype.slice.apply(node.children).some(function (child) {
    return child.tagName === 'SUMMARY';
  });
  return r;
};

var getCheckedRadio = function getCheckedRadio(nodes, form) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked && nodes[i].form === form) {
      return nodes[i];
    }
  }
};

var isTabbableRadio = function isTabbableRadio(node) {
  if (!node.name) {
    return true;
  }

  var radioScope = node.form || getRootNode(node);

  var queryRadios = function queryRadios(name) {
    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
  };

  var radioSet;

  if (typeof window !== 'undefined' && typeof window.CSS !== 'undefined' && typeof window.CSS.escape === 'function') {
    radioSet = queryRadios(window.CSS.escape(node.name));
  } else {
    try {
      radioSet = queryRadios(node.name);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s', err.message);
      return false;
    }
  }

  var checked = getCheckedRadio(radioSet, node.form);
  return !checked || checked === node;
};

var isRadio = function isRadio(node) {
  return isInput(node) && node.type === 'radio';
};

var isNonTabbableRadio = function isNonTabbableRadio(node) {
  return isRadio(node) && !isTabbableRadio(node);
};

var isZeroArea = function isZeroArea(node) {
  var _node$getBoundingClie = node.getBoundingClientRect(),
      width = _node$getBoundingClie.width,
      height = _node$getBoundingClie.height;

  return width === 0 && height === 0;
};

var isHidden = function isHidden(node, _ref) {
  var displayCheck = _ref.displayCheck,
      getShadowRoot = _ref.getShadowRoot;

  // NOTE: visibility will be `undefined` if node is detached from the document
  //  (see notes about this further down), which means we will consider it visible
  //  (this is legacy behavior from a very long way back)
  // NOTE: we check this regardless of `displayCheck="none"` because this is a
  //  _visibility_ check, not a _display_ check
  if (getComputedStyle(node).visibility === 'hidden') {
    return true;
  }

  var isDirectSummary = matches.call(node, 'details>summary:first-of-type');
  var nodeUnderDetails = isDirectSummary ? node.parentElement : node;

  if (matches.call(nodeUnderDetails, 'details:not([open]) *')) {
    return true;
  } // The root node is the shadow root if the node is in a shadow DOM; some document otherwise
  //  (but NOT _the_ document; see second 'If' comment below for more).
  // If rootNode is shadow root, it'll have a host, which is the element to which the shadow
  //  is attached, and the one we need to check if it's in the document or not (because the
  //  shadow, and all nodes it contains, is never considered in the document since shadows
  //  behave like self-contained DOMs; but if the shadow's HOST, which is part of the document,
  //  is hidden, or is not in the document itself but is detached, it will affect the shadow's
  //  visibility, including all the nodes it contains). The host could be any normal node,
  //  or a custom element (i.e. web component). Either way, that's the one that is considered
  //  part of the document, not the shadow root, nor any of its children (i.e. the node being
  //  tested).
  // If rootNode is not a shadow root, it won't have a host, and so rootNode should be the
  //  document (per the docs) and while it's a Document-type object, that document does not
  //  appear to be the same as the node's `ownerDocument` for some reason, so it's safer
  //  to ignore the rootNode at this point, and use `node.ownerDocument`. Otherwise,
  //  using `rootNode.contains(node)` will _always_ be true we'll get false-positives when
  //  node is actually detached.


  var nodeRootHost = getRootNode(node).host;
  var nodeIsAttached = (nodeRootHost === null || nodeRootHost === void 0 ? void 0 : nodeRootHost.ownerDocument.contains(nodeRootHost)) || node.ownerDocument.contains(node);

  if (!displayCheck || displayCheck === 'full') {
    if (typeof getShadowRoot === 'function') {
      // figure out if we should consider the node to be in an undisclosed shadow and use the
      //  'non-zero-area' fallback
      var originalNode = node;

      while (node) {
        var parentElement = node.parentElement;
        var rootNode = getRootNode(node);

        if (parentElement && !parentElement.shadowRoot && getShadowRoot(parentElement) === true // check if there's an undisclosed shadow
        ) {
          // node has an undisclosed shadow which means we can only treat it as a black box, so we
          //  fall back to a non-zero-area test
          return isZeroArea(node);
        } else if (node.assignedSlot) {
          // iterate up slot
          node = node.assignedSlot;
        } else if (!parentElement && rootNode !== node.ownerDocument) {
          // cross shadow boundary
          node = rootNode.host;
        } else {
          // iterate up normal dom
          node = parentElement;
        }
      }

      node = originalNode;
    } // else, `getShadowRoot` might be true, but all that does is enable shadow DOM support
    //  (i.e. it does not also presume that all nodes might have undisclosed shadows); or
    //  it might be a falsy value, which means shadow DOM support is disabled
    // Since we didn't find it sitting in an undisclosed shadow (or shadows are disabled)
    //  now we can just test to see if it would normally be visible or not, provided it's
    //  attached to the main document.
    // NOTE: We must consider case where node is inside a shadow DOM and given directly to
    //  `isTabbable()` or `isFocusable()` -- regardless of `getShadowRoot` option setting.


    if (nodeIsAttached) {
      // this works wherever the node is: if there's at least one client rect, it's
      //  somehow displayed; it also covers the CSS 'display: contents' case where the
      //  node itself is hidden in place of its contents; and there's no need to search
      //  up the hierarchy either
      return !node.getClientRects().length;
    } // Else, the node isn't attached to the document, which means the `getClientRects()`
    //  API will __always__ return zero rects (this can happen, for example, if React
    //  is used to render nodes onto a detached tree, as confirmed in this thread:
    //  https://github.com/facebook/react/issues/9117#issuecomment-284228870)
    //
    // It also means that even window.getComputedStyle(node).display will return `undefined`
    //  because styles are only computed for nodes that are in the document.
    //
    // NOTE: THIS HAS BEEN THE CASE FOR YEARS. It is not new, nor is it caused by tabbable
    //  somehow. Though it was never stated officially, anyone who has ever used tabbable
    //  APIs on nodes in detached containers has actually implicitly used tabbable in what
    //  was later (as of v5.2.0 on Apr 9, 2021) called `displayCheck="none"` mode -- essentially
    //  considering __everything__ to be visible because of the innability to determine styles.

  } else if (displayCheck === 'non-zero-area') {
    // NOTE: Even though this tests that the node's client rect is non-zero to determine
    //  whether it's displayed, and that a detached node will __always__ have a zero-area
    //  client rect, we don't special-case for whether the node is attached or not. In
    //  this mode, we do want to consider nodes that have a zero area to be hidden at all
    //  times, and that includes attached or not.
    return isZeroArea(node);
  } // visible, as far as we can tell, or per current `displayCheck` mode


  return false;
}; // form fields (nested) inside a disabled fieldset are not focusable/tabbable
//  unless they are in the _first_ <legend> element of the top-most disabled
//  fieldset


var isDisabledFromFieldset = function isDisabledFromFieldset(node) {
  if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(node.tagName)) {
    var parentNode = node.parentElement; // check if `node` is contained in a disabled <fieldset>

    while (parentNode) {
      if (parentNode.tagName === 'FIELDSET' && parentNode.disabled) {
        // look for the first <legend> among the children of the disabled <fieldset>
        for (var i = 0; i < parentNode.children.length; i++) {
          var child = parentNode.children.item(i); // when the first <legend> (in document order) is found

          if (child.tagName === 'LEGEND') {
            // if its parent <fieldset> is not nested in another disabled <fieldset>,
            // return whether `node` is a descendant of its first <legend>
            return matches.call(parentNode, 'fieldset[disabled] *') ? true : !child.contains(node);
          }
        } // the disabled <fieldset> containing `node` has no <legend>


        return true;
      }

      parentNode = parentNode.parentElement;
    }
  } // else, node's tabbable/focusable state should not be affected by a fieldset's
  //  enabled/disabled state


  return false;
};

var isNodeMatchingSelectorFocusable = function isNodeMatchingSelectorFocusable(options, node) {
  if (node.disabled || isHiddenInput(node) || isHidden(node, options) || // For a details element with a summary, the summary element gets the focus
  isDetailsWithSummary(node) || isDisabledFromFieldset(node)) {
    return false;
  }

  return true;
};

var isNodeMatchingSelectorTabbable = function isNodeMatchingSelectorTabbable(options, node) {
  if (isNonTabbableRadio(node) || getTabindex(node) < 0 || !isNodeMatchingSelectorFocusable(options, node)) {
    return false;
  }

  return true;
};

var isValidShadowRootTabbable = function isValidShadowRootTabbable(shadowHostNode) {
  var tabIndex = parseInt(shadowHostNode.getAttribute('tabindex'), 10);

  if (isNaN(tabIndex) || tabIndex >= 0) {
    return true;
  } // If a custom element has an explicit negative tabindex,
  // browsers will not allow tab targeting said element's children.


  return false;
};
/**
 * @param {Array.<Element|CandidatesScope>} candidates
 * @returns Element[]
 */


var sortByOrder = function sortByOrder(candidates) {
  var regularTabbables = [];
  var orderedTabbables = [];
  candidates.forEach(function (item, i) {
    var isScope = !!item.scope;
    var element = isScope ? item.scope : item;
    var candidateTabindex = getTabindex(element, isScope);
    var elements = isScope ? sortByOrder(item.candidates) : element;

    if (candidateTabindex === 0) {
      isScope ? regularTabbables.push.apply(regularTabbables, elements) : regularTabbables.push(element);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        item: item,
        isScope: isScope,
        content: elements
      });
    }
  });
  return orderedTabbables.sort(sortOrderedTabbables).reduce(function (acc, sortable) {
    sortable.isScope ? acc.push.apply(acc, sortable.content) : acc.push(sortable.content);
    return acc;
  }, []).concat(regularTabbables);
};

var tabbable = function tabbable(el, options) {
  options = options || {};
  var candidates;

  if (options.getShadowRoot) {
    candidates = getCandidatesIteratively([el], options.includeContainer, {
      filter: isNodeMatchingSelectorTabbable.bind(null, options),
      flatten: false,
      getShadowRoot: options.getShadowRoot,
      shadowRootFilter: isValidShadowRootTabbable
    });
  } else {
    candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorTabbable.bind(null, options));
  }

  return sortByOrder(candidates);
};

var focusable = function focusable(el, options) {
  options = options || {};
  var candidates;

  if (options.getShadowRoot) {
    candidates = getCandidatesIteratively([el], options.includeContainer, {
      filter: isNodeMatchingSelectorFocusable.bind(null, options),
      flatten: true,
      getShadowRoot: options.getShadowRoot
    });
  } else {
    candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorFocusable.bind(null, options));
  }

  return candidates;
};

var isTabbable = function isTabbable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches.call(node, candidateSelector) === false) {
    return false;
  }

  return isNodeMatchingSelectorTabbable(options, node);
};

var focusableCandidateSelector = /* #__PURE__ */candidateSelectors.concat('iframe').join(',');

var isFocusable = function isFocusable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches.call(node, focusableCandidateSelector) === false) {
    return false;
  }

  return isNodeMatchingSelectorFocusable(options, node);
};

/*!
* focus-trap 6.9.4
* @license MIT, https://github.com/focus-trap/focus-trap/blob/master/LICENSE
*/

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }

  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var activeFocusTraps = function () {
  var trapQueue = [];
  return {
    activateTrap: function activateTrap(trap) {
      if (trapQueue.length > 0) {
        var activeTrap = trapQueue[trapQueue.length - 1];

        if (activeTrap !== trap) {
          activeTrap.pause();
        }
      }

      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex === -1) {
        trapQueue.push(trap);
      } else {
        // move this existing trap to the front of the queue
        trapQueue.splice(trapIndex, 1);
        trapQueue.push(trap);
      }
    },
    deactivateTrap: function deactivateTrap(trap) {
      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex !== -1) {
        trapQueue.splice(trapIndex, 1);
      }

      if (trapQueue.length > 0) {
        trapQueue[trapQueue.length - 1].unpause();
      }
    }
  };
}();

var isSelectableInput = function isSelectableInput(node) {
  return node.tagName && node.tagName.toLowerCase() === 'input' && typeof node.select === 'function';
};

var isEscapeEvent = function isEscapeEvent(e) {
  return e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
};

var isTabEvent = function isTabEvent(e) {
  return e.key === 'Tab' || e.keyCode === 9;
};

var delay = function delay(fn) {
  return setTimeout(fn, 0);
}; // Array.find/findIndex() are not supported on IE; this replicates enough
//  of Array.findIndex() for our needs


var findIndex = function findIndex(arr, fn) {
  var idx = -1;
  arr.every(function (value, i) {
    if (fn(value)) {
      idx = i;
      return false; // break
    }

    return true; // next
  });
  return idx;
};
/**
 * Get an option's value when it could be a plain value, or a handler that provides
 *  the value.
 * @param {*} value Option's value to check.
 * @param {...*} [params] Any parameters to pass to the handler, if `value` is a function.
 * @returns {*} The `value`, or the handler's returned value.
 */


var valueOrHandler = function valueOrHandler(value) {
  for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    params[_key - 1] = arguments[_key];
  }

  return typeof value === 'function' ? value.apply(void 0, params) : value;
};

var getActualTarget = function getActualTarget(event) {
  // NOTE: If the trap is _inside_ a shadow DOM, event.target will always be the
  //  shadow host. However, event.target.composedPath() will be an array of
  //  nodes "clicked" from inner-most (the actual element inside the shadow) to
  //  outer-most (the host HTML document). If we have access to composedPath(),
  //  then use its first element; otherwise, fall back to event.target (and
  //  this only works for an _open_ shadow DOM; otherwise,
  //  composedPath()[0] === event.target always).
  return event.target.shadowRoot && typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
};

var createFocusTrap = function createFocusTrap(elements, userOptions) {
  // SSR: a live trap shouldn't be created in this type of environment so this
  //  should be safe code to execute if the `document` option isn't specified
  var doc = (userOptions === null || userOptions === void 0 ? void 0 : userOptions.document) || document;

  var config = _objectSpread2({
    returnFocusOnDeactivate: true,
    escapeDeactivates: true,
    delayInitialFocus: true
  }, userOptions);

  var state = {
    // containers given to createFocusTrap()
    // @type {Array<HTMLElement>}
    containers: [],
    // list of objects identifying tabbable nodes in `containers` in the trap
    // NOTE: it's possible that a group has no tabbable nodes if nodes get removed while the trap
    //  is active, but the trap should never get to a state where there isn't at least one group
    //  with at least one tabbable node in it (that would lead to an error condition that would
    //  result in an error being thrown)
    // @type {Array<{
    //   container: HTMLElement,
    //   tabbableNodes: Array<HTMLElement>, // empty if none
    //   focusableNodes: Array<HTMLElement>, // empty if none
    //   firstTabbableNode: HTMLElement|null,
    //   lastTabbableNode: HTMLElement|null,
    //   nextTabbableNode: (node: HTMLElement, forward: boolean) => HTMLElement|undefined
    // }>}
    containerGroups: [],
    // same order/length as `containers` list
    // references to objects in `containerGroups`, but only those that actually have
    //  tabbable nodes in them
    // NOTE: same order as `containers` and `containerGroups`, but __not necessarily__
    //  the same length
    tabbableGroups: [],
    nodeFocusedBeforeActivation: null,
    mostRecentlyFocusedNode: null,
    active: false,
    paused: false,
    // timer ID for when delayInitialFocus is true and initial focus in this trap
    //  has been delayed during activation
    delayInitialFocusTimer: undefined
  };
  var trap; // eslint-disable-line prefer-const -- some private functions reference it, and its methods reference private functions, so we must declare here and define later

  /**
   * Gets a configuration option value.
   * @param {Object|undefined} configOverrideOptions If true, and option is defined in this set,
   *  value will be taken from this object. Otherwise, value will be taken from base configuration.
   * @param {string} optionName Name of the option whose value is sought.
   * @param {string|undefined} [configOptionName] Name of option to use __instead of__ `optionName`
   *  IIF `configOverrideOptions` is not defined. Otherwise, `optionName` is used.
   */

  var getOption = function getOption(configOverrideOptions, optionName, configOptionName) {
    return configOverrideOptions && configOverrideOptions[optionName] !== undefined ? configOverrideOptions[optionName] : config[configOptionName || optionName];
  };
  /**
   * Finds the index of the container that contains the element.
   * @param {HTMLElement} element
   * @returns {number} Index of the container in either `state.containers` or
   *  `state.containerGroups` (the order/length of these lists are the same); -1
   *  if the element isn't found.
   */


  var findContainerIndex = function findContainerIndex(element) {
    // NOTE: search `containerGroups` because it's possible a group contains no tabbable
    //  nodes, but still contains focusable nodes (e.g. if they all have `tabindex=-1`)
    //  and we still need to find the element in there
    return state.containerGroups.findIndex(function (_ref) {
      var container = _ref.container,
          tabbableNodes = _ref.tabbableNodes;
      return container.contains(element) || // fall back to explicit tabbable search which will take into consideration any
      //  web components if the `tabbableOptions.getShadowRoot` option was used for
      //  the trap, enabling shadow DOM support in tabbable (`Node.contains()` doesn't
      //  look inside web components even if open)
      tabbableNodes.find(function (node) {
        return node === element;
      });
    });
  };
  /**
   * Gets the node for the given option, which is expected to be an option that
   *  can be either a DOM node, a string that is a selector to get a node, `false`
   *  (if a node is explicitly NOT given), or a function that returns any of these
   *  values.
   * @param {string} optionName
   * @returns {undefined | false | HTMLElement | SVGElement} Returns
   *  `undefined` if the option is not specified; `false` if the option
   *  resolved to `false` (node explicitly not given); otherwise, the resolved
   *  DOM node.
   * @throws {Error} If the option is set, not `false`, and is not, or does not
   *  resolve to a node.
   */


  var getNodeForOption = function getNodeForOption(optionName) {
    var optionValue = config[optionName];

    if (typeof optionValue === 'function') {
      for (var _len2 = arguments.length, params = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        params[_key2 - 1] = arguments[_key2];
      }

      optionValue = optionValue.apply(void 0, params);
    }

    if (optionValue === true) {
      optionValue = undefined; // use default value
    }

    if (!optionValue) {
      if (optionValue === undefined || optionValue === false) {
        return optionValue;
      } // else, empty string (invalid), null (invalid), 0 (invalid)


      throw new Error("`".concat(optionName, "` was specified but was not a node, or did not return a node"));
    }

    var node = optionValue; // could be HTMLElement, SVGElement, or non-empty string at this point

    if (typeof optionValue === 'string') {
      node = doc.querySelector(optionValue); // resolve to node, or null if fails

      if (!node) {
        throw new Error("`".concat(optionName, "` as selector refers to no known node"));
      }
    }

    return node;
  };

  var getInitialFocusNode = function getInitialFocusNode() {
    var node = getNodeForOption('initialFocus'); // false explicitly indicates we want no initialFocus at all

    if (node === false) {
      return false;
    }

    if (node === undefined) {
      // option not specified: use fallback options
      if (findContainerIndex(doc.activeElement) >= 0) {
        node = doc.activeElement;
      } else {
        var firstTabbableGroup = state.tabbableGroups[0];
        var firstTabbableNode = firstTabbableGroup && firstTabbableGroup.firstTabbableNode; // NOTE: `fallbackFocus` option function cannot return `false` (not supported)

        node = firstTabbableNode || getNodeForOption('fallbackFocus');
      }
    }

    if (!node) {
      throw new Error('Your focus-trap needs to have at least one focusable element');
    }

    return node;
  };

  var updateTabbableNodes = function updateTabbableNodes() {
    state.containerGroups = state.containers.map(function (container) {
      var tabbableNodes = tabbable(container, config.tabbableOptions); // NOTE: if we have tabbable nodes, we must have focusable nodes; focusable nodes
      //  are a superset of tabbable nodes

      var focusableNodes = focusable(container, config.tabbableOptions);
      return {
        container: container,
        tabbableNodes: tabbableNodes,
        focusableNodes: focusableNodes,
        firstTabbableNode: tabbableNodes.length > 0 ? tabbableNodes[0] : null,
        lastTabbableNode: tabbableNodes.length > 0 ? tabbableNodes[tabbableNodes.length - 1] : null,

        /**
         * Finds the __tabbable__ node that follows the given node in the specified direction,
         *  in this container, if any.
         * @param {HTMLElement} node
         * @param {boolean} [forward] True if going in forward tab order; false if going
         *  in reverse.
         * @returns {HTMLElement|undefined} The next tabbable node, if any.
         */
        nextTabbableNode: function nextTabbableNode(node) {
          var forward = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
          // NOTE: If tabindex is positive (in order to manipulate the tab order separate
          //  from the DOM order), this __will not work__ because the list of focusableNodes,
          //  while it contains tabbable nodes, does not sort its nodes in any order other
          //  than DOM order, because it can't: Where would you place focusable (but not
          //  tabbable) nodes in that order? They have no order, because they aren't tabbale...
          // Support for positive tabindex is already broken and hard to manage (possibly
          //  not supportable, TBD), so this isn't going to make things worse than they
          //  already are, and at least makes things better for the majority of cases where
          //  tabindex is either 0/unset or negative.
          // FYI, positive tabindex issue: https://github.com/focus-trap/focus-trap/issues/375
          var nodeIdx = focusableNodes.findIndex(function (n) {
            return n === node;
          });

          if (nodeIdx < 0) {
            return undefined;
          }

          if (forward) {
            return focusableNodes.slice(nodeIdx + 1).find(function (n) {
              return isTabbable(n, config.tabbableOptions);
            });
          }

          return focusableNodes.slice(0, nodeIdx).reverse().find(function (n) {
            return isTabbable(n, config.tabbableOptions);
          });
        }
      };
    });
    state.tabbableGroups = state.containerGroups.filter(function (group) {
      return group.tabbableNodes.length > 0;
    }); // throw if no groups have tabbable nodes and we don't have a fallback focus node either

    if (state.tabbableGroups.length <= 0 && !getNodeForOption('fallbackFocus') // returning false not supported for this option
    ) {
      throw new Error('Your focus-trap must have at least one container with at least one tabbable node in it at all times');
    }
  };

  var tryFocus = function tryFocus(node) {
    if (node === false) {
      return;
    }

    if (node === doc.activeElement) {
      return;
    }

    if (!node || !node.focus) {
      tryFocus(getInitialFocusNode());
      return;
    }

    node.focus({
      preventScroll: !!config.preventScroll
    });
    state.mostRecentlyFocusedNode = node;

    if (isSelectableInput(node)) {
      node.select();
    }
  };

  var getReturnFocusNode = function getReturnFocusNode(previousActiveElement) {
    var node = getNodeForOption('setReturnFocus', previousActiveElement);
    return node ? node : node === false ? false : previousActiveElement;
  }; // This needs to be done on mousedown and touchstart instead of click
  // so that it precedes the focus event.


  var checkPointerDown = function checkPointerDown(e) {
    var target = getActualTarget(e);

    if (findContainerIndex(target) >= 0) {
      // allow the click since it ocurred inside the trap
      return;
    }

    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      // immediately deactivate the trap
      trap.deactivate({
        // if, on deactivation, we should return focus to the node originally-focused
        //  when the trap was activated (or the configured `setReturnFocus` node),
        //  then assume it's also OK to return focus to the outside node that was
        //  just clicked, causing deactivation, as long as that node is focusable;
        //  if it isn't focusable, then return focus to the original node focused
        //  on activation (or the configured `setReturnFocus` node)
        // NOTE: by setting `returnFocus: false`, deactivate() will do nothing,
        //  which will result in the outside click setting focus to the node
        //  that was clicked, whether it's focusable or not; by setting
        //  `returnFocus: true`, we'll attempt to re-focus the node originally-focused
        //  on activation (or the configured `setReturnFocus` node)
        returnFocus: config.returnFocusOnDeactivate && !isFocusable(target, config.tabbableOptions)
      });
      return;
    } // This is needed for mobile devices.
    // (If we'll only let `click` events through,
    // then on mobile they will be blocked anyways if `touchstart` is blocked.)


    if (valueOrHandler(config.allowOutsideClick, e)) {
      // allow the click outside the trap to take place
      return;
    } // otherwise, prevent the click


    e.preventDefault();
  }; // In case focus escapes the trap for some strange reason, pull it back in.


  var checkFocusIn = function checkFocusIn(e) {
    var target = getActualTarget(e);
    var targetContained = findContainerIndex(target) >= 0; // In Firefox when you Tab out of an iframe the Document is briefly focused.

    if (targetContained || target instanceof Document) {
      if (targetContained) {
        state.mostRecentlyFocusedNode = target;
      }
    } else {
      // escaped! pull it back in to where it just left
      e.stopImmediatePropagation();
      tryFocus(state.mostRecentlyFocusedNode || getInitialFocusNode());
    }
  }; // Hijack Tab events on the first and last focusable nodes of the trap,
  // in order to prevent focus from escaping. If it escapes for even a
  // moment it can end up scrolling the page and causing confusion so we
  // kind of need to capture the action at the keydown phase.


  var checkTab = function checkTab(e) {
    var target = getActualTarget(e);
    updateTabbableNodes();
    var destinationNode = null;

    if (state.tabbableGroups.length > 0) {
      // make sure the target is actually contained in a group
      // NOTE: the target may also be the container itself if it's focusable
      //  with tabIndex='-1' and was given initial focus
      var containerIndex = findContainerIndex(target);
      var containerGroup = containerIndex >= 0 ? state.containerGroups[containerIndex] : undefined;

      if (containerIndex < 0) {
        // target not found in any group: quite possible focus has escaped the trap,
        //  so bring it back in to...
        if (e.shiftKey) {
          // ...the last node in the last group
          destinationNode = state.tabbableGroups[state.tabbableGroups.length - 1].lastTabbableNode;
        } else {
          // ...the first node in the first group
          destinationNode = state.tabbableGroups[0].firstTabbableNode;
        }
      } else if (e.shiftKey) {
        // REVERSE
        // is the target the first tabbable node in a group?
        var startOfGroupIndex = findIndex(state.tabbableGroups, function (_ref2) {
          var firstTabbableNode = _ref2.firstTabbableNode;
          return target === firstTabbableNode;
        });

        if (startOfGroupIndex < 0 && (containerGroup.container === target || isFocusable(target, config.tabbableOptions) && !isTabbable(target, config.tabbableOptions) && !containerGroup.nextTabbableNode(target, false))) {
          // an exception case where the target is either the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle shift+tab as if focus were on the container's
          //  first tabbable node, and go to the last tabbable node of the LAST group
          startOfGroupIndex = containerIndex;
        }

        if (startOfGroupIndex >= 0) {
          // YES: then shift+tab should go to the last tabbable node in the
          //  previous group (and wrap around to the last tabbable node of
          //  the LAST group if it's the first tabbable node of the FIRST group)
          var destinationGroupIndex = startOfGroupIndex === 0 ? state.tabbableGroups.length - 1 : startOfGroupIndex - 1;
          var destinationGroup = state.tabbableGroups[destinationGroupIndex];
          destinationNode = destinationGroup.lastTabbableNode;
        }
      } else {
        // FORWARD
        // is the target the last tabbable node in a group?
        var lastOfGroupIndex = findIndex(state.tabbableGroups, function (_ref3) {
          var lastTabbableNode = _ref3.lastTabbableNode;
          return target === lastTabbableNode;
        });

        if (lastOfGroupIndex < 0 && (containerGroup.container === target || isFocusable(target, config.tabbableOptions) && !isTabbable(target, config.tabbableOptions) && !containerGroup.nextTabbableNode(target))) {
          // an exception case where the target is the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle tab as if focus were on the container's
          //  last tabbable node, and go to the first tabbable node of the FIRST group
          lastOfGroupIndex = containerIndex;
        }

        if (lastOfGroupIndex >= 0) {
          // YES: then tab should go to the first tabbable node in the next
          //  group (and wrap around to the first tabbable node of the FIRST
          //  group if it's the last tabbable node of the LAST group)
          var _destinationGroupIndex = lastOfGroupIndex === state.tabbableGroups.length - 1 ? 0 : lastOfGroupIndex + 1;

          var _destinationGroup = state.tabbableGroups[_destinationGroupIndex];
          destinationNode = _destinationGroup.firstTabbableNode;
        }
      }
    } else {
      // NOTE: the fallbackFocus option does not support returning false to opt-out
      destinationNode = getNodeForOption('fallbackFocus');
    }

    if (destinationNode) {
      e.preventDefault();
      tryFocus(destinationNode);
    } // else, let the browser take care of [shift+]tab and move the focus

  };

  var checkKey = function checkKey(e) {
    if (isEscapeEvent(e) && valueOrHandler(config.escapeDeactivates, e) !== false) {
      e.preventDefault();
      trap.deactivate();
      return;
    }

    if (isTabEvent(e)) {
      checkTab(e);
      return;
    }
  };

  var checkClick = function checkClick(e) {
    var target = getActualTarget(e);

    if (findContainerIndex(target) >= 0) {
      return;
    }

    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      return;
    }

    if (valueOrHandler(config.allowOutsideClick, e)) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
  }; //
  // EVENT LISTENERS
  //


  var addListeners = function addListeners() {
    if (!state.active) {
      return;
    } // There can be only one listening focus trap at a time


    activeFocusTraps.activateTrap(trap); // Delay ensures that the focused element doesn't capture the event
    // that caused the focus trap activation.

    state.delayInitialFocusTimer = config.delayInitialFocus ? delay(function () {
      tryFocus(getInitialFocusNode());
    }) : tryFocus(getInitialFocusNode());
    doc.addEventListener('focusin', checkFocusIn, true);
    doc.addEventListener('mousedown', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('touchstart', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('click', checkClick, {
      capture: true,
      passive: false
    });
    doc.addEventListener('keydown', checkKey, {
      capture: true,
      passive: false
    });
    return trap;
  };

  var removeListeners = function removeListeners() {
    if (!state.active) {
      return;
    }

    doc.removeEventListener('focusin', checkFocusIn, true);
    doc.removeEventListener('mousedown', checkPointerDown, true);
    doc.removeEventListener('touchstart', checkPointerDown, true);
    doc.removeEventListener('click', checkClick, true);
    doc.removeEventListener('keydown', checkKey, true);
    return trap;
  }; //
  // TRAP DEFINITION
  //


  trap = {
    get active() {
      return state.active;
    },

    get paused() {
      return state.paused;
    },

    activate: function activate(activateOptions) {
      if (state.active) {
        return this;
      }

      var onActivate = getOption(activateOptions, 'onActivate');
      var onPostActivate = getOption(activateOptions, 'onPostActivate');
      var checkCanFocusTrap = getOption(activateOptions, 'checkCanFocusTrap');

      if (!checkCanFocusTrap) {
        updateTabbableNodes();
      }

      state.active = true;
      state.paused = false;
      state.nodeFocusedBeforeActivation = doc.activeElement;

      if (onActivate) {
        onActivate();
      }

      var finishActivation = function finishActivation() {
        if (checkCanFocusTrap) {
          updateTabbableNodes();
        }

        addListeners();

        if (onPostActivate) {
          onPostActivate();
        }
      };

      if (checkCanFocusTrap) {
        checkCanFocusTrap(state.containers.concat()).then(finishActivation, finishActivation);
        return this;
      }

      finishActivation();
      return this;
    },
    deactivate: function deactivate(deactivateOptions) {
      if (!state.active) {
        return this;
      }

      var options = _objectSpread2({
        onDeactivate: config.onDeactivate,
        onPostDeactivate: config.onPostDeactivate,
        checkCanReturnFocus: config.checkCanReturnFocus
      }, deactivateOptions);

      clearTimeout(state.delayInitialFocusTimer); // noop if undefined

      state.delayInitialFocusTimer = undefined;
      removeListeners();
      state.active = false;
      state.paused = false;
      activeFocusTraps.deactivateTrap(trap);
      var onDeactivate = getOption(options, 'onDeactivate');
      var onPostDeactivate = getOption(options, 'onPostDeactivate');
      var checkCanReturnFocus = getOption(options, 'checkCanReturnFocus');
      var returnFocus = getOption(options, 'returnFocus', 'returnFocusOnDeactivate');

      if (onDeactivate) {
        onDeactivate();
      }

      var finishDeactivation = function finishDeactivation() {
        delay(function () {
          if (returnFocus) {
            tryFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation));
          }

          if (onPostDeactivate) {
            onPostDeactivate();
          }
        });
      };

      if (returnFocus && checkCanReturnFocus) {
        checkCanReturnFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation)).then(finishDeactivation, finishDeactivation);
        return this;
      }

      finishDeactivation();
      return this;
    },
    pause: function pause() {
      if (state.paused || !state.active) {
        return this;
      }

      state.paused = true;
      removeListeners();
      return this;
    },
    unpause: function unpause() {
      if (!state.paused || !state.active) {
        return this;
      }

      state.paused = false;
      updateTabbableNodes();
      addListeners();
      return this;
    },
    updateContainerElements: function updateContainerElements(containerElements) {
      var elementsAsArray = [].concat(containerElements).filter(Boolean);
      state.containers = elementsAsArray.map(function (element) {
        return typeof element === 'string' ? doc.querySelector(element) : element;
      });

      if (state.active) {
        updateTabbableNodes();
      }

      return this;
    }
  }; // initialize container elements

  trap.updateContainerElements(elements);
  return trap;
};

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// Older browsers don't support event options, feature detect it.

// Adopted and modified solution from Bohdan Didukh (2017)
// https://stackoverflow.com/questions/41594997/ios-10-safari-prevent-scrolling-behind-a-fixed-overlay-and-maintain-scroll-posi

var hasPassiveEvents = false;
if (typeof window !== 'undefined') {
  var passiveTestOptions = {
    get passive() {
      hasPassiveEvents = true;
      return undefined;
    }
  };
  window.addEventListener('testPassive', null, passiveTestOptions);
  window.removeEventListener('testPassive', null, passiveTestOptions);
}

var isIosDevice = typeof window !== 'undefined' && window.navigator && window.navigator.platform && (/iP(ad|hone|od)/.test(window.navigator.platform) || window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);


var locks = [];
var documentListenerAdded = false;
var initialClientY = -1;
var previousBodyOverflowSetting = void 0;
var previousBodyPaddingRight = void 0;

// returns true if `el` should be allowed to receive touchmove events.
var allowTouchMove = function allowTouchMove(el) {
  return locks.some(function (lock) {
    if (lock.options.allowTouchMove && lock.options.allowTouchMove(el)) {
      return true;
    }

    return false;
  });
};

var preventDefault$1 = function preventDefault(rawEvent) {
  var e = rawEvent || window.event;

  // For the case whereby consumers adds a touchmove event listener to document.
  // Recall that we do document.addEventListener('touchmove', preventDefault, { passive: false })
  // in disableBodyScroll - so if we provide this opportunity to allowTouchMove, then
  // the touchmove event on document will break.
  if (allowTouchMove(e.target)) {
    return true;
  }

  // Do not prevent if the event has more than one touch (usually meaning this is a multi touch gesture like pinch to zoom).
  if (e.touches.length > 1) return true;

  if (e.preventDefault) e.preventDefault();

  return false;
};

var setOverflowHidden = function setOverflowHidden(options) {
  // If previousBodyPaddingRight is already set, don't set it again.
  if (previousBodyPaddingRight === undefined) {
    var _reserveScrollBarGap = !!options && options.reserveScrollBarGap === true;
    var scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

    if (_reserveScrollBarGap && scrollBarGap > 0) {
      previousBodyPaddingRight = document.body.style.paddingRight;
      document.body.style.paddingRight = scrollBarGap + 'px';
    }
  }

  // If previousBodyOverflowSetting is already set, don't set it again.
  if (previousBodyOverflowSetting === undefined) {
    previousBodyOverflowSetting = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
};

var restoreOverflowSetting = function restoreOverflowSetting() {
  if (previousBodyPaddingRight !== undefined) {
    document.body.style.paddingRight = previousBodyPaddingRight;

    // Restore previousBodyPaddingRight to undefined so setOverflowHidden knows it
    // can be set again.
    previousBodyPaddingRight = undefined;
  }

  if (previousBodyOverflowSetting !== undefined) {
    document.body.style.overflow = previousBodyOverflowSetting;

    // Restore previousBodyOverflowSetting to undefined
    // so setOverflowHidden knows it can be set again.
    previousBodyOverflowSetting = undefined;
  }
};

// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
var isTargetElementTotallyScrolled = function isTargetElementTotallyScrolled(targetElement) {
  return targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;
};

var handleScroll = function handleScroll(event, targetElement) {
  var clientY = event.targetTouches[0].clientY - initialClientY;

  if (allowTouchMove(event.target)) {
    return false;
  }

  if (targetElement && targetElement.scrollTop === 0 && clientY > 0) {
    // element is at the top of its scroll.
    return preventDefault$1(event);
  }

  if (isTargetElementTotallyScrolled(targetElement) && clientY < 0) {
    // element is at the bottom of its scroll.
    return preventDefault$1(event);
  }

  event.stopPropagation();
  return true;
};

var disableBodyScroll = function disableBodyScroll(targetElement, options) {
  // targetElement must be provided
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.');
    return;
  }

  // disableBodyScroll must not have been called on this targetElement before
  if (locks.some(function (lock) {
    return lock.targetElement === targetElement;
  })) {
    return;
  }

  var lock = {
    targetElement: targetElement,
    options: options || {}
  };

  locks = [].concat(_toConsumableArray(locks), [lock]);

  if (isIosDevice) {
    targetElement.ontouchstart = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        initialClientY = event.targetTouches[0].clientY;
      }
    };
    targetElement.ontouchmove = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        handleScroll(event, targetElement);
      }
    };

    if (!documentListenerAdded) {
      document.addEventListener('touchmove', preventDefault$1, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = true;
    }
  } else {
    setOverflowHidden(options);
  }
};

var enableBodyScroll = function enableBodyScroll(targetElement) {
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.');
    return;
  }

  locks = locks.filter(function (lock) {
    return lock.targetElement !== targetElement;
  });

  if (isIosDevice) {
    targetElement.ontouchstart = null;
    targetElement.ontouchmove = null;

    if (documentListenerAdded && locks.length === 0) {
      document.removeEventListener('touchmove', preventDefault$1, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = false;
    }
  } else if (!locks.length) {
    restoreOverflowSetting();
  }
};

var n$1=function(n){if("object"!=typeof(t=n)||Array.isArray(t))throw "state should be an object";var t;},t$2=function(n,t,e,c){return (r=n,r.reduce(function(n,t,e){return n.indexOf(t)>-1?n:n.concat(t)},[])).reduce(function(n,e){return n.concat(t[e]||[])},[]).map(function(n){return n(e,c)});var r;},e$2=a(),c=e$2.on,r$3=e$2.emit,o$1=e$2.hydrate;function a(e){void 0===e&&(e={});var c={};return {getState:function(){return Object.assign({},e)},hydrate:function(r){return n$1(r),Object.assign(e,r),function(){var n=["*"].concat(Object.keys(r));t$2(n,c,e);}},on:function(n,t){return (n=[].concat(n)).map(function(n){return c[n]=(c[n]||[]).concat(t)}),function(){return n.map(function(n){return c[n].splice(c[n].indexOf(t),1)})}},emit:function(r,o,u){var a=("*"===r?[]:["*"]).concat(r);(o="function"==typeof o?o(e):o)&&(n$1(o),Object.assign(e,o),a=a.concat(Object.keys(o))),t$2(a,c,e,u);}}}

/*!
 * slide-anim
 * https://github.com/yomotsu/slide-anim
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
const pool = [];
const inAnimItems = {
    add(el, defaultStyle, timeoutId, onCancelled) {
        const inAnimItem = { el, defaultStyle, timeoutId, onCancelled };
        this.remove(el);
        pool.push(inAnimItem);
    },
    remove(el) {
        const index = inAnimItems.findIndex(el);
        if (index === -1)
            return;
        const inAnimItem = pool[index];
        clearTimeout(inAnimItem.timeoutId);
        inAnimItem.onCancelled();
        pool.splice(index, 1);
    },
    find(el) {
        return pool[inAnimItems.findIndex(el)];
    },
    findIndex(el) {
        let index = -1;
        pool.some((item, i) => {
            if (item.el === el) {
                index = i;
                return true;
            }
            return false;
        });
        return index;
    }
};

const CSS_EASEOUT_EXPO = 'cubic-bezier( 0.19, 1, 0.22, 1 )';
function slideDown(el, options = {}) {
    return new Promise((resolve) => {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        const _isVisible = isVisible(el);
        const hasEndHeight = typeof options.endHeight === 'number';
        const display = options.display || 'block';
        const duration = options.duration || 400;
        const onCancelled = options.onCancelled || function () { };
        const defaultStyle = el.getAttribute('style') || '';
        const style = window.getComputedStyle(el);
        const defaultStyles = getDefaultStyles(el, display);
        const isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        const contentHeight = defaultStyles.height;
        const minHeight = defaultStyles.minHeight;
        const paddingTop = defaultStyles.paddingTop;
        const paddingBottom = defaultStyles.paddingBottom;
        const borderTop = defaultStyles.borderTop;
        const borderBottom = defaultStyles.borderBottom;
        const cssDuration = `${duration}ms`;
        const cssEasing = CSS_EASEOUT_EXPO;
        const cssTransition = [
            `height ${cssDuration} ${cssEasing}`,
            `min-height ${cssDuration} ${cssEasing}`,
            `padding ${cssDuration} ${cssEasing}`,
            `border-width ${cssDuration} ${cssEasing}`
        ].join();
        const startHeight = _isVisible ? style.height : '0px';
        const startMinHeight = _isVisible ? style.minHeight : '0px';
        const startPaddingTop = _isVisible ? style.paddingTop : '0px';
        const startPaddingBottom = _isVisible ? style.paddingBottom : '0px';
        const startBorderTopWidth = _isVisible ? style.borderTopWidth : '0px';
        const startBorderBottomWidth = _isVisible ? style.borderBottomWidth : '0px';
        const endHeight = (() => {
            if (hasEndHeight)
                return `${options.endHeight}px`;
            return !isBorderBox ?
                `${contentHeight - paddingTop - paddingBottom}px` :
                `${contentHeight + borderTop + borderBottom}px`;
        })();
        const endMinHeight = `${minHeight}px`;
        const endPaddingTop = `${paddingTop}px`;
        const endPaddingBottom = `${paddingBottom}px`;
        const endBorderTopWidth = `${borderTop}px`;
        const endBorderBottomWidth = `${borderBottom}px`;
        if (startHeight === endHeight &&
            startPaddingTop === endPaddingTop &&
            startPaddingBottom === endPaddingBottom &&
            startBorderTopWidth === endBorderTopWidth &&
            startBorderBottomWidth === endBorderBottomWidth) {
            resolve();
            return;
        }
        requestAnimationFrame(() => {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.visibility = 'visible';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(() => {
                el.style.height = endHeight;
                el.style.minHeight = endMinHeight;
                el.style.paddingTop = endPaddingTop;
                el.style.paddingBottom = endPaddingBottom;
                el.style.borderTopWidth = endBorderTopWidth;
                el.style.borderBottomWidth = endBorderBottomWidth;
            });
        });
        const timeoutId = setTimeout(() => {
            resetStyle(el);
            el.style.display = display;
            if (hasEndHeight) {
                el.style.height = `${options.endHeight}px`;
                el.style.overflow = `hidden`;
            }
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideUp(el, options = {}) {
    return new Promise((resolve) => {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        const _isVisible = isVisible(el);
        const display = options.display || 'block';
        const duration = options.duration || 400;
        const onCancelled = options.onCancelled || function () { };
        if (!_isVisible) {
            resolve();
            return;
        }
        const defaultStyle = el.getAttribute('style') || '';
        const style = window.getComputedStyle(el);
        const isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        const minHeight = pxToNumber(style.getPropertyValue('min-height'));
        const paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
        const paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
        const borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
        const borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
        const contentHeight = el.scrollHeight;
        const cssDuration = duration + 'ms';
        const cssEasing = CSS_EASEOUT_EXPO;
        const cssTransition = [
            `height ${cssDuration} ${cssEasing}`,
            `padding ${cssDuration} ${cssEasing}`,
            `border-width ${cssDuration} ${cssEasing}`
        ].join();
        const startHeight = !isBorderBox ?
            `${contentHeight - paddingTop - paddingBottom}px` :
            `${contentHeight + borderTop + borderBottom}px`;
        const startMinHeight = `${minHeight}px`;
        const startPaddingTop = `${paddingTop}px`;
        const startPaddingBottom = `${paddingBottom}px`;
        const startBorderTopWidth = `${borderTop}px`;
        const startBorderBottomWidth = `${borderBottom}px`;
        requestAnimationFrame(() => {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(() => {
                el.style.height = '0';
                el.style.minHeight = '0';
                el.style.paddingTop = '0';
                el.style.paddingBottom = '0';
                el.style.borderTopWidth = '0';
                el.style.borderBottomWidth = '0';
            });
        });
        const timeoutId = setTimeout(() => {
            resetStyle(el);
            el.style.display = 'none';
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideStop(el) {
    const elementObject = inAnimItems.find(el);
    if (!elementObject)
        return;
    const style = window.getComputedStyle(el);
    const height = style.height;
    const paddingTop = style.paddingTop;
    const paddingBottom = style.paddingBottom;
    const borderTopWidth = style.borderTopWidth;
    const borderBottomWidth = style.borderBottomWidth;
    resetStyle(el);
    el.style.height = height;
    el.style.paddingTop = paddingTop;
    el.style.paddingBottom = paddingBottom;
    el.style.borderTopWidth = borderTopWidth;
    el.style.borderBottomWidth = borderBottomWidth;
    el.style.overflow = 'hidden';
    inAnimItems.remove(el);
}
function isVisible(el) {
    return el.offsetHeight !== 0;
}
function resetStyle(el) {
    el.style.visibility = '';
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    el.style.overflow = '';
    el.style.transition = '';
    el.style.webkitTransition = '';
}
function getDefaultStyles(el, defaultDisplay = 'block') {
    const defaultStyle = el.getAttribute('style') || '';
    const style = window.getComputedStyle(el);
    el.style.visibility = 'hidden';
    el.style.display = defaultDisplay;
    const width = pxToNumber(style.getPropertyValue('width'));
    el.style.position = 'absolute';
    el.style.width = `${width}px`;
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    const minHeight = pxToNumber(style.getPropertyValue('min-height'));
    const paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
    const paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
    const borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
    const borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
    const height = el.scrollHeight;
    el.setAttribute('style', defaultStyle);
    return {
        height,
        minHeight,
        paddingTop,
        paddingBottom,
        borderTop,
        borderBottom
    };
}
function pxToNumber(px) {
    return +px.replace(/px/, '');
}

function accordion(node, options) {
  const labels = t$3('.accordion__label', node);
  const text = t$3('.accordion__text', node);

  // Make it accessible by keyboard
  labels.forEach(label => {
    label.href = '#';
    const existingIcon = n$2('.icon', label);
    if (!existingIcon) {
      const icon = document.createElement('div');
      icon.classList.add('icon', 'icon-accordion');
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24"><path d="M7 10L12 15L17 10H7Z" fill="currentColor"/></svg>`;
      label.append(icon);
    }
  });
  text.forEach(t => u$1(t, 'measure'));
  const labelClick = e$3(labels, 'click', e => {
    e.preventDefault();
    const label = e.currentTarget;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    if (isVisible(content)) {
      _close(label, group, content);
    } else {
      _open(label, group, content);
    }
  });
  function _open(label, group, content) {
    slideDown(content);
    group.setAttribute('data-open', true);
    label.setAttribute('aria-expanded', true);
    content.setAttribute('aria-hidden', false);
  }
  function _close(label, group, content) {
    slideUp(content);
    group.setAttribute('data-open', false);
    label.setAttribute('aria-expanded', false);
    content.setAttribute('aria-hidden', true);
  }
  if (options.firstOpen) {
    // Open first accordion label
    const {
      parentNode: group,
      nextElementSibling: content
    } = labels[0];
    _open(labels[0], group, content);
  }
  function destroy() {
    return () => labelClick();
  }
  return {
    destroy
  };
}
function Accordions(elements, options = {}) {
  if (Array.isArray(elements) && !elements.length) return;
  const defaultOptions = {
    firstOpen: true
  };
  const opts = Object.assign(defaultOptions, options);
  let accordions = [];
  if (elements.length) {
    accordions = elements.map(node => accordion(node, opts));
  } else {
    accordions.push(accordion(elements, opts));
  }
  function unload() {
    accordions.forEach(accordion => accordion.destroy());
  }
  return {
    unload
  };
}

const classes$q = {
  visible: 'is-visible',
  active: 'active',
  fixed: 'is-fixed'
};
const selectors$1b = {
  closeBtn: '[data-modal-close]',
  wash: '.modal__wash',
  modalContent: '.modal__content',
  accordion: '.accordion'
};
const modal = node => {
  const focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  const wash = n$2(selectors$1b.wash, node.parentNode);
  const modalContent = n$2(selectors$1b.modalContent, node);
  let accordion = null;
  const events = [e$3([n$2(selectors$1b.closeBtn, node), wash], 'click', e => {
    e.preventDefault();
    _close();
  }), e$3(node, 'keydown', ({
    keyCode
  }) => {
    if (keyCode === 27) _close();
  }), c('modal:open', (state, {
    modalContent,
    narrow = false
  }) => {
    l(node, 'modal--narrow', narrow);
    _renderModalContent(modalContent);
    _open();
  })];
  const _renderModalContent = content => {
    const clonedContent = content.cloneNode(true);
    modalContent.innerHTML = '';
    modalContent.appendChild(clonedContent);
    _initAccordion();
  };
  const _initAccordion = () => {
    accordion = Accordions(t$3('.accordion', node));
  };
  const _open = () => {
    // Due to this component being shared between templates we have to
    // animate around it being fixed to the window
    u$1(node, classes$q.fixed);
    setTimeout(() => {
      u$1(node, classes$q.visible);
      u$1(node, classes$q.active);
    }, 50);
    focusTrap.activate();
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute('data-scroll-lock-ignore') !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  };
  const _close = () => {
    focusTrap.deactivate();
    i$1(node, classes$q.visible);
    i$1(node, classes$q.active);
    enableBodyScroll(node);
    setTimeout(() => {
      i$1(node, classes$q.fixed);
      modalContent.innerHTML = '';
    }, 300);
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
    accordion.unload();
  };
  return {
    unload
  };
};

function t$1(){try{return localStorage.setItem("test","test"),localStorage.removeItem("test"),!0}catch(t){return !1}}function e$1(e){if(t$1())return JSON.parse(localStorage.getItem("neon_"+e))}function r$2(e,r){if(t$1())return localStorage.setItem("neon_"+e,r)}

const dispatchCustomEvent = (eventName, data = {}) => {
  const detail = {
    detail: data
  };
  const event = new CustomEvent(eventName, data ? detail : null);
  document.dispatchEvent(event);
};

const routes$1 = window.theme.routes.cart || {};
const paths = {
  base: `${routes$1.base || '/cart'}.js`,
  add: `${routes$1.add || '/cart/add'}.js`,
  change: `${routes$1.change || '/cart/change'}.js`,
  clear: `${routes$1.clear || '/cart/clear'}.js`
};

// Add a `sorted` key that orders line items
// in the order the customer added them if possible
function sortCart(cart) {
  const order = e$1('cart_order') || [];
  if (order.length) {
    cart.sorted = [...cart.items].sort((a, b) => order.indexOf(a.variant_id) - order.indexOf(b.variant_id));
    return cart;
  }
  cart.sorted = cart.items;
  return cart;
}
function addVariant(variant, quantity) {
  const numAvailable = variant.inventory_policy === 'deny' && variant.inventory_management === 'shopify' ? variant.inventory_quantity : null; // null means they can add as many as they want

  return get().then(({
    items
  }) => {
    const existing = items.filter(item => item.id === variant.id)[0] || {};
    const numRequested = (existing.quantity || 0) + quantity;
    if (numAvailable !== null && numRequested > numAvailable) {
      const err = `There are only ${numAvailable} of that product available, requested ${numRequested}.`;
      throw new Error(err);
    } else {
      return addItemById(variant.id, quantity);
    }
  });
}
function updateItem(id, quantity) {
  return get().then(({
    items
  }) => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].variant_id === parseInt(id)) {
        return changeItem(i + 1, quantity); // shopify cart is a 1-based index
      }
    }
  });
}

function changeItem(line, quantity) {
  return fetch(paths.change, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      line,
      quantity
    })
  }).then(res => res.json()).then(cart => {
    r$3('cart:updated', {
      cart: sortCart(cart)
    });
    return sortCart(cart);
  });
}
function addItemById(id, quantity) {
  r$3('cart:updating');
  return fetch(paths.add, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id,
      quantity
    })
  }).then(r => r.json()).then(item => {
    return get().then(cart => {
      const order = e$1('cart_order') || [];
      const newOrder = [item.variant_id, ...order.filter(i => i !== item.variant_id)];
      r$2('cart_order', JSON.stringify(newOrder));
      r$3('cart:updated', {
        cart: sortCart(cart)
      });
      return {
        item,
        cart: sortCart(cart)
      };
    });
  });
}
function get() {
  return fetch(paths.base, {
    method: 'GET',
    credentials: 'include'
  }).then(res => res.json()).then(data => {
    return sortCart(data);
  });
}
function addItem(form) {
  r$3('cart:updating');
  return fetch(paths.add, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: serialize(form)
  }).then(r => r.json()).then(res => {
    if (res.status == '422') {
      const errorMessage = {
        code: 422,
        message: res.description
      };
      dispatchCustomEvent('cart:error', {
        errorMessage: res.description
      });
      throw errorMessage;
    }
    return get().then(cart => {
      const order = e$1('cart_order') || [];
      const newOrder = [res.variant_id, ...order.filter(i => i !== res.variant_id)];
      r$2('cart_order', JSON.stringify(newOrder));
      r$3('cart:updated', {
        cart: sortCart(cart)
      });
      dispatchCustomEvent('cart:updated', {
        cart: sortCart(cart)
      });
      return {
        item: res,
        cart: sortCart(cart)
      };
    });
  });
}

// !
//  Serialize all form data into a SearchParams string
//  (c) 2020 Chris Ferdinandi, MIT License, https://gomakethings.com
//  @param  {Node}   form The form to serialize
//  @return {String}      The serialized form data
//
function serialize(form) {
  var arr = [];
  Array.prototype.slice.call(form.elements).forEach(function (field) {
    if (!field.name || field.disabled || ['file', 'reset', 'submit', 'button'].indexOf(field.type) > -1) {
      return;
    }
    if (field.type === 'select-multiple') {
      Array.prototype.slice.call(field.options).forEach(function (option) {
        if (!option.selected) return;
        arr.push(encodeURIComponent(field.name) + '=' + encodeURIComponent(option.value));
      });
      return;
    }
    if (['checkbox', 'radio'].indexOf(field.type) > -1 && !field.checked) {
      return;
    }
    arr.push(encodeURIComponent(field.name) + '=' + encodeURIComponent(field.value));
  });
  return arr.join('&');
}
var cart = {
  addItem,
  addItemById,
  addVariant,
  get,
  updateItem
};

/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 */

const moneyFormat = '${{amount}}';

/**
 * Format money values based on your shop currency settings
 * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
 * or 3.00 dollars
 * @param  {String} format - shop money_format setting
 * @return {String} value - formatted value
 */
function formatMoney$1(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  let value = '';
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || moneyFormat;

  function formatWithDelimiters(
    number,
    precision = 2,
    thousands = ',',
    decimal = '.'
  ) {
    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    const parts = number.split('.');
    const dollarsAmount = parts[0].replace(
      /(\d)(?=(\d\d\d)+(?!\d))/g,
      `$1${thousands}`
    );
    const centsAmount = parts[1] ? decimal + parts[1] : '';

    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
}

var formatMoney = (val => formatMoney$1(val, window.theme.moneyFormat || '${{amount}}'));

// Fetch the product data from the .js endpoint because it includes
// more data than the .json endpoint.

var getProduct = (handle => cb => fetch(`${window.theme.routes.products}/${handle}.js`).then(res => res.json()).then(data => cb(data)).catch(err => console.log(err.message)));

/**
 * Image Helper Functions
 * -----------------------------------------------------------------------------
 * A collection of functions that help with basic image operations.
 *
 */

/**
 * Find the Shopify image attribute size
 *
 * @param {string} src
 * @returns {null}
 */
function imageSize(src) {
  /* eslint-disable */
  var match = src.match(/.+_((?:pico|icon|thumb|small|compact|medium|large|grande)|\d{1,4}x\d{0,4}|x\d{1,4})[_\.@]/);
  /* esling-enable */

  if (match) {
    return match[1];
  } else {
    return null;
  }
}

/**
 * Adds a Shopify size attribute to a URL
 *
 * @param src
 * @param size
 * @returns {*}
 */
function getSizedImageUrl(src, size) {
  if (size === null) {
    return src;
  }
  if (size === "master") {
    return removeProtocol(src);
  }
  var match = src.match(/\.(jpg\.webp|jpeg\.webp|jpg|jpeg|gif|png|bmp|bitmap|tiff|tif|webp)(\?v=\d+)?$/i);
  if (match) {
    var prefix = src.split(match[0]);
    var suffix = match[0];
    return removeProtocol(prefix[0] + "_" + size + suffix);
  } else {
    return null;
  }
}
function removeProtocol(path) {
  return path.replace(/http(s)?:/, "");
}

const {
  strings: {
    products: strings$6
  }
} = window.theme;
const selectors$1a = {
  unitPriceContainer: '[data-unit-price-container]',
  unitPrice: '[data-unit-price]',
  unitPriceBase: '[data-unit-base]'
};
const classes$p = {
  available: 'unit-price--available'
};
const updateUnitPrices = (container, variant) => {
  const unitPriceContainers = t$3(selectors$1a.unitPriceContainer, container);
  const unitPrices = t$3(selectors$1a.unitPrice, container);
  const unitPriceBases = t$3(selectors$1a.unitPriceBase, container);
  const showUnitPricing = !variant || !variant.unit_price;
  l(unitPriceContainers, classes$p.available, !showUnitPricing);
  if (!variant || !variant.unit_price) return;
  _replaceText(unitPrices, formatMoney(variant.unit_price));
  _replaceText(unitPriceBases, _getBaseUnit(variant.unit_price_measurement));
};
const renderUnitPrice = (unitPrice, unitPriceMeasurement) => {
  if (unitPrice && unitPriceMeasurement) {
    const label = strings$6.product.unitPrice;
    return `
      <div class="unit-price ${classes$p.available}">
        <dt>
          <span class="visually-hidden visually-hidden--inline">${label}</span>
        </dt>
        <dd class="unit-price__price">
          <span data-unit-price>${formatMoney(unitPrice)}</span><span aria-hidden="true">/</span><span class="visually-hidden">${strings$6.product.unitPriceSeparator}&nbsp;</span><span data-unit-base>${_getBaseUnit(unitPriceMeasurement)}</span>
        </dd>
      </div>
    `;
  }
  return '';
};
const _getBaseUnit = unitPriceMeasurement => {
  return unitPriceMeasurement.reference_value === 1 ? unitPriceMeasurement.reference_unit : unitPriceMeasurement.reference_value + unitPriceMeasurement.reference_unit;
};
const _replaceText = (nodeList, replacementText) => {
  nodeList.forEach(node => node.innerText = replacementText);
};

const classes$o = {
  visible: 'is-visible',
  active: 'active',
  fixed: 'is-fixed'
};
const selectors$19 = {
  closeBtn: '[data-store-availability-close]',
  productTitle: '[data-store-availability-product-title]',
  variantTitle: '[data-store-availability-variant-title]',
  productCard: '[data-store-availability-product]',
  storeListcontainer: '[data-store-list-container]',
  wash: '[data-store-availability-drawer-wash]'
};
const storeAvailabilityDrawer = node => {
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  const wash = n$2(selectors$19.wash, node.parentNode);
  const productCard = n$2(selectors$19.productCard, node);
  const storeListContainer = n$2(selectors$19.storeListcontainer, node);
  const events = [e$3([n$2(selectors$19.closeBtn, node), wash], 'click', e => {
    e.preventDefault();
    _close();
  }), e$3(node, 'keydown', ({
    keyCode
  }) => {
    if (keyCode === 27) _close();
  }), c('availability:showMore', ({
    product,
    variant,
    storeList,
    options
  }) => {
    productCard.innerHTML = _renderProductCard(product, variant, options);
    _renderAvailabilityList(storeList);
    _open();
  })];
  const _renderAvailabilityList = storeList => {
    storeListContainer.innerHTML = '';
    storeListContainer.appendChild(storeList);
  };
  const _renderProductCard = ({
    featured_image: image,
    title
  }, {
    title: variant_title,
    featured_image,
    price,
    unit_price,
    unit_price_measurement
  }, {
    hideVariantTitle
  }) => {
    let productImage = _getVariantImage(image, featured_image);
    return `
      <div class="store-availbility-drawer__product-card">
        ${productImage ? `
            <div class='store-availbility-drawer__product-card-image'>
              <img src='${productImage}' alt='${title}'/>
            </div>
          ` : ''}
        <div class='store-availbility-drawer__product-card-details'>
          <div>
            <h4 class="fs-body-bold">
              <span>${title}</span>
            </h4>
            <div class="store-availbility-drawer__product-price-wrapper">
              <span class="store-availbility-drawer__product-price">${formatMoney(price)}</span>
              ${renderUnitPrice(unit_price, unit_price_measurement)}
            </div>
            <div class="store-availbility-drawer__product-card-variant${hideVariantTitle ? ' hidden' : ''}">
              ${variant_title}
            </div>
          </div>
        </div>
      </div>
    `;
  };
  const _getVariantImage = (productImage, variantImage) => {
    if (!productImage && !variantImage) return '';
    if (variantImage) {
      return _updateImageSize(variantImage.src);
    }
    return _updateImageSize(productImage);
  };
  const _updateImageSize = imageUrl => {
    return getSizedImageUrl(imageUrl.replace('.' + imageSize(imageUrl), ''), '200x');
  };
  const _open = () => {
    // Due to this component being shared between templates we have to
    // animate around it being fixed to the window
    u$1(node, classes$o.fixed);
    setTimeout(() => {
      u$1(node, classes$o.visible);
      u$1(node, classes$o.active);
    }, 50);
    node.setAttribute('aria-hidden', 'false');
    focusTrap.activate();
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute('data-scroll-lock-ignore') !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  };
  const _close = () => {
    focusTrap.deactivate();
    i$1(node, classes$o.active);
    i$1(node, classes$o.visible);
    node.setAttribute('aria-hidden', 'true');
    enableBodyScroll(node);
    setTimeout(() => {
      i$1(node, classes$o.fixed);
    }, 300);
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
};

const {
  strings: {
    accessibility: strings$5
  }
} = window.theme;
const handleTab = () => {
  let tabHandler = null;
  const formElments = ['INPUT', 'TEXTAREA', 'SELECT'];
  // Determine if the user is a mouse or keyboard user
  function handleFirstTab(e) {
    if (e.keyCode === 9 && !formElments.includes(document.activeElement.tagName)) {
      document.body.classList.add('user-is-tabbing');
      tabHandler();
      tabHandler = e$3(window, 'mousedown', handleMouseDownOnce);
    }
  }
  function handleMouseDownOnce() {
    document.body.classList.remove('user-is-tabbing');
    tabHandler();
    tabHandler = e$3(window, 'keydown', handleFirstTab);
  }
  tabHandler = e$3(window, 'keydown', handleFirstTab);
};
const focusFormStatus = node => {
  const formStatus = n$2('.form-status', node);
  if (!formStatus) return;
  const focusElement = n$2('[data-form-status]', formStatus);
  focusElement.focus();
};
const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
function backgroundVideoHandler(container) {
  const pause = n$2('.video-pause', container);
  const video = container.getElementsByTagName('VIDEO')[0];
  if (!pause || !video) return;
  const pauseListener = e$3(pause, 'click', e => {
    e.preventDefault();
    if (video.paused) {
      video.play();
      pause.innerText = strings$5.pause_video;
    } else {
      video.pause();
      pause.innerText = strings$5.play_video;
    }
  });
  return () => pauseListener();
}

const classes$n = {
  contrast: 'section--contrast',
  parentContrast: 'shopify-section--contrast',
  parentContrastBeforeFooter: 'shoping-section--contrast-before-footer',
  logoList: 'logo-list',
  parentLogoList: 'shopify-section--logo-list',
  hidden: 'hidden'
};
var sectionClasses = (() => {
  function adjustClasses() {
    const sections = t$3('.main .shopify-section');
    sections.forEach((section, index) => {
      const {
        firstElementChild: child
      } = section;

      // Add contrast class to all parents of contrast sections
      if (child && child.classList.contains(classes$n.contrast)) {
        u$1(section, classes$n.parentContrast);

        // Add spacing class if last section is a contrast section
        if (index === sections.length - 1) {
          u$1(section, classes$n.parentContrastBeforeFooter);
        }
      }

      // Add logo list class to all parents of logo lists
      if (child && child.classList.contains(classes$n.logoList)) {
        u$1(section, classes$n.parentLogoList);
      }

      // Specific to recommended hidden products
      if (child && child.classList.contains(classes$n.hidden)) {
        u$1(section, classes$n.hidden);
      }
    });
  }
  adjustClasses();
  e$3(document, 'shopify:section:load', adjustClasses);
});

function makeRequest(method, url) {
  return new Promise(function (resolve, reject) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(this.status));
      }
    };
    xhr.onerror = function () {
      reject(new Error(this.status));
    };
    xhr.send();
  });
}

const selectors$18 = {
  quickAddButton: '[data-quick-add]',
  quantityButton: '[data-quick-add-quantity]',
  quantityInput: '[data-quantity-input]'
};
const classes$m = {
  loading: 'loading',
  itemAdded: 'item-added'
};
function quickAdd () {
  let productContent;
  const delegate = new Delegate(document.body);
  delegate.on('click', `button${selectors$18.quickAddButton}`, _handleClick);
  delegate.on('click', `button${selectors$18.quantityButton}`, _handleQuantityClick);
  function _handleClick(e, target) {
    const {
      quickAdd: handle,
      productId,
      openModal,
      openQuickCart
    } = target.dataset;
    const quantityEl = n$2(selectors$18.quantityInput, e.target.parentNode);
    const quantity = quantityEl ? quantityEl.value : 1;

    // Open the modal with variant information and a product form
    if (openModal) {
      _openModal({
        handle,
        openQuickCart,
        quantity
      });
    } else {
      // Or add directly to cart
      _addToCart({
        productId,
        target: e.target,
        openQuickCart,
        quantity
      });
    }
  }
  function _openModal({
    handle,
    openQuickCart,
    quantity
  }) {
    const requestUrl = `${window.theme.routes.products}/${encodeURIComponent(handle)}?section_id=quick-add-product`;
    makeRequest('GET', requestUrl).then(response => {
      productContent = response;
    }).then(() => {
      r$3('quick-add:open', null, {
        productContent,
        openQuickCart,
        quantity
      });
    });
  }
  function _addToCart({
    productId,
    target,
    openQuickCart,
    quantity
  }) {
    u$1(target, classes$m.loading);
    cart.addItemById(productId, quantity).then(() => {
      if (openQuickCart) {
        r$3('cart:open', null, {
          flash: productId
        });
        i$1(target, classes$m.loading);
        u$1(target, classes$m.itemAdded);
      } else {
        i$1(target, classes$m.loading);
        u$1(target, classes$m.itemAdded);
      }
    });
  }
  function _handleQuantityClick(_, target) {
    const {
      change
    } = target.dataset;
    const quantityInput = n$2(selectors$18.quantityInput, target.parentNode);
    const quantity = parseInt(quantityInput.value, 10);
    if (change === 'increment') {
      quantityInput.value = quantity + 1;
    } else {
      quantityInput.value = quantity > 1 ? quantityInput.value -= 1 : 1;
    }
  }
}

/**
 * Returns a product JSON object when passed a product URL
 * @param {*} url
 */

/**
 * Find a match in the project JSON (using a ID number) and return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Number} value Accepts Number (e.g. 6908023078973)
 * @returns {Object} The variant object once a match has been successful. Otherwise null will be return
 */
function getVariantFromId(product, value) {
  _validateProductStructure(product);

  if (typeof value !== 'number') {
    throw new TypeError(value + ' is not a Number.');
  }

  var result = product.variants.filter(function(variant) {
    return variant.id === value;
  });

  return result[0] || null;
}

/**
 * Convert the Object (with 'name' and 'value' keys) into an Array of values, then find a match & return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Object} collection Object with 'name' and 'value' keys (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromSerializedArray(product, collection) {
  _validateProductStructure(product);

  // If value is an array of options
  var optionArray = _createOptionArrayFromOptionCollection(product, collection);
  return getVariantFromOptionArray(product, optionArray);
}

/**
 * Find a match in the project JSON (using Array with option values) and return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Array} options List of submitted values (e.g. ['36', 'Black'])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromOptionArray(product, options) {
  _validateProductStructure(product);
  _validateOptionsArray(options);

  var result = product.variants.filter(function(variant) {
    return options.every(function(option, index) {
      return variant.options[index] === option;
    });
  });

  return result[0] || null;
}

/**
 * Creates an array of selected options from the object
 * Loops through the project.options and check if the "option name" exist (product.options.name) and matches the target
 * @param {Object} product Product JSON object
 * @param {Array} collection Array of object (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Array} The result of the matched values. (e.g. ['36', 'Black'])
 */
function _createOptionArrayFromOptionCollection(product, collection) {
  _validateProductStructure(product);
  _validateSerializedArray(collection);

  var optionArray = [];

  collection.forEach(function(option) {
    for (var i = 0; i < product.options.length; i++) {
      if (product.options[i].name.toLowerCase() === option.name.toLowerCase()) {
        optionArray[i] = option.value;
        break;
      }
    }
  });

  return optionArray;
}

/**
 * Check if the product data is a valid JS object
 * Error will be thrown if type is invalid
 * @param {object} product Product JSON object
 */
function _validateProductStructure(product) {
  if (typeof product !== 'object') {
    throw new TypeError(product + ' is not an object.');
  }

  if (Object.keys(product).length === 0 && product.constructor === Object) {
    throw new Error(product + ' is empty.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted like jQuery's serializeArray()
 * @param {Array} collection Array of object [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }]
 */
function _validateSerializedArray(collection) {
  if (!Array.isArray(collection)) {
    throw new TypeError(collection + ' is not an array.');
  }

  if (collection.length === 0) {
    return [];
  }

  if (collection[0].hasOwnProperty('name')) {
    if (typeof collection[0].name !== 'string') {
      throw new TypeError(
        'Invalid value type passed for name of option ' +
          collection[0].name +
          '. Value should be string.'
      );
    }
  } else {
    throw new Error(collection[0] + 'does not contain name key.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted as list of values
 * @param {Array} collection Array of object (e.g. ['36', 'Black'])
 */
function _validateOptionsArray(options) {
  if (Array.isArray(options) && typeof options[0] === 'object') {
    throw new Error(options + 'is not a valid array of options.');
  }
}

const selectors$17 = {
  idInput: '[name="id"]',
  optionInput: '[name^="options"]',
  quantityInput: '[data-quantity-input]',
  formQuantity: '[name="quantity"]',
  propertyInput: '[name^="properties"]'
};
function ProductForm(container, form, prod, config = {}) {
  const product = validateProductObject(prod);
  const listeners = [];
  const getOptions = () => {
    return _serializeOptionValues(optionInputs, function (item) {
      var regex = /(?:^(options\[))(.*?)(?:\])/;
      item.name = regex.exec(item.name)[2]; // Use just the value between 'options[' and ']'
      return item;
    });
  };
  const getVariant = () => {
    return getVariantFromSerializedArray(product, getOptions());
  };
  const getProperties = () => {
    const properties = _serializePropertyValues(propertyInputs, function (propertyName) {
      var regex = /(?:^(properties\[))(.*?)(?:\])/;
      var name = regex.exec(propertyName)[2]; // Use just the value between 'properties[' and ']'
      return name;
    });
    return Object.entries(properties).length === 0 ? null : properties;
  };
  const getQuantity = () => {
    return formQuantityInput[0] ? Number.parseInt(formQuantityInput[0].value, 10) : 1;
  };
  const getProductFormEventData = () => ({
    options: getOptions(),
    variant: getVariant(),
    properties: getProperties(),
    quantity: getQuantity()
  });
  const onFormEvent = cb => {
    if (typeof cb === 'undefined') return;
    return event => {
      event.dataset = getProductFormEventData();
      cb(event);
    };
  };
  const setIdInputValue = value => {
    let idInputElement = form.querySelector(selectors$17.idInput);
    if (!idInputElement) {
      idInputElement = document.createElement('input');
      idInputElement.type = 'hidden';
      idInputElement.name = 'id';
      form.appendChild(idInputElement);
    }
    idInputElement.value = value.toString();
  };
  const onSubmit = event => {
    event.dataset = getProductFormEventData();
    setIdInputValue(event.dataset.variant.id);
    if (config.onFormSubmit) {
      config.onFormSubmit(event);
    }
  };
  const initInputs = (selector, cb) => {
    const elements = [...container.querySelectorAll(selector)];
    return elements.map(element => {
      listeners.push(e$3(element, 'change', onFormEvent(cb)));
      return element;
    });
  };
  listeners.push(e$3(form, 'submit', onSubmit));
  const optionInputs = initInputs(selectors$17.optionInput, config.onOptionChange);
  const formQuantityInput = initInputs(selectors$17.quantityInput, config.onQuantityChange);
  const propertyInputs = initInputs(selectors$17.propertyInput, config.onPropertyChange);
  const destroy = () => {
    listeners.forEach(unsubscribe => unsubscribe());
  };
  return {
    getVariant,
    destroy
  };
}
function validateProductObject(product) {
  if (typeof product !== 'object') {
    throw new TypeError(product + ' is not an object.');
  }
  if (typeof product.variants[0].options === 'undefined') {
    throw new TypeError('Product object is invalid. Make sure you use the product object that is output from {{ product | json }} or from the http://[your-product-url].js route');
  }
  return product;
}
function _serializeOptionValues(inputs, transform) {
  return inputs.reduce(function (options, input) {
    if (input.checked ||
    // If input is a checked (means type radio or checkbox)
    input.type !== 'radio' && input.type !== 'checkbox' // Or if its any other type of input
    ) {
      options.push(transform({
        name: input.name,
        value: input.value
      }));
    }
    return options;
  }, []);
}
function _serializePropertyValues(inputs, transform) {
  return inputs.reduce(function (properties, input) {
    if (input.checked ||
    // If input is a checked (means type radio or checkbox)
    input.type !== 'radio' && input.type !== 'checkbox' // Or if its any other type of input
    ) {
      properties[transform(input.name)] = input.value;
    }
    return properties;
  }, {});
}

function quantityInput (container) {
  const quantityWrapper = n$2(".product__quantity", container);
  if (!quantityWrapper) return;
  const quantityInput = n$2("[data-quantity-input]", quantityWrapper);
  const addQuantity = n$2("[data-add-quantity]", quantityWrapper);
  const subtractQuanity = n$2("[data-subtract-quantity]", quantityWrapper);
  const handleAddQuantity = () => {
    const currentValue = parseInt(quantityInput.value);
    let newValue = currentValue + 1;
    if (currentValue < 1) {
      newValue = 1;
    }
    quantityInput.value = newValue;
    quantityInput.dispatchEvent(new Event("change"));
  };
  const handleSubtractQuantity = () => {
    const currentValue = parseInt(quantityInput.value);
    if (currentValue <= 1) return;
    const newValue = currentValue - 1;
    quantityInput.value = newValue;
    quantityInput.dispatchEvent(new Event("change"));
  };
  const events = [e$3(addQuantity, "click", handleAddQuantity), e$3(subtractQuanity, "click", handleSubtractQuantity)];
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
}

const selectors$16 = {
  variantPopupTrigger: '[data-variant-popup-trigger]'
};
const variantPopup = node => {
  const delegate = new Delegate(node);
  const _variantPopupHandler = e => {
    e.preventDefault();
    const {
      modalContentId
    } = e.target.dataset;
    const content = n$2(`#${modalContentId}`, node);
    r$3('modal:open', null, {
      modalContent: content
    });
  };
  const unload = () => {
    delegate.destroy();
  };
  delegate.on('click', selectors$16.variantPopupTrigger, _variantPopupHandler);
  return {
    unload
  };
};

const {
  strings: {
    products: strings$4
  }
} = window.theme;
const selectors$15 = {
  price: '[data-price]',
  comparePrice: '[data-compare-price]'
};
function updatePrices (container, variant) {
  const price = t$3(selectors$15.price, container);
  const comparePrice = t$3(selectors$15.comparePrice, container);
  const unavailableString = strings$4.product.unavailable;
  if (!variant) {
    price.forEach(el => el.innerHTML = unavailableString);
    comparePrice.forEach(el => el.innerHTML = '');
    return;
  }
  price.forEach(el => el.innerHTML = formatMoney(variant.price));
  comparePrice.forEach(el => el.innerHTML = variant.compare_at_price > variant.price ? formatMoney(variant.compare_at_price) : '');
}

const selectors$14 = {
  productSku: '[data-product-sku]'
};
const {
  strings: {
    products: strings$3
  }
} = window.theme;
function updateSku (container, variant) {
  const skuElement = n$2(selectors$14.productSku, container);
  if (!skuElement) return;
  const {
    sku
  } = strings$3.product;
  const skuString = value => `${sku}: ${value}`;
  if (!variant || !variant.sku) {
    skuElement.innerText = '';
    return;
  }
  skuElement.innerText = skuString(variant.sku);
}

function updateBuyButton (btn, variant) {
  const text = n$2('[data-add-to-cart-text]', btn);
  const {
    langAvailable,
    langUnavailable,
    langSoldOut
  } = btn.dataset;
  if (!variant) {
    btn.setAttribute('disabled', 'disabled');
    text.textContent = langUnavailable;
  } else if (variant.available) {
    btn.removeAttribute('disabled');
    text.textContent = langAvailable;
  } else {
    btn.setAttribute('disabled', 'disabled');
    text.textContent = langSoldOut;
  }
}

const storage = {
  get: () => e$1("quick_purchase_bar"),
  set: val => r$2("quick_purchase_bar", val)
};
const selectors$13 = {
  productBar: "[data-quick-purchase-bar]",
  purchaseButton: "[data-quick-purchase-button]",
  hideButton: "[data-mobile-hide]",
  productForm: ".product-form",
  productTop: ".product__top",
  productImage: ".quick-purchase-bar__product-image",
  barQuantity: "[data-bar-quantity]",
  barProductTitle: "[data-bar-product-title]",
  checkoutLink: ".quick-purchase-bar__purchase-link",
  addToCartLink: ".product-form__cart-submit"
};
const classes$l = {
  active: "active",
  loading: "loading",
  hidden: "is-hidden"
};
function quickPurchaseBar (container, variant) {
  const productForm = n$2(selectors$13.productForm, container);
  const productBar = n$2(selectors$13.productBar, container);
  const purchaseButton = n$2(selectors$13.purchaseButton, container);
  const hideButton = n$2(selectors$13.hideButton, container);
  const productImage = n$2(selectors$13.productImage, container);
  const barQuantity = n$2(selectors$13.barQuantity, container);
  const barProductTitle = n$2(selectors$13.barProductTitle, container);
  const productQuantity = n$2('input[name="quantity"]', container);
  const checkoutLink = n$2(selectors$13.checkoutLink, container);
  const addToCartLink = n$2(selectors$13.addToCartLink, container);
  barQuantity.innerHTML = `x ${parseInt(productQuantity.value, 10)}`;
  barProductTitle.innerHTML = variant.name;
  productBar.dataset.variantId = variant.id;
  let observer = null;
  setOffset();
  if (storage.get()) {
    u$1(productBar, classes$l.hidden);
  }
  const events = [e$3(hideButton, "click", e => {
    setOffset();
    l(productBar, classes$l.hidden);
    storage.set(a$1(productBar, classes$l.hidden));
  }), e$3(purchaseButton, "click", () => {
    if (purchaseButton.dataset.quickPurchaseButton === "checkout") {
      cart.addItemById(productBar.dataset.variantId, productQuantity.value > 0 ? productQuantity.value : 1).then(() => checkoutLink.click());
    } else if (purchaseButton.dataset.quickPurchaseButton === "add-to-cart") {
      addToCartLink.click();
    }
  })];
  _intObserver();
  function setOffset() {
    productBar.style.setProperty("--quick-purchase-offset", `${productBar.clientHeight - 20}px`);
  }
  function _intObserver() {
    observer = new IntersectionObserver(([{
      isIntersecting: visible
    }]) => {
      l(productBar, classes$l.active, !visible);
    });
    observer.observe(productForm);
  }
  function hideQuickPurchaseBar() {
    i$1(productBar, classes$l.active);
    observer && observer.unobserve(productForm);
  }
  function showQuickPurchaseBar() {
    observer && observer.observe(productForm);
  }
  function update(variant) {
    // if the variant is not available, hide bar and do not update to a sold out product
    if (!variant.available) {
      hideQuickPurchaseBar();
      return;
    }
    showQuickPurchaseBar();
    updatePrices(productBar, variant);
    productBar.dataset.variantId = variant.id;
    barQuantity.innerHTML = "";
    barProductTitle.innerHTML = "";
    if (productQuantity.value > 0) {
      barQuantity.innerHTML = `x ${parseInt(productQuantity.value, 10)}`;
    }
    barProductTitle.innerHTML = variant.name;
    if (variant.featured_media) {
      const img = `<img class="image__img lazyload" data-src="${getSizedImageUrl(variant.featured_media.preview_image.src, "120x")}" />`;
      productImage.innerHTML = img;
    }
  }
  const unload = () => {
    observer && observer.disconnect();
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    update,
    unload
  };
}

const {
  strings: {
    product: strings$2
  }
} = theme;
const selectors$12 = {
  sprForm: '.spr-form',
  newReviewButton: '.spr-summary-actions-newreview',
  submitButton: '.spr-button',
  modalContent: '.modal__content',
  summery: '.spr-summary',
  starRating: '.spr-starrating',
  shopifySection: '.shopify-section'
};
function reviewsHandler () {
  const sprForm = n$2(selectors$12.sprForm, document);
  const wrappingContainer = sprForm.closest(selectors$12.shopifySection);
  const newReviewButton = n$2(selectors$12.newReviewButton, document);
  const modalContent = n$2(selectors$12.modalContent, document);
  const reviewsCaption = n$2(selectors$12.summery, document);
  const headingStars = n$2(selectors$12.starRating, reviewsCaption);

  // If reviews don't exist add empty stars to heading
  if (!headingStars) {
    const emptyStars = `
      <span class="spr-starrating spr-summary-starrating">
        <i class="spr-icon spr-icon-star-empty"></i>
        <i class="spr-icon spr-icon-star-empty"></i>
        <i class="spr-icon spr-icon-star-empty"></i>
        <i class="spr-icon spr-icon-star-empty"></i>
        <i class="spr-icon spr-icon-star-empty"></i>
      </span>
    `;
    reviewsCaption.insertAdjacentHTML('afterbegin', emptyStars);
  }

  // Add wrapping section classes
  if (wrappingContainer.parentNode.classList.contains('main')) {
    u$1(wrappingContainer, 'shopify-section--stackable', 'shopify-section--contrast');

    // If last section before footer add appropriate class
    if (!wrappingContainer.nextElementSibling) {
      u$1(wrappingContainer, 'shoping-section--contrast-before-footer');
    }
  }
  const formListener = c('spr-form:updated', handleFormUpdate);
  addNewButton();
  function handleFormUpdate() {
    const sprForm = n$2(selectors$12.sprForm, document);
    const clonedForm = sprForm.cloneNode(true);
    modalContent.innerHTML = '';
    modalContent.appendChild(clonedForm);
  }
  function addNewButton() {
    const button = document.createElement('button');
    u$1(button, 'spr-summary-actions-newreview', 'active');
    button.innerText = strings$2.review;
    newReviewButton.parentNode.insertBefore(button, newReviewButton);
    e$3(button, 'click', e => {
      e.preventDefault();
      r$3('modal:open', null, {
        modalContent: sprForm,
        narrow: true
      });
    });
  }
  const unload = () => {
    formListener();
  };
  return {
    unload
  };
}

function OptionButtons(els) {
  const groups = els.map(createOptionGroup);
  function destroy() {
    groups && groups.forEach(group => group());
  }
  return {
    groups,
    destroy
  };
}
function createOptionGroup(el) {
  const select = n$2('select', el);
  const buttons = t$3('[data-button]', el);
  const buttonClick = e$3(buttons, 'click', e => {
    e.preventDefault();
    const {
      button,
      swatchButton,
      label
    } = e.currentTarget.dataset;
    if (swatchButton) {
      const optionSelectedLabel = n$2('[data-swatch-selected]', e.currentTarget.closest('.product__option'));
      if (optionSelectedLabel) optionSelectedLabel.innerHTML = label;
    }
    buttons.forEach(btn => l(btn, 'selected', btn.dataset.button === button));
    const opt = n$2(`[data-value-handle="${button}"]`, select);
    opt.selected = true;
    select.dispatchEvent(new Event('change'));
  });
  return () => buttonClick();
}

const selectors$11 = {
  counterContainer: "[data-inventory-counter]",
  inventoryMessage: ".inventory-counter__message",
  countdownBar: ".inventory-counter__bar",
  progressBar: ".inventory-counter__bar-progress"
};
const classes$k = {
  active: "active",
  inventoryLow: "inventory--low"
};
const inventoryCounter = (container, config) => {
  const variantsInventories = config.variantsInventories;
  const counterContainer = n$2(selectors$11.counterContainer, container);
  const inventoryMessageElement = n$2(selectors$11.inventoryMessage, container);
  const progressBar = n$2(selectors$11.progressBar, container);
  const {
    lowInventoryThreshold,
    showUntrackedQuantity,
    stockCountdownMax
  } = counterContainer.dataset;

  // If the threshold or countdownmax contains anything but numbers abort
  if (!lowInventoryThreshold.match(/^[0-9]+$/) || !stockCountdownMax.match(/^[0-9]+$/)) {
    return;
  }
  const threshold = parseInt(lowInventoryThreshold, 10);
  const countDownMax = parseInt(stockCountdownMax, 10);
  l(counterContainer, classes$k.active, productIventoryValid(variantsInventories[config.id]));
  checkThreshold(variantsInventories[config.id]);
  setProgressBar(variantsInventories[config.id].inventory_quantity, variantsInventories[config.id].inventory_management);
  setInventoryMessage(variantsInventories[config.id].inventory_message);
  function checkThreshold({
    inventory_policy,
    inventory_quantity,
    inventory_management
  }) {
    i$1(counterContainer, classes$k.inventoryLow);
    if (inventory_management !== null) {
      if (inventory_quantity <= threshold) {
        u$1(counterContainer, classes$k.inventoryLow);
      }
    }
  }
  function setProgressBar(inventoryQuantity, inventoryManagement) {
    if (inventoryManagement === null && showUntrackedQuantity == "true") {
      progressBar.style.width = `${100}%`;
      return;
    }
    if (inventoryQuantity <= 0) {
      progressBar.style.width = `${0}%`;
      return;
    }
    const progressValue = inventoryQuantity < countDownMax ? inventoryQuantity / countDownMax * 100 : 100;
    progressBar.style.width = `${progressValue}%`;
  }
  function setInventoryMessage(message) {
    inventoryMessageElement.innerText = message;
  }
  function productIventoryValid(product) {
    return product.inventory_message && (product.inventory_management !== null || product.inventory_management === null && showUntrackedQuantity == "true");
  }
  const update = variant => {
    l(counterContainer, classes$k.active, variant && productIventoryValid(variantsInventories[variant.id]));
    if (!variant) return;
    checkThreshold(variantsInventories[variant.id]);
    setProgressBar(variantsInventories[variant.id].inventory_quantity, variantsInventories[variant.id].inventory_management);
    setInventoryMessage(variantsInventories[variant.id].inventory_message);
  };
  return {
    update
  };
};

var n,e,i,o,t,r$1,f,d,p,u=[];function w(n,a){return e=window.pageXOffset,o=window.pageYOffset,r$1=window.innerHeight,d=window.innerWidth,void 0===i&&(i=e),void 0===t&&(t=o),void 0===p&&(p=d),void 0===f&&(f=r$1),(a||o!==t||e!==i||r$1!==f||d!==p)&&(!function(n){for(var w=0;w<u.length;w++)u[w]({x:e,y:o,px:i,py:t,vh:r$1,pvh:f,vw:d,pvw:p},n);}(n),i=e,t=o,f=r$1,p=d),requestAnimationFrame(w)}function srraf(e){return u.indexOf(e)<0&&u.push(e),n=n||w(performance.now()),{update:function(){return w(performance.now(),!0),this},destroy:function(){u.splice(u.indexOf(e),1);}}}

// LERP returns a number between start and end based on the amt
// Often used to smooth animations
// Eg. Given: start = 0, end = 100
// - if amt = 0.1 then lerp will return 10
// - if amt = 0.5 then lerp will return 50
// - if amt = 0.9 then lerp will return 90
const lerp = (start, end, amt) => {
  return (1 - amt) * start + amt * end;
};

const selectors$10 = {
  productMeta: ".product__meta"
};
const classes$j = {
  hasSticky: "product--has-sticky-scroll"
};
function stickyScroll (node) {
  const productMeta = n$2(selectors$10.productMeta, node);
  node.style.setProperty("--product-meta-top", 0);

  // Init position vars
  // The previous scroll position of the page
  let previousScrollY = window.scrollY;
  // To keep track of the amount scrolled per event
  let currentScrollAmount = 0;
  // Height of the header bar, used for calculating position
  // Set in `_observeHeight()` when the --header-desktop-sticky-height var is set
  let headerHeight = 0;
  // The value to set the product meta `top` value to
  let metaTop = headerHeight;
  let metaTopPrevious = metaTop;
  // The height of the product meta container
  // Gets updated by a resize observer on the window and the meta container
  let metaHeight = productMeta.offsetHeight;
  // The height of the product meta container plus the height of the header
  let metaHeightWithHeader = metaHeight + headerHeight;
  // The max amount to set the meta `top` value
  // This is equal to the number of pixels
  // that the meta container is hidden by the viewport.
  // Gets updated by a resize observer on the window and the meta container
  let metaMaxTop = metaHeightWithHeader - window.innerHeight;

  // Whatch scroll updates
  const scroller = srraf(({
    y
  }) => {
    _scrollHandler(y);
  });

  // Resize observer on the window and the product meta
  // Things like accordions can change the height of the meta container
  const resizeObserver = new ResizeObserver(_observeHeight);
  resizeObserver.observe(productMeta);
  resizeObserver.observe(document.documentElement);

  // Start the animation loop
  requestAnimationFrame(() => _updateMetaTopLoop());
  function _observeHeight() {
    metaHeight = productMeta.offsetHeight;
    headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--height-header").replace(/px/gi, ""));
    metaHeightWithHeader = metaHeight + headerHeight;
    metaMaxTop = metaHeightWithHeader - window.innerHeight;

    // Check if the product meta container is taller than the viewport
    // and section container has room for the meta to scroll.
    // The product meta could be taller than the images
    // so it won't have room to scroll.
    if (metaHeightWithHeader > window.innerHeight && node.offsetHeight > metaHeightWithHeader) {
      u$1(node, classes$j.hasSticky);
      _scrollHandler(window.scrollY);
    } else {
      i$1(node, classes$j.hasSticky);
    }
  }
  function _scrollHandler(y) {
    currentScrollAmount = previousScrollY - y;

    // The offset based on how far the page has been scrolled from last event
    const currentScrollOffset = metaTop + currentScrollAmount;
    // The max top value while scrolling up
    const topMax = headerHeight;
    // The max top value while scrolling down
    const bottomMax = -metaMaxTop + headerHeight - 60;

    // Calculate the current top value based on the currentScrollOffset value
    // in the range of topMax and bottomMax.
    metaTop = Math.max(bottomMax, Math.min(currentScrollOffset, topMax));

    // Update the previous scroll position for next time.
    previousScrollY = y;
  }

  // This is an endless RAF loop used to update the top position CSS var.
  // We're using this with a LERP function to smooth out the position updating
  // instead of having large jumps while scrolling fast.
  function _updateMetaTopLoop() {
    // We want to continue to update the top var until fully into the stopped position
    if (metaTop !== metaTopPrevious) {
      metaTopPrevious = lerp(metaTopPrevious, metaTop, 0.5);
      node.style.setProperty("--product-meta-top", `${metaTopPrevious}px`);
    }
    requestAnimationFrame(() => _updateMetaTopLoop());
  }
  function destroy() {
    scroller?.scroller.destroy();
    resizeObserver?.disconnect();
  }
  return {
    destroy
  };
}

// wrapAround: false,
const selectors$$ = {
  slider: "[data-slider]",
  prev: "[data-prev]",
  next: "[data-next]"
};
var mobileCarousel = (node => {
  const sliderElement = n$2(selectors$$.slider, node);
  const previousButton = n$2(selectors$$.prev, node);
  const nextButton = n$2(selectors$$.next, node);
  let slider = null;
  const events = [];
  const config = {
    adaptiveHeight: true,
    cellAlign: "left",
    cellSelector: "[data-slide]",
    pageDots: false,
    prevNextButtons: false,
    contain: true,
    watchCSS: true,
    imagesLoaded: true,
    initialIndex: ".is-initial-select",
    pauseAutoPlayOnHover: !window.Shopify.designMode,
    on: {
      ready: function () {
        this.resize();
        // Need to wait for the flicktiy view-port transiton
        setTimeout(() => {
          _updateNavigationPosition(n$2(".media, .placeholder-image", node));
        }, 350);
      },
      scroll: function () {
        _updateNavigationPosition(this.element);
      }
    }
  };
  previousButton.disabled = true;
  const _updateNavigationPosition = image => {
    const currentImageHeight = image.clientHeight;
    const buttonHeight = nextButton.clientHeight;
    const halfcurrentImageHeight = currentImageHeight / 2;
    const halfButtonHeight = buttonHeight / 2;
    const offset = halfcurrentImageHeight - halfButtonHeight;
    node.style.setProperty("--navigation-offset", `${offset}px`);
    i$1(nextButton, "hidden");
    i$1(previousButton, "hidden");
  };
  import(flu.chunks.flickity).then(({
    Flickity
  }) => {
    slider = new Flickity(sliderElement, config);
    slider.on("scroll", progress => {
      const progressScale = progress * 100;

      // https://github.com/metafizzy/flickity/issues/289
      previousButton.disabled = progressScale < 1;
      nextButton.disabled = progressScale > 99;
    });
  });
  let prevClick;
  let nextClick;
  let prevMouseenter;
  let nextMouseenter;
  import(flu.chunks.gsap).then(({
    gsap,
    CustomEase
  }) => {
    gsap.registerPlugin(CustomEase);
    prevClick = e$3(previousButton, "click", handleClick);
    nextClick = e$3(nextButton, "click", handleClick);
    prevMouseenter = e$3(previousButton, "mouseenter", arrowMouseenter);
    nextMouseenter = e$3(nextButton, "mouseenter", arrowMouseenter);
    const arrowClickEase = gsap.parseEase(window.theme.animation.ease);
    const arrowHoverEase = gsap.parseEase(window.theme.animation.ease);
    function handleClick(evt) {
      const prev = evt.target.closest(selectors$$.prev);
      const next = evt.target.closest(selectors$$.next);
      if (prev) {
        slider && slider.previous();
        arrowClick(prev);
      }
      if (next) {
        slider && slider.next();
        arrowClick(next);
      }
    }
    function arrowClick(button) {
      gsap.to(button, {
        keyframes: [{
          scale: 0.8
        }, {
          scale: 1
        }],
        duration: 0.33,
        ease: arrowClickEase
      });
    }
    function arrowMouseenter(evt) {
      const svg = n$2("svg", evt.target);
      gsap.to(svg, {
        keyframes: [{
          x: 15,
          opacity: 0
        }, {
          x: -15,
          duration: 0
        }, {
          x: 0,
          opacity: 1
        }],
        duration: 0.43,
        ease: arrowHoverEase
      });
    }
  });
  return {
    destroy: () => {
      if ((slider.slides || {}).length > 1) {
        prevClick && prevClick();
        nextClick && nextClick();
        prevMouseenter && prevMouseenter();
        nextMouseenter && nextMouseenter();
      }
      slider && slider.destroy();
      events.forEach(unsubscribe => unsubscribe());
    },
    select: index => {
      slider?.select(index);
    }
  };
});

const classes$i = {
  disabled: "disabled"
};
const selectors$_ = {
  variantsWrapper: "[data-product-variants]",
  variantsJson: "[data-variant-json]",
  input: "[dynamic-variant-input]",
  inputWrap: "[dynamic-variant-input-wrap]",
  inputWrapWithValue: option => `${selectors$_.inputWrap}[data-index="${option}"]`,
  buttonWrap: "[dynamic-variant-button]",
  buttonWrapWithValue: value => `${selectors$_.buttonWrap}[data-option-value="${value}"]`
};

/**
 *  VariantAvailability
    - Cross out sold out or unavailable variants
    - Required markup:
      - class=dynamic-variant-input-wrap + data-index="option{{ forloop.index }}" to wrap select or button group
      - class=dynamic-variant-input + data-index="option{{ forloop.index }}" to wrap selects associated with variant potentially hidden if swatch / chip
      - class=dynamic-variant-button + data-option-value="{{ value | escape }}" to wrap button of swatch / chip
      - hidden product variants json markup
  * @param {node} container product container element
  * @returns {unload} remove event listeners
 */
function variantAvailability (container) {
  const variantsWrapper = n$2(selectors$_.variantsWrapper, container);

  // Variant options block do not exist
  if (!variantsWrapper) return;
  const {
    enableDynamicProductOptions,
    currentVariantId
  } = variantsWrapper.dataset;
  if (enableDynamicProductOptions === "false") return;
  const productVariants = JSON.parse(n$2(selectors$_.variantsJson, container).innerText);

  // Using associated selects as buy buttons may be disabled.
  const variantSelectors = t$3(selectors$_.input, container);
  const variantSelectorWrappers = t$3(selectors$_.inputWrap, container);
  const events = [];
  init();
  function init() {
    variantSelectors.forEach(el => {
      events.push(e$3(el, "change", handleChange));
    });
    setInitialAvailability();
  }
  function setInitialAvailability() {
    // Disable all options on initial load
    variantSelectorWrappers.forEach(group => disableVariantGroup(group));
    const initiallySelectedVariant = productVariants.find(variant => variant.id === parseInt(currentVariantId, 10));
    const currentlySelectedValues = initiallySelectedVariant.options.map((value, index) => {
      return {
        value,
        index: `option${index + 1}`
      };
    });
    const initialOptions = createAvailableOptionsTree(productVariants, currentlySelectedValues);
    for (const [option, values] of Object.entries(initialOptions)) {
      manageOptionState(option, values);
    }
  }

  // Create a list of all options. If any variant exists and is in stock with that option, it's considered available
  function createAvailableOptionsTree(variants, currentlySelectedValues) {
    // Reduce variant array into option availability tree
    return variants.reduce((options, variant) => {
      // Check each option group (e.g. option1, option2, option3) of the variant
      Object.keys(options).forEach(index => {
        if (variant[index] === null) return;
        let entry = options[index].find(option => option.value === variant[index]);
        if (typeof entry === "undefined") {
          // If option has yet to be added to the options tree, add it
          entry = {
            value: variant[index],
            soldOut: true
          };
          options[index].push(entry);
        }
        const currentOption1 = currentlySelectedValues.find(({
          index
        }) => index === "option1");
        const currentOption2 = currentlySelectedValues.find(({
          index
        }) => index === "option2");
        switch (index) {
          case "option1":
            // Option1 inputs should always remain enabled based on all available variants
            entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            break;
          case "option2":
            // Option2 inputs should remain enabled based on available variants that match first option group
            if (currentOption1 && variant.option1 === currentOption1.value) {
              entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            }
            break;
          case "option3":
            // Option 3 inputs should remain enabled based on available variants that match first and second option group
            if (currentOption1 && variant.option1 === currentOption1.value && currentOption2 && variant.option2 === currentOption2.value) {
              entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            }
        }
      });
      return options;
    }, {
      option1: [],
      option2: [],
      option3: []
    });
  }
  function handleChange() {
    const currentlySelectedValues = variantSelectors.map(el => {
      return {
        value: el.value,
        index: el.id
      };
    });
    setAvailability(currentlySelectedValues);
  }
  function setAvailability(selectedValues) {
    // Object to hold all options by value.
    // This will be what sets a button/dropdown as
    // sold out or unavailable (not a combo set as purchasable)
    const valuesToManage = createAvailableOptionsTree(productVariants, selectedValues);

    // Loop through all option levels and send each
    // value w/ args to function that determines to show/hide/enable/disable
    for (const [option, values] of Object.entries(valuesToManage)) {
      manageOptionState(option, values);
    }
  }
  function manageOptionState(option, values) {
    const group = n$2(selectors$_.inputWrapWithValue(option), container);

    // Loop through each option value
    values.forEach(obj => {
      toggleVariantOption(group, obj);
    });
  }
  function toggleVariantOption(group, obj) {
    // Selecting by value so escape it
    const value = escapeQuotes(obj.value);

    // Do nothing if the option is a select dropdown
    if (n$2(".product__option-select-wrapper", group)) return;
    const button = n$2(selectors$_.buttonWrapWithValue(value), group);

    // Variant exists - enable & show variant
    i$1(button, classes$i.disabled);
    // Variant sold out - cross out option (remains selectable)
    if (obj.soldOut) {
      u$1(button, classes$i.disabled);
    }
  }
  function disableVariantGroup(group) {
    if (n$2(".product__option-select-wrapper", group)) return;
    t$3(selectors$_.buttonWrap, group).forEach(button => u$1(button, classes$i.disabled));
  }
  function escapeQuotes(str) {
    const escapeMap = {
      '"': '\\"',
      "'": "\\'"
    };
    return str.replace(/"|'/g, m => escapeMap[m]);
  }
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
}

const selectors$Z = {
  slider: "[data-slider]",
  prev: "[data-prev]",
  next: "[data-next]"
};
var Carousel = ((node, type, opts = {}) => {
  const sliderElement = n$2(selectors$Z.slider, node);
  const previousButton = n$2(selectors$Z.prev, node);
  const nextButton = n$2(selectors$Z.next, node);
  let slider = null;
  const events = [];
  const defaultOpts = {
    adaptiveHeight: !window.matchMedia("(min-width: 45em)").matches,
    cellAlign: "left",
    cellSelector: "[data-slide]",
    pageDots: false,
    prevNextButtons: false,
    contain: true,
    imagesLoaded: true,
    pauseAutoPlayOnHover: !window.Shopify.designMode,
    on: {
      ready: function () {
        _updateNavigationPosition();
        this.resize();

        // optional onReady event callback
        if (opts.onReady && typeof opts.onReady === "function") {
          opts.onReady();
        }
      },
      change: function (index) {
        // optional onchange
        if (opts.onChange && typeof opts.onChange === "function") {
          opts.onChange(index);
        }
      }
    }
  };
  const config = Object.assign({}, defaultOpts, opts);
  if (!config.wrapAround) {
    previousButton.disabled = true;
  }
  const _updateNavigationPosition = () => {
    const firstImage = n$2(".image__img, .placeholder-image", node);
    const firstImageHeight = firstImage.clientHeight;
    const buttonHeight = nextButton.clientHeight;
    const halfFirstImageHeight = firstImageHeight / 2;
    const halfButtonHeight = buttonHeight / 2;
    const offset = halfFirstImageHeight - halfButtonHeight;
    node.style.setProperty("--navigation-offset", `${offset}px`);
    i$1(nextButton, "hidden");
    i$1(previousButton, "hidden");
  };
  import(flu.chunks.flickity).then(({
    Flickity
  }) => {
    slider = new Flickity(sliderElement, config);
    if (!config.wrapAround) {
      slider.on("scroll", progress => {
        const progressScale = progress * 100;

        // https://github.com/metafizzy/flickity/issues/289
        previousButton.disabled = progressScale < 1;
        nextButton.disabled = progressScale > 99;
      });
    }

    // Account for page-transition links that can fire on flickity drag
    slider.on("dragStart", () => slider.slider.childNodes.forEach(slide => t$3("a[href]", slide).forEach(element => u$1(element, "no-transition"))));
    slider.on("dragEnd", () => setTimeout(() => {
      slider.slider.childNodes.forEach(slide => t$3("a[href]", slide).forEach(element => i$1(element, "no-transition")));
    }, 100));
    r$3(`${type}:initialized`);
  });
  let prevClick;
  let nextClick;
  let prevMouseenter;
  let nextMouseenter;
  import(flu.chunks.gsap).then(({
    gsap,
    CustomEase
  }) => {
    gsap.registerPlugin(CustomEase);
    prevClick = e$3(previousButton, "click", handleClick);
    nextClick = e$3(nextButton, "click", handleClick);
    prevMouseenter = e$3(previousButton, "mouseenter", arrowMouseenter);
    nextMouseenter = e$3(nextButton, "mouseenter", arrowMouseenter);
    const arrowClickEase = gsap.parseEase(window.theme.animation.ease);
    const arrowHoverEase = gsap.parseEase(window.theme.animation.ease);
    function handleClick(evt) {
      const prev = evt.target.closest(selectors$Z.prev);
      const next = evt.target.closest(selectors$Z.next);
      if (prev) {
        slider && slider.previous();
        arrowClick(prev);
      }
      if (next) {
        slider && slider.next();
        arrowClick(next);
      }
    }
    function arrowClick(button) {
      gsap.to(button, {
        keyframes: [{
          scale: 0.8
        }, {
          scale: 1
        }],
        duration: 0.33,
        ease: arrowClickEase
      });
    }
    function arrowMouseenter(evt) {
      const svg = n$2("svg", evt.target);
      gsap.to(svg, {
        keyframes: [{
          x: 15,
          opacity: 0
        }, {
          x: -15,
          duration: 0
        }, {
          x: 0,
          opacity: 1
        }],
        duration: 0.43,
        ease: arrowHoverEase
      });
    }
  });
  return {
    destroy: () => {
      if ((slider.slides || {}).length > 1) {
        prevClick && prevClick();
        nextClick && nextClick();
        prevMouseenter && prevMouseenter();
        nextMouseenter && nextMouseenter();
      }
      slider && slider.destroy();
      events.forEach(unsubscribe => unsubscribe());
    },
    select: index => {
      if (slider) {
        slider.select(index);
      } else {
        events.push(c(`${type}:initialized`, () => slider.select(index)));
      }
    }
  };
});

function getMediaQuery(querySize) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${querySize}`);
  if (!value) {
    console.warn("Invalid querySize passed to getMediaQuery");
    return false;
  }
  return value;
}

const classes$h = {
  small: 'section--small',
  extraSmall: 'section--extra-small'
};
const mobileSizes = {
  default: 40,
  small: 40,
  extraSmall: 28
};
const desktopSizes = {
  default: 56,
  small: 120,
  extraSmall: 28
};
var intersectionWatcher = ((node, options = {
  instant: false
}) => {
  let threshold = 0;
  if (!options.instant) {
    // Get section size, this determines how much margin the section has
    let sectionSize = 'default';
    if (a$1(node, classes$h.small)) {
      sectionSize = 'small';
    } else if (a$1(node, classes$h.extraSmall)) {
      sectionSize = 'extraSmall';
    }

    // Get the margin amount based on section sizes and screen width
    let margin = 56;
    if (window.matchMedia(getMediaQuery("not-small")).matches) {
      margin = desktopSizes[sectionSize];
    } else {
      margin = mobileSizes[sectionSize];
    }
    threshold = Math.min(margin / node.offsetHeight, 0.5);
  }
  const observer = new IntersectionObserver(([{
    isIntersecting: visible
  }]) => {
    if (visible) {
      u$1(node, "is-visible");
      if (typeof options.cb === 'function') {
        options.cb();
      }
      observer.disconnect();
    }
  }, {
    threshold: threshold
  });
  observer.observe(node);
  return {
    destroy() {
      observer?.disconnect();
    }
  };
});

var shouldAnimate = (node => {
  return a$1(node, "animation") && !a$1(document.documentElement, "prefers-reduced-motion");
});

var AnimateProductItem = (items => {
  const events = [];
  const showSecondaryImageOnHover = document.body.dataset.showSecondaryImageOnHover === "true";
  import(flu.chunks.gsap).then(({
    gsap,
    CustomEase
  }) => {
    gsap.registerPlugin(CustomEase);
    const opacityEase = gsap.parseEase("0.40,0.00,0.00,1.00");
    const chipEaseIn = gsap.parseEase("0.40,0.00,0.10,1.00");
    const chipEaseOut = gsap.parseEase("0.30,0.00,0.00,1.00");
    items.forEach(item => {
      const imageOne = n$2(".product-item__image--one", item);
      const imageTwo = n$2(".product-item__image--two", item);
      const optionsElements = t$3(".product-item-options__list", item);
      if (!isMobile$1() && (showSecondaryImageOnHover && imageTwo || optionsElements)) {
        events.push(e$3(item, "mouseenter", () => {
          enterItemAnimation(imageOne, imageTwo, optionsElements);
        }));
        events.push(e$3(item, "mouseleave", () => {
          leaveItemAnimation(imageOne, imageTwo, optionsElements);
        }));
      }
    });
    function enterItemAnimation(imageOne, imageTwo, optionsElements) {
      if (showSecondaryImageOnHover && imageTwo) {
        gsap.killTweensOf(imageTwo);
        gsap.killTweensOf(imageOne);
        gsap.set(imageTwo, {
          zIndex: 2
        });
        gsap.set(imageOne, {
          zIndex: 1
        });
        gsap.fromTo(imageTwo, {
          scale: 1.2,
          opacity: 0
        }, {
          scale: 1,
          opacity: 1,
          ease: opacityEase,
          duration: 0.66
        });
        gsap.to(imageOne, {
          opacity: 0,
          delay: 0.66
        });
      }
      if (optionsElements) {
        optionsElements.forEach((optionElement, i) => {
          gsap.killTweensOf(optionElement);
          gsap.fromTo(optionElement, {
            y: 20,
            opacity: 0
          }, {
            y: 0,
            opacity: 1,
            ease: chipEaseIn,
            duration: 0.66,
            delay: Number(i) * 0.1
          });
        });
      }
    }
    function leaveItemAnimation(imageOne, imageTwo, optionsElements) {
      if (showSecondaryImageOnHover && imageTwo) {
        gsap.killTweensOf(imageTwo);
        gsap.killTweensOf(imageOne);
        gsap.set(imageOne, {
          zIndex: 2,
          opacity: 1
        });
        gsap.set(imageTwo, {
          zIndex: 1,
          opacity: 0
        });
      }
      if (optionsElements) {
        optionsElements.forEach(optionElement => {
          gsap.killTweensOf(optionElement);
          gsap.fromTo(optionElement, {
            y: 0,
            opacity: 1
          }, {
            opacity: 0,
            duration: 0.33,
            ease: chipEaseOut
          });
        });
      }
    }
  });
  return {
    destroy() {
      events.forEach(unsubscribe => unsubscribe());
    }
  };
});

const selectors$Y = {
  images: ".image",
  fadeUp: ".animation-fade-up-reveal",
  fadeUpSplit: ".animation-fade-up-split-reveal"
};
var AnimateImageWithText = (node => {
  let observer = null;
  const fadeUpSplitItems = t$3(selectors$Y.fadeUpSplit, node);
  const fadeUpItems = t$3(selectors$Y.fadeUp, node);
  const images = t$3(selectors$Y.images, node);
  const textReveals = [];
  const imageReveals = [];
  if (shouldAnimate(node)) {
    fadeUpSplitItems.forEach(item => {
      textReveals.push(new FadeUpSplitReveal(item));
    });
    fadeUpItems.forEach(item => {
      textReveals.push(new FadeUpReveal(item));
    });
    images.forEach(image => {
      imageReveals.push(new ImageReveal(image));
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let textDelay = window.theme.animation.delay;
    textReveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delay;
      } else {
        textDelay += window.theme.animation.delay;
      }
    });
    let imageDelay = window.theme.animation.delay;
    imageReveals.reverse().forEach((reveal, i) => {
      imageDelay = window.theme.animation.delayLong * i;
      reveal.play(imageDelay);
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$X = {
  image: ".image-with-features__image-container .image",
  title: ".image-with-features__heading",
  featuresItem: ".image-with-features__item",
  fadeUp: ".animation-fade-up-reveal",
  fadeUpSplit: ".animation-fade-up-split-reveal"
};
var AnimateImageWithFeatures = (node => {
  let observer = null;
  const sectionTitle = n$2(selectors$X.title, node);
  const featureItems = t$3(selectors$X.featuresItem, node);
  const image = n$2(selectors$X.image, node);
  const featureItemReveals = [];
  let imageReveal = null;
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    featureItemReveals.push(new FadeUpSplitReveal(sectionTitle));
    featureItems.forEach(item => {
      featureItemReveals.push(new FadeUpSplitReveal(n$2(selectors$X.fadeUpSplit, item)));
      t$3(selectors$X.fadeUp, item).forEach(fadeItem => {
        featureItemReveals.push(new FadeUpReveal(fadeItem));
      });
    });
    if (image) {
      imageReveal = new ImageReveal(image);
    }
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let featureItemDelay = window.theme.animation.delay;
    featureItemReveals.forEach(featureItem => {
      featureItem.play(featureItemDelay);
      if (featureItem.type === "FadeUpSplitReveal") {
        featureItemDelay += featureItem.lineCount * window.theme.animation.delay;
      } else {
        featureItemDelay += window.theme.animation.delay;
      }
    });
    if (imageReveal) {
      imageReveal.play(window.theme.animation.delay);
    }
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$W = {
  group: ".text-columns-with-images__item",
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal"
};
var AnimateTextColumnsWithImages = (node => {
  let observer = null;
  // Each group has a staggered animation delay so we get each groups container
  const revealGroup = t$3(selectors$W.group, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    // Loop through each reveal group and initialize the reveals for each item in the group
    revealGroup.forEach(item => {
      const groupReveals = [];
      t$3(selectors$W.revealItem, item).forEach(revealItem => {
        // check which type of reveal needs to be initialized
        if (a$1(revealItem, "animation-fade-up-split-reveal")) {
          groupReveals.push(new FadeUpSplitReveal(revealItem));
        } else if (a$1(revealItem, "animation-fade-up-reveal")) {
          groupReveals.push(new FadeUpReveal(revealItem));
        }
      });
      reveals.push(groupReveals);
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let revealGroupDelay = 0;
    reveals.forEach((revealGroup, i) => {
      revealGroupDelay = window.theme.animation.delay * i;
      revealGroup.forEach(revealItem => {
        revealItem.play(revealGroupDelay);
        if (revealItem.type === "FadeUpSplitReveal") {
          revealGroupDelay += revealItem.lineCount * window.theme.animation.delay;
        } else {
          revealGroupDelay += window.theme.animation.delay;
        }
      });
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$V = {
  fadeUp: ".animation-fade-up-reveal"
};
var AnimateLogoList = (node => {
  let observer = null;
  const fadeUpItem = n$2(selectors$V.fadeUp, node);
  let reveal = null;
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    reveal = new FadeUpReveal(fadeUpItem);
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    reveal.play();
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$U = {
  slider: "[data-slider]",
  revealItems: ".animation-fade-up-split-reveal, .animation-fade-up-reveal",
  slideItems: ".featured-collection__slide"
};
var AnimateFeaturedCollection = (node => {
  let observer = null;
  const sliderElement = n$2(selectors$U.slider, node);
  const columns = parseInt(node.dataset.columns);
  const slideItems = t$3(selectors$U.slideItems, node);
  const headerRevealItems = t$3(selectors$U.revealItems, node);
  const headerReveals = [];
  const slideReveals = [];
  if (shouldAnimate(node)) {
    headerRevealItems.forEach(revealItem => {
      // check which type of reveal needs to be initialized
      if (a$1(revealItem, "animation-fade-up-split-reveal")) {
        headerReveals.push(new FadeUpSplitReveal(revealItem));
      } else if (a$1(revealItem, "animation-fade-up-reveal")) {
        headerReveals.push(new FadeUpReveal(revealItem));
      }
    });
    slideItems.forEach((item, i) => {
      if (i < columns) {
        const slideItemReveals = [];
        const image = n$2(".product-item__media .image", item);
        if (image) {
          slideItemReveals.push(new FadeScaleReveal(image));
        }
        t$3(".product-item__product-title, .product-item__price-wrapper, .product-item__badges", item).forEach(revealItem => {
          slideItemReveals.push(new FadeUpReveal(revealItem));
        });
        slideReveals.push(slideItemReveals);
      } else {
        const slideAnimItems = t$3(".product-item__media .image, .product-item__product-title, .product-item__price-wrapper, .product-item__badges", item);
        if (slideAnimItems) {
          u$1(slideAnimItems, "animation-initialized");
        }
      }
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  sliderElement.style.opacity = 1;
  function isVisible() {
    let delay = 0;
    headerReveals.forEach(reveal => {
      reveal.play(delay);
      if (reveal.type === "FadeUpSplitReveal") {
        delay += reveal.lineCount * window.theme.animation.delay;
      } else {
        delay += window.theme.animation.delay;
      }
    });
    slideReveals.forEach(slide => {
      let slideDelay = delay;
      slide.forEach(reveal => {
        reveal.play(slideDelay);
        slideDelay += window.theme.animation.delay;
      });
      delay += window.theme.animation.delay;
    });
    setTimeout(() => {
      u$1(node, "animation--complete");
    }, (headerReveals.length + slideReveals.length) * window.theme.animation.duration);
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$T = {
  group: ".section-header, .testimonials__item",
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal"
};
var AnimateTestimonials = (node => {
  let observer = null;
  // Each group has a staggered animation delay so we get each groups container
  const revealGroup = t$3(selectors$T.group, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    // Loop through each reveal group and initialize the reveals for each item in the group
    revealGroup.forEach(item => {
      const groupReveals = [];
      t$3(selectors$T.revealItem, item).forEach(revealItem => {
        // check which type of reveal needs to be initialized
        if (a$1(revealItem, "animation-fade-up-split-reveal")) {
          groupReveals.push(new FadeUpSplitReveal(revealItem));
        } else if (a$1(revealItem, "animation-fade-up-reveal")) {
          groupReveals.push(new FadeUpReveal(revealItem));
        }
      });
      reveals.push(groupReveals);
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    // increment a delay for each group of reveal animations
    let revealGroupDelay = 0;
    // loop through each group
    reveals.forEach((revealGroup, i) => {
      revealGroupDelay = window.theme.animation.delay * i;
      let previousType = null;
      // loop through each reveal item in the group
      revealGroup.forEach((revealItem, j) => {
        // This section is a little different.
        // This section has a quote icon in each group that needs to
        // animate at the same time as the first line of text in the title.
        // Here we only apply the item delay if the previous item isn't the icon
        if (revealItem.type !== "FadeUpSplitReveal" || revealItem.type !== "FadeUpSplitReveal" && previousType === "FadeUpSplitReveal") {
          revealGroupDelay += window.theme.animation.delay * j;
        }
        revealItem.play(revealGroupDelay);
        previousType = revealItem.type;
      });
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$S = {
  socialProofItems: ".social-proof__slide",
  headerRevealItem: ".section-header .animation-fade-up-split-reveal, .section-header .animation-fade-up-reveal"
};
var AnimateSocialProof = (node => {
  let observer = null;
  const socialProofItems = t$3(selectors$S.socialProofItems, node);
  const headerRevealItems = t$3(selectors$S.headerRevealItem, node);
  const headerReveals = [];
  const slideReveals = [];
  if (shouldAnimate(node)) {
    headerRevealItems.forEach(revealItem => {
      // check which type of reveal needs to be initialized
      if (a$1(revealItem, "animation-fade-up-split-reveal")) {
        headerReveals.push(new FadeUpSplitReveal(revealItem));
      } else if (a$1(revealItem, "animation-fade-up-reveal")) {
        headerReveals.push(new FadeUpReveal(revealItem));
      }
    });
    socialProofItems.forEach(item => {
      if (a$1(item, "is-visible")) {
        const slideItemReveals = [];
        const image = n$2(".image", item);
        if (image) {
          slideItemReveals.push(new FadeScaleReveal(image));
        }
        t$3(".social-proof__item-likes, .social-proof__content", item).forEach(revealItem => {
          slideItemReveals.push(new FadeUpReveal(revealItem));
        });
        slideReveals.push(slideItemReveals);
      }
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let delay = 0;
    headerReveals.forEach(reveal => {
      reveal.play(delay);
      if (reveal.type === "FadeUpSplitReveal") {
        delay += reveal.lineCount * window.theme.animation.delay;
      } else {
        delay += window.theme.animation.delay;
      }
    });
    slideReveals.forEach(slide => {
      let slideDelay = delay;
      slide.forEach(reveal => {
        reveal.play(slideDelay);
        slideDelay += window.theme.animation.delay;
      });
      delay += window.theme.animation.delay;
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$R = {
  details: ".featured-product__details .animation-fade-up-reveal",
  featuredImage: ".featured-product__media-container .product__media-item:not(.hidden) .image",
  remainingImages: ".featured-product__media-container .product__media-item.hidden .image"
};
var AnimateFeaturedProduct = (node => {
  let observer = null;
  const revealsRight = [];
  let imageReveal = null;
  const details = t$3(selectors$R.details, node);
  const featuredImage = n$2(selectors$R.featuredImage, node);
  const remainingImages = t$3(selectors$R.remainingImages, node);
  if (shouldAnimate(node)) {
    details.forEach(item => {
      revealsRight.push(new FadeUpReveal(item));
    });
    if (featuredImage) {
      imageReveal = new ImageReveal(featuredImage);
    }
    if (remainingImages.length) {
      u$1(remainingImages, "animation-initialized");
    }
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    revealsRight.forEach((reveal, i) => {
      reveal.play(window.theme.animation.delayExtraShort * i);
    });
    if (imageReveal) {
      imageReveal.play(window.theme.animation.delayExtraShort);
    }
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$Q = {
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal"
};
var AnimateQuestions = (node => {
  let observer = null;
  const revealItems = t$3(selectors$Q.revealItem, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    revealItems.forEach(revealItem => {
      // check which type of reveal needs to be initialized
      if (a$1(revealItem, "animation-fade-up-split-reveal")) {
        reveals.push(new FadeUpSplitReveal(revealItem));
      } else if (a$1(revealItem, "animation-fade-up-reveal")) {
        reveals.push(new FadeUpReveal(revealItem));
      }
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let textDelay = 0;
    reveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delay;
      } else {
        textDelay += window.theme.animation.delay;
      }
    });
  }
  function open(inner) {
    if (inner) {
      const contentScale = new FadeScaleReveal(inner, {
        scaleStart: 0.8
      });
      contentScale.play();
    }
  }
  function close(inner) {
    if (inner) {
      const contentScale = new FadeScaleReveal(inner, {
        scaleStart: 0.8
      });
      contentScale.reverse();
    }
  }
  return {
    open,
    close,
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$P = {
  group: ".section-header, .blog-posts__item",
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal, .image .image__reveal-container"
};
var AnimateBlogPosts = (node => {
  let observer = null;
  // Each group has a staggered animation delay so we get each groups container
  const revealGroup = t$3(selectors$P.group, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    // Loop through each reveal group and initialize the reveals for each item in the group
    revealGroup.forEach(item => {
      const groupReveals = [];
      t$3(selectors$P.revealItem, item).forEach(revealItem => {
        // check which type of reveal needs to be initialized
        if (a$1(revealItem, "animation-fade-up-split-reveal")) {
          groupReveals.push(new FadeUpSplitReveal(revealItem));
        } else if (a$1(revealItem, "animation-fade-up-reveal")) {
          groupReveals.push(new FadeUpReveal(revealItem));
        } else if (a$1(revealItem, "image__reveal-container")) {
          groupReveals.push(new FadeScaleReveal(revealItem));
        }
      });
      reveals.push(groupReveals);
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    // increment a delay for each group of reveal animations
    let revealGroupDelay = window.theme.animation.delay;
    // loop through each group
    reveals.forEach((revealGroup, i) => {
      revealGroupDelay = window.theme.animation.delay * i;

      // loop through each reveal item in the group
      revealGroup.forEach(revealItem => {
        revealItem.play(revealGroupDelay);
        if (revealItem.type === "FadeUpSplitReveal") {
          revealGroupDelay += revealItem.lineCount * window.theme.animation.delay;
        } else {
          revealGroupDelay += window.theme.animation.delay;
        }
      });
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$O = {
  slider: "[data-slider]",
  desktopRevealItem: ".featured-collection-row__slider .animation-fade-up-split-reveal, .featured-collection-row__slider .animation-fade-up-reveal",
  mobileRevealItem: ".featured-collection-row__header .animation-fade-up-split-reveal, .featured-collection-row__header .animation-fade-up-reveal",
  slideItems: ".featured-collection-row__slide"
};
var AnimateFeaturedCollectionRow = (node => {
  let observer = null;
  const sliderElement = n$2(selectors$O.slider, node);
  const columns = parseInt(node.dataset.columns);
  const slideItems = t$3(selectors$O.slideItems, node);
  let revealItems = [];
  if (window.matchMedia(getMediaQuery("not-small")).matches) {
    revealItems = t$3(selectors$O.desktopRevealItem, node);
  } else {
    revealItems = t$3(selectors$O.mobileRevealItem, node);
  }
  const headerReveals = [];
  const slideReveals = [];
  if (shouldAnimate(node)) {
    revealItems.forEach(revealItem => {
      // check which type of reveal needs to be initialized
      if (a$1(revealItem, "animation-fade-up-split-reveal")) {
        headerReveals.push(new FadeUpSplitReveal(revealItem));
      } else if (a$1(revealItem, "animation-fade-up-reveal")) {
        headerReveals.push(new FadeUpReveal(revealItem));
      }
    });
    slideItems.forEach((item, i) => {
      if (i < columns) {
        const slideItemReveals = [];
        const image = n$2(".product-item__media .image", item);
        if (image) {
          slideItemReveals.push(new FadeScaleReveal(image));
        }
        t$3(".product-item__product-title, .product-item__price-wrapper, .product-item__badges", item).forEach(revealItem => {
          slideItemReveals.push(new FadeUpReveal(revealItem));
        });
        slideReveals.push(slideItemReveals);
      } else {
        const slideAnimItems = t$3(".product-item__media .image, .product-item__product-title, .product-item__price-wrapper, .product-item__badges", item);
        if (slideAnimItems) {
          u$1(slideAnimItems, "animation-initialized");
        }
      }
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  sliderElement.style.opacity = 1;
  function isVisible() {
    let delay = 0;
    headerReveals.forEach(reveal => {
      reveal.play(delay);
      if (reveal.type === "FadeUpSplitReveal") {
        delay += reveal.lineCount * window.theme.animation.delay;
      } else {
        delay += window.theme.animation.delay;
      }
    });
    slideReveals.forEach(slide => {
      let slideDelay = delay;
      slide.forEach(reveal => {
        reveal.play(slideDelay);
        slideDelay += window.theme.animation.delay;
      });
      delay += window.theme.animation.delay;
    });
    setTimeout(() => {
      u$1(node, "animation--complete");
    }, (headerReveals.length + slideReveals.length) * window.theme.animation.duration);
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$N = {
  group: ".section-header, .collection-item",
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal, .image .image__reveal-container"
};
var AnimateCollectionList = (node => {
  let observer = null;

  // Each group has a staggered animation delay so we get each groups container
  const revealGroup = t$3(selectors$N.group, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    // Loop through each reveal group and initialize the reveals for each item in the group
    revealGroup.forEach(item => {
      const groupReveals = [];
      t$3(selectors$N.revealItem, item).forEach(revealItem => {
        // check which type of reveal needs to be initialized
        if (a$1(revealItem, "animation-fade-up-split-reveal")) {
          groupReveals.push(new FadeUpSplitReveal(revealItem));
        } else if (a$1(revealItem, "animation-fade-up-reveal")) {
          groupReveals.push(new FadeUpReveal(revealItem));
        } else if (a$1(revealItem, "image__reveal-container")) {
          groupReveals.push(new FadeScaleReveal(revealItem));
        }
      });
      reveals.push(groupReveals);
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    // increment a delay for each group of reveal animations
    let revealGroupDelay = 0;
    // loop through each group
    reveals.forEach((revealGroup, i) => {
      revealGroupDelay = window.theme.animation.delay * i;

      // loop through each reveal item in the group
      revealGroup.forEach(revealItem => {
        revealItem.play(revealGroupDelay);
        if (revealItem.type === "FadeUpSplitReveal") {
          revealGroupDelay += revealItem.lineCount * window.theme.animation.delay;
        } else {
          revealGroupDelay += window.theme.animation.delay;
        }
      });
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$M = {
  images: ".shoppable-feature__image, .shoppable-image__image",
  fadeUp: ".animation-fade-up-reveal",
  fadeUpSplit: ".animation-fade-up-split-reveal"
};
const classes$g = {
  revealed: "revealed"
};
var AnimateShoppable = (node => {
  let observer = null;
  const fadeUpSplitItems = t$3(selectors$M.fadeUpSplit, node);
  const fadeUpItems = t$3(selectors$M.fadeUp, node);
  const images = t$3(selectors$M.images, node);
  const textReveals = [];
  const imageReveals = [];
  if (shouldAnimate(node)) {
    fadeUpSplitItems.forEach(item => {
      textReveals.push(new FadeUpSplitReveal(item));
    });
    fadeUpItems.forEach(item => {
      textReveals.push(new FadeUpReveal(item));
    });
    images.forEach(image => {
      imageReveals.push(new ImageReveal(image));
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let totalDelay = 0;
    let textDelay = 0;
    textReveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delay;
      } else {
        textDelay += window.theme.animation.delay;
      }
      totalDelay += textDelay;
    });
    let imageDelay = 0;
    imageReveals.reverse().forEach((reveal, i) => {
      imageDelay = window.theme.animation.delayLong * i;
      reveal.play(imageDelay);
      totalDelay += imageDelay;
    });
    setTimeout(() => {
      u$1(node, classes$g.revealed);
    }, totalDelay * 1000);
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$L = {
  map: ".map__element",
  imageReveal: ".image",
  fadeUp: ".animation-fade-up-reveal",
  fadeUpSplit: ".animation-fade-up-split-reveal"
};
var AnimateMap = (node => {
  let observer = null;
  const fadeUpSplitItems = t$3(selectors$L.fadeUpSplit, node);
  const fadeUpItems = t$3(selectors$L.fadeUp, node);
  const mapItem = n$2(selectors$L.map, node);
  const imageItem = n$2(selectors$L.imageReveal, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    fadeUpSplitItems.forEach(item => {
      reveals.push(new FadeUpSplitReveal(item));
    });
    fadeUpItems.forEach(item => {
      reveals.push(new FadeUpReveal(item));
    });
    if (mapItem) {
      reveals.push(new FadeUpReveal(mapItem, {
        yStart: 0
      }));
    } else if (imageItem) {
      reveals.push(new ImageReveal(imageItem));
    }
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let textDelay = 0;
    reveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delay;
      } else {
        textDelay += window.theme.animation.delay;
      }
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$K = {
  slider: "[data-slider]",
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal",
  slideItems: "[data-slide]"
};
var AnimateRecommendedProducts = (node => {
  let observer = null;
  const sliderElement = n$2(selectors$K.slider, node);
  const columns = parseInt(node.dataset.columns);
  const slideItems = t$3(selectors$K.slideItems, node);
  const headerRevealItems = t$3(selectors$K.revealItem, node);
  const headerReveals = [];
  const slideReveals = [];
  if (shouldAnimate(node)) {
    headerRevealItems.forEach(revealItem => {
      // check which type of reveal needs to be initialized
      if (a$1(revealItem, "animation-fade-up-split-reveal")) {
        headerReveals.push(new FadeUpSplitReveal(revealItem));
      } else if (a$1(revealItem, "animation-fade-up-reveal")) {
        headerReveals.push(new FadeUpReveal(revealItem));
      }
    });
    slideItems.forEach((item, i) => {
      if (i < columns) {
        const slideItemReveals = [];
        const image = n$2(".product-item__media .image, .product-item__media .placeholder-image", item);
        if (image) {
          slideItemReveals.push(new FadeScaleReveal(image));
        }
        t$3(".product-item__product-title, .product-item__price-wrapper, .product-item__badges", item).forEach(revealItem => {
          slideItemReveals.push(new FadeUpReveal(revealItem));
        });
        slideReveals.push(slideItemReveals);
      } else {
        const slideAnimItems = t$3(".product-item__media .image, .product-item__product-title, .product-item__price-wrapper, .product-item__badges", item);
        if (slideAnimItems) {
          u$1(slideAnimItems, "animation-initialized");
        }
      }
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  sliderElement.style.opacity = 1;
  function isVisible() {
    let delay = 0;
    headerReveals.forEach(reveal => {
      reveal.play(delay);
      if (reveal.type === "FadeUpSplitReveal") {
        delay += reveal.lineCount * window.theme.animation.delay;
      } else {
        delay += window.theme.animation.delay;
      }
    });
    slideReveals.forEach(slide => {
      let slideDelay = delay;
      slide.forEach(reveal => {
        reveal.play(slideDelay);
        slideDelay += window.theme.animation.delay;
      });
      delay += window.theme.animation.delay;
    });
    setTimeout(() => {
      u$1(node, "animation--complete");
    }, (headerReveals.length + slideReveals.length) * window.theme.animation.duration);
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$J = {
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal"
};
var AnimateMosaicGrid = (node => {
  let observer = null;
  const revealItems = t$3(selectors$J.revealItem, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    revealItems.forEach(revealItem => {
      // check which type of reveal needs to be initialized
      if (a$1(revealItem, "animation-fade-up-split-reveal")) {
        reveals.push(new FadeUpSplitReveal(revealItem));
      } else if (a$1(revealItem, "animation-fade-up-reveal")) {
        if (a$1(revealItem, "mosaic-grid__item")) {
          reveals.push(new FadeUpReveal(revealItem, {
            yStart: 0
          }));
        } else {
          reveals.push(new FadeUpReveal(revealItem));
        }
      }
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let textDelay = 0;
    reveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delay;
      } else {
        textDelay += window.theme.animation.delay;
      }
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$I = {
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal"
};
var AnimateCollectionBanner = (node => {
  let observer = null;
  const revealItems = t$3(selectors$I.revealItem, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    revealItems.forEach(revealItem => {
      // check which type of reveal needs to be initialized
      if (a$1(revealItem, "animation-fade-up-split-reveal")) {
        reveals.push(new FadeUpSplitReveal(revealItem));
      } else if (a$1(revealItem, "animation-fade-up-reveal")) {
        reveals.push(new FadeUpReveal(revealItem));
      }
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let textDelay = 0;
    reveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delay;
      } else {
        textDelay += window.theme.animation.delay;
      }
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$H = {
  details: ".product__details .animation-fade-up-reveal",
  images: ".product__media-container .product__media-item .image",
  featuredImage: ".product__media-container .product__media-item:not(.hidden) .image",
  remainingImages: ".product__media-container .product__media-item.hidden .image",
  detailsLeft: ".product__media-container .animation-fade-up-reveal"
};
const classes$f = {
  isListStyle: "product--gallery-style-list",
  isThumbnailStyle: "product--gallery-style-thumbnails",
  isGridStyle: "product--gallery-style-grid"
};
var AnimateProduct = (node => {
  const revealsRight = [];
  const revealsLeft = [];
  const details = t$3(selectors$H.details, node);
  const images = t$3(selectors$H.images, node);
  const featuredImage = n$2(selectors$H.featuredImage, node);
  const remainingImages = t$3(selectors$H.remainingImages, node);
  const detailsLeft = t$3(selectors$H.detailsLeft, node);
  if (shouldAnimate(node)) {
    details.forEach(item => {
      revealsRight.push(new FadeUpReveal(item));
    });
    if (a$1(node, classes$f.isListStyle)) {
      images.forEach(image => {
        revealsLeft.push(new ImageReveal(image));
      });
    } else if (a$1(node, classes$f.isGridStyle)) {
      // Grid layout doesn't look great with any animations
      u$1(images, "animation-initialized");
    } else if (a$1(node, classes$f.isThumbnailStyle)) {
      if (featuredImage) {
        revealsLeft.push(new ImageReveal(featuredImage));
      }
      if (remainingImages) {
        u$1(remainingImages, "animation-initialized");
      }
    }
    detailsLeft.forEach(item => {
      revealsLeft.push(new FadeUpReveal(item));
    });
    revealsRight.forEach((reveal, i) => {
      reveal.play(window.theme.animation.delayExtraShort * i);
    });
    revealsLeft.forEach((reveal, i) => {
      reveal.play(window.theme.animation.delayExtraShort * i + window.theme.animation.delayExtraShort);
    });
    setTimeout(() => {
      u$1(node, "animation--complete");
    }, (revealsRight.length + revealsLeft.length) * window.theme.animation.duration);
  }
});

const selectors$G = {
  fadeUp: ".animation-fade-up-reveal"
};
var AnimateArticle = (node => {
  let observer = null;
  const fadeUpItems = t$3(selectors$G.fadeUp, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    fadeUpItems.forEach(item => {
      reveals.push(new FadeUpReveal(item, {
        yStart: "40px"
      }));
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let delay = 0;
    reveals.forEach(reveal => {
      reveal.play(delay);
      delay += window.theme.animation.delay;
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$F = {
  fadeUp: ".animation-fade-up-reveal"
};
var AnimateBlog = (node => {
  let observer = null;
  const fadeUpItems = t$3(selectors$F.fadeUp, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    fadeUpItems.forEach(item => {
      reveals.push(new FadeUpReveal(item));
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let delay = 0;
    reveals.forEach(reveal => {
      reveal.play(delay);
      delay += window.theme.animation.delay;
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$E = {
  fadeUp: ".animation-fade-up-reveal:not(.animation-initialized)"
};
var AnimateSearch = (node => {
  let observer = null;
  let fadeUpItems = null;
  let reveals = [];
  _initializeItems(_initObserver);
  function _initializeItems(cb) {
    if (shouldAnimate(node)) {
      fadeUpItems = t$3(selectors$E.fadeUp, node);
      reveals = [];
      // Initialize animations and intersection observer
      fadeUpItems.forEach(item => {
        reveals.push(new FadeUpReveal(item, {
          yStart: "40px"
        }));
      });
      if (typeof cb === "function") {
        cb();
      }
    }
  }
  function _initObserver() {
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let delay = 0;
    reveals.forEach(reveal => {
      reveal.play(delay);
      delay += window.theme.animation.delay;
    });
  }
  function updateItems() {
    _initializeItems(isVisible);
  }
  return {
    updateItems,
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$D = {
  fadeUp: ".animation-fade-up-reveal:not(.animation-initialized)"
};
var AnimateCollection = (node => {
  let observer = null;
  let fadeUpItems = null;
  let reveals = [];
  _initializeItems(_initObserver);
  function _initializeItems(cb, resetItems) {
    if (shouldAnimate(node)) {
      fadeUpItems = t$3(selectors$D.fadeUp, node);

      // When a filter has been applied to the collection
      // items need to be fully reset.
      if (resetItems) {
        reveals = [];
      }

      // Initialize animations and intersection observer
      fadeUpItems.forEach(item => {
        reveals.push(new FadeUpReveal(item, {
          yStart: "40px"
        }));
      });
      if (typeof cb === "function") {
        cb();
      }
    }
  }
  function _initObserver() {
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let delay = 0;
    reveals.forEach(reveal => {
      reveal.play(delay);
      delay += window.theme.animation.delay;
    });
    setTimeout(() => {
      u$1(node, "animation--complete");
    }, reveals.length * window.theme.animation.duration);
  }
  function updateItems(resetItems = true) {
    _initializeItems(isVisible, resetItems);
  }
  return {
    updateItems,
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$C = {
  fadeUp: ".animation-fade-up-reveal",
  fadeUpSplit: ".animation-fade-up-split-reveal",
  fadeScale: ".animation-scale-reveal"
};
var AnimateVideoHero = (node => {
  let observer = null;
  const fadeScale = n$2(selectors$C.fadeScale, node);
  const fadeUpSplitItem = n$2(selectors$C.fadeUpSplit, node);
  const fadeUpItems = t$3(selectors$C.fadeUp, node);
  const textReveals = [];
  let videoReveal = null;
  if (shouldAnimate(node)) {
    videoReveal = new FadeScaleReveal(fadeScale, {
      scaleStart: 1.25
    });
    if (fadeUpSplitItem) {
      textReveals.push(new FadeUpSplitReveal(fadeUpSplitItem));
    }
    fadeUpItems.forEach(item => {
      textReveals.push(new FadeUpReveal(item));
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    videoReveal.play(0);
    let textDelay = window.theme.animation.delay;
    textReveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delayExtraShort;
      } else {
        textDelay += window.theme.animation.delay;
      }
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$B = {
  group: ".inline-features__item",
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal"
};
var AnimateInlineFeatures = (node => {
  let observer = null;
  // Each group has a staggered animation delay so we get each groups container
  const revealGroup = t$3(selectors$B.group, node);
  const reveals = [];
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    // Loop through each reveal group and initialize the reveals for each item in the group
    revealGroup.forEach(item => {
      const groupReveals = [];
      t$3(selectors$B.revealItem, item).forEach(revealItem => {
        // check which type of reveal needs to be initialized
        if (a$1(revealItem, "animation-fade-up-split-reveal")) {
          groupReveals.push(new FadeUpSplitReveal(revealItem));
        } else if (a$1(revealItem, "animation-fade-up-reveal")) {
          groupReveals.push(new FadeUpReveal(revealItem));
        }
      });
      reveals.push(groupReveals);
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let revealGroupDelay = 0;
    reveals.forEach((revealGroup, i) => {
      revealGroupDelay = window.theme.animation.delay * i;
      revealGroup.forEach(revealItem => {
        revealItem.play(revealGroupDelay);
        revealGroupDelay += window.theme.animation.delayExtraShort;
      });
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$A = {
  fadeUp: ".animation-fade-up-reveal",
  fadeUpSplit: ".animation-fade-up-split-reveal"
};
var AnimateNewsletter = (node => {
  let observer = null;
  const fadeUpSplitItems = t$3(selectors$A.fadeUpSplit, node);
  const fadeUpItems = t$3(selectors$A.fadeUp, node);
  const textReveals = [];
  if (shouldAnimate(node)) {
    fadeUpSplitItems.forEach(item => {
      textReveals.push(new FadeUpSplitReveal(item));
    });
    fadeUpItems.forEach(item => {
      textReveals.push(new FadeUpReveal(item));
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let textDelay = 0;
    textReveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delay;
      } else {
        textDelay += window.theme.animation.delay;
      }
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$z = {
  fadeUp: ".animation-fade-up-reveal",
  fadeUpSplit: ".animation-fade-up-split-reveal"
};
var AnimateVideo = (node => {
  let observer = null;
  const fadeUpSplitItems = t$3(selectors$z.fadeUpSplit, node);
  const fadeUpItems = t$3(selectors$z.fadeUp, node);
  const textReveals = [];
  if (shouldAnimate(node)) {
    fadeUpSplitItems.forEach(item => {
      textReveals.push(new FadeUpSplitReveal(item));
    });
    fadeUpItems.forEach(item => {
      textReveals.push(new FadeUpReveal(item));
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let textDelay = 0;
    textReveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delay;
      } else {
        textDelay += window.theme.animation.delay;
      }
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$y = {
  fadeUp: ".animation-fade-up-reveal",
  fadeUpSplit: ".animation-fade-up-split-reveal"
};
var AnimateRichText = (node => {
  let observer = null;
  const fadeUpSplitItems = t$3(selectors$y.fadeUpSplit, node);
  const fadeUpItems = t$3(selectors$y.fadeUp, node);
  const textReveals = [];
  if (shouldAnimate(node)) {
    fadeUpSplitItems.forEach(item => {
      textReveals.push(new FadeUpSplitReveal(item));
    });
    fadeUpItems.forEach(item => {
      textReveals.push(new FadeUpReveal(item));
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let textDelay = 0;
    textReveals.forEach(reveal => {
      reveal.play(textDelay);
      if (reveal.type === "FadeUpSplitReveal") {
        textDelay += reveal.lineCount * window.theme.animation.delay;
      } else {
        textDelay += window.theme.animation.delay;
      }
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$x = {
  fadeUp: ".animation-fade-up-reveal"
};
var AnimateCountdownBanner = (node => {
  let observer = null;
  const fadeUpItems = t$3(selectors$x.fadeUp, node);
  const textReveals = [];
  if (shouldAnimate(node)) {
    fadeUpItems.forEach(item => {
      textReveals.push(new FadeUpReveal(item));
    });
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    let textDelay = window.theme.animation.delay;
    textReveals.forEach(reveal => {
      reveal.play(textDelay);
      textDelay += window.theme.animation.delay;
    });
  }
  return {
    destroy() {
      observer?.destroy();
    }
  };
});

const selectors$w = {
  headerItems: ".section-header",
  eventItems: ".event-item",
  revealItem: ".animation-fade-up-split-reveal, .animation-fade-up-reveal, .image .image__reveal-container"
};
var AnimateEvents = (node => {
  let sectionIsVisible = false;
  let observer = null;
  // Each group has a staggered animation delay so we get each groups container
  const headerItems = n$2(selectors$w.headerItems, node);
  const headerReveals = [];
  let eventItemsReveals = [];
  if (shouldAnimate(node)) {
    // Initialize animations and intersection observer
    // Loop through each reveal group and initialize the reveals for each item in the header
    t$3(selectors$w.revealItem, headerItems).forEach(revealItem => {
      // check which type of reveal needs to be initialized
      if (a$1(revealItem, "animation-fade-up-split-reveal")) {
        headerReveals.push(new FadeUpSplitReveal(revealItem));
      } else if (a$1(revealItem, "animation-fade-up-reveal")) {
        headerReveals.push(new FadeUpReveal(revealItem));
      }
    });
    initEventItems();
    observer = intersectionWatcher(node, {
      cb: isVisible
    });
  }
  function isVisible() {
    sectionIsVisible = true;
    // increment a delay for each group of reveal animations
    let revealGroupDelay = window.theme.animation.delay;
    // loop through each header reveal item in the group
    headerReveals.forEach(revealItem => {
      revealItem.play(revealGroupDelay);
      if (revealItem.type === "FadeUpSplitReveal") {
        revealGroupDelay += revealItem.lineCount * window.theme.animation.delay;
      } else {
        revealGroupDelay += window.theme.animation.delay;
      }
    });
    animateEventItems();
  }
  function initEventItems() {
    eventItemsReveals = [];
    if (shouldAnimate(node)) {
      const eventItems = t$3(selectors$w.eventItems, node);
      eventItems.forEach(item => {
        if (a$1(item, "event-item--skeleton")) {
          // animate skeletons differently than regular items
          eventItemsReveals.push([new FadeUpReveal(item)]);
        } else {
          const groupReveals = [];
          t$3(selectors$w.revealItem, item).forEach(revealItem => {
            // check which type of reveal needs to be initialized
            if (a$1(revealItem, "animation-fade-up-split-reveal")) {
              groupReveals.push(new FadeUpSplitReveal(revealItem));
            } else if (a$1(revealItem, "animation-fade-up-reveal")) {
              groupReveals.push(new FadeUpReveal(revealItem));
            } else if (a$1(revealItem, "image__reveal-container")) {
              groupReveals.push(new FadeScaleReveal(revealItem));
            }
          });
          eventItemsReveals.push(groupReveals);
        }
      });
      if (sectionIsVisible) {
        animateEventItems();
      }
    }
  }
  function animateEventItems() {
    // increment a delay for each item of reveal animations
    let eventItemDelay = window.theme.animation.delay;
    // loop through each group
    eventItemsReveals.forEach((eventItem, i) => {
      eventItemDelay = window.theme.animation.delay * i;

      // loop through each reveal item in the group
      eventItem.forEach(revealItem => {
        revealItem.play(eventItemDelay);
        if (revealItem.type === "FadeUpSplitReveal") {
          eventItemDelay += revealItem.lineCount * window.theme.animation.delay;
        } else {
          eventItemDelay += window.theme.animation.delay;
        }
      });
    });
  }
  return {
    initEventItems,
    destroy() {
      observer?.destroy();
    }
  };
});

// eslint-disable-next-line valid-jsdoc
/**
 * A complex image reveal animation with mask and scale transition.
 * @param {Object} node the target element for the animation
 * @param {Object} options optional default overrides
 * @options {Number} duration override the default duration
 */
class ImageReveal {
  constructor(node, options = {}) {
    this.node = node;
    this.type = "ImageReveal";
    this.defaultOpts = {
      duration: window.theme.animation.duration
    };
    this.config = {
      ...this.defaultOpts,
      ...options
    };
    this.imageEndY = "0%";
    this.imageReveal = n$2(".image__reveal-container", this.node);
    this.img = n$2(".image__img", this.node);
    this.gsapImport = import(flu.chunks.gsap).then(({
      gsap,
      CustomEase
    }) => {
      gsap.registerPlugin(CustomEase);
      this.imageEase = gsap.parseEase(window.theme.animation.ease);
      gsap.set(this.imageReveal, {
        y: "100%"
      });
      gsap.set(this.img, {
        y: "-100%",
        scale: 1.75
      });
      u$1(this.node, "animation-initialized");
      return {
        gsap
      };
    });
  }
  play(delay) {
    this.gsapImport.then(({
      gsap
    }) => {
      gsap.to(this.imageReveal, {
        y: "0%",
        duration: this.config.duration,
        delay: delay,
        ease: this.imageEase
      });
      gsap.to(this.img, {
        y: 0,
        duration: this.config.duration,
        delay: delay,
        ease: this.imageEase
      });
      gsap.to(this.img, {
        scale: 1,
        duration: this.config.duration + this.config.duration / 2,
        delay: delay,
        ease: this.imageEase
      });
    });
  }
}

// eslint-disable-next-line valid-jsdoc
/**
 * A slide up and fade in reveal animation.
 * Can work on any type of element. Commonly used for subheadings, buttons, and images.
 * @param {Object} node the target element for the animation
 * @param {Object} options optional default overrides
 * @options {String} yStart the starting Y position
 * @options {Number} duration override the default duration
 */
class FadeUpReveal {
  constructor(node, options = {}) {
    this.node = node;
    this.defaultOpts = {
      yStart: "20px",
      duration: window.theme.animation.duration
    };
    this.config = {
      ...this.defaultOpts,
      ...options
    };
    this.type = "FadeUpReveal";
    this.gsapImport = import(flu.chunks.gsap).then(({
      gsap,
      CustomEase
    }) => {
      gsap.registerPlugin(CustomEase);
      this.itemEase = gsap.parseEase(window.theme.animation.ease);
      gsap.set(this.node, {
        y: this.config.yStart,
        opacity: 0
      });
      u$1(this.node, "animation-initialized");
      return {
        gsap
      };
    });
  }
  init() {
    this.gsapImport.then(({
      gsap
    }) => {
      gsap.set(this.node, {
        y: this.config.yStart,
        opacity: 0
      });
    });
  }
  play(delay = 0) {
    this.gsapImport.then(({
      gsap
    }) => {
      gsap.to(this.node, {
        y: 0,
        opacity: 1,
        duration: this.config.duration,
        delay: delay,
        ease: this.itemEase,
        onComplete: function () {
          gsap.set(this.targets(), {
            clearProps: "opacity,y"
          });
        }
      });
    });
  }
}

// eslint-disable-next-line valid-jsdoc
/**
 * A scale down and fade in reveal animation.
 * Commonly used for images.
 * @param {Object} node the target element for the animation
 * @param {Object} options optional default overrides
 * @options {Number} scaleStart the starting scale value
 * @options {Number} duration override the default duration
 */
class FadeScaleReveal {
  constructor(node, options = {}) {
    this.node = node;
    this.defaultOpts = {
      scaleStart: 1.2,
      duration: window.theme.animation.duration
    };
    this.config = {
      ...this.defaultOpts,
      ...options
    };
    this.type = "FadeScaleReveal";
    this.gsapImport = import(flu.chunks.gsap).then(({
      gsap,
      CustomEase
    }) => {
      gsap.registerPlugin(CustomEase);
      this.itemEase = gsap.parseEase(window.theme.animation.ease);
      gsap.set(this.node, {
        scale: this.config.scaleStart,
        opacity: 0
      });
      u$1(node, "animation-initialized");
      return {
        gsap
      };
    });
  }
  init() {
    this.gsapImport.then(({
      gsap
    }) => {
      gsap.set(this.node, {
        scale: this.config.scaleStart,
        opacity: 0
      });
    });
  }
  play(delay = 0) {
    this.gsapImport.then(({
      gsap
    }) => {
      gsap.to(this.node, {
        scale: 1,
        opacity: 1,
        duration: this.config.duration,
        delay: delay,
        ease: this.itemEase
      });
    });
  }
  reverse(delay = 0) {
    this.gsapImport.then(({
      gsap
    }) => {
      gsap.set(this.node, {
        scale: 1,
        opacity: 1
      });
      gsap.to(this.node, {
        scale: this.config.scaleStart,
        opacity: 0,
        duration: this.config.duration,
        delay: delay,
        ease: this.itemEase
      });
    });
  }
}

// eslint-disable-next-line valid-jsdoc
/**
 * A fade in and slide up reveal with split text lines
 * @param {Object} node the target element for the animation
 * @param {Object} options optional default overrides
 * @options {Number} duration override the default duration
 * @options {Number} stagger override the default stagger duration
 */
class FadeUpSplitReveal {
  constructor(node, options = {}) {
    this.node = node;
    this.defaultOpts = {
      duration: window.theme.animation.duration,
      stagger: window.theme.animation.delay
    };
    this.config = {
      ...this.defaultOpts,
      ...options
    };
    this.type = "FadeUpSplitReveal";
    this.gsapImport = import(flu.chunks.gsap).then(({
      gsap,
      CustomEase,
      SplitText
    }) => {
      gsap.registerPlugin(CustomEase);
      gsap.registerPlugin(SplitText);
      this.itemEase = gsap.parseEase(window.theme.animation.ease);
      this.splitItems = new SplitText(this.node, {
        type: "lines",
        linesClass: "animation-fade-up-split-reveal__line",
        lineThreshold: 0.5
      });
      this.lineCount = this.splitItems.lines.length;
      gsap.set(this.splitItems.lines, {
        y: "20px",
        opacity: 0
      });
      u$1(this.node, "animation-initialized");
      return {
        gsap
      };
    });
  }
  play(delay = 0) {
    this.gsapImport.then(({
      gsap
    }) => {
      gsap.to(this.splitItems.lines, {
        y: 0,
        opacity: 1,
        duration: this.config.duration,
        delay: delay,
        stagger: this.config.stagger,
        ease: this.itemEase,
        onComplete: () => {
          this.splitItems.revert();
        }
      });
    });
  }
}

const selectors$v = {
  item: '.product-item',
  itemInner: '.product-item__inner',
  quickShopButton: '.product-item__quick-add-button',
  quickShopHeightTest: '.product-item__quick-add-button-text-height'
};
function ProductItem(container) {
  const items = t$3(selectors$v.item, container);
  if (!items.length) return;

  // Add z-index for quick-buy overlap
  items.forEach((item, i) => item.style.setProperty('--z-index-item', items.length - i));
  const productItemAnimations = AnimateProductItem(items);
  let resizeTimeout;

  // Update item height on window resize
  window.onresize = function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 100);
  };
  checkQuickBuyTextHeight();
  function handleResize() {
    checkQuickBuyTextHeight();
  }
  function checkQuickBuyTextHeight() {
    items.forEach(item => {
      const quickShopButtonText = n$2(`${selectors$v.quickShopButton} span`, item);
      if (!quickShopButtonText) return;
      const testHeight = n$2(selectors$v.quickShopHeightTest, quickShopButtonText.parentNode).offsetHeight;
      const textHeight = quickShopButtonText.offsetHeight;
      if (textHeight > testHeight) {
        u$1(quickShopButtonText.parentNode.parentNode, 'show-icon');
      } else {
        i$1(quickShopButtonText.parentNode.parentNode, 'show-icon');
      }
    });
  }
  const unload = () => {
    productItemAnimations.destroy();
  };
  return {
    unload
  };
}

const selectors$u = {
  slider: "[data-slider]",
  wrappingContainer: ".complementary-products",
  complementaryProducts: "[data-complementary-products]",
  complementaryProductsContent: "[data-complementary-products-content]"
};
const classes$e = {
  hasSlider: "complementary-products__content--has-slider",
  hidden: "hidden"
};
const complementaryProducts = node => {
  const complementaryProducts = t$3(selectors$u.complementaryProducts, node);
  if (!complementaryProducts.length) return;
  let productItems = [];
  let carousels = [];
  const {
    recommendationsType,
    productId: id,
    sectionId,
    layout,
    maxRecommendations
  } = complementaryProducts[0].dataset;
  if (recommendationsType === "app-recommendations") {
    handleRecommendedProducts();
  } else {
    // Merchant is using custom product list
    complementaryProducts.forEach(block => {
      productItems.push(ProductItem(block));
    });
    initSlider();
  }
  function handleRecommendedProducts() {
    const requestUrl = `${window.theme.routes.productRecommendations}?section_id=${sectionId}&limit=${maxRecommendations}&product_id=${id}&intent=complementary`;
    fetch(requestUrl).then(response => response.text()).then(text => {
      const html = document.createElement("div");
      html.innerHTML = text;
      const recommendations = n$2(selectors$u.complementaryProductsContent, html);
      if (recommendations && recommendations.innerHTML.trim().length) {
        complementaryProducts.forEach(block => block.innerHTML = recommendations.innerHTML);
        complementaryProducts.forEach(block => {
          productItems.push(ProductItem(block));
        });

        // Remove hidden flag as content has been fetched
        complementaryProducts.forEach(block => {
          i$1(block.closest(selectors$u.wrappingContainer), classes$e.hidden);
        });
        initSlider();
      }
    }).catch(error => {
      throw error;
    });
  }
  function initSlider() {
    if (layout !== "slider") return;
    complementaryProducts.forEach(block => {
      const sliderElement = n$2(selectors$u.slider, block);
      if (a$1(sliderElement, classes$e.hasSlider)) {
        carousels.push(Carousel(block, "complementary-products", {
          wrapAround: false
        }));
        u$1(block, "slider-enabled");
      }
    });
  }
  function unload() {
    productItems.forEach(item => item.unload());
    carousels.forEach(carousel => carousel.destroy());
  }
  return {
    unload
  };
};

const selectors$t = {
  siblingProducts: "[data-sibling-products]",
  siblingSwatch: "[data-sibling-swatch]",
  siblingLabelEl: "[data-sibling-label-value]"
};
function siblingProducts (container) {
  const siblingProducts = n$2(selectors$t.siblingProducts, container);
  if (!siblingProducts) return;
  const siblingSwatches = t$3(selectors$t.siblingSwatch, siblingProducts);
  const labelValueEl = n$2(selectors$t.siblingLabelEl, siblingProducts);
  const baseLabel = labelValueEl.innerText;
  const events = [];
  siblingSwatches.forEach(item => {
    events.push(e$3(item, "mouseout", () => handleOut()), e$3(item, "mouseover", e => handleOver(e)));
  });
  function handleOver(e) {
    const cutline = e.target.dataset.siblingCutline;
    labelValueEl.innerText = cutline;
  }
  function handleOut() {
    if (labelValueEl.innerText !== baseLabel) {
      labelValueEl.innerText = baseLabel;
    }
  }
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
}

function giftCardRecipient (container) {
  const recipientFormContainer = n$2(".product-form__gift-card-recipient", container);
  if (!recipientFormContainer) return;
  const sectionID = recipientFormContainer.dataset.sectionId;
  const selectors = {
    enableInput: `#gift-card-recipient-enable--${sectionID}`,
    recipientForm: ".gift-card-recipient-fields",
    emailLabelOptional: ".gift-card-recipient-email-label .optional",
    emailLabelRequired: ".gift-card-recipient-email-label .required",
    emailInput: `#gift-card-recipient-email--${sectionID}`,
    nameInput: `#gift-card-recipient-name--${sectionID}`,
    messageInput: `#gift-card-recipient-message--${sectionID}`,
    sendOnInput: `#gift-card-recipient-send_on--${sectionID}`,
    controlInput: `#gift-card-recipient-control--${sectionID}`,
    offsetInput: `#gift-card-recipient-timezone-offset--${sectionID}`,
    errors: ".gift-card-recipient__form-errors"
  };
  const elements = {
    enableInput: n$2(selectors.enableInput, recipientFormContainer),
    emailLabelOptional: n$2(selectors.emailLabelOptional, recipientFormContainer),
    emailLabelRequired: n$2(selectors.emailLabelRequired, recipientFormContainer),
    emailInput: n$2(selectors.emailInput, recipientFormContainer),
    nameInput: n$2(selectors.nameInput, recipientFormContainer),
    messageInput: n$2(selectors.messageInput, recipientFormContainer),
    sendOnInput: n$2(selectors.sendOnInput, recipientFormContainer),
    controlInput: n$2(selectors.controlInput, recipientFormContainer),
    offsetInput: n$2(selectors.offsetInput, recipientFormContainer),
    recipientForm: n$2(selectors.recipientForm, recipientFormContainer),
    errors: n$2(selectors.errors, recipientFormContainer),
    errorList: n$2(`${selectors.errors} ul`, recipientFormContainer)
  };
  const getInputs = () => {
    return [elements.emailInput, elements.nameInput, elements.messageInput, elements.sendOnInput];
  };
  const disableableInputs = () => {
    return [...getInputs(), elements.offsetInput];
  };
  const disableInputs = (inputs, disable) => {
    inputs.forEach(input => {
      input.disabled = disable;
    });
  };
  const clearInputs = inputs => {
    inputs.forEach(input => {
      input.value = "";
    });
  };
  const handleChange = e => {
    const el = e.target;
    if (el.type === "checkbox") {
      if (el.checked) {
        elements.recipientForm.hidden = false;
      } else {
        clearInputs(getInputs());
        elements.recipientForm.hidden = true;
        elements.errors.hidden = true;
        elements.errorList.replaceChildren();
        getInputs().forEach(input => {
          i$1(input, "input-error");
        });
      }
      disableInputs(disableableInputs(), !el.checked);
    } else {
      i$1(el, "input-error");
    }
  };

  // Hide form by default
  elements.recipientForm.hidden = true;

  // Disable control input and enable the enable input
  elements.controlInput.disabled = true;
  elements.enableInput.disabled = false;

  // Disable form inputs by default
  disableInputs(disableableInputs(), true);

  // Remove "optional" from email label
  elements.emailLabelOptional.hidden = true;
  elements.emailLabelRequired.hidden = false;
  elements.offsetInput.value = new Date().getTimezoneOffset();

  // Set up listeners for the display inputs
  const events = [e$3(elements.enableInput, "change", handleChange)];

  // Clear errors
  getInputs().forEach(input => {
    events.push(e$3(input, "input", handleChange));
  });
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
}

const selectors$s = {
  form: "[data-product-form]",
  addToCart: "[data-add-to-cart]",
  variantSelect: "[data-variant-select]",
  optionById: id => `[value='${id}']`,
  quantityError: "[data-quantity-error]"
};
function QuickAddProductForm(node, openQuickCart) {
  let productForm;
  const formElement = n$2(selectors$s.form, node);
  const quantityError = n$2(selectors$s.quantityError, node);
  const {
    productHandle
  } = formElement.dataset;
  const product = getProduct(productHandle);
  product(data => {
    productForm = ProductForm(node, formElement, data, {
      onOptionChange: e => _onOptionChange(e),
      onFormSubmit: e => _onFormSubmit(e),
      onQuantityChange: e => _onQuantityChange(e)
    });
  }).then(() => {
    dispatchCustomEvent("quickview:loaded");
  });

  // Handle dynamic variant options
  const dynamicVariantAvailability = variantAvailability(node);
  const optionButtonsEls = OptionButtons(t$3("[data-option-buttons]", node));
  const quantityInputEls = quantityInput(node);

  // When the user changes a product option
  function _onOptionChange({
    dataset: {
      variant
    }
  }) {
    const buyButton = n$2(selectors$s.addToCart, node);

    // Update prices to reflect selected variant
    updatePrices(node, variant);

    // Update buy button
    updateBuyButton(buyButton, variant);

    // Update unit pricing
    updateUnitPrices(node, variant);

    // Update sku
    updateSku(node, variant);
    dispatchCustomEvent("product:variant-change", {
      variant: variant
    });
    if (!variant) {
      updateBuyButton(n$2("[data-add-to-cart]", node), false);
      return;
    }

    // We need to set the id input manually so the Dynamic Checkout Button works
    const selectedVariantOpt = n$2(`${selectors$s.variantSelect} ${selectors$s.optionById(variant.id)}`, node);
    selectedVariantOpt.selected = true;
  }
  function _onFormSubmit(e) {
    const {
      enableQuickCart
    } = document.body.dataset;

    // If a featured product section is on the cart page we will need to refresh
    // the cart to show a product has been added.
    const cartPage = document.body.classList.contains("template-cart");
    if (!enableQuickCart || cartPage) return;
    e.preventDefault();
    u$1(quantityError, "hidden");
    const button = n$2(selectors$s.addToCart, node);
    u$1(button, "loading");
    cart.addItem(formElement).then(({
      item
    }) => {
      i$1(button, "loading");
      u$1(button, "item-added");
      r$3("quick-add:close");
      if (openQuickCart) {
        r$3("cart:open", null, {
          flash: item.variant_id
        });
      }
      dispatchCustomEvent("cart:item-added", {
        product: item
      });
    }).catch(() => {
      i$1(quantityError, "hidden");
      const button = n$2(selectors$s.addToCart, node);
      i$1(button, "loading");
    });
  }
  function _onQuantityChange({
    dataset: {
      variant,
      quantity
    }
  }) {
    // Adjust the hidden quantity input within the form
    const quantityInputs = [...t$3('[name="quantity"]', formElement)];
    quantityInputs.forEach(quantityInput => {
      quantityInput.value = quantity;
    });
    dispatchCustomEvent("product:quantity-update", {
      quantity: quantity,
      variant: variant
    });
  }
  const unload = () => {
    productForm && productForm.destroy();
    optionButtonsEls.destroy();
    quantityInputEls.unload();
    dynamicVariantAvailability?.unload();
  };
  return {
    unload
  };
}

const classes$d = {
  visible: 'is-visible',
  active: 'active',
  fixed: 'is-fixed'
};
const selectors$r = {
  closeBtn: '[data-quick-add-modal-close]',
  wash: '.quick-add-modal__wash',
  modalContent: '.quick-add-modal__content'
};
const quickAddModal = node => {
  const focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  const wash = n$2(selectors$r.wash, node.parentNode);
  const modalContent = n$2(selectors$r.modalContent, node);
  let productForm;
  const events = [e$3([n$2(selectors$r.closeBtn, node), wash], 'click', e => {
    e.preventDefault();
    _close();
  }), e$3(node, 'keydown', ({
    keyCode
  }) => {
    if (keyCode === 27) _close();
  }), c('quick-add:open', (state, {
    productContent,
    openQuickCart,
    quantity
  }) => {
    _renderProductContent(productContent, openQuickCart, quantity);
    _open();
  }), c('quick-add:close', () => {
    _close();
  })];
  const _renderProductContent = (content, openQuickCart, quantity) => {
    let container = document.createElement('div');
    container.innerHTML = content;
    const productElement = n$2('[data-quick-add-product]', container);
    if (quantity > 1) {
      const quantityInputs = t$3(['.product-form__input--quantity', '.product__input--quantity'], container);
      quantityInputs.forEach(input => input.value = quantity);
    }
    modalContent.appendChild(productElement);
    productForm = QuickAddProductForm(modalContent, openQuickCart);
  };
  const _open = () => {
    // Due to this component being shared between templates we have to
    // animate around it being fixed to the window
    u$1(node, classes$d.fixed);
    setTimeout(() => {
      u$1(node, classes$d.visible);
      u$1(node, classes$d.active);
    }, 50);
    focusTrap.activate();
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute('data-scroll-lock-ignore') !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  };
  const _close = () => {
    focusTrap.deactivate();
    i$1(node, classes$d.visible);
    i$1(node, classes$d.active);
    enableBodyScroll(node);
    setTimeout(() => {
      i$1(node, classes$d.fixed);
      modalContent.innerHTML = '';
      productForm.unload();
    }, 300);
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
};

var ls_objectFit = {exports: {}};

var lazysizes = {exports: {}};

(function (module) {
(function(window, factory) {
	var lazySizes = factory(window, window.document, Date);
	window.lazySizes = lazySizes;
	if(module.exports){
		module.exports = lazySizes;
	}
}(typeof window != 'undefined' ?
      window : {}, 
/**
 * import("./types/global")
 * @typedef { import("./types/lazysizes-config").LazySizesConfigPartial } LazySizesConfigPartial
 */
function l(window, document, Date) { // Pass in the window Date function also for SSR because the Date class can be lost
	/*jshint eqnull:true */

	var lazysizes,
		/**
		 * @type { LazySizesConfigPartial }
		 */
		lazySizesCfg;

	(function(){
		var prop;

		var lazySizesDefaults = {
			lazyClass: 'lazyload',
			loadedClass: 'lazyloaded',
			loadingClass: 'lazyloading',
			preloadClass: 'lazypreload',
			errorClass: 'lazyerror',
			//strictClass: 'lazystrict',
			autosizesClass: 'lazyautosizes',
			fastLoadedClass: 'ls-is-cached',
			iframeLoadMode: 0,
			srcAttr: 'data-src',
			srcsetAttr: 'data-srcset',
			sizesAttr: 'data-sizes',
			//preloadAfterLoad: false,
			minSize: 40,
			customMedia: {},
			init: true,
			expFactor: 1.5,
			hFac: 0.8,
			loadMode: 2,
			loadHidden: true,
			ricTimeout: 0,
			throttleDelay: 125,
		};

		lazySizesCfg = window.lazySizesConfig || window.lazysizesConfig || {};

		for(prop in lazySizesDefaults){
			if(!(prop in lazySizesCfg)){
				lazySizesCfg[prop] = lazySizesDefaults[prop];
			}
		}
	})();

	if (!document || !document.getElementsByClassName) {
		return {
			init: function () {},
			/**
			 * @type { LazySizesConfigPartial }
			 */
			cfg: lazySizesCfg,
			/**
			 * @type { true }
			 */
			noSupport: true,
		};
	}

	var docElem = document.documentElement;

	var supportPicture = window.HTMLPictureElement;

	var _addEventListener = 'addEventListener';

	var _getAttribute = 'getAttribute';

	/**
	 * Update to bind to window because 'this' becomes null during SSR
	 * builds.
	 */
	var addEventListener = window[_addEventListener].bind(window);

	var setTimeout = window.setTimeout;

	var requestAnimationFrame = window.requestAnimationFrame || setTimeout;

	var requestIdleCallback = window.requestIdleCallback;

	var regPicture = /^picture$/i;

	var loadEvents = ['load', 'error', 'lazyincluded', '_lazyloaded'];

	var regClassCache = {};

	var forEach = Array.prototype.forEach;

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var hasClass = function(ele, cls) {
		if(!regClassCache[cls]){
			regClassCache[cls] = new RegExp('(\\s|^)'+cls+'(\\s|$)');
		}
		return regClassCache[cls].test(ele[_getAttribute]('class') || '') && regClassCache[cls];
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var addClass = function(ele, cls) {
		if (!hasClass(ele, cls)){
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').trim() + ' ' + cls);
		}
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var removeClass = function(ele, cls) {
		var reg;
		if ((reg = hasClass(ele,cls))) {
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').replace(reg, ' '));
		}
	};

	var addRemoveLoadEvents = function(dom, fn, add){
		var action = add ? _addEventListener : 'removeEventListener';
		if(add){
			addRemoveLoadEvents(dom, fn);
		}
		loadEvents.forEach(function(evt){
			dom[action](evt, fn);
		});
	};

	/**
	 * @param elem { Element }
	 * @param name { string }
	 * @param detail { any }
	 * @param noBubbles { boolean }
	 * @param noCancelable { boolean }
	 * @returns { CustomEvent }
	 */
	var triggerEvent = function(elem, name, detail, noBubbles, noCancelable){
		var event = document.createEvent('Event');

		if(!detail){
			detail = {};
		}

		detail.instance = lazysizes;

		event.initEvent(name, !noBubbles, !noCancelable);

		event.detail = detail;

		elem.dispatchEvent(event);
		return event;
	};

	var updatePolyfill = function (el, full){
		var polyfill;
		if( !supportPicture && ( polyfill = (window.picturefill || lazySizesCfg.pf) ) ){
			if(full && full.src && !el[_getAttribute]('srcset')){
				el.setAttribute('srcset', full.src);
			}
			polyfill({reevaluate: true, elements: [el]});
		} else if(full && full.src){
			el.src = full.src;
		}
	};

	var getCSS = function (elem, style){
		return (getComputedStyle(elem, null) || {})[style];
	};

	/**
	 *
	 * @param elem { Element }
	 * @param parent { Element }
	 * @param [width] {number}
	 * @returns {number}
	 */
	var getWidth = function(elem, parent, width){
		width = width || elem.offsetWidth;

		while(width < lazySizesCfg.minSize && parent && !elem._lazysizesWidth){
			width =  parent.offsetWidth;
			parent = parent.parentNode;
		}

		return width;
	};

	var rAF = (function(){
		var running, waiting;
		var firstFns = [];
		var secondFns = [];
		var fns = firstFns;

		var run = function(){
			var runFns = fns;

			fns = firstFns.length ? secondFns : firstFns;

			running = true;
			waiting = false;

			while(runFns.length){
				runFns.shift()();
			}

			running = false;
		};

		var rafBatch = function(fn, queue){
			if(running && !queue){
				fn.apply(this, arguments);
			} else {
				fns.push(fn);

				if(!waiting){
					waiting = true;
					(document.hidden ? setTimeout : requestAnimationFrame)(run);
				}
			}
		};

		rafBatch._lsFlush = run;

		return rafBatch;
	})();

	var rAFIt = function(fn, simple){
		return simple ?
			function() {
				rAF(fn);
			} :
			function(){
				var that = this;
				var args = arguments;
				rAF(function(){
					fn.apply(that, args);
				});
			}
		;
	};

	var throttle = function(fn){
		var running;
		var lastTime = 0;
		var gDelay = lazySizesCfg.throttleDelay;
		var rICTimeout = lazySizesCfg.ricTimeout;
		var run = function(){
			running = false;
			lastTime = Date.now();
			fn();
		};
		var idleCallback = requestIdleCallback && rICTimeout > 49 ?
			function(){
				requestIdleCallback(run, {timeout: rICTimeout});

				if(rICTimeout !== lazySizesCfg.ricTimeout){
					rICTimeout = lazySizesCfg.ricTimeout;
				}
			} :
			rAFIt(function(){
				setTimeout(run);
			}, true)
		;

		return function(isPriority){
			var delay;

			if((isPriority = isPriority === true)){
				rICTimeout = 33;
			}

			if(running){
				return;
			}

			running =  true;

			delay = gDelay - (Date.now() - lastTime);

			if(delay < 0){
				delay = 0;
			}

			if(isPriority || delay < 9){
				idleCallback();
			} else {
				setTimeout(idleCallback, delay);
			}
		};
	};

	//based on http://modernjavascript.blogspot.de/2013/08/building-better-debounce.html
	var debounce = function(func) {
		var timeout, timestamp;
		var wait = 99;
		var run = function(){
			timeout = null;
			func();
		};
		var later = function() {
			var last = Date.now() - timestamp;

			if (last < wait) {
				setTimeout(later, wait - last);
			} else {
				(requestIdleCallback || run)(run);
			}
		};

		return function() {
			timestamp = Date.now();

			if (!timeout) {
				timeout = setTimeout(later, wait);
			}
		};
	};

	var loader = (function(){
		var preloadElems, isCompleted, resetPreloadingTimer, loadMode, started;

		var eLvW, elvH, eLtop, eLleft, eLright, eLbottom, isBodyHidden;

		var regImg = /^img$/i;
		var regIframe = /^iframe$/i;

		var supportScroll = ('onscroll' in window) && !(/(gle|ing)bot/.test(navigator.userAgent));

		var shrinkExpand = 0;
		var currentExpand = 0;

		var isLoading = 0;
		var lowRuns = -1;

		var resetPreloading = function(e){
			isLoading--;
			if(!e || isLoading < 0 || !e.target){
				isLoading = 0;
			}
		};

		var isVisible = function (elem) {
			if (isBodyHidden == null) {
				isBodyHidden = getCSS(document.body, 'visibility') == 'hidden';
			}

			return isBodyHidden || !(getCSS(elem.parentNode, 'visibility') == 'hidden' && getCSS(elem, 'visibility') == 'hidden');
		};

		var isNestedVisible = function(elem, elemExpand){
			var outerRect;
			var parent = elem;
			var visible = isVisible(elem);

			eLtop -= elemExpand;
			eLbottom += elemExpand;
			eLleft -= elemExpand;
			eLright += elemExpand;

			while(visible && (parent = parent.offsetParent) && parent != document.body && parent != docElem){
				visible = ((getCSS(parent, 'opacity') || 1) > 0);

				if(visible && getCSS(parent, 'overflow') != 'visible'){
					outerRect = parent.getBoundingClientRect();
					visible = eLright > outerRect.left &&
						eLleft < outerRect.right &&
						eLbottom > outerRect.top - 1 &&
						eLtop < outerRect.bottom + 1
					;
				}
			}

			return visible;
		};

		var checkElements = function() {
			var eLlen, i, rect, autoLoadElem, loadedSomething, elemExpand, elemNegativeExpand, elemExpandVal,
				beforeExpandVal, defaultExpand, preloadExpand, hFac;
			var lazyloadElems = lazysizes.elements;

			if((loadMode = lazySizesCfg.loadMode) && isLoading < 8 && (eLlen = lazyloadElems.length)){

				i = 0;

				lowRuns++;

				for(; i < eLlen; i++){

					if(!lazyloadElems[i] || lazyloadElems[i]._lazyRace){continue;}

					if(!supportScroll || (lazysizes.prematureUnveil && lazysizes.prematureUnveil(lazyloadElems[i]))){unveilElement(lazyloadElems[i]);continue;}

					if(!(elemExpandVal = lazyloadElems[i][_getAttribute]('data-expand')) || !(elemExpand = elemExpandVal * 1)){
						elemExpand = currentExpand;
					}

					if (!defaultExpand) {
						defaultExpand = (!lazySizesCfg.expand || lazySizesCfg.expand < 1) ?
							docElem.clientHeight > 500 && docElem.clientWidth > 500 ? 500 : 370 :
							lazySizesCfg.expand;

						lazysizes._defEx = defaultExpand;

						preloadExpand = defaultExpand * lazySizesCfg.expFactor;
						hFac = lazySizesCfg.hFac;
						isBodyHidden = null;

						if(currentExpand < preloadExpand && isLoading < 1 && lowRuns > 2 && loadMode > 2 && !document.hidden){
							currentExpand = preloadExpand;
							lowRuns = 0;
						} else if(loadMode > 1 && lowRuns > 1 && isLoading < 6){
							currentExpand = defaultExpand;
						} else {
							currentExpand = shrinkExpand;
						}
					}

					if(beforeExpandVal !== elemExpand){
						eLvW = innerWidth + (elemExpand * hFac);
						elvH = innerHeight + elemExpand;
						elemNegativeExpand = elemExpand * -1;
						beforeExpandVal = elemExpand;
					}

					rect = lazyloadElems[i].getBoundingClientRect();

					if ((eLbottom = rect.bottom) >= elemNegativeExpand &&
						(eLtop = rect.top) <= elvH &&
						(eLright = rect.right) >= elemNegativeExpand * hFac &&
						(eLleft = rect.left) <= eLvW &&
						(eLbottom || eLright || eLleft || eLtop) &&
						(lazySizesCfg.loadHidden || isVisible(lazyloadElems[i])) &&
						((isCompleted && isLoading < 3 && !elemExpandVal && (loadMode < 3 || lowRuns < 4)) || isNestedVisible(lazyloadElems[i], elemExpand))){
						unveilElement(lazyloadElems[i]);
						loadedSomething = true;
						if(isLoading > 9){break;}
					} else if(!loadedSomething && isCompleted && !autoLoadElem &&
						isLoading < 4 && lowRuns < 4 && loadMode > 2 &&
						(preloadElems[0] || lazySizesCfg.preloadAfterLoad) &&
						(preloadElems[0] || (!elemExpandVal && ((eLbottom || eLright || eLleft || eLtop) || lazyloadElems[i][_getAttribute](lazySizesCfg.sizesAttr) != 'auto')))){
						autoLoadElem = preloadElems[0] || lazyloadElems[i];
					}
				}

				if(autoLoadElem && !loadedSomething){
					unveilElement(autoLoadElem);
				}
			}
		};

		var throttledCheckElements = throttle(checkElements);

		var switchLoadingClass = function(e){
			var elem = e.target;

			if (elem._lazyCache) {
				delete elem._lazyCache;
				return;
			}

			resetPreloading(e);
			addClass(elem, lazySizesCfg.loadedClass);
			removeClass(elem, lazySizesCfg.loadingClass);
			addRemoveLoadEvents(elem, rafSwitchLoadingClass);
			triggerEvent(elem, 'lazyloaded');
		};
		var rafedSwitchLoadingClass = rAFIt(switchLoadingClass);
		var rafSwitchLoadingClass = function(e){
			rafedSwitchLoadingClass({target: e.target});
		};

		var changeIframeSrc = function(elem, src){
			var loadMode = elem.getAttribute('data-load-mode') || lazySizesCfg.iframeLoadMode;

			// loadMode can be also a string!
			if (loadMode == 0) {
				elem.contentWindow.location.replace(src);
			} else if (loadMode == 1) {
				elem.src = src;
			}
		};

		var handleSources = function(source){
			var customMedia;

			var sourceSrcset = source[_getAttribute](lazySizesCfg.srcsetAttr);

			if( (customMedia = lazySizesCfg.customMedia[source[_getAttribute]('data-media') || source[_getAttribute]('media')]) ){
				source.setAttribute('media', customMedia);
			}

			if(sourceSrcset){
				source.setAttribute('srcset', sourceSrcset);
			}
		};

		var lazyUnveil = rAFIt(function (elem, detail, isAuto, sizes, isImg){
			var src, srcset, parent, isPicture, event, firesLoad;

			if(!(event = triggerEvent(elem, 'lazybeforeunveil', detail)).defaultPrevented){

				if(sizes){
					if(isAuto){
						addClass(elem, lazySizesCfg.autosizesClass);
					} else {
						elem.setAttribute('sizes', sizes);
					}
				}

				srcset = elem[_getAttribute](lazySizesCfg.srcsetAttr);
				src = elem[_getAttribute](lazySizesCfg.srcAttr);

				if(isImg) {
					parent = elem.parentNode;
					isPicture = parent && regPicture.test(parent.nodeName || '');
				}

				firesLoad = detail.firesLoad || (('src' in elem) && (srcset || src || isPicture));

				event = {target: elem};

				addClass(elem, lazySizesCfg.loadingClass);

				if(firesLoad){
					clearTimeout(resetPreloadingTimer);
					resetPreloadingTimer = setTimeout(resetPreloading, 2500);
					addRemoveLoadEvents(elem, rafSwitchLoadingClass, true);
				}

				if(isPicture){
					forEach.call(parent.getElementsByTagName('source'), handleSources);
				}

				if(srcset){
					elem.setAttribute('srcset', srcset);
				} else if(src && !isPicture){
					if(regIframe.test(elem.nodeName)){
						changeIframeSrc(elem, src);
					} else {
						elem.src = src;
					}
				}

				if(isImg && (srcset || isPicture)){
					updatePolyfill(elem, {src: src});
				}
			}

			if(elem._lazyRace){
				delete elem._lazyRace;
			}
			removeClass(elem, lazySizesCfg.lazyClass);

			rAF(function(){
				// Part of this can be removed as soon as this fix is older: https://bugs.chromium.org/p/chromium/issues/detail?id=7731 (2015)
				var isLoaded = elem.complete && elem.naturalWidth > 1;

				if( !firesLoad || isLoaded){
					if (isLoaded) {
						addClass(elem, lazySizesCfg.fastLoadedClass);
					}
					switchLoadingClass(event);
					elem._lazyCache = true;
					setTimeout(function(){
						if ('_lazyCache' in elem) {
							delete elem._lazyCache;
						}
					}, 9);
				}
				if (elem.loading == 'lazy') {
					isLoading--;
				}
			}, true);
		});

		/**
		 *
		 * @param elem { Element }
		 */
		var unveilElement = function (elem){
			if (elem._lazyRace) {return;}
			var detail;

			var isImg = regImg.test(elem.nodeName);

			//allow using sizes="auto", but don't use. it's invalid. Use data-sizes="auto" or a valid value for sizes instead (i.e.: sizes="80vw")
			var sizes = isImg && (elem[_getAttribute](lazySizesCfg.sizesAttr) || elem[_getAttribute]('sizes'));
			var isAuto = sizes == 'auto';

			if( (isAuto || !isCompleted) && isImg && (elem[_getAttribute]('src') || elem.srcset) && !elem.complete && !hasClass(elem, lazySizesCfg.errorClass) && hasClass(elem, lazySizesCfg.lazyClass)){return;}

			detail = triggerEvent(elem, 'lazyunveilread').detail;

			if(isAuto){
				 autoSizer.updateElem(elem, true, elem.offsetWidth);
			}

			elem._lazyRace = true;
			isLoading++;

			lazyUnveil(elem, detail, isAuto, sizes, isImg);
		};

		var afterScroll = debounce(function(){
			lazySizesCfg.loadMode = 3;
			throttledCheckElements();
		});

		var altLoadmodeScrollListner = function(){
			if(lazySizesCfg.loadMode == 3){
				lazySizesCfg.loadMode = 2;
			}
			afterScroll();
		};

		var onload = function(){
			if(isCompleted){return;}
			if(Date.now() - started < 999){
				setTimeout(onload, 999);
				return;
			}


			isCompleted = true;

			lazySizesCfg.loadMode = 3;

			throttledCheckElements();

			addEventListener('scroll', altLoadmodeScrollListner, true);
		};

		return {
			_: function(){
				started = Date.now();

				lazysizes.elements = document.getElementsByClassName(lazySizesCfg.lazyClass);
				preloadElems = document.getElementsByClassName(lazySizesCfg.lazyClass + ' ' + lazySizesCfg.preloadClass);

				addEventListener('scroll', throttledCheckElements, true);

				addEventListener('resize', throttledCheckElements, true);

				addEventListener('pageshow', function (e) {
					if (e.persisted) {
						var loadingElements = document.querySelectorAll('.' + lazySizesCfg.loadingClass);

						if (loadingElements.length && loadingElements.forEach) {
							requestAnimationFrame(function () {
								loadingElements.forEach( function (img) {
									if (img.complete) {
										unveilElement(img);
									}
								});
							});
						}
					}
				});

				if(window.MutationObserver){
					new MutationObserver( throttledCheckElements ).observe( docElem, {childList: true, subtree: true, attributes: true} );
				} else {
					docElem[_addEventListener]('DOMNodeInserted', throttledCheckElements, true);
					docElem[_addEventListener]('DOMAttrModified', throttledCheckElements, true);
					setInterval(throttledCheckElements, 999);
				}

				addEventListener('hashchange', throttledCheckElements, true);

				//, 'fullscreenchange'
				['focus', 'mouseover', 'click', 'load', 'transitionend', 'animationend'].forEach(function(name){
					document[_addEventListener](name, throttledCheckElements, true);
				});

				if((/d$|^c/.test(document.readyState))){
					onload();
				} else {
					addEventListener('load', onload);
					document[_addEventListener]('DOMContentLoaded', throttledCheckElements);
					setTimeout(onload, 20000);
				}

				if(lazysizes.elements.length){
					checkElements();
					rAF._lsFlush();
				} else {
					throttledCheckElements();
				}
			},
			checkElems: throttledCheckElements,
			unveil: unveilElement,
			_aLSL: altLoadmodeScrollListner,
		};
	})();


	var autoSizer = (function(){
		var autosizesElems;

		var sizeElement = rAFIt(function(elem, parent, event, width){
			var sources, i, len;
			elem._lazysizesWidth = width;
			width += 'px';

			elem.setAttribute('sizes', width);

			if(regPicture.test(parent.nodeName || '')){
				sources = parent.getElementsByTagName('source');
				for(i = 0, len = sources.length; i < len; i++){
					sources[i].setAttribute('sizes', width);
				}
			}

			if(!event.detail.dataAttr){
				updatePolyfill(elem, event.detail);
			}
		});
		/**
		 *
		 * @param elem {Element}
		 * @param dataAttr
		 * @param [width] { number }
		 */
		var getSizeElement = function (elem, dataAttr, width){
			var event;
			var parent = elem.parentNode;

			if(parent){
				width = getWidth(elem, parent, width);
				event = triggerEvent(elem, 'lazybeforesizes', {width: width, dataAttr: !!dataAttr});

				if(!event.defaultPrevented){
					width = event.detail.width;

					if(width && width !== elem._lazysizesWidth){
						sizeElement(elem, parent, event, width);
					}
				}
			}
		};

		var updateElementsSizes = function(){
			var i;
			var len = autosizesElems.length;
			if(len){
				i = 0;

				for(; i < len; i++){
					getSizeElement(autosizesElems[i]);
				}
			}
		};

		var debouncedUpdateElementsSizes = debounce(updateElementsSizes);

		return {
			_: function(){
				autosizesElems = document.getElementsByClassName(lazySizesCfg.autosizesClass);
				addEventListener('resize', debouncedUpdateElementsSizes);
			},
			checkElems: debouncedUpdateElementsSizes,
			updateElem: getSizeElement
		};
	})();

	var init = function(){
		if(!init.i && document.getElementsByClassName){
			init.i = true;
			autoSizer._();
			loader._();
		}
	};

	setTimeout(function(){
		if(lazySizesCfg.init){
			init();
		}
	});

	lazysizes = {
		/**
		 * @type { LazySizesConfigPartial }
		 */
		cfg: lazySizesCfg,
		autoSizer: autoSizer,
		loader: loader,
		init: init,
		uP: updatePolyfill,
		aC: addClass,
		rC: removeClass,
		hC: hasClass,
		fire: triggerEvent,
		gW: getWidth,
		rAF: rAF,
	};

	return lazysizes;
}
));
}(lazysizes));

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(initialEvent){
		factory(window.lazySizes, initialEvent);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes, initialEvent) {
	var cloneElementClass;
	var style = document.createElement('a').style;
	var fitSupport = 'objectFit' in style;
	var positionSupport = fitSupport && 'objectPosition' in style;
	var regCssFit = /object-fit["']*\s*:\s*["']*(contain|cover)/;
	var regCssPosition = /object-position["']*\s*:\s*["']*(.+?)(?=($|,|'|"|;))/;
	var blankSrc = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
	var regBgUrlEscape = /\(|\)|'/;
	var positionDefaults = {
		center: 'center',
		'50% 50%': 'center',
	};

	function getObject(element){
		var css = (getComputedStyle(element, null) || {});
		var content = css.fontFamily || '';
		var objectFit = content.match(regCssFit) || '';
		var objectPosition = objectFit && content.match(regCssPosition) || '';

		if(objectPosition){
			objectPosition = objectPosition[1];
		}

		return {
			fit: objectFit && objectFit[1] || '',
			position: positionDefaults[objectPosition] || objectPosition || 'center',
		};
	}

	function generateStyleClass() {
		if (cloneElementClass) {
			return;
		}

		var styleElement = document.createElement('style');

		cloneElementClass = lazySizes.cfg.objectFitClass || 'lazysizes-display-clone';

		document.querySelector('head').appendChild(styleElement);
	}

	function removePrevClone(element) {
		var prev = element.previousElementSibling;

		if (prev && lazySizes.hC(prev, cloneElementClass)) {
			prev.parentNode.removeChild(prev);
			element.style.position = prev.getAttribute('data-position') || '';
			element.style.visibility = prev.getAttribute('data-visibility') || '';
		}
	}

	function initFix(element, config){
		var switchClassesAdded, addedSrc, styleElement, styleElementStyle;
		var lazysizesCfg = lazySizes.cfg;

		var onChange = function(){
			var src = element.currentSrc || element.src;

			if(src && addedSrc !== src){
				addedSrc = src;
				styleElementStyle.backgroundImage = 'url(' + (regBgUrlEscape.test(src) ? JSON.stringify(src) : src ) + ')';

				if(!switchClassesAdded){
					switchClassesAdded = true;
					lazySizes.rC(styleElement, lazysizesCfg.loadingClass);
					lazySizes.aC(styleElement, lazysizesCfg.loadedClass);
				}
			}
		};
		var rafedOnChange = function(){
			lazySizes.rAF(onChange);
		};

		element._lazysizesParentFit = config.fit;

		element.addEventListener('lazyloaded', rafedOnChange, true);
		element.addEventListener('load', rafedOnChange, true);

		lazySizes.rAF(function(){

			var hideElement = element;
			var container = element.parentNode;

			if(container.nodeName.toUpperCase() == 'PICTURE'){
				hideElement = container;
				container = container.parentNode;
			}

			removePrevClone(hideElement);

			if (!cloneElementClass) {
				generateStyleClass();
			}

			styleElement = element.cloneNode(false);
			styleElementStyle = styleElement.style;

			styleElement.addEventListener('load', function(){
				var curSrc = styleElement.currentSrc || styleElement.src;

				if(curSrc && curSrc != blankSrc){
					styleElement.src = blankSrc;
					styleElement.srcset = '';
				}
			});

			lazySizes.rC(styleElement, lazysizesCfg.loadedClass);
			lazySizes.rC(styleElement, lazysizesCfg.lazyClass);
			lazySizes.rC(styleElement, lazysizesCfg.autosizesClass);
			lazySizes.aC(styleElement, lazysizesCfg.loadingClass);
			lazySizes.aC(styleElement, cloneElementClass);

			['data-parent-fit', 'data-parent-container', 'data-object-fit-polyfilled',
				lazysizesCfg.srcsetAttr, lazysizesCfg.srcAttr].forEach(function(attr) {
				styleElement.removeAttribute(attr);
			});

			styleElement.src = blankSrc;
			styleElement.srcset = '';

			styleElementStyle.backgroundRepeat = 'no-repeat';
			styleElementStyle.backgroundPosition = config.position;
			styleElementStyle.backgroundSize = config.fit;

			styleElement.setAttribute('data-position', hideElement.style.position);
			styleElement.setAttribute('data-visibility', hideElement.style.visibility);

			hideElement.style.visibility = 'hidden';
			hideElement.style.position = 'absolute';

			element.setAttribute('data-parent-fit', config.fit);
			element.setAttribute('data-parent-container', 'prev');
			element.setAttribute('data-object-fit-polyfilled', '');
			element._objectFitPolyfilledDisplay = styleElement;

			container.insertBefore(styleElement, hideElement);

			if(element._lazysizesParentFit){
				delete element._lazysizesParentFit;
			}

			if(element.complete){
				onChange();
			}
		});
	}

	if(!fitSupport || !positionSupport){
		var onRead = function(e){
			if(e.detail.instance != lazySizes){return;}

			var element = e.target;
			var obj = getObject(element);

			if(obj.fit && (!fitSupport || (obj.position != 'center'))){
				initFix(element, obj);
				return true;
			}

			return false;
		};

		window.addEventListener('lazybeforesizes', function(e) {
			if(e.detail.instance != lazySizes){return;}
			var element = e.target;

			if (element.getAttribute('data-object-fit-polyfilled') != null && !element._objectFitPolyfilledDisplay) {
				if(!onRead(e)){
					lazySizes.rAF(function () {
						element.removeAttribute('data-object-fit-polyfilled');
					});
				}
			}
		});
		window.addEventListener('lazyunveilread', onRead, true);

		if(initialEvent && initialEvent.detail){
			onRead(initialEvent);
		}
	}
}));
}(ls_objectFit));

var ls_parentFit = {exports: {}};

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes) {

	if(!window.addEventListener){return;}

	var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
	var regCssFit = /parent-fit["']*\s*:\s*["']*(contain|cover|width)/;
	var regCssObject = /parent-container["']*\s*:\s*["']*(.+?)(?=(\s|$|,|'|"|;))/;
	var regPicture = /^picture$/i;
	var cfg = lazySizes.cfg;

	var getCSS = function (elem){
		return (getComputedStyle(elem, null) || {});
	};

	var parentFit = {

		getParent: function(element, parentSel){
			var parent = element;
			var parentNode = element.parentNode;

			if((!parentSel || parentSel == 'prev') && parentNode && regPicture.test(parentNode.nodeName || '')){
				parentNode = parentNode.parentNode;
			}

			if(parentSel != 'self'){
				if(parentSel == 'prev'){
					parent = element.previousElementSibling;
				} else if(parentSel && (parentNode.closest || window.jQuery)){
					parent = (parentNode.closest ?
							parentNode.closest(parentSel) :
							jQuery(parentNode).closest(parentSel)[0]) ||
						parentNode
					;
				} else {
					parent = parentNode;
				}
			}

			return parent;
		},

		getFit: function(element){
			var tmpMatch, parentObj;
			var css = getCSS(element);
			var content = css.content || css.fontFamily;
			var obj = {
				fit: element._lazysizesParentFit || element.getAttribute('data-parent-fit')
			};

			if(!obj.fit && content && (tmpMatch = content.match(regCssFit))){
				obj.fit = tmpMatch[1];
			}

			if(obj.fit){
				parentObj = element._lazysizesParentContainer || element.getAttribute('data-parent-container');

				if(!parentObj && content && (tmpMatch = content.match(regCssObject))){
					parentObj = tmpMatch[1];
				}

				obj.parent = parentFit.getParent(element, parentObj);


			} else {
				obj.fit = css.objectFit;
			}

			return obj;
		},

		getImageRatio: function(element){
			var i, srcset, media, ratio, match, width, height;
			var parent = element.parentNode;
			var elements = parent && regPicture.test(parent.nodeName || '') ?
					parent.querySelectorAll('source, img') :
					[element]
				;

			for(i = 0; i < elements.length; i++){
				element = elements[i];
				srcset = element.getAttribute(cfg.srcsetAttr) || element.getAttribute('srcset') || element.getAttribute('data-pfsrcset') || element.getAttribute('data-risrcset') || '';
				media = element._lsMedia || element.getAttribute('media');
				media = cfg.customMedia[element.getAttribute('data-media') || media] || media;

				if(srcset && (!media || (window.matchMedia && matchMedia(media) || {}).matches )){
					ratio = parseFloat(element.getAttribute('data-aspectratio'));

					if (!ratio) {
						match = srcset.match(regDescriptors);

						if (match) {
							if(match[2] == 'w'){
								width = match[1];
								height = match[3];
							} else {
								width = match[3];
								height = match[1];
							}
						} else {
							width = element.getAttribute('width');
							height = element.getAttribute('height');
						}

						ratio = width / height;
					}

					break;
				}
			}

			return ratio;
		},

		calculateSize: function(element, width){
			var displayRatio, height, imageRatio, retWidth;
			var fitObj = this.getFit(element);
			var fit = fitObj.fit;
			var fitElem = fitObj.parent;

			if(fit != 'width' && ((fit != 'contain' && fit != 'cover') || !(imageRatio = this.getImageRatio(element)))){
				return width;
			}

			if(fitElem){
				width = fitElem.clientWidth;
			} else {
				fitElem = element;
			}

			retWidth = width;

			if(fit == 'width'){
				retWidth = width;
			} else {
				height = fitElem.clientHeight;

				if((displayRatio =  width / height) && ((fit == 'cover' && displayRatio < imageRatio) || (fit == 'contain' && displayRatio > imageRatio))){
					retWidth = width * (imageRatio / displayRatio);
				}
			}

			return retWidth;
		}
	};

	lazySizes.parentFit = parentFit;

	document.addEventListener('lazybeforesizes', function(e){
		if(e.defaultPrevented || e.detail.instance != lazySizes){return;}

		var element = e.target;
		e.detail.width = parentFit.calculateSize(element, e.detail.width);
	});
}));
}(ls_parentFit));

var ls_rias = {exports: {}};

(function (module) {
(function(window, factory) {
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(window, function(window, document, lazySizes) {

	var config, riasCfg;
	var lazySizesCfg = lazySizes.cfg;
	var replaceTypes = {string: 1, number: 1};
	var regNumber = /^\-*\+*\d+\.*\d*$/;
	var regPicture = /^picture$/i;
	var regWidth = /\s*\{\s*width\s*\}\s*/i;
	var regHeight = /\s*\{\s*height\s*\}\s*/i;
	var regPlaceholder = /\s*\{\s*([a-z0-9]+)\s*\}\s*/ig;
	var regObj = /^\[.*\]|\{.*\}$/;
	var regAllowedSizes = /^(?:auto|\d+(px)?)$/;
	var anchor = document.createElement('a');
	var img = document.createElement('img');
	var buggySizes = ('srcset' in img) && !('sizes' in img);
	var supportPicture = !!window.HTMLPictureElement && !buggySizes;

	(function(){
		var prop;
		var noop = function(){};
		var riasDefaults = {
			prefix: '',
			postfix: '',
			srcAttr: 'data-src',
			absUrl: false,
			modifyOptions: noop,
			widthmap: {},
			ratio: false,
			traditionalRatio: false,
			aspectratio: false,
		};

		config = lazySizes && lazySizes.cfg;

		if(!config.supportsType){
			config.supportsType = function(type/*, elem*/){
				return !type;
			};
		}

		if(!config.rias){
			config.rias = {};
		}
		riasCfg = config.rias;

		if(!('widths' in riasCfg)){
			riasCfg.widths = [];
			(function (widths){
				var width;
				var i = 0;
				while(!width || width < 3000){
					i += 5;
					if(i > 30){
						i += 1;
					}
					width = (36 * i);
					widths.push(width);
				}
			})(riasCfg.widths);
		}

		for(prop in riasDefaults){
			if(!(prop in riasCfg)){
				riasCfg[prop] = riasDefaults[prop];
			}
		}
	})();

	function getElementOptions(elem, src, options){
		var attr, parent, setOption, prop, opts;
		var elemStyles = window.getComputedStyle(elem);

		if (!options) {
			parent = elem.parentNode;

			options = {
				isPicture: !!(parent && regPicture.test(parent.nodeName || ''))
			};
		} else {
			opts = {};

			for (prop in options) {
				opts[prop] = options[prop];
			}

			options = opts;
		}

		setOption = function(attr, run){
			var attrVal = elem.getAttribute('data-'+ attr);

			if (!attrVal) {
				// no data- attr, get value from the CSS
				var styles = elemStyles.getPropertyValue('--ls-' + attr);
				// at least Safari 9 returns null rather than
				// an empty string for getPropertyValue causing
				// .trim() to fail
				if (styles) {
					attrVal = styles.trim();
				}
			}

			if (attrVal) {
				if(attrVal == 'true'){
					attrVal = true;
				} else if(attrVal == 'false'){
					attrVal = false;
				} else if(regNumber.test(attrVal)){
					attrVal = parseFloat(attrVal);
				} else if(typeof riasCfg[attr] == 'function'){
					attrVal = riasCfg[attr](elem, attrVal);
				} else if(regObj.test(attrVal)){
					try {
						attrVal = JSON.parse(attrVal);
					} catch(e){}
				}
				options[attr] = attrVal;
			} else if((attr in riasCfg) && typeof riasCfg[attr] != 'function' && !options[attr]){
				options[attr] = riasCfg[attr];
			} else if(run && typeof riasCfg[attr] == 'function'){
				options[attr] = riasCfg[attr](elem, attrVal);
			}
		};

		for(attr in riasCfg){
			setOption(attr);
		}
		src.replace(regPlaceholder, function(full, match){
			if(!(match in options)){
				setOption(match, true);
			}
		});

		return options;
	}

	function replaceUrlProps(url, options){
		var candidates = [];
		var replaceFn = function(full, match){
			return (replaceTypes[typeof options[match]]) ? options[match] : full;
		};
		candidates.srcset = [];

		if(options.absUrl){
			anchor.setAttribute('href', url);
			url = anchor.href;
		}

		url = ((options.prefix || '') + url + (options.postfix || '')).replace(regPlaceholder, replaceFn);

		options.widths.forEach(function(width){
			var widthAlias = options.widthmap[width] || width;
			var ratio = options.aspectratio || options.ratio;
			var traditionalRatio = !options.aspectratio && riasCfg.traditionalRatio;
			var candidate = {
				u: url.replace(regWidth, widthAlias)
						.replace(regHeight, ratio ?
							traditionalRatio ?
								Math.round(width * ratio) :
								Math.round(width / ratio)
							: ''),
				w: width
			};

			candidates.push(candidate);
			candidates.srcset.push( (candidate.c = candidate.u + ' ' + width + 'w') );
		});
		return candidates;
	}

	function setSrc(src, opts, elem){
		var elemW = 0;
		var elemH = 0;
		var sizeElement = elem;

		if(!src){return;}

		if (opts.ratio === 'container') {
			// calculate image or parent ratio
			elemW = sizeElement.scrollWidth;
			elemH = sizeElement.scrollHeight;

			while ((!elemW || !elemH) && sizeElement !== document) {
				sizeElement = sizeElement.parentNode;
				elemW = sizeElement.scrollWidth;
				elemH = sizeElement.scrollHeight;
			}
			if (elemW && elemH) {
				opts.ratio = opts.traditionalRatio ? elemH / elemW : elemW / elemH;
			}
		}

		src = replaceUrlProps(src, opts);

		src.isPicture = opts.isPicture;

		if(buggySizes && elem.nodeName.toUpperCase() == 'IMG'){
			elem.removeAttribute(config.srcsetAttr);
		} else {
			elem.setAttribute(config.srcsetAttr, src.srcset.join(', '));
		}

		Object.defineProperty(elem, '_lazyrias', {
			value: src,
			writable: true
		});
	}

	function createAttrObject(elem, src){
		var opts = getElementOptions(elem, src);

		riasCfg.modifyOptions.call(elem, {target: elem, details: opts, detail: opts});

		lazySizes.fire(elem, 'lazyriasmodifyoptions', opts);
		return opts;
	}

	function getSrc(elem){
		return elem.getAttribute( elem.getAttribute('data-srcattr') || riasCfg.srcAttr ) || elem.getAttribute(config.srcsetAttr) || elem.getAttribute(config.srcAttr) || elem.getAttribute('data-pfsrcset') || '';
	}

	addEventListener('lazybeforesizes', function(e){
		if(e.detail.instance != lazySizes){return;}

		var elem, src, elemOpts, sourceOpts, parent, sources, i, len, sourceSrc, sizes, detail, hasPlaceholder, modified, emptyList;
		elem = e.target;

		if(!e.detail.dataAttr || e.defaultPrevented || riasCfg.disabled || !((sizes = elem.getAttribute(config.sizesAttr) || elem.getAttribute('sizes')) && regAllowedSizes.test(sizes))){return;}

		src = getSrc(elem);

		elemOpts = createAttrObject(elem, src);

		hasPlaceholder = regWidth.test(elemOpts.prefix) || regWidth.test(elemOpts.postfix);

		if(elemOpts.isPicture && (parent = elem.parentNode)){
			sources = parent.getElementsByTagName('source');
			for(i = 0, len = sources.length; i < len; i++){
				if ( hasPlaceholder || regWidth.test(sourceSrc = getSrc(sources[i])) ){
					sourceOpts = getElementOptions(sources[i], sourceSrc, elemOpts);
					setSrc(sourceSrc, sourceOpts, sources[i]);
					modified = true;
				}
			}
		}

		if ( hasPlaceholder || regWidth.test(src) ){
			setSrc(src, elemOpts, elem);
			modified = true;
		} else if (modified) {
			emptyList = [];
			emptyList.srcset = [];
			emptyList.isPicture = true;
			Object.defineProperty(elem, '_lazyrias', {
				value: emptyList,
				writable: true
			});
		}

		if(modified){
			if(supportPicture){
				elem.removeAttribute(config.srcAttr);
			} else if(sizes != 'auto') {
				detail = {
					width: parseInt(sizes, 10)
				};
				polyfill({
					target: elem,
					detail: detail
				});
			}
		}
	}, true);
	// partial polyfill
	var polyfill = (function(){
		var ascendingSort = function( a, b ) {
			return a.w - b.w;
		};

		var reduceCandidate = function (srces) {
			var lowerCandidate, bonusFactor;
			var len = srces.length;
			var candidate = srces[len -1];
			var i = 0;

			for(i; i < len;i++){
				candidate = srces[i];
				candidate.d = candidate.w / srces.w;
				if(candidate.d >= srces.d){
					if(!candidate.cached && (lowerCandidate = srces[i - 1]) &&
						lowerCandidate.d > srces.d - (0.13 * Math.pow(srces.d, 2.2))){

						bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

						if(lowerCandidate.cached) {
							lowerCandidate.d += 0.15 * bonusFactor;
						}

						if(lowerCandidate.d + ((candidate.d - srces.d) * bonusFactor) > srces.d){
							candidate = lowerCandidate;
						}
					}
					break;
				}
			}
			return candidate;
		};

		var getWSet = function(elem, testPicture){
			var src;
			if(!elem._lazyrias && lazySizes.pWS && (src = lazySizes.pWS(elem.getAttribute(config.srcsetAttr || ''))).length){
				Object.defineProperty(elem, '_lazyrias', {
					value: src,
					writable: true
				});
				if(testPicture && elem.parentNode){
					src.isPicture = elem.parentNode.nodeName.toUpperCase() == 'PICTURE';
				}
			}
			return elem._lazyrias;
		};

		var getX = function(elem){
			var dpr = window.devicePixelRatio || 1;
			var optimum = lazySizes.getX && lazySizes.getX(elem);
			return Math.min(optimum || dpr, 2.4, dpr);
		};

		var getCandidate = function(elem, width){
			var sources, i, len, media, srces, src;

			srces = elem._lazyrias;

			if(srces.isPicture && window.matchMedia){
				for(i = 0, sources = elem.parentNode.getElementsByTagName('source'), len = sources.length; i < len; i++){
					if(getWSet(sources[i]) && !sources[i].getAttribute('type') && ( !(media = sources[i].getAttribute('media')) || ((matchMedia(media) || {}).matches))){
						srces = sources[i]._lazyrias;
						break;
					}
				}
			}

			if(!srces.w || srces.w < width){
				srces.w = width;
				srces.d = getX(elem);
				src = reduceCandidate(srces.sort(ascendingSort));
			}

			return src;
		};

		var polyfill = function(e){
			if(e.detail.instance != lazySizes){return;}

			var candidate;
			var elem = e.target;

			if(!buggySizes && (window.respimage || window.picturefill || lazySizesCfg.pf)){
				document.removeEventListener('lazybeforesizes', polyfill);
				return;
			}

			if(!('_lazyrias' in elem) && (!e.detail.dataAttr || !getWSet(elem, true))){
				return;
			}

			candidate = getCandidate(elem, e.detail.width);

			if(candidate && candidate.u && elem._lazyrias.cur != candidate.u){
				elem._lazyrias.cur = candidate.u;
				candidate.cached = true;
				lazySizes.rAF(function(){
					elem.setAttribute(config.srcAttr, candidate.u);
					elem.setAttribute('src', candidate.u);
				});
			}
		};

		if(!supportPicture){
			addEventListener('lazybeforesizes', polyfill);
		} else {
			polyfill = function(){};
		}

		return polyfill;

	})();

}));
}(ls_rias));

var ls_bgset = {exports: {}};

(function (module) {
(function(window, factory) {
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(window, function(window, document, lazySizes) {
	if(!window.addEventListener){return;}

	var lazySizesCfg = lazySizes.cfg;
	var regWhite = /\s+/g;
	var regSplitSet = /\s*\|\s+|\s+\|\s*/g;
	var regSource = /^(.+?)(?:\s+\[\s*(.+?)\s*\])(?:\s+\[\s*(.+?)\s*\])?$/;
	var regType = /^\s*\(*\s*type\s*:\s*(.+?)\s*\)*\s*$/;
	var regBgUrlEscape = /\(|\)|'/;
	var allowedBackgroundSize = {contain: 1, cover: 1};
	var proxyWidth = function(elem){
		var width = lazySizes.gW(elem, elem.parentNode);

		if(!elem._lazysizesWidth || width > elem._lazysizesWidth){
			elem._lazysizesWidth = width;
		}
		return elem._lazysizesWidth;
	};
	var getBgSize = function(elem){
		var bgSize;

		bgSize = (getComputedStyle(elem) || {getPropertyValue: function(){}}).getPropertyValue('background-size');

		if(!allowedBackgroundSize[bgSize] && allowedBackgroundSize[elem.style.backgroundSize]){
			bgSize = elem.style.backgroundSize;
		}

		return bgSize;
	};
	var setTypeOrMedia = function(source, match){
		if(match){
			var typeMatch = match.match(regType);
			if(typeMatch && typeMatch[1]){
				source.setAttribute('type', typeMatch[1]);
			} else {
				source.setAttribute('media', lazySizesCfg.customMedia[match] || match);
			}
		}
	};
	var createPicture = function(sets, elem, img){
		var picture = document.createElement('picture');
		var sizes = elem.getAttribute(lazySizesCfg.sizesAttr);
		var ratio = elem.getAttribute('data-ratio');
		var optimumx = elem.getAttribute('data-optimumx');

		if(elem._lazybgset && elem._lazybgset.parentNode == elem){
			elem.removeChild(elem._lazybgset);
		}

		Object.defineProperty(img, '_lazybgset', {
			value: elem,
			writable: true
		});
		Object.defineProperty(elem, '_lazybgset', {
			value: picture,
			writable: true
		});

		sets = sets.replace(regWhite, ' ').split(regSplitSet);

		picture.style.display = 'none';
		img.className = lazySizesCfg.lazyClass;

		if(sets.length == 1 && !sizes){
			sizes = 'auto';
		}

		sets.forEach(function(set){
			var match;
			var source = document.createElement('source');

			if(sizes && sizes != 'auto'){
				source.setAttribute('sizes', sizes);
			}

			if((match = set.match(regSource))){
				source.setAttribute(lazySizesCfg.srcsetAttr, match[1]);

				setTypeOrMedia(source, match[2]);
				setTypeOrMedia(source, match[3]);
			} else {
				source.setAttribute(lazySizesCfg.srcsetAttr, set);
			}

			picture.appendChild(source);
		});

		if(sizes){
			img.setAttribute(lazySizesCfg.sizesAttr, sizes);
			elem.removeAttribute(lazySizesCfg.sizesAttr);
			elem.removeAttribute('sizes');
		}
		if(optimumx){
			img.setAttribute('data-optimumx', optimumx);
		}
		if(ratio) {
			img.setAttribute('data-ratio', ratio);
		}

		picture.appendChild(img);

		elem.appendChild(picture);
	};

	var proxyLoad = function(e){
		if(!e.target._lazybgset){return;}

		var image = e.target;
		var elem = image._lazybgset;
		var bg = image.currentSrc || image.src;


		if(bg){
			var useSrc = regBgUrlEscape.test(bg) ? JSON.stringify(bg) : bg;
			var event = lazySizes.fire(elem, 'bgsetproxy', {
				src: bg,
				useSrc: useSrc,
				fullSrc: null,
			});

			if(!event.defaultPrevented){
				elem.style.backgroundImage = event.detail.fullSrc || 'url(' + event.detail.useSrc + ')';
			}
		}

		if(image._lazybgsetLoading){
			lazySizes.fire(elem, '_lazyloaded', {}, false, true);
			delete image._lazybgsetLoading;
		}
	};

	addEventListener('lazybeforeunveil', function(e){
		var set, image, elem;

		if(e.defaultPrevented || !(set = e.target.getAttribute('data-bgset'))){return;}

		elem = e.target;
		image = document.createElement('img');

		image.alt = '';

		image._lazybgsetLoading = true;
		e.detail.firesLoad = true;

		createPicture(set, elem, image);

		setTimeout(function(){
			lazySizes.loader.unveil(image);

			lazySizes.rAF(function(){
				lazySizes.fire(image, '_lazyloaded', {}, true, true);
				if(image.complete) {
					proxyLoad({target: image});
				}
			});
		});

	});

	document.addEventListener('load', proxyLoad, true);

	window.addEventListener('lazybeforesizes', function(e){
		if(e.detail.instance != lazySizes){return;}
		if(e.target._lazybgset && e.detail.dataAttr){
			var elem = e.target._lazybgset;
			var bgSize = getBgSize(elem);

			if(allowedBackgroundSize[bgSize]){
				e.target._lazysizesParentFit = bgSize;

				lazySizes.rAF(function(){
					e.target.setAttribute('data-parent-fit', bgSize);
					if(e.target._lazysizesParentFit){
						delete e.target._lazysizesParentFit;
					}
				});
			}
		}
	}, true);

	document.documentElement.addEventListener('lazybeforesizes', function(e){
		if(e.defaultPrevented || !e.target._lazybgset || e.detail.instance != lazySizes){return;}
		e.detail.width = proxyWidth(e.target._lazybgset);
	});
}));
}(ls_bgset));

var ls_respimg = {exports: {}};

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes) {
	var polyfill;
	var lazySizesCfg = lazySizes.cfg;
	var img = document.createElement('img');
	var supportSrcset = ('sizes' in img) && ('srcset' in img);
	var regHDesc = /\s+\d+h/g;
	var fixEdgeHDescriptor = (function(){
		var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
		var forEach = Array.prototype.forEach;

		return function(){
			var img = document.createElement('img');
			var removeHDescriptors = function(source){
				var ratio, match;
				var srcset = source.getAttribute(lazySizesCfg.srcsetAttr);
				if(srcset){
					if((match = srcset.match(regDescriptors))){
						if(match[2] == 'w'){
							ratio = match[1] / match[3];
						} else {
							ratio = match[3] / match[1];
						}

						if(ratio){
							source.setAttribute('data-aspectratio', ratio);
						}
						source.setAttribute(lazySizesCfg.srcsetAttr, srcset.replace(regHDesc, ''));
					}
				}
			};
			var handler = function(e){
				if(e.detail.instance != lazySizes){return;}
				var picture = e.target.parentNode;

				if(picture && picture.nodeName == 'PICTURE'){
					forEach.call(picture.getElementsByTagName('source'), removeHDescriptors);
				}
				removeHDescriptors(e.target);
			};

			var test = function(){
				if(!!img.currentSrc){
					document.removeEventListener('lazybeforeunveil', handler);
				}
			};

			document.addEventListener('lazybeforeunveil', handler);

			img.onload = test;
			img.onerror = test;

			img.srcset = 'data:,a 1w 1h';

			if(img.complete){
				test();
			}
		};
	})();

	if(!lazySizesCfg.supportsType){
		lazySizesCfg.supportsType = function(type/*, elem*/){
			return !type;
		};
	}

	if (window.HTMLPictureElement && supportSrcset) {
		if(!lazySizes.hasHDescriptorFix && document.msElementsFromPoint){
			lazySizes.hasHDescriptorFix = true;
			fixEdgeHDescriptor();
		}
		return;
	}

	if(window.picturefill || lazySizesCfg.pf){return;}

	lazySizesCfg.pf = function(options){
		var i, len;
		if(window.picturefill){return;}
		for(i = 0, len = options.elements.length; i < len; i++){
			polyfill(options.elements[i]);
		}
	};

	// partial polyfill
	polyfill = (function(){
		var ascendingSort = function( a, b ) {
			return a.w - b.w;
		};
		var regPxLength = /^\s*\d+\.*\d*px\s*$/;
		var reduceCandidate = function (srces) {
			var lowerCandidate, bonusFactor;
			var len = srces.length;
			var candidate = srces[len -1];
			var i = 0;

			for(i; i < len;i++){
				candidate = srces[i];
				candidate.d = candidate.w / srces.w;

				if(candidate.d >= srces.d){
					if(!candidate.cached && (lowerCandidate = srces[i - 1]) &&
						lowerCandidate.d > srces.d - (0.13 * Math.pow(srces.d, 2.2))){

						bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

						if(lowerCandidate.cached) {
							lowerCandidate.d += 0.15 * bonusFactor;
						}

						if(lowerCandidate.d + ((candidate.d - srces.d) * bonusFactor) > srces.d){
							candidate = lowerCandidate;
						}
					}
					break;
				}
			}
			return candidate;
		};

		var parseWsrcset = (function(){
			var candidates;
			var regWCandidates = /(([^,\s].[^\s]+)\s+(\d+)w)/g;
			var regMultiple = /\s/;
			var addCandidate = function(match, candidate, url, wDescriptor){
				candidates.push({
					c: candidate,
					u: url,
					w: wDescriptor * 1
				});
			};

			return function(input){
				candidates = [];
				input = input.trim();
				input
					.replace(regHDesc, '')
					.replace(regWCandidates, addCandidate)
				;

				if(!candidates.length && input && !regMultiple.test(input)){
					candidates.push({
						c: input,
						u: input,
						w: 99
					});
				}

				return candidates;
			};
		})();

		var runMatchMedia = function(){
			if(runMatchMedia.init){return;}

			runMatchMedia.init = true;
			addEventListener('resize', (function(){
				var timer;
				var matchMediaElems = document.getElementsByClassName('lazymatchmedia');
				var run = function(){
					var i, len;
					for(i = 0, len = matchMediaElems.length; i < len; i++){
						polyfill(matchMediaElems[i]);
					}
				};

				return function(){
					clearTimeout(timer);
					timer = setTimeout(run, 66);
				};
			})());
		};

		var createSrcset = function(elem, isImage){
			var parsedSet;
			var srcSet = elem.getAttribute('srcset') || elem.getAttribute(lazySizesCfg.srcsetAttr);

			if(!srcSet && isImage){
				srcSet = !elem._lazypolyfill ?
					(elem.getAttribute(lazySizesCfg.srcAttr) || elem.getAttribute('src')) :
					elem._lazypolyfill._set
				;
			}

			if(!elem._lazypolyfill || elem._lazypolyfill._set != srcSet){

				parsedSet = parseWsrcset( srcSet || '' );
				if(isImage && elem.parentNode){
					parsedSet.isPicture = elem.parentNode.nodeName.toUpperCase() == 'PICTURE';

					if(parsedSet.isPicture){
						if(window.matchMedia){
							lazySizes.aC(elem, 'lazymatchmedia');
							runMatchMedia();
						}
					}
				}

				parsedSet._set = srcSet;
				Object.defineProperty(elem, '_lazypolyfill', {
					value: parsedSet,
					writable: true
				});
			}
		};

		var getX = function(elem){
			var dpr = window.devicePixelRatio || 1;
			var optimum = lazySizes.getX && lazySizes.getX(elem);
			return Math.min(optimum || dpr, 2.5, dpr);
		};

		var matchesMedia = function(media){
			if(window.matchMedia){
				matchesMedia = function(media){
					return !media || (matchMedia(media) || {}).matches;
				};
			} else {
				return !media;
			}

			return matchesMedia(media);
		};

		var getCandidate = function(elem){
			var sources, i, len, source, srces, src, width;

			source = elem;
			createSrcset(source, true);
			srces = source._lazypolyfill;

			if(srces.isPicture){
				for(i = 0, sources = elem.parentNode.getElementsByTagName('source'), len = sources.length; i < len; i++){
					if( lazySizesCfg.supportsType(sources[i].getAttribute('type'), elem) && matchesMedia( sources[i].getAttribute('media')) ){
						source = sources[i];
						createSrcset(source);
						srces = source._lazypolyfill;
						break;
					}
				}
			}

			if(srces.length > 1){
				width = source.getAttribute('sizes') || '';
				width = regPxLength.test(width) && parseInt(width, 10) || lazySizes.gW(elem, elem.parentNode);
				srces.d = getX(elem);
				if(!srces.src || !srces.w || srces.w < width){
					srces.w = width;
					src = reduceCandidate(srces.sort(ascendingSort));
					srces.src = src;
				} else {
					src = srces.src;
				}
			} else {
				src = srces[0];
			}

			return src;
		};

		var p = function(elem){
			if(supportSrcset && elem.parentNode && elem.parentNode.nodeName.toUpperCase() != 'PICTURE'){return;}
			var candidate = getCandidate(elem);

			if(candidate && candidate.u && elem._lazypolyfill.cur != candidate.u){
				elem._lazypolyfill.cur = candidate.u;
				candidate.cached = true;
				elem.setAttribute(lazySizesCfg.srcAttr, candidate.u);
				elem.setAttribute('src', candidate.u);
			}
		};

		p.parse = parseWsrcset;

		return p;
	})();

	if(lazySizesCfg.loadedClass && lazySizesCfg.loadingClass){
		(function(){
			var sels = [];
			['img[sizes$="px"][srcset].', 'picture > img:not([srcset]).'].forEach(function(sel){
				sels.push(sel + lazySizesCfg.loadedClass);
				sels.push(sel + lazySizesCfg.loadingClass);
			});
			lazySizesCfg.pf({
				elements: document.querySelectorAll(sels.join(', '))
			});
		})();

	}
}));
}(ls_respimg));

/**
 * A collection of shims that provide minimal functionality of the ES6 collections.
 *
 * These implementations are not meant to be used outside of the ResizeObserver
 * modules as they cover only a limited range of use cases.
 */
/* eslint-disable require-jsdoc, valid-jsdoc */
var MapShim = (function () {
    if (typeof Map !== 'undefined') {
        return Map;
    }
    /**
     * Returns index in provided array that matches the specified key.
     *
     * @param {Array<Array>} arr
     * @param {*} key
     * @returns {number}
     */
    function getIndex(arr, key) {
        var result = -1;
        arr.some(function (entry, index) {
            if (entry[0] === key) {
                result = index;
                return true;
            }
            return false;
        });
        return result;
    }
    return /** @class */ (function () {
        function class_1() {
            this.__entries__ = [];
        }
        Object.defineProperty(class_1.prototype, "size", {
            /**
             * @returns {boolean}
             */
            get: function () {
                return this.__entries__.length;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * @param {*} key
         * @returns {*}
         */
        class_1.prototype.get = function (key) {
            var index = getIndex(this.__entries__, key);
            var entry = this.__entries__[index];
            return entry && entry[1];
        };
        /**
         * @param {*} key
         * @param {*} value
         * @returns {void}
         */
        class_1.prototype.set = function (key, value) {
            var index = getIndex(this.__entries__, key);
            if (~index) {
                this.__entries__[index][1] = value;
            }
            else {
                this.__entries__.push([key, value]);
            }
        };
        /**
         * @param {*} key
         * @returns {void}
         */
        class_1.prototype.delete = function (key) {
            var entries = this.__entries__;
            var index = getIndex(entries, key);
            if (~index) {
                entries.splice(index, 1);
            }
        };
        /**
         * @param {*} key
         * @returns {void}
         */
        class_1.prototype.has = function (key) {
            return !!~getIndex(this.__entries__, key);
        };
        /**
         * @returns {void}
         */
        class_1.prototype.clear = function () {
            this.__entries__.splice(0);
        };
        /**
         * @param {Function} callback
         * @param {*} [ctx=null]
         * @returns {void}
         */
        class_1.prototype.forEach = function (callback, ctx) {
            if (ctx === void 0) { ctx = null; }
            for (var _i = 0, _a = this.__entries__; _i < _a.length; _i++) {
                var entry = _a[_i];
                callback.call(ctx, entry[1], entry[0]);
            }
        };
        return class_1;
    }());
})();

/**
 * Detects whether window and document objects are available in current environment.
 */
var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && window.document === document;

// Returns global object of a current environment.
var global$1 = (function () {
    if (typeof global !== 'undefined' && global.Math === Math) {
        return global;
    }
    if (typeof self !== 'undefined' && self.Math === Math) {
        return self;
    }
    if (typeof window !== 'undefined' && window.Math === Math) {
        return window;
    }
    // eslint-disable-next-line no-new-func
    return Function('return this')();
})();

/**
 * A shim for the requestAnimationFrame which falls back to the setTimeout if
 * first one is not supported.
 *
 * @returns {number} Requests' identifier.
 */
var requestAnimationFrame$1 = (function () {
    if (typeof requestAnimationFrame === 'function') {
        // It's required to use a bounded function because IE sometimes throws
        // an "Invalid calling object" error if rAF is invoked without the global
        // object on the left hand side.
        return requestAnimationFrame.bind(global$1);
    }
    return function (callback) { return setTimeout(function () { return callback(Date.now()); }, 1000 / 60); };
})();

// Defines minimum timeout before adding a trailing call.
var trailingTimeout = 2;
/**
 * Creates a wrapper function which ensures that provided callback will be
 * invoked only once during the specified delay period.
 *
 * @param {Function} callback - Function to be invoked after the delay period.
 * @param {number} delay - Delay after which to invoke callback.
 * @returns {Function}
 */
function throttle (callback, delay) {
    var leadingCall = false, trailingCall = false, lastCallTime = 0;
    /**
     * Invokes the original callback function and schedules new invocation if
     * the "proxy" was called during current request.
     *
     * @returns {void}
     */
    function resolvePending() {
        if (leadingCall) {
            leadingCall = false;
            callback();
        }
        if (trailingCall) {
            proxy();
        }
    }
    /**
     * Callback invoked after the specified delay. It will further postpone
     * invocation of the original function delegating it to the
     * requestAnimationFrame.
     *
     * @returns {void}
     */
    function timeoutCallback() {
        requestAnimationFrame$1(resolvePending);
    }
    /**
     * Schedules invocation of the original function.
     *
     * @returns {void}
     */
    function proxy() {
        var timeStamp = Date.now();
        if (leadingCall) {
            // Reject immediately following calls.
            if (timeStamp - lastCallTime < trailingTimeout) {
                return;
            }
            // Schedule new call to be in invoked when the pending one is resolved.
            // This is important for "transitions" which never actually start
            // immediately so there is a chance that we might miss one if change
            // happens amids the pending invocation.
            trailingCall = true;
        }
        else {
            leadingCall = true;
            trailingCall = false;
            setTimeout(timeoutCallback, delay);
        }
        lastCallTime = timeStamp;
    }
    return proxy;
}

// Minimum delay before invoking the update of observers.
var REFRESH_DELAY = 20;
// A list of substrings of CSS properties used to find transition events that
// might affect dimensions of observed elements.
var transitionKeys = ['top', 'right', 'bottom', 'left', 'width', 'height', 'size', 'weight'];
// Check if MutationObserver is available.
var mutationObserverSupported = typeof MutationObserver !== 'undefined';
/**
 * Singleton controller class which handles updates of ResizeObserver instances.
 */
var ResizeObserverController = /** @class */ (function () {
    /**
     * Creates a new instance of ResizeObserverController.
     *
     * @private
     */
    function ResizeObserverController() {
        /**
         * Indicates whether DOM listeners have been added.
         *
         * @private {boolean}
         */
        this.connected_ = false;
        /**
         * Tells that controller has subscribed for Mutation Events.
         *
         * @private {boolean}
         */
        this.mutationEventsAdded_ = false;
        /**
         * Keeps reference to the instance of MutationObserver.
         *
         * @private {MutationObserver}
         */
        this.mutationsObserver_ = null;
        /**
         * A list of connected observers.
         *
         * @private {Array<ResizeObserverSPI>}
         */
        this.observers_ = [];
        this.onTransitionEnd_ = this.onTransitionEnd_.bind(this);
        this.refresh = throttle(this.refresh.bind(this), REFRESH_DELAY);
    }
    /**
     * Adds observer to observers list.
     *
     * @param {ResizeObserverSPI} observer - Observer to be added.
     * @returns {void}
     */
    ResizeObserverController.prototype.addObserver = function (observer) {
        if (!~this.observers_.indexOf(observer)) {
            this.observers_.push(observer);
        }
        // Add listeners if they haven't been added yet.
        if (!this.connected_) {
            this.connect_();
        }
    };
    /**
     * Removes observer from observers list.
     *
     * @param {ResizeObserverSPI} observer - Observer to be removed.
     * @returns {void}
     */
    ResizeObserverController.prototype.removeObserver = function (observer) {
        var observers = this.observers_;
        var index = observers.indexOf(observer);
        // Remove observer if it's present in registry.
        if (~index) {
            observers.splice(index, 1);
        }
        // Remove listeners if controller has no connected observers.
        if (!observers.length && this.connected_) {
            this.disconnect_();
        }
    };
    /**
     * Invokes the update of observers. It will continue running updates insofar
     * it detects changes.
     *
     * @returns {void}
     */
    ResizeObserverController.prototype.refresh = function () {
        var changesDetected = this.updateObservers_();
        // Continue running updates if changes have been detected as there might
        // be future ones caused by CSS transitions.
        if (changesDetected) {
            this.refresh();
        }
    };
    /**
     * Updates every observer from observers list and notifies them of queued
     * entries.
     *
     * @private
     * @returns {boolean} Returns "true" if any observer has detected changes in
     *      dimensions of it's elements.
     */
    ResizeObserverController.prototype.updateObservers_ = function () {
        // Collect observers that have active observations.
        var activeObservers = this.observers_.filter(function (observer) {
            return observer.gatherActive(), observer.hasActive();
        });
        // Deliver notifications in a separate cycle in order to avoid any
        // collisions between observers, e.g. when multiple instances of
        // ResizeObserver are tracking the same element and the callback of one
        // of them changes content dimensions of the observed target. Sometimes
        // this may result in notifications being blocked for the rest of observers.
        activeObservers.forEach(function (observer) { return observer.broadcastActive(); });
        return activeObservers.length > 0;
    };
    /**
     * Initializes DOM listeners.
     *
     * @private
     * @returns {void}
     */
    ResizeObserverController.prototype.connect_ = function () {
        // Do nothing if running in a non-browser environment or if listeners
        // have been already added.
        if (!isBrowser || this.connected_) {
            return;
        }
        // Subscription to the "Transitionend" event is used as a workaround for
        // delayed transitions. This way it's possible to capture at least the
        // final state of an element.
        document.addEventListener('transitionend', this.onTransitionEnd_);
        window.addEventListener('resize', this.refresh);
        if (mutationObserverSupported) {
            this.mutationsObserver_ = new MutationObserver(this.refresh);
            this.mutationsObserver_.observe(document, {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
            });
        }
        else {
            document.addEventListener('DOMSubtreeModified', this.refresh);
            this.mutationEventsAdded_ = true;
        }
        this.connected_ = true;
    };
    /**
     * Removes DOM listeners.
     *
     * @private
     * @returns {void}
     */
    ResizeObserverController.prototype.disconnect_ = function () {
        // Do nothing if running in a non-browser environment or if listeners
        // have been already removed.
        if (!isBrowser || !this.connected_) {
            return;
        }
        document.removeEventListener('transitionend', this.onTransitionEnd_);
        window.removeEventListener('resize', this.refresh);
        if (this.mutationsObserver_) {
            this.mutationsObserver_.disconnect();
        }
        if (this.mutationEventsAdded_) {
            document.removeEventListener('DOMSubtreeModified', this.refresh);
        }
        this.mutationsObserver_ = null;
        this.mutationEventsAdded_ = false;
        this.connected_ = false;
    };
    /**
     * "Transitionend" event handler.
     *
     * @private
     * @param {TransitionEvent} event
     * @returns {void}
     */
    ResizeObserverController.prototype.onTransitionEnd_ = function (_a) {
        var _b = _a.propertyName, propertyName = _b === void 0 ? '' : _b;
        // Detect whether transition may affect dimensions of an element.
        var isReflowProperty = transitionKeys.some(function (key) {
            return !!~propertyName.indexOf(key);
        });
        if (isReflowProperty) {
            this.refresh();
        }
    };
    /**
     * Returns instance of the ResizeObserverController.
     *
     * @returns {ResizeObserverController}
     */
    ResizeObserverController.getInstance = function () {
        if (!this.instance_) {
            this.instance_ = new ResizeObserverController();
        }
        return this.instance_;
    };
    /**
     * Holds reference to the controller's instance.
     *
     * @private {ResizeObserverController}
     */
    ResizeObserverController.instance_ = null;
    return ResizeObserverController;
}());

/**
 * Defines non-writable/enumerable properties of the provided target object.
 *
 * @param {Object} target - Object for which to define properties.
 * @param {Object} props - Properties to be defined.
 * @returns {Object} Target object.
 */
var defineConfigurable = (function (target, props) {
    for (var _i = 0, _a = Object.keys(props); _i < _a.length; _i++) {
        var key = _a[_i];
        Object.defineProperty(target, key, {
            value: props[key],
            enumerable: false,
            writable: false,
            configurable: true
        });
    }
    return target;
});

/**
 * Returns the global object associated with provided element.
 *
 * @param {Object} target
 * @returns {Object}
 */
var getWindowOf = (function (target) {
    // Assume that the element is an instance of Node, which means that it
    // has the "ownerDocument" property from which we can retrieve a
    // corresponding global object.
    var ownerGlobal = target && target.ownerDocument && target.ownerDocument.defaultView;
    // Return the local global object if it's not possible extract one from
    // provided element.
    return ownerGlobal || global$1;
});

// Placeholder of an empty content rectangle.
var emptyRect = createRectInit(0, 0, 0, 0);
/**
 * Converts provided string to a number.
 *
 * @param {number|string} value
 * @returns {number}
 */
function toFloat(value) {
    return parseFloat(value) || 0;
}
/**
 * Extracts borders size from provided styles.
 *
 * @param {CSSStyleDeclaration} styles
 * @param {...string} positions - Borders positions (top, right, ...)
 * @returns {number}
 */
function getBordersSize(styles) {
    var positions = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        positions[_i - 1] = arguments[_i];
    }
    return positions.reduce(function (size, position) {
        var value = styles['border-' + position + '-width'];
        return size + toFloat(value);
    }, 0);
}
/**
 * Extracts paddings sizes from provided styles.
 *
 * @param {CSSStyleDeclaration} styles
 * @returns {Object} Paddings box.
 */
function getPaddings(styles) {
    var positions = ['top', 'right', 'bottom', 'left'];
    var paddings = {};
    for (var _i = 0, positions_1 = positions; _i < positions_1.length; _i++) {
        var position = positions_1[_i];
        var value = styles['padding-' + position];
        paddings[position] = toFloat(value);
    }
    return paddings;
}
/**
 * Calculates content rectangle of provided SVG element.
 *
 * @param {SVGGraphicsElement} target - Element content rectangle of which needs
 *      to be calculated.
 * @returns {DOMRectInit}
 */
function getSVGContentRect(target) {
    var bbox = target.getBBox();
    return createRectInit(0, 0, bbox.width, bbox.height);
}
/**
 * Calculates content rectangle of provided HTMLElement.
 *
 * @param {HTMLElement} target - Element for which to calculate the content rectangle.
 * @returns {DOMRectInit}
 */
function getHTMLElementContentRect(target) {
    // Client width & height properties can't be
    // used exclusively as they provide rounded values.
    var clientWidth = target.clientWidth, clientHeight = target.clientHeight;
    // By this condition we can catch all non-replaced inline, hidden and
    // detached elements. Though elements with width & height properties less
    // than 0.5 will be discarded as well.
    //
    // Without it we would need to implement separate methods for each of
    // those cases and it's not possible to perform a precise and performance
    // effective test for hidden elements. E.g. even jQuery's ':visible' filter
    // gives wrong results for elements with width & height less than 0.5.
    if (!clientWidth && !clientHeight) {
        return emptyRect;
    }
    var styles = getWindowOf(target).getComputedStyle(target);
    var paddings = getPaddings(styles);
    var horizPad = paddings.left + paddings.right;
    var vertPad = paddings.top + paddings.bottom;
    // Computed styles of width & height are being used because they are the
    // only dimensions available to JS that contain non-rounded values. It could
    // be possible to utilize the getBoundingClientRect if only it's data wasn't
    // affected by CSS transformations let alone paddings, borders and scroll bars.
    var width = toFloat(styles.width), height = toFloat(styles.height);
    // Width & height include paddings and borders when the 'border-box' box
    // model is applied (except for IE).
    if (styles.boxSizing === 'border-box') {
        // Following conditions are required to handle Internet Explorer which
        // doesn't include paddings and borders to computed CSS dimensions.
        //
        // We can say that if CSS dimensions + paddings are equal to the "client"
        // properties then it's either IE, and thus we don't need to subtract
        // anything, or an element merely doesn't have paddings/borders styles.
        if (Math.round(width + horizPad) !== clientWidth) {
            width -= getBordersSize(styles, 'left', 'right') + horizPad;
        }
        if (Math.round(height + vertPad) !== clientHeight) {
            height -= getBordersSize(styles, 'top', 'bottom') + vertPad;
        }
    }
    // Following steps can't be applied to the document's root element as its
    // client[Width/Height] properties represent viewport area of the window.
    // Besides, it's as well not necessary as the <html> itself neither has
    // rendered scroll bars nor it can be clipped.
    if (!isDocumentElement(target)) {
        // In some browsers (only in Firefox, actually) CSS width & height
        // include scroll bars size which can be removed at this step as scroll
        // bars are the only difference between rounded dimensions + paddings
        // and "client" properties, though that is not always true in Chrome.
        var vertScrollbar = Math.round(width + horizPad) - clientWidth;
        var horizScrollbar = Math.round(height + vertPad) - clientHeight;
        // Chrome has a rather weird rounding of "client" properties.
        // E.g. for an element with content width of 314.2px it sometimes gives
        // the client width of 315px and for the width of 314.7px it may give
        // 314px. And it doesn't happen all the time. So just ignore this delta
        // as a non-relevant.
        if (Math.abs(vertScrollbar) !== 1) {
            width -= vertScrollbar;
        }
        if (Math.abs(horizScrollbar) !== 1) {
            height -= horizScrollbar;
        }
    }
    return createRectInit(paddings.left, paddings.top, width, height);
}
/**
 * Checks whether provided element is an instance of the SVGGraphicsElement.
 *
 * @param {Element} target - Element to be checked.
 * @returns {boolean}
 */
var isSVGGraphicsElement = (function () {
    // Some browsers, namely IE and Edge, don't have the SVGGraphicsElement
    // interface.
    if (typeof SVGGraphicsElement !== 'undefined') {
        return function (target) { return target instanceof getWindowOf(target).SVGGraphicsElement; };
    }
    // If it's so, then check that element is at least an instance of the
    // SVGElement and that it has the "getBBox" method.
    // eslint-disable-next-line no-extra-parens
    return function (target) { return (target instanceof getWindowOf(target).SVGElement &&
        typeof target.getBBox === 'function'); };
})();
/**
 * Checks whether provided element is a document element (<html>).
 *
 * @param {Element} target - Element to be checked.
 * @returns {boolean}
 */
function isDocumentElement(target) {
    return target === getWindowOf(target).document.documentElement;
}
/**
 * Calculates an appropriate content rectangle for provided html or svg element.
 *
 * @param {Element} target - Element content rectangle of which needs to be calculated.
 * @returns {DOMRectInit}
 */
function getContentRect(target) {
    if (!isBrowser) {
        return emptyRect;
    }
    if (isSVGGraphicsElement(target)) {
        return getSVGContentRect(target);
    }
    return getHTMLElementContentRect(target);
}
/**
 * Creates rectangle with an interface of the DOMRectReadOnly.
 * Spec: https://drafts.fxtf.org/geometry/#domrectreadonly
 *
 * @param {DOMRectInit} rectInit - Object with rectangle's x/y coordinates and dimensions.
 * @returns {DOMRectReadOnly}
 */
function createReadOnlyRect(_a) {
    var x = _a.x, y = _a.y, width = _a.width, height = _a.height;
    // If DOMRectReadOnly is available use it as a prototype for the rectangle.
    var Constr = typeof DOMRectReadOnly !== 'undefined' ? DOMRectReadOnly : Object;
    var rect = Object.create(Constr.prototype);
    // Rectangle's properties are not writable and non-enumerable.
    defineConfigurable(rect, {
        x: x, y: y, width: width, height: height,
        top: y,
        right: x + width,
        bottom: height + y,
        left: x
    });
    return rect;
}
/**
 * Creates DOMRectInit object based on the provided dimensions and the x/y coordinates.
 * Spec: https://drafts.fxtf.org/geometry/#dictdef-domrectinit
 *
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {number} width - Rectangle's width.
 * @param {number} height - Rectangle's height.
 * @returns {DOMRectInit}
 */
function createRectInit(x, y, width, height) {
    return { x: x, y: y, width: width, height: height };
}

/**
 * Class that is responsible for computations of the content rectangle of
 * provided DOM element and for keeping track of it's changes.
 */
var ResizeObservation = /** @class */ (function () {
    /**
     * Creates an instance of ResizeObservation.
     *
     * @param {Element} target - Element to be observed.
     */
    function ResizeObservation(target) {
        /**
         * Broadcasted width of content rectangle.
         *
         * @type {number}
         */
        this.broadcastWidth = 0;
        /**
         * Broadcasted height of content rectangle.
         *
         * @type {number}
         */
        this.broadcastHeight = 0;
        /**
         * Reference to the last observed content rectangle.
         *
         * @private {DOMRectInit}
         */
        this.contentRect_ = createRectInit(0, 0, 0, 0);
        this.target = target;
    }
    /**
     * Updates content rectangle and tells whether it's width or height properties
     * have changed since the last broadcast.
     *
     * @returns {boolean}
     */
    ResizeObservation.prototype.isActive = function () {
        var rect = getContentRect(this.target);
        this.contentRect_ = rect;
        return (rect.width !== this.broadcastWidth ||
            rect.height !== this.broadcastHeight);
    };
    /**
     * Updates 'broadcastWidth' and 'broadcastHeight' properties with a data
     * from the corresponding properties of the last observed content rectangle.
     *
     * @returns {DOMRectInit} Last observed content rectangle.
     */
    ResizeObservation.prototype.broadcastRect = function () {
        var rect = this.contentRect_;
        this.broadcastWidth = rect.width;
        this.broadcastHeight = rect.height;
        return rect;
    };
    return ResizeObservation;
}());

var ResizeObserverEntry = /** @class */ (function () {
    /**
     * Creates an instance of ResizeObserverEntry.
     *
     * @param {Element} target - Element that is being observed.
     * @param {DOMRectInit} rectInit - Data of the element's content rectangle.
     */
    function ResizeObserverEntry(target, rectInit) {
        var contentRect = createReadOnlyRect(rectInit);
        // According to the specification following properties are not writable
        // and are also not enumerable in the native implementation.
        //
        // Property accessors are not being used as they'd require to define a
        // private WeakMap storage which may cause memory leaks in browsers that
        // don't support this type of collections.
        defineConfigurable(this, { target: target, contentRect: contentRect });
    }
    return ResizeObserverEntry;
}());

var ResizeObserverSPI = /** @class */ (function () {
    /**
     * Creates a new instance of ResizeObserver.
     *
     * @param {ResizeObserverCallback} callback - Callback function that is invoked
     *      when one of the observed elements changes it's content dimensions.
     * @param {ResizeObserverController} controller - Controller instance which
     *      is responsible for the updates of observer.
     * @param {ResizeObserver} callbackCtx - Reference to the public
     *      ResizeObserver instance which will be passed to callback function.
     */
    function ResizeObserverSPI(callback, controller, callbackCtx) {
        /**
         * Collection of resize observations that have detected changes in dimensions
         * of elements.
         *
         * @private {Array<ResizeObservation>}
         */
        this.activeObservations_ = [];
        /**
         * Registry of the ResizeObservation instances.
         *
         * @private {Map<Element, ResizeObservation>}
         */
        this.observations_ = new MapShim();
        if (typeof callback !== 'function') {
            throw new TypeError('The callback provided as parameter 1 is not a function.');
        }
        this.callback_ = callback;
        this.controller_ = controller;
        this.callbackCtx_ = callbackCtx;
    }
    /**
     * Starts observing provided element.
     *
     * @param {Element} target - Element to be observed.
     * @returns {void}
     */
    ResizeObserverSPI.prototype.observe = function (target) {
        if (!arguments.length) {
            throw new TypeError('1 argument required, but only 0 present.');
        }
        // Do nothing if current environment doesn't have the Element interface.
        if (typeof Element === 'undefined' || !(Element instanceof Object)) {
            return;
        }
        if (!(target instanceof getWindowOf(target).Element)) {
            throw new TypeError('parameter 1 is not of type "Element".');
        }
        var observations = this.observations_;
        // Do nothing if element is already being observed.
        if (observations.has(target)) {
            return;
        }
        observations.set(target, new ResizeObservation(target));
        this.controller_.addObserver(this);
        // Force the update of observations.
        this.controller_.refresh();
    };
    /**
     * Stops observing provided element.
     *
     * @param {Element} target - Element to stop observing.
     * @returns {void}
     */
    ResizeObserverSPI.prototype.unobserve = function (target) {
        if (!arguments.length) {
            throw new TypeError('1 argument required, but only 0 present.');
        }
        // Do nothing if current environment doesn't have the Element interface.
        if (typeof Element === 'undefined' || !(Element instanceof Object)) {
            return;
        }
        if (!(target instanceof getWindowOf(target).Element)) {
            throw new TypeError('parameter 1 is not of type "Element".');
        }
        var observations = this.observations_;
        // Do nothing if element is not being observed.
        if (!observations.has(target)) {
            return;
        }
        observations.delete(target);
        if (!observations.size) {
            this.controller_.removeObserver(this);
        }
    };
    /**
     * Stops observing all elements.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.disconnect = function () {
        this.clearActive();
        this.observations_.clear();
        this.controller_.removeObserver(this);
    };
    /**
     * Collects observation instances the associated element of which has changed
     * it's content rectangle.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.gatherActive = function () {
        var _this = this;
        this.clearActive();
        this.observations_.forEach(function (observation) {
            if (observation.isActive()) {
                _this.activeObservations_.push(observation);
            }
        });
    };
    /**
     * Invokes initial callback function with a list of ResizeObserverEntry
     * instances collected from active resize observations.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.broadcastActive = function () {
        // Do nothing if observer doesn't have active observations.
        if (!this.hasActive()) {
            return;
        }
        var ctx = this.callbackCtx_;
        // Create ResizeObserverEntry instance for every active observation.
        var entries = this.activeObservations_.map(function (observation) {
            return new ResizeObserverEntry(observation.target, observation.broadcastRect());
        });
        this.callback_.call(ctx, entries, ctx);
        this.clearActive();
    };
    /**
     * Clears the collection of active observations.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.clearActive = function () {
        this.activeObservations_.splice(0);
    };
    /**
     * Tells whether observer has active observations.
     *
     * @returns {boolean}
     */
    ResizeObserverSPI.prototype.hasActive = function () {
        return this.activeObservations_.length > 0;
    };
    return ResizeObserverSPI;
}());

// Registry of internal observers. If WeakMap is not available use current shim
// for the Map collection as it has all required methods and because WeakMap
// can't be fully polyfilled anyway.
var observers = typeof WeakMap !== 'undefined' ? new WeakMap() : new MapShim();
/**
 * ResizeObserver API. Encapsulates the ResizeObserver SPI implementation
 * exposing only those methods and properties that are defined in the spec.
 */
var ResizeObserver$1 = /** @class */ (function () {
    /**
     * Creates a new instance of ResizeObserver.
     *
     * @param {ResizeObserverCallback} callback - Callback that is invoked when
     *      dimensions of the observed elements change.
     */
    function ResizeObserver(callback) {
        if (!(this instanceof ResizeObserver)) {
            throw new TypeError('Cannot call a class as a function.');
        }
        if (!arguments.length) {
            throw new TypeError('1 argument required, but only 0 present.');
        }
        var controller = ResizeObserverController.getInstance();
        var observer = new ResizeObserverSPI(callback, controller, this);
        observers.set(this, observer);
    }
    return ResizeObserver;
}());
// Expose public methods of ResizeObserver.
[
    'observe',
    'unobserve',
    'disconnect'
].forEach(function (method) {
    ResizeObserver$1.prototype[method] = function () {
        var _a;
        return (_a = observers.get(this))[method].apply(_a, arguments);
    };
});

var index = (function () {
    // Export existing implementation if available.
    if (typeof global$1.ResizeObserver !== 'undefined') {
        return global$1.ResizeObserver;
    }
    return ResizeObserver$1;
})();

var preventDefault = (fn => e => {
  e.preventDefault();
  fn();
});

const selectors$q = {
  imageById: id => `[data-media-item-id='${id}']`,
  imageWrapper: "[data-product-media-wrapper]"
};
const classes$c = {
  hidden: "hidden"
};
function switchImage (container, imageId, inYourSpaceButton) {
  const newImage = n$2(selectors$q.imageWrapper + selectors$q.imageById(imageId), container);
  const newImageMedia = n$2(".media", newImage);
  const otherImages = t$3(`${selectors$q.imageWrapper}:not(${selectors$q.imageById(imageId)})`, container);
  i$1(newImage, classes$c.hidden);

  // Update view in space button
  if (inYourSpaceButton) {
    if (newImageMedia.dataset.mediaType === "model") {
      inYourSpaceButton.setAttribute("data-shopify-model3d-id", newImageMedia.dataset.mediaId);
    }
  }
  otherImages.forEach(image => u$1(image, classes$c.hidden));
}

var svg = {
  add: `
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
      </svg>
    </div>
  `,
  minus: `
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14"/>
      </svg>
    </div>
  `,
  remove: `
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    </div>
  `
};

const {
  strings: strings$1
} = window.theme;
function QuickCart(node) {
  const delegate = new Delegate(node);
  const overlay = n$2("[data-overlay]", node);
  const cartTab = n$2("[data-cart]", node);

  // Cart
  const itemsContainer = n$2("[data-items]", node);
  const empty = n$2("[data-empty]", node);
  const footer = n$2("[data-footer]", node);
  const discounts = n$2("[data-discounts]", footer);
  const subtotal = n$2("[data-subtotal]", footer);
  const closeButton = n$2("[data-close-icon]", node);
  delegate.on("click", "button[data-decrease]", (_, target) => {
    const qty = parseInt(target.closest(".quick-cart__item").dataset.quantity) - 1;
    cart.updateItem(target.dataset.decrease, qty);
  });
  delegate.on("click", "button[data-increase]", (_, target) => {
    const qty = parseInt(target.closest(".quick-cart__item").dataset.quantity) + 1;
    cart.updateItem(target.dataset.increase, qty);
  });
  delegate.on("click", "button[data-remove]", (_, target) => {
    cart.updateItem(target.dataset.remove, 0);
  });
  const cartTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });

  // Initial cart fetch
  cart.get().then(renderCart);

  // Custom event binding
  e$3(document, "apps:product-added-to-cart", () => {
    cart.get().then(data => {
      renderCart(data);
      r$3("cart:updated", {
        cart: data
      });
    });
  });

  // On every update
  c("cart:updated", ({
    cart
  }) => {
    renderCart(cart);
    dispatchCustomEvent("cart:updated", {
      cart: cart
    });
  });
  const events = [e$3([overlay, closeButton], "click", close), e$3(node, "keydown", ({
    keyCode
  }) => {
    if (keyCode === 27) close();
  })];
  c("cart:open", (_, {
    flash
  }) => open());
  function open() {
    u$1(node, "active");
    cartTrap.activate();
    setTimeout(() => {
      disableBodyScroll(node, {
        allowTouchMove: el => {
          while (el && el !== document.body) {
            if (el.getAttribute("data-scroll-lock-ignore") !== null) {
              return true;
            }
            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
      u$1(node, "visible");
      u$1(cartTab, "visible");
      cart.get().then(cart => dispatchCustomEvent("quick-cart:open", {
        cart: cart
      }));
    }, 50);
  }
  function close() {
    i$1(node, "visible");
    setTimeout(() => {
      i$1(node, "active");
      enableBodyScroll(node);
      u$1(cartTab, "visible");
      cartTrap.deactivate();
      dispatchCustomEvent("quick-cart:close");
    }, 350);
  }
  function renderCart(cart) {
    const {
      cart_level_discount_applications: cartDiscounts
    } = cart;
    itemsContainer.innerHTML = renderItems(cart);
    discounts.innerHTML = renderCartDiscounts(cartDiscounts);
    l(footer, "visible", cart.sorted.length);
    l(empty, "visible", !cart.sorted.length);
    l(discounts, "visible", cartDiscounts.length);
    subtotal.innerHTML = formatMoney(cart.total_price);
  }
  function renderItems({
    sorted
  }) {
    return r(sorted.length > 0, sorted.reduce((markup, item) => markup += createItem(item), ""));
  }
  function destroy() {
    events.forEach(unsubscribe => unsubscribe());
  }
  return {
    open,
    close,
    destroy
  };
}
function createItem({
  line_level_discount_allocations: discounts,
  ...item
}) {
  const imgSrc = item.featured_image ? item.featured_image.url : item.image;
  const imgAlt = item.featured_image ? item.featured_image.alt : "";
  const imgUrl = imgSrc && getSizedImageUrl(imgSrc, "240x");
  const image = r(imgSrc, `<img class="image__img lazyload" alt="${imgAlt}" data-src="${imgUrl}" />`);
  const sellingPlanName = item.selling_plan_allocation ? `<p class="fs-body-base c-subdued">${item.selling_plan_allocation.selling_plan.name}</p>` : ``;
  return `
    <div class="quick-cart__item ff-body fs-body-base" data-id="${item.variant_id}" data-quantity="${item.quantity}">
      <div class="quick-cart__item-left">
        <a href="${item.url}">
          <div class="quick-cart__image">${image}</div>
        </a>
      </div>
      <div class="quick-cart__item-middle">
        <h4 class="fs-body-bold"><a href="${item.url}">${item.product_title}</a></h4>
        <div>
          ${r(item.original_price > item.final_price, `<s class="qty">${formatMoney(item.original_price)}</s>`)}
          ${formatMoney(item.final_price)}
          ${r(item.quantity > 1, `<span class="c-subdued">x ${item.quantity}</span>`)}
        </div>
        ${renderUnitPrice(item.unit_price, item.unit_price_measurement)}
        ${renderOptions(item)}
        ${renderLineProperties(item.properties)}
        ${renderLineDiscounts(discounts)}
        ${sellingPlanName}
      </div>
      <div class="quick-cart__control">
        <div class="quick-cart__control-top">
          <button class="quick-cart__button quick-cart__button-increase" data-increase="${item.variant_id}" aria-label="${strings$1.quickCart.addProductQuantity}">
            ${svg.add}
          </button>
          <button class="quick-cart__button quick-cart__button-decrease" data-decrease="${item.variant_id}" aria-label="${strings$1.quickCart.removeProductQuantity}">
            ${svg.minus}
          </button>
          <button class="quick-cart__button quick-cart__button-remove" data-remove="${item.variant_id}" aria-label="${strings$1.quickCart.removeProduct}">
            ${svg.remove}
          </button>
        </div>
      </div>
    </div>
  `;
}
function renderOptions({
  options_with_values: options,
  variant_title
}) {
  return r(options.length > 0 && variant_title, options.reduce((markup, {
    name,
    value
  }) => markup + `<div>${name}: ${value}</div>`, ""));
}
function renderLineProperties(properties) {
  properties = properties || {};
  return r(Boolean(Object.keys(properties).length), Object.keys(properties).reduce((markup, title) => markup + `<div class="quick-cart__item-properties">${properties[title] ? `${title}: ` : ``}${properties[title]}</div>`, ""));
}
function renderCartDiscounts(discounts) {
  return r(Boolean(discounts.length), `
      <ul>
        ${discounts.map(({
    title,
    total_allocated_amount: value
  }) => `<div>${title} (-${formatMoney(value)})</div>`)}
      </ul>
    `);
}
function renderLineDiscounts(discounts) {
  const formatted_discounts = discounts.map(({
    amount,
    discount_application: {
      title
    }
  }) => {
    return `<li>${title} (-${formatMoney(amount)})</li>`;
  });
  return r(Boolean(discounts.length), `<ul class="quick-cart__item-discounts fs-body-base c-subdued">${formatted_discounts}</ul>`);
}
function r(bool, whenTrue) {
  return bool ? whenTrue : ``;
}

function PredictiveSearch(resultsContainer) {
  const cachedResults = {};
  function renderSearchResults(resultsMarkup) {
    resultsContainer.innerHTML = resultsMarkup;
  }
  function getSearchResults(searchTerm) {
    const queryKey = searchTerm.replace(" ", "-").toLowerCase();

    // Render result if it appears within the cache
    if (cachedResults[`${queryKey}`]) {
      renderSearchResults(cachedResults[`${queryKey}`]);
      return Promise.resolve();
    }
    return fetch(`${window.theme.routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search`).then(response => {
      if (!response.ok) {
        const error = new Error(response.status);
        throw error;
      }
      return response.text();
    }).then(text => {
      let resultsMarkup = new DOMParser().parseFromString(text, "text/html").querySelector("#shopify-section-predictive-search").innerHTML;

      // Cache results
      cachedResults[queryKey] = resultsMarkup;
      renderSearchResults(resultsMarkup);
    }).catch(error => {
      throw error;
    });
  }
  return {
    getSearchResults
  };
}

const classes$b = {
  active: 'active',
  visible: 'visible'
};
function QuickSearch (node) {
  const overlay = n$2('[data-overlay]', node);
  const input = n$2('[data-input]', node);
  const clear = n$2('[data-clear]', node);
  const resultsContainer = n$2('[data-results]', node);
  const predictiveSearch = PredictiveSearch(resultsContainer);
  const closeButton = n$2('[data-close-icon]', node);
  const events = [e$3([overlay, closeButton], 'click', close), e$3(clear, 'click', reset), e$3(input, 'input', handleInput), e$3(node, 'keydown', ({
    keyCode
  }) => {
    if (keyCode === 27) close();
  })];
  const trap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  function handleInput(e) {
    if (e.target.value === '') reset();
    l(clear, classes$b.visible, e.target.value !== '');
    l(input.parentNode, classes$b.active, e.target.value !== '');
    predictiveSearch.getSearchResults(e.target.value);
  }

  // Clear contents of the search input and hide results container
  function reset(e) {
    e && e.preventDefault();
    input.value = '';
    i$1(clear, classes$b.visible);
    i$1(input.parentNode, classes$b.active);
    resultsContainer.innerHTML = '';
    input.focus();
  }
  function open() {
    u$1(node, classes$b.active);
    trap.activate();
    setTimeout(() => {
      input.focus();
      disableBodyScroll(node, {
        reserveScrollBarGap: true
      });
      u$1(node, classes$b.visible);
    }, 50);
  }
  function close() {
    i$1(node, classes$b.visible);
    trap.deactivate();
    setTimeout(() => {
      i$1(node, classes$b.active);
      enableBodyScroll(node);
    }, 350);
  }
  function destroy() {
    close();
    events.forEach(unsubscribe => unsubscribe());
  }
  return {
    open,
    close,
    destroy
  };
}

function Navigation(node) {
  if (!node) return;
  const parents = t$3('[data-parent]', node);
  if (!parents) return;
  const delegate = new Delegate(document.body);
  delegate.on('click', '*', e => handleClick(e));
  const events = [e$3(parents, 'click', e => {
    e.preventDefault();
    toggleMenu(e.currentTarget.parentNode);
  }), e$3(node, 'keydown', ({
    keyCode
  }) => {
    if (keyCode === 27) closeAll();
  }), e$3(t$3('.header__links-list > li > a', node), 'focus', e => {
    if (!userIsUsingKeyboard()) return;
    closeAll();
  }), e$3(t$3('[data-link]', node), 'focus', e => {
    e.preventDefault();
    if (!userIsUsingKeyboard()) return;
    const link = e.currentTarget;
    if (link.hasAttribute('data-parent')) {
      toggleMenu(link.parentNode);
    }
    const siblings = t$3('[data-link]', link.parentNode.parentNode);
    siblings.forEach(el => l(t$3('[data-submenu]', el.parentNode), 'active', el === link));
  }),
  // Close everything when focus leaves the main menu
  e$3(t$3('[data-link]', node), 'focusout', e => {
    if (!userIsUsingKeyboard()) return;
    if (e.relatedTarget && !e.relatedTarget.hasAttribute('data-link')) {
      closeAll();
    }
  }),
  // Listen to horizontal scroll to offset inner menus
  e$3(node, 'scroll', () => {
    document.documentElement.style.setProperty('--navigation-menu-offet', `${node.scrollLeft}px`);
  })];
  function userIsUsingKeyboard() {
    return a$1(document.body, 'user-is-tabbing');
  }
  function toggleMenu(el) {
    const menu = n$2('[data-submenu]', el);
    const menuTrigger = n$2('[data-link]', el);
    if (!a$1(menu, 'active')) {
      // Make sure all lvl 2 submenus are closed before opening another
      if (el.parentNode.dataset.depth === '1') {
        closeAll(el.parentNode);
      } else {
        closeAll();
      }
      menuTrigger.setAttribute('aria-expanded', true);
      menu.setAttribute('aria-hidden', false);
      u$1(menu, 'active');
    } else {
      // If the toggle is closing the element from the parent close all internal
      if (a$1(el.parentNode, 'header__links-list')) {
        closeAll();
        return;
      }
      menuTrigger.setAttribute('aria-expanded', false);
      menu.setAttribute('aria-hidden', true);
      i$1(menu, 'active');
    }
  }

  // We want to close the menu when anything is clicked that isn't a submenu
  function handleClick(e) {
    if (!e.target.closest('[data-submenu-parent]')) {
      closeAll();
    }
  }
  function closeAll(target = node) {
    const subMenus = t$3('[data-submenu]', target);
    const parentTriggers = t$3('[data-parent]', target);
    i$1(subMenus, 'active');
    subMenus.forEach(sub => sub.setAttribute('aria-hidden', true));
    parentTriggers.forEach(trig => trig.setAttribute('aria-expanded', false));
  }
  function destroy() {
    delegate.off();
    events.forEach(evt => evt());
  }
  return {
    destroy
  };
}

const selectors$p = {
  clear: "[data-search-clear]",
  input: "[data-input]",
  results: "[data-search-results]",
  search: "[data-search-submit]"
};
function DrawerSearch(container, cb) {
  // Elements
  const input = n$2(selectors$p.input, container);
  const resultsContainer = n$2(selectors$p.results, container);
  const clearButton = n$2(selectors$p.clear, container);
  const searchButton = n$2(selectors$p.search, container);
  const predictiveSearch = PredictiveSearch(resultsContainer);

  // Events
  const inputChange = e$3(input, "input", handleInputChange);
  const clearClick = e$3(clearButton, "click", reset);
  function handleInputChange({
    target: {
      value
    }
  }) {
    if (value === "") {
      reset();
      return;
    }
    l([clearButton, searchButton], "visible", value !== "");
    l(input, "active", value !== "");
    predictiveSearch.getSearchResults(value).then(() => {
      if (typeof cb === "function") {
        // eslint-disable-next-line callback-return
        cb();
      }
    });
  }
  function reset(e) {
    e && e.preventDefault();
    clear();
    input.focus();
    if (typeof cb === "function") {
      // eslint-disable-next-line callback-return
      cb();
    }
  }
  function clear() {
    input.value = "";
    i$1([resultsContainer, clearButton, searchButton], "visible");
    i$1(input, "active");
    resultsContainer.innerHTML = "";
  }
  function destroy() {
    inputChange();
    clearClick();
  }
  return {
    destroy,
    clear
  };
}

const sel$2 = {
  overlay: "[data-overlay]",
  listItem: "[data-list-item]",
  item: "[data-item]",
  allLinks: "[data-all-links]",
  main: "[data-main]",
  primary: "[data-primary-container]",
  searchMenu: "[data-search-menu]",
  animationItems: ".drawer-menu__primary-links > .drawer-menu__item, .drawer-menu__primary-links > .drawer-menu__form",
  // Cross border
  form: ".drawer-menu__form",
  localeInput: "[data-locale-input]",
  currencyInput: "[data-currency-input]"
};
const classes$a = {
  active: "active",
  visible: "visible",
  childVisible: "child-visible"
};
const {
  enableRevealAnimations
} = document.body.dataset;

// Extra space we add to the height of the inner container
const formatHeight = h => h + 8 + "px";
const formatHeightChild = h => h + 168 + "px";
const formatHeightChildMobile = h => h + 108 + "px";
const menu = node => {
  const focusTrap = createFocusTrap(node);

  // The individual link list the merchant selected
  let linksDepth = 0;

  // This is the element that holds the one we move left and right (primary)
  // We also need to assign its height initially so we get smooth transitions
  const main = n$2(sel$2.main, node);

  // Element that holds all the primary links and moves left and right
  const primary = n$2(sel$2.primary, node);

  // Cross border
  const form = n$2(sel$2.form, node);
  const localeInput = n$2(sel$2.localeInput, node);
  const currencyInput = n$2(sel$2.currencyInput, node);
  const search = DrawerSearch(node, updateSearchHeight);

  // Nodes
  const overlay = n$2(sel$2.overlay, node);
  const parents = t$3('[data-item="parent"]', node);
  const parentBack = t$3('[data-item="back"]', node);
  const languages = t$3('[data-item="locale"]', node);
  const currencies = t$3('[data-item="currency"]', node);
  const closeButtons = t$3("[data-drawer-close]", node);
  const animationItems = t$3(sel$2.animationItems, node);
  const searchMenu = n$2(sel$2.searchMenu, node);

  // Init animation
  const reveals = [];
  initRevealAnimation();
  const events = [
  // Click on overlay or close button
  e$3(overlay, "click", close), e$3(closeButtons, "click", close),
  // Esq pressed
  e$3(node, "keydown", ({
    keyCode
  }) => {
    if (keyCode === 27) close();
  }),
  // Element that will navigate to child navigation list
  e$3(parents, "click", clickParent),
  // Element that will navigate back up the tree
  e$3(parentBack, "click", clickBack),
  // Individual language
  e$3(languages, "click", e => handleCrossBorder(e, localeInput)),
  // // Individual currency
  e$3(currencies, "click", e => handleCrossBorder(e, currencyInput))];
  function initRevealAnimation() {
    if (!prefersReducedMotion() && enableRevealAnimations === "true") {
      animationItems.forEach(item => {
        reveals.push(new FadeUpReveal(item, {
          yStart: "40px"
        }));
      });
    }
  }
  function open() {
    u$1(node, classes$a.active);
    if (!prefersReducedMotion() && enableRevealAnimations === "true") {
      reveals.forEach((reveal, i) => {
        reveal.play(window.theme.animation.delayExtraShort * i);
      });
    }
    setTimeout(() => {
      u$1(node, classes$a.visible);
      focusTrap.activate();
      disableBodyScroll(node, {
        allowTouchMove: el => {
          while (el && el !== document.body) {
            if (el.getAttribute("data-scroll-lock-ignore") !== null) {
              return true;
            }
            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
      if (linksDepth === 0) {
        main.style.height = formatHeight(primary.offsetHeight);
      }
    }, 50);
  }
  function close() {
    focusTrap.deactivate();
    i$1(node, classes$a.visible);
    setTimeout(() => {
      i$1(node, classes$a.active);
      enableBodyScroll(node);
      reveals.forEach(reveal => reveal.init());
    }, 660);
  }
  function clickParent(e) {
    e.preventDefault();
    const link = e.currentTarget;
    const childMenu = link.nextElementSibling;
    const firstFocusable = n$2(".drawer-menu__link", childMenu);
    u$1(childMenu, classes$a.visible);
    u$1(link.parentNode, classes$a.childVisible);
    if (childMenu.hasAttribute("data-search-menu")) {
      u$1(node, "search-active");
    }
    main.style.height = isMobile$1() ? formatHeightChildMobile(childMenu.offsetHeight) : formatHeightChild(childMenu.offsetHeight);
    navigate(linksDepth += 1);
    link.setAttribute("aria-expanded", true);
    childMenu.setAttribute("aria-hidden", false);
    setTimeout(() => {
      firstFocusable.focus();
    }, 50);
  }
  function navigate(depth) {
    linksDepth = depth;
    primary.setAttribute("data-depth", depth);
  }
  function clickBack(e) {
    e.preventDefault();
    const menuBefore = e.currentTarget.closest(sel$2.listItem).closest("ul");
    const firstFocusable = n$2(".drawer-menu__link", menuBefore);
    const menu = e.currentTarget.closest("ul");
    const parentLink = n$2(".drawer-menu__link", menu.parentNode);
    i$1(menu, classes$a.visible);
    i$1(parentLink.parentNode, classes$a.childVisible);
    navigate(linksDepth -= 1);
    parentLink.setAttribute("aria-expanded", false);
    menu.setAttribute("aria-hidden", true);
    if (linksDepth === 0) {
      main.style.height = formatHeight(menuBefore.offsetHeight);
    } else {
      main.style.height = isMobile$1() ? formatHeightChildMobile(menuBefore.offsetHeight) : formatHeightChild(menuBefore.offsetHeight);
    }
    if (menu.hasAttribute("data-search-menu")) {
      search.clear();
      i$1(node, "search-active");
    }
    setTimeout(() => {
      firstFocusable.focus();
    }, 50);
  }
  function updateSearchHeight() {
    if (searchMenu) {
      main.style.height = formatHeight(searchMenu.offsetHeight);
    }
  }
  function handleCrossBorder(e, input) {
    const {
      value
    } = e.currentTarget.dataset;
    input.value = value;
    close();
    form.submit();
  }
  function destroy() {
    events.forEach(unsubscribe => unsubscribe());
    enableBodyScroll(node);
    search.destroy();
  }
  return {
    close,
    destroy,
    open
  };
};

function setHeaderHeightVar(height) {
  document.documentElement.style.setProperty("--height-header", height + "px");
}
register("header", {
  onLoad() {
    const {
      enableQuickCart
    } = document.body.dataset;
    const {
      enableStickyHeader,
      transparentHeaderOnHome
    } = this.container.dataset;
    const cartIcon = n$2("[data-js-cart-icon]", this.container);
    const cartIndicator = n$2("[data-js-cart-indicator]", cartIcon);
    const count = n$2("[data-js-cart-count]", this.container);
    const menuButtons = t$3("[data-js-menu-button]", this.container);
    const searchButtons = t$3("[data-search]", this.container);
    const space = n$2("[data-header-space]", document);
    const quickCart = enableQuickCart ? QuickCart(n$2("[data-quick-cart]", this.container)) : null;
    const menu$1 = menu(n$2("[data-drawer-menu]"));
    const quickSearch = QuickSearch(n$2("[data-quick-search]", this.container));
    const navigation = Navigation(n$2("[data-navigation]", this.container));

    // This is done here AND in the liquid so it is responsive in TE but doesn't wait for JS otherwise
    document.body.classList.toggle("header-transparent-on-home", !!transparentHeaderOnHome);

    // These all return a function for cleanup
    this.listeners = [c("cart:updated", ({
      cart
    }) => {
      i$1(cartIndicator, "visible");
      setTimeout(() => u$1(cartIndicator, "visible"), 500);
      count.innerHTML = cart.item_count;
    }), e$3(menuButtons, "click", preventDefault(menu$1.open)), e$3(searchButtons, "click", preventDefault(quickSearch.open))];
    if (enableQuickCart) {
      this.listeners.push(e$3(cartIcon, "click", preventDefault(quickCart.open)));
    }

    // Components return a destroy function for cleanup
    this.components = [menu$1, quickSearch, quickCart];

    // navigation only exists if the header style is Inline links
    navigation && this.components.push(navigation);
    if (enableStickyHeader) {
      // Our header is always sticky (with position: sticky) however at some
      // point we want to adjust the styling (eg. box-shadow) so we toggle
      // the is-sticky class when our arbitrary space element (.header__space)
      // goes in and out of the viewport.
      this.io = new IntersectionObserver(([{
        isIntersecting: visible
      }]) => {
        l(this.container, "is-sticky", !visible);
      });
      this.io.observe(space);
    }

    // This will watch the height of the header and update the --height-header
    // css variable when necessary. That var gets used for the negative top margin
    // to render the page body under the transparent header
    this.ro = new index(([{
      target
    }]) => {
      if (!a$1(target, "is-sticky")) {
        setHeaderHeightVar(target.offsetHeight);
      }
    });
    this.ro.observe(this.container);
  },
  onUnload() {
    this.listeners.forEach(l => l());
    this.components.forEach(c => c.destroy());
    this.io && this.io.disconnect();
    this.ro.disconnect();
  }
});

const selectors$o = {
  form: '.selectors-form',
  list: '[data-disclosure-list]',
  toggle: '[data-disclosure-toggle]',
  input: '[data-disclosure-input]',
  option: '[data-disclosure-option]'
};
const classes$9 = {
  visible: 'disclosure-list--visible'
};
function has(list, selector) {
  return list.map(l => l.contains(selector)).filter(Boolean);
}
function Disclosure(node) {
  const form = node.closest(selectors$o.form);
  const list = n$2(selectors$o.list, node);
  const toggle = n$2(selectors$o.toggle, node);
  const input = n$2(selectors$o.input, node);
  const options = t$3(selectors$o.option, node);
  const events = [e$3(toggle, 'click', handleToggle), e$3(options, 'click', submitForm), e$3(document, 'click', handleBodyClick), e$3(toggle, 'focusout', handleToggleFocusOut), e$3(list, 'focusout', handleListFocusOut), e$3(node, 'keyup', handleKeyup)];
  function submitForm(evt) {
    evt.preventDefault();
    const {
      value
    } = evt.currentTarget.dataset;
    input.value = value;
    form.submit();
  }
  function handleToggleFocusOut(evt) {
    const disclosureLostFocus = has([node], evt.relatedTarget).length === 0;
    if (disclosureLostFocus) {
      hideList();
    }
  }
  function handleListFocusOut(evt) {
    const childInFocus = has([node], evt.relatedTarget).length > 0;
    const isVisible = list.classList.contains(classes$9.visible);
    if (isVisible && !childInFocus) {
      hideList();
    }
  }
  function handleKeyup(evt) {
    if (evt.which !== 27) return;
    hideList();
    toggle.focus();
  }
  function handleToggle(evt) {
    const ariaExpanded = evt.currentTarget.getAttribute('aria-expanded') === true;
    evt.currentTarget.setAttribute('aria-expanded', !ariaExpanded);
    list.classList.toggle(classes$9.visible);
  }
  function handleBodyClick(evt) {
    const isOption = has([node], evt.target).length > 0;
    const isVisible = list.classList.contains(classes$9.visible);
    if (isVisible && !isOption) {
      hideList();
    }
  }
  function hideList() {
    toggle.setAttribute('aria-expanded', false);
    list.classList.remove(classes$9.visible);
  }
  function unload() {
    events.forEach(evt => evt());
  }
  return {
    unload
  };
}

const selectors$n = {
  disclosure: '[data-disclosure]',
  header: '[data-header]'
};
register('footer', {
  crossBorder: {},
  onLoad() {
    const headers = t$3(selectors$n.header, this.container);
    this.headerClick = e$3(headers, 'click', handleHeaderClick);
    function handleHeaderClick({
      currentTarget
    }) {
      const {
        nextElementSibling: content
      } = currentTarget;
      l(currentTarget, 'open', !isVisible(content));
      slideStop(content);
      if (isVisible(content)) {
        slideUp(content);
      } else {
        slideDown(content);
      }
    }

    // Wire up Cross Border disclosures
    const cbSelectors = t$3(selectors$n.disclosure, this.container);
    if (cbSelectors) {
      cbSelectors.forEach(selector => {
        const {
          disclosure: d
        } = selector.dataset;
        this.crossBorder[d] = Disclosure(selector);
      });
    }
  },
  onUnload() {
    this.headerClick();
    Object.keys(this.crossBorder).forEach(t => this.crossBorder[t].unload());
  }
});

function localStorageAvailable() {
  var test = "test";
  try {
    localStorage.setItem(test, test);
    if (localStorage.getItem(test) !== test) {
      return false;
    }
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
const PREFIX = "fluco_";
function getStorage(key) {
  if (!localStorageAvailable()) return null;
  return JSON.parse(localStorage.getItem(PREFIX + key));
}
function setStorage(key, val) {
  if (!localStorageAvailable()) return null;
  localStorage.setItem(PREFIX + key, val);
  return true;
}

function Popup(container) {
  const focusTrap = createFocusTrap(container, {
    allowOutsideClick: false
  });
  const {
    id,
    popupType,
    timeout
  } = container.dataset;
  const storageKey = `popup-${id}`;
  const ageVerifiedKey = `age-verified-${id}`;
  const ageIsVerified = Boolean(getStorage(ageVerifiedKey));
  let bodyLeave = () => {};
  const mouseleave = e => {
    if (!e.relatedTarget && !e.toElement) {
      showPopup();
      bodyLeave();
    }
  };
  const events = [];

  // Initialize popup based on type
  const popupTypes = {
    "age_popup": () => {
      const verifyBtn = n$2("[data-verify-age]", container);
      if (verifyBtn && !window.Shopify.designMode) {
        events.push(e$3([verifyBtn], "click", e => {
          e.preventDefault();
          hidePopup();
        }));
      }
      if (!ageIsVerified) {
        showPopup();
      }
    },
    "popup": () => {
      if (!window.Shopify.designMode) {
        const closeBtn = n$2("[data-close]", container);
        const overlay = n$2("[data-overlay]", container);
        events.push(e$3([closeBtn, overlay], "click", e => {
          e.preventDefault();
          hidePopup();
        }));
        events.push(e$3(container, "keydown", ({
          keyCode
        }) => {
          if (keyCode === 27) hidePopup();
        }));
      }
      if (!getStorage(storageKey) && isMobile$1()) {
        setTimeout(() => showPopup(), parseInt(timeout));
      } else if (!getStorage(storageKey)) {
        bodyLeave = e$3(document.body, "mouseout", mouseleave);
      }
    }
  };
  popupTypes[popupType]();
  function showPopup() {
    u$1(container, "visible");
    if (popupType === "age_popup") {
      disableBodyScroll(container);
      focusTrap.activate();
    }
  }
  function hidePopup() {
    setStorage(storageKey, JSON.stringify(new Date()));
    i$1(container, "visible");
    if (popupType === "age_popup") {
      setStorage(ageVerifiedKey, JSON.stringify(new Date()));
      setTimeout(() => {
        focusTrap.deactivate();
        enableBodyScroll(container);
      }, 330);
    }
  }
  function unload() {
    bodyLeave();
    events.forEach(unsubscribe => unsubscribe());
    if (popupType === "age_popup") {
      focusTrap.deactivate();
      enableBodyScroll(container);
    }
  }
  return {
    unload,
    showPopup,
    hidePopup
  };
}

register("popup", {
  onLoad() {
    this.popups = t$3("[data-popup]", this.container).map(popup => {
      return {
        contructor: Popup(popup),
        element: popup
      };
    });
  },
  onBlockSelect({
    target
  }) {
    const targetPopup = this.popups.find(o => o.element === target);
    targetPopup.contructor.showPopup();
  },
  onBlockDeselect({
    target
  }) {
    const targetPopup = this.popups.find(o => o.element === target);
    targetPopup.contructor.hidePopup();
  },
  onUnload() {
    this.popups.forEach(popup => popup.contructor?.unload());
  }
});

const slideshowOpts = {
  adaptiveHeight: false,
  draggable: false,
  fade: true,
  pageDots: false,
  prevNextButtons: false,
  wrapAround: true,
  pauseAutoPlayOnHover: !window.Shopify.designMode
};
const classes$8 = {
  active: "is-active"
};
register("announcement-bar", {
  timer: null,
  listeners: [],
  onLoad() {
    const timing = parseInt(this.container.dataset.timing);
    const announcements = t$3("[data-announcement]", this.container);
    if (!announcements.length) return;
    document.documentElement.style.setProperty("--announcement-height", this.container.offsetHeight + "px");
    if (announcements.length > 1) {
      import(flu.chunks.flickity).then(({
        Flickity
      }) => {
        this.slideshow = new Flickity(this.container, {
          ...slideshowOpts,
          autoPlay: timing,
          on: {
            // Need to add a modifier to animate after the first slide has changed
            change(index) {
              announcements.forEach((el, i) => l(el, classes$8.active, index === i));
            }
          }
        });
        this.slideshow.on("pointerUp", () => this.handleRestart());
        r$3("announcement-bar:initialized");
      });
      this.listeners.push(e$3(this.container, "touchend", () => this.handleRestart()));
    } else {
      u$1(announcements[0], "is-active", "is-selected");
    }
  },
  handleRestart() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.slideshow.playPlayer(), 3500);
  },
  handleBlockSelect(slideIndex) {
    this.slideshow.pausePlayer();
    this.slideshow.select(slideIndex);
  },
  onBlockSelect({
    target
  }) {
    if (this.slideshow) {
      this.handleBlockSelect(target.dataset.index);
    } else {
      // Listen for initalization if slideshow does not exist
      this.listeners.push(c("announcement-bar:initialized", () => {
        this.handleBlockSelect(target.dataset.index);
      }));
    }
  },
  onBlockDeselect() {
    if (this.slideshow) {
      this.slideshow.unpausePlayer();
    } else {
      // Listen for initalization if slideshow does not exist
      this.listeners.push(c("announcement-bar:initialized", () => {
        this.slideshow.unpausePlayer();
      }));
    }
  },
  onUnload() {
    this.slideshow && this.slideshow.destroy();
    this.listeners.forEach(l => l());
  }
});

const selectors$m = {
  slider: '[data-slider]'
};
register('featured-collection', {
  onLoad() {
    this.sliderElement = n$2(selectors$m.slider, this.container);
    this.columns = parseInt(this.container.dataset.columns);
    this.sliderElement.style.opacity = 0;
    const carouselWraps = this.container.dataset.carouselWraps === 'true';
    this.carousel = Carousel(this.container, 'featured-collection', {
      wrapAround: carouselWraps,
      onReady: () => {
        this.animateProductItem = ProductItem(this.container);
        this.AnimateFeaturedCollection = AnimateFeaturedCollection(this.container);
      }
    });
  },
  onUnload() {
    this.carousel.destroy();
    this.animateProductItem && this.animateProductItem.destroy();
    this.AnimateFeaturedCollection?.destroy();
  }
});

const selectors$l = {
  slider: '[data-slider]'
};
register('featured-collection-row', {
  events: [],
  onLoad() {
    this.sliderElement = n$2(selectors$l.slider, this.container);
    this.sliderElement.style.opacity = 0;
    this.carousel = Carousel(this.container, 'featured-collection-row', {
      wrapAround: false,
      adaptiveHeight: false,
      onReady: () => {
        this.animateProductItem = ProductItem(this.container);
        this.AnimateFeaturedCollectionRow = AnimateFeaturedCollectionRow(this.container);
      }
    });
    this.events.push(c('featured-collection-row:initialized', () => {
      if (!window.matchMedia('(min-width: 45em)').matches) {
        this.carousel.select(1);
      }
    }));
  },
  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
    this.carousel && this.carousel.destroy();
    this.animateProductItem && this.animateProductItem.destroy();
    this.AnimateFeaturedCollectionRow?.destroy();
  }
});

const selectors$k = {
  close: '[data-close]',
  slider: '[data-slider]',
  slide: '[data-slide]',
  imageById: id => `[data-id='${id}']`,
  navItem: '[data-nav-item]',
  wrapper: '.lightbox__images-wrapper',
  prevButton: '[data-prev]',
  nextButton: '[data-next]'
};
const classes$7 = {
  visible: 'visible',
  active: 'active',
  zoom: 'zoom'
};
function Lightbox(node) {
  if (!node) return;
  const trap = createFocusTrap(node);
  const navItems = t$3(selectors$k.navItem, node);
  const wrapper = n$2(selectors$k.wrapper, node);
  const images = t$3(selectors$k.slide, node);
  const previousButton = n$2(selectors$k.prevButton, node);
  const nextButton = n$2(selectors$k.nextButton, node);
  const sliderContainer = n$2(selectors$k.slider, node);
  let events, slider;
  import(flu.chunks.flickity).then(({
    Flickity
  }) => {
    slider = new Flickity(sliderContainer, {
      adaptiveHeight: true,
      draggable: isMobile$1({
        tablet: true,
        featureDetect: true
      }),
      prevNextButtons: false,
      wrapAround: false,
      pageDots: false
    });
    if (images.length > 1) {
      slider.on('scroll', progress => {
        _resetZoom();
        const progressScale = progress * 100;

        // https://github.com/metafizzy/flickity/issues/289
        previousButton.disabled = progressScale < 1;
        nextButton.disabled = progressScale > 99;
      });
      slider.on('select', () => {
        navItems.forEach(item => i$1(item, classes$7.active));
        u$1(navItems[slider.selectedIndex], classes$7.active);
        navItems[slider.selectedIndex].scrollIntoView({
          behavior: 'smooth',
          inline: 'nearest'
        });
      });
    } else {
      u$1(previousButton, 'hidden');
      u$1(nextButton, 'hidden');
      previousButton.disabled = true;
      nextButton.disabled = true;
    }
    events = [e$3(n$2(selectors$k.close, node), 'click', e => {
      e.preventDefault();
      close();
    }), e$3(node, 'keydown', ({
      keyCode
    }) => {
      if (keyCode === 27) close();
    }), e$3(navItems, 'click', e => {
      e.preventDefault();
      const {
        index
      } = e.currentTarget.dataset;
      slider.select(index);
    }), e$3(images, 'click', e => {
      e.preventDefault();
      _handleZoom(e);
    }), e$3(previousButton, 'click', () => slider.previous()), e$3(nextButton, 'click', () => slider.next())];
  });
  function _handleZoom(event) {
    const image = event.currentTarget;
    const zoomed = image.classList.contains(classes$7.zoom);
    l(image, classes$7.zoom, !zoomed);
    if (zoomed) {
      _resetZoom(image);
      return;
    }
    const x = event.clientX;
    const y = event.clientY + wrapper.scrollTop - sliderContainer.offsetTop;
    const xDelta = (x - image.clientWidth / 2) * -1;
    const yDelta = (y - image.clientHeight / 2) * -1;
    image.style.transform = `translate3d(${xDelta}px, ${yDelta}px, 0) scale(2)`;
  }
  function _resetZoom(image) {
    if (image) {
      i$1(image, classes$7.zoom);
      image.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
      return;
    }
    images.forEach(image => {
      i$1(image, classes$7.zoom);
      image.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
    });
  }
  function open(id) {
    u$1(node, classes$7.active);
    setTimeout(() => {
      u$1(node, classes$7.visible);
      disableBodyScroll(node, {
        allowTouchMove: el => {
          while (el && el !== document.body) {
            if (el.getAttribute('data-scroll-lock-ignore') !== null) {
              return true;
            }
            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
      trap.activate();
      const image = n$2(selectors$k.imageById(id), node);
      const {
        slideIndex
      } = image.dataset;
      slider && slider.select(slideIndex, false, true);
    }, 50);
  }
  function close() {
    _resetZoom();
    i$1(node, classes$7.visible);
    setTimeout(() => {
      i$1(node, classes$7.active);
      enableBodyScroll(node);
      trap.deactivate();
    }, 300);
  }
  function destroy() {
    events.forEach(unsubscribe => unsubscribe());
    slider && slider.destroy();
  }
  return {
    destroy,
    open
  };
}

function Media(node) {
  const elements = t$3("[data-interactive]", node);
  if (!elements.length) return;
  const {
    Shopify,
    YT
  } = window;
  const acceptedTypes = ["video", "model", "external_video"];
  let activeMedia = null;
  let featuresLoaded = false;
  let instances = {};
  if (featuresLoaded) {
    elements.forEach(initElement);
  }
  window.Shopify.loadFeatures([{
    name: "model-viewer-ui",
    version: "1.0"
  }, {
    name: "shopify-xr",
    version: "1.0"
  }, {
    name: "video-ui",
    version: "1.0"
  }], () => {
    featuresLoaded = true;
    if ("YT" in window && Boolean(YT.loaded)) {
      elements.forEach(initElement);
    } else {
      window.onYouTubeIframeAPIReady = function () {
        elements.forEach(initElement);
      };
    }
  });
  function initElement(el) {
    const {
      mediaId,
      mediaType
    } = el.dataset;
    if (!mediaType || !acceptedTypes.includes(mediaType)) return;
    if (Object.keys(instances).includes(mediaId)) return;
    let instance = {
      id: mediaId,
      type: mediaType,
      container: el,
      media: el.children[0]
    };
    switch (instance.type) {
      case "video":
        instance.player = new Shopify.Plyr(instance.media, {
          loop: {
            active: el.dataset.loop == "true"
          }
        });
        break;
      case "external_video":
        instance.player = new YT.Player(instance.media);
        break;
      case "model":
        instance.viewer = new Shopify.ModelViewerUI(n$2("model-viewer", el));
        e$3(n$2(".model-poster", el), "click", e => {
          e.preventDefault();
          playModel(instance);
        });
        break;
    }
    instances[mediaId] = instance;
    if (instance.player) {
      if (instance.type === "video") {
        instance.player.on("playing", () => {
          pauseActiveMedia(instance);
          activeMedia = instance;
        });
      } else if (instance.type === "external_video") {
        instance.player.addEventListener("onStateChange", event => {
          if (event.data === 1) {
            pauseActiveMedia(instance);
            activeMedia = instance;
          }
        });
      }
    }
  }
  function playModel(instance) {
    pauseActiveMedia(instance);
    instance.viewer.play();
    u$1(instance.container, "model-active");
    activeMedia = instance;
    setTimeout(() => {
      n$2("model-viewer", instance.container).focus();
    }, 300);
  }
  function pauseActiveMedia(instance) {
    if (!activeMedia || instance == activeMedia) return;
    if (activeMedia.player) {
      if (activeMedia.type === "video") {
        activeMedia.player.pause();
      } else if (activeMedia.type === "external_video") {
        activeMedia.player.pauseVideo();
      }
      activeMedia = null;
      return;
    }
    if (activeMedia.viewer) {
      i$1(activeMedia.container, "model-active");
      activeMedia.viewer.pause();
      activeMedia = null;
    }
  }
  return {
    pauseActiveMedia
  };
}

const selectors$j = {
  drawerTrigger: '[data-store-availability-drawer-trigger]',
  drawer: '[data-store-availability-drawer]',
  productTitle: '[data-store-availability-product-title]',
  storeList: '[data-store-availability-list-content]'
};
const storeAvailability = (container, product, variant, options) => {
  let storeList = null;
  let currentVariant = variant;
  const delegate = new Delegate(container);
  const _clickHandler = e => {
    e.preventDefault();
    r$3('availability:showMore', () => ({
      product,
      variant: currentVariant,
      storeList,
      options
    }));
  };
  const update = variant => {
    currentVariant = variant;
    const variantSectionUrl = `${container.dataset.baseUrl}/variants/${variant.id}/?section_id=store-availability`;
    container.innerHTML = '';
    fetch(variantSectionUrl).then(response => {
      return response.text();
    }).then(storeAvailabilityHTML => {
      if (storeAvailabilityHTML.trim() === '') return;

      // Remove section wrapper that throws nested sections error
      container.innerHTML = storeAvailabilityHTML.trim();
      container.innerHTML = container.firstElementChild.innerHTML;
      storeList = n$2(selectors$j.storeList, container);
    });
  };

  // Intialize
  update(variant);
  delegate.on('click', selectors$j.drawerTrigger, _clickHandler);
  const unload = () => {
    container.innerHTML = '';
  };
  return {
    unload,
    update
  };
};

const selectors$i = {
  form: "[data-product-form]",
  addToCart: "[data-add-to-cart]",
  variantSelect: "[data-variant-select]",
  optionById: id => `[value='${id}']`,
  thumb: "[data-product-thumbnail]",
  shippingEstimatorButton: "[data-estimator-trigger]",
  storeAvailability: "[data-store-availability-container]",
  quantityError: "[data-quantity-error]",
  customtextInput: "[data-custom-text-input]",
  customtextInputTarget: "[data-custom-text-input-target]"
};
register("featured-product", {
  productForm: null,
  events: [],
  accordions: [],
  onLoad() {
    const {
      placeholder,
      productHasOnlyDefaultVariant
    } = this.container.dataset;
    if (placeholder === "true") return;
    this.formElement = n$2(selectors$i.form, this.container);
    this.images = t$3("[data-open]", this.container);
    this.quantityError = n$2(selectors$i.quantityError, this.container);
    const viewInYourSpace = n$2("[data-in-your-space]", this.container);
    viewInYourSpace && l(viewInYourSpace, "visible", isMobile$1());

    // Handle Surface pickup
    this.storeAvailabilityContainer = n$2(selectors$i.storeAvailability, this.container);
    this.availability = null;
    if (this.formElement) {
      const {
        productHandle,
        currentProductId
      } = this.formElement.dataset;
      const product = getProduct(productHandle);
      product(data => {
        const variant = getVariantFromId(data, parseInt(currentProductId));
        if (this.storeAvailabilityContainer && variant) {
          this.availability = storeAvailability(this.storeAvailabilityContainer, data, variant, {
            hideVariantTitle: productHasOnlyDefaultVariant === "true"
          });
        }
        this.productForm = ProductForm(this.container, this.formElement, data, {
          onOptionChange: e => this.onOptionChange(e),
          onFormSubmit: e => this.onFormSubmit(e),
          onQuantityChange: e => this.onQuantityChange(e)
        });
        const productInventoryJson = n$2("[data-product-inventory-json]", this.container);
        if (productInventoryJson) {
          const jsonData = JSON.parse(productInventoryJson.innerHTML);
          const variantsInventories = jsonData.inventory;
          if (variantsInventories) {
            const config = {
              id: variant.id,
              variantsInventories
            };
            this.inventoryCounter = inventoryCounter(this.container, config);
          }
        }
      });
    }
    const accordionElements = t$3(".accordion", this.container);
    accordionElements.forEach(accordion => {
      const accordionOpen = accordion.classList.contains("accordion--open");
      this.accordions.push(Accordions(accordion, {
        firstOpen: accordionOpen
      }));
      const accordionParent = accordion.parentElement;
      if (accordionParent.classList.contains("rte--product") && !accordionParent.classList.contains("accordion accordion--product")) {
        accordion.classList.add("rte--product", "accordion--product");
      }
    });
    this.lightbox = Lightbox(n$2("[data-lightbox]", this.container));
    this.media = Media(this.container);
    this.optionButtons = OptionButtons(t$3("[data-option-buttons]", this.container));
    this.quantityInput = quantityInput(this.container);
    this.customtextInput = n$2(selectors$i.customtextInput, this.container);
    this.customtextInputTarget = n$2(selectors$i.customtextInputTarget, this.container);
    this.variantPopup = variantPopup(this.container);
    this.socialButtons = t$3("[data-social-share]", this.container);
    if (n$2(".product__media-slider", this.container)) {
      this.mobileCarousel = Carousel(this.container, "product-template", {
        wrapAround: false,
        adaptiveHeight: true
      });
    }
    this._initEvents();

    // Handle dynamic variant options
    this.variantAvailability = variantAvailability(this.container);

    // Init animation
    this.AnimateFeaturedProduct = AnimateFeaturedProduct(this.container);
  },
  _initEvents() {
    this.events.push(e$3(this.images, "click", e => {
      e.preventDefault();
      this.lightbox.open(e.currentTarget.dataset.open);
    }));
    this.events.push(e$3(this.socialButtons, "click", e => {
      l(e.target, "active");
      const sub = n$2(".article__share-icons", e.target);
      sub.setAttribute("aria-hidden", !a$1(e.target, "active"));
    }));

    // Adds listener for note input changes
    if (this.customtextInput) {
      this.events.push(e$3(this.customtextInput, "change", e => {
        // Update the hidden note input within the form
        this.customtextInputTarget.value = e.target.value;
      }));
    }
  },
  // When the user changes a product option
  onOptionChange({
    dataset: {
      variant
    }
  }) {
    const buyButton = n$2(selectors$i.addToCart, this.container);

    // Update prices to reflect selected variant
    updatePrices(this.container, variant);

    // Update buy button
    updateBuyButton(buyButton, variant);

    // Update unit pricing
    updateUnitPrices(this.container, variant);

    // Update sku
    updateSku(this.container, variant);
    dispatchCustomEvent("product:variant-change", {
      variant: variant
    });
    this.inventoryCounter && this.inventoryCounter.update(variant);
    if (!variant) {
      updateBuyButton(n$2("[data-add-to-cart]", this.container), false);
      this.availability && this.availability.unload();
      return;
    }

    // We need to set the id input manually so the Dynamic Checkout Button works
    const selectedVariantOpt = n$2(`${selectors$i.variantSelect} ${selectors$i.optionById(variant.id)}`, this.container);
    selectedVariantOpt.selected = true;

    // We need to dispatch an event so Shopify pay knows the form has changed
    this.formElement.dispatchEvent(new Event("change"));

    // Move screen or mobile slider to selected variants media
    if (variant.featured_media) {
      switchImage(this.container, variant.featured_media.id);
    }

    // Update product availability content
    this.availability && this.availability.update(variant);
  },
  // When user submits the product form
  onFormSubmit(e) {
    const {
      enableQuickCart
    } = document.body.dataset;

    // If a featured product section is on the cart page we will need to refresh
    // the cart to show a product has been added.
    const cartPage = document.body.classList.contains("template-cart");
    if (!enableQuickCart || cartPage) return;
    e.preventDefault();
    u$1(this.quantityError, "hidden");
    const button = n$2(selectors$i.addToCart, this.container);
    u$1(button, "loading");
    cart.addItem(this.formElement).then(({
      item
    }) => {
      i$1(button, "loading");
      r$3("cart:open", null, {
        flash: item.variant_id
      });
      dispatchCustomEvent("cart:item-added", {
        product: item
      });
    }).catch(() => {
      i$1(this.quantityError, "hidden");
      const button = n$2(selectors$i.addToCart, this.container);
      i$1(button, "loading");
    });
  },
  // When user updates quantity
  onQuantityChange({
    dataset: {
      variant,
      quantity
    }
  }) {
    // Adjust the hidden quantity input within the form
    const quantityInputs = [...t$3('[name="quantity"]', this.formElement)];
    quantityInputs.forEach(quantityInput => {
      quantityInput.value = quantity;
    });
    dispatchCustomEvent("product:quantity-update", {
      quantity: quantity,
      variant: variant
    });
  },
  onBlockSelect({
    target
  }) {
    const label = n$2(".accordion__label", target);
    target.scrollIntoView({
      block: "center",
      behavior: "smooth"
    });
    if (!label) return;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    slideDown(content);
    group.setAttribute("data-open", true);
    label.setAttribute("aria-expanded", true);
    content.setAttribute("aria-hidden", false);
  },
  onBlockDeselect({
    target
  }) {
    const label = n$2(".accordion__label", target);
    if (!label) return;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    slideUp(content);
    group.setAttribute("data-open", false);
    label.setAttribute("aria-expanded", false);
    content.setAttribute("aria-hidden", true);
  },
  onUnload() {
    this.productForm.destroy();
    this.lightbox.destroy();
    this.optionButtons.destroy();
    this.quantityInput.unload();
    this.events.forEach(unsubscribe => unsubscribe());
    this.accordions.forEach(accordion => accordion.unload());
    this.AnimateFeaturedProduct?.destroy();
    this.variantAvailability?.unload();
  }
});

register('newsletter', {
  onLoad() {
    focusFormStatus(this.container);
    this.AnimateNewsletter = AnimateNewsletter(this.container);
  },
  onUnload() {
    this.AnimateNewsletter?.destroy();
  }
});

const selectors$h = {
  recommendations: '[data-recommendations]',
  slider: '[data-slider]'
};
register('recommended-products', {
  onLoad() {
    this.columns = parseInt(this.container.dataset.columns);
    const {
      limit,
      productId: id,
      sectionId
    } = this.container.dataset;
    const content = n$2(selectors$h.recommendations, this.container);
    if (!content) return;
    const requestUrl = `${window.theme.routes.productRecommendations}?section_id=${sectionId}&limit=${limit}&product_id=${id}`;
    const request = new XMLHttpRequest();
    request.open('GET', requestUrl, true);
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        let container = document.createElement('div');
        container.innerHTML = request.response;

        // Check if the response includes a product item
        // and if it doesn't remove the entire section
        const item = n$2('.product-item', container);
        if (!item) {
          this.container.parentNode.removeChild(this.container);
          return;
        }
        content.innerHTML = n$2(selectors$h.recommendations, container).innerHTML;
        this.sliderElement = n$2(selectors$h.slider, this.container);
        const carouselWraps = this.sliderElement.dataset.carouselWraps === 'true';
        if (this.sliderElement) {
          this.sliderElement.style.opacity = 0;
          this.carousel = Carousel(content, 'recommended-products', {
            wrapAround: carouselWraps,
            onReady: () => {
              this.animateProductItem = ProductItem(this.container);
              this.AnimateRecommendedProducts = AnimateRecommendedProducts(this.container);
            }
          });
        }
      } else {
        // If request returns any errors remove the section markup
        this.container.parentNode.removeChild(this.container);
      }
    };
    request.send();
  },
  onUnload() {
    this.carousel.destroy();
    this.animateProductItem && this.AnimateProductItem.destroy();
    this.AnimateRecommendedProducts?.destroy();
  }
});

const selectors$g = {
  dots: '.navigation-dot'
};
const navigationDots = (container, slider) => {
  const navigationDots = t$3(selectors$g.dots, container);
  const events = [];
  navigationDots.forEach(dot => {
    events.push(e$3(dot, 'click', e => _handlePageDot(e)));
  });
  const _handlePageDot = e => {
    e.preventDefault();
    if (e.target.classList.contains('is-selected')) return;
    const {
      slideIndex
    } = e.target.dataset;
    slider.select(slideIndex);
    slider.pausePlayer();
  };
  const update = cellIndex => {
    const activeClass = 'is-selected';
    navigationDots.forEach(dot => i$1(dot, activeClass));
    u$1(navigationDots[cellIndex], activeClass);
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    update,
    unload
  };
};

const selectors$f = {
  slider: "[data-slider]",
  slide: ".slideshow__cell"
};
register("slideshow", {
  events: [],
  slideshow: null,
  dotNavigation: null,
  onLoad() {
    const slideshowShouldAnimate = shouldAnimate(this.container);
    const slider = n$2(selectors$f.slider, this.container);
    const slides = t$3(selectors$f.slide, this.container);
    const {
      autoplay
    } = slider.dataset;
    i$1(slider, "is-hidden");
    // trigger redraw for transition
    slider.offsetHeight;

    // Animate the first slide only when it is scrolled into view

    const margin = window.matchMedia(getMediaQuery("not-small")).matches ? 200 : 100;
    const threshold = Math.min(margin / this.container.offsetHeight, 0.5);
    const observer = new IntersectionObserver(([{
      intersectionRatio: visible
    }]) => {
      if (visible) {
        this._animateSlide(slides[0]);
        this._unpause();
        observer.disconnect();
      }
    }, {
      threshold: threshold
    });
    if (slides.length > 1) {
      import(flu.chunks.flickity).then(({
        Flickity
      }) => {
        this.slideshow = new Flickity(slider, {
          adaptiveHeight: true,
          autoPlay: Number(autoplay),
          draggable: true,
          prevNextButtons: false,
          wrapAround: true,
          pageDots: false,
          dragThreshold: 5,
          pauseAutoPlayOnHover: !window.Shopify.designMode,
          on: {
            ready: () => {
              if (slideshowShouldAnimate) {
                observer.observe(this.container);
              }
            }
          }
        });

        // Pause player from playing while offscreen allowing text animation
        // when player intersects
        this._pause();
        this.dotNavigation = navigationDots(this.container, this.slideshow);
        this.slideshow.on("change", index => {
          const activeSlide = this.slideshow.cells[index].element;
          this._animateSlide(activeSlide);
          this.dotNavigation && this.dotNavigation.update(index);
        });
        r$3("slideshow:initialized");
      });
    } else if (slides.length) {
      u$1(slides[0], "is-selected");
      if (shouldAnimate(this.container)) {
        observer.observe(this.container);
      }
    }
  },
  _pause() {
    this.slideshow && this.slideshow.pausePlayer();
  },
  _unpause() {
    this.slideshow && this.slideshow.unpausePlayer();
  },
  _handleBlockSelect(slideIndex) {
    this.slideshow.select(slideIndex);
    this._pause();
  },
  _animateSlide(target) {
    if (!prefersReducedMotion()) {
      const image = n$2(".image, .placeholder-image", target);
      const mobileImage = n$2(".image.slideshow__image--mobile", target);
      const fadeUpSplitItems = t$3(".animation-fade-up-split-reveal", target);
      const fadeUpItems = t$3(".animation-fade-up-reveal", target);
      const reveals = [];
      const imageReveal = new FadeScaleReveal(image, {
        scaleStart: 1.25
      });
      let mobileImageReveal = null;
      if (mobileImage) {
        mobileImageReveal = new FadeScaleReveal(mobileImage, {
          scaleStart: 1.25
        });
      }
      fadeUpSplitItems.forEach(item => {
        reveals.push(new FadeUpSplitReveal(item));
      });
      fadeUpItems.forEach(item => {
        reveals.push(new FadeUpReveal(item));
      });
      if (!window.matchMedia(getMediaQuery("not-small")).matches && mobileImage) {
        mobileImageReveal.play(0);
      } else {
        imageReveal.play(0);
      }
      let delay = 0;
      reveals.forEach(reveal => {
        reveal.play(delay);
        if (reveal.type === "FadeUpSplitReveal") {
          delay += reveal.lineCount * window.theme.animation.delay;
        } else {
          delay += window.theme.animation.delay;
        }
      });
    }
  },
  onBlockSelect({
    target
  }) {
    if (this.slideshow) {
      this._handleBlockSelect(target.dataset.index);
    } else {
      // Listen for initalization if slideshow does not exist
      this.events.push(c("slideshow:initialized", () => {
        this._handleBlockSelect(target.dataset.index);
      }));
    }
  },
  onBlockDeselect() {
    if (this.slideshow) {
      this._unpause();
    } else {
      // Listen for initalization if slideshow does not exist
      this.events.push(c("slideshow:initialized", () => {
        this._unpause();
      }));
    }
  },
  onUnload() {
    this.slideshow && this.slideshow.destroy();
    this.events.forEach(unsubscribe => unsubscribe());
    this.dotNavigation && this.dotNavigation.unload();
    this.observer?.destroy();
  }
});

const selectors$e = {
  inner: ".video__inner",
  player: "[data-video-player]",
  button: "[data-play-button]",
  overlay: "[data-overlay]",
  image: ".video__image",
  iframe: "iframe",
  videoWrapper: ".video__wrapper"
};
const classes$6 = {
  visible: "visible"
};
register("video", {
  events: [],
  onLoad() {
    this.AnimateVideo = AnimateVideo(this.container);
    import(flu.chunks.video).then(({
      Video
    }) => {
      const videoWrapper = n$2(selectors$e.videoWrapper, this.container);
      const {
        videoId,
        videoType
      } = videoWrapper.dataset;
      if (!videoId || !videoType) return;
      const player = n$2(selectors$e.player, this.container);
      const button = n$2(selectors$e.button, this.container);
      const overlay = n$2(selectors$e.overlay, this.container);
      const image = n$2(selectors$e.image, this.container);
      const video = Video(this.container, {
        id: videoId,
        type: videoType,
        playerEl: player
      });
      video.on("play", () => {
        const iframe = n$2(selectors$e.iframe, this.container);
        iframe.taxindex = 0;
        iframe.focus();
        i$1(overlay, classes$6.visible);
        image && i$1(image, classes$6.visible);
      });
      this.events.push(e$3(button, "click", () => {
        video.play();
      }));
    });
  },
  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
    this.AnimateVideo?.destroy();
  }
});

const autoPlay = videos => {
  if (!videos.length) return;
  const events = [e$3(window, 'click', () => _handleAutoPlay()), e$3(window, 'touchstart', () => _handleAutoPlay())];

  // Force autoplay after device interaction if in low power mode
  function _handleAutoPlay() {
    videos.forEach(video => {
      if (!video.playing) {
        video.play();
      }
    });
    events.forEach(unsubscribe => unsubscribe());
  }
};

const selectors$d = {
  video: ".video-hero__video"
};
register("video-hero", {
  videoHandler: null,
  onLoad() {
    const video = t$3(selectors$d.video, this.container);
    if (video.length) {
      this.videoHandler = backgroundVideoHandler(this.container);
      autoPlay(video);
    }
    this.AnimateVideoHero = AnimateVideoHero(this.container);
  },
  onUnload() {
    this.videoHandler && this.videoHandler();
    this.AnimateVideoHero?.destroy();
  }
});

const selectors$c = {
  question: ".questions__accordion-label"
};
register("questions", {
  onLoad() {
    this.questions = t$3(selectors$c.question, this.container);
    this.clickHandlers = e$3(this.questions, "click", e => {
      e.preventDefault();
      const {
        parentNode: group,
        nextElementSibling: content
      } = e.currentTarget;
      if (isVisible(content)) {
        this._close(e.currentTarget, group, content);
      } else {
        this._open(e.currentTarget, group, content);
      }
    });
    this.AnimateQuestions = AnimateQuestions(this.container);
  },
  _open(label, group, content) {
    slideStop(content, {
      duration: window.theme.animation.duration * 1000
    });
    slideDown(content, {
      duration: window.theme.animation.duration * 1000
    });
    this.AnimateQuestions.open(n$2(".questions__accordion-answer-inner", content));
    group.setAttribute("data-open", true);
    label.setAttribute("aria-expanded", true);
    content.setAttribute("aria-hidden", false);
  },
  _close(label, group, content) {
    slideStop(content, {
      duration: window.theme.animation.duration * 1000
    });
    slideUp(content, {
      duration: window.theme.animation.duration * 1000
    });
    this.AnimateQuestions.close(n$2(".questions__accordion-answer-inner", content));
    group.setAttribute("data-open", false);
    label.setAttribute("aria-expanded", false);
    content.setAttribute("aria-hidden", true);
  },
  onBlockSelect({
    target
  }) {
    const label = n$2(selectors$c.question, target);
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    this._open(label, group, content);
  },
  onUnload() {
    this.clickHandlers();
    this.AnimateQuestions?.destroy();
  }
});

register('social-proof', {
  carousel: null,
  events: [],
  onLoad() {
    const carouselWraps = this.container.dataset.carouselWraps === 'true';
    this.carousel = Carousel(this.container, 'social-proof', {
      wrapAround: carouselWraps,
      adaptiveHeight: false,
      onReady: () => {
        this.AnimateSocialProof = AnimateSocialProof(this.container);
      }
    });
  },
  onUnload() {
    this.caorusel && this.carousel.destroy();
    this.events.forEach(unsubscribe => unsubscribe());
    this.AnimateSocialProof?.destroy();
  },
  onBlockSelect({
    target: item
  }) {
    if (this.carousel) {
      this.carousel.select(item.dataset.index);
    } else {
      this.events.push(c('social-proof:initialized', () => {
        this.carousel.select(item.dataset.index);
      }));
    }
  }
});

const selectors$b = {
  slider: "[data-slider]",
  slide: "[data-slide]",
  quoteText: ".quote__item-text > span > p",
  secondaryAnimationItems: ".animation-fade-left-reveal"
};
register("quote", {
  onLoad() {
    this.gsapImport = import(flu.chunks.gsap);
    this.gsapImport.then(({
      gsap,
      CustomEase,
      SplitText
    }) => {
      gsap.registerPlugin(CustomEase, SplitText);
      this.itemEase = gsap.parseEase(window.theme.animation.ease);
      this.tl = gsap.timeline({
        defaults: {
          duration: window.theme.animation.duration,
          stagger: 0.07,
          ease: this.itemEase
        }
      });
    });
    const sliderContainer = n$2(selectors$b.slider, this.container);
    const slides = t$3(selectors$b.slide, this.container);
    this.previousSlide = null;
    this.currentSlide = slides[0];

    // Animate the first slide only when it is scrolled into view
    this.observer = new IntersectionObserver(([{
      intersectionRatio: visible
    }]) => {
      if (visible) {
        this.slider.cells.forEach(cell => {
          cell.element.classList.remove("is-animating");
        });
        this._revealSlide(this.currentSlide);
        this.slider.unpausePlayer();
        this.observer.disconnect();
      }
    }, {
      threshold: 0.25
    });
    import(flu.chunks.flickity).then(({
      Flickity
    }) => {
      this.slider = new Flickity(sliderContainer, {
        prevNextButtons: false,
        adaptiveHeight: false,
        wrapAround: true,
        pageDots: false,
        cellAlign: "center",
        draggable: false,
        pauseAutoPlayOnHover: false,
        autoPlay: parseInt(sliderContainer.dataset.timer),
        on: {
          ready: () => {
            if (shouldAnimate(this.container)) {
              this.observer.observe(this.container);
            } else {
              this._showSlide(this.currentSlide);
            }
          },
          change: index => {
            this.previousSlide = this.currentSlide;
            this.currentSlide = slides[index];
            this._changeSlide(this.previousSlide, this.currentSlide);
          }
        }
      });
      this.slider.pausePlayer();
      let dotNavigation = null;
      setTimeout(() => {
        this.slider.resize();
      }, 250);
      if (slides.length > 1) {
        dotNavigation = navigationDots(this.container, this.slider);
        this.slider.on("select", () => {
          dotNavigation.update(this.slider.selectedIndex);
        });
      }
    });
  },
  _changeSlide(previousSlide, currentSlide) {
    if (previousSlide) {
      this._hideSlide(previousSlide);
    }
    this._showSlide(currentSlide);
  },
  _revealSlide(slide) {
    slide.classList.add("is-animating");
    this.gsapImport.then(({
      SplitText
    }) => {
      const quoteText = n$2(selectors$b.quoteText, slide);
      const quoteTextlines = new SplitText(quoteText, {
        type: "lines",
        linesClass: "quote__item-text-lines",
        lineThreshold: 0.5
      });
      const secondaryAnimationItems = t$3(selectors$b.secondaryAnimationItems, slide);
      const animationItems = [];
      animationItems.splice(0, 0, ...quoteTextlines.lines);
      animationItems.splice(animationItems.length, 0, ...secondaryAnimationItems);
      this.tl.fromTo(animationItems, {
        x: "50px",
        opacity: 0
      }, {
        x: 0,
        opacity: 1,
        onComplete: () => {
          quoteTextlines.revert();
        }
      });
    });
  },
  _showSlide(slide) {
    this.gsapImport.then(() => {
      this.tl.fromTo(slide, {
        opacity: 0
      }, {
        opacity: 1
      });
    });
  },
  _hideSlide(slide) {
    this.gsapImport.then(() => {
      this.tl.fromTo(slide, {
        opacity: 1
      }, {
        opacity: 0
      });
    });
  },
  onBlockSelect({
    target: slide
  }) {
    this.slider.select(slide.dataset.index);
    this.slider.pausePlayer();
  },
  onBlockDeselect() {
    this.slider.unpausePlayer();
  },
  onUnload() {
    this.slider.destroy();
    this.dotNavigation && this.dotNavigation.unload();
    this.observer && this.observer.disconnect();
  }
});

// do not edit .js files directly - edit src/index.jst



var fastDeepEqual = function equal(a, b) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;

    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;)
        if (!equal(a[i], b[i])) return false;
      return true;
    }



    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;)
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0;) {
      var key = keys[i];

      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a!==a && b!==b;
};

/**
 * Copyright 2019 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at.
 *
 *      Http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const DEFAULT_ID = "__googleMapsScriptId";
/**
 * The status of the [[Loader]].
 */
var LoaderStatus;
(function (LoaderStatus) {
    LoaderStatus[LoaderStatus["INITIALIZED"] = 0] = "INITIALIZED";
    LoaderStatus[LoaderStatus["LOADING"] = 1] = "LOADING";
    LoaderStatus[LoaderStatus["SUCCESS"] = 2] = "SUCCESS";
    LoaderStatus[LoaderStatus["FAILURE"] = 3] = "FAILURE";
})(LoaderStatus || (LoaderStatus = {}));
/**
 * [[Loader]] makes it easier to add Google Maps JavaScript API to your application
 * dynamically using
 * [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
 * It works by dynamically creating and appending a script node to the the
 * document head and wrapping the callback function so as to return a promise.
 *
 * ```
 * const loader = new Loader({
 *   apiKey: "",
 *   version: "weekly",
 *   libraries: ["places"]
 * });
 *
 * loader.load().then((google) => {
 *   const map = new google.maps.Map(...)
 * })
 * ```
 */
class Loader {
    /**
     * Creates an instance of Loader using [[LoaderOptions]]. No defaults are set
     * using this library, instead the defaults are set by the Google Maps
     * JavaScript API server.
     *
     * ```
     * const loader = Loader({apiKey, version: 'weekly', libraries: ['places']});
     * ```
     */
    constructor({ apiKey, authReferrerPolicy, channel, client, id = DEFAULT_ID, language, libraries = [], mapIds, nonce, region, retries = 3, url = "https://maps.googleapis.com/maps/api/js", version, }) {
        this.CALLBACK = "__googleMapsCallback";
        this.callbacks = [];
        this.done = false;
        this.loading = false;
        this.errors = [];
        this.apiKey = apiKey;
        this.authReferrerPolicy = authReferrerPolicy;
        this.channel = channel;
        this.client = client;
        this.id = id || DEFAULT_ID; // Do not allow empty string
        this.language = language;
        this.libraries = libraries;
        this.mapIds = mapIds;
        this.nonce = nonce;
        this.region = region;
        this.retries = retries;
        this.url = url;
        this.version = version;
        if (Loader.instance) {
            if (!fastDeepEqual(this.options, Loader.instance.options)) {
                throw new Error(`Loader must not be called again with different options. ${JSON.stringify(this.options)} !== ${JSON.stringify(Loader.instance.options)}`);
            }
            return Loader.instance;
        }
        Loader.instance = this;
    }
    get options() {
        return {
            version: this.version,
            apiKey: this.apiKey,
            channel: this.channel,
            client: this.client,
            id: this.id,
            libraries: this.libraries,
            language: this.language,
            region: this.region,
            mapIds: this.mapIds,
            nonce: this.nonce,
            url: this.url,
            authReferrerPolicy: this.authReferrerPolicy,
        };
    }
    get status() {
        if (this.errors.length) {
            return LoaderStatus.FAILURE;
        }
        if (this.done) {
            return LoaderStatus.SUCCESS;
        }
        if (this.loading) {
            return LoaderStatus.LOADING;
        }
        return LoaderStatus.INITIALIZED;
    }
    get failed() {
        return this.done && !this.loading && this.errors.length >= this.retries + 1;
    }
    /**
     * CreateUrl returns the Google Maps JavaScript API script url given the [[LoaderOptions]].
     *
     * @ignore
     */
    createUrl() {
        let url = this.url;
        url += `?callback=${this.CALLBACK}`;
        if (this.apiKey) {
            url += `&key=${this.apiKey}`;
        }
        if (this.channel) {
            url += `&channel=${this.channel}`;
        }
        if (this.client) {
            url += `&client=${this.client}`;
        }
        if (this.libraries.length > 0) {
            url += `&libraries=${this.libraries.join(",")}`;
        }
        if (this.language) {
            url += `&language=${this.language}`;
        }
        if (this.region) {
            url += `&region=${this.region}`;
        }
        if (this.version) {
            url += `&v=${this.version}`;
        }
        if (this.mapIds) {
            url += `&map_ids=${this.mapIds.join(",")}`;
        }
        if (this.authReferrerPolicy) {
            url += `&auth_referrer_policy=${this.authReferrerPolicy}`;
        }
        return url;
    }
    deleteScript() {
        const script = document.getElementById(this.id);
        if (script) {
            script.remove();
        }
    }
    /**
     * Load the Google Maps JavaScript API script and return a Promise.
     */
    load() {
        return this.loadPromise();
    }
    /**
     * Load the Google Maps JavaScript API script and return a Promise.
     *
     * @ignore
     */
    loadPromise() {
        return new Promise((resolve, reject) => {
            this.loadCallback((err) => {
                if (!err) {
                    resolve(window.google);
                }
                else {
                    reject(err.error);
                }
            });
        });
    }
    /**
     * Load the Google Maps JavaScript API script with a callback.
     */
    loadCallback(fn) {
        this.callbacks.push(fn);
        this.execute();
    }
    /**
     * Set the script on document.
     */
    setScript() {
        if (document.getElementById(this.id)) {
            // TODO wrap onerror callback for cases where the script was loaded elsewhere
            this.callback();
            return;
        }
        const url = this.createUrl();
        const script = document.createElement("script");
        script.id = this.id;
        script.type = "text/javascript";
        script.src = url;
        script.onerror = this.loadErrorCallback.bind(this);
        script.defer = true;
        script.async = true;
        if (this.nonce) {
            script.nonce = this.nonce;
        }
        document.head.appendChild(script);
    }
    /**
     * Reset the loader state.
     */
    reset() {
        this.deleteScript();
        this.done = false;
        this.loading = false;
        this.errors = [];
        this.onerrorEvent = null;
    }
    resetIfRetryingFailed() {
        if (this.failed) {
            this.reset();
        }
    }
    loadErrorCallback(e) {
        this.errors.push(e);
        if (this.errors.length <= this.retries) {
            const delay = this.errors.length * Math.pow(2, this.errors.length);
            console.log(`Failed to load Google Maps script, retrying in ${delay} ms.`);
            setTimeout(() => {
                this.deleteScript();
                this.setScript();
            }, delay);
        }
        else {
            this.onerrorEvent = e;
            this.callback();
        }
    }
    setCallback() {
        window.__googleMapsCallback = this.callback.bind(this);
    }
    callback() {
        this.done = true;
        this.loading = false;
        this.callbacks.forEach((cb) => {
            cb(this.onerrorEvent);
        });
        this.callbacks = [];
    }
    execute() {
        this.resetIfRetryingFailed();
        if (this.done) {
            this.callback();
        }
        else {
            // short circuit and warn if google.maps is already loaded
            if (window.google && window.google.maps && window.google.maps.version) {
                console.warn("Google Maps already loaded outside @googlemaps/js-api-loader." +
                    "This may result in undesirable behavior as options and script parameters may not match.");
                this.callback();
                return;
            }
            if (this.loading) ;
            else {
                this.loading = true;
                this.setCallback();
                this.setScript();
            }
        }
    }
}

const selectors$a = {
  mapContainer: '.map__container',
  map: '.map__element',
  image: '.map__image'
};
const classes$5 = {
  hidden: 'hidden'
};
register('map', {
  onLoad() {
    this.AnimateMap = AnimateMap(this.container);
    const map = n$2(selectors$a.mapContainer, this.container);
    let geocoder = null;
    if (!map) return;
    const {
      apiKey,
      address
    } = map.dataset;
    const rawData = n$2('#map-styles', this.container).innerHTML;
    let styleData;
    if (rawData) {
      try {
        styleData = JSON.parse(rawData);
      } catch (e) {
        styleData = {};
        console.error(`Custom map JSON error: ${e}`);
      }
    }
    if (!apiKey || !address) return;
    const _setFailureHandler = () => {
      // Handle authetication errors
      window.gm_authFailure = function () {
        const maps = t$3(selectors$a.mapContainer, document);
        const mapImages = t$3(selectors$a.image, document);
        maps.forEach(map => {
          u$1(map, classes$5.hidden);
        });
        mapImages.forEach(img => {
          i$1(img, classes$5.hidden);
        });
      };
    };
    const _loadMap = () => {
      u$1(n$2(selectors$a.image, this.container), classes$5.hidden);
      geocoder = new google.maps.Geocoder();
      geocoder.geocode({
        address
      }, (res, _) => {
        const {
          location
        } = res[0].geometry;
        const latLong = {
          lat: location.lat(),
          lng: location.lng()
        };
        const map = new google.maps.Map(n$2(selectors$a.map, this.container), {
          center: latLong,
          zoom: 12,
          styles: styleData.styles
        });
        new google.maps.Marker({
          position: latLong,
          map
        });
      });
    };
    const _loadAPI = (apiKey, address, styleData) => {
      const loader = new Loader({
        apiKey,
        version: 'weekly'
      });

      // Only load the api once
      if (!window.google) {
        loader.load().then(() => {
          _loadMap();
        });
      } else {
        _loadMap();
      }
    };
    _setFailureHandler();
    _loadAPI(apiKey);
  },
  onUnload() {
    this.AnimateMap?.destroy();
  }
});

const selectors$9 = {
  video: '.mosaic-grid__item-video'
};
register('mosaic-grid', {
  onLoad() {
    const videos = t$3(selectors$9.video, this.container);
    this.videoHandlers = [];
    if (videos.length) {
      videos.forEach(video => {
        this.videoHandlers.push(backgroundVideoHandler(video.parentNode));
      });
    }
    this.AnimateMosaicGrid = AnimateMosaicGrid(this.container);
  },
  onUnload() {
    this.videoHandlers.forEach(handler => handler());
    this.AnimateMosaicGrid?.destroy();
  }
});

const selectors$8 = {
  hotspotWrappers: '.shoppable-item',
  hotspots: '.shoppable-item__hotspot',
  productCard: '.shoppable-item__product-card',
  closeButtons: '[data-shoppable-item-close]'
};
const classes$4 = {
  animating: 'shoppable-item--animating',
  unset: 'shoppable-item--position-unset',
  hidden: 'hidden',
  active: 'active'
};
register('shoppable', {
  onLoad() {
    this.productCards = t$3(selectors$8.productCard, this.container);
    this.hotspotContainers = t$3(selectors$8.hotspotWrappers, this.container);
    this.hotspots = t$3(selectors$8.hotspots, this.container);
    const closeButtons = t$3(selectors$8.closeButtons, this.container);

    // Self terminating mouseenter events
    this.hotspotEvents = this.hotspots.map(hotspot => {
      return {
        element: hotspot,
        event: e$3(hotspot, 'mouseenter', e => {
          i$1(e.currentTarget.parentNode, classes$4.animating);
          this.hotspotEvents.find(o => o.element === hotspot).event();
        })
      };
    });
    this.events = [e$3(this.hotspots, 'click', e => this._hotspotClickHandler(e)), e$3(document, 'click', e => this._clickOutsideHandler(e)), e$3(closeButtons, 'click', () => this._closeAll()), e$3(this.container, 'keydown', ({
      keyCode
    }) => {
      if (keyCode === 27) this._closeAll();
    })];
    this.AnimateShoppable = AnimateShoppable(this.container);
  },
  _hotspotClickHandler(e) {
    const hotspot = e.currentTarget;
    const wrapper = e.currentTarget.parentNode;
    const card = e.currentTarget.nextElementSibling;
    if (!card) return;
    if (a$1(card, 'hidden')) {
      const cardHeight = card.offsetHeight;
      const cardWidth = card.offsetWidth;
      this._closeAll();
      card.setAttribute('aria-hidden', false);
      card.style.setProperty('--card-height', cardHeight + 'px');
      card.style.setProperty('--card-width', cardWidth + 'px');
      i$1(card, classes$4.hidden);
      u$1(wrapper, classes$4.active);
      i$1(wrapper, classes$4.unset);
      u$1(this.container, classes$4.flyupActive);

      // Offset flyup height and scroll hotspot into view
      if (!window.matchMedia('(min-width: 45em)').matches) {
        const hotspotOffsetMargin = 70;
        const hotspotOffsetTop = hotspot.getBoundingClientRect().top;
        const positionFromBottom = window.innerHeight - (hotspotOffsetTop + hotspotOffsetMargin);
        if (cardHeight > positionFromBottom) {
          const y = window.pageYOffset + cardHeight - positionFromBottom;
          window.scrollTo({
            top: y,
            behavior: 'smooth'
          });
        }
      }
    } else {
      card.setAttribute('aria-hidden', true);
      u$1(card, classes$4.hidden);
      i$1(this.container, classes$4.flyupActive);
      i$1(wrapper, classes$4.active);
    }
  },
  _clickOutsideHandler(e) {
    if (!e.target.closest(selectors$8.productCard) && !a$1(e.target, 'shoppable-item__hotspot')) {
      this._closeAll();
    }
  },
  _closeAll() {
    this.productCards.forEach(card => {
      u$1(card, classes$4.hidden);
      card.setAttribute('aria-hidden', true);
    });
    this.hotspotContainers.forEach(spot => i$1(spot, classes$4.active));
    i$1(this.container, classes$4.flyupActive);
  },
  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
    this.AnimateShoppable?.destroy();
  }
});

register('image-with-text', {
  onLoad() {
    this.AnimateImageWithText = AnimateImageWithText(this.container);
  },
  onUnload() {
    this.AnimateImageWithText?.destroy();
  }
});

register('image-with-features', {
  onLoad() {
    this.AnimateImageWithFeatures = AnimateImageWithFeatures(this.container);
  },
  onUnload() {
    this.AnimateImageWithFeatures?.destroy();
  }
});

register('text-columns-with-images', {
  onLoad() {
    this.AnimateTextColumnsWithImages = AnimateTextColumnsWithImages(this.container);
  },
  onUnload() {
    this.AnimateTextColumnsWithImages?.disconnect();
  }
});

register('testimonials', {
  onLoad() {
    this.AnimateTestimonials = AnimateTestimonials(this.container);
  },
  onUnload() {
    this.AnimateTestimonials?.destroy();
  }
});

register('collection-banner', {
  onLoad() {
    this.AnimateCollectionBanner = AnimateCollectionBanner(this.container);
  },
  onUnload() {
    this.AnimateCollectionBanner?.destroy();
  }
});

register('collection-list', {
  onLoad() {
    this.AnimateCollectionList = AnimateCollectionList(this.container);
  },
  onUnload() {
    this.AnimateCollectionList?.destroy();
  }
});

register('blog-posts', {
  onLoad() {
    this.AnimateBlogPosts = AnimateBlogPosts(this.container);
  },
  onUnload() {
    this.AnimateBlogPosts?.destroy();
  }
});

register('logo-list', {
  onLoad() {
    this.AnimateLogoList = AnimateLogoList(this.container);
  },
  onUnload() {
    this.AnimateLogoList?.destroy();
  }
});

register('inline-features', {
  onLoad() {
    this.AnimateInlineFeatures = AnimateInlineFeatures(this.container);
  },
  onUnload() {
    this.AnimateInlineFeatures?.disconnect();
  }
});

register('rich-text', {
  onLoad() {
    this.AnimateRichText = AnimateRichText(this.container);
  },
  onUnload() {
    this.AnimateRichText?.disconnect();
  }
});

const selectors$7 = {
  "settings": "[data-timer-settings]",
  "days": "[data-days]",
  "hours": "[data-hours]",
  "minutes": "[data-minutes]",
  "seconds": "[data-seconds]"
};
const classes$3 = {
  "active": "active",
  "hide": "hide",
  "complete": "complete"
};
function CountdownTimer(container) {
  const settings = n$2(selectors$7.settings, container);
  const {
    year,
    month,
    day,
    hour,
    minute,
    shopTimezone,
    timeZoneSelection,
    hideTimerOnComplete
  } = JSON.parse(settings.innerHTML);
  const daysEl = n$2(selectors$7.days, container);
  const hoursEl = n$2(selectors$7.hours, container);
  const minutesEl = n$2(selectors$7.minutes, container);
  const secondsEl = n$2(selectors$7.seconds, container);
  const timezoneString = timeZoneSelection === "shop" ? ` GMT${shopTimezone}` : "";
  const countDownDate = new Date(Date.parse(`${month} ${day}, ${year} ${hour}:${minute}${timezoneString}`));
  const countDownTime = countDownDate.getTime();
  const timerInterval = setInterval(timerLoop, 1000);
  timerLoop();
  u$1(container, classes$3.active);
  function timerLoop() {
    window.requestAnimationFrame(() => {
      // Get today's date and time
      const now = new Date().getTime();

      // Find the distance between now and the count down date
      const distance = countDownTime - now;

      // Time calculations for days, hours, minutes and seconds
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(distance % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
      const minutes = Math.floor(distance % (1000 * 60 * 60) / (1000 * 60));
      const seconds = Math.floor(distance % (1000 * 60) / 1000);

      // If the count down is finished, write some text
      if (distance < 0) {
        timerInterval && clearInterval(timerInterval);
        daysEl.innerHTML = 0;
        hoursEl.innerHTML = 0;
        minutesEl.innerHTML = 0;
        secondsEl.innerHTML = 0;
        u$1(container, classes$3.complete);
        if (hideTimerOnComplete) {
          u$1(container, classes$3.hide);
        }
      } else {
        daysEl.innerHTML = days;
        hoursEl.innerHTML = hours;
        minutesEl.innerHTML = minutes;
        secondsEl.innerHTML = seconds;
      }
    });
  }
  function destroy() {
    timerInterval && clearInterval(timerInterval);
  }
  return {
    destroy
  };
}

const selectors$6 = {
  "timer": "[data-countdown-timer]"
};
register("countdown-banner", {
  onLoad() {
    const timers = t$3(selectors$6.timer, this.container);
    this.countdownTimers = [];
    timers.forEach(timer => {
      this.countdownTimers.push(CountdownTimer(timer));
    });
    this.AnimateCountdownBanner = AnimateCountdownBanner(this.container);
  },
  onUnload() {
    this.AnimateCountdownBanner?.destroy();
    this.countdownTimers.forEach(countdownTimer => countdownTimer.destroy());
  }
});

const selectors$5 = {
  listContainer: "[data-events-eventbrite-container]",
  skeletonList: ".events__list.events__list--skeleton"
};
const endpoints = {
  org: token => `https://www.eventbriteapi.com//v3/users/me/organizations/?token=${token}`,
  events: (id, token) => `https://www.eventbriteapi.com//v3/organizations/${id}/events/?token=${token}&expand=venue&status=live`
};
register("events", {
  onLoad() {
    this.accessToken = this.container.dataset.accessToken;
    this.eventCount = parseInt(this.container.dataset.eventCount, 10);
    this.eventHeadingType = this.container.dataset.eventHeadingType;
    this.imageIsConstrained = this.container.dataset.imageIsConstrained;
    this._fetchOrg();
    this.animateEvents = AnimateEvents(this.container);
  },
  /**
   * _fetchOrg gets the eventbrite organization data for this user
   */
  _fetchOrg() {
    if (!this.accessToken) return;
    fetch(endpoints.org(this.accessToken)).then(res => res.json()).then(res => {
      this._fetchEvents(res.organizations[0].id);
    });
  },
  /**
   * _fetchEvents gets the eventbrite events for this user
   * @param {number} id organization id
   */
  _fetchEvents(id) {
    if (!id) return;
    fetch(endpoints.events(id, this.accessToken)).then(res => res.json()).then(events => {
      this._renderEvents(events.events);
    });
  },
  /**
   * _renderEvents adds the event elements on the page
   * @param {array} events array of event objects
   */
  _renderEvents(events) {
    const listContainer = n$2(selectors$5.listContainer, this.container);
    const skeletonList = n$2(selectors$5.skeletonList, this.container);

    // Build a list of events
    let list = document.createElement("ul");
    list.className = "events__list";
    events.slice(0, this.eventCount).forEach(event => {
      list.innerHTML += this._renderEventItem(event);
    });

    // Append the list to the container on the page
    u$1(skeletonList, "hide");
    setTimeout(() => {
      listContainer.textContent = "";
      listContainer.appendChild(list);
      this.animateEvents.initEventItems();
    }, 330);
  },
  /**
   * _renderEventItem builds the html needed for an event item with the event data
   * @param {obj} event the event data
   * @returns eventItem
   */
  _renderEventItem(event) {
    let eventItem = `
      <li
        class="
          event-item
          event-item--eventbrite
          ${event.logo?.url ? "event-item--has-image" : ""}
        "
      >
        <a href="${event.url}" class="event-item__link">
          <div class="event-item__image-wrapper hover">
            ${this._renderImage(event)}
            ${this._renderDateBadge(event)}
          </div>
          <div class="event-item__details ta-c">
            ${this._renderName(event)}
            ${this._renderDate(event)}
            ${this._renderVenue(event)}
            ${this._renderSummary(event)}
          </div>
        </a>
      </li>
    `;
    return eventItem;
  },
  _renderImage(event) {
    let image = "";
    if (event.logo?.url) {
      image = `
        <div
          class="
            image
            event-item__image
            ${this.imageIsConstrained === "false" ? "image--style-disabled" : ""}
          "
        >
          <div class="image__reveal-container">
            <img
              src="${event.logo.url}"
              alt="${event.name.text}"
              class="image__img"
            >
          </div>
        </div>
      `;
    }
    return image;
  },
  _renderDateBadge(event) {
    let html = "";
    if (event.start?.local) {
      const date = new Date(event.start.local);
      html = `
        <span class="event-item__date-badge">
          <span class="event-item__date-badge-day fs-body-bold fs-body-large">
            ${new Intl.DateTimeFormat([], {
        day: "numeric"
      }).format(date)}
          </span>
          <span class="event-item__date-badge-month fs-accent">
            ${new Intl.DateTimeFormat([], {
        month: "short"
      }).format(date)}
          </span>
        </span>
      `;
    }
    return html;
  },
  _renderName(event) {
    let html = "";
    if (event.name?.text) {
      html = `
        <h4 class="event-item__name ff-heading fs-heading-3-base animation-fade-up-reveal ${this.eventHeadingType}">
          ${event.name.text}
        </h4>
      `;
    }
    return html;
  },
  _renderDate(event) {
    let html = "";
    if (event.start?.local) {
      const date = new Date(event.start.local);
      html = `
        <p class="event-item__date fs-body-base animation-fade-up-reveal">
          ${date.toLocaleDateString([], {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      })}
          ${date.toLocaleTimeString([], {
        timeZone: event.start.timezone,
        hour: "numeric",
        minute: "2-digit"
      })}
        </p>
      `;
    }
    return html;
  },
  _renderVenue(event) {
    let html = "";
    if (event.venue?.name) {
      html = `
        <p class="event-item__venue fs-body-base animation-fade-up-reveal">
          ${event.venue.name}
        </p>
      `;
    }
    return html;
  },
  _renderSummary(event) {
    let html = "";
    if (event.summary) {
      html = `
        <div class="event-item__summary fs-body-base rte animation-fade-up-reveal">
          <p>
            ${event.summary}
          </p>
        </div>
      `;
    }
    return html;
  },
  onUnload() {
    this.animateEvents?.destroy();
  }
});

register("cart", {
  onLoad() {
    const {
      enableCartAjax
    } = this.container.dataset;
    const ajaxEnabled = enableCartAjax === "true";
    this.form = n$2("[data-form]", this.container);
    if (!this.form) return;
    const buttons = t$3("[data-change]", this.container);
    const quantityInput = n$2("[data-quantity-input]", this.container);
    this.timer;
    this.events = [e$3(buttons, "click", e => {
      e.preventDefault();
      const {
        change
      } = e.currentTarget.dataset;
      const input = n$2("input", e.currentTarget.parentNode);
      if (change === "increment") {
        input.value >= 0 && input.value++;
      } else if (change === "decrement") {
        input.value > 0 && input.value--;
      }
      if (ajaxEnabled) this.handleTimeout();
    })];
    if (ajaxEnabled) {
      this.events.push(e$3(quantityInput, "input", this.handleTimeout));
    }
  },
  handleTimeout() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.form.submit();
    }, 1000);
  },
  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
  }
});

// Public Methods
// -----------------------------------------------------------------------------

/**
 * Returns a URL with a variant ID query parameter. Useful for updating window.history
 * with a new URL based on the currently select product variant.
 * @param {string} url - The URL you wish to append the variant ID to
 * @param {number} id  - The variant ID you wish to append to the URL
 * @returns {string} - The new url which includes the variant ID query parameter
 */

function getUrlWithVariant(url, id) {
  if (/variant=/.test(url)) {
    return url.replace(/(variant=)[^&]+/, '$1' + id);
  } else if (/\?/.test(url)) {
    return url.concat('&variant=').concat(id);
  }

  return url.concat('?variant=').concat(id);
}

const routes = window.theme.routes.cart || {};
const {
  strings
} = window.theme;
const selectors$4 = {
  productVariant: '[data-variant-select]',
  form: '[data-form]',
  country: '[data-address-country]',
  province: '[data-address-province]',
  provinceWrapper: '[data-address-province-wrapper]',
  zip: '[data-address-zip]',
  modal: '[data-estimator-modal]',
  wash: '[data-mobile-wash]',
  trigger: '[data-estimator-trigger]',
  estimateButton: '[data-estimator-button]',
  success: '[data-estimator-success]',
  error: '[data-estimator-error]',
  close: '[data-close-icon]'
};
const classes$2 = {
  active: 'active',
  hidden: 'hidden',
  visible: 'is-visible',
  fixed: 'is-fixed'
};
const ShippingEstimator = node => {
  const form = n$2(selectors$4.form, node);
  const productSelect = n$2(selectors$4.productVariant, document);
  const countrySelector = n$2(selectors$4.country, node);
  const provinceSelector = n$2(selectors$4.province, node);
  const provinceWrapper = n$2(selectors$4.provinceWrapper, node);
  const zipInput = n$2(selectors$4.zip, node);
  const modal = n$2(selectors$4.modal, node);
  const wash = n$2(selectors$4.wash, node);
  const trigger = n$2(selectors$4.trigger, node);
  const estimate = n$2(selectors$4.estimateButton, node);
  const successMessage = n$2(selectors$4.success, node);
  const errorMessage = n$2(selectors$4.error, node);
  let focusTrap = null;
  let cartCookie;

  // Add dummy placeholder option
  const firstCountryOptions = t$3('option', countrySelector);
  if (firstCountryOptions.length > 1) {
    firstCountryOptions[0].setAttribute('selected', true);
    firstCountryOptions[0].innerText = strings.product.country_placeholder;
  }
  _checkForProvince();
  const events = [e$3(form, 'submit', e => {
    e.preventDefault();
    _estimateShipping();
  }), e$3(countrySelector, 'change', _checkForProvince), e$3(trigger, 'click', _open), e$3(wash, 'click', _close), e$3(n$2(selectors$4.close, node), 'click', _close), e$3(estimate, 'click', _estimateShipping), e$3(node, 'keydown', ({
    keyCode
  }) => {
    if (keyCode === 27) _close();
  })];

  /* get cookie by name */
  const getCookie = name => {
    const value = '; ' + document.cookie;
    const parts = value.split('; ' + name + '=');
    if (parts.length == 2) return parts.pop().split(';').shift();
  };

  /* update the cart cookie value */
  const updateCartCookie = a => {
    const date = new Date();
    date.setTime(date.getTime() + 14 * 86400000);
    const expires = '; expires=' + date.toGMTString();
    document.cookie = 'cart=' + a + expires + '; path=/';
  };

  /* reset the cart cookie value */
  const resetCartCookie = () => {
    updateCartCookie(cartCookie);
  };

  /* get the rates */
  const getRates = variantId => {
    u$1(estimate, 'loading');
    if (typeof variantId === 'undefined') return;
    const productQuantity = n$2('[data-quantity-input]', node);
    const quantity = productQuantity ? parseInt(productQuantity.value) : 1;
    const addData = {
      id: variantId,
      quantity: quantity
    };
    fetch(routes.add + '.js', {
      body: JSON.stringify(addData),
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'xmlhttprequest'
      },
      method: 'POST'
    }).then(response => {
      return response.json();
    }).then(() => {
      errorMessage.innerHTML = '';
      successMessage.innerHTML = '';
      i$1(successMessage, 'active');
      const countryQuery = `shipping_address%5Bcountry%5D=${countrySelector.value}`;
      const provinceQuery = `shipping_address%5Bprovince%5D=${provinceSelector.value}`;
      const zipQuery = `shipping_address%5Bzip%5D=${zipInput.value}`;
      const requestUrl = `${routes.shipping}.json?${countryQuery}&${provinceQuery}&${zipQuery}`;
      const request = new XMLHttpRequest();
      request.open('GET', requestUrl, true);
      request.onload = () => {
        const response = JSON.parse(request.response);
        if (request.status >= 200 && request.status < 300) {
          if (response.shipping_rates && response.shipping_rates.length) {
            u$1(successMessage, 'active');
            response.shipping_rates.forEach(rate => {
              const rateElement = `
                  <li class="shipping-estimator-modal__success-item">
                    <h4 class="ff-body fs-body-bold">${rate.name}</h4>
                    <span class="ff-body fs-body-small">${formatMoney(rate.price)}</span>
                  </li>
                `;
              successMessage.insertAdjacentHTML('beforeend', rateElement);
            });
          } else {
            const noRate = `
                <li class="shipping-estimator-modal__success-item">
                  <span class="ff-body fs-body-small">${strings.product.no_shipping_rates}</span>
                </li>
              `;
            successMessage.insertAdjacentHTML('beforeend', noRate);
          }
        } else {
          for (const [key, value] of Object.entries(response)) {
            const errorElement = `
              <li class="shipping-estimator-modal__error-item">
                <p class="ff-body fs-body-small"><span>${key}</span> ${value}</p>
              </li>
            `;
            errorMessage.insertAdjacentHTML('beforeend', errorElement);
          }
        }
        resetCartCookie();
        i$1(estimate, 'loading');
      };
      request.send();
    }).catch(() => {
      resetCartCookie();
      i$1(estimate, 'loading');
    });
  };
  function _checkForProvince() {
    const selected = n$2(`[value="${countrySelector.value}"]`, countrySelector);
    const provinces = JSON.parse(selected.dataset.provinces);
    l(provinceWrapper, classes$2.hidden, !provinces.length);
    provinceSelector.innerHTML = provinces.reduce((acc, curr) => {
      return acc + `<option value="${curr[0]}">${curr[0]}</option>`;
    }, '');
  }
  function _estimateShipping() {
    if (!productSelect.value.length) return;
    cartCookie = getCookie('cart');
    let tempCookieValue = 'temp-cart-cookie___' + Date.now();
    let fakeCookieValue = 'fake-cart-cookie___' + Date.now();

    // If not found, make a new temp cookie
    if (!cartCookie) {
      updateCartCookie(tempCookieValue);
      cartCookie = getCookie('cart');
    }

    // If found but has a weird length, abort
    if (cartCookie.length < 32) return;

    /* Change the cookie value to a new 32 character value */
    updateCartCookie(fakeCookieValue);
    getRates(parseInt(productSelect.value));
  }
  function _open(e) {
    e.preventDefault();
    u$1(modal, classes$2.fixed);
    setTimeout(() => {
      u$1(modal, classes$2.visible, classes$2.active);
    }, 50);
    modal.setAttribute('aria-hidden', 'false');
    focusTrap = createFocusTrap(modal, {
      allowOutsideClick: true
    });
    focusTrap.activate();
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute('data-scroll-lock-ignore') !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  }
  function _close(e) {
    e && e.preventDefault();
    i$1(modal, classes$2.visible, classes$2.active);
    focusTrap && focusTrap.deactivate();
    setTimeout(() => {
      i$1(modal, classes$2.fixed);
    }, 300);
    modal.setAttribute('aria-hidden', 'true');
    enableBodyScroll(node);
  }
  return () => {
    events.forEach(unsubscribe => unsubscribe());
  };
};

function wrapIframes (elements = []) {
  elements.forEach(el => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('rte__iframe');
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    el.src = el.src;
  });
}

function wrapTables (elements = []) {
  elements.forEach(el => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('rte__table-wrapper');
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
  });
}

const selectors$3 = {
  form: id => `[data-product-form][data-product-id='${id}']`,
  addToCart: "[data-add-to-cart]",
  variantSelect: "[data-variant-select]",
  optionById: id => `[value='${id}']`,
  thumb: "[data-product-thumbnail]",
  shippingEstimatorButton: "[data-estimator-trigger]",
  storeAvailability: "[data-store-availability-container]",
  quantityError: "[data-quantity-error]",
  customtextInput: "[data-custom-text-input]",
  customtextInputTarget: "[data-custom-text-input-target]",
  giftCardRecipientForm: ".product-form__gift-card-recipient",
  giftCardRecipientErrors: ".gift-card-recipient__form-errors"
};
register("product", {
  productForm: null,
  reviewsHandler: null,
  accordions: [],
  onLoad() {
    const {
      productId,
      productHasOnlyDefaultVariant,
      enableStickyProductDetails,
      galleryStyle,
      mobileGalleryStyle
    } = this.container.dataset;
    this.formElement = n$2(selectors$3.form(productId), this.container);
    this.galleryStyle = galleryStyle;
    this.mobileGalleryStyle = mobileGalleryStyle;
    this.images = t$3("[data-open]", this.container);
    this.quantityError = n$2(selectors$3.quantityError, this.container);
    this.viewInYourSpace = n$2("[data-in-your-space]", this.container);
    this.viewInYourSpace && l(this.viewInYourSpace, "visible", isMobile$1());
    this.productThumbs = t$3(selectors$3.thumb, this.container);
    this.complementaryProducts = complementaryProducts(this.container);

    // Handle Surface pickup
    this.storeAvailabilityContainer = n$2(selectors$3.storeAvailability, this.container);
    this.availability = null;
    window.SPRCallbacks = {};
    window.SPRCallbacks.onReviewsLoad = () => {
      if (!this.reviewsHandler) {
        this.reviewsHandler = reviewsHandler();
      }
    };
    window.SPRCallbacks.onFormFailure = () => {
      r$3("spr-form:updated");
    };
    window.SPRCallbacks.onFormSuccess = () => {
      r$3("spr-form:updated");
    };
    if (this.formElement) {
      const {
        productHandle,
        currentProductId
      } = this.formElement.dataset;
      const product = getProduct(productHandle);
      product(data => {
        const variant = getVariantFromId(data, parseInt(currentProductId));
        if (this.storeAvailabilityContainer && variant) {
          this.availability = storeAvailability(this.storeAvailabilityContainer, data, variant, {
            hideVariantTitle: productHasOnlyDefaultVariant === "true"
          });
        }
        const quickPurchaseBarEnabled = n$2("[data-quick-purchase-bar]", this.container);
        if (quickPurchaseBarEnabled) {
          this.quickPurchaseBar = quickPurchaseBar(this.container, variant);
        }
        this.productForm = ProductForm(this.container, this.formElement, data, {
          onOptionChange: e => this.onOptionChange(e),
          onFormSubmit: e => this.onFormSubmit(e),
          onQuantityChange: e => this.onQuantityChange(e)
        });
        const productInventoryJson = n$2("[data-product-inventory-json]", this.container);
        if (productInventoryJson) {
          const jsonData = JSON.parse(productInventoryJson.innerHTML);
          const variantsInventories = jsonData.inventory;
          if (variantsInventories) {
            const config = {
              id: variant.id,
              variantsInventories
            };
            this.inventoryCounter = inventoryCounter(this.container, config);
          }
        }
      });
    }
    this.quantityInput = quantityInput(this.container);
    this.customtextInput = n$2(selectors$3.customtextInput, this.container);
    this.customtextInputTarget = n$2(selectors$3.customtextInputTarget, this.container);
    this.socialButtons = t$3("[data-social-share]", this.container);
    const accordionElements = t$3(".accordion", this.container);
    accordionElements.forEach(accordion => {
      const accordionOpen = accordion.classList.contains("accordion--open");
      this.accordions.push(Accordions(accordion, {
        firstOpen: accordionOpen
      }));
      const accordionParent = accordion.parentElement;
      if (accordionParent.classList.contains("rte--product") && !accordionParent.classList.contains("accordion accordion--product")) {
        accordion.classList.add("rte--product", "accordion--product");
      }
    });
    this.lightbox = Lightbox(n$2("[data-lightbox]", this.container));
    this.media = Media(this.container);
    this.optionButtons = OptionButtons(t$3("[data-option-buttons]", this.container));
    this.variantPopup = variantPopup(this.container);
    this.shippingEstimatorButtons = t$3(selectors$3.shippingEstimatorButton, this.container);
    this.shippingEstimator = this.shippingEstimatorButtons.map(button => ShippingEstimator(button.parentNode));
    const productDescriptionWrapper = n$2(".product__description", this.container);
    if (productDescriptionWrapper) {
      wrapIframes(t$3("iframe", productDescriptionWrapper));
      wrapTables(t$3("table", productDescriptionWrapper));
    }
    this._initEvents();
    if (n$2(".product__media-slider", this.container)) {
      this.mobileCarousel = mobileCarousel(this.container);
    }
    if (enableStickyProductDetails === "true" && !isMobile$1()) {
      this.stickyScroll = stickyScroll(this.container);
    }

    // Handle dynamic variant options
    this.variantAvailability = variantAvailability(this.container);

    // Init animation
    this.AnimateProduct = AnimateProduct(this.container);

    // Handle sibling products
    this.siblingProducts = siblingProducts(this.container);
    this.giftCardRecipient = giftCardRecipient(this.container);
  },
  _initEvents() {
    this.events = [e$3(this.productThumbs, "click", e => {
      e.preventDefault();
      const {
        currentTarget: {
          dataset
        }
      } = e;
      this.productThumbs.forEach(thumb => i$1(thumb, "active"));
      u$1(e.currentTarget, "active");
      switchImage(this.container, dataset.thumbnailId, this.viewInYourSpace);
    }), e$3(this.images, "click", e => {
      e.preventDefault();
      this.lightbox.open(e.currentTarget.dataset.open);
    }), e$3(this.socialButtons, "click", e => {
      l(e.target, "active");
      const sub = n$2(".article__share-icons", e.target);
      sub.setAttribute("aria-hidden", !a$1(e.target, "active"));
    })];

    // Adds listener for note input changes
    if (this.customtextInput) {
      this.events.push(e$3(this.customtextInput, "change", e => {
        // Update the hidden note input within the form
        this.customtextInputTarget.value = e.target.value;
      }));
    }
  },
  // When the user changes a product option
  onOptionChange({
    dataset: {
      variant
    }
  }) {
    const buyButton = n$2(selectors$3.addToCart, this.container);

    // Update prices to reflect selected variant
    updatePrices(this.container, variant);

    // Update buy button
    updateBuyButton(buyButton, variant);

    // Update unit pricing
    updateUnitPrices(this.container, variant);

    // Update sku
    updateSku(this.container, variant);
    this.inventoryCounter && this.inventoryCounter.update(variant);
    dispatchCustomEvent("product:variant-change", {
      variant: variant
    });
    if (!variant) {
      updateBuyButton(n$2("[data-add-to-cart]", this.container), false);
      this.shippingEstimatorButtons.forEach(btn => u$1(btn, "hidden"));
      this.availability && this.availability.unload();
      return;
    }
    this.quickPurchaseBar && this.quickPurchaseBar.update(variant);

    // Update URL with selected variant
    const url = getUrlWithVariant(window.location.href, variant.id);
    window.history.replaceState({
      path: url
    }, "", url);

    // We need to set the id input manually so the Dynamic Checkout Button works
    const selectedVariantOpt = n$2(`${selectors$3.variantSelect} ${selectors$3.optionById(variant.id)}`, this.container);
    selectedVariantOpt.selected = true;

    // We need to dispatch an event so Shopify pay knows the form has changed
    this.formElement.dispatchEvent(new Event("change"));

    // Update selected variant image and thumb
    if (variant.featured_media) {
      // Desktop and mobile share the thumbnails-style gallery, so handle both at once
      if (this.galleryStyle === "thumbnails" || this.mobileGalleryStyle === "thumbnails") {
        switchImage(this.container, variant.featured_media.id, this.viewInYourSpace);
        const thumb = n$2(`[data-thumbnail-id="${variant.featured_media.id}"]`, this.container);
        this.productThumbs.forEach(thumb => i$1(thumb, "active"));
        u$1(thumb, "active");
      }

      // Scroll to variant image if desktop grid or list
      if (!isMobile$1() && this.galleryStyle !== "thumbnails") {
        const targetImage = n$2(`.product__media [data-media-id="${variant.featured_media.id}"]`);
        targetImage.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        });
      }

      // Switch slide when mobile slider
      if (isMobile$1() && this.mobileGalleryStyle === "slider") {
        this.mobileCarousel.select(variant.featured_media.position - 1);
      }
    }

    // Update product availability content
    this.availability && this.availability.update(variant);
    this.shippingEstimatorButtons.forEach(btn => i$1(btn, "hidden"));
  },
  // When user updates quantity
  onQuantityChange({
    dataset: {
      variant,
      quantity
    }
  }) {
    // Adjust the hidden quantity input within the form
    const quantityInputs = [...t$3('[name="quantity"]', this.formElement)];
    quantityInputs.forEach(quantityInput => {
      quantityInput.value = quantity;
    });
    dispatchCustomEvent("product:quantity-update", {
      quantity: quantity,
      variant: variant
    });
    if (!variant) return;
    this.quickPurchaseBar && this.quickPurchaseBar.update(variant);
  },
  // When user submits the product form
  onFormSubmit(e) {
    const {
      enableQuickCart
    } = document.body.dataset;
    if (!enableQuickCart) return;
    e.preventDefault();
    u$1(this.quantityError, "hidden");
    const button = n$2(selectors$3.addToCart, this.container);
    u$1(button, "loading");
    cart.addItem(this.formElement).then(({
      item
    }) => {
      i$1(button, "loading");
      r$3("cart:open", null, {
        flash: item.variant_id
      });
      dispatchCustomEvent("cart:item-added", {
        product: item
      });
    }).catch(error => {
      const button = n$2(selectors$3.addToCart, this.container);
      if (typeof error.message === "object") {
        const sectionID = n$2(selectors$3.giftCardRecipientForm, this.container).dataset.sectionId;
        const errorContainer = n$2(selectors$3.giftCardRecipientErrors, this.container);
        const errorList = n$2("ul", errorContainer);
        Object.entries(error.message).forEach(([key, value]) => {
          const errorID = `#gift-card-recipient-${key}--${sectionID}`;
          const errorItem = document.createElement("li");
          const errorLink = document.createElement("a");
          const errorInput = n$2(errorID, this.container);
          errorLink.href = errorID;
          errorLink.innerText = value;
          errorItem.appendChild(errorLink);
          errorList.appendChild(errorItem);
          u$1(errorInput, "input-error");
        });
        errorContainer.hidden = false;
      } else {
        i$1(this.quantityError, "hidden");
      }
      i$1(button, "loading");
    });
  },
  onBlockSelect({
    target
  }) {
    const label = n$2(".accordion__label", target);
    target.scrollIntoView({
      block: "center",
      behavior: "smooth"
    });
    if (!label) return;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    slideDown(content);
    group.setAttribute("data-open", true);
    label.setAttribute("aria-expanded", true);
    content.setAttribute("aria-hidden", false);
  },
  onBlockDeselect({
    target
  }) {
    const label = n$2(".accordion__label", target);
    if (!label) return;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    slideUp(content);
    group.setAttribute("data-open", false);
    label.setAttribute("aria-expanded", false);
    content.setAttribute("aria-hidden", true);
  },
  onUnload() {
    this.productForm.destroy();
    this.lightbox.destroy();
    this.shippingEstimator.forEach(unsubscribe => unsubscribe());
    this.accordions.forEach(accordion => accordion.unload());
    this.optionButtons.destroy();
    this.quantityInput.unload();
    this.events.forEach(unsubscribe => unsubscribe());
    this.quickPurchaseBar && this.quickPurchaseBar.unload();
    this.reviewsHandler && this.reviewsHandler.unload();
    this.mobileCarousel?.unload();
    this.variantAvailability?.unload();
    this.complementaryProducts?.unload();
    this.siblingProducts?.unload();
    this.giftCardRecipient?.unload();
  }
});

/* @preserve
 * https://github.com/Elkfox/Ajaxinate
 * Copyright (c) 2017 Elkfox Co Pty Ltd (elkfox.com)
 * MIT License (do not remove above copyright!)
 */

/* Configurable options;
 *
 * method: scroll or click
 * container: selector of repeating content
 * pagination: selector of pagination container
 * offset: number of pixels before the bottom to start loading more on scroll
 * loadingText: 'Loading', The text shown during when appending new content
 * callback: null, callback function after new content is appended
 *
 * Usage;
 *
 * import {Ajaxinate} from 'ajaxinate';
 *
 * new Ajaxinate({
 *   offset: 5000,
 *   loadingText: 'Loading more...',
 * });
 */

/* eslint-env browser */
function Ajaxinate(config) {
  const settings = config || {};

  const defaults = {
    method: "scroll",
    container: "#AjaxinateContainer",
    pagination: "#AjaxinatePagination",
    offset: 0,
    loadingText: "Loading",
    callback: null,
  };

  // Merge custom configs with defaults
  this.settings = Object.assign(defaults, settings);

  // Functions
  this.addScrollListeners = this.addScrollListeners.bind(this);
  this.addClickListener = this.addClickListener.bind(this);
  this.checkIfPaginationInView = this.checkIfPaginationInView.bind(this);
  this.preventMultipleClicks = this.preventMultipleClicks.bind(this);
  this.removeClickListener = this.removeClickListener.bind(this);
  this.removeScrollListener = this.removeScrollListener.bind(this);
  this.removePaginationElement = this.removePaginationElement.bind(this);
  this.destroy = this.destroy.bind(this);

  // Selectors
  this.containerElement = document.querySelector(this.settings.container);
  this.paginationElement = document.querySelector(this.settings.pagination);
  this.initialize();
}

Ajaxinate.prototype.initialize = function initialize() {
  if (!this.containerElement) {
    return;
  }

  const initializers = {
    click: this.addClickListener,
    scroll: this.addScrollListeners,
  };

  initializers[this.settings.method]();
};

Ajaxinate.prototype.addScrollListeners = function addScrollListeners() {
  if (!this.paginationElement) {
    return;
  }

  document.addEventListener("scroll", this.checkIfPaginationInView);
  window.addEventListener("resize", this.checkIfPaginationInView);
  window.addEventListener("orientationchange", this.checkIfPaginationInView);
};

Ajaxinate.prototype.addClickListener = function addClickListener() {
  if (!this.paginationElement) {
    return;
  }

  this.nextPageLinkElement = this.paginationElement.querySelector("a");
  this.clickActive = true;

  if (
    typeof this.nextPageLinkElement !== "undefined" &&
    this.nextPageLinkElement !== null
  ) {
    this.nextPageLinkElement.addEventListener(
      "click",
      this.preventMultipleClicks
    );
  }
};

Ajaxinate.prototype.preventMultipleClicks = function preventMultipleClicks(
  event
) {
  event.preventDefault();

  if (!this.clickActive) {
    return;
  }

  this.nextPageLinkElement.innerText = this.settings.loadingText;
  this.nextPageUrl = this.nextPageLinkElement.href;
  this.clickActive = false;

  this.loadMore();
};

Ajaxinate.prototype.checkIfPaginationInView = function checkIfPaginationInView() {
  const top =
    this.paginationElement.getBoundingClientRect().top - this.settings.offset;
  const bottom =
    this.paginationElement.getBoundingClientRect().bottom +
    this.settings.offset;

  if (top <= window.innerHeight && bottom >= 0) {
    this.nextPageLinkElement = this.paginationElement.querySelector("a");
    this.removeScrollListener();

    if (this.nextPageLinkElement) {
      this.nextPageLinkElement.innerText = this.settings.loadingText;
      this.nextPageUrl = this.nextPageLinkElement.href;

      this.loadMore();
    }
  }
};

Ajaxinate.prototype.loadMore = function getTheHtmlOfTheNextPageWithAnAjaxRequest() {
  this.request = new XMLHttpRequest();
  this.request.onreadystatechange = function success() {
    if (this.request.readyState === 4 && this.request.status === 200) {
      var parser = new DOMParser();
      var htmlDoc = parser.parseFromString(
        this.request.responseText,
        "text/html"
      );
      var newContainer = htmlDoc.querySelectorAll(this.settings.container)[0];
      var newPagination = htmlDoc.querySelectorAll(this.settings.pagination)[0];
      this.containerElement.insertAdjacentHTML(
        "beforeend",
        newContainer.innerHTML
      );
      this.paginationElement.innerHTML = newPagination.innerHTML;
      if (
        this.settings.callback &&
        typeof this.settings.callback === "function"
      ) {
        this.settings.callback(this.request.responseXML);
      }
      this.initialize();
    }
  }.bind(this);
  this.request.open("GET", this.nextPageUrl, false);
  this.request.send();
};

Ajaxinate.prototype.removeClickListener = function removeClickListener() {
  this.nextPageLinkElement.removeEventListener(
    "click",
    this.preventMultipleClicks
  );
};

Ajaxinate.prototype.removePaginationElement = function removePaginationElement() {
  this.paginationElement.innerHTML = "";
  this.destroy();
};

Ajaxinate.prototype.removeScrollListener = function removeScrollListener() {
  document.removeEventListener("scroll", this.checkIfPaginationInView);
  window.removeEventListener("resize", this.checkIfPaginationInView);
  window.removeEventListener("orientationchange", this.checkIfPaginationInView);
};

Ajaxinate.prototype.destroy = function destroy() {
  const destroyers = {
    click: this.removeClickListener,
    scroll: this.removeScrollListener,
  };

  destroyers[this.settings.method]();

  return this;
};

const FILTERS_REMOVE = 'collection:filters:remove';
const RANGE_REMOVE = 'collection:range:remove';
const EVERYTHING_CLEAR = 'collection:clear';
const FILTERS_UPDATE = 'collection:filters:update';
const updateFilters = target => r$3(FILTERS_UPDATE, null, {
  target
});
const removeFilters = target => r$3(FILTERS_REMOVE, null, {
  target
});
const removeRange = () => r$3(RANGE_REMOVE);
const filtersUpdated = cb => c(FILTERS_UPDATE, cb);
const filtersRemoved = cb => c(FILTERS_REMOVE, cb);
const everythingCleared = cb => c(EVERYTHING_CLEAR, cb);
const rangeRemoved = cb => c(RANGE_REMOVE, cb);

const filtering = container => {
  const forms = t$3('[data-filter-form]', container);
  let formData, searchParams;
  setParams();
  function setParams(form) {
    form = form || forms[0];
    formData = new FormData(form);
    searchParams = new URLSearchParams(formData).toString();
  }

  /**
   * Takes the updated form element and updates all other forms with the updated values
   * @param {*} target
   */
  function syncForms(target) {
    if (!target) return;
    const targetInputs = t$3('[data-filter-item]', target);
    targetInputs.forEach(targetInput => {
      if (targetInput.type === 'checkbox' || targetInput.type === 'radio') {
        const items = t$3(`input[name='${targetInput.name}'][value='${targetInput.value}']`);
        items.forEach(input => {
          input.checked = targetInput.checked;
        });
      } else {
        const items = t$3(`input[name='${targetInput.name}']`);
        items.forEach(input => {
          input.value = targetInput.value;
        });
      }
    });
  }

  /**
   * When filters are removed, set the checked attribute to false
   * for all filter inputs for that filter.
   * Can accept multiple filters
   * @param {Array} targets Array of inputs
   */
  function uncheckFilters(targets) {
    if (!targets) return;
    let selector;
    targets.forEach(target => {
      selector = !selector ? '' : `, ${selector}`;
      const {
        name,
        value
      } = target.dataset;
      selector = `input[name='${name}'][value='${value}']${selector}`;
    });
    const inputs = t$3(selector, container);
    inputs.forEach(input => {
      input.checked = false;
    });
  }
  function clearRangeInputs() {
    const rangeInputs = t$3('[data-range-input]', container);
    rangeInputs.forEach(input => {
      input.value = '';
    });
  }
  function resetForms() {
    forms.forEach(form => {
      form.reset();
    });
  }
  return {
    getState() {
      return {
        url: searchParams
      };
    },
    filtersUpdated(target, cb) {
      syncForms(target);
      setParams(target);
      r$3('filters:updated');
      return cb(this.getState());
    },
    removeFilters(target, cb) {
      uncheckFilters(target);
      setParams();
      r$3('filters:filter-removed');
      return cb(this.getState());
    },
    removeRange(cb) {
      clearRangeInputs();
      setParams();
      r$3('filters:range-removed');
      return cb(this.getState());
    },
    clearAll(cb) {
      searchParams = '';
      resetForms();
      return cb(this.getState());
    }
  };
};

const filterHandler = ({
  container,
  partial,
  renderCB
}) => {
  let subscriptions = null;
  let filters = null;
  let delegate = null;
  filters = filtering(container);

  // Set initial evx state from collection url object
  o$1(filters.getState());
  subscriptions = [filtersRemoved((_, {
    target
  }) => {
    filters.removeFilters(target, data => {
      renderCB(data.url);
      o$1(data)();
    });
  }), rangeRemoved(() => {
    filters.removeRange(data => {
      renderCB(data.url);
      o$1(data)();
    });
  }), filtersUpdated((_, {
    target
  }) => {
    filters.filtersUpdated(target, data => {
      renderCB(data.url);
      o$1(data)();
    });
  }), everythingCleared(() => {
    filters.clearAll(data => {
      renderCB(data.url);
      o$1(data)();
    });
  })];
  delegate = new Delegate(partial);
  delegate.on("click", "[data-remove-filter]", e => {
    e.preventDefault();
    removeFilters([e.target]);
  });
  delegate.on("click", "[data-remove-range]", e => {
    e.preventDefault();
    removeRange();
  });
  const unload = () => {
    delegate && delegate.off();
    subscriptions && subscriptions.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
};

var nouislider = {exports: {}};

(function (module, exports) {
(function (global, factory) {
    factory(exports) ;
})(commonjsGlobal, (function (exports) {
    exports.PipsMode = void 0;
    (function (PipsMode) {
        PipsMode["Range"] = "range";
        PipsMode["Steps"] = "steps";
        PipsMode["Positions"] = "positions";
        PipsMode["Count"] = "count";
        PipsMode["Values"] = "values";
    })(exports.PipsMode || (exports.PipsMode = {}));
    exports.PipsType = void 0;
    (function (PipsType) {
        PipsType[PipsType["None"] = -1] = "None";
        PipsType[PipsType["NoValue"] = 0] = "NoValue";
        PipsType[PipsType["LargeValue"] = 1] = "LargeValue";
        PipsType[PipsType["SmallValue"] = 2] = "SmallValue";
    })(exports.PipsType || (exports.PipsType = {}));
    //region Helper Methods
    function isValidFormatter(entry) {
        return isValidPartialFormatter(entry) && typeof entry.from === "function";
    }
    function isValidPartialFormatter(entry) {
        // partial formatters only need a to function and not a from function
        return typeof entry === "object" && typeof entry.to === "function";
    }
    function removeElement(el) {
        el.parentElement.removeChild(el);
    }
    function isSet(value) {
        return value !== null && value !== undefined;
    }
    // Bindable version
    function preventDefault(e) {
        e.preventDefault();
    }
    // Removes duplicates from an array.
    function unique(array) {
        return array.filter(function (a) {
            return !this[a] ? (this[a] = true) : false;
        }, {});
    }
    // Round a value to the closest 'to'.
    function closest(value, to) {
        return Math.round(value / to) * to;
    }
    // Current position of an element relative to the document.
    function offset(elem, orientation) {
        var rect = elem.getBoundingClientRect();
        var doc = elem.ownerDocument;
        var docElem = doc.documentElement;
        var pageOffset = getPageOffset(doc);
        // getBoundingClientRect contains left scroll in Chrome on Android.
        // I haven't found a feature detection that proves this. Worst case
        // scenario on mis-match: the 'tap' feature on horizontal sliders breaks.
        if (/webkit.*Chrome.*Mobile/i.test(navigator.userAgent)) {
            pageOffset.x = 0;
        }
        return orientation ? rect.top + pageOffset.y - docElem.clientTop : rect.left + pageOffset.x - docElem.clientLeft;
    }
    // Checks whether a value is numerical.
    function isNumeric(a) {
        return typeof a === "number" && !isNaN(a) && isFinite(a);
    }
    // Sets a class and removes it after [duration] ms.
    function addClassFor(element, className, duration) {
        if (duration > 0) {
            addClass(element, className);
            setTimeout(function () {
                removeClass(element, className);
            }, duration);
        }
    }
    // Limits a value to 0 - 100
    function limit(a) {
        return Math.max(Math.min(a, 100), 0);
    }
    // Wraps a variable as an array, if it isn't one yet.
    // Note that an input array is returned by reference!
    function asArray(a) {
        return Array.isArray(a) ? a : [a];
    }
    // Counts decimals
    function countDecimals(numStr) {
        numStr = String(numStr);
        var pieces = numStr.split(".");
        return pieces.length > 1 ? pieces[1].length : 0;
    }
    // http://youmightnotneedjquery.com/#add_class
    function addClass(el, className) {
        if (el.classList && !/\s/.test(className)) {
            el.classList.add(className);
        }
        else {
            el.className += " " + className;
        }
    }
    // http://youmightnotneedjquery.com/#remove_class
    function removeClass(el, className) {
        if (el.classList && !/\s/.test(className)) {
            el.classList.remove(className);
        }
        else {
            el.className = el.className.replace(new RegExp("(^|\\b)" + className.split(" ").join("|") + "(\\b|$)", "gi"), " ");
        }
    }
    // https://plainjs.com/javascript/attributes/adding-removing-and-testing-for-classes-9/
    function hasClass(el, className) {
        return el.classList ? el.classList.contains(className) : new RegExp("\\b" + className + "\\b").test(el.className);
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY#Notes
    function getPageOffset(doc) {
        var supportPageOffset = window.pageXOffset !== undefined;
        var isCSS1Compat = (doc.compatMode || "") === "CSS1Compat";
        var x = supportPageOffset
            ? window.pageXOffset
            : isCSS1Compat
                ? doc.documentElement.scrollLeft
                : doc.body.scrollLeft;
        var y = supportPageOffset
            ? window.pageYOffset
            : isCSS1Compat
                ? doc.documentElement.scrollTop
                : doc.body.scrollTop;
        return {
            x: x,
            y: y,
        };
    }
    // we provide a function to compute constants instead
    // of accessing window.* as soon as the module needs it
    // so that we do not compute anything if not needed
    function getActions() {
        // Determine the events to bind. IE11 implements pointerEvents without
        // a prefix, which breaks compatibility with the IE10 implementation.
        return window.navigator.pointerEnabled
            ? {
                start: "pointerdown",
                move: "pointermove",
                end: "pointerup",
            }
            : window.navigator.msPointerEnabled
                ? {
                    start: "MSPointerDown",
                    move: "MSPointerMove",
                    end: "MSPointerUp",
                }
                : {
                    start: "mousedown touchstart",
                    move: "mousemove touchmove",
                    end: "mouseup touchend",
                };
    }
    // https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
    // Issue #785
    function getSupportsPassive() {
        var supportsPassive = false;
        /* eslint-disable */
        try {
            var opts = Object.defineProperty({}, "passive", {
                get: function () {
                    supportsPassive = true;
                },
            });
            // @ts-ignore
            window.addEventListener("test", null, opts);
        }
        catch (e) { }
        /* eslint-enable */
        return supportsPassive;
    }
    function getSupportsTouchActionNone() {
        return window.CSS && CSS.supports && CSS.supports("touch-action", "none");
    }
    //endregion
    //region Range Calculation
    // Determine the size of a sub-range in relation to a full range.
    function subRangeRatio(pa, pb) {
        return 100 / (pb - pa);
    }
    // (percentage) How many percent is this value of this range?
    function fromPercentage(range, value, startRange) {
        return (value * 100) / (range[startRange + 1] - range[startRange]);
    }
    // (percentage) Where is this value on this range?
    function toPercentage(range, value) {
        return fromPercentage(range, range[0] < 0 ? value + Math.abs(range[0]) : value - range[0], 0);
    }
    // (value) How much is this percentage on this range?
    function isPercentage(range, value) {
        return (value * (range[1] - range[0])) / 100 + range[0];
    }
    function getJ(value, arr) {
        var j = 1;
        while (value >= arr[j]) {
            j += 1;
        }
        return j;
    }
    // (percentage) Input a value, find where, on a scale of 0-100, it applies.
    function toStepping(xVal, xPct, value) {
        if (value >= xVal.slice(-1)[0]) {
            return 100;
        }
        var j = getJ(value, xVal);
        var va = xVal[j - 1];
        var vb = xVal[j];
        var pa = xPct[j - 1];
        var pb = xPct[j];
        return pa + toPercentage([va, vb], value) / subRangeRatio(pa, pb);
    }
    // (value) Input a percentage, find where it is on the specified range.
    function fromStepping(xVal, xPct, value) {
        // There is no range group that fits 100
        if (value >= 100) {
            return xVal.slice(-1)[0];
        }
        var j = getJ(value, xPct);
        var va = xVal[j - 1];
        var vb = xVal[j];
        var pa = xPct[j - 1];
        var pb = xPct[j];
        return isPercentage([va, vb], (value - pa) * subRangeRatio(pa, pb));
    }
    // (percentage) Get the step that applies at a certain value.
    function getStep(xPct, xSteps, snap, value) {
        if (value === 100) {
            return value;
        }
        var j = getJ(value, xPct);
        var a = xPct[j - 1];
        var b = xPct[j];
        // If 'snap' is set, steps are used as fixed points on the slider.
        if (snap) {
            // Find the closest position, a or b.
            if (value - a > (b - a) / 2) {
                return b;
            }
            return a;
        }
        if (!xSteps[j - 1]) {
            return value;
        }
        return xPct[j - 1] + closest(value - xPct[j - 1], xSteps[j - 1]);
    }
    //endregion
    //region Spectrum
    var Spectrum = /** @class */ (function () {
        function Spectrum(entry, snap, singleStep) {
            this.xPct = [];
            this.xVal = [];
            this.xSteps = [];
            this.xNumSteps = [];
            this.xHighestCompleteStep = [];
            this.xSteps = [singleStep || false];
            this.xNumSteps = [false];
            this.snap = snap;
            var index;
            var ordered = [];
            // Map the object keys to an array.
            Object.keys(entry).forEach(function (index) {
                ordered.push([asArray(entry[index]), index]);
            });
            // Sort all entries by value (numeric sort).
            ordered.sort(function (a, b) {
                return a[0][0] - b[0][0];
            });
            // Convert all entries to subranges.
            for (index = 0; index < ordered.length; index++) {
                this.handleEntryPoint(ordered[index][1], ordered[index][0]);
            }
            // Store the actual step values.
            // xSteps is sorted in the same order as xPct and xVal.
            this.xNumSteps = this.xSteps.slice(0);
            // Convert all numeric steps to the percentage of the subrange they represent.
            for (index = 0; index < this.xNumSteps.length; index++) {
                this.handleStepPoint(index, this.xNumSteps[index]);
            }
        }
        Spectrum.prototype.getDistance = function (value) {
            var distances = [];
            for (var index = 0; index < this.xNumSteps.length - 1; index++) {
                distances[index] = fromPercentage(this.xVal, value, index);
            }
            return distances;
        };
        // Calculate the percentual distance over the whole scale of ranges.
        // direction: 0 = backwards / 1 = forwards
        Spectrum.prototype.getAbsoluteDistance = function (value, distances, direction) {
            var xPct_index = 0;
            // Calculate range where to start calculation
            if (value < this.xPct[this.xPct.length - 1]) {
                while (value > this.xPct[xPct_index + 1]) {
                    xPct_index++;
                }
            }
            else if (value === this.xPct[this.xPct.length - 1]) {
                xPct_index = this.xPct.length - 2;
            }
            // If looking backwards and the value is exactly at a range separator then look one range further
            if (!direction && value === this.xPct[xPct_index + 1]) {
                xPct_index++;
            }
            if (distances === null) {
                distances = [];
            }
            var start_factor;
            var rest_factor = 1;
            var rest_rel_distance = distances[xPct_index];
            var range_pct = 0;
            var rel_range_distance = 0;
            var abs_distance_counter = 0;
            var range_counter = 0;
            // Calculate what part of the start range the value is
            if (direction) {
                start_factor = (value - this.xPct[xPct_index]) / (this.xPct[xPct_index + 1] - this.xPct[xPct_index]);
            }
            else {
                start_factor = (this.xPct[xPct_index + 1] - value) / (this.xPct[xPct_index + 1] - this.xPct[xPct_index]);
            }
            // Do until the complete distance across ranges is calculated
            while (rest_rel_distance > 0) {
                // Calculate the percentage of total range
                range_pct = this.xPct[xPct_index + 1 + range_counter] - this.xPct[xPct_index + range_counter];
                // Detect if the margin, padding or limit is larger then the current range and calculate
                if (distances[xPct_index + range_counter] * rest_factor + 100 - start_factor * 100 > 100) {
                    // If larger then take the percentual distance of the whole range
                    rel_range_distance = range_pct * start_factor;
                    // Rest factor of relative percentual distance still to be calculated
                    rest_factor = (rest_rel_distance - 100 * start_factor) / distances[xPct_index + range_counter];
                    // Set start factor to 1 as for next range it does not apply.
                    start_factor = 1;
                }
                else {
                    // If smaller or equal then take the percentual distance of the calculate percentual part of that range
                    rel_range_distance = ((distances[xPct_index + range_counter] * range_pct) / 100) * rest_factor;
                    // No rest left as the rest fits in current range
                    rest_factor = 0;
                }
                if (direction) {
                    abs_distance_counter = abs_distance_counter - rel_range_distance;
                    // Limit range to first range when distance becomes outside of minimum range
                    if (this.xPct.length + range_counter >= 1) {
                        range_counter--;
                    }
                }
                else {
                    abs_distance_counter = abs_distance_counter + rel_range_distance;
                    // Limit range to last range when distance becomes outside of maximum range
                    if (this.xPct.length - range_counter >= 1) {
                        range_counter++;
                    }
                }
                // Rest of relative percentual distance still to be calculated
                rest_rel_distance = distances[xPct_index + range_counter] * rest_factor;
            }
            return value + abs_distance_counter;
        };
        Spectrum.prototype.toStepping = function (value) {
            value = toStepping(this.xVal, this.xPct, value);
            return value;
        };
        Spectrum.prototype.fromStepping = function (value) {
            return fromStepping(this.xVal, this.xPct, value);
        };
        Spectrum.prototype.getStep = function (value) {
            value = getStep(this.xPct, this.xSteps, this.snap, value);
            return value;
        };
        Spectrum.prototype.getDefaultStep = function (value, isDown, size) {
            var j = getJ(value, this.xPct);
            // When at the top or stepping down, look at the previous sub-range
            if (value === 100 || (isDown && value === this.xPct[j - 1])) {
                j = Math.max(j - 1, 1);
            }
            return (this.xVal[j] - this.xVal[j - 1]) / size;
        };
        Spectrum.prototype.getNearbySteps = function (value) {
            var j = getJ(value, this.xPct);
            return {
                stepBefore: {
                    startValue: this.xVal[j - 2],
                    step: this.xNumSteps[j - 2],
                    highestStep: this.xHighestCompleteStep[j - 2],
                },
                thisStep: {
                    startValue: this.xVal[j - 1],
                    step: this.xNumSteps[j - 1],
                    highestStep: this.xHighestCompleteStep[j - 1],
                },
                stepAfter: {
                    startValue: this.xVal[j],
                    step: this.xNumSteps[j],
                    highestStep: this.xHighestCompleteStep[j],
                },
            };
        };
        Spectrum.prototype.countStepDecimals = function () {
            var stepDecimals = this.xNumSteps.map(countDecimals);
            return Math.max.apply(null, stepDecimals);
        };
        Spectrum.prototype.hasNoSize = function () {
            return this.xVal[0] === this.xVal[this.xVal.length - 1];
        };
        // Outside testing
        Spectrum.prototype.convert = function (value) {
            return this.getStep(this.toStepping(value));
        };
        Spectrum.prototype.handleEntryPoint = function (index, value) {
            var percentage;
            // Covert min/max syntax to 0 and 100.
            if (index === "min") {
                percentage = 0;
            }
            else if (index === "max") {
                percentage = 100;
            }
            else {
                percentage = parseFloat(index);
            }
            // Check for correct input.
            if (!isNumeric(percentage) || !isNumeric(value[0])) {
                throw new Error("noUiSlider: 'range' value isn't numeric.");
            }
            // Store values.
            this.xPct.push(percentage);
            this.xVal.push(value[0]);
            var value1 = Number(value[1]);
            // NaN will evaluate to false too, but to keep
            // logging clear, set step explicitly. Make sure
            // not to override the 'step' setting with false.
            if (!percentage) {
                if (!isNaN(value1)) {
                    this.xSteps[0] = value1;
                }
            }
            else {
                this.xSteps.push(isNaN(value1) ? false : value1);
            }
            this.xHighestCompleteStep.push(0);
        };
        Spectrum.prototype.handleStepPoint = function (i, n) {
            // Ignore 'false' stepping.
            if (!n) {
                return;
            }
            // Step over zero-length ranges (#948);
            if (this.xVal[i] === this.xVal[i + 1]) {
                this.xSteps[i] = this.xHighestCompleteStep[i] = this.xVal[i];
                return;
            }
            // Factor to range ratio
            this.xSteps[i] =
                fromPercentage([this.xVal[i], this.xVal[i + 1]], n, 0) / subRangeRatio(this.xPct[i], this.xPct[i + 1]);
            var totalSteps = (this.xVal[i + 1] - this.xVal[i]) / this.xNumSteps[i];
            var highestStep = Math.ceil(Number(totalSteps.toFixed(3)) - 1);
            var step = this.xVal[i] + this.xNumSteps[i] * highestStep;
            this.xHighestCompleteStep[i] = step;
        };
        return Spectrum;
    }());
    //endregion
    //region Options
    /*	Every input option is tested and parsed. This will prevent
        endless validation in internal methods. These tests are
        structured with an item for every option available. An
        option can be marked as required by setting the 'r' flag.
        The testing function is provided with three arguments:
            - The provided value for the option;
            - A reference to the options object;
            - The name for the option;

        The testing function returns false when an error is detected,
        or true when everything is OK. It can also modify the option
        object, to make sure all values can be correctly looped elsewhere. */
    //region Defaults
    var defaultFormatter = {
        to: function (value) {
            return value === undefined ? "" : value.toFixed(2);
        },
        from: Number,
    };
    var cssClasses = {
        target: "target",
        base: "base",
        origin: "origin",
        handle: "handle",
        handleLower: "handle-lower",
        handleUpper: "handle-upper",
        touchArea: "touch-area",
        horizontal: "horizontal",
        vertical: "vertical",
        background: "background",
        connect: "connect",
        connects: "connects",
        ltr: "ltr",
        rtl: "rtl",
        textDirectionLtr: "txt-dir-ltr",
        textDirectionRtl: "txt-dir-rtl",
        draggable: "draggable",
        drag: "state-drag",
        tap: "state-tap",
        active: "active",
        tooltip: "tooltip",
        pips: "pips",
        pipsHorizontal: "pips-horizontal",
        pipsVertical: "pips-vertical",
        marker: "marker",
        markerHorizontal: "marker-horizontal",
        markerVertical: "marker-vertical",
        markerNormal: "marker-normal",
        markerLarge: "marker-large",
        markerSub: "marker-sub",
        value: "value",
        valueHorizontal: "value-horizontal",
        valueVertical: "value-vertical",
        valueNormal: "value-normal",
        valueLarge: "value-large",
        valueSub: "value-sub",
    };
    // Namespaces of internal event listeners
    var INTERNAL_EVENT_NS = {
        tooltips: ".__tooltips",
        aria: ".__aria",
    };
    //endregion
    function testStep(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'step' is not numeric.");
        }
        // The step option can still be used to set stepping
        // for linear sliders. Overwritten if set in 'range'.
        parsed.singleStep = entry;
    }
    function testKeyboardPageMultiplier(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'keyboardPageMultiplier' is not numeric.");
        }
        parsed.keyboardPageMultiplier = entry;
    }
    function testKeyboardMultiplier(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'keyboardMultiplier' is not numeric.");
        }
        parsed.keyboardMultiplier = entry;
    }
    function testKeyboardDefaultStep(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'keyboardDefaultStep' is not numeric.");
        }
        parsed.keyboardDefaultStep = entry;
    }
    function testRange(parsed, entry) {
        // Filter incorrect input.
        if (typeof entry !== "object" || Array.isArray(entry)) {
            throw new Error("noUiSlider: 'range' is not an object.");
        }
        // Catch missing start or end.
        if (entry.min === undefined || entry.max === undefined) {
            throw new Error("noUiSlider: Missing 'min' or 'max' in 'range'.");
        }
        parsed.spectrum = new Spectrum(entry, parsed.snap || false, parsed.singleStep);
    }
    function testStart(parsed, entry) {
        entry = asArray(entry);
        // Validate input. Values aren't tested, as the public .val method
        // will always provide a valid location.
        if (!Array.isArray(entry) || !entry.length) {
            throw new Error("noUiSlider: 'start' option is incorrect.");
        }
        // Store the number of handles.
        parsed.handles = entry.length;
        // When the slider is initialized, the .val method will
        // be called with the start options.
        parsed.start = entry;
    }
    function testSnap(parsed, entry) {
        if (typeof entry !== "boolean") {
            throw new Error("noUiSlider: 'snap' option must be a boolean.");
        }
        // Enforce 100% stepping within subranges.
        parsed.snap = entry;
    }
    function testAnimate(parsed, entry) {
        if (typeof entry !== "boolean") {
            throw new Error("noUiSlider: 'animate' option must be a boolean.");
        }
        // Enforce 100% stepping within subranges.
        parsed.animate = entry;
    }
    function testAnimationDuration(parsed, entry) {
        if (typeof entry !== "number") {
            throw new Error("noUiSlider: 'animationDuration' option must be a number.");
        }
        parsed.animationDuration = entry;
    }
    function testConnect(parsed, entry) {
        var connect = [false];
        var i;
        // Map legacy options
        if (entry === "lower") {
            entry = [true, false];
        }
        else if (entry === "upper") {
            entry = [false, true];
        }
        // Handle boolean options
        if (entry === true || entry === false) {
            for (i = 1; i < parsed.handles; i++) {
                connect.push(entry);
            }
            connect.push(false);
        }
        // Reject invalid input
        else if (!Array.isArray(entry) || !entry.length || entry.length !== parsed.handles + 1) {
            throw new Error("noUiSlider: 'connect' option doesn't match handle count.");
        }
        else {
            connect = entry;
        }
        parsed.connect = connect;
    }
    function testOrientation(parsed, entry) {
        // Set orientation to an a numerical value for easy
        // array selection.
        switch (entry) {
            case "horizontal":
                parsed.ort = 0;
                break;
            case "vertical":
                parsed.ort = 1;
                break;
            default:
                throw new Error("noUiSlider: 'orientation' option is invalid.");
        }
    }
    function testMargin(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'margin' option must be numeric.");
        }
        // Issue #582
        if (entry === 0) {
            return;
        }
        parsed.margin = parsed.spectrum.getDistance(entry);
    }
    function testLimit(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'limit' option must be numeric.");
        }
        parsed.limit = parsed.spectrum.getDistance(entry);
        if (!parsed.limit || parsed.handles < 2) {
            throw new Error("noUiSlider: 'limit' option is only supported on linear sliders with 2 or more handles.");
        }
    }
    function testPadding(parsed, entry) {
        var index;
        if (!isNumeric(entry) && !Array.isArray(entry)) {
            throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");
        }
        if (Array.isArray(entry) && !(entry.length === 2 || isNumeric(entry[0]) || isNumeric(entry[1]))) {
            throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");
        }
        if (entry === 0) {
            return;
        }
        if (!Array.isArray(entry)) {
            entry = [entry, entry];
        }
        // 'getDistance' returns false for invalid values.
        parsed.padding = [parsed.spectrum.getDistance(entry[0]), parsed.spectrum.getDistance(entry[1])];
        for (index = 0; index < parsed.spectrum.xNumSteps.length - 1; index++) {
            // last "range" can't contain step size as it is purely an endpoint.
            if (parsed.padding[0][index] < 0 || parsed.padding[1][index] < 0) {
                throw new Error("noUiSlider: 'padding' option must be a positive number(s).");
            }
        }
        var totalPadding = entry[0] + entry[1];
        var firstValue = parsed.spectrum.xVal[0];
        var lastValue = parsed.spectrum.xVal[parsed.spectrum.xVal.length - 1];
        if (totalPadding / (lastValue - firstValue) > 1) {
            throw new Error("noUiSlider: 'padding' option must not exceed 100% of the range.");
        }
    }
    function testDirection(parsed, entry) {
        // Set direction as a numerical value for easy parsing.
        // Invert connection for RTL sliders, so that the proper
        // handles get the connect/background classes.
        switch (entry) {
            case "ltr":
                parsed.dir = 0;
                break;
            case "rtl":
                parsed.dir = 1;
                break;
            default:
                throw new Error("noUiSlider: 'direction' option was not recognized.");
        }
    }
    function testBehaviour(parsed, entry) {
        // Make sure the input is a string.
        if (typeof entry !== "string") {
            throw new Error("noUiSlider: 'behaviour' must be a string containing options.");
        }
        // Check if the string contains any keywords.
        // None are required.
        var tap = entry.indexOf("tap") >= 0;
        var drag = entry.indexOf("drag") >= 0;
        var fixed = entry.indexOf("fixed") >= 0;
        var snap = entry.indexOf("snap") >= 0;
        var hover = entry.indexOf("hover") >= 0;
        var unconstrained = entry.indexOf("unconstrained") >= 0;
        var dragAll = entry.indexOf("drag-all") >= 0;
        var smoothSteps = entry.indexOf("smooth-steps") >= 0;
        if (fixed) {
            if (parsed.handles !== 2) {
                throw new Error("noUiSlider: 'fixed' behaviour must be used with 2 handles");
            }
            // Use margin to enforce fixed state
            testMargin(parsed, parsed.start[1] - parsed.start[0]);
        }
        if (unconstrained && (parsed.margin || parsed.limit)) {
            throw new Error("noUiSlider: 'unconstrained' behaviour cannot be used with margin or limit");
        }
        parsed.events = {
            tap: tap || snap,
            drag: drag,
            dragAll: dragAll,
            smoothSteps: smoothSteps,
            fixed: fixed,
            snap: snap,
            hover: hover,
            unconstrained: unconstrained,
        };
    }
    function testTooltips(parsed, entry) {
        if (entry === false) {
            return;
        }
        if (entry === true || isValidPartialFormatter(entry)) {
            parsed.tooltips = [];
            for (var i = 0; i < parsed.handles; i++) {
                parsed.tooltips.push(entry);
            }
        }
        else {
            entry = asArray(entry);
            if (entry.length !== parsed.handles) {
                throw new Error("noUiSlider: must pass a formatter for all handles.");
            }
            entry.forEach(function (formatter) {
                if (typeof formatter !== "boolean" && !isValidPartialFormatter(formatter)) {
                    throw new Error("noUiSlider: 'tooltips' must be passed a formatter or 'false'.");
                }
            });
            parsed.tooltips = entry;
        }
    }
    function testHandleAttributes(parsed, entry) {
        if (entry.length !== parsed.handles) {
            throw new Error("noUiSlider: must pass a attributes for all handles.");
        }
        parsed.handleAttributes = entry;
    }
    function testAriaFormat(parsed, entry) {
        if (!isValidPartialFormatter(entry)) {
            throw new Error("noUiSlider: 'ariaFormat' requires 'to' method.");
        }
        parsed.ariaFormat = entry;
    }
    function testFormat(parsed, entry) {
        if (!isValidFormatter(entry)) {
            throw new Error("noUiSlider: 'format' requires 'to' and 'from' methods.");
        }
        parsed.format = entry;
    }
    function testKeyboardSupport(parsed, entry) {
        if (typeof entry !== "boolean") {
            throw new Error("noUiSlider: 'keyboardSupport' option must be a boolean.");
        }
        parsed.keyboardSupport = entry;
    }
    function testDocumentElement(parsed, entry) {
        // This is an advanced option. Passed values are used without validation.
        parsed.documentElement = entry;
    }
    function testCssPrefix(parsed, entry) {
        if (typeof entry !== "string" && entry !== false) {
            throw new Error("noUiSlider: 'cssPrefix' must be a string or `false`.");
        }
        parsed.cssPrefix = entry;
    }
    function testCssClasses(parsed, entry) {
        if (typeof entry !== "object") {
            throw new Error("noUiSlider: 'cssClasses' must be an object.");
        }
        if (typeof parsed.cssPrefix === "string") {
            parsed.cssClasses = {};
            Object.keys(entry).forEach(function (key) {
                parsed.cssClasses[key] = parsed.cssPrefix + entry[key];
            });
        }
        else {
            parsed.cssClasses = entry;
        }
    }
    // Test all developer settings and parse to assumption-safe values.
    function testOptions(options) {
        // To prove a fix for #537, freeze options here.
        // If the object is modified, an error will be thrown.
        // Object.freeze(options);
        var parsed = {
            margin: null,
            limit: null,
            padding: null,
            animate: true,
            animationDuration: 300,
            ariaFormat: defaultFormatter,
            format: defaultFormatter,
        };
        // Tests are executed in the order they are presented here.
        var tests = {
            step: { r: false, t: testStep },
            keyboardPageMultiplier: { r: false, t: testKeyboardPageMultiplier },
            keyboardMultiplier: { r: false, t: testKeyboardMultiplier },
            keyboardDefaultStep: { r: false, t: testKeyboardDefaultStep },
            start: { r: true, t: testStart },
            connect: { r: true, t: testConnect },
            direction: { r: true, t: testDirection },
            snap: { r: false, t: testSnap },
            animate: { r: false, t: testAnimate },
            animationDuration: { r: false, t: testAnimationDuration },
            range: { r: true, t: testRange },
            orientation: { r: false, t: testOrientation },
            margin: { r: false, t: testMargin },
            limit: { r: false, t: testLimit },
            padding: { r: false, t: testPadding },
            behaviour: { r: true, t: testBehaviour },
            ariaFormat: { r: false, t: testAriaFormat },
            format: { r: false, t: testFormat },
            tooltips: { r: false, t: testTooltips },
            keyboardSupport: { r: true, t: testKeyboardSupport },
            documentElement: { r: false, t: testDocumentElement },
            cssPrefix: { r: true, t: testCssPrefix },
            cssClasses: { r: true, t: testCssClasses },
            handleAttributes: { r: false, t: testHandleAttributes },
        };
        var defaults = {
            connect: false,
            direction: "ltr",
            behaviour: "tap",
            orientation: "horizontal",
            keyboardSupport: true,
            cssPrefix: "noUi-",
            cssClasses: cssClasses,
            keyboardPageMultiplier: 5,
            keyboardMultiplier: 1,
            keyboardDefaultStep: 10,
        };
        // AriaFormat defaults to regular format, if any.
        if (options.format && !options.ariaFormat) {
            options.ariaFormat = options.format;
        }
        // Run all options through a testing mechanism to ensure correct
        // input. It should be noted that options might get modified to
        // be handled properly. E.g. wrapping integers in arrays.
        Object.keys(tests).forEach(function (name) {
            // If the option isn't set, but it is required, throw an error.
            if (!isSet(options[name]) && defaults[name] === undefined) {
                if (tests[name].r) {
                    throw new Error("noUiSlider: '" + name + "' is required.");
                }
                return;
            }
            tests[name].t(parsed, !isSet(options[name]) ? defaults[name] : options[name]);
        });
        // Forward pips options
        parsed.pips = options.pips;
        // All recent browsers accept unprefixed transform.
        // We need -ms- for IE9 and -webkit- for older Android;
        // Assume use of -webkit- if unprefixed and -ms- are not supported.
        // https://caniuse.com/#feat=transforms2d
        var d = document.createElement("div");
        var msPrefix = d.style.msTransform !== undefined;
        var noPrefix = d.style.transform !== undefined;
        parsed.transformRule = noPrefix ? "transform" : msPrefix ? "msTransform" : "webkitTransform";
        // Pips don't move, so we can place them using left/top.
        var styles = [
            ["left", "top"],
            ["right", "bottom"],
        ];
        parsed.style = styles[parsed.dir][parsed.ort];
        return parsed;
    }
    //endregion
    function scope(target, options, originalOptions) {
        var actions = getActions();
        var supportsTouchActionNone = getSupportsTouchActionNone();
        var supportsPassive = supportsTouchActionNone && getSupportsPassive();
        // All variables local to 'scope' are prefixed with 'scope_'
        // Slider DOM Nodes
        var scope_Target = target;
        var scope_Base;
        var scope_Handles;
        var scope_Connects;
        var scope_Pips;
        var scope_Tooltips;
        // Slider state values
        var scope_Spectrum = options.spectrum;
        var scope_Values = [];
        var scope_Locations = [];
        var scope_HandleNumbers = [];
        var scope_ActiveHandlesCount = 0;
        var scope_Events = {};
        // Document Nodes
        var scope_Document = target.ownerDocument;
        var scope_DocumentElement = options.documentElement || scope_Document.documentElement;
        var scope_Body = scope_Document.body;
        // For horizontal sliders in standard ltr documents,
        // make .noUi-origin overflow to the left so the document doesn't scroll.
        var scope_DirOffset = scope_Document.dir === "rtl" || options.ort === 1 ? 0 : 100;
        // Creates a node, adds it to target, returns the new node.
        function addNodeTo(addTarget, className) {
            var div = scope_Document.createElement("div");
            if (className) {
                addClass(div, className);
            }
            addTarget.appendChild(div);
            return div;
        }
        // Append a origin to the base
        function addOrigin(base, handleNumber) {
            var origin = addNodeTo(base, options.cssClasses.origin);
            var handle = addNodeTo(origin, options.cssClasses.handle);
            addNodeTo(handle, options.cssClasses.touchArea);
            handle.setAttribute("data-handle", String(handleNumber));
            if (options.keyboardSupport) {
                // https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
                // 0 = focusable and reachable
                handle.setAttribute("tabindex", "0");
                handle.addEventListener("keydown", function (event) {
                    return eventKeydown(event, handleNumber);
                });
            }
            if (options.handleAttributes !== undefined) {
                var attributes_1 = options.handleAttributes[handleNumber];
                Object.keys(attributes_1).forEach(function (attribute) {
                    handle.setAttribute(attribute, attributes_1[attribute]);
                });
            }
            handle.setAttribute("role", "slider");
            handle.setAttribute("aria-orientation", options.ort ? "vertical" : "horizontal");
            if (handleNumber === 0) {
                addClass(handle, options.cssClasses.handleLower);
            }
            else if (handleNumber === options.handles - 1) {
                addClass(handle, options.cssClasses.handleUpper);
            }
            origin.handle = handle;
            return origin;
        }
        // Insert nodes for connect elements
        function addConnect(base, add) {
            if (!add) {
                return false;
            }
            return addNodeTo(base, options.cssClasses.connect);
        }
        // Add handles to the slider base.
        function addElements(connectOptions, base) {
            var connectBase = addNodeTo(base, options.cssClasses.connects);
            scope_Handles = [];
            scope_Connects = [];
            scope_Connects.push(addConnect(connectBase, connectOptions[0]));
            // [::::O====O====O====]
            // connectOptions = [0, 1, 1, 1]
            for (var i = 0; i < options.handles; i++) {
                // Keep a list of all added handles.
                scope_Handles.push(addOrigin(base, i));
                scope_HandleNumbers[i] = i;
                scope_Connects.push(addConnect(connectBase, connectOptions[i + 1]));
            }
        }
        // Initialize a single slider.
        function addSlider(addTarget) {
            // Apply classes and data to the target.
            addClass(addTarget, options.cssClasses.target);
            if (options.dir === 0) {
                addClass(addTarget, options.cssClasses.ltr);
            }
            else {
                addClass(addTarget, options.cssClasses.rtl);
            }
            if (options.ort === 0) {
                addClass(addTarget, options.cssClasses.horizontal);
            }
            else {
                addClass(addTarget, options.cssClasses.vertical);
            }
            var textDirection = getComputedStyle(addTarget).direction;
            if (textDirection === "rtl") {
                addClass(addTarget, options.cssClasses.textDirectionRtl);
            }
            else {
                addClass(addTarget, options.cssClasses.textDirectionLtr);
            }
            return addNodeTo(addTarget, options.cssClasses.base);
        }
        function addTooltip(handle, handleNumber) {
            if (!options.tooltips || !options.tooltips[handleNumber]) {
                return false;
            }
            return addNodeTo(handle.firstChild, options.cssClasses.tooltip);
        }
        function isSliderDisabled() {
            return scope_Target.hasAttribute("disabled");
        }
        // Disable the slider dragging if any handle is disabled
        function isHandleDisabled(handleNumber) {
            var handleOrigin = scope_Handles[handleNumber];
            return handleOrigin.hasAttribute("disabled");
        }
        function disable(handleNumber) {
            if (handleNumber !== null && handleNumber !== undefined) {
                scope_Handles[handleNumber].setAttribute("disabled", "");
                scope_Handles[handleNumber].handle.removeAttribute("tabindex");
            }
            else {
                scope_Target.setAttribute("disabled", "");
                scope_Handles.forEach(function (handle) {
                    handle.handle.removeAttribute("tabindex");
                });
            }
        }
        function enable(handleNumber) {
            if (handleNumber !== null && handleNumber !== undefined) {
                scope_Handles[handleNumber].removeAttribute("disabled");
                scope_Handles[handleNumber].handle.setAttribute("tabindex", "0");
            }
            else {
                scope_Target.removeAttribute("disabled");
                scope_Handles.forEach(function (handle) {
                    handle.removeAttribute("disabled");
                    handle.handle.setAttribute("tabindex", "0");
                });
            }
        }
        function removeTooltips() {
            if (scope_Tooltips) {
                removeEvent("update" + INTERNAL_EVENT_NS.tooltips);
                scope_Tooltips.forEach(function (tooltip) {
                    if (tooltip) {
                        removeElement(tooltip);
                    }
                });
                scope_Tooltips = null;
            }
        }
        // The tooltips option is a shorthand for using the 'update' event.
        function tooltips() {
            removeTooltips();
            // Tooltips are added with options.tooltips in original order.
            scope_Tooltips = scope_Handles.map(addTooltip);
            bindEvent("update" + INTERNAL_EVENT_NS.tooltips, function (values, handleNumber, unencoded) {
                if (!scope_Tooltips || !options.tooltips) {
                    return;
                }
                if (scope_Tooltips[handleNumber] === false) {
                    return;
                }
                var formattedValue = values[handleNumber];
                if (options.tooltips[handleNumber] !== true) {
                    formattedValue = options.tooltips[handleNumber].to(unencoded[handleNumber]);
                }
                scope_Tooltips[handleNumber].innerHTML = formattedValue;
            });
        }
        function aria() {
            removeEvent("update" + INTERNAL_EVENT_NS.aria);
            bindEvent("update" + INTERNAL_EVENT_NS.aria, function (values, handleNumber, unencoded, tap, positions) {
                // Update Aria Values for all handles, as a change in one changes min and max values for the next.
                scope_HandleNumbers.forEach(function (index) {
                    var handle = scope_Handles[index];
                    var min = checkHandlePosition(scope_Locations, index, 0, true, true, true);
                    var max = checkHandlePosition(scope_Locations, index, 100, true, true, true);
                    var now = positions[index];
                    // Formatted value for display
                    var text = String(options.ariaFormat.to(unencoded[index]));
                    // Map to slider range values
                    min = scope_Spectrum.fromStepping(min).toFixed(1);
                    max = scope_Spectrum.fromStepping(max).toFixed(1);
                    now = scope_Spectrum.fromStepping(now).toFixed(1);
                    handle.children[0].setAttribute("aria-valuemin", min);
                    handle.children[0].setAttribute("aria-valuemax", max);
                    handle.children[0].setAttribute("aria-valuenow", now);
                    handle.children[0].setAttribute("aria-valuetext", text);
                });
            });
        }
        function getGroup(pips) {
            // Use the range.
            if (pips.mode === exports.PipsMode.Range || pips.mode === exports.PipsMode.Steps) {
                return scope_Spectrum.xVal;
            }
            if (pips.mode === exports.PipsMode.Count) {
                if (pips.values < 2) {
                    throw new Error("noUiSlider: 'values' (>= 2) required for mode 'count'.");
                }
                // Divide 0 - 100 in 'count' parts.
                var interval = pips.values - 1;
                var spread = 100 / interval;
                var values = [];
                // List these parts and have them handled as 'positions'.
                while (interval--) {
                    values[interval] = interval * spread;
                }
                values.push(100);
                return mapToRange(values, pips.stepped);
            }
            if (pips.mode === exports.PipsMode.Positions) {
                // Map all percentages to on-range values.
                return mapToRange(pips.values, pips.stepped);
            }
            if (pips.mode === exports.PipsMode.Values) {
                // If the value must be stepped, it needs to be converted to a percentage first.
                if (pips.stepped) {
                    return pips.values.map(function (value) {
                        // Convert to percentage, apply step, return to value.
                        return scope_Spectrum.fromStepping(scope_Spectrum.getStep(scope_Spectrum.toStepping(value)));
                    });
                }
                // Otherwise, we can simply use the values.
                return pips.values;
            }
            return []; // pips.mode = never
        }
        function mapToRange(values, stepped) {
            return values.map(function (value) {
                return scope_Spectrum.fromStepping(stepped ? scope_Spectrum.getStep(value) : value);
            });
        }
        function generateSpread(pips) {
            function safeIncrement(value, increment) {
                // Avoid floating point variance by dropping the smallest decimal places.
                return Number((value + increment).toFixed(7));
            }
            var group = getGroup(pips);
            var indexes = {};
            var firstInRange = scope_Spectrum.xVal[0];
            var lastInRange = scope_Spectrum.xVal[scope_Spectrum.xVal.length - 1];
            var ignoreFirst = false;
            var ignoreLast = false;
            var prevPct = 0;
            // Create a copy of the group, sort it and filter away all duplicates.
            group = unique(group.slice().sort(function (a, b) {
                return a - b;
            }));
            // Make sure the range starts with the first element.
            if (group[0] !== firstInRange) {
                group.unshift(firstInRange);
                ignoreFirst = true;
            }
            // Likewise for the last one.
            if (group[group.length - 1] !== lastInRange) {
                group.push(lastInRange);
                ignoreLast = true;
            }
            group.forEach(function (current, index) {
                // Get the current step and the lower + upper positions.
                var step;
                var i;
                var q;
                var low = current;
                var high = group[index + 1];
                var newPct;
                var pctDifference;
                var pctPos;
                var type;
                var steps;
                var realSteps;
                var stepSize;
                var isSteps = pips.mode === exports.PipsMode.Steps;
                // When using 'steps' mode, use the provided steps.
                // Otherwise, we'll step on to the next subrange.
                if (isSteps) {
                    step = scope_Spectrum.xNumSteps[index];
                }
                // Default to a 'full' step.
                if (!step) {
                    step = high - low;
                }
                // If high is undefined we are at the last subrange. Make sure it iterates once (#1088)
                if (high === undefined) {
                    high = low;
                }
                // Make sure step isn't 0, which would cause an infinite loop (#654)
                step = Math.max(step, 0.0000001);
                // Find all steps in the subrange.
                for (i = low; i <= high; i = safeIncrement(i, step)) {
                    // Get the percentage value for the current step,
                    // calculate the size for the subrange.
                    newPct = scope_Spectrum.toStepping(i);
                    pctDifference = newPct - prevPct;
                    steps = pctDifference / (pips.density || 1);
                    realSteps = Math.round(steps);
                    // This ratio represents the amount of percentage-space a point indicates.
                    // For a density 1 the points/percentage = 1. For density 2, that percentage needs to be re-divided.
                    // Round the percentage offset to an even number, then divide by two
                    // to spread the offset on both sides of the range.
                    stepSize = pctDifference / realSteps;
                    // Divide all points evenly, adding the correct number to this subrange.
                    // Run up to <= so that 100% gets a point, event if ignoreLast is set.
                    for (q = 1; q <= realSteps; q += 1) {
                        // The ratio between the rounded value and the actual size might be ~1% off.
                        // Correct the percentage offset by the number of points
                        // per subrange. density = 1 will result in 100 points on the
                        // full range, 2 for 50, 4 for 25, etc.
                        pctPos = prevPct + q * stepSize;
                        indexes[pctPos.toFixed(5)] = [scope_Spectrum.fromStepping(pctPos), 0];
                    }
                    // Determine the point type.
                    type = group.indexOf(i) > -1 ? exports.PipsType.LargeValue : isSteps ? exports.PipsType.SmallValue : exports.PipsType.NoValue;
                    // Enforce the 'ignoreFirst' option by overwriting the type for 0.
                    if (!index && ignoreFirst && i !== high) {
                        type = 0;
                    }
                    if (!(i === high && ignoreLast)) {
                        // Mark the 'type' of this point. 0 = plain, 1 = real value, 2 = step value.
                        indexes[newPct.toFixed(5)] = [i, type];
                    }
                    // Update the percentage count.
                    prevPct = newPct;
                }
            });
            return indexes;
        }
        function addMarking(spread, filterFunc, formatter) {
            var _a, _b;
            var element = scope_Document.createElement("div");
            var valueSizeClasses = (_a = {},
                _a[exports.PipsType.None] = "",
                _a[exports.PipsType.NoValue] = options.cssClasses.valueNormal,
                _a[exports.PipsType.LargeValue] = options.cssClasses.valueLarge,
                _a[exports.PipsType.SmallValue] = options.cssClasses.valueSub,
                _a);
            var markerSizeClasses = (_b = {},
                _b[exports.PipsType.None] = "",
                _b[exports.PipsType.NoValue] = options.cssClasses.markerNormal,
                _b[exports.PipsType.LargeValue] = options.cssClasses.markerLarge,
                _b[exports.PipsType.SmallValue] = options.cssClasses.markerSub,
                _b);
            var valueOrientationClasses = [options.cssClasses.valueHorizontal, options.cssClasses.valueVertical];
            var markerOrientationClasses = [options.cssClasses.markerHorizontal, options.cssClasses.markerVertical];
            addClass(element, options.cssClasses.pips);
            addClass(element, options.ort === 0 ? options.cssClasses.pipsHorizontal : options.cssClasses.pipsVertical);
            function getClasses(type, source) {
                var a = source === options.cssClasses.value;
                var orientationClasses = a ? valueOrientationClasses : markerOrientationClasses;
                var sizeClasses = a ? valueSizeClasses : markerSizeClasses;
                return source + " " + orientationClasses[options.ort] + " " + sizeClasses[type];
            }
            function addSpread(offset, value, type) {
                // Apply the filter function, if it is set.
                type = filterFunc ? filterFunc(value, type) : type;
                if (type === exports.PipsType.None) {
                    return;
                }
                // Add a marker for every point
                var node = addNodeTo(element, false);
                node.className = getClasses(type, options.cssClasses.marker);
                node.style[options.style] = offset + "%";
                // Values are only appended for points marked '1' or '2'.
                if (type > exports.PipsType.NoValue) {
                    node = addNodeTo(element, false);
                    node.className = getClasses(type, options.cssClasses.value);
                    node.setAttribute("data-value", String(value));
                    node.style[options.style] = offset + "%";
                    node.innerHTML = String(formatter.to(value));
                }
            }
            // Append all points.
            Object.keys(spread).forEach(function (offset) {
                addSpread(offset, spread[offset][0], spread[offset][1]);
            });
            return element;
        }
        function removePips() {
            if (scope_Pips) {
                removeElement(scope_Pips);
                scope_Pips = null;
            }
        }
        function pips(pips) {
            // Fix #669
            removePips();
            var spread = generateSpread(pips);
            var filter = pips.filter;
            var format = pips.format || {
                to: function (value) {
                    return String(Math.round(value));
                },
            };
            scope_Pips = scope_Target.appendChild(addMarking(spread, filter, format));
            return scope_Pips;
        }
        // Shorthand for base dimensions.
        function baseSize() {
            var rect = scope_Base.getBoundingClientRect();
            var alt = ("offset" + ["Width", "Height"][options.ort]);
            return options.ort === 0 ? rect.width || scope_Base[alt] : rect.height || scope_Base[alt];
        }
        // Handler for attaching events trough a proxy.
        function attachEvent(events, element, callback, data) {
            // This function can be used to 'filter' events to the slider.
            // element is a node, not a nodeList
            var method = function (event) {
                var e = fixEvent(event, data.pageOffset, data.target || element);
                // fixEvent returns false if this event has a different target
                // when handling (multi-) touch events;
                if (!e) {
                    return false;
                }
                // doNotReject is passed by all end events to make sure released touches
                // are not rejected, leaving the slider "stuck" to the cursor;
                if (isSliderDisabled() && !data.doNotReject) {
                    return false;
                }
                // Stop if an active 'tap' transition is taking place.
                if (hasClass(scope_Target, options.cssClasses.tap) && !data.doNotReject) {
                    return false;
                }
                // Ignore right or middle clicks on start #454
                if (events === actions.start && e.buttons !== undefined && e.buttons > 1) {
                    return false;
                }
                // Ignore right or middle clicks on start #454
                if (data.hover && e.buttons) {
                    return false;
                }
                // 'supportsPassive' is only true if a browser also supports touch-action: none in CSS.
                // iOS safari does not, so it doesn't get to benefit from passive scrolling. iOS does support
                // touch-action: manipulation, but that allows panning, which breaks
                // sliders after zooming/on non-responsive pages.
                // See: https://bugs.webkit.org/show_bug.cgi?id=133112
                if (!supportsPassive) {
                    e.preventDefault();
                }
                e.calcPoint = e.points[options.ort];
                // Call the event handler with the event [ and additional data ].
                callback(e, data);
                return;
            };
            var methods = [];
            // Bind a closure on the target for every event type.
            events.split(" ").forEach(function (eventName) {
                element.addEventListener(eventName, method, supportsPassive ? { passive: true } : false);
                methods.push([eventName, method]);
            });
            return methods;
        }
        // Provide a clean event with standardized offset values.
        function fixEvent(e, pageOffset, eventTarget) {
            // Filter the event to register the type, which can be
            // touch, mouse or pointer. Offset changes need to be
            // made on an event specific basis.
            var touch = e.type.indexOf("touch") === 0;
            var mouse = e.type.indexOf("mouse") === 0;
            var pointer = e.type.indexOf("pointer") === 0;
            var x = 0;
            var y = 0;
            // IE10 implemented pointer events with a prefix;
            if (e.type.indexOf("MSPointer") === 0) {
                pointer = true;
            }
            // Erroneous events seem to be passed in occasionally on iOS/iPadOS after user finishes interacting with
            // the slider. They appear to be of type MouseEvent, yet they don't have usual properties set. Ignore
            // events that have no touches or buttons associated with them. (#1057, #1079, #1095)
            if (e.type === "mousedown" && !e.buttons && !e.touches) {
                return false;
            }
            // The only thing one handle should be concerned about is the touches that originated on top of it.
            if (touch) {
                // Returns true if a touch originated on the target.
                var isTouchOnTarget = function (checkTouch) {
                    var target = checkTouch.target;
                    return (target === eventTarget ||
                        eventTarget.contains(target) ||
                        (e.composed && e.composedPath().shift() === eventTarget));
                };
                // In the case of touchstart events, we need to make sure there is still no more than one
                // touch on the target so we look amongst all touches.
                if (e.type === "touchstart") {
                    var targetTouches = Array.prototype.filter.call(e.touches, isTouchOnTarget);
                    // Do not support more than one touch per handle.
                    if (targetTouches.length > 1) {
                        return false;
                    }
                    x = targetTouches[0].pageX;
                    y = targetTouches[0].pageY;
                }
                else {
                    // In the other cases, find on changedTouches is enough.
                    var targetTouch = Array.prototype.find.call(e.changedTouches, isTouchOnTarget);
                    // Cancel if the target touch has not moved.
                    if (!targetTouch) {
                        return false;
                    }
                    x = targetTouch.pageX;
                    y = targetTouch.pageY;
                }
            }
            pageOffset = pageOffset || getPageOffset(scope_Document);
            if (mouse || pointer) {
                x = e.clientX + pageOffset.x;
                y = e.clientY + pageOffset.y;
            }
            e.pageOffset = pageOffset;
            e.points = [x, y];
            e.cursor = mouse || pointer; // Fix #435
            return e;
        }
        // Translate a coordinate in the document to a percentage on the slider
        function calcPointToPercentage(calcPoint) {
            var location = calcPoint - offset(scope_Base, options.ort);
            var proposal = (location * 100) / baseSize();
            // Clamp proposal between 0% and 100%
            // Out-of-bound coordinates may occur when .noUi-base pseudo-elements
            // are used (e.g. contained handles feature)
            proposal = limit(proposal);
            return options.dir ? 100 - proposal : proposal;
        }
        // Find handle closest to a certain percentage on the slider
        function getClosestHandle(clickedPosition) {
            var smallestDifference = 100;
            var handleNumber = false;
            scope_Handles.forEach(function (handle, index) {
                // Disabled handles are ignored
                if (isHandleDisabled(index)) {
                    return;
                }
                var handlePosition = scope_Locations[index];
                var differenceWithThisHandle = Math.abs(handlePosition - clickedPosition);
                // Initial state
                var clickAtEdge = differenceWithThisHandle === 100 && smallestDifference === 100;
                // Difference with this handle is smaller than the previously checked handle
                var isCloser = differenceWithThisHandle < smallestDifference;
                var isCloserAfter = differenceWithThisHandle <= smallestDifference && clickedPosition > handlePosition;
                if (isCloser || isCloserAfter || clickAtEdge) {
                    handleNumber = index;
                    smallestDifference = differenceWithThisHandle;
                }
            });
            return handleNumber;
        }
        // Fire 'end' when a mouse or pen leaves the document.
        function documentLeave(event, data) {
            if (event.type === "mouseout" &&
                event.target.nodeName === "HTML" &&
                event.relatedTarget === null) {
                eventEnd(event, data);
            }
        }
        // Handle movement on document for handle and range drag.
        function eventMove(event, data) {
            // Fix #498
            // Check value of .buttons in 'start' to work around a bug in IE10 mobile (data.buttonsProperty).
            // https://connect.microsoft.com/IE/feedback/details/927005/mobile-ie10-windows-phone-buttons-property-of-pointermove-event-always-zero
            // IE9 has .buttons and .which zero on mousemove.
            // Firefox breaks the spec MDN defines.
            if (navigator.appVersion.indexOf("MSIE 9") === -1 && event.buttons === 0 && data.buttonsProperty !== 0) {
                return eventEnd(event, data);
            }
            // Check if we are moving up or down
            var movement = (options.dir ? -1 : 1) * (event.calcPoint - data.startCalcPoint);
            // Convert the movement into a percentage of the slider width/height
            var proposal = (movement * 100) / data.baseSize;
            moveHandles(movement > 0, proposal, data.locations, data.handleNumbers, data.connect);
        }
        // Unbind move events on document, call callbacks.
        function eventEnd(event, data) {
            // The handle is no longer active, so remove the class.
            if (data.handle) {
                removeClass(data.handle, options.cssClasses.active);
                scope_ActiveHandlesCount -= 1;
            }
            // Unbind the move and end events, which are added on 'start'.
            data.listeners.forEach(function (c) {
                scope_DocumentElement.removeEventListener(c[0], c[1]);
            });
            if (scope_ActiveHandlesCount === 0) {
                // Remove dragging class.
                removeClass(scope_Target, options.cssClasses.drag);
                setZindex();
                // Remove cursor styles and text-selection events bound to the body.
                if (event.cursor) {
                    scope_Body.style.cursor = "";
                    scope_Body.removeEventListener("selectstart", preventDefault);
                }
            }
            if (options.events.smoothSteps) {
                data.handleNumbers.forEach(function (handleNumber) {
                    setHandle(handleNumber, scope_Locations[handleNumber], true, true, false, false);
                });
                data.handleNumbers.forEach(function (handleNumber) {
                    fireEvent("update", handleNumber);
                });
            }
            data.handleNumbers.forEach(function (handleNumber) {
                fireEvent("change", handleNumber);
                fireEvent("set", handleNumber);
                fireEvent("end", handleNumber);
            });
        }
        // Bind move events on document.
        function eventStart(event, data) {
            // Ignore event if any handle is disabled
            if (data.handleNumbers.some(isHandleDisabled)) {
                return;
            }
            var handle;
            if (data.handleNumbers.length === 1) {
                var handleOrigin = scope_Handles[data.handleNumbers[0]];
                handle = handleOrigin.children[0];
                scope_ActiveHandlesCount += 1;
                // Mark the handle as 'active' so it can be styled.
                addClass(handle, options.cssClasses.active);
            }
            // A drag should never propagate up to the 'tap' event.
            event.stopPropagation();
            // Record the event listeners.
            var listeners = [];
            // Attach the move and end events.
            var moveEvent = attachEvent(actions.move, scope_DocumentElement, eventMove, {
                // The event target has changed so we need to propagate the original one so that we keep
                // relying on it to extract target touches.
                target: event.target,
                handle: handle,
                connect: data.connect,
                listeners: listeners,
                startCalcPoint: event.calcPoint,
                baseSize: baseSize(),
                pageOffset: event.pageOffset,
                handleNumbers: data.handleNumbers,
                buttonsProperty: event.buttons,
                locations: scope_Locations.slice(),
            });
            var endEvent = attachEvent(actions.end, scope_DocumentElement, eventEnd, {
                target: event.target,
                handle: handle,
                listeners: listeners,
                doNotReject: true,
                handleNumbers: data.handleNumbers,
            });
            var outEvent = attachEvent("mouseout", scope_DocumentElement, documentLeave, {
                target: event.target,
                handle: handle,
                listeners: listeners,
                doNotReject: true,
                handleNumbers: data.handleNumbers,
            });
            // We want to make sure we pushed the listeners in the listener list rather than creating
            // a new one as it has already been passed to the event handlers.
            listeners.push.apply(listeners, moveEvent.concat(endEvent, outEvent));
            // Text selection isn't an issue on touch devices,
            // so adding cursor styles can be skipped.
            if (event.cursor) {
                // Prevent the 'I' cursor and extend the range-drag cursor.
                scope_Body.style.cursor = getComputedStyle(event.target).cursor;
                // Mark the target with a dragging state.
                if (scope_Handles.length > 1) {
                    addClass(scope_Target, options.cssClasses.drag);
                }
                // Prevent text selection when dragging the handles.
                // In noUiSlider <= 9.2.0, this was handled by calling preventDefault on mouse/touch start/move,
                // which is scroll blocking. The selectstart event is supported by FireFox starting from version 52,
                // meaning the only holdout is iOS Safari. This doesn't matter: text selection isn't triggered there.
                // The 'cursor' flag is false.
                // See: http://caniuse.com/#search=selectstart
                scope_Body.addEventListener("selectstart", preventDefault, false);
            }
            data.handleNumbers.forEach(function (handleNumber) {
                fireEvent("start", handleNumber);
            });
        }
        // Move closest handle to tapped location.
        function eventTap(event) {
            // The tap event shouldn't propagate up
            event.stopPropagation();
            var proposal = calcPointToPercentage(event.calcPoint);
            var handleNumber = getClosestHandle(proposal);
            // Tackle the case that all handles are 'disabled'.
            if (handleNumber === false) {
                return;
            }
            // Flag the slider as it is now in a transitional state.
            // Transition takes a configurable amount of ms (default 300). Re-enable the slider after that.
            if (!options.events.snap) {
                addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
            }
            setHandle(handleNumber, proposal, true, true);
            setZindex();
            fireEvent("slide", handleNumber, true);
            fireEvent("update", handleNumber, true);
            if (!options.events.snap) {
                fireEvent("change", handleNumber, true);
                fireEvent("set", handleNumber, true);
            }
            else {
                eventStart(event, { handleNumbers: [handleNumber] });
            }
        }
        // Fires a 'hover' event for a hovered mouse/pen position.
        function eventHover(event) {
            var proposal = calcPointToPercentage(event.calcPoint);
            var to = scope_Spectrum.getStep(proposal);
            var value = scope_Spectrum.fromStepping(to);
            Object.keys(scope_Events).forEach(function (targetEvent) {
                if ("hover" === targetEvent.split(".")[0]) {
                    scope_Events[targetEvent].forEach(function (callback) {
                        callback.call(scope_Self, value);
                    });
                }
            });
        }
        // Handles keydown on focused handles
        // Don't move the document when pressing arrow keys on focused handles
        function eventKeydown(event, handleNumber) {
            if (isSliderDisabled() || isHandleDisabled(handleNumber)) {
                return false;
            }
            var horizontalKeys = ["Left", "Right"];
            var verticalKeys = ["Down", "Up"];
            var largeStepKeys = ["PageDown", "PageUp"];
            var edgeKeys = ["Home", "End"];
            if (options.dir && !options.ort) {
                // On an right-to-left slider, the left and right keys act inverted
                horizontalKeys.reverse();
            }
            else if (options.ort && !options.dir) {
                // On a top-to-bottom slider, the up and down keys act inverted
                verticalKeys.reverse();
                largeStepKeys.reverse();
            }
            // Strip "Arrow" for IE compatibility. https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
            var key = event.key.replace("Arrow", "");
            var isLargeDown = key === largeStepKeys[0];
            var isLargeUp = key === largeStepKeys[1];
            var isDown = key === verticalKeys[0] || key === horizontalKeys[0] || isLargeDown;
            var isUp = key === verticalKeys[1] || key === horizontalKeys[1] || isLargeUp;
            var isMin = key === edgeKeys[0];
            var isMax = key === edgeKeys[1];
            if (!isDown && !isUp && !isMin && !isMax) {
                return true;
            }
            event.preventDefault();
            var to;
            if (isUp || isDown) {
                var direction = isDown ? 0 : 1;
                var steps = getNextStepsForHandle(handleNumber);
                var step = steps[direction];
                // At the edge of a slider, do nothing
                if (step === null) {
                    return false;
                }
                // No step set, use the default of 10% of the sub-range
                if (step === false) {
                    step = scope_Spectrum.getDefaultStep(scope_Locations[handleNumber], isDown, options.keyboardDefaultStep);
                }
                if (isLargeUp || isLargeDown) {
                    step *= options.keyboardPageMultiplier;
                }
                else {
                    step *= options.keyboardMultiplier;
                }
                // Step over zero-length ranges (#948);
                step = Math.max(step, 0.0000001);
                // Decrement for down steps
                step = (isDown ? -1 : 1) * step;
                to = scope_Values[handleNumber] + step;
            }
            else if (isMax) {
                // End key
                to = options.spectrum.xVal[options.spectrum.xVal.length - 1];
            }
            else {
                // Home key
                to = options.spectrum.xVal[0];
            }
            setHandle(handleNumber, scope_Spectrum.toStepping(to), true, true);
            fireEvent("slide", handleNumber);
            fireEvent("update", handleNumber);
            fireEvent("change", handleNumber);
            fireEvent("set", handleNumber);
            return false;
        }
        // Attach events to several slider parts.
        function bindSliderEvents(behaviour) {
            // Attach the standard drag event to the handles.
            if (!behaviour.fixed) {
                scope_Handles.forEach(function (handle, index) {
                    // These events are only bound to the visual handle
                    // element, not the 'real' origin element.
                    attachEvent(actions.start, handle.children[0], eventStart, {
                        handleNumbers: [index],
                    });
                });
            }
            // Attach the tap event to the slider base.
            if (behaviour.tap) {
                attachEvent(actions.start, scope_Base, eventTap, {});
            }
            // Fire hover events
            if (behaviour.hover) {
                attachEvent(actions.move, scope_Base, eventHover, {
                    hover: true,
                });
            }
            // Make the range draggable.
            if (behaviour.drag) {
                scope_Connects.forEach(function (connect, index) {
                    if (connect === false || index === 0 || index === scope_Connects.length - 1) {
                        return;
                    }
                    var handleBefore = scope_Handles[index - 1];
                    var handleAfter = scope_Handles[index];
                    var eventHolders = [connect];
                    var handlesToDrag = [handleBefore, handleAfter];
                    var handleNumbersToDrag = [index - 1, index];
                    addClass(connect, options.cssClasses.draggable);
                    // When the range is fixed, the entire range can
                    // be dragged by the handles. The handle in the first
                    // origin will propagate the start event upward,
                    // but it needs to be bound manually on the other.
                    if (behaviour.fixed) {
                        eventHolders.push(handleBefore.children[0]);
                        eventHolders.push(handleAfter.children[0]);
                    }
                    if (behaviour.dragAll) {
                        handlesToDrag = scope_Handles;
                        handleNumbersToDrag = scope_HandleNumbers;
                    }
                    eventHolders.forEach(function (eventHolder) {
                        attachEvent(actions.start, eventHolder, eventStart, {
                            handles: handlesToDrag,
                            handleNumbers: handleNumbersToDrag,
                            connect: connect,
                        });
                    });
                });
            }
        }
        // Attach an event to this slider, possibly including a namespace
        function bindEvent(namespacedEvent, callback) {
            scope_Events[namespacedEvent] = scope_Events[namespacedEvent] || [];
            scope_Events[namespacedEvent].push(callback);
            // If the event bound is 'update,' fire it immediately for all handles.
            if (namespacedEvent.split(".")[0] === "update") {
                scope_Handles.forEach(function (a, index) {
                    fireEvent("update", index);
                });
            }
        }
        function isInternalNamespace(namespace) {
            return namespace === INTERNAL_EVENT_NS.aria || namespace === INTERNAL_EVENT_NS.tooltips;
        }
        // Undo attachment of event
        function removeEvent(namespacedEvent) {
            var event = namespacedEvent && namespacedEvent.split(".")[0];
            var namespace = event ? namespacedEvent.substring(event.length) : namespacedEvent;
            Object.keys(scope_Events).forEach(function (bind) {
                var tEvent = bind.split(".")[0];
                var tNamespace = bind.substring(tEvent.length);
                if ((!event || event === tEvent) && (!namespace || namespace === tNamespace)) {
                    // only delete protected internal event if intentional
                    if (!isInternalNamespace(tNamespace) || namespace === tNamespace) {
                        delete scope_Events[bind];
                    }
                }
            });
        }
        // External event handling
        function fireEvent(eventName, handleNumber, tap) {
            Object.keys(scope_Events).forEach(function (targetEvent) {
                var eventType = targetEvent.split(".")[0];
                if (eventName === eventType) {
                    scope_Events[targetEvent].forEach(function (callback) {
                        callback.call(
                        // Use the slider public API as the scope ('this')
                        scope_Self, 
                        // Return values as array, so arg_1[arg_2] is always valid.
                        scope_Values.map(options.format.to), 
                        // Handle index, 0 or 1
                        handleNumber, 
                        // Un-formatted slider values
                        scope_Values.slice(), 
                        // Event is fired by tap, true or false
                        tap || false, 
                        // Left offset of the handle, in relation to the slider
                        scope_Locations.slice(), 
                        // add the slider public API to an accessible parameter when this is unavailable
                        scope_Self);
                    });
                }
            });
        }
        // Split out the handle positioning logic so the Move event can use it, too
        function checkHandlePosition(reference, handleNumber, to, lookBackward, lookForward, getValue, smoothSteps) {
            var distance;
            // For sliders with multiple handles, limit movement to the other handle.
            // Apply the margin option by adding it to the handle positions.
            if (scope_Handles.length > 1 && !options.events.unconstrained) {
                if (lookBackward && handleNumber > 0) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber - 1], options.margin, false);
                    to = Math.max(to, distance);
                }
                if (lookForward && handleNumber < scope_Handles.length - 1) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber + 1], options.margin, true);
                    to = Math.min(to, distance);
                }
            }
            // The limit option has the opposite effect, limiting handles to a
            // maximum distance from another. Limit must be > 0, as otherwise
            // handles would be unmovable.
            if (scope_Handles.length > 1 && options.limit) {
                if (lookBackward && handleNumber > 0) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber - 1], options.limit, false);
                    to = Math.min(to, distance);
                }
                if (lookForward && handleNumber < scope_Handles.length - 1) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber + 1], options.limit, true);
                    to = Math.max(to, distance);
                }
            }
            // The padding option keeps the handles a certain distance from the
            // edges of the slider. Padding must be > 0.
            if (options.padding) {
                if (handleNumber === 0) {
                    distance = scope_Spectrum.getAbsoluteDistance(0, options.padding[0], false);
                    to = Math.max(to, distance);
                }
                if (handleNumber === scope_Handles.length - 1) {
                    distance = scope_Spectrum.getAbsoluteDistance(100, options.padding[1], true);
                    to = Math.min(to, distance);
                }
            }
            if (!smoothSteps) {
                to = scope_Spectrum.getStep(to);
            }
            // Limit percentage to the 0 - 100 range
            to = limit(to);
            // Return false if handle can't move
            if (to === reference[handleNumber] && !getValue) {
                return false;
            }
            return to;
        }
        // Uses slider orientation to create CSS rules. a = base value;
        function inRuleOrder(v, a) {
            var o = options.ort;
            return (o ? a : v) + ", " + (o ? v : a);
        }
        // Moves handle(s) by a percentage
        // (bool, % to move, [% where handle started, ...], [index in scope_Handles, ...])
        function moveHandles(upward, proposal, locations, handleNumbers, connect) {
            var proposals = locations.slice();
            // Store first handle now, so we still have it in case handleNumbers is reversed
            var firstHandle = handleNumbers[0];
            var smoothSteps = options.events.smoothSteps;
            var b = [!upward, upward];
            var f = [upward, !upward];
            // Copy handleNumbers so we don't change the dataset
            handleNumbers = handleNumbers.slice();
            // Check to see which handle is 'leading'.
            // If that one can't move the second can't either.
            if (upward) {
                handleNumbers.reverse();
            }
            // Step 1: get the maximum percentage that any of the handles can move
            if (handleNumbers.length > 1) {
                handleNumbers.forEach(function (handleNumber, o) {
                    var to = checkHandlePosition(proposals, handleNumber, proposals[handleNumber] + proposal, b[o], f[o], false, smoothSteps);
                    // Stop if one of the handles can't move.
                    if (to === false) {
                        proposal = 0;
                    }
                    else {
                        proposal = to - proposals[handleNumber];
                        proposals[handleNumber] = to;
                    }
                });
            }
            // If using one handle, check backward AND forward
            else {
                b = f = [true];
            }
            var state = false;
            // Step 2: Try to set the handles with the found percentage
            handleNumbers.forEach(function (handleNumber, o) {
                state =
                    setHandle(handleNumber, locations[handleNumber] + proposal, b[o], f[o], false, smoothSteps) || state;
            });
            // Step 3: If a handle moved, fire events
            if (state) {
                handleNumbers.forEach(function (handleNumber) {
                    fireEvent("update", handleNumber);
                    fireEvent("slide", handleNumber);
                });
                // If target is a connect, then fire drag event
                if (connect != undefined) {
                    fireEvent("drag", firstHandle);
                }
            }
        }
        // Takes a base value and an offset. This offset is used for the connect bar size.
        // In the initial design for this feature, the origin element was 1% wide.
        // Unfortunately, a rounding bug in Chrome makes it impossible to implement this feature
        // in this manner: https://bugs.chromium.org/p/chromium/issues/detail?id=798223
        function transformDirection(a, b) {
            return options.dir ? 100 - a - b : a;
        }
        // Updates scope_Locations and scope_Values, updates visual state
        function updateHandlePosition(handleNumber, to) {
            // Update locations.
            scope_Locations[handleNumber] = to;
            // Convert the value to the slider stepping/range.
            scope_Values[handleNumber] = scope_Spectrum.fromStepping(to);
            var translation = transformDirection(to, 0) - scope_DirOffset;
            var translateRule = "translate(" + inRuleOrder(translation + "%", "0") + ")";
            scope_Handles[handleNumber].style[options.transformRule] = translateRule;
            updateConnect(handleNumber);
            updateConnect(handleNumber + 1);
        }
        // Handles before the slider middle are stacked later = higher,
        // Handles after the middle later is lower
        // [[7] [8] .......... | .......... [5] [4]
        function setZindex() {
            scope_HandleNumbers.forEach(function (handleNumber) {
                var dir = scope_Locations[handleNumber] > 50 ? -1 : 1;
                var zIndex = 3 + (scope_Handles.length + dir * handleNumber);
                scope_Handles[handleNumber].style.zIndex = String(zIndex);
            });
        }
        // Test suggested values and apply margin, step.
        // if exactInput is true, don't run checkHandlePosition, then the handle can be placed in between steps (#436)
        function setHandle(handleNumber, to, lookBackward, lookForward, exactInput, smoothSteps) {
            if (!exactInput) {
                to = checkHandlePosition(scope_Locations, handleNumber, to, lookBackward, lookForward, false, smoothSteps);
            }
            if (to === false) {
                return false;
            }
            updateHandlePosition(handleNumber, to);
            return true;
        }
        // Updates style attribute for connect nodes
        function updateConnect(index) {
            // Skip connects set to false
            if (!scope_Connects[index]) {
                return;
            }
            var l = 0;
            var h = 100;
            if (index !== 0) {
                l = scope_Locations[index - 1];
            }
            if (index !== scope_Connects.length - 1) {
                h = scope_Locations[index];
            }
            // We use two rules:
            // 'translate' to change the left/top offset;
            // 'scale' to change the width of the element;
            // As the element has a width of 100%, a translation of 100% is equal to 100% of the parent (.noUi-base)
            var connectWidth = h - l;
            var translateRule = "translate(" + inRuleOrder(transformDirection(l, connectWidth) + "%", "0") + ")";
            var scaleRule = "scale(" + inRuleOrder(connectWidth / 100, "1") + ")";
            scope_Connects[index].style[options.transformRule] =
                translateRule + " " + scaleRule;
        }
        // Parses value passed to .set method. Returns current value if not parse-able.
        function resolveToValue(to, handleNumber) {
            // Setting with null indicates an 'ignore'.
            // Inputting 'false' is invalid.
            if (to === null || to === false || to === undefined) {
                return scope_Locations[handleNumber];
            }
            // If a formatted number was passed, attempt to decode it.
            if (typeof to === "number") {
                to = String(to);
            }
            to = options.format.from(to);
            if (to !== false) {
                to = scope_Spectrum.toStepping(to);
            }
            // If parsing the number failed, use the current value.
            if (to === false || isNaN(to)) {
                return scope_Locations[handleNumber];
            }
            return to;
        }
        // Set the slider value.
        function valueSet(input, fireSetEvent, exactInput) {
            var values = asArray(input);
            var isInit = scope_Locations[0] === undefined;
            // Event fires by default
            fireSetEvent = fireSetEvent === undefined ? true : fireSetEvent;
            // Animation is optional.
            // Make sure the initial values were set before using animated placement.
            if (options.animate && !isInit) {
                addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
            }
            // First pass, without lookAhead but with lookBackward. Values are set from left to right.
            scope_HandleNumbers.forEach(function (handleNumber) {
                setHandle(handleNumber, resolveToValue(values[handleNumber], handleNumber), true, false, exactInput);
            });
            var i = scope_HandleNumbers.length === 1 ? 0 : 1;
            // Spread handles evenly across the slider if the range has no size (min=max)
            if (isInit && scope_Spectrum.hasNoSize()) {
                exactInput = true;
                scope_Locations[0] = 0;
                if (scope_HandleNumbers.length > 1) {
                    var space_1 = 100 / (scope_HandleNumbers.length - 1);
                    scope_HandleNumbers.forEach(function (handleNumber) {
                        scope_Locations[handleNumber] = handleNumber * space_1;
                    });
                }
            }
            // Secondary passes. Now that all base values are set, apply constraints.
            // Iterate all handles to ensure constraints are applied for the entire slider (Issue #1009)
            for (; i < scope_HandleNumbers.length; ++i) {
                scope_HandleNumbers.forEach(function (handleNumber) {
                    setHandle(handleNumber, scope_Locations[handleNumber], true, true, exactInput);
                });
            }
            setZindex();
            scope_HandleNumbers.forEach(function (handleNumber) {
                fireEvent("update", handleNumber);
                // Fire the event only for handles that received a new value, as per #579
                if (values[handleNumber] !== null && fireSetEvent) {
                    fireEvent("set", handleNumber);
                }
            });
        }
        // Reset slider to initial values
        function valueReset(fireSetEvent) {
            valueSet(options.start, fireSetEvent);
        }
        // Set value for a single handle
        function valueSetHandle(handleNumber, value, fireSetEvent, exactInput) {
            // Ensure numeric input
            handleNumber = Number(handleNumber);
            if (!(handleNumber >= 0 && handleNumber < scope_HandleNumbers.length)) {
                throw new Error("noUiSlider: invalid handle number, got: " + handleNumber);
            }
            // Look both backward and forward, since we don't want this handle to "push" other handles (#960);
            // The exactInput argument can be used to ignore slider stepping (#436)
            setHandle(handleNumber, resolveToValue(value, handleNumber), true, true, exactInput);
            fireEvent("update", handleNumber);
            if (fireSetEvent) {
                fireEvent("set", handleNumber);
            }
        }
        // Get the slider value.
        function valueGet(unencoded) {
            if (unencoded === void 0) { unencoded = false; }
            if (unencoded) {
                // return a copy of the raw values
                return scope_Values.length === 1 ? scope_Values[0] : scope_Values.slice(0);
            }
            var values = scope_Values.map(options.format.to);
            // If only one handle is used, return a single value.
            if (values.length === 1) {
                return values[0];
            }
            return values;
        }
        // Removes classes from the root and empties it.
        function destroy() {
            // remove protected internal listeners
            removeEvent(INTERNAL_EVENT_NS.aria);
            removeEvent(INTERNAL_EVENT_NS.tooltips);
            Object.keys(options.cssClasses).forEach(function (key) {
                removeClass(scope_Target, options.cssClasses[key]);
            });
            while (scope_Target.firstChild) {
                scope_Target.removeChild(scope_Target.firstChild);
            }
            delete scope_Target.noUiSlider;
        }
        function getNextStepsForHandle(handleNumber) {
            var location = scope_Locations[handleNumber];
            var nearbySteps = scope_Spectrum.getNearbySteps(location);
            var value = scope_Values[handleNumber];
            var increment = nearbySteps.thisStep.step;
            var decrement = null;
            // If snapped, directly use defined step value
            if (options.snap) {
                return [
                    value - nearbySteps.stepBefore.startValue || null,
                    nearbySteps.stepAfter.startValue - value || null,
                ];
            }
            // If the next value in this step moves into the next step,
            // the increment is the start of the next step - the current value
            if (increment !== false) {
                if (value + increment > nearbySteps.stepAfter.startValue) {
                    increment = nearbySteps.stepAfter.startValue - value;
                }
            }
            // If the value is beyond the starting point
            if (value > nearbySteps.thisStep.startValue) {
                decrement = nearbySteps.thisStep.step;
            }
            else if (nearbySteps.stepBefore.step === false) {
                decrement = false;
            }
            // If a handle is at the start of a step, it always steps back into the previous step first
            else {
                decrement = value - nearbySteps.stepBefore.highestStep;
            }
            // Now, if at the slider edges, there is no in/decrement
            if (location === 100) {
                increment = null;
            }
            else if (location === 0) {
                decrement = null;
            }
            // As per #391, the comparison for the decrement step can have some rounding issues.
            var stepDecimals = scope_Spectrum.countStepDecimals();
            // Round per #391
            if (increment !== null && increment !== false) {
                increment = Number(increment.toFixed(stepDecimals));
            }
            if (decrement !== null && decrement !== false) {
                decrement = Number(decrement.toFixed(stepDecimals));
            }
            return [decrement, increment];
        }
        // Get the current step size for the slider.
        function getNextSteps() {
            return scope_HandleNumbers.map(getNextStepsForHandle);
        }
        // Updatable: margin, limit, padding, step, range, animate, snap
        function updateOptions(optionsToUpdate, fireSetEvent) {
            // Spectrum is created using the range, snap, direction and step options.
            // 'snap' and 'step' can be updated.
            // If 'snap' and 'step' are not passed, they should remain unchanged.
            var v = valueGet();
            var updateAble = [
                "margin",
                "limit",
                "padding",
                "range",
                "animate",
                "snap",
                "step",
                "format",
                "pips",
                "tooltips",
            ];
            // Only change options that we're actually passed to update.
            updateAble.forEach(function (name) {
                // Check for undefined. null removes the value.
                if (optionsToUpdate[name] !== undefined) {
                    originalOptions[name] = optionsToUpdate[name];
                }
            });
            var newOptions = testOptions(originalOptions);
            // Load new options into the slider state
            updateAble.forEach(function (name) {
                if (optionsToUpdate[name] !== undefined) {
                    options[name] = newOptions[name];
                }
            });
            scope_Spectrum = newOptions.spectrum;
            // Limit, margin and padding depend on the spectrum but are stored outside of it. (#677)
            options.margin = newOptions.margin;
            options.limit = newOptions.limit;
            options.padding = newOptions.padding;
            // Update pips, removes existing.
            if (options.pips) {
                pips(options.pips);
            }
            else {
                removePips();
            }
            // Update tooltips, removes existing.
            if (options.tooltips) {
                tooltips();
            }
            else {
                removeTooltips();
            }
            // Invalidate the current positioning so valueSet forces an update.
            scope_Locations = [];
            valueSet(isSet(optionsToUpdate.start) ? optionsToUpdate.start : v, fireSetEvent);
        }
        // Initialization steps
        function setupSlider() {
            // Create the base element, initialize HTML and set classes.
            // Add handles and connect elements.
            scope_Base = addSlider(scope_Target);
            addElements(options.connect, scope_Base);
            // Attach user events.
            bindSliderEvents(options.events);
            // Use the public value method to set the start values.
            valueSet(options.start);
            if (options.pips) {
                pips(options.pips);
            }
            if (options.tooltips) {
                tooltips();
            }
            aria();
        }
        setupSlider();
        var scope_Self = {
            destroy: destroy,
            steps: getNextSteps,
            on: bindEvent,
            off: removeEvent,
            get: valueGet,
            set: valueSet,
            setHandle: valueSetHandle,
            reset: valueReset,
            disable: disable,
            enable: enable,
            // Exposed for unit testing, don't use this in your application.
            __moveHandles: function (upward, proposal, handleNumbers) {
                moveHandles(upward, proposal, scope_Locations, handleNumbers);
            },
            options: originalOptions,
            updateOptions: updateOptions,
            target: scope_Target,
            removePips: removePips,
            removeTooltips: removeTooltips,
            getPositions: function () {
                return scope_Locations.slice();
            },
            getTooltips: function () {
                return scope_Tooltips;
            },
            getOrigins: function () {
                return scope_Handles;
            },
            pips: pips, // Issue #594
        };
        return scope_Self;
    }
    // Run the standard initializer
    function initialize(target, originalOptions) {
        if (!target || !target.nodeName) {
            throw new Error("noUiSlider: create requires a single element, got: " + target);
        }
        // Throw an error if the slider was already initialized.
        if (target.noUiSlider) {
            throw new Error("noUiSlider: Slider was already initialized.");
        }
        // Test the options and create the slider environment;
        var options = testOptions(originalOptions);
        var api = scope(target, options, originalOptions);
        target.noUiSlider = api;
        return api;
    }
    var nouislider = {
        // Exposed for unit testing, don't use this in your application.
        __spectrum: Spectrum,
        // A reference to the default classes, allows global changes.
        // Use the cssClasses option for changes to one slider.
        cssClasses: cssClasses,
        create: initialize,
    };

    exports.create = initialize;
    exports.cssClasses = cssClasses;
    exports["default"] = nouislider;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
}(nouislider, nouislider.exports));

var noUiSlider = /*@__PURE__*/getDefaultExportFromCjs(nouislider.exports);

const priceRange = container => {
  const inputs = t$3('input', container);
  const minInput = inputs[0];
  const maxInput = inputs[1];
  const events = [e$3(inputs, 'change', onRangeChange), c('filters:range-removed', () => reset())];
  const slider = n$2('[data-range-slider]');
  noUiSlider.create(slider, {
    start: [minInput.value ? minInput.value : minInput.getAttribute('min'), maxInput.value ? maxInput.value : maxInput.getAttribute('max')],
    connect: true,
    range: {
      'min': parseInt(minInput.getAttribute('min')),
      'max': parseInt(maxInput.getAttribute('max'))
    }
  });
  slider.noUiSlider.on('set', e => {
    let max, min;
    [min, max] = e;
    minInput.value = Math.floor(min);
    maxInput.value = Math.floor(max);
    fireChangeEvent();
    setMinAndMaxValues();
  });
  setMinAndMaxValues();
  function setMinAndMaxValues() {
    if (maxInput.value) minInput.setAttribute('max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('min', 0);
    if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
  }
  function adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.getAttribute('min'));
    const max = Number(input.getAttribute('max'));
    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }
  function fireChangeEvent() {
    minInput.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    maxInput.dispatchEvent(new Event('change', {
      bubbles: true
    }));
  }
  function onRangeChange(event) {
    adjustToValidValues(event.currentTarget);
    setMinAndMaxValues();
    if (minInput.value === '' && maxInput.value === '') return;
    let currentMax, currentMin;
    [currentMin, currentMax] = slider.noUiSlider.get();
    currentMin = Math.floor(currentMin);
    currentMax = Math.floor(currentMax);
    if (currentMin !== Math.floor(minInput.value)) slider.noUiSlider.set([minInput.value, null]);
    if (currentMax !== Math.floor(maxInput.value)) slider.noUiSlider.set([null, maxInput.value]);
  }
  function validateRange() {
    inputs.forEach(input => setMinAndMaxValues());
  }
  const reset = () => {
    slider.noUiSlider.set([minInput.getAttribute('min'), maxInput.getAttribute('max')]);
    minInput.value = '';
    maxInput.value = '';
    fireChangeEvent();
    setMinAndMaxValues();
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
    slider.noUiSlider.destroy();
  };
  return {
    unload,
    reset,
    validateRange
  };
};

const sel$1 = {
  filter: '[data-filter]',
  filterTarget: '[data-filter-target]',
  flyouts: '[data-filter-modal]',
  button: '[data-button]',
  wash: '[data-drawer-wash]',
  sort: '[data-sort]',
  close: '[data-close-icon]',
  group: '.filter-drawer__group',
  panel: '.filter-drawer__panel',
  flyoutWrapper: '[data-filer-modal-wrapper]',
  priceRange: '[data-price-range]'
};
const classes$1 = {
  active: 'active',
  activeFilters: 'filters-active',
  fixed: 'is-fixed'
};
const filterDrawer = node => {
  const flyouts = t$3(sel$1.flyouts, node);
  const flyoutContainer = n$2(sel$1.flyoutWrapper, node);
  const wash = n$2(sel$1.wash, node);
  const filters = t$3(sel$1.filter, node);
  const sortMethods = t$3(`[data-filter-modal="__sort"] ${sel$1.sort}`);
  const rangeInputs = t$3('[data-range-input]', node);
  let focusTrap = null;
  let range = null;
  const rangeContainer = n$2(sel$1.priceRange, node);
  if (rangeContainer) {
    range = priceRange(rangeContainer);
  }
  const events = [e$3(t$3(sel$1.filterTarget, node), 'click', clickFlyoutTrigger), e$3(filters, 'click', clickFilter), e$3(sortMethods, 'click', clickSort), e$3(wash, 'click', clickWash), e$3(t$3(sel$1.button, node), 'click', clickButton), e$3(t$3(sel$1.close, node), 'click', clickWash), e$3(node, 'keydown', ({
    keyCode
  }) => {
    if (keyCode === 27) clickWash();
  }), e$3(rangeInputs, 'change', rangeChanged), c('filters:filter-removed', () => syncActiveStates())];
  const mobiletrigger = n$2('[data-mobile-trigger]', node);
  const mobileFilters = n$2('[data-mobile-filters]', node);
  if (mobileFilters || mobiletrigger) {
    events.push(e$3(mobiletrigger, 'click', () => {
      mobileFilters.style.setProperty('--mobile-filters-offset', `${mobileFilters.clientHeight - 20}px`);
      l(mobileFilters, classes$1.active);
    }));
  }
  setActiveStates();
  function setActiveStates() {
    const panels = t$3(sel$1.panel, node);
    panels.forEach(panel => {
      const groups = t$3(sel$1.group, panel);
      if (groups.length) {
        groups.forEach(group => {
          if (containsCheckedInputs(t$3('input', group))) {
            u$1(group, classes$1.activeFilters);
          }
        });
      }
      l(panel, classes$1.activeFilters, containsCheckedInputs(t$3('input', panel)));
    });
  }
  function clickFlyoutTrigger(e) {
    e.preventDefault();
    const {
      filterTarget
    } = e.currentTarget.dataset;
    const modal = n$2(`[data-filter-modal="${filterTarget}"]`, node);
    focusTrap = createFocusTrap(modal, {
      allowOutsideClick: true
    });
    u$1(flyoutContainer, classes$1.fixed);
    setTimeout(() => {
      u$1(flyoutContainer, classes$1.active);
      u$1(modal, classes$1.active);
    }, 50);
    modal.setAttribute('aria-hidden', 'false');
    focusTrap.activate();
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute('data-scroll-lock-ignore') !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  }
  function clickWash(e) {
    e && e.preventDefault();
    focusTrap && focusTrap.deactivate();
    i$1(flyouts, classes$1.active);
    i$1(flyoutContainer, classes$1.active);
    flyouts.forEach(flyout => flyout.setAttribute('aria-hidden', 'true'));
    enableBodyScroll(node);
    setTimeout(() => {
      i$1(flyoutContainer, classes$1.fixed);
    }, 300);
  }
  function clickFilter(e) {
    checkForActiveModalitems(e.currentTarget);
    const wrappingContainer = e.target.closest(sel$1.group);
    wrappingContainer && l(wrappingContainer, classes$1.activeFilters, containsCheckedInputs(t$3('input', wrappingContainer)));
  }
  function clickSort(e) {
    checkForActiveModalitems(e.target);
  }
  function rangeChanged(e) {
    checkForActiveModalitems(e.currentTarget);
    const wrappingContainer = e.target.closest(sel$1.group);
    wrappingContainer && l(wrappingContainer, classes$1.activeFilters, rangeInputsHaveValue());
  }
  function clickButton(e) {
    e.preventDefault();
    const {
      button
    } = e.currentTarget.dataset;
    const scope = e.currentTarget.closest(sel$1.flyouts);
    const {
      filterModal
    } = scope.dataset;

    // Sort flyouts
    if (filterModal === '__sort') {
      if (button === 'clear-all') {
        sortMethods.forEach(element => {
          n$2('input', element).checked = false;
        });
        i$1(e.currentTarget.closest(sel$1.panel), classes$1.activeFilters);
      }
      if (button === 'apply') {
        updateFilters();
        clickWash();
        return;
      }
    } else {
      // Regular filter flyout

      if (button === 'clear-all') {
        t$3('input', scope).forEach(input => {
          input.checked = false;
        });
        const panel = e.currentTarget.closest(sel$1.panel);
        i$1([...t$3(sel$1.group, panel), panel], classes$1.activeFilters);
        range && range.reset();
      }
      if (button === 'clear') {
        const wrappingContainer = e.target.closest(sel$1.group);
        t$3('input', wrappingContainer).forEach(input => {
          input.checked = false;
        });
        i$1(e.currentTarget.closest(sel$1.group), classes$1.activeFilters);
        checkForActiveModalitems(e.currentTarget);
        if (n$2('.filter-drawer__price-range', wrappingContainer)) {
          range.reset();
        }
      }
      if (button === 'apply') {
        range && range.validateRange();
        updateFilters();
        clickWash();
      }
    }
  }
  function containsCheckedInputs(items) {
    let isActive = false;
    items.forEach(input => {
      if (input.checked) {
        isActive = true;
      }
    });
    return isActive;
  }
  function rangeInputsHaveValue() {
    let hasValue = false;
    rangeInputs.forEach(input => {
      if (input.value !== '') hasValue = true;
    });
    return hasValue;
  }
  function checkForActiveModalitems(currentTarget) {
    const panel = currentTarget.closest(sel$1.panel);
    if (!panel) return;
    const activeItems = containsCheckedInputs(t$3('input', panel)) || rangeInputsHaveValue();
    l(panel, classes$1.activeFilters, activeItems);
  }
  function syncActiveStates() {
    const panels = t$3(sel$1.panel, node);
    panels.forEach(panel => {
      let activeItems = false;
      const rangeInputs = n$2('[data-range-input]', panel);
      if (containsCheckedInputs(t$3('input', panel))) {
        activeItems = true;
      }
      if (rangeInputs && rangeInputsHaveValue()) {
        activeItems = true;
      }
      l(panel, classes$1.activeFilters, activeItems);
    });
  }
  function unload() {
    events.forEach(unsubscribe => unsubscribe());
    range && range.unload();
  }
  return {
    unload
  };
};

const selectors$2 = {
  infiniteScrollContainer: ".collection__infinite-container",
  infiniteScrollTrigger: ".collection__infinite-trigger",
  partial: "[data-partial]"
};
register("collection", {
  infiniteScroll: null,
  onLoad() {
    const {
      collectionItemCount,
      paginationType
    } = this.container.dataset;
    if (!parseInt(collectionItemCount)) return;
    this.filterForm = n$2("[data-filter-form]", this.container);
    if (this.filterForm) {
      this.partial = n$2(selectors$2.partial, this.container);
      this.filterDrawer = filterDrawer(this.container);
      this.filterHandler = filterHandler({
        container: this.container,
        partial: this.partial,
        renderCB: this._renderView.bind(this)
      });
    }

    // Ininite scroll
    this.paginationType = paginationType;
    this.paginated = this.paginationType === "paginated";
    this.infiniteScrollTrigger = n$2(selectors$2.infiniteScrollTrigger, this.container);
    if (!this.paginated) {
      this._initInfiniteScroll();
    }
    this.productItem = ProductItem(this.container);
    this.AnimateCollection = AnimateCollection(this.container);
  },
  _initInfiniteScroll() {
    const infiniteScrollOptions = {
      container: selectors$2.infiniteScrollContainer,
      pagination: selectors$2.infiniteScrollTrigger,
      loadingText: "Loading...",
      callback: () => {
        this.productItem && this.productItem.unload();
        this.productItem = ProductItem(this.container);

        // The visible items are already initialized and do not
        // need to be reinitialized. The newly added items however
        // do need to be initialized.
        this.AnimateCollection.updateItems(false);

        // All apps to add new listeners
        dispatchCustomEvent("products:loaded");
        r$3("collection:updated");
      }
    };
    if (this.paginationType === "click") {
      infiniteScrollOptions.method = "click";
    }
    this.infiniteScroll = new Ajaxinate(infiniteScrollOptions);
  },
  _renderView(searchParams) {
    const url = `${window.location.pathname}?section_id=${this.container.dataset.sectionId}&${searchParams}`;
    const loading = n$2(".collection__loading", this.container);
    u$1(loading, "is-active");
    fetch(url).then(res => res.text()).then(res => {
      this._updateURLHash(searchParams);
      const doc = new DOMParser().parseFromString(res, "text/html");
      const contents = n$2(selectors$2.partial, doc).innerHTML;
      this.partial.innerHTML = contents;
      if (!this.paginated) {
        this.infiniteScrollTrigger.innerHTML = "";
        this._initInfiniteScroll();
      }
      this.productItem && this.productItem.unload();
      this.productItem = ProductItem(this.container);

      // All apps to add new listeners
      dispatchCustomEvent("products:loaded");
      this.AnimateCollection.updateItems();
      i$1(loading, "is-active");
      r$3("collection:updated");
    });
  },
  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, "", `${window.location.pathname}${searchParams && "?".concat(searchParams)}`);
  },
  onUnload() {
    this.infiniteScroll && this.infiniteScroll.destroy();
    this.filtering && this.filtering.unload();
    this.delegate.off();
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.productItem && this.productItem.unload();
    this.AnimateCollection?.destroy();
  }
});

register('login', {
  onLoad() {
    const main = n$2('[data-part="login"]', this.container);
    const reset = n$2('[data-part="reset"]', this.container);
    const toggles = t$3('[data-toggle]', this.container);
    const wrapper = n$2('.login__wrapper', this.container);
    const loginError = n$2('.login__error', this.container);
    const isSuccess = n$2('[data-success]', this.container);
    const successMessage = n$2('[data-success-message]', this.container);
    if (isSuccess) {
      u$1(successMessage, 'visible');
      u$1(wrapper, 'hide');
    }
    if (loginError) {
      toggleView();
    }
    function toggleView(e) {
      e && e.preventDefault();
      l([main, reset], 'hide');
      main.setAttribute('aria-hidden', a$1(main, 'hide'));
      reset.setAttribute('aria-hidden', a$1(reset, 'hide'));
    }
    this.toggleClick = e$3(toggles, 'click', toggleView);
  },
  onUnload() {
    this.toggleClick();
  }
});

register('addresses', {
  onLoad() {
    this.modals = t$3('[data-address-modal]', this.container);
    this.focusTrap = null;
    const overlays = t$3('[data-overlay]', this.container);
    const open = t$3('[data-open]', this.container);
    const close = t$3('[data-close]', this.container);
    const remove = t$3('[data-remove]', this.container);
    const countryOptions = t$3('[data-country-option]', this.container) || [];
    this.events = [e$3(open, 'click', e => this.openModal(e)), e$3([...close, ...overlays], 'click', e => this.closeModal(e)), e$3(remove, 'click', e => this.removeAddress(e)), e$3(this.modals, 'keydown', e => {
      if (e.keyCode === 27) this.closeModal(e);
    })];
    countryOptions.forEach(el => {
      const {
        formId
      } = el.dataset;
      const countrySelector = 'AddressCountry_' + formId;
      const provinceSelector = 'AddressProvince_' + formId;
      const containerSelector = 'AddressProvinceContainer_' + formId;
      new window.Shopify.CountryProvinceSelector(countrySelector, provinceSelector, {
        hideElement: containerSelector
      });
    });
  },
  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
  },
  openModal(e) {
    e.preventDefault();
    const {
      open: which
    } = e.currentTarget.dataset;
    const modal = this.modals.find(el => el.dataset.addressModal == which);
    u$1(modal, 'active');
    this.focusTrap = createFocusTrap(modal, {
      allowOutsideClick: true
    });
    this.focusTrap.activate();
    disableBodyScroll(modal, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute('data-scroll-lock-ignore') !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
    setTimeout(() => {
      u$1(modal, 'visible');
    }, 50);
  },
  closeModal(e) {
    e.preventDefault();
    const modal = e.target.closest('.addresses__modal');
    enableBodyScroll(modal);
    this.focusTrap.deactivate();
    i$1(modal, 'visible');
    setTimeout(() => {
      i$1(modal, 'active');
    }, 350);
  },
  removeAddress(e) {
    const {
      confirmMessage,
      target
    } = e.currentTarget.dataset;
    if (confirm(confirmMessage) || 'Are you sure you wish to delete this address?') {
      window.Shopify.postLink(target, {
        parameters: {
          _method: 'delete'
        }
      });
    }
  }
});

register('article', {
  onLoad() {
    focusFormStatus(this.container);
    const socialButtons = t$3('[data-social-share]', this.container);
    this.events = [e$3(socialButtons, 'click', e => {
      l(e.target, 'active');
      const sub = n$2('.article__share-icons', e.target);
      sub.setAttribute('aria-hidden', !a$1(e.target, 'active'));
    })];
    wrapIframes(t$3('iframe', this.container));
    wrapTables(t$3('table', this.container));
    this.AnimateArticle = AnimateArticle(this.container);
  },
  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
    this.AnimateArticle?.destroy();
  }
});

const sel = {
  toggle: '[data-js-toggle]',
  textToggle: '[data-text-toggle]'
};
register('password', {
  onLoad() {
    const toggleButton = n$2(sel.toggle, this.container);
    const textToggle = n$2(sel.textToggle, this.container);
    const socialButton = n$2('[data-social-share]', this.container);
    this.events = [e$3([toggleButton, textToggle], 'click', e => this.toggleView(e)), e$3(socialButton, 'click', e => {
      l(e.target, 'active');
      const sub = n$2('.password__share-icons', e.target);
      sub.setAttribute('aria-hidden', !a$1(e.target, 'active'));
    })];
  },
  toggleView() {
    l(this.container, 'welcome');
  },
  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
  }
});

const selectors$1 = {
  video: '.about__block-video'
};
register('page', {
  onLoad() {
    const videos = t$3(selectors$1.video, this.container);
    this.videoHandlers = [];
    if (videos.length) {
      videos.forEach(video => {
        this.videoHandlers.push(backgroundVideoHandler(video.parentNode));
      });
    }
    this.accordions = Accordions(t$3('.accordion', this.container));
    wrapIframes(t$3('iframe', this.container));
    wrapTables(t$3('table', this.container));
  },
  onUnload() {
    this.accordions.unload();
    this.videoHandlers.forEach(handler => handler());
  }
});

const selectors = {
  partial: '[data-partial]',
  loader: '.search__loading'
};
const classes = {
  active: 'is-active'
};
register('search', {
  onLoad() {
    const clearButton = n$2('[data-clear-search]', this.container);
    const searchButton = n$2('.search__submit', this.container);
    const searchInput = n$2('[data-search-input]', this.container);
    const filterForm = n$2('[data-filter-form]', this.container);
    this.searchParamsInitial = window.location.search.slice(1);
    this.searchParamsPrev = window.location.search.slice(1);
    if (filterForm) {
      this.partial = n$2(selectors.partial, this.container);
      this.filterDrawer = filterDrawer(this.container);
      this.filterHandler = filterHandler({
        container: this.container,
        partial: this.partial,
        renderCB: this._renderView.bind(this)
      });
    }
    l([clearButton, searchButton], 'visible', searchInput.value !== '');
    this.AnimateSearch = AnimateSearch(this.container);
    this.events = [e$3(clearButton, 'click', () => {
      searchInput.value = '';
      l([clearButton, searchButton], 'visible', searchInput.value !== '');
    }), e$3(searchInput, 'input', e => l([clearButton, searchButton], 'visible', e.target.value !== '')), e$3(window, 'popstate', event => {
      const searchParams = event.state ? event.state.searchParams : this.searchParamsInitial;
      if (searchParams === this.searchParamsPrev) return;
      this._renderView(searchParams, false);
    })];
  },
  _renderView(searchParams, updateHash = true) {
    const url = `${window.location.pathname}?section_id=${this.container.dataset.sectionId}&${searchParams}`;
    const loading = n$2(selectors.loader, this.container);
    u$1(loading, classes.active);
    this.filterDrawer.unload();
    fetch(url).then(res => res.text()).then(res => {
      this.searchParamsPrev = searchParams;
      updateHash && this._updateURLHash(searchParams);
      const doc = new DOMParser().parseFromString(res, 'text/html');
      const contents = n$2(selectors.partial, doc).innerHTML;
      this.partial.innerHTML = contents;
      i$1(loading, classes.active);
      this.filterDrawer = filterDrawer(this.container);
      this.AnimateSearch.updateItems();
    });
  },
  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  },
  onUnload() {
    this.buttonHandler();
    this.filterHandler && this.filterHandler.unload();
    this.filterDrawer && this.filterDrawer.unload();
    this.AnimateSearch?.destroy();
  }
});

register('contact', {
  onLoad() {
    this.accordions = Accordions(t$3('.accordion', this.container));
    wrapIframes(t$3('iframe', this.container));
    wrapTables(t$3('table', this.container));
  },
  onUnload() {
    this.accordions.unload();
  }
});

register('blog', {
  onLoad() {
    this.AnimateBlog = AnimateBlog(this.container);
  },
  onUnload() {
    this.AnimateBlog?.destroy();
  }
});

// Detect theme editor
if (window.Shopify.designMode === true) {
  u$1(document.documentElement, 'theme-editor');
  document.documentElement.classList.add('theme-editor');
} else {
  const el = n$2('.theme-editor-scroll-offset', document);
  el && el.parentNode.removeChild(el);
}

// Function to load all sections
const loadSections = () => {
  load('*');
  o$1({
    SelectedProductSection: null
  });
};

// Call above function either immediately or bind on loaded event
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  loadSections();
} else {
  e$3(document, 'DOMContentLoaded', loadSections);
}
if (isMobile$1({
  tablet: true,
  featureDetect: true
})) {
  u$1(document.body, 'is-mobile');
}

// Page transitions
pageTransition();

// a11y tab handler
handleTab();

// Apply contrast classes
sectionClasses();

// Quick add to cart
quickAdd();

// Quick add modal
const quickAddModalElement = n$2('[data-quick-add-modal]', document);
if (quickAddModalElement) {
  quickAddModal(quickAddModalElement);
}

// Setup modal
const modalElement = n$2('[data-modal]', document);
modal(modalElement);

// Product availabilty drawer
const availabilityDrawer = n$2('[data-store-availability-drawer]', document);
storeAvailabilityDrawer(availabilityDrawer);

// Make it easy to see exactly what theme version
// this is by commit SHA

window.SHA = '4bb4c519e2';
