/*************************************************************
*                                                            *
*                Old Style Utility Meter Card                *
*                       by LuckyG3000                        *
*                           v1.4.0                           *
* https://github.com/LuckyG3000/old-style-utility-meter-card *
*           GNU GENERAL PUBLIC LICENSE version 3.0           *
*                                                            *
**************************************************************/

const MAX_COUNTERS = 9;

function loadCSS(url, id) {
	const link = document.createElement("link");
	link.id = id;
	link.type = "text/css";
	link.rel = "stylesheet";
	link.href = url;
	document.head.appendChild(link);
}

function unloadCSS(id) {
	//remove-styleSheet
	if (document.getElementById(id)) {
		var css = document.getElementById(id);
		css.parentNode.removeChild(css);
	}
}

function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}



class OldStyleUtilityMeterCard extends HTMLElement {

	// private properties

	_config;
	_hass;
	_elements = {};
	_isAttached = false;

	//Roller
	_rollers = [];            // array with per-counter roller info
	_rollerRaf = null;        // current requestAnimationFrame id

	// lifecycle
	constructor() {
		super();
		this.doStyle();
		this.doCard();
	}

	setConfig(config) {
		//this._config = config;
		
		this._config = {
			tap_action: {
				action: "more-info"
			},
			hold_action: {
				action: "more-info",
			},
			...config,
			};
		
		if (!this._isAttached) {
			this.doAttach();
			this.doQueryElements();
			this.doListen();
			this._isAttached = true;
		}
		this.doCheckConfig();
		this.doUpdateConfig();
	}
	
	set hass(hass) {
		this._hass = hass;
		this.doUpdateHass()
	}

	connectedCallback() {

	}

	onClicked() {
		const event = new CustomEvent("hass-action", {
			detail: {
				config: this._config,
				action: "tap",
			},
			bubbles: true,
			composed: true,
		});
		this.dispatchEvent(event);
	}
	
	
	onClicked1(target) {
		/* target:
		0 = power_entity
		1, 2, 3... = counter entities
		*/
		
		var entityId;

		if (target == 0) {
			entityId = this._config['power_entity'];
		} else if (target == 1) {
			entityId = this._config['entity'];
		} else {
			entityId = this._config['entity_' + (target)];
		}
		
		if (entityId === undefined || entityId === '') {
			return;
		}		
		const event = new Event("hass-more-info", {
			bubbles: true,
			composed: true,
		});

		event.detail = {
			entityId: entityId,
			view: 'info',
		};
		
		this.dispatchEvent(event);
	}

	
	getHeader() {
		return this._config.header;
	}

	getEntityID() {
		return this._config.entity;
	}

	getState() {
		return this._hass.states[this.getEntityID()];
	}

	getAttributes() {
		return this.getState().attributes
	}

	getName() {
		const friendlyName = this.getAttributes().friendly_name;
		return friendlyName ? friendlyName : this.getEntityID();
	}

	// The height of your card. Home Assistant uses this to automatically
	// distribute all cards over the available columns in masonry view
	getCardSize() {
		return 3;
	}

	// The rules for sizing your card in the grid in sections view
	getGridOptions() {
		return {
			rows: 3,
			columns: 12,
			min_rows: 1,
			//max_rows: 3,
		};
	}


	// jobs
	doCheckConfig() {
		if (!this._config.entity) {
			throw new Error('Please define an entity!');
		}
		
		if (!this._config.power_entity && (this._config.speed_control_mode == "Power" || this._config.speed_control_mode == "Realistic")) {
			throw new Error('Please define the Power entity for wheel speed control mode!');
		}
	}



	doStyle() {
		this._elements.style = document.createElement("style");
		this._elements.style.textContent = `
			:root {
				--marker-width: 80px;
			}
			
			.card-content {
				/*cursor: pointer;*/
			}

			.osumc-error {
				text-color: red;
			}
			.osumc-error--hidden {
				display: none;
			}

			.osumc-name {
				margin-bottom: 4px;
			}

			.osumc-counter-div {
				width: min-content;
				white-space: nowrap;
				margin: 0 auto 10px;
				cursor: pointer;
			}
			
					
			.osumc-integer-div {
				display: inline-block;
				vertical-align: middle;
				background-color: rgb(16, 16, 16);
				height: 39px;
				line-height: 39px;
				width: auto;
				white-space: nowrap;
				position: relative;
				font-size: 0;
				overflow: hidden;
			}

			.osumc-icon-div {
				display: inline-block;
				vertical-align: middle;
				height: 39px;
				line-height: 39px;
				width: 39px;
				text-align: center;
			}
			
			
			.osumc-digit-window {
				position: relative;
				width: 18px;
				height: 26px;
				top: 6px;
				margin-left: 10px;
				display: inline-block;
				color: white;
				border: 1px solid rgb(32,32,32);
				text-align: center;
				vertical-align: top;
				line-height: 24px;
				border-radius: 6px;
				box-shadow: -1px -1px 1px 0px rgba(255, 255, 255, 0.3) inset;
				background: rgb(8,8,8);
				color: linear-gradient(red, yellow, green);
				filter: blur(0.25px);
				overflow: hidden;
				z-index: 1;
			}

			.osumc-digit-text {
				background-image: linear-gradient(rgba(128,128,128,0.75), #aaa, rgba(128,128,128,0.75));
				color: transparent;
				background-clip: text;
				position: relative;
				width: 17px;
				height: 24px;
				display: block;
				line-height: 24px;
				text-align: center;
				/*font-family: Carlito, sans-serif;*/
				font-weight: 400;
				font-style: normal;
				font-size: 24px;
			}

			.osumc-red-bg {
				display: inline-block;
				position: relative;
				vertical-align: top;
				height: 39px;
				background-color: #F02000;
				line-height: 32px;
			}

			

			.osumc-grey-bg {
				display: inline-block;
				position: relative;
				vertical-align: top;
				height: 39px;
				background-color: #888;
				line-height: 39px;
				padding: 0px 6px;
				font-size: 18px;
				font-weight: bold;
				font-family: Carlito, sans-serif;
				border-top-right-radius: 3px;
				border-bottom-right-radius: 3px;
			}

			.osumc-decimal-point {
				position: absolute;
				top: -1px;
				display: inline-block;
				line-height: 39px;
				font-size: 36px;
				font-weight: bold;
				font-family: Carlito, sans-serif;
				z-index: 1;
			}
			
			.osumc-line_cont {
				position: absolute;
				top: 4px;
				width: min-content;
				z-index: 2;
			}

			.osumc-line_cont > .osumc-line {
				position: relative;
				display: block;
				width: 5px;
				height: 1px;
				left: 12px;
				border-top: 1px solid;
				top: 2px;
				margin-top: 1px;
			}

			.osumc-line_cont > :nth-child(1) {
				opacity: 0.15;
				width: 3px;
			}

			.osumc-line_cont > :nth-child(2) {
				opacity: 0.30;
				width: 4px;
			}

			.osumc-line_cont > :nth-child(3) {
				opacity: 0.45;
			}

			.osumc-line_cont > :nth-child(4) {
				opacity: 0.65;
			}

			.osumc-line_cont > :nth-child(5) {
				opacity: 0.8;
				width: 7px;
				left: 10px;
			}

			.osumc-line_cont > :nth-child(6) {
				opacity: 0.65;
			}
			
			.osumc-line_cont > :nth-child(7) {
				opacity: 0.45;
			}
			
			.osumc-line_cont > :nth-child(8) {
				opacity: 0.3;
				width: 4px;
			}
			
			.osumc-line_cont > :nth-child(9) {
				opacity: 0.15;
				width: 3px;
			}
			
			
			.osumc-wheel-window {
				width: 90%;
				height: 21px;
				margin: 16px auto 0;
				text-align: center;
				display: block;
				font-size: 0;
				white-space: nowrap;
				cursor: pointer;
			}

			.osumc-wheel-window-border {
				display: inline-block;
				width: 90%;
				height: 11px;
				position: relative;
				top: -13px;
				background-color: #000;
			}

			.osumc-wheel-window-left,
			.osumc-wheel-window-right {
				display: inline-block;
				width: 5%;
				height: 100%;
				position: relative;
				z-index: 1;
			}

			.osumc-wheel-window-left {
				text-align: right;
			}

			.osumc-wheel-window-left-border,
			.osumc-wheel-window-right-border {
				display: block;
				position: relative;
				height: 11px;
				background-color: #000;
				width: 3px;
				top: 5px;
			}

			.osumc-wheel-window-left-border {
				border-start-start-radius: 2px;
				border-end-start-radius: 2px;
				right: 0;
				margin-right: 0;
				margin-left: auto;
			}

			.osumc-wheel-window-right-border {
				border-start-end-radius: 2px;
				border-end-end-radius: 2px;
			}

			.osumc-wheel {
				height: 3px;
				background-image: linear-gradient(to right, #111 -5%, #aaa 50%, #111 105%);
				width: 100%;
				display: inline-block;
				position: relative;
				top: 4px;
				overflow: clip;
			}

			.osumc-wheel-marker {
				background-color: #000;
				width: var(--marker-width);
				margin-left: calc(var(--marker-width) * -0.5);
				height: 100%;
				position: relative;
				left: 50px;
				
				animation-name: osumc-wheel-animation;
				animation-duration: 2s;
				animation-iteration-count: infinite;
				animation-timing-function: linear;
			}
			
			.osumc-digit-roller {
			  position: relative;
			  display: block;
			  height: 24px;
			  overflow: hidden;
			}
			.osumc-digit-roller-inner {
			  position: absolute;
			  left: 0;
			  right: 0;
			  top: 0;
			  transition: transform 0.1s linear;
			  will-change: transform;
			}
			.osumc-digit-roller-item {
			  display: block;
			  height: 24px;
			  line-height: 24px;
			  text-align: center;
			}
			
			@keyframes osumc-wheel-animation {
				0% {left: -2%; width: calc(var(--marker-width) * (10/30)); margin-left: calc(var(--marker-width) * (-5/30)); opacity: 0.6;}
				7% {left: 7%; width: calc(var(--marker-width) * (22/30)); margin-left: calc(var(--marker-width) * (-10/30)); opacity: 0.8;}
				13% {left: 20%; width: calc(var(--marker-width) * (27/30)); margin-left: calc(var(--marker-width) * (-13/30));}
				19% {left: 36%; width: calc(var(--marker-width) * (29/30)); margin-left: calc(var(--marker-width) * (-14/30));}
				25% {left: 50%; width: var(--marker-width); margin-left: calc(var(--marker-width) * (-15/30)); opacity: 1}
				31% {left: 64%; width: calc(var(--marker-width) * (29/30)); margin-left: calc(var(--marker-width) * (-14/30));}
				37% {left: 80%; width: calc(var(--marker-width) * (27/30)); margin-left: calc(var(--marker-width) * (-13/30));}
				43% {left: 93%; width: calc(var(--marker-width) * (22/30)); margin-left: calc(var(--marker-width) * (-11/30)); opacity: 0.8;}
				50% {left: 102%; width: calc(var(--marker-width) * (12/30)); margin-left: calc(var(--marker-width) * (-6/30)); opacity: 0.6;}
				51% {opacity: 0;}
				100% {opacity: 0;}
			}
			
			@keyframes osumc-wheel-animation-reverse {
				0% {left: 102%; width: calc(var(--marker-width) * (12/30)); margin-left: calc(var(--marker-width) * (-6/30)); opacity: 0.6;}
				7% {left: 93%; width: calc(var(--marker-width) * (22/30)); margin-left: calc(var(--marker-width) * (-11/30)); opacity: 0.8;}
				13% {left: 80%; width: calc(var(--marker-width) * (27/30)); margin-left: calc(var(--marker-width) * (-13/30));}
				19% {left: 64%; width: calc(var(--marker-width) * (29/30)); margin-left: calc(var(--marker-width) * (-14/30));}
				25% {left: 50%; width: var(--marker-width); margin-left: calc(var(--marker-width) * (-15/30)); opacity: 1}
				31% {left: 36%; width: calc(var(--marker-width) * (29/30)); margin-left: calc(var(--marker-width) * (-14/30));}
				37% {left: 20%; width: calc(var(--marker-width) * (27/30)); margin-left: calc(var(--marker-width) * (-13/30));}
				43% {left: 7%; width: calc(var(--marker-width) * (22/30)); margin-left: calc(var(--marker-width) * (-10/30)); opacity: 0.8;}
				50% {left: -2%; width: calc(var(--marker-width) * (10/30)); margin-left: calc(var(--marker-width) * (-5/30)); opacity: 0.6;}
				51% {opacity: 0;}
				100% {opacity: 0;}
			}
			

			#osumc-last-update {
				display: none;
			}
		`;
	}

	doCard() {
		this._elements.card = document.createElement("ha-card");
		var html_content = `
			<div class="card-content">
				<p class="osumc-error osumc-error--hidden">
				<br><br>
				`;
				
				//create counters
			for (var i = 0; i < MAX_COUNTERS; i++) {
				html_content += `
				<div class="osumc-name" id="osumc-` + i + `"></div>
				<div class="osumc-counter-div" id="osumc-` + i + `">
					<div class="osumc-icon-div">
						<ha-icon icon="mdi:flash" class="osumc-icon"></ha-icon>
					</div><div class="osumc-integer-div">
						`;
				for (var d = 0; d < 15; d++) {
					html_content += `<span class="osumc-digit-window">
							<span class="osumc-digit-text" id="osumc-digit-` + d + `">0</span>
						</span>`;
				}
				html_content += `
						<div class="osumc-decimal-point"></div>
						<div class="osumc-line_cont">
							<div class="osumc-line"></div>
							<div class="osumc-line"></div>
							<div class="osumc-line"></div>
							<div class="osumc-line"></div>
							<div class="osumc-line"></div>
							<div class="osumc-line"></div>
							<div class="osumc-line"></div>
							<div class="osumc-line"></div>
						</div>
					</div><div class="osumc-red-bg"></div><div class="osumc-grey-bg"></div>
				</div>
				`;
			}
			
		html_content += `
			<div class="osumc-wheel-window">
				<div class="osumc-wheel-window-left">
					<div class="osumc-wheel-window-left-border"></div>
				</div><div class="osumc-wheel-window-border">
					<div class="osumc-wheel">
						<div class="osumc-wheel-marker"></div>
					</div>
				</div><div class="osumc-wheel-window-right">
					<div class="osumc-wheel-window-right-border"></div>
				</div>
			</div>
			<div id="osumc-last-update"></div>
		</div>
		`;
		
		this._elements.card.innerHTML = html_content;
	}

	doAttach() {
		this.append(this._elements.style, this._elements.card);
	}

	doQueryElements() {
		const card = this._elements.card;
		this._elements.error = card.querySelector(".osumc-error")

		this._elements.card_content = card.querySelector(".card-content")
	
		this._elements.name = card.querySelectorAll(".osumc-name");
		this._elements.counter_div = card.querySelectorAll(".osumc-counter-div");
		this._elements.integer_div = card.querySelectorAll(".osumc-integer-div");

		this._elements.redbg = card.querySelectorAll(".osumc-red-bg");
		this._elements.greybg = card.querySelectorAll(".osumc-grey-bg");
		this._elements.dp = card.querySelectorAll(".osumc-decimal-point");
		this._elements.icon_div = card.querySelectorAll(".osumc-icon-div");
		this._elements.icon = card.querySelectorAll(".osumc-icon");
		this._elements.markings = card.querySelectorAll(".osumc-line_cont");
		
		this._elements.digit_window = card.querySelectorAll(".osumc-digit-window");
		this._elements.digit = card.querySelectorAll(".osumc-digit-text");
		

		this._elements.wheel_window = card.querySelector(".osumc-wheel-window");
		this._elements.wheel = card.querySelector(".osumc-wheel");
		this._elements.wheel_marker = card.querySelector(".osumc-wheel-marker");

		this._elements.lu = card.querySelector("#osumc-last-update");
	}

	doListen() {
		//this._elements.card_content.addEventListener("click", this.onClicked.bind(this), false);
		for (var d = 0; d < MAX_COUNTERS; d++) {
			this._elements.counter_div[d].addEventListener("click", this.onClicked1.bind(this, d+1), false);
		}
		this._elements.wheel_window.addEventListener("click", this.onClicked1.bind(this, 0), false);
	}

	_startRollAnimation() {
	  if (this._rollerRaf) return;
	  const loop = (ts) => {
		this._updateRollers();
		this._rollerRaf = requestAnimationFrame(loop);
	  };
	  this._rollerRaf = requestAnimationFrame(loop);
	}
	
	_stopRollAnimation() {
	  if (this._rollerRaf) {
		cancelAnimationFrame(this._rollerRaf);
		this._rollerRaf = null;
	  }
	}
	
	_update_rollers_single(i) {
	  const r = this._rollers[i];
	  if (!r) return;
	  const suffix = (i > 0) ? '_' + (i + 1) : '';
	  const entityId = this._config['entity' + suffix];
	  if (!entityId) return;
	  const stateObj = this._hass.states[entityId];
	  if (!stateObj) return;
	  const baseVal = parseFloat(stateObj.state) || 0;
	  const lastUpdated = new Date(stateObj.last_updated).getTime() / 1000;
	  let powerVal = 0;
	  if (this._config.power_entity && this._hass.states[this._config.power_entity]) {
		powerVal = parseFloat(this._hass.states[this._config.power_entity].state) || 0;
		const pUnit = (this._hass.states[this._config.power_entity].attributes || {}).unit_of_measurement || '';
		if (String(pUnit).toLowerCase().includes('kw')) {
		  powerVal = powerVal * 1000;
		}
	  }
	  const nowS = Date.now() / 1000;
	  const deltaS = Math.max(0, nowS - lastUpdated);
	  const estVal = baseVal + (powerVal * deltaS) / 3600000;
	  const digits_right = Number(this._config['decimal_digit_number' + suffix] || 0);
	  const factor = Math.pow(10, digits_right);
	  const scaled = estVal * factor;
	  let digitIndex = Math.floor(Math.abs(scaled)) % 10;
	  let frac = Math.abs(scaled) - Math.floor(Math.abs(scaled));
	  const direction = (powerVal >= 0) ? 1 : -1;
	  const itemH = r.itemHeight || 24;
	  const pos = (direction >= 0) ? (digitIndex + frac) : (digitIndex - frac);
	  const clamped = ((pos % 10) + 10) % 10;
	  const translateY = -clamped * itemH;
	  r.inner.style.transform = `translateY(${translateY}px)`;
	}

	_updateRollers() {
	  // For this POC only update roller for the first (main) counter (index 0)
	  if (this._rollers[0]) {
		this._update_rollers_single(0);
	  }
	}
	
	doUpdateConfig() {
		if (this.getHeader()) {
			this._elements.card.setAttribute("header", this.getHeader());
		} else {
			this._elements.card.removeAttribute("header");
		}
	}




	doUpdateHass() {
		if (!this.getState() || this._config.entity === '' || this._config.entity === undefined || typeof this._config.entity !== "string") {
			this._elements.error.textContent = `${this.getEntityID()} is unavailable.`;
			this._elements.error.classList.remove("osumc-error--hidden");
		} else if ((this._config.power_entity == '' || typeof this._config.power_entity !== "string") && (this._config.speed_control_mode == 'Power' || this._config.speed_control_mode == 'Realistic')) {
			this._elements.error.textContent = `Power entity is unavailable.`;
			this._elements.error.classList.remove("osumc-error--hidden");
		} else {
			this._elements.error.textContent = "";
			
			//load / unload webfont
			if (this._config.font == undefined) {
				unloadCSS("osumc-webfont");
			} else {
				if (this._config.font == 'Carlito') {
					loadCSS("https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400&display=swap", "osumc-webfont");
				} else {
					unloadCSS("osumc-webfont");
				}
			}
			
			if (this._config.plate_color != undefined && this._config.plate_color != '') {
				this._elements.card_content.style.backgroundColor = this._config.plate_color;
			}

			for (var i = 0; i < MAX_COUNTERS; i++) {
				//var cntr_val = parseFloat(this.getState().state);
				
				var suffix = '';
				if (i > 0) {
					suffix = '_' + (i + 1);
				}
				
				if (this._config['entity' + suffix] == undefined || this._config['entity' + suffix] == '') {
					this._elements.counter_div[i].style.display = "none";
				} else {
				
					var cntr_val = parseFloat(this._hass.states[this._config['entity' + suffix]].state);
					
					if (isNumeric(this._config['offset' + suffix])) {
						cntr_val += parseFloat(this._config['offset' + suffix]);
					}
					
					var l_str;
					var r_str;
					if (String(cntr_val).indexOf(".") > 0) {
						l_str = String(cntr_val).split(".")[0];
						r_str = String(cntr_val).split(".")[1];
					} else {
						l_str = String(cntr_val);
						r_str = "0";
					}
					
					var digits_left;
					var digits_right;
					
					if (this._config['whole_digit_number' + suffix] === undefined || this._config['whole_digit_number' + suffix] === '') {
						digits_left = 99;
					} else {
						digits_left = this._config['whole_digit_number' + suffix];
					}
					if (this._config['decimal_digit_number' + suffix] === undefined || this._config['decimal_digit_number' + suffix] === '') {
						digits_right = 99;
					} else {
						digits_right = this._config['decimal_digit_number' + suffix];
					}
					
					if (digits_left == 99) {	//auto
						digits_left = l_str.length;
						if (digits_left > 10) {digits_left = 10;}
					}

					if (digits_right == 99) {	//auto
						digits_right = r_str.length;
						if (digits_right > 5) {
							digits_right = 5;
							r_str = r_str.slice(0, 5);
						}
					}

					var total_digits = digits_left + digits_right;
					
					if (total_digits > 0) {
						this._elements.integer_div[i].style.display = "inline-block";
					} else {
						this._elements.integer_div[i].style.display = "none";
					}
					
					l_str = l_str.padStart(digits_left, '0');	//add leading zeros
					l_str = l_str.slice(-digits_left);