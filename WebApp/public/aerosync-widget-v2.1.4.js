(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.aerosync = {}));
})(this, (function (exports) { 'use strict';

    exports.AerosyncEnvironment = void 0;
    (function (AerosyncEnvironment) {
        AerosyncEnvironment["Qa"] = "qa";
        AerosyncEnvironment["Staging"] = "staging";
        AerosyncEnvironment["Sandbox"] = "sandbox";
        AerosyncEnvironment["Production"] = "production";
    })(exports.AerosyncEnvironment || (exports.AerosyncEnvironment = {}));
    const AerosyncUrl = {
        qa: "http://192.168.5.108:5173",
        staging: "https://staging-sync.aero.inc",
        sandbox: "https://sandbox.aerosync.com",
        production: "https://sync.aero.inc",
    };

    const AEROSYNC_WIDGET_CONTAINER_ID = "aerosync-widget-container";
    const AEROSYNC_WIDGET_IFRAME_ID = "aerosync-widget";
    const AEROSYNC_EMBEDDED_IFRAME_ID = "aerosync-embedded";
    const AEROSYNC_VERSION = '2.0.0';

    exports.WidgetMessageEventType = void 0;
    (function (WidgetMessageEventType) {
        WidgetMessageEventType["ONERROR"] = "widgetError";
        WidgetMessageEventType["ONEVENT"] = "widgetPageLoaded";
        WidgetMessageEventType["ONSUCCESS"] = "pageSuccess";
        WidgetMessageEventType["ONCLOSE"] = "widgetClose";
        WidgetMessageEventType["ONBANKCLICK"] = "widgetBankClick";
    })(exports.WidgetMessageEventType || (exports.WidgetMessageEventType = {}));

    class AerosyncWidget {
        constructor(widgetConfigs) {
            var _a, _b, _c, _d, _e;
            this.hasMessageListener = false;
            this.popupWindow = null;
            this.widgetConfigs = widgetConfigs;
            this.widgetConfigs = Object.assign(Object.assign({}, widgetConfigs), { onLoad: (_a = widgetConfigs.onLoad) !== null && _a !== void 0 ? _a : (() => { }), onClose: (_b = widgetConfigs.onClose) !== null && _b !== void 0 ? _b : (() => { }), onSuccess: (_c = widgetConfigs.onSuccess) !== null && _c !== void 0 ? _c : (() => { }), onEvent: (_d = widgetConfigs.onEvent) !== null && _d !== void 0 ? _d : (() => { }), onError: (_e = widgetConfigs.onError) !== null && _e !== void 0 ? _e : (() => { }) });
            this.addWindowEventListener();
            this.setWidgetBaseURL();
            this.showEmbeddedBanks();
        }
        setWidgetBaseURL() {
            this.widgetBaseURL = AerosyncUrl[this.widgetConfigs.environment] || AerosyncUrl.production;
        }
        addWindowEventListener() {
            if (!this.hasMessageListener) {
                window.addEventListener('message', this.handlePostMessage);
                this.hasMessageListener = true;
            }
        }
        removeWindowEventListener() {
            if (this.hasMessageListener) {
                window.removeEventListener('message', this.handlePostMessage);
                this.hasMessageListener = false;
            }
        }
        constructUrl(baseUrl, queryParams) {
            const url = new URL(baseUrl);
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(queryParams)) {
                if (value) {
                    searchParams.append(key, String(value));
                }
            }
            url.search = searchParams.toString();
            return url.toString();
        }
        launch() {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const widgetQueryParams = {
                token: this.widgetConfigs.token,
                configurationId: this.widgetConfigs.configurationId,
                deeplink: this.widgetConfigs.deeplink,
                handleOAuthManually: this.widgetConfigs.handleOAuthManually,
                manualLinkOnly: this.widgetConfigs.manualLinkOnly,
                aeroPassUserUuid: this.widgetConfigs.aeroPassUserUuid,
                handleMFA: this.widgetConfigs.handleMFA,
                jobId: this.widgetConfigs.jobId,
                connectionId: this.widgetConfigs.connectionId,
                widgetLaunchType: this.widgetConfigs.widgetLaunchType,
                domain: this.widgetConfigs.domain,
                stateCode: this.widgetStateCode,
                defaultTheme: (_a = this.widgetConfigs.theme) !== null && _a !== void 0 ? _a : 'light',
                version: AEROSYNC_VERSION,
            };
            const widgetURL = this.constructUrl(this.widgetBaseURL, widgetQueryParams);
            // handle widget launch type
            if (((_b = this.widgetConfigs) === null || _b === void 0 ? void 0 : _b.widgetLaunchType) === 'systemBrowser') {
                const features = 'width=315,height=635,top=100,left=100,resizable=yes,scrollbars=yes';
                try {
                    window.AerosyncWidget.popupWindow = window.open(widgetURL, '_blank', features);
                    if (!window.AerosyncWidget.popupWindow) {
                        console.warn('Popup was likely blocked by the browser.');
                    }
                    // Start polling the popup's closed state every 500ms
                    const checkInterval = 500; // milliseconds
                    const intervalId = setInterval(() => {
                        var _a;
                        if ((_a = window.AerosyncWidget.popupWindow) === null || _a === void 0 ? void 0 : _a.closed) {
                            clearInterval(intervalId);
                            this.widgetConfigs.onClose();
                        }
                    }, checkInterval);
                }
                catch (error) {
                    console.error('Failed to open system browser window:', error);
                }
                return;
            }
            let bg = ((_d = (_c = this.widgetConfigs) === null || _c === void 0 ? void 0 : _c.style) === null || _d === void 0 ? void 0 : _d.bgColor) && ((_f = (_e = this.widgetConfigs) === null || _e === void 0 ? void 0 : _e.style) === null || _f === void 0 ? void 0 : _f.opacity)
                ? this.widgetConfigs.style.bgColor + Math.floor(this.widgetConfigs.style.opacity * 255).toString(16)
                : '#000000b2';
            let widgetBox = document.createElement('div');
            this.targetDocument = this.widgetConfigs.targetDocument || document;
            widgetBox.setAttribute('id', AEROSYNC_WIDGET_CONTAINER_ID);
            this.targetElement = this.targetDocument.getElementById(this.widgetConfigs.elementId);
            this.targetElement.innerHTML = '';
            this.targetElement.appendChild(widgetBox);
            const iframeProps = {
                elementId: AEROSYNC_WIDGET_IFRAME_ID,
                width: ((_h = (_g = this.widgetConfigs) === null || _g === void 0 ? void 0 : _g.style) === null || _h === void 0 ? void 0 : _h.width) ? this.widgetConfigs.style.width : '375px',
                height: ((_k = (_j = this.widgetConfigs) === null || _j === void 0 ? void 0 : _j.style) === null || _k === void 0 ? void 0 : _k.height) ? this.widgetConfigs.style.height : '688px',
                source: widgetURL,
            };
            let iframeElement = this.setIframeWindow(iframeProps);
            iframeElement.setAttribute('width', iframeProps.width);
            iframeElement.setAttribute('height', iframeProps.height);
            let widgetBoxElement = this.targetDocument.getElementById(AEROSYNC_WIDGET_CONTAINER_ID);
            widgetBoxElement.style.display = 'flex';
            widgetBoxElement.style.position = 'fixed';
            widgetBoxElement.style.width = '100%';
            widgetBoxElement.style.left = '0';
            widgetBoxElement.style.top = '0';
            widgetBoxElement.style.backgroundColor = bg;
            widgetBoxElement.style.zIndex = this.widgetConfigs.zIndex || '1';
            widgetBoxElement.style.height = '100%';
            widgetBoxElement.style.justifyContent = 'center';
            widgetBoxElement.style.alignItems = 'center';
            if (window.matchMedia('(max-height: 700px)').matches) {
                iframeElement.setAttribute('height', '95%');
            }
            widgetBoxElement.innerHTML = '';
            widgetBoxElement.appendChild(iframeElement);
        }
        setIframeWindow(props) {
            var _a;
            let iframe = document.createElement('iframe');
            iframe.setAttribute('id', props.elementId);
            iframe.setAttribute('border', '0');
            iframe.setAttribute('frame', '0');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allowTransparency', 'true');
            iframe.setAttribute('src', props.source);
            iframe.setAttribute('marginheight', '0');
            iframe.setAttribute('marginwidth', '0');
            iframe.setAttribute('allow', 'publickey-credentials-get *; publickey-credentials-create *');
            iframe.style.backgroundColor = (((_a = this.widgetConfigs) === null || _a === void 0 ? void 0 : _a.theme) === 'dark')
                ? 'hsl(240, 25%, 5.9%)'
                : 'hsl(0, 0%, 100%)';
            iframe.onload = () => {
                var _a, _b, _c;
                (_c = (_b = (_a = this.widgetConfigs) === null || _a === void 0 ? void 0 : _a.embeddedBankView) === null || _b === void 0 ? void 0 : _b.onEmbedded()) !== null && _c !== void 0 ? _c : this.widgetConfigs.onLoad();
            };
            iframe.setAttribute('title', this.widgetConfigs.iframeTitle);
            return iframe;
        }
        showEmbeddedBanks() {
            var _a, _b, _c, _d, _e, _f;
            if ((_b = (_a = this.widgetConfigs) === null || _a === void 0 ? void 0 : _a.embeddedBankView) === null || _b === void 0 ? void 0 : _b.elementId) {
                const widgetQueryParams = {
                    token: this.widgetConfigs.token,
                    defaultTheme: this.widgetConfigs.theme,
                };
                // container
                let iframeContainerElement = document.createElement('div');
                iframeContainerElement.style.position = 'relative';
                iframeContainerElement.style.width = '100%';
                iframeContainerElement.style.overflow = 'hidden';
                iframeContainerElement.style.height = '100%';
                // iframe
                const widgetURL = this.constructUrl(`${this.widgetBaseURL}/embedded-view`, widgetQueryParams);
                const iframeProps = {
                    elementId: AEROSYNC_EMBEDDED_IFRAME_ID,
                    width: ((_d = (_c = this.widgetConfigs) === null || _c === void 0 ? void 0 : _c.embeddedBankView) === null || _d === void 0 ? void 0 : _d.width) || '100%',
                    height: ((_f = (_e = this.widgetConfigs) === null || _e === void 0 ? void 0 : _e.embeddedBankView) === null || _f === void 0 ? void 0 : _f.height) || '100%',
                    source: widgetURL,
                };
                this.embeddedIframeElement = this.setIframeWindow(iframeProps);
                this.embeddedIframeElement.setAttribute('scrolling', 'no');
                this.embeddedIframeElement.style.overflow = 'hidden';
                this.embeddedIframeElement.style.width = iframeProps.width;
                this.embeddedIframeElement.style.height = iframeProps.height;
                this.embeddedIframeElement.style.position = 'absolute';
                this.embeddedIframeElement.style.top = '0px';
                this.embeddedIframeElement.style.left = '0px';
                this.embeddedIframeElement.style.bottom = '0px';
                this.embeddedIframeElement.style.right = '0px';
                this.targetDocument = this.widgetConfigs.targetDocument || document;
                const embeddedElement = this.targetDocument.getElementById(this.widgetConfigs.embeddedBankView.elementId);
                embeddedElement.innerHTML = '';
                embeddedElement.appendChild(iframeContainerElement);
                iframeContainerElement.appendChild(this.embeddedIframeElement);
            }
        }
        destroy() {
            this.removeWindowEventListener();
        }
        toggleTheme(value) {
            const message = {
                type: 'embeddedView',
                payload: { name: 'onToggleTheme', theme: value },
            };
            this.sendPostMessage(AEROSYNC_EMBEDDED_IFRAME_ID, message);
            this.widgetConfigs.theme = value;
        }
        removeElements() {
            if (this.widgetConfigs.widgetLaunchType === 'systemBrowser') {
                return;
            }
            const removeElement = (selector) => {
                const element = this.targetDocument.querySelector(selector);
                if (element) {
                    element.remove();
                }
            };
            removeElement(`#${AEROSYNC_WIDGET_IFRAME_ID}`);
            removeElement(`#${AEROSYNC_WIDGET_CONTAINER_ID}`);
        }
        removePopWindow() {
            var _a;
            // close the popup window
            try {
                const popup = (_a = window.AerosyncWidget) === null || _a === void 0 ? void 0 : _a.popupWindow;
                if (popup && !popup.closed) {
                    popup.close();
                }
                else {
                    console.warn('Popup window reference missing or already closed.');
                }
            }
            catch (err) {
                console.warn('Error closing popup window:', err);
            }
        }
        exit() {
            // iframe not available in the system browser type
            if (this.widgetConfigs.widgetLaunchType !== 'systemBrowser') {
                this.removeElements();
            }
            else {
                this.removePopWindow();
            }
            // fire onClose event
            this.widgetConfigs.onClose();
        }
        handlePostMessage(messageEvent) {
            if (messageEvent.origin === window.AerosyncWidget.widgetBaseURL) {
                let e;
                try {
                    e = JSON.parse(messageEvent.data);
                    if (e.type) {
                        window.AerosyncWidget.handleWidgetEvent(e);
                    }
                }
                catch (err) {
                    console.warn('Error processing event', err);
                }
            }
        }
        handleWidgetEvent(t) {
            var _a, _b;
            switch (t.type) {
                case exports.WidgetMessageEventType.ONSUCCESS:
                    this.widgetConfigs.onSuccess(t.payload);
                    const message = {
                        type: 'embeddedView',
                        payload: { name: 'onSuccess' },
                    };
                    this.sendPostMessage(AEROSYNC_EMBEDDED_IFRAME_ID, message);
                    this.removeElements();
                    this.removePopWindow();
                    break;
                case exports.WidgetMessageEventType.ONEVENT:
                    this.widgetConfigs.onEvent(t);
                    break;
                case exports.WidgetMessageEventType.ONCLOSE:
                    if (((_b = (_a = this.widgetConfigs) === null || _a === void 0 ? void 0 : _a.embeddedBankView) === null || _b === void 0 ? void 0 : _b.elementId)
                        && this.embeddedIframeElement) {
                        const message = {
                            type: 'embeddedView',
                            payload: { name: 'onClose' },
                        };
                        this.sendPostMessage(AEROSYNC_EMBEDDED_IFRAME_ID, message);
                    }
                    this.exit();
                    break;
                case exports.WidgetMessageEventType.ONERROR:
                    this.widgetConfigs.onError(t.payload);
                    break;
                case exports.WidgetMessageEventType.ONBANKCLICK:
                    this.widgetStateCode = t.payload.stateCode;
                    this.launch();
                    break;
            }
        }
        sendPostMessage(elementId, message) {
            const iframe = document.getElementById(elementId);
            if (iframe) {
                iframe.contentWindow.postMessage(message, window.AerosyncWidget.widgetBaseURL);
            }
        }
    }

    function initAeroSyncWidget(widgetConfigs) {
        const aerosyncWidget = new AerosyncWidget(widgetConfigs);
        window.AerosyncWidget = aerosyncWidget;
        return aerosyncWidget;
    }
    const initWidget = initAeroSyncWidget;

    exports.initAeroSyncWidget = initAeroSyncWidget;
    exports.initWidget = initWidget;

}));
//# sourceMappingURL=aerosync-web-sdk.umd.js.map
