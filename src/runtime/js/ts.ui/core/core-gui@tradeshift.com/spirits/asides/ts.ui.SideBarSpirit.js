/**
 * Spirit of the SideBar (formerly known as the "Drawer").
 * @see @deprecated {ts.ui.DrawerSpirit}
 * @extends {ts.ui.SideShowSpirit}
 * @using {gui.Combo.chained} chained
 * @using {gui.Client} Client
 * @using {gui.Object} GuiObject
 * @using {ts.ui.BACKGROUND_COLORS} Colors
 */
ts.ui.SideBarSpirit = (function using(chained, Client, GuiObject, Colors) {

	// consuming all actions from nested asides
	var willopen = ts.ui.ACTION_ASIDE_WILL_OPEN,
		didopen = ts.ui.ACTION_ASIDE_DID_OPEN,
		willclose = ts.ui.ACTION_ASIDE_WILL_CLOSE,
		didclose = ts.ui.ACTION_ASIDE_DID_CLOSE,
		doclose = ts.ui.ACTION_GLOBAL_ASIDES_DO_CLOSE;

	return ts.ui.SideShowSpirit.extend({

		/**
		 * Open by default.
		 * @type {boolean}
		 */
		isOpen: true,

		/**
		 * Automatically close the SideBar in mobile breakpoint?
		 * Note that the SideBar must then be *manually* opened.
		 * @type {boolean}
		 */
		autoclose: {
			getter: function() {
				return this._autoclose;
			},
			setter: function(autoclose) {
				this.css.shift(autoclose, 'ts-autoclose');
				this._autoclose = !!autoclose;
			}
		},

		/**
		 * Setup to consume actions from nested Asides.
		 */
		onconfigure: function() {
			this.super.onconfigure();
			this.action.add([
				willopen,
				didopen,
				willclose,
				didclose
			]);
		},

		/**
		 * Setup the stuff.
		 */
		onenter: function() {
			this.super.onenter();
			this._breakpointwatch();
			this.css.shift(this._autoclose, 'ts-autoclose');
			if(ts.ui.isMobilePoint()) {
				this._gomobile(true);
			} else {
				this._reflex();
			}
		},
		
		/**
		 * Add assistant classnames.
		 */
		onattach: function() {
			this.super.onattach();
			this.action.dispatch('ts-action-attach');
			this._layoutmain(true);
		},

		/**
		 * Remove assistant classnames.
		 */
		ondetach: function() {
			this.super.ondetach();
			this._layoutmain(false);
		},

		/**
		 * Give'm a second to move the SideBar into it's designated 
		 * position (immediately before or after the '.ts-main' element) 
		 * if for some reason the portal server didn't place it there.
		 */
		onready: function() {
			this.super.onready();
			this.input.connect(ts.ui.TopBarModel);
			this._inittabs();
			this.tick.time(function() {
				this._confirmposition();
			}, 1000);
		},

		/**
		 * Handle input. Watching that TopBar.
		 * @param {gui.Input} input
		 */
		oninput: function(i) {
			this.super.oninput(i);
			if(i.type === ts.ui.TopBarModel) {
				i.data.addObserver(this);
			}
		},

		/**
		 * Handle changes. Reflex the layout when TopBar toggles 
		 * and hope this fixes the height measurement in Safari. 
		 * UPDATE: It worked - now do this with a simple broadcast!!!!!!!!!!!!!!!!!!
		 * @param {Array<edb.Change>} changes
		 */
		onchange: function(changes) {
			this.super.onchange(changes);
			changes.forEach(function(change) {
				if(ts.ui.TopBarModel.is(change.object)) {
					if(change.name === 'hascontent') {
						this._reflex();
					}
				}
			}, this);
		},

		/**
		 * Consume all nested aside actions 
		 * so as not to trigger the cover.
		 * @param {gui.Action} a
		 */
		onaction: function(a) {
			this.super.onaction(a);
			switch(a.type) {
				case willopen:
					this._fitaside(a.target, this.dom.qall(
						'.ts-footer', ts.ui.FooterSpirit
					));
					a.consume();
					break;
				case didopen:
				case willclose:
				case didclose:
					a.consume();
					break;
			}
		},

		/**
		 * Cleanup (using a temporary API that should be refactored).
		 */
		ondestruct: function() {
			this.super.ondestruct();
			ts.ui.removeBreakPointListener(this);
		},


		// Private .................................................................

		/**
		 * Automatically close the SideBar in mobile breakpoint?
		 * @type {boolean}
		 */
		_autoclose: true,

		/**
		 * This classname has to do with flipping, it's a future project.
		 */
		_fixappearance: function() {
			this.super._fixappearance();
			var has3D = gui.Client.has3D;
			this.css.shift(has3D, 'ts-3d').shift(!has3D, 'ts-2d');
		},

		/**
		 * Add/remove classnames on the HTML element so we can style the MAIN.
		 * TODO: This should probably all be maintained somewhat more modelled...
		 * @param {boolean} attaching This is `false' when SideBar gets removed.
		 */
		_layoutmain: function(attaching) {
			var layout = this.guilayout;
			if(!this.dom.ancestor(ts.ui.SideBarSpirit)) {
				var root = ts.ui.get(document.documentElement),
					local1 = 'ts-sidebar-first',
					local2 = 'ts-sidebar-last',
					global1 = 'ts-has-sidebar',
					global2 = 'ts-has-sidebar-first',
					global3 = 'ts-has-sidebar-last';
				if(this.guilayout.beforeMain()) {
					this.css.shift(attaching, local1);
					layout.shiftGlobal(attaching, global2);
				} else if(this.guilayout.afterMain()) {
					this.css.shift(attaching, local2);
					layout.shiftGlobal(attaching, global3);
				}
			}
		},

		/**
		 * Watch for breakpoint changes (using some 
		 * temporary API that should be refactored).
		 */
		_breakpointwatch: function() {
			ts.ui.addBreakPointListener(function() {
				this._gomobile(ts.ui.isMobilePoint());
			}.bind(this));
		},

		/**
		 * Collapse the SideBar on mobile breakpoint. 
		 * Setup to avoid CSS transition on collapse.
		 * @param {boolean} go
		 */
		_gomobile: function(go) {
			if(this._autoclose) {
				this._closebutton(go);
				if(go) {
					this.close();
					this.isOpen = false;
				} else {
					this.isOpen = true;
					ts.ui.get('html').reflex();
					//this._reflex(); // TODO: perhaps this is enough?
				}
			}
		},

		/**
		 * Show the SideBar (now that it's hidden in mobile view).
		 */
		_open: function() {
			if(this.super._open()) {
				this.css.add('ts-will-open');
				this._reflex();
				this.tick.time(function slide() {
					this.css.add(ts.ui.CLASS_OPEN);
				});
			}
		},

		/**
		 * Don't show the SideBar.
		 */
		_close: function() {
			if(this.super._close()) {
				this.css.remove(ts.ui.CLASS_OPEN);
				this.tick.time(function undisplay() {
					this.css.remove('ts-will-open');
				}, ts.ui.TRANSITION_FAST);
			}
		},

		/**
		 * Fit nested aside inside the panel (footer scenario).
		 * @param {ts.ui.AsideSpirit} aside
		 * @param {Array<ts.ui.FooterSpirit>} footers List of bonus footers
		 */
		_fitaside: function(aside, footers) {
			if(footers.length) {
				aside.css.bottom = footers.reduce(function(totalheight, footer) {
					return totalheight + footer.box.height;
				}, 0);
			}
		},

		/**
		 * If more than one panel next to aside, generate the tabbar automaticly  
		 * TODO(leo@): Perhaps to watch the panels to add or delete panel in the tabbar
		 * TODO(jmo@): This can (probably) be moved to the {ts.ui.SideShowSpirit}
		 */
		_inittabs: function() {
			var panels = this.dom.qall('this > .ts-panel', ts.ui.PanelSpirit);
			if(panels.length < 2) {
				return;
			}
			var tabbar = ts.ui.TabBarSpirit.summon();
			var that = this;
			this.css.add('ts-has-panels');
			this.element.insertBefore(tabbar.element,panels[0].element);
			panels.forEach(function(panel) {
				tabbar.tabs().push({
					label: panel.label,
					onselect: function() {
						panels.forEach(function(p) {
							if(p === panel) {
								p.show();
							} else {
								p.hide();
							}
						});
						that._reflex();
					}
				});
			});
		}


	}, { // Xstatic ..............................................................
		
		/**
		 * List of members that should inherit any assigned background color. 
		 * In the SideBar, all members get the same color (unless explicitly 
		 * given a bg-color classname in the HTML).
		 * @type {Array<string>}
		 */
		$bgmembers: ['.ts-header', '.ts-panel', '.ts-footer']
		
	});

}(gui.Combo.chained, gui.Client, gui.Object, ts.ui.BACKGROUND_COLORS));
