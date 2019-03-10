var appInsights = window.appInsights ||
    function (a) {
        function b(a) {
            c[a] = function () {
                var b = arguments;
                c.queue.push(function () {
                    c[a].apply(c, b)
                })
            }
        }
        var c = {
            config: a
        },
            d = document,
            e = window;
        setTimeout(function () {
            var b = d.createElement("script");
            b.src = a.url || "https://az416426.vo.msecnd.net/scripts/a/ai.0.js", d.getElementsByTagName("script")[0].parentNode.appendChild(b)
        });
        try {
            c.cookie = d.cookie
        } catch (a) { }
        c.queue = [];
        for (var f = ["Event", "Exception", "Metric", "PageView", "Trace", "Dependency"]; f.length;) b("track" + f.pop());
        if (b("setAuthenticatedUserContext"), b("clearAuthenticatedUserContext"), b("startTrackEvent"), b("stopTrackEvent"), b("startTrackPage"), b("stopTrackPage"), b("flush"), !a.disableExceptionTracking) {
            f = "onerror", b("_" + f);
            var g = e[f];
            e[f] = function (a, b, d, e, h) {
                var i = g && g(a, b, d, e, h);
                return !0 !== i && c["_" + f](a, b, d, e, h), i
            }
        }
        return c
    }({
        instrumentationKey: "Your AI Instrumentation Key",
        disableAjaxTracking: true
    });

window.appInsights = appInsights;

var D365AppInsights;
(function (D365AppInsights) {
    var enableDebug = false;
    var props;
    var disablePageviewTracking = false;
    var percentLoggedPageview = 100;
    var disablePageLoadTimeTracking = false;
    var percentLoggedPageLoadTime = 100;
    var disablePageSaveTimeTracking = false;
    var percentLoggedPageSaveTime = 100;
    var disableTraceTracking = false;
    var percentLoggedTrace = 100;
    var disableExceptionTracking = false;
    var percentLoggedException = 100;
    var disableDependencyTracking = false;
    var percentLoggedDependency = 100;
    var disableMetricTracking = false;
    var percentLoggedMetric = 100;
    var disableEventTracking = false;
    var percentLoggedEvent = 100;
    var targetPage = window;
    var pageSaveEventAdded = false;
    /**
     * Configures and enables logging to Application Insights.
     * @param   {any} executionContext Form execution context
     * @param   {any} [config] The configuration JSON
     */
    function startLogging(config) {
        if (config)
            setConfigOptions(config);
        // Capture PageView start
        if (!disablePageviewTracking)
            var pageViewStart = performance.now();
        if (/ClientApiWrapper\.aspx/i.test(window.location.pathname)) {
            targetPage = window.parent;
            if (enableDebug)
                console.log("DEBUG: Application Insights page target: window.parent");
        }
        var formName = Xrm.Page.ui.formSelector.getCurrentItem().getLabel();
        //let formName = contextValues.formName;
        // Custom implementation of Pageview to avoid duplicate events being 
        // recorded likely due to CRM/D365 already implementing AI which currently
        // has poor support for multiple AI accounts
        if (log("PageviewTracking", disablePageviewTracking, percentLoggedPageview)) {
            window.addEventListener("beforeunload", function () {
                var envelope = createPageViewEnvelope(formName, pageViewStart);
                if (navigator.sendBeacon) {
                    navigator.sendBeacon(window.appInsights.config.endpointUrl, JSON.stringify(envelope));
                    if (enableDebug)
                        console.log("DEBUG: Application Insights logged Pageview via Beacon");
                }
                else {
                    // IE doesn't support Beacon - use sync XHR w/ delay instead
                    // Need slight delay to ensure PageView gets sent
                    var waitMs = 100; // Milliseconds wait
                    var futureTime = (new Date()).getTime() + waitMs;
                    sendPageViewRequest(envelope);
                    // Delay
                    while ((new Date()).getTime() < futureTime) { }
                }
            }, false);
        }
        props = {};
        props["entityId"] = Xrm.Page.data.entity.getId().substr(1, 36);
        props["entityName"] = Xrm.Page.data.entity.getEntityName();
        props["formType"] = getFormTypeName(Xrm.Page.ui.getFormType());
        props["orgName"] = Xrm.Page.context.getOrgUniqueName();
        props["orgVersion"] = Xrm.Page.context.getVersion();
        props["formName"] = formName;
        props["source"] = "JavaScript";
        if (!window.appInsights.queue)
            window.appInsights.queue = [];
        window.appInsights.queue.push(function () {
            window.appInsights.context.addTelemetryInitializer(function (envelope) {
                var telemetryItem = envelope.data.baseData;
                // Add CRM specific properties to every request
                telemetryItem.properties = combineProps(telemetryItem.properties, props);
            });
        });
        window.appInsights.setAuthenticatedUserContext(Xrm.Page.context.getUserId().substr(1, 36), null, false);
        writePageLoadMetric();
    }
    D365AppInsights.startLogging = startLogging;

    function setConfigOptions(config) {
        try {
            if (config.hasOwnProperty("enableDebug")) { //default false
                enableDebug = config.enableDebug;
                window.appInsights.config.enableDebug = config.enableDebug;
            }
            if (config.hasOwnProperty("disablePageviewTracking")) //default false
                disablePageviewTracking = config.disablePageviewTracking;
            if (config.hasOwnProperty("percentLoggedPageview")) //default 100
                percentLoggedPageview = getLogPercent(config.percentLoggedPageview);
            if (config.hasOwnProperty("disablePageLoadTimeTracking")) //default false
                disablePageLoadTimeTracking = config.disablePageLoadTimeTracking;
            if (config.hasOwnProperty("percentLoggedPageLoadTime")) //default 100
                percentLoggedPageLoadTime = getLogPercent(config.percentLoggedPageLoadTime);
            if (config.hasOwnProperty("disablePageSaveTimeTracking")) { //default false
                disablePageSaveTimeTracking = config.disablePageSaveTimeTracking;
                if (!disablePageSaveTimeTracking)
                    addPageSaveHandler();
            }
            if (config.hasOwnProperty("percentLoggedPageSaveTime")) //default 100
                percentLoggedPageSaveTime = getLogPercent(config.percentLoggedPageSaveTime);
            if (config.hasOwnProperty("disableExceptionTracking")) { //default false
                disableExceptionTracking = config.disableExceptionTracking;
                window.appInsights.config.disableExceptionTracking = config.disableExceptionTracking;
            }
            if (config.hasOwnProperty("percentLoggedException")) //default 100
                percentLoggedException = getLogPercent(config.percentLoggedException);
            if (config.hasOwnProperty("disableAjaxTracking")) //default false
                window.appInsights.config.disableAjaxTracking = config.disableAjaxTracking;
            if (config.hasOwnProperty("maxAjaxCallsPerView")) //default 500, -1 = all
                window.appInsights.config.maxAjaxCallsPerView = config.maxAjaxCallsPerView;
            if (config.hasOwnProperty("disableTraceTracking")) { //default false
                disableTraceTracking = config.disableTraceTracking;
                window.appInsights.config.disableTraceTracking = config.disableTraceTracking;
            }
            if (config.hasOwnProperty("percentLoggedTrace")) //default 100
                percentLoggedTrace = getLogPercent(config.percentLoggedTrace);
            if (config.hasOwnProperty("disableDependencyTracking")) { //default false
                disableDependencyTracking = config.disableDependencyTracking;
                window.appInsights.config.disableDependencyTracking = config.disableDependencyTracking;
            }
            if (config.hasOwnProperty("percentLoggedDependency")) //default 100
                percentLoggedDependency = getLogPercent(config.percentLoggedDependency);
            if (config.hasOwnProperty("disableMetricTracking")) { //default false
                disableMetricTracking = config.disableMetricTracking;
                window.appInsights.config.disableMetricTracking = config.disableMetricTracking;
            }
            if (config.hasOwnProperty("percentLoggedMetric")) //default 100
                percentLoggedMetric = getLogPercent(config.percentLoggedMetric);
            if (config.hasOwnProperty("disableEventTracking")) { //default false
                disableEventTracking = config.disableEventTracking;
                window.appInsights.config.disableEventTracking = config.disableEventTracking;
            }
            if (config.hasOwnProperty("percentLoggedEvent")) //default 100
                percentLoggedEvent = getLogPercent(config.percentLoggedEvent);
            if (enableDebug) {
                console.log("D365 Application Insights configuration:");
                console.log("enableDebug: " + enableDebug);
                console.log("disablePageviewTracking: " + disablePageviewTracking);
                console.log("percentLoggedPageview: " + percentLoggedPageview);
                console.log("disablePageLoadTimeTracking: " + disablePageLoadTimeTracking);
                console.log("percentLoggedPageLoadTime: " + percentLoggedPageLoadTime);
                console.log("disablePageSaveTimeTracking: " + disablePageSaveTimeTracking);
                console.log("percentLoggedPageSaveTime: " + percentLoggedPageSaveTime);
                console.log("disableExceptionTracking: " + disableExceptionTracking);
                console.log("percentLoggedException: " + percentLoggedException);
                console.log("disableAjaxTracking: " + window.appInsights.config.disableAjaxTracking);
                console.log("maxAjaxCallsPerView: " + window.appInsights.config.maxAjaxCallsPerView);
                console.log("disableTraceTracking: " + disableTraceTracking);
                console.log("percentLoggedTrace: " + percentLoggedTrace);
                console.log("disableDependencyTracking: " + disableDependencyTracking);
                console.log("percentLoggedDependency: " + percentLoggedDependency);
                console.log("disableMetricTracking: " + disableMetricTracking);
                console.log("percentLoggedMetric: " + percentLoggedMetric);
                console.log("disableEventTracking: " + disableEventTracking);
                console.log("percentLoggedEvent: " + percentLoggedEvent);
            }
        }
        catch (error) {
            console.log("ERROR: Application Insights error parsing configuration parameters: " + error);
        }
    }
    function addPageSaveHandler() {
        if (disablePageSaveTimeTracking || pageSaveEventAdded)
            return;

        Xrm.Page.data.entity.addOnSave(D365AppInsights.writePageSaveMetric);
        pageSaveEventAdded = true;
    }
    function clearPerformanceEntries() {
        targetPage.performance.clearMarks();
        targetPage.performance.clearMeasures();
    }
    function trackSaveTime() {
        if (disablePageSaveTimeTracking)
            return;
        clearPerformanceEntries();
        targetPage.performance.mark("PageSave-Start");
        if (enableDebug)
            console.log("DEBUG: Application Insights started timing PageSave");
    }
    D365AppInsights.trackSaveTime = trackSaveTime;
    function writePageSaveMetric(executionContext) {
        if (!log("PageSaveTime", disablePageSaveTimeTracking, percentLoggedPageSaveTime))
            return;
        targetPage.performance.mark("PageSave-End");
        if (enableDebug)
            console.log("DEBUG: Application Insights ended timing PageSave");
        targetPage.performance.measure("PageSaveMetric", "PageSave-Start", "PageSave-End");
        var measures = targetPage.performance.getEntriesByName("PageSaveMetric", "measure");
        var measure = measures[0];
        var saveMode = executionContext.getEventArgs().getSaveMode();
        var duration = Math.round(measure.duration);
        writeMetric("PageSave", duration, 1, null, null, { saveMode: getSaveModeName(saveMode) });
        if (enableDebug)
            console.log("DEBUG: Application Insights logged metric: PageSave time: " + duration + "ms");
        clearPerformanceEntries();
    }
    D365AppInsights.writePageSaveMetric = writePageSaveMetric;
    function writePageLoadMetric() {
        if (!log("PageLoadTime", disablePageLoadTimeTracking, percentLoggedPageLoadTime))
            return;
        if (isNaN(targetPage.performance.timing.loadEventEnd) || isNaN(targetPage.performance.timing.responseEnd) ||
            targetPage.performance.timing.loadEventEnd === 0 || targetPage.performance.timing.responseEnd === 0) {
            setTimeout(function () {
                writePageLoadMetric();
            }, 50);
        }
        else {
            var pageLoad = targetPage.performance.timing.loadEventEnd - targetPage.performance.timing.responseEnd;
            writeMetric("PageLoad", pageLoad, 1, null, null, null);
            if (enableDebug)
                console.log("DEBUG: Application Insights logged metric: PageLoad time: " + pageLoad + "ms");
        }
    }
    /**
     * Writes an event message to Application Insights.
     * @param   {string} name The event name
     * @param   {any} [newProps] Additional properties as object - { key: value }
     * @param   {any} [measurements] The associated measurements as object - { key: value }
     */
    function writeEvent(name, newProps, measurements) {
        if (!log("Event", disableEventTracking, percentLoggedEvent))
            return;
        window.appInsights.trackEvent(name, newProps, measurements);
        if (enableDebug)
            console.log("DEBUG: Application Insights logged event: " + name);
    }
    D365AppInsights.writeEvent = writeEvent;
    /**
     * Writes a metric message to Application Insights.
     * @param   {string} name The metric name
     * @param   {number} value The metric value
     * @param   {number} [sampleCount] The count of metrics being logged (default = 1)
     * @param   {number} [min] The minimum value of metrics being logged (default = value)
     * @param   {number} [max] The maximum value of metrics being logged (default = value)
     * @param   {any} [newProps] Additional properties as object - { key: value }
     */
    function writeMetric(name, value, sampleCount, min, max, newProps) {
        if (!log("Metric", disableMetricTracking, percentLoggedMetric))
            return;
        if (!sampleCount)
            sampleCount = 1;
        if (!min)
            min = value;
        if (!max)
            max = value;
        window.appInsights.trackMetric(name, value, sampleCount, min, max, newProps);
        if (enableDebug)
            console.log("DEBUG: Application Insights logged metric: " + name);
    }
    D365AppInsights.writeMetric = writeMetric;
    /**
     * Writes exception data to Application Insights.
     * @param   {Error} exception The exception being logged
     * @param   {string} [handledAt] The location the exception
     * @param   {AI.SeverityLevel} [severityLevel] The severity level (default = Error)
     * @param   {any} [newProps] Additional properties as object - { key: value }
     * @param   {any} [measurements] The associated measurements as object - { key: value }
     */
    function writeException(exception, handledAt, severityLevel, newProps, measurements) {
        if (!log("Exception", disableExceptionTracking, percentLoggedException))
            return;
        if (!severityLevel)
            severityLevel = AI.SeverityLevel.Error;
        window.appInsights.trackException(exception, handledAt, newProps, measurements, severityLevel);
        if (enableDebug)
            console.log("DEBUG: Application Insights logged exception: " + exception.name);
    }
    D365AppInsights.writeException = writeException;
    /**
     * Writes a trace message to Application Insights.
     * @param   {string} message The trace message
     * @param   {AI.SeverityLevel} [severityLevel] The severity level (default = Information)
     * @param   {any} [newProps] Additional properties as object - { key: value }
     */
    function writeTrace(message, severityLevel, newProps) {
        if (!log("Trace", disableTraceTracking, percentLoggedTrace))
            return;
        if (!severityLevel)
            severityLevel = AI.SeverityLevel.Information;
        window.appInsights.trackTrace(message, newProps, severityLevel);
        if (enableDebug)
            console.log("DEBUG: Application Insights logged trace: " + message);
    }
    D365AppInsights.writeTrace = writeTrace;
    /**
     * Writes a dependency message to Application Insights.
     * @param   {string} name The dependency name or absolute URL
     * @param   {string} method The HTTP method (only logged with URL)
     * @param   {number} duration The duration in ms of the dependent event
     * @param   {boolean} success Set to true if the dependent event was successful, false otherwise
     * @param   {number} resultCode The result code, HTTP or otherwise
     * @param   {string} pathName The path part of the absolute URL (default = determined from name)
     * @param   {any} [newProps] Additional properties as object - { key: value }
     */
    function writeDependency(name, method, duration, success, resultCode, pathName, newProps) {
        if (!log("Dependency", disableDependencyTracking, percentLoggedDependency))
            return;
        var id = Microsoft.ApplicationInsights.Util.newId();
        if (!pathName) {
            if (isUrl(name))
                pathName = getUrlPath(name);
        }
        window.appInsights.trackDependency(id, method, name, pathName, duration, success, resultCode, newProps, null);
        if (enableDebug)
            console.log("DEBUG: Application Insights logged dependency: " + id + ": " + duration);
    }
    D365AppInsights.writeDependency = writeDependency;
    /**
     * Writes a metric message logging method execution duration to Application Insights.
     * @param   {string} methodName The method name
     * @param   {number} start The start time using performance.now()
     * @param   {number} end The end time using performance.now()
     */
    function writeMethodTime(methodName, start, end) {
        var time = end - start;
        writeMetric("Method Time: " + methodName, time, null, null, null);
        if (enableDebug)
            console.log("DEBUG: Application Insights logged method time: " + methodName + ": " + time + "ms");
    }
    D365AppInsights.writeMethodTime = writeMethodTime;
    /**
     * Attaches to a XHR request and writes a dependency message to Application Insights.
     * @param   {string} methodName The method name
     * @param   {number} start The start time using performance.now()
     * @param   {number} end The end time using performance.now()
     */
    function trackDependencyTime(req, methodName) {
        // ReSharper disable once Html.EventNotResolved
        req.addEventListener("loadstart", function () {
            getStartTime(req, methodName);
        });
        req.addEventListener("load", function () {
            getEndTime(req, true);
        });
        req.addEventListener("error", function () {
            getEndTime(req, false);
        });
    }
    D365AppInsights.trackDependencyTime = trackDependencyTime;
    function getStartTime(req, methodName) {
        req.t0 = performance.now();
        req.methodName = methodName;
    }
    function getEndTime(req, success) {
        var duration = performance.now() - req.t0;
        writeDependency(req._method, req._url, duration, success, req.status, "" + req._url, { methodName: req.methodName, mode: getMode(req._async) });
    }
    function combineProps(props, newProps) {
        if (!props && !newProps)
            return null;
        if (newProps === null)
            return props;
        if (props === null)
            return newProps;
        for (var attrname in newProps) {
            if (newProps.hasOwnProperty(attrname))
                props[attrname] = newProps[attrname];
        }
        return props;
    }
    function getIdFromCookie(cookieName) {
        var cookie = Microsoft.ApplicationInsights.Util.getCookie(cookieName);
        if (!cookie)
            return null;
        var params = cookie.split(Microsoft.ApplicationInsights.Context.User.cookieSeparator);
        if (params.length < 1)
            return null;
        return params[0];
    }
    function isUrl(name) {
        return /^[a-z][a-z0-9+.-]*:/.test(name);
    }
    function getUrlPath(url) {
        var urlElem = document.createElement("a");
        urlElem.href = url;
        return urlElem.pathname;
    }
    function sendPageViewRequest(envelope) {
        var req = new XMLHttpRequest();
        req.open("POST", window.appInsights.config.endpointUrl, false); // Doesn't work if async
        req.setRequestHeader("Accept", "*/*");
        req.setRequestHeader("Content-Type", "application/json");
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    if (enableDebug)
                        console.log("DEBUG: Application Insights logged Pageview via XHR");
                }
            }
        };
        req.send(JSON.stringify(envelope));
    }
    function createPageViewEnvelope(formName, pageViewStart) {
        var iKey = window.appInsights.config.instrumentationKey;
        var envelope = new Microsoft.Telemetry.Envelope;
        envelope.time = new Date().toISOString();
        envelope.iKey = iKey;
        envelope.name = "Microsoft.ApplicationInsights." + iKey.replace("-", "") + ".Pageview";
        envelope.data = { baseType: "PageviewData" };
        envelope.tags["ai.session.id"] = getIdFromCookie("ai_session");
        envelope.tags["ai.device.id"] = window.appInsights.context.device.id;
        envelope.tags["ai.device.type"] = window.appInsights.context.device.type;
        envelope.tags["ai.internal.sdkVersion"] = window.appInsights.context.internal.sdkVersion;
        envelope.tags["ai.user.id"] = getIdFromCookie(Microsoft.ApplicationInsights.Context.User.userCookieName);
        envelope.tags["ai.user.authUserId"] = window.appInsights.context.user.authenticatedId.toUpperCase();
        envelope.tags["ai.operation.id"] = window.appInsights.context.operation.id;
        envelope.tags["ai.operation.name"] = window.appInsights.context.operation.name;
        envelope.data.baseType = "PageviewData";
        var pageViewData = new AI.PageViewData;
        pageViewData.ver = 2;
        pageViewData.name = formName;
        pageViewData.url = Microsoft.ApplicationInsights.Telemetry.Common.DataSanitizer.sanitizeUrl(window.location.href);
        var d = performance.now() - pageViewStart;
        pageViewData.duration = Microsoft.ApplicationInsights.Util.msToTimeSpan(d);
        envelope.data["baseData"] = pageViewData;
        envelope.data["baseData"]["properties"] = Microsoft.ApplicationInsights.Telemetry.Common.DataSanitizer.sanitizeProperties(props);
        envelope.data["baseData"]["measurements"] = null;
        envelope.data["baseData"]["id"] = Microsoft.ApplicationInsights.Util.newId();
        return envelope;
    }
    function getFormTypeName(formType) {
        switch (formType) {
            case 1:
                return "Create";
            case 2:
                return "Update";
            case 3:
                return "Read Only";
            case 4:
                return "Disabled";
            case 6:
                return "Bulk Edit";
            default:
                return "Undefined";
        }
    }
    function getSaveModeName(saveMode) {
        switch (saveMode) {
            case 1:
                return "Save";
            case 2:
                return "Save and Close";
            case 5:
                return "Deactivate";
            case 6:
                return "Reactivate";
            case 7:
                return "Send";
            case 15:
                return "Disqualify";
            case 16:
                return "Qualify";
            case 47:
                return "Assign";
            case 58:
                return "Save as Completed";
            case 59:
                return "Save and New";
            case 70:
                return "Auto Save";
            default:
                return "Undefined";
        }
    }
    function getMode(mode) {
        return (mode) ? "Asynchronous" : "Synchronous";
    }
    function getLogPercent(value) {
        if (isNaN(value)) {
            if (enableDebug)
                console.log("DEBUG: Log percent: " + value + " is not a number");
            return 100;
        }
        var x = parseFloat(value);
        x = Math.round(x);
        if (x < 1)
            return 0;
        if (x > 100)
            return 100;
        return x;
    }
    function log(type, disable, threshold) {
        if (disable) {
            if (enableDebug)
                console.log("DEBUG: Application Insights " + type + " not written: Disabled");
            return false;
        }
        var shouldLog = inLogThreshold(threshold);
        if (!shouldLog) {
            if (enableDebug)
                console.log("DEBUG: Application Insights " + type + " not written: Threshold%: " + threshold);
            return false;
        }
        return true;
    }
    function inLogThreshold(threshold) {
        if (threshold === 100)
            return true;
        if (threshold === 0)
            return false;
        var number = Math.floor(Math.random() * (101));
        return number <= threshold;
    }

    var xhrProto = XMLHttpRequest.prototype, origOpen = xhrProto.open;
    xhrProto.open = (function (method, url, async) {
        this._url = url;
        this._method = method;
        this._async = async;
        return origOpen.apply(this, arguments);
    });
})(D365AppInsights || (D365AppInsights = {}));
