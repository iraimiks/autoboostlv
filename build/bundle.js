
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\NavBar.svelte generated by Svelte v3.19.2 */

    const file = "src\\components\\NavBar.svelte";

    function create_fragment(ctx) {
    	let div7;
    	let div6;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div5;
    	let div2;
    	let i0;
    	let t1;
    	let div1;
    	let a0;
    	let t3;
    	let div4;
    	let i1;
    	let t4;
    	let div3;
    	let a1;
    	let t6;
    	let div9;
    	let div8;
    	let h1;
    	let t7;
    	let span;
    	let t9;
    	let p;
    	let t10;
    	let br;
    	let t11;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div5 = element("div");
    			div2 = element("div");
    			i0 = element("i");
    			t1 = space();
    			div1 = element("div");
    			a0 = element("a");
    			a0.textContent = "+371 27015660";
    			t3 = space();
    			div4 = element("div");
    			i1 = element("i");
    			t4 = space();
    			div3 = element("div");
    			a1 = element("a");
    			a1.textContent = "autoboostlv@gmail.com";
    			t6 = space();
    			div9 = element("div");
    			div8 = element("div");
    			h1 = element("h1");
    			t7 = text("AUTO\r\n      ");
    			span = element("span");
    			span.textContent = "BOOST";
    			t9 = space();
    			p = element("p");
    			t10 = text("Iegūsti sava auto\r\n      ");
    			br = element("br");
    			t11 = text("\r\n      maksimālo potenciālu.");
    			if (img.src !== (img_src_value = /*autoboostlogo*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1qzu584");
    			add_location(img, file, 103, 6, 1964);
    			attr_dev(div0, "class", "img-size svelte-1qzu584");
    			add_location(div0, file, 102, 4, 1934);
    			attr_dev(i0, "class", "fa fa-phone fa-1 svelte-1qzu584");
    			attr_dev(i0, "aria-hidden", "true");
    			add_location(i0, file, 107, 8, 2083);
    			attr_dev(a0, "href", "tel:+37127015660");
    			attr_dev(a0, "class", "svelte-1qzu584");
    			add_location(a0, file, 109, 10, 2180);
    			attr_dev(div1, "class", "main-element svelte-1qzu584");
    			add_location(div1, file, 108, 8, 2142);
    			attr_dev(div2, "class", "main-row-mob svelte-1qzu584");
    			add_location(div2, file, 106, 6, 2047);
    			attr_dev(i1, "class", "fa fa-envelope-o fa-1 svelte-1qzu584");
    			attr_dev(i1, "aria-hidden", "true");
    			add_location(i1, file, 113, 8, 2298);
    			attr_dev(a1, "href", "mailto:autoboostlv@gmail.com");
    			attr_dev(a1, "class", "svelte-1qzu584");
    			add_location(a1, file, 115, 10, 2400);
    			attr_dev(div3, "class", "main-element svelte-1qzu584");
    			add_location(div3, file, 114, 8, 2362);
    			attr_dev(div4, "class", "main-row-mob svelte-1qzu584");
    			add_location(div4, file, 112, 6, 2262);
    			attr_dev(div5, "class", "main-flex svelte-1qzu584");
    			add_location(div5, file, 105, 4, 2016);
    			attr_dev(div6, "class", "logo-main-flex svelte-1qzu584");
    			add_location(div6, file, 101, 2, 1900);
    			attr_dev(div7, "class", "main-container svelte-1qzu584");
    			add_location(div7, file, 100, 0, 1868);
    			set_style(span, "color", "#008cd1");
    			add_location(span, file, 125, 6, 2617);
    			attr_dev(h1, "class", "svelte-1qzu584");
    			add_location(h1, file, 123, 4, 2593);
    			add_location(br, file, 129, 6, 2712);
    			attr_dev(p, "class", "svelte-1qzu584");
    			add_location(p, file, 127, 4, 2676);
    			attr_dev(div8, "class", "main-text-intro svelte-1qzu584");
    			add_location(div8, file, 122, 2, 2558);
    			attr_dev(div9, "class", "main-container svelte-1qzu584");
    			add_location(div9, file, 121, 0, 2526);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			append_dev(div0, img);
    			append_dev(div6, t0);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, i0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, a0);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, i1);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, a1);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, h1);
    			append_dev(h1, t7);
    			append_dev(h1, span);
    			append_dev(div8, t9);
    			append_dev(div8, p);
    			append_dev(p, t10);
    			append_dev(p, br);
    			append_dev(p, t11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div9);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let autoboostlogo = "static/logoautoboost.png";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NavBar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NavBar", $$slots, []);
    	$$self.$capture_state = () => ({ autoboostlogo });

    	$$self.$inject_state = $$props => {
    		if ("autoboostlogo" in $$props) $$invalidate(0, autoboostlogo = $$props.autoboostlogo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [autoboostlogo];
    }

    class NavBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NavBar",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\components\FooterHer.svelte generated by Svelte v3.19.2 */

    const file$1 = "src\\components\\FooterHer.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*d*/ ctx[0].getFullYear() + "";
    	let t1;
    	let t2;
    	let br;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("© ");
    			t1 = text(t1_value);
    			t2 = text(" autoboost.lv\r\n  ");
    			br = element("br");
    			add_location(br, file$1, 18, 2, 321);
    			attr_dev(div, "class", "info-tx svelte-cxjudq");
    			add_location(div, file$1, 16, 0, 260);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, br);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let d = new Date();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FooterHer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FooterHer", $$slots, []);
    	$$self.$capture_state = () => ({ d });

    	$$self.$inject_state = $$props => {
    		if ("d" in $$props) $$invalidate(0, d = $$props.d);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [d];
    }

    class FooterHer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FooterHer",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\components\ImgCardRow.svelte generated by Svelte v3.19.2 */

    const file$2 = "src\\components\\ImgCardRow.svelte";

    function create_fragment$2(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let p0;
    	let t2;
    	let div1;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let p1;
    	let t5;
    	let div2;
    	let img2;
    	let img2_src_value;
    	let t6;
    	let p2;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			p0 = element("p");
    			p0.textContent = "EGR Atslēgšana";
    			t2 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "DPF Atslēgšana";
    			t5 = space();
    			div2 = element("div");
    			img2 = element("img");
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "Motora chip tunings";
    			if (img0.src !== (img0_src_value = /*egrimg*/ ctx[1])) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			attr_dev(img0, "class", "svelte-1h8vxf1");
    			add_location(img0, file$2, 48, 6, 974);
    			attr_dev(p0, "class", "svelte-1h8vxf1");
    			add_location(p0, file$2, 49, 6, 1009);
    			attr_dev(div0, "class", "col-33 svelte-1h8vxf1");
    			add_location(div0, file$2, 47, 4, 946);
    			if (img1.src !== (img1_src_value = /*dpfimg*/ ctx[0])) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "class", "svelte-1h8vxf1");
    			add_location(img1, file$2, 52, 6, 1076);
    			attr_dev(p1, "class", "svelte-1h8vxf1");
    			add_location(p1, file$2, 53, 6, 1111);
    			attr_dev(div1, "class", "col-33 svelte-1h8vxf1");
    			add_location(div1, file$2, 51, 4, 1048);
    			if (img2.src !== (img2_src_value = /*motorchipimg*/ ctx[2])) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			attr_dev(img2, "class", "svelte-1h8vxf1");
    			add_location(img2, file$2, 56, 6, 1178);
    			attr_dev(p2, "class", "svelte-1h8vxf1");
    			add_location(p2, file$2, 57, 6, 1219);
    			attr_dev(div2, "class", "col-33 svelte-1h8vxf1");
    			add_location(div2, file$2, 55, 4, 1150);
    			attr_dev(div3, "class", "imgcarrow-flex svelte-1h8vxf1");
    			add_location(div3, file$2, 46, 2, 912);
    			attr_dev(div4, "class", "imgcarrow-container svelte-1h8vxf1");
    			add_location(div4, file$2, 45, 0, 875);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t0);
    			append_dev(div0, p0);
    			append_dev(div3, t2);
    			append_dev(div3, div1);
    			append_dev(div1, img1);
    			append_dev(div1, t3);
    			append_dev(div1, p1);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, img2);
    			append_dev(div2, t6);
    			append_dev(div2, p2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let dpfimg = "static/imgrow/dpfatslegsana.jpg";
    	let egrimg = "static/imgrow/egrimg.jpg";
    	let motorchipimg = "static/imgrow/motorchip.jpg";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ImgCardRow> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ImgCardRow", $$slots, []);
    	$$self.$capture_state = () => ({ dpfimg, egrimg, motorchipimg });

    	$$self.$inject_state = $$props => {
    		if ("dpfimg" in $$props) $$invalidate(0, dpfimg = $$props.dpfimg);
    		if ("egrimg" in $$props) $$invalidate(1, egrimg = $$props.egrimg);
    		if ("motorchipimg" in $$props) $$invalidate(2, motorchipimg = $$props.motorchipimg);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [dpfimg, egrimg, motorchipimg];
    }

    class ImgCardRow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ImgCardRow",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\CardImg.svelte generated by Svelte v3.19.2 */

    const file$3 = "src\\components\\CardImg.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (37:12) {#each imgcard as item}
    function create_each_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*item*/ ctx[1].imgC)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-14g13a3");
    			add_location(img, file$3, 37, 16, 838);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(37:12) {#each imgcard as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let each_value = /*imgcard*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "cardimg-row svelte-14g13a3");
    			add_location(div0, file$3, 35, 8, 758);
    			attr_dev(div1, "class", "cardimg-head svelte-14g13a3");
    			add_location(div1, file$3, 34, 4, 722);
    			attr_dev(div2, "class", "cardimg-container svelte-14g13a3");
    			add_location(div2, file$3, 33, 0, 685);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imgcard*/ 1) {
    				each_value = /*imgcard*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let imgcard = [
    		{ imgC: "static/imgcard/dpfimg.png" },
    		{ imgC: "static/imgcard/transmiimg.png" },
    		{ imgC: "static/imgcard/engingborke.png" },
    		{
    			imgC: "static/imgcard/enginbrokegear.png"
    		}
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CardImg> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("CardImg", $$slots, []);
    	$$self.$capture_state = () => ({ imgcard });

    	$$self.$inject_state = $$props => {
    		if ("imgcard" in $$props) $$invalidate(0, imgcard = $$props.imgcard);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [imgcard];
    }

    class CardImg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CardImg",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\ContactInfo.svelte generated by Svelte v3.19.2 */

    const file$4 = "src\\components\\ContactInfo.svelte";

    function create_fragment$4(ctx) {
    	let div13;
    	let div1;
    	let p0;
    	let t1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t2;
    	let div12;
    	let div11;
    	let div2;
    	let i0;
    	let t4;
    	let h4;
    	let b;
    	let a0;
    	let t6;
    	let div5;
    	let i1;
    	let t7;
    	let div3;
    	let t9;
    	let i2;
    	let t10;
    	let div4;
    	let t12;
    	let div6;
    	let i3;
    	let t14;
    	let p1;
    	let a1;
    	let t16;
    	let div7;
    	let i4;
    	let t18;
    	let p2;
    	let t20;
    	let div8;
    	let p3;
    	let t22;
    	let div10;
    	let div9;
    	let a2;
    	let t23;
    	let script;
    	let script_src_value;

    	const block = {
    		c: function create() {
    			div13 = element("div");
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Auto diagnostika no 15 Eur bez PVN.";
    			t1 = space();
    			div0 = element("div");
    			img = element("img");
    			t2 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div2 = element("div");
    			i0 = element("i");
    			i0.textContent = "local_phone";
    			t4 = space();
    			h4 = element("h4");
    			b = element("b");
    			a0 = element("a");
    			a0.textContent = "+371 27015660";
    			t6 = space();
    			div5 = element("div");
    			i1 = element("i");
    			t7 = space();
    			div3 = element("div");
    			div3.textContent = "Whatsapp";
    			t9 = space();
    			i2 = element("i");
    			t10 = space();
    			div4 = element("div");
    			div4.textContent = "Telegram";
    			t12 = space();
    			div6 = element("div");
    			i3 = element("i");
    			i3.textContent = "contact_mail";
    			t14 = space();
    			p1 = element("p");
    			a1 = element("a");
    			a1.textContent = "autoboostlv@gmail.com";
    			t16 = space();
    			div7 = element("div");
    			i4 = element("i");
    			i4.textContent = "place";
    			t18 = space();
    			p2 = element("p");
    			p2.textContent = "Kārsavas 2, Ludzā";
    			t20 = space();
    			div8 = element("div");
    			p3 = element("p");
    			p3.textContent = "Tikai ar iepriekšēju pierakstu. Klikšķiniet, lai palaistu navigāciju\r\n          telefonā.";
    			t22 = space();
    			div10 = element("div");
    			div9 = element("div");
    			a2 = element("a");
    			t23 = space();
    			script = element("script");
    			attr_dev(p0, "class", "p-text-style svelte-1putdo");
    			add_location(p0, file$4, 70, 4, 1319);
    			if (img.src !== (img_src_value = /*imgsrc*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1putdo");
    			add_location(img, file$4, 72, 6, 1423);
    			attr_dev(div0, "class", "autodiag-card svelte-1putdo");
    			add_location(div0, file$4, 71, 4, 1388);
    			attr_dev(div1, "class", "autodiag-light-head svelte-1putdo");
    			add_location(div1, file$4, 69, 2, 1280);
    			attr_dev(i0, "class", "material-icons");
    			set_style(i0, "margin-right", "0.3em");
    			add_location(i0, file$4, 78, 8, 1578);
    			attr_dev(a0, "href", "tel:+37127015660");
    			attr_dev(a0, "class", "svelte-1putdo");
    			add_location(a0, file$4, 81, 12, 1690);
    			add_location(b, file$4, 80, 10, 1673);
    			add_location(h4, file$4, 79, 8, 1657);
    			attr_dev(div2, "class", "icon-container svelte-1putdo");
    			add_location(div2, file$4, 77, 6, 1540);
    			attr_dev(i1, "class", "fa fa-whatsapp");
    			attr_dev(i1, "aria-hidden", "true");
    			add_location(i1, file$4, 86, 8, 1848);
    			attr_dev(div3, "class", "mob-info");
    			set_style(div3, "padding-left", "0.5em");
    			set_style(div3, "padding-right", "0.5em");
    			add_location(div3, file$4, 87, 8, 1905);
    			attr_dev(i2, "class", "fa fa-telegram");
    			attr_dev(i2, "aria-hidden", "true");
    			add_location(i2, file$4, 92, 8, 2046);
    			attr_dev(div4, "class", "mob-info");
    			set_style(div4, "padding-left", "0.5em");
    			set_style(div4, "padding-right", "0.5em");
    			add_location(div4, file$4, 93, 8, 2103);
    			attr_dev(div5, "class", "icon-container svelte-1putdo");
    			set_style(div5, "padding-top", "0");
    			add_location(div5, file$4, 85, 6, 1787);
    			attr_dev(i3, "class", "material-icons");
    			set_style(i3, "margin-right", "0.3em");
    			add_location(i3, file$4, 100, 8, 2294);
    			attr_dev(a1, "href", "mailto:autoboostlv@gmail.com");
    			attr_dev(a1, "class", "svelte-1putdo");
    			add_location(a1, file$4, 101, 11, 2377);
    			add_location(p1, file$4, 101, 8, 2374);
    			attr_dev(div6, "class", "icon-container svelte-1putdo");
    			add_location(div6, file$4, 99, 6, 2256);
    			attr_dev(i4, "class", "material-icons");
    			set_style(i4, "margin-right", "0.3em");
    			add_location(i4, file$4, 104, 8, 2505);
    			add_location(p2, file$4, 105, 8, 2578);
    			attr_dev(div7, "class", "icon-container svelte-1putdo");
    			add_location(div7, file$4, 103, 6, 2467);
    			set_style(p3, "color", "#008cd1");
    			add_location(p3, file$4, 108, 8, 2662);
    			attr_dev(div8, "class", "icon-container svelte-1putdo");
    			add_location(div8, file$4, 107, 6, 2624);
    			attr_dev(a2, "href", "https://showtheway.io/to/56.545959,27.71432?name=Ludza");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "title", "");
    			attr_dev(a2, "class", "svelte-1putdo");
    			add_location(a2, file$4, 115, 10, 2900);
    			attr_dev(div9, "class", "showtheway");
    			add_location(div9, file$4, 114, 8, 2864);
    			if (script.src !== (script_src_value = "https://showtheway.io/w.js")) attr_dev(script, "src", script_src_value);
    			script.async = "async";
    			attr_dev(script, "type", "text/javascript");
    			add_location(script, file$4, 120, 8, 3057);
    			attr_dev(div10, "class", "icon-container svelte-1putdo");
    			add_location(div10, file$4, 113, 6, 2826);
    			attr_dev(div11, "class", "service-col svelte-1putdo");
    			add_location(div11, file$4, 76, 4, 1507);
    			attr_dev(div12, "class", "service-row svelte-1putdo");
    			add_location(div12, file$4, 75, 2, 1476);
    			attr_dev(div13, "class", "service-container svelte-1putdo");
    			attr_dev(div13, "id", "contactinfo");
    			add_location(div13, file$4, 68, 0, 1228);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div13, t2);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div2);
    			append_dev(div2, i0);
    			append_dev(div2, t4);
    			append_dev(div2, h4);
    			append_dev(h4, b);
    			append_dev(b, a0);
    			append_dev(div11, t6);
    			append_dev(div11, div5);
    			append_dev(div5, i1);
    			append_dev(div5, t7);
    			append_dev(div5, div3);
    			append_dev(div5, t9);
    			append_dev(div5, i2);
    			append_dev(div5, t10);
    			append_dev(div5, div4);
    			append_dev(div11, t12);
    			append_dev(div11, div6);
    			append_dev(div6, i3);
    			append_dev(div6, t14);
    			append_dev(div6, p1);
    			append_dev(p1, a1);
    			append_dev(div11, t16);
    			append_dev(div11, div7);
    			append_dev(div7, i4);
    			append_dev(div7, t18);
    			append_dev(div7, p2);
    			append_dev(div11, t20);
    			append_dev(div11, div8);
    			append_dev(div8, p3);
    			append_dev(div11, t22);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, a2);
    			append_dev(div10, t23);
    			append_dev(div10, script);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div13);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let imgsrc = "static/imgcard/iconfor.jpg";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ContactInfo> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ContactInfo", $$slots, []);
    	$$self.$capture_state = () => ({ imgsrc });

    	$$self.$inject_state = $$props => {
    		if ("imgsrc" in $$props) $$invalidate(0, imgsrc = $$props.imgsrc);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [imgsrc];
    }

    class ContactInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactInfo",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\MainInfo.svelte generated by Svelte v3.19.2 */

    const file$5 = "src\\components\\MainInfo.svelte";

    function create_fragment$5(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div2;
    	let div1;
    	let p0;
    	let t2;
    	let p1;
    	let t4;
    	let p2;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Mēs veicam ekoloģijas sistēmu atslēgšanu, piemēram, EGR, DPF,\r\n          AdBlue u.tml. sistēmu problēmu risināšanu, cena sākot no 160 Eur bez\r\n          PVN.";
    			t2 = space();
    			p1 = element("p");
    			p1.textContent = "Sniedzam dzinēja chiptuning pakalpojumus. Chiptuning ir viens no\r\n          efektīvākajiem veidiem, kā var palielināt automašīnas jaudu. Parasti\r\n          tiek sasniegts 15 - 35% jaudas pieaugums un apmēram 10% degvielas\r\n          patēriņa samazinājums. Piedāvājot standarta chiptuning atkarībā no\r\n          automašīnas nobraukuma un stāvokļa cenas par chiptuning sākot no \r\n          260 Eur bez PVN.";
    			t4 = space();
    			p2 = element("p");
    			p2.textContent = "Lai sasniegtu labāko iespējamo rezultātu, visus darbus veicam,\r\n          izmantojot oriģinālo MAGICMOTORSPORT aprīkojumu, kas garantē\r\n          darba kvalitāti. Neizmantojam Ķīnas klonus. Mūsu pakalpojumi ir\r\n          paredzēti prasīgiem klientiem kuri ciena savu automobili.";
    			if (img.src !== (img_src_value = /*flexbox*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1x711ln");
    			add_location(img, file$5, 58, 6, 1098);
    			attr_dev(div0, "class", "col-35 svelte-1x711ln");
    			add_location(div0, file$5, 57, 4, 1070);
    			attr_dev(p0, "class", "svelte-1x711ln");
    			add_location(p0, file$5, 62, 8, 1211);
    			set_style(p1, "padding-top", "1em");
    			attr_dev(p1, "class", "svelte-1x711ln");
    			add_location(p1, file$5, 67, 8, 1407);
    			set_style(p2, "padding-top", "1em");
    			attr_dev(p2, "class", "svelte-1x711ln");
    			add_location(p2, file$5, 75, 8, 1876);
    			attr_dev(div1, "class", "right-main-text svelte-1x711ln");
    			add_location(div1, file$5, 61, 6, 1172);
    			attr_dev(div2, "class", "col-65 svelte-1x711ln");
    			add_location(div2, file$5, 60, 4, 1144);
    			attr_dev(div3, "class", "maininfo-flex svelte-1x711ln");
    			add_location(div3, file$5, 56, 2, 1037);
    			attr_dev(div4, "class", "maininfo-container svelte-1x711ln");
    			add_location(div4, file$5, 55, 0, 1001);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, img);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t2);
    			append_dev(div1, p1);
    			append_dev(div1, t4);
    			append_dev(div1, p2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let motosportimg = "static/magicsportimg.png";
    	let flexbox = "static/flexbox.jpg";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MainInfo> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("MainInfo", $$slots, []);
    	$$self.$capture_state = () => ({ motosportimg, flexbox });

    	$$self.$inject_state = $$props => {
    		if ("motosportimg" in $$props) motosportimg = $$props.motosportimg;
    		if ("flexbox" in $$props) $$invalidate(0, flexbox = $$props.flexbox);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [flexbox];
    }

    class MainInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MainInfo",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\pages\Home.svelte generated by Svelte v3.19.2 */

    function create_fragment$6(ctx) {
    	let t0;
    	let t1;
    	let current;
    	const imgcardrow = new ImgCardRow({ $$inline: true });
    	const maininfo = new MainInfo({ $$inline: true });
    	const contactinfo = new ContactInfo({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(imgcardrow.$$.fragment);
    			t0 = space();
    			create_component(maininfo.$$.fragment);
    			t1 = space();
    			create_component(contactinfo.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(imgcardrow, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(maininfo, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(contactinfo, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(imgcardrow.$$.fragment, local);
    			transition_in(maininfo.$$.fragment, local);
    			transition_in(contactinfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(imgcardrow.$$.fragment, local);
    			transition_out(maininfo.$$.fragment, local);
    			transition_out(contactinfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(imgcardrow, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(maininfo, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(contactinfo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Home", $$slots, []);

    	$$self.$capture_state = () => ({
    		ImgCardRow,
    		CardImg,
    		ContactInfo,
    		MainInfo
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    const routes = {
        // Exact path
        '/': Home,
    };

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.19.2 */

    const { Error: Error_1, Object: Object_1 } = globals;

    // (185:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(185:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (183:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: { params: /*componentParams*/ ctx[1] },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*componentParams*/ 2) switch_instance_changes.params = /*componentParams*/ ctx[1];

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(183:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(route, userData, ...conditions) {
    	// Check if we don't have userData
    	if (userData && typeof userData == "function") {
    		conditions = conditions && conditions.length ? conditions : [];
    		conditions.unshift(userData);
    		userData = undefined;
    	}

    	// Parameter route and each item of conditions must be functions
    	if (!route || typeof route != "function") {
    		throw Error("Invalid parameter route");
    	}

    	if (conditions && conditions.length) {
    		for (let i = 0; i < conditions.length; i++) {
    			if (!conditions[i] || typeof conditions[i] != "function") {
    				throw Error("Invalid parameter conditions[" + i + "]");
    			}
    		}
    	}

    	// Returns an object that contains all the functions to execute too
    	const obj = { route, userData };

    	if (conditions && conditions.length) {
    		obj.conditions = conditions;
    	}

    	// The _sveltesparouter flag is to confirm the object was created by this router
    	Object.defineProperty(obj, "_sveltesparouter", { value: true });

    	return obj;
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(getLocation(), // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	setTimeout(
    		() => {
    			window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    		},
    		0
    	);
    }

    function pop() {
    	// Execute this code when the current call stack is complete
    	setTimeout(
    		() => {
    			window.history.back();
    		},
    		0
    	);
    }

    function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	setTimeout(
    		() => {
    			const dest = (location.charAt(0) == "#" ? "" : "#") + location;
    			history.replaceState(undefined, undefined, dest);

    			// The method above doesn't trigger the hashchange event, so let's do that manually
    			window.dispatchEvent(new Event("hashchange"));
    		},
    		0
    	);
    }

    function link(node) {
    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	// Destination must start with '/'
    	const href = node.getAttribute("href");

    	if (!href || href.length < 1 || href.charAt(0) != "/") {
    		throw Error("Invalid value for \"href\" attribute");
    	}

    	// Add # to every href attribute
    	node.setAttribute("href", "#" + href);
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $loc,
    		$$unsubscribe_loc = noop;

    	validate_store(loc, "loc");
    	component_subscribe($$self, loc, $$value => $$invalidate(4, $loc = $$value));
    	$$self.$$.on_destroy.push(() => $$unsubscribe_loc());
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent} component - Svelte component for the route
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.route;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    			} else {
    				this.component = component;
    				this.conditions = [];
    				this.userData = undefined;
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, remove it before we run the matching
    			if (prefix && path.startsWith(prefix)) {
    				path = path.substr(prefix.length) || "/";
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				out[this._keys[i]] = matches[++i] || null;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {SvelteComponent} component - Svelte component
     * @property {string} name - Name of the Svelte component
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {Object} [userData] - Custom data passed by the user
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {bool} Returns true if all the conditions succeeded
     */
    		checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	const dispatchNextTick = (name, detail) => {
    		// Execute this code when the current call stack is complete
    		setTimeout(
    			() => {
    				dispatch(name, detail);
    			},
    			0
    		);
    	};

    	const writable_props = ["routes", "prefix"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Router", $$slots, []);

    	$$self.$set = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		derived,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		push,
    		pop,
    		replace,
    		link,
    		createEventDispatcher,
    		regexparam,
    		routes,
    		prefix,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		dispatch,
    		dispatchNextTick,
    		$loc
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*component, $loc*/ 17) {
    			// Handle hash change events
    			// Listen to changes in the $loc store and update the page
    			 {
    				// Find a route matching the location
    				$$invalidate(0, component = null);

    				let i = 0;

    				while (!component && i < routesList.length) {
    					const match = routesList[i].match($loc.location);

    					if (match) {
    						const detail = {
    							component: routesList[i].component,
    							name: routesList[i].component.name,
    							location: $loc.location,
    							querystring: $loc.querystring,
    							userData: routesList[i].userData
    						};

    						// Check if the route can be loaded - if all conditions succeed
    						if (!routesList[i].checkConditions(detail)) {
    							// Trigger an event to notify the user
    							dispatchNextTick("conditionsFailed", detail);

    							break;
    						}

    						$$invalidate(0, component = routesList[i].component);

    						// Set componentParams onloy if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    						// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    						if (match && typeof match == "object" && Object.keys(match).length) {
    							$$invalidate(1, componentParams = match);
    						} else {
    							$$invalidate(1, componentParams = null);
    						}

    						dispatchNextTick("routeLoaded", detail);
    					}

    					i++;
    				}
    			}
    		}
    	};

    	return [component, componentParams, routes, prefix];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { routes: 2, prefix: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.19.2 */
    const file$6 = "src\\App.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let current;
    	const navbar = new NavBar({ $$inline: true });
    	const router = new Router({ props: { routes }, $$inline: true });
    	const footerher = new FooterHer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			create_component(router.$$.fragment);
    			t1 = space();
    			create_component(footerher.$$.fragment);
    			attr_dev(div, "class", "nav-all");
    			add_location(div, file$6, 11, 0, 222);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(navbar, div, null);
    			insert_dev(target, t0, anchor);
    			mount_component(router, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(footerher, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			transition_in(footerher.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			transition_out(footerher.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(navbar);
    			if (detaching) detach_dev(t0);
    			destroy_component(router, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(footerher, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ NavBar, FooterHer, routes, Router });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
