/* ============================================================
   bo-runtime.js — Tiny React-compatible runtime (vanilla JS)
   ------------------------------------------------------------
   Provides a minimal but faithful subset of React used by the
   TOPIK Myanmar BO mockup so the original JSX panels can be
   ported almost 1:1 (JSX -> h() calls) with NO React/Babel.

   Exposes globals:
     React = { createElement, Fragment, useState, useEffect,
               useLayoutEffect, useMemo, useCallback, useRef }
     ReactDOM = { createRoot }
     h  (alias of React.createElement)

   Implementation: instance-tree reconciler with keyed diffing,
   fragment + component support (each comp/fragment is bounded by
   a trailing empty text marker), hooks, and effect scheduling.
   Re-renders happen from the root on any state change (the whole
   app is small) and the keyed diff preserves DOM nodes so input
   focus / CSS transitions behave like the React original.
   ============================================================ */
(function (global) {
  'use strict';

  var FRAGMENT = { $$frag: true };
  var TEXT = '#text';

  // ---------- createElement ----------
  function createElement(type, props) {
    props = props || {};
    var key = props.key != null ? props.key : null;
    var ref = props.ref != null ? props.ref : null;
    var p = {};
    for (var k in props) { if (k !== 'key' && k !== 'ref') p[k] = props[k]; }
    var len = arguments.length;
    if (len > 2) {
      var children = new Array(len - 2);
      for (var i = 2; i < len; i++) children[i - 2] = arguments[i];
      p.children = children;
    }
    return { type: type, props: p, key: key, ref: ref };
  }

  // text vnode
  function textVNode(value) {
    return { type: TEXT, props: {}, key: null, ref: null, text: String(value) };
  }

  // Flatten a children value into an array of vnodes (skip null/bool, wrap text)
  function normalizeChildren(children) {
    var out = [];
    (function walk(c) {
      if (c == null || c === false || c === true) return;
      if (Array.isArray(c)) { for (var i = 0; i < c.length; i++) walk(c[i]); return; }
      if (typeof c === 'string' || typeof c === 'number') { out.push(textVNode(c)); return; }
      out.push(c);
    })(children);
    return out;
  }

  // ---------- hooks dispatcher state ----------
  var currentInstance = null;
  var pendingEffects = [];
  var layoutEffects = [];

  function useState(initial) {
    var inst = currentInstance;
    var i = inst.hookIndex++;
    var hooks = inst.hooks;
    if (hooks[i] === undefined) {
      hooks[i] = {
        state: typeof initial === 'function' ? initial() : initial,
        setState: null
      };
      var hook = hooks[i];
      hook.setState = function (value) {
        var next = typeof value === 'function' ? value(hook.state) : value;
        if (Object.is(next, hook.state)) return;
        hook.state = next;
        scheduleUpdate();
      };
    }
    return [hooks[i].state, hooks[i].setState];
  }

  function depsChanged(oldDeps, newDeps) {
    if (newDeps === undefined) return true;       // no deps -> every render
    if (oldDeps === undefined) return true;       // first run
    if (oldDeps.length !== newDeps.length) return true;
    for (var i = 0; i < newDeps.length; i++) {
      if (!Object.is(oldDeps[i], newDeps[i])) return true;
    }
    return false;
  }

  function makeEffectHook(queue) {
    return function (fn, deps) {
      var inst = currentInstance;
      var i = inst.hookIndex++;
      var hook = inst.hooks[i] || (inst.hooks[i] = { deps: undefined, cleanup: undefined });
      if (depsChanged(hook.deps, deps)) {
        hook.deps = deps ? deps.slice() : deps;
        queue.push(function () {
          if (typeof hook.cleanup === 'function') { try { hook.cleanup(); } catch (e) {} }
          var c = fn();
          hook.cleanup = (typeof c === 'function') ? c : undefined;
        });
      }
    };
  }
  var useEffect = makeEffectHook(pendingEffects);
  var useLayoutEffect = makeEffectHook(layoutEffects);

  function useMemo(fn, deps) {
    var inst = currentInstance;
    var i = inst.hookIndex++;
    var hook = inst.hooks[i];
    if (!hook || depsChanged(hook.deps, deps)) {
      hook = inst.hooks[i] = { value: fn(), deps: deps ? deps.slice() : deps };
    }
    return hook.value;
  }

  function useCallback(fn, deps) {
    return useMemo(function () { return fn; }, deps);
  }

  function useRef(initial) {
    var inst = currentInstance;
    var i = inst.hookIndex++;
    if (inst.hooks[i] === undefined) inst.hooks[i] = { current: initial };
    return inst.hooks[i];
  }

  // ---------- DOM helpers ----------
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SVG_ATTR_MAP = {
    strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap',
    strokeLinejoin: 'stroke-linejoin', strokeDasharray: 'stroke-dasharray',
    strokeDashoffset: 'stroke-dashoffset', strokeOpacity: 'stroke-opacity',
    strokeMiterlimit: 'stroke-miterlimit', fillOpacity: 'fill-opacity',
    fillRule: 'fill-rule', clipPath: 'clip-path', clipRule: 'clip-rule'
  };
  var UNITLESS = {
    zIndex: 1, fontWeight: 1, lineHeight: 1, opacity: 1, flex: 1, flexGrow: 1,
    flexShrink: 1, order: 1, zoom: 1, gridColumn: 1, gridRow: 1, columnCount: 1,
    fillOpacity: 1, strokeOpacity: 1, tabSize: 1, aspectRatio: 1
  };
  var BOOL_PROPS = {
    disabled: 1, readOnly: 1, required: 1, checked: 1, multiple: 1,
    selected: 1, autoFocus: 1, hidden: 1, autoPlay: 1, controls: 1, loop: 1,
    open: 1, novalidate: 1, noValidate: 1
  };

  function styleToString(style) { return style; } // placeholder (not used)

  function applyStyle(node, style) {
    if (style == null) { node.removeAttribute('style'); return; }
    if (typeof style === 'string') { node.setAttribute('style', style); return; }
    node.style.cssText = '';
    for (var key in style) {
      var val = style[key];
      if (val == null || val === false) continue;
      if (typeof val === 'number' && !UNITLESS[key]) val = val + 'px';
      node.style.setProperty(camelToDash(key), val);
    }
  }
  function camelToDash(s) {
    if (s.charAt(0) === '-') return s; // custom prop
    return s.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
  }

  function ensureEvent(node, evName) {
    node._handlers = node._handlers || {};
    if (!node._listening) node._listening = {};
    if (!node._listening[evName]) {
      node._listening[evName] = true;
      node.addEventListener(evName, function (e) {
        var h = node._handlers[evName];
        if (h) h(e);
      });
    }
  }

  function eventName(node, propName) {
    // propName like 'onClick', 'onChange', 'onKeyDown', 'onMouseEnter'
    var raw = propName.slice(2).toLowerCase();
    if (raw === 'change') {
      var tag = node.tagName;
      var type = (node.getAttribute && node.getAttribute('type')) || '';
      if (tag === 'INPUT' && (type === 'checkbox' || type === 'radio' || type === 'file' || type === 'range')) return 'change';
      if (tag === 'SELECT') return 'change';
      return 'input'; // text inputs / textarea -> React onChange === input
    }
    if (raw === 'doubleclick') return 'dblclick';
    return raw;
  }

  function setProp(node, name, value, oldValue, isSvg) {
    if (name === 'children' || name === 'key' || name === 'ref') return;
    if (name === 'className') {
      if (value == null || value === false) node.removeAttribute('class');
      else node.setAttribute('class', value);
      return;
    }
    if (name === 'style') { applyStyle(node, value); return; }
    if (name === 'dangerouslySetInnerHTML') {
      var html = value && value.__html != null ? value.__html : '';
      var oldHtml = oldValue && oldValue.__html != null ? oldValue.__html : undefined;
      if (html !== oldHtml) node.innerHTML = html;
      return;
    }
    if (name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110 && name.length > 2 &&
        name.charAt(2) >= 'A' && name.charAt(2) <= 'Z') { // onXxx
      var ev = eventName(node, name);
      ensureEvent(node, ev);
      node._handlers[ev] = value;
      return;
    }
    if (name === 'value') {
      // controlled value (set after children for <select>, handled by caller too)
      if (node.tagName === 'SELECT') { node._wantValue = value; return; }
      var v = value == null ? '' : value;
      if (node.value !== String(v)) node.value = v;
      return;
    }
    if (name === 'checked') { node.checked = !!value; return; }
    if (name === 'defaultValue') {
      if (oldValue === undefined) { if (node.value === '' || node.value == null) node.value = value == null ? '' : value; }
      return;
    }
    if (name === 'defaultChecked') {
      if (oldValue === undefined) node.checked = !!value;
      return;
    }
    if (name === 'htmlFor') {
      if (value == null) node.removeAttribute('for'); else node.setAttribute('for', value);
      return;
    }
    if (!isSvg && BOOL_PROPS[name]) {
      var prop = name === 'readOnly' ? 'readOnly' : (name === 'autoFocus' ? 'autofocus'
        : (name === 'noValidate' || name === 'novalidate' ? 'noValidate' : name));
      try { node[prop] = !!value; }
      catch (e) { if (value) node.setAttribute(name.toLowerCase(), ''); else node.removeAttribute(name.toLowerCase()); }
      if (name === 'disabled' || name === 'hidden' || name === 'required' || name === 'multiple') {
        if (value) node.setAttribute(name, ''); else node.removeAttribute(name);
      }
      return;
    }
    // generic attribute
    var attrName = name;
    if (isSvg && SVG_ATTR_MAP[name]) attrName = SVG_ATTR_MAP[name];
    var dataAria = name.indexOf('data-') === 0 || name.indexOf('aria-') === 0;
    if (value === true) {
      // React serializes boolean data-*/aria-* as the string "true"
      node.setAttribute(attrName, dataAria ? 'true' : '');
    } else if (value === false) {
      // data-*/aria-* keep "false"; other attrs are removed
      if (dataAria) node.setAttribute(attrName, 'false');
      else node.removeAttribute(attrName);
    } else if (value == null) {
      node.removeAttribute(attrName);
    } else {
      node.setAttribute(attrName, value);
    }
  }

  function createDomElement(vnode, isSvg) {
    var node = isSvg
      ? document.createElementNS(SVG_NS, vnode.type)
      : document.createElement(vnode.type);
    var props = vnode.props;
    for (var name in props) setProp(node, name, props[name], undefined, isSvg);
    return node;
  }

  function updateDomProps(node, oldProps, newProps, isSvg) {
    // remove props no longer present
    for (var name in oldProps) {
      if (name === 'children') continue;
      if (!(name in newProps)) {
        if (name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110 &&
            name.charAt(2) >= 'A' && name.charAt(2) <= 'Z') {
          var ev = eventName(node, name);
          if (node._handlers) node._handlers[ev] = null;
        } else {
          setProp(node, name, null, oldProps[name], isSvg);
        }
      }
    }
    // set new / changed props
    for (var n in newProps) {
      if (n === 'children') continue;
      var nv = newProps[n], ov = oldProps[n];
      if (n === 'value' || n === 'checked' || n === 'dangerouslySetInnerHTML' || n === 'style') {
        setProp(node, n, nv, ov, isSvg); // always re-apply (controlled / object identity)
      } else if (nv !== ov) {
        setProp(node, n, nv, ov, isSvg);
      }
    }
  }

  function finalizeSelectValue(node) {
    if (node.tagName === 'SELECT' && '_wantValue' in node) {
      var v = node._wantValue == null ? '' : String(node._wantValue);
      if (node.value !== v) node.value = v;
    }
  }

  function setRef(ref, value) {
    if (!ref) return;
    if (typeof ref === 'function') ref(value);
    else if (typeof ref === 'object') ref.current = value;
  }

  // ---------- instance / mount / patch ----------
  // instance shape:
  //   text: { type:'#text', el, node }
  //   host: { type:'div', el, node, children:[inst], isSvg }
  //   frag: { type:FRAGMENT, el, marker, children:[inst] }
  //   comp: { type:fn, el, marker, hooks, hookIndex, children:[inst] }

  function isSameType(a, b) {
    return a.type === b.type;
  }

  function getNodes(inst, acc) {
    acc = acc || [];
    if (inst.type === TEXT || typeof inst.type === 'string') {
      acc.push(inst.node);
      return acc;
    }
    var kids = inst.children || [];
    for (var i = 0; i < kids.length; i++) getNodes(kids[i], acc);
    acc.push(inst.marker);
    return acc;
  }

  function renderComponent(inst) {
    inst.hookIndex = 0;
    var prev = currentInstance;
    currentInstance = inst;
    var out;
    try { out = inst.el.type(inst.el.props); }
    finally { currentInstance = prev; }
    return out;
  }

  function mount(vnode, isSvg) {
    if (vnode.type === TEXT) {
      return { type: TEXT, el: vnode, node: document.createTextNode(vnode.text) };
    }
    if (typeof vnode.type === 'function') {
      var inst = { type: vnode.type, el: vnode, marker: document.createTextNode(''), hooks: [], hookIndex: 0, children: [] };
      var rendered = renderComponent(inst);
      var list = normalizeChildren(rendered);
      inst.children = list.map(function (c) { return mount(c, isSvg); });
      return inst;
    }
    if (vnode.type === FRAGMENT) {
      var finst = { type: FRAGMENT, el: vnode, marker: document.createTextNode(''), children: [] };
      var fkids = normalizeChildren(vnode.props.children);
      finst.children = fkids.map(function (c) { return mount(c, isSvg); });
      return finst;
    }
    // host
    var svg = isSvg || vnode.type === 'svg';
    var node = createDomElement(vnode, svg);
    var hinst = { type: vnode.type, el: vnode, node: node, children: [], isSvg: svg };
    var kids = normalizeChildren(vnode.props.children);
    hinst.children = kids.map(function (c) { return mount(c, svg); });
    for (var i = 0; i < hinst.children.length; i++) {
      var ns = getNodes(hinst.children[i]);
      for (var j = 0; j < ns.length; j++) node.appendChild(ns[j]);
    }
    finalizeSelectValue(node);
    setRef(vnode.ref, node);
    return hinst;
  }

  function unmount(inst) {
    if (!inst) return;
    var kids = inst.children || [];
    for (var i = 0; i < kids.length; i++) unmount(kids[i]);
    if (typeof inst.type === 'function') {
      var hooks = inst.hooks || [];
      for (var h = 0; h < hooks.length; h++) {
        var hk = hooks[h];
        if (hk && typeof hk.cleanup === 'function') { try { hk.cleanup(); } catch (e) {} }
      }
    } else if (typeof inst.type === 'string') {
      if (inst.el && inst.el.ref) setRef(inst.el.ref, null);
    }
  }

  function patch(inst, vnode, isSvg) {
    // same type guaranteed by caller
    if (vnode.type === TEXT) {
      if (inst.node.nodeValue !== vnode.text) inst.node.nodeValue = vnode.text;
      inst.el = vnode;
      return inst;
    }
    if (typeof vnode.type === 'function') {
      var oldRef = inst.el.ref;
      inst.el = vnode;
      var rendered = renderComponent(inst);
      var list = normalizeChildren(rendered);
      var container = inst.marker.parentNode;
      inst.children = reconcileChildren(container, inst.children, list, inst.marker, isSvg);
      return inst;
    }
    if (vnode.type === FRAGMENT) {
      inst.el = vnode;
      var fcontainer = inst.marker.parentNode;
      var fkids = normalizeChildren(vnode.props.children);
      inst.children = reconcileChildren(fcontainer, inst.children, fkids, inst.marker, isSvg);
      return inst;
    }
    // host
    var svg = inst.isSvg;
    // ref change
    if (inst.el.ref !== vnode.ref) { setRef(inst.el.ref, null); setRef(vnode.ref, inst.node); }
    updateDomProps(inst.node, inst.el.props, vnode.props, svg);
    var kids = normalizeChildren(vnode.props.children);
    inst.children = reconcileChildren(inst.node, inst.children, kids, null, svg);
    finalizeSelectValue(inst.node);
    inst.el = vnode;
    return inst;
  }

  // Reconcile a list of child instances against new vnodes inside `container`,
  // keeping order; `anchor` is the DOM node that should follow the block (or null = end).
  function reconcileChildren(container, oldInstances, newVNodes, anchor, isSvg) {
    oldInstances = oldInstances || [];
    var oldByKey = {};
    var oldNoKey = [];
    var i;
    for (i = 0; i < oldInstances.length; i++) {
      var oi = oldInstances[i];
      var k = oi.el.key;
      if (k != null) oldByKey['$' + k] = oi; else oldNoKey.push(oi);
    }

    var newInstances = new Array(newVNodes.length);
    var used = [];
    var noKeyPtr = 0;

    for (i = 0; i < newVNodes.length; i++) {
      var el = newVNodes[i];
      var key = el.key;
      var match = null;
      if (key != null) {
        var cand = oldByKey['$' + key];
        if (cand && isSameType(cand, el)) { match = cand; oldByKey['$' + key] = null; }
      } else {
        while (noKeyPtr < oldNoKey.length) {
          var c = oldNoKey[noKeyPtr++];
          if (c && isSameType(c, el)) { match = c; break; }
        }
      }
      if (match) {
        used.push(match);
        newInstances[i] = patch(match, el, isSvg);
      } else {
        newInstances[i] = mount(el, isSvg);
      }
    }

    // remove unused old instances
    for (i = 0; i < oldInstances.length; i++) {
      var inst = oldInstances[i];
      if (used.indexOf(inst) === -1) {
        var nodes = getNodes(inst);
        for (var n = 0; n < nodes.length; n++) {
          if (nodes[n].parentNode === container) container.removeChild(nodes[n]);
        }
        unmount(inst);
      }
    }

    // order: walk from end to start, insert each instance's nodes before running anchor
    var cursor = anchor;
    for (i = newInstances.length - 1; i >= 0; i--) {
      var ns = getNodes(newInstances[i]);
      for (var m = ns.length - 1; m >= 0; m--) {
        var node = ns[m];
        if (node.nextSibling !== cursor || node.parentNode !== container) {
          container.insertBefore(node, cursor);
        }
        cursor = node;
      }
    }

    return newInstances;
  }

  // ---------- scheduling ----------
  var roots = [];
  var scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(flush);
  }
  function flush() {
    scheduled = false;
    for (var i = 0; i < roots.length; i++) {
      var r = roots[i];
      if (!r.instance) continue;
      // skip roots whose DOM was detached (defensive; the app uses a single root)
      var firstNode = getNodes(r.instance)[0];
      if (firstNode && firstNode.parentNode == null && r.container.childNodes.length === 0) continue;
      r.instance = patch(r.instance, createElement(r.el.type, r.el.props), false);
    }
    runEffects();
  }
  function runEffects() {
    var layout = layoutEffects.splice(0, layoutEffects.length);
    for (var i = 0; i < layout.length; i++) { try { layout[i](); } catch (e) { console.error(e); } }
    var eff = pendingEffects.splice(0, pendingEffects.length);
    for (var j = 0; j < eff.length; j++) { try { eff[j](); } catch (e) { console.error(e); } }
    // effects may have scheduled more updates -> handled by scheduler
  }

  // ---------- createRoot ----------
  function createRoot(container) {
    var root = { container: container, instance: null, el: null };
    roots.push(root);
    return {
      render: function (element) {
        root.el = element;
        root.instance = mount(element, false);
        var nodes = getNodes(root.instance);
        for (var i = 0; i < nodes.length; i++) container.appendChild(nodes[i]);
        runEffects();
      }
    };
  }

  // ---------- exports ----------
  var React = {
    createElement: createElement,
    Fragment: FRAGMENT,
    useState: useState,
    useEffect: useEffect,
    useLayoutEffect: useLayoutEffect,
    useMemo: useMemo,
    useCallback: useCallback,
    useRef: useRef
  };
  global.React = React;
  global.ReactDOM = { createRoot: createRoot };
  global.h = createElement;
})(typeof window !== 'undefined' ? window : this);
