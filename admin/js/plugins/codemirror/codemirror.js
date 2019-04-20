// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// This is CodeMirror (http://codemirror.net), a code editor
// implemented in JavaScript on top of the browser's DOM.
//
// You can find some technical background for some of the code below
// at http://marijnhaverbeke.nl/blog/#cm-internals .

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    module.exports = mod();
  else if (typeof define == "function" && define.amd) // AMD
    return define([], mod);
  else // Plain browser env
    this.CodeMirror = mod();
})(function() {
  "use strict";

  // BROWSER SNIFFING

  // Kludges for bugs and behavior differences that can't be feature
  // detected are enabled based on userAgent etc sniffing.

  var gecko = /gecko\/\d/i.test(navigator.userAgent);
  // ie_uptoN means Internet Explorer version N or lower
  var ie_upto10 = /MSIE \d/.test(navigator.userAgent);
  var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
  var ie = ie_upto10 || ie_11up;
  var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : ie_11up[1]);
  var webkit = /WebKit\//.test(navigator.userAgent);
  var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(navigator.userAgent);
  var chrome = /Chrome\//.test(navigator.userAgent);
  var presto = /Opera\//.test(navigator.userAgent);
  var safari = /Apple Computer/.test(navigator.vendor);
  var khtml = /KHTML\//.test(navigator.userAgent);
  var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(navigator.userAgent);
  var phantom = /PhantomJS/.test(navigator.userAgent);

  var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
  // This is woefully incomplete. Suggestions for alternative methods welcome.
  var mobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(navigator.userAgent);
  var mac = ios || /Mac/.test(navigator.platform);
  var windows = /win/i.test(navigator.platform);

  var presto_version = presto && navigator.userAgent.match(/Version\/(\d*\.\d*)/);
  if (presto_version) presto_version = Number(presto_version[1]);
  if (presto_version && presto_version >= 15) { presto = false; webkit = true; }
  // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
  var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
  var captureRightClick = gecko || (ie && ie_version >= 9);

  // Optimize some code when these features are not used.
  var sawReadOnlySpans = false, sawCollapsedSpans = false;

  // EDITOR CONSTRUCTOR

  // A CodeMirror instance represents an editor. This is the object
  // that user code is usually dealing with.

  function CodeMirror(place, options) {
    if (!(this instanceof CodeMirror)) return new CodeMirror(place, options);

    this.options = options = options ? copyObj(options) : {};
    // Determine effective options based on given values and defaults.
    copyObj(defaults, options, false);
    setGuttersForLineNumbers(options);

    var doc = options.value;
    if (typeof doc == "string") doc = new Doc(doc, options.mode);
    this.doc = doc;

    var display = this.display = new Display(place, doc);
    display.wrapper.CodeMirror = this;
    updateGutters(this);
    themeChanged(this);
    if (options.lineWrapping)
      this.display.wrapper.className += " CodeMirror-wrap";
    if (options.autofocus && !mobile) focusInput(this);

    this.state = {
      keyMaps: [],  // stores maps added by addKeyMap
      overlays: [], // highlighting overlays, as added by addOverlay
      modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
      overwrite: false, focused: false,
      suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
      pasteIncoming: false, cutIncoming: false, // help recognize paste/cut edits in readInput
      draggingText: false,
      highlight: new Delayed() // stores highlight worker timeout
    };

    // Override magic textarea content restore that IE sometimes does
    // on our hidden textarea on reload
    if (ie && ie_version < 11) setTimeout(bind(resetInput, this, true), 20);

    registerEventHandlers(this);
    ensureGlobalHandlers();

    startOperation(this);
    this.curOp.forceUpdate = true;
    attachDoc(this, doc);

    if ((options.autofocus && !mobile) || activeElt() == display.input)
      setTimeout(bind(onFocus, this), 20);
    else
      onBlur(this);

    for (var opt in optionHandlers) if (optionHandlers.hasOwnProperty(opt))
      optionHandlers[opt](this, options[opt], Init);
    maybeUpdateLineNumberWidth(this);
    for (var i = 0; i < initHooks.length; ++i) initHooks[i](this);
    endOperation(this);
  }

  // DISPLAY CONSTRUCTOR

  // The display handles the DOM integration, both for input reading
  // and content drawing. It holds references to DOM nodes and
  // display-related state.

  function Display(place, doc) {
    var d = this;

    // The semihidden textarea that is focused when the editor is
    // focused, and receives input.
    var input = d.input = elt("textarea", null, null, "position: absolute; padding: 0; width: 1px; height: 1em; outline: none");
    // The textarea is kept positioned near the cursor to prevent the
    // fact that it'll be scrolled into view on input from scrolling
    // our fake cursor out of view. On webkit, when wrap=off, paste is
    // very slow. So make the area wide instead.
    if (webkit) input.style.width = "1000px";
    else input.setAttribute("wrap", "off");
    // If border: 0; -- iOS fails to open keyboard (issue #1287)
    if (ios) input.style.border = "1px solid black";
    input.setAttribute("autocorrect", "off"); input.setAttribute("autocapitalize", "off"); input.setAttribute("spellcheck", "false");

    // Wraps and hides input textarea
    d.inputDiv = elt("div", [input], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
    // The fake scrollbar elements.
    d.scrollbarH = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar");
    d.scrollbarV = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar");
    // Covers bottom-right square when both scrollbars are present.
    d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
    // Covers bottom of gutter when coverGutterNextToScrollbar is on
    // and h scrollbar is present.
    d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
    // Will contain the actual code, positioned to cover the viewport.
    d.lineDiv = elt("div", null, "CodeMirror-code");
    // Elements are added to these to represent selection and cursors.
    d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
    d.cursorDiv = elt("div", null, "CodeMirror-cursors");
    // A visibility: hidden element used to find the size of things.
    d.measure = elt("div", null, "CodeMirror-measure");
    // When lines outside of the viewport are measured, they are drawn in this.
    d.lineMeasure = elt("div", null, "CodeMirror-measure");
    // Wraps everything that needs to exist inside the vertically-padded coordinate system
    d.lineSpace = elt("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
                      null, "position: relative; outline: none");
    // Moved around its parent to cover visible view.
    d.mover = elt("div", [elt("div", [d.lineSpace], "CodeMirror-lines")], null, "position: relative");
    // Set to the height of the document, allowing scrolling.
    d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
    // Behavior of elts with overflow: auto and padding is
    // inconsistent across browsers. This is used to ensure the
    // scrollable area is big enough.
    d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerCutOff + "px; width: 1px;");
    // Will contain the gutters, if any.
    d.gutters = elt("div", null, "CodeMirror-gutters");
    d.lineGutter = null;
    // Actual scrollable element.
    d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll");
    d.scroller.setAttribute("tabIndex", "-1");
    // The element in which the editor lives.
    d.wrapper = elt("div", [d.inputDiv, d.scrollbarH, d.scrollbarV,
                            d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror");

    // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
    if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0; }
    // Needed to hide big blue blinking cursor on Mobile Safari
    if (ios) input.style.width = "0px";
    if (!webkit) d.scroller.draggable = true;
    // Needed to handle Tab key in KHTML
    if (khtml) { d.inputDiv.style.height = "1px"; d.inputDiv.style.position = "absolute"; }
    // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
    if (ie && ie_version < 8) d.scrollbarH.style.minHeight = d.scrollbarV.style.minWidth = "18px";

    if (place.appendChild) place.appendChild(d.wrapper);
    else place(d.wrapper);

    // Current rendered range (may be bigger than the view window).
    d.viewFrom = d.viewTo = doc.first;
    // Information about the rendered lines.
    d.view = [];
    // Holds info about a single rendered line when it was rendered
    // for measurement, while not in view.
    d.externalMeasured = null;
    // Empty space (in pixels) above the view
    d.viewOffset = 0;
    d.lastSizeC = 0;
    d.updateLineNumbers = null;

    // Used to only resize the line number gutter when necessary (when
    // the amount of lines crosses a boundary that makes its width change)
    d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
    // See readInput and resetInput
    d.prevInput = "";
    // Set to true when a non-horizontal-scrolling line widget is
    // added. As an optimization, line widget aligning is skipped when
    // this is false.
    d.alignWidgets = false;
    // Flag that indicates whether we expect input to appear real soon
    // now (after some event like 'keypress' or 'input') and are
    // polling intensively.
    d.pollingFast = false;
    // Self-resetting timeout for the poller
    d.poll = new Delayed();

    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;

    // Tracks when resetInput has punted to just putting a short
    // string into the textarea instead of the full selection.
    d.inaccurateSelection = false;

    // Tracks the maximum line length so that the horizontal scrollbar
    // can be kept static when scrolling.
    d.maxLine = null;
    d.maxLineLength = 0;
    d.maxLineChanged = false;

    // Used for measuring wheel scrolling granularity
    d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

    // True when shift is held down.
    d.shift = false;

    // Used to track whether anything happened since the context menu
    // was opened.
    d.selForContextMenu = null;
  }

  // STATE UPDATES

  // Used to get the editor into a consistent state again when options change.

  function loadMode(cm) {
    cm.doc.mode = CodeMirror.getMode(cm.options, cm.doc.modeOption);
    resetModeState(cm);
  }

  function resetModeState(cm) {
    cm.doc.iter(function(line) {
      if (line.stateAfter) line.stateAfter = null;
      if (line.styles) line.styles = null;
    });
    cm.doc.frontier = cm.doc.first;
    startWorker(cm, 100);
    cm.state.modeGen++;
    if (cm.curOp) regChange(cm);
  }

  function wrappingChanged(cm) {
    if (cm.options.lineWrapping) {
      addClass(cm.display.wrapper, "CodeMirror-wrap");
      cm.display.sizer.style.minWidth = "";
    } else {
      rmClass(cm.display.wrapper, "CodeMirror-wrap");
      findMaxLine(cm);
    }
    estimateLineHeights(cm);
    regChange(cm);
    clearCaches(cm);
    setTimeout(function(){updateScrollbars(cm);}, 100);
  }

  // Returns a function that estimates the height of a line, to use as
  // first approximation until the line becomes visible (and is thus
  // properly measurable).
  function estimateHeight(cm) {
    var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
    var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
    return function(line) {
      if (lineIsHidden(cm.doc, line)) return 0;

      var widgetsHeight = 0;
      if (line.widgets) for (var i = 0; i < line.widgets.length; i++) {
        if (line.widgets[i].height) widgetsHeight += line.widgets[i].height;
      }

      if (wrapping)
        return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th;
      else
        return widgetsHeight + th;
    };
  }

  function estimateLineHeights(cm) {
    var doc = cm.doc, est = estimateHeight(cm);
    doc.iter(function(line) {
      var estHeight = est(line);
      if (estHeight != line.height) updateLineHeight(line, estHeight);
    });
  }

  function keyMapChanged(cm) {
    var map = keyMap[cm.options.keyMap], style = map.style;
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-keymap-\S+/g, "") +
      (style ? " cm-keymap-" + style : "");
  }

  function themeChanged(cm) {
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
      cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
    clearCaches(cm);
  }

  function guttersChanged(cm) {
    updateGutters(cm);
    regChange(cm);
    setTimeout(function(){alignHorizontally(cm);}, 20);
  }

  // Rebuild the gutter elements, ensure the margin to the left of the
  // code matches their width.
  function updateGutters(cm) {
    var gutters = cm.display.gutters, specs = cm.options.gutters;
    removeChildren(gutters);
    for (var i = 0; i < specs.length; ++i) {
      var gutterClass = specs[i];
      var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + gutterClass));
      if (gutterClass == "CodeMirror-linenumbers") {
        cm.display.lineGutter = gElt;
        gElt.style.width = (cm.display.lineNumWidth || 1) + "px";
      }
    }
    gutters.style.display = i ? "" : "none";
    updateGutterSpace(cm);
  }

  function updateGutterSpace(cm) {
    var width = cm.display.gutters.offsetWidth;
    cm.display.sizer.style.marginLeft = width + "px";
    cm.display.scrollbarH.style.left = cm.options.fixedGutter ? width + "px" : 0;
  }

  // Compute the character length of a line, taking into account
  // collapsed ranges (see markText) that might hide parts, and join
  // other lines onto it.
  function lineLength(line) {
    if (line.height == 0) return 0;
    var len = line.text.length, merged, cur = line;
    while (merged = collapsedSpanAtStart(cur)) {
      var found = merged.find(0, true);
      cur = found.from.line;
      len += found.from.ch - found.to.ch;
    }
    cur = line;
    while (merged = collapsedSpanAtEnd(cur)) {
      var found = merged.find(0, true);
      len -= cur.text.length - found.from.ch;
      cur = found.to.line;
      len += cur.text.length - found.to.ch;
    }
    return len;
  }

  // Find the longest line in the document.
  function findMaxLine(cm) {
    var d = cm.display, doc = cm.doc;
    d.maxLine = getLine(doc, doc.first);
    d.maxLineLength = lineLength(d.maxLine);
    d.maxLineChanged = true;
    doc.iter(function(line) {
      var len = lineLength(line);
      if (len > d.maxLineLength) {
        d.maxLineLength = len;
        d.maxLine = line;
      }
    });
  }

  // Make sure the gutters options contains the element
  // "CodeMirror-linenumbers" when the lineNumbers option is true.
  function setGuttersForLineNumbers(options) {
    var found = indexOf(options.gutters, "CodeMirror-linenumbers");
    if (found == -1 && options.lineNumbers) {
      options.gutters = options.gutters.concat(["CodeMirror-linenumbers"]);
    } else if (found > -1 && !options.lineNumbers) {
      options.gutters = options.gutters.slice(0);
      options.gutters.splice(found, 1);
    }
  }

  // SCROLLBARS

  function hScrollbarTakesSpace(cm) {
    return cm.display.scroller.clientHeight - cm.display.wrapper.clientHeight < scrollerCutOff - 3;
  }

  // Prepare DOM reads needed to update the scrollbars. Done in one
  // shot to minimize update/measure roundtrips.
  function measureForScrollbars(cm) {
    var scroll = cm.display.scroller;
    return {
      clientHeight: scroll.clientHeight,
      barHeight: cm.display.scrollbarV.clientHeight,
      scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth,
      hScrollbarTakesSpace: hScrollbarTakesSpace(cm),
      barWidth: cm.display.scrollbarH.clientWidth,
      docHeight: Math.round(cm.doc.height + paddingVert(cm.display))
    };
  }

  // Re-synchronize the fake scrollbars with the actual size of the
  // content.
  function updateScrollbars(cm, measure) {
    if (!measure) measure = measureForScrollbars(cm);
    var d = cm.display, sWidth = scrollbarWidth(d.measure);
    var scrollHeight = measure.docHeight + scrollerCutOff;
    var needsH = measure.scrollWidth > measure.clientWidth;
    if (needsH && measure.scrollWidth <= measure.clientWidth + 1 &&
        sWidth > 0 && !measure.hScrollbarTakesSpace)
      needsH = false; // (Issue #2562)
    var needsV = scrollHeight > measure.clientHeight;

    if (needsV) {
      d.scrollbarV.style.display = "block";
      d.scrollbarV.style.bottom = needsH ? sWidth + "px" : "0";
      // A bug in IE8 can cause this value to be negative, so guard it.
      d.scrollbarV.firstChild.style.height =
        Math.max(0, scrollHeight - measure.clientHeight + (measure.barHeight || d.scrollbarV.clientHeight)) + "px";
    } else {
      d.scrollbarV.style.display = "";
      d.scrollbarV.firstChild.style.height = "0";
    }
    if (needsH) {
      d.scrollbarH.style.display = "block";
      d.scrollbarH.style.right = needsV ? sWidth + "px" : "0";
      d.scrollbarH.firstChild.style.width =
        (measure.scrollWidth - measure.clientWidth + (measure.barWidth || d.scrollbarH.clientWidth)) + "px";
    } else {
      d.scrollbarH.style.display = "";
      d.scrollbarH.firstChild.style.width = "0";
    }
    if (needsH && needsV) {
      d.scrollbarFiller.style.display = "block";
      d.scrollbarFiller.style.height = d.scrollbarFiller.style.width = sWidth + "px";
    } else d.scrollbarFiller.style.display = "";
    if (needsH && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
      d.gutterFiller.style.display = "block";
      d.gutterFiller.style.height = sWidth + "px";
      d.gutterFiller.style.width = d.gutters.offsetWidth + "px";
    } else d.gutterFiller.style.display = "";

    if (!cm.state.checkedOverlayScrollbar && measure.clientHeight > 0) {
      if (sWidth === 0) {
        var w = mac && !mac_geMountainLion ? "12px" : "18px";
        d.scrollbarV.style.minWidth = d.scrollbarH.style.minHeight = w;
        var barMouseDown = function(e) {
          if (e_target(e) != d.scrollbarV && e_target(e) != d.scrollbarH)
            operation(cm, onMouseDown)(e);
        };
        on(d.scrollbarV, "mousedown", barMouseDown);
        on(d.scrollbarH, "mousedown", barMouseDown);
      }
      cm.state.checkedOverlayScrollbar = true;
    }
  }

  // Compute the lines that are visible in a given viewport (defaults
  // the the current scroll position). viewport may contain top,
  // height, and ensure (see op.scrollToPos) properties.
  function visibleLines(display, doc, viewport) {
    var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
    top = Math.floor(top - paddingTop(display));
    var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;

    var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom);
    // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
    // forces those lines into the viewport (if possible).
    if (viewport && viewport.ensure) {
      var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line;
      if (ensureFrom < from)
        return {from: ensureFrom,
                to: lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight)};
      if (Math.min(ensureTo, doc.lastLine()) >= to)
        return {from: lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight),
                to: ensureTo};
    }
    return {from: from, to: Math.max(to, from + 1)};
  }

  // LINE NUMBERS

  // Re-align line numbers and gutter marks to compensate for
  // horizontal scrolling.
  function alignHorizontally(cm) {
    var display = cm.display, view = display.view;
    if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) return;
    var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
    var gutterW = display.gutters.offsetWidth, left = comp + "px";
    for (var i = 0; i < view.length; i++) if (!view[i].hidden) {
      if (cm.options.fixedGutter && view[i].gutter)
        view[i].gutter.style.left = left;
      var align = view[i].alignable;
      if (align) for (var j = 0; j < align.length; j++)
        align[j].style.left = left;
    }
    if (cm.options.fixedGutter)
      display.gutters.style.left = (comp + gutterW) + "px";
  }

  // Used to ensure that the line number gutter is still the right
  // size for the current document size. Returns true when an update
  // is needed.
  function maybeUpdateLineNumberWidth(cm) {
    if (!cm.options.lineNumbers) return false;
    var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
    if (last.length != display.lineNumChars) {
      var test = display.measure.appendChild(elt("div", [elt("div", last)],
                                                 "CodeMirror-linenumber CodeMirror-gutter-elt"));
      var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
      display.lineGutter.style.width = "";
      display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding);
      display.lineNumWidth = display.lineNumInnerWidth + padding;
      display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
      display.lineGutter.style.width = display.lineNumWidth + "px";
      updateGutterSpace(cm);
      return true;
    }
    return false;
  }

  function lineNumberFor(options, i) {
    return String(options.lineNumberFormatter(i + options.firstLineNumber));
  }

  // Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
  // but using getBoundingClientRect to get a sub-pixel-accurate
  // result.
  function compensateForHScroll(display) {
    return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left;
  }

  // DISPLAY DRAWING

  function DisplayUpdate(cm, viewport, force) {
    var display = cm.display;

    this.viewport = viewport;
    // Store some values that we'll need later (but don't want to force a relayout for)
    this.visible = visibleLines(display, cm.doc, viewport);
    this.editorIsHidden = !display.wrapper.offsetWidth;
    this.wrapperHeight = display.wrapper.clientHeight;
    this.oldViewFrom = display.viewFrom; this.oldViewTo = display.viewTo;
    this.oldScrollerWidth = display.scroller.clientWidth;
    this.force = force;
    this.dims = getDimensions(cm);
  }

  // Does the actual updating of the line display. Bails out
  // (returning false) when there is nothing to be done and forced is
  // false.
  function updateDisplayIfNeeded(cm, update) {
    var display = cm.display, doc = cm.doc;
    if (update.editorIsHidden) {
      resetView(cm);
      return false;
    }

    // Bail out if the visible area is already rendered and nothing changed.
    if (!update.force &&
        update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
        countDirtyView(cm) == 0)
      return false;

    if (maybeUpdateLineNumberWidth(cm)) {
      resetView(cm);
      update.dims = getDimensions(cm);
    }

    // Compute a suitable new viewport (from & to)
    var end = doc.first + doc.size;
    var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
    var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
    if (display.viewFrom < from && from - display.viewFrom < 20) from = Math.max(doc.first, display.viewFrom);
    if (display.viewTo > to && display.viewTo - to < 20) to = Math.min(end, display.viewTo);
    if (sawCollapsedSpans) {
      from = visualLineNo(cm.doc, from);
      to = visualLineEndNo(cm.doc, to);
    }

    var different = from != display.viewFrom || to != display.viewTo ||
      display.lastSizeC != update.wrapperHeight;
    adjustView(cm, from, to);

    display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom));
    // Position the mover div to align with the current scroll position
    cm.display.mover.style.top = display.viewOffset + "px";

    var toUpdate = countDirtyView(cm);
    if (!different && toUpdate == 0 && !update.force &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
      return false;

    // For big changes, we hide the enclosing element during the
    // update, since that speeds up the operations on most browsers.
    var focused = activeElt();
    if (toUpdate > 4) display.lineDiv.style.display = "none";
    patchDisplay(cm, display.updateLineNumbers, update.dims);
    if (toUpdate > 4) display.lineDiv.style.display = "";
    // There might have been a widget with a focused element that got
    // hidden or updated, if so re-focus it.
    if (focused && activeElt() != focused && focused.offsetHeight) focused.focus();

    // Prevent selection and cursors from interfering with the scroll
    // width.
    removeChildren(display.cursorDiv);
    removeChildren(display.selectionDiv);

    if (different) {
      display.lastSizeC = update.wrapperHeight;
      startWorker(cm, 400);
    }

    display.updateLineNumbers = null;

    return true;
  }

  function postUpdateDisplay(cm, update) {
    var force = update.force, viewport = update.viewport;
    for (var first = true;; first = false) {
      if (first && cm.options.lineWrapping && update.oldScrollerWidth != cm.display.scroller.clientWidth) {
        force = true;
      } else {
        force = false;
        // Clip forced viewport to actual scrollable area.
        if (viewport && viewport.top != null)
          viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - scrollerCutOff -
                                    cm.display.scroller.clientHeight, viewport.top)};
        // Updated line heights might result in the drawn area not
        // actually covering the viewport. Keep looping until it does.
        update.visible = visibleLines(cm.display, cm.doc, viewport);
        if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
          break;
      }
      if (!updateDisplayIfNeeded(cm, update)) break;
      updateHeightsInViewport(cm);
      var barMeasure = measureForScrollbars(cm);
      updateSelection(cm);
      setDocumentHeight(cm, barMeasure);
      updateScrollbars(cm, barMeasure);
    }

    signalLater(cm, "update", cm);
    if (cm.display.viewFrom != update.oldViewFrom || cm.display.viewTo != update.oldViewTo)
      signalLater(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
  }

  function updateDisplaySimple(cm, viewport) {
    var update = new DisplayUpdate(cm, viewport);
    if (updateDisplayIfNeeded(cm, update)) {
      updateHeightsInViewport(cm);
      postUpdateDisplay(cm, update);
      var barMeasure = measureForScrollbars(cm);
      updateSelection(cm);
      setDocumentHeight(cm, barMeasure);
      updateScrollbars(cm, barMeasure);
    }
  }

  function setDocumentHeight(cm, measure) {
    cm.display.sizer.style.minHeight = cm.display.heightForcer.style.top = measure.docHeight + "px";
    cm.display.gutters.style.height = Math.max(measure.docHeight, measure.clientHeight - scrollerCutOff) + "px";
  }

  function checkForWebkitWidthBug(cm, measure) {
    // Work around Webkit bug where it sometimes reserves space for a
    // non-existing phantom scrollbar in the scroller (Issue #2420)
    if (cm.display.sizer.offsetWidth + cm.display.gutters.offsetWidth < cm.display.scroller.clientWidth - 1) {
      cm.display.sizer.style.minHeight = cm.display.heightForcer.style.top = "0px";
      cm.display.gutters.style.height = measure.docHeight + "px";
    }
  }

  // Read the actual heights of the rendered lines, and update their
  // stored heights to match.
  function updateHeightsInViewport(cm) {
    var display = cm.display;
    var prevBottom = display.lineDiv.offsetTop;
    for (var i = 0; i < display.view.length; i++) {
      var cur = display.view[i], height;
      if (cur.hidden) continue;
      if (ie && ie_version < 8) {
        var bot = cur.node.offsetTop + cur.node.offsetHeight;
        height = bot - prevBottom;
        prevBottom = bot;
      } else {
        var box = cur.node.getBoundingClientRect();
        height = box.bottom - box.top;
      }
      var diff = cur.line.height - height;
      if (height < 2) height = textHeight(display);
      if (diff > .001 || diff < -.001) {
        updateLineHeight(cur.line, height);
        updateWidgetHeight(cur.line);
        if (cur.rest) for (var j = 0; j < cur.rest.length; j++)
          updateWidgetHeight(cur.rest[j]);
      }
    }
  }

  // Read and store the height of line widgets associated with the
  // given line.
  function updateWidgetHeight(line) {
    if (line.widgets) for (var i = 0; i < line.widgets.length; ++i)
      line.widgets[i].height = line.widgets[i].node.offsetHeight;
  }

  // Do a bulk-read of the DOM positions and sizes needed to draw the
  // view, so that we don't interleave reading and writing to the DOM.
  function getDimensions(cm) {
    var d = cm.display, left = {}, width = {};
    var gutterLeft = d.gutters.clientLeft;
    for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
      left[cm.options.gutters[i]] = n.offsetLeft + n.clientLeft + gutterLeft;
      width[cm.options.gutters[i]] = n.clientWidth;
    }
    return {fixedPos: compensateForHScroll(d),
            gutterTotalWidth: d.gutters.offsetWidth,
            gutterLeft: left,
            gutterWidth: width,
            wrapperWidth: d.wrapper.clientWidth};
  }

  // Sync the actual display DOM structure with display.view, removing
  // nodes for lines that are no longer in view, and creating the ones
  // that are not there yet, and updating the ones that are out of
  // date.
  function patchDisplay(cm, updateNumbersFrom, dims) {
    var display = cm.display, lineNumbers = cm.options.lineNumbers;
    var container = display.lineDiv, cur = container.firstChild;

    function rm(node) {
      var next = node.nextSibling;
      // Works around a throw-scroll bug in OS X Webkit
      if (webkit && mac && cm.display.currentWheelTarget == node)
        node.style.display = "none";
      else
        node.parentNode.removeChild(node);
      return next;
    }

    var view = display.view, lineN = display.viewFrom;
    // Loop over the elements in the view, syncing cur (the DOM nodes
    // in display.lineDiv) with the view as we go.
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i];
      if (lineView.hidden) {
      } else if (!lineView.node) { // Not drawn yet
        var node = buildLineElement(cm, lineView, lineN, dims);
        container.insertBefore(node, cur);
      } else { // Already drawn
        while (cur != lineView.node) cur = rm(cur);
        var updateNumber = lineNumbers && updateNumbersFrom != null &&
          updateNumbersFrom <= lineN && lineView.lineNumber;
        if (lineView.changes) {
          if (indexOf(lineView.changes, "gutter") > -1) updateNumber = false;
          updateLineForChanges(cm, lineView, lineN, dims);
        }
        if (updateNumber) {
          removeChildren(lineView.lineNumber);
          lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
        }
        cur = lineView.node.nextSibling;
      }
      lineN += lineView.size;
    }
    while (cur) cur = rm(cur);
  }

  // When an aspect of a line changes, a string is added to
  // lineView.changes. This updates the relevant part of the line's
  // DOM structure.
  function updateLineForChanges(cm, lineView, lineN, dims) {
    for (var j = 0; j < lineView.changes.length; j++) {
      var type = lineView.changes[j];
      if (type == "text") updateLineText(cm, lineView);
      else if (type == "gutter") updateLineGutter(cm, lineView, lineN, dims);
      else if (type == "class") updateLineClasses(lineView);
      else if (type == "widget") updateLineWidgets(lineView, dims);
    }
    lineView.changes = null;
  }

  // Lines with gutter elements, widgets or a background class need to
  // be wrapped, and have the extra elements added to the wrapper div
  function ensureLineWrapped(lineView) {
    if (lineView.node == lineView.text) {
      lineView.node = elt("div", null, null, "position: relative");
      if (lineView.text.parentNode)
        lineView.text.parentNode.replaceChild(lineView.node, lineView.text);
      lineView.node.appendChild(lineView.text);
      if (ie && ie_version < 8) lineView.node.style.zIndex = 2;
    }
    return lineView.node;
  }

  function updateLineBackground(lineView) {
    var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
    if (cls) cls += " CodeMirror-linebackground";
    if (lineView.background) {
      if (cls) lineView.background.className = cls;
      else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null; }
    } else if (cls) {
      var wrap = ensureLineWrapped(lineView);
      lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
    }
  }

  // Wrapper around buildLineContent which will reuse the structure
  // in display.externalMeasured when possible.
  function getLineContent(cm, lineView) {
    var ext = cm.display.externalMeasured;
    if (ext && ext.line == lineView.line) {
      cm.display.externalMeasured = null;
      lineView.measure = ext.measure;
      return ext.built;
    }
    return buildLineContent(cm, lineView);
  }

  // Redraw the line's text. Interacts with the background and text
  // classes because the mode may output tokens that influence these
  // classes.
  function updateLineText(cm, lineView) {
    var cls = lineView.text.className;
    var built = getLineContent(cm, lineView);
    if (lineView.text == lineView.node) lineView.node = built.pre;
    lineView.text.parentNode.replaceChild(built.pre, lineView.text);
    lineView.text = built.pre;
    if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
      lineView.bgClass = built.bgClass;
      lineView.textClass = built.textClass;
      updateLineClasses(lineView);
    } else if (cls) {
      lineView.text.className = cls;
    }
  }

  function updateLineClasses(lineView) {
    updateLineBackground(lineView);
    if (lineView.line.wrapClass)
      ensureLineWrapped(lineView).className = lineView.line.wrapClass;
    else if (lineView.node != lineView.text)
      lineView.node.className = "";
    var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
    lineView.text.className = textClass || "";
  }

  function updateLineGutter(cm, lineView, lineN, dims) {
    if (lineView.gutter) {
      lineView.node.removeChild(lineView.gutter);
      lineView.gutter = null;
    }
    var markers = lineView.line.gutterMarkers;
    if (cm.options.lineNumbers || markers) {
      var wrap = ensureLineWrapped(lineView);
      var gutterWrap = lineView.gutter =
        wrap.insertBefore(elt("div", null, "CodeMirror-gutter-wrapper", "position: absolute; left: " +
                              (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px"),
                          lineView.text);
      if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
        lineView.lineNumber = gutterWrap.appendChild(
          elt("div", lineNumberFor(cm.options, lineN),
              "CodeMirror-linenumber CodeMirror-gutter-elt",
              "left: " + dims.gutterLeft["CodeMirror-linenumbers"] + "px; width: "
              + cm.display.lineNumInnerWidth + "px"));
      if (markers) for (var k = 0; k < cm.options.gutters.length; ++k) {
        var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id];
        if (found)
          gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt", "left: " +
                                     dims.gutterLeft[id] + "px; width: " + dims.gutterWidth[id] + "px"));
      }
    }
  }

  function updateLineWidgets(lineView, dims) {
    if (lineView.alignable) lineView.alignable = null;
    for (var node = lineView.node.firstChild, next; node; node = next) {
      var next = node.nextSibling;
      if (node.className == "CodeMirror-linewidget")
        lineView.node.removeChild(node);
    }
    insertLineWidgets(lineView, dims);
  }

  // Build a line's DOM representation from scratch
  function buildLineElement(cm, lineView, lineN, dims) {
    var built = getLineContent(cm, lineView);
    lineView.text = lineView.node = built.pre;
    if (built.bgClass) lineView.bgClass = built.bgClass;
    if (built.textClass) lineView.textClass = built.textClass;

    updateLineClasses(lineView);
    updateLineGutter(cm, lineView, lineN, dims);
    insertLineWidgets(lineView, dims);
    return lineView.node;
  }

  // A lineView may contain multiple logical lines (when merged by
  // collapsed spans). The widgets for all of them need to be drawn.
  function insertLineWidgets(lineView, dims) {
    insertLineWidgetsFor(lineView.line, lineView, dims, true);
    if (lineView.rest) for (var i = 0; i < lineView.rest.length; i++)
      insertLineWidgetsFor(lineView.rest[i], lineView, dims, false);
  }

  function insertLineWidgetsFor(line, lineView, dims, allowAbove) {
    if (!line.widgets) return;
    var wrap = ensureLineWrapped(lineView);
    for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
      var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget");
      if (!widget.handleMouseEvents) node.ignoreEvents = true;
      positionLineWidget(widget, node, lineView, dims);
      if (allowAbove && widget.above)
        wrap.insertBefore(node, lineView.gutter || lineView.text);
      else
        wrap.appendChild(node);
      signalLater(widget, "redraw");
    }
  }

  function positionLineWidget(widget, node, lineView, dims) {
    if (widget.noHScroll) {
      (lineView.alignable || (lineView.alignable = [])).push(node);
      var width = dims.wrapperWidth;
      node.style.left = dims.fixedPos + "px";
      if (!widget.coverGutter) {
        width -= dims.gutterTotalWidth;
        node.style.paddingLeft = dims.gutterTotalWidth + "px";
      }
      node.style.width = width + "px";
    }
    if (widget.coverGutter) {
      node.style.zIndex = 5;
      node.style.position = "relative";
      if (!widget.noHScroll) node.style.marginLeft = -dims.gutterTotalWidth + "px";
    }
  }

  // POSITION OBJECT

  // A Pos instance represents a position within the text.
  var Pos = CodeMirror.Pos = function(line, ch) {
    if (!(this instanceof Pos)) return new Pos(line, ch);
    this.line = line; this.ch = ch;
  };

  // Compare two positions, return 0 if they are the same, a negative
  // number when a is less, and a positive number otherwise.
  var cmp = CodeMirror.cmpPos = function(a, b) { return a.line - b.line || a.ch - b.ch; };

  function copyPos(x) {return Pos(x.line, x.ch);}
  function maxPos(a, b) { return cmp(a, b) < 0 ? b : a; }
  function minPos(a, b) { return cmp(a, b) < 0 ? a : b; }

  // SELECTION / CURSOR

  // Selection objects are immutable. A new one is created every time
  // the selection changes. A selection is one or more non-overlapping
  // (and non-touching) ranges, sorted, and an integer that indicates
  // which one is the primary selection (the one that's scrolled into
  // view, that getCursor returns, etc).
  function Selection(ranges, primIndex) {
    this.ranges = ranges;
    this.primIndex = primIndex;
  }

  Selection.prototype = {
    primary: function() { return this.ranges[this.primIndex]; },
    equals: function(other) {
      if (other == this) return true;
      if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) return false;
      for (var i = 0; i < this.ranges.length; i++) {
        var here = this.ranges[i], there = other.ranges[i];
        if (cmp(here.anchor, there.anchor) != 0 || cmp(here.head, there.head) != 0) return false;
      }
      return true;
    },
    deepCopy: function() {
      for (var out = [], i = 0; i < this.ranges.length; i++)
        out[i] = new Range(copyPos(this.ranges[i].anchor), copyPos(this.ranges[i].head));
      return new Selection(out, this.primIndex);
    },
    somethingSelected: function() {
      for (var i = 0; i < this.ranges.length; i++)
        if (!this.ranges[i].empty()) return true;
      return false;
    },
    contains: function(pos, end) {
      if (!end) end = pos;
      for (var i = 0; i < this.ranges.length; i++) {
        var range = this.ranges[i];
        if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
          return i;
      }
      return -1;
    }
  };

  function Range(anchor, head) {
    this.anchor = anchor; this.head = head;
  }

  Range.prototype = {
    from: function() { return minPos(this.anchor, this.head); },
    to: function() { return maxPos(this.anchor, this.head); },
    empty: function() {
      return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch;
    }
  };

  // Take an unsorted, potentially overlapping set of ranges, and
  // build a selection out of it. 'Consumes' ranges array (modifying
  // it).
  function normalizeSelection(ranges, primIndex) {
    var prim = ranges[primIndex];
    ranges.sort(function(a, b) { return cmp(a.from(), b.from()); });
    primIndex = indexOf(ranges, prim);
    for (var i = 1; i < ranges.length; i++) {
      var cur = ranges[i], prev = ranges[i - 1];
      if (cmp(prev.to(), cur.from()) >= 0) {
        var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to());
        var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
        if (i <= primIndex) --primIndex;
        ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
      }
    }
    return new Selection(ranges, primIndex);
  }

  function simpleSelection(anchor, head) {
    return new Selection([new Range(anchor, head || anchor)], 0);
  }

  // Most of the external API clips given positions to make sure they
  // actually exist within the document.
  function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1));}
  function clipPos(doc, pos) {
    if (pos.line < doc.first) return Pos(doc.first, 0);
    var last = doc.first + doc.size - 1;
    if (pos.line > last) return Pos(last, getLine(doc, last).text.length);
    return clipToLen(pos, getLine(doc, pos.line).text.length);
  }
  function clipToLen(pos, linelen) {
    var ch = pos.ch;
    if (ch == null || ch > linelen) return Pos(pos.line, linelen);
    else if (ch < 0) return Pos(pos.line, 0);
    else return pos;
  }
  function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size;}
  function clipPosArray(doc, array) {
    for (var out = [], i = 0; i < array.length; i++) out[i] = clipPos(doc, array[i]);
    return out;
  }

  // SELECTION UPDATES

  // The 'scroll' parameter given to many of these indicated whether
  // the new cursor position should be scrolled into view after
  // modifying the selection.

  // If shift is held or the extend flag is set, extends a range to
  // include a given position (and optionally a second position).
  // Otherwise, simply returns the range between the given positions.
  // Used for cursor motion and such.
  function extendRange(doc, range, head, other) {
    if (doc.cm && doc.cm.display.shift || doc.extend) {
      var anchor = range.anchor;
      if (other) {
        var posBefore = cmp(head, anchor) < 0;
        if (posBefore != (cmp(other, anchor) < 0)) {
          anchor = head;
          head = other;
        } else if (posBefore != (cmp(head, other) < 0)) {
          head = other;
        }
      }
      return new Range(anchor, head);
    } else {
      return new Range(other || head, head);
    }
  }

  // Extend the primary selection range, discard the rest.
  function extendSelection(doc, head, other, options) {
    setSelection(doc, new Selection([extendRange(doc, doc.sel.primary(), head, other)], 0), options);
  }

  // Extend all selections (pos is an array of selections with length
  // equal the number of selections)
  function extendSelections(doc, heads, options) {
    for (var out = [], i = 0; i < doc.sel.ranges.length; i++)
      out[i] = extendRange(doc, doc.sel.ranges[i], heads[i], null);
    var newSel = normalizeSelection(out, doc.sel.primIndex);
    setSelection(doc, newSel, options);
  }

  // Updates a single range in the selection.
  function replaceOneSelection(doc, i, range, options) {
    var ranges = doc.sel.ranges.slice(0);
    ranges[i] = range;
    setSelection(doc, normalizeSelection(ranges, doc.sel.primIndex), options);
  }

  // Reset the selection to a single range.
  function setSimpleSelection(doc, anchor, head, options) {
    setSelection(doc, simpleSelection(anchor, head), options);
  }

  // Give beforeSelectionChange handlers a change to influence a
  // selection update.
  function filterSelectionChange(doc, sel) {
    var obj = {
      ranges: sel.ranges,
      update: function(ranges) {
        this.ranges = [];
        for (var i = 0; i < ranges.length; i++)
          this.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
                                     clipPos(doc, ranges[i].head));
      }
    };
    signal(doc, "beforeSelectionChange", doc, obj);
    if (doc.cm) signal(doc.cm, "beforeSelectionChange", doc.cm, obj);
    if (obj.ranges != sel.ranges) return normalizeSelection(obj.ranges, obj.ranges.length - 1);
    else return sel;
  }

  function setSelectionReplaceHistory(doc, sel, options) {
    var done = doc.history.done, last = lst(done);
    if (last && last.ranges) {
      done[done.length - 1] = sel;
      setSelectionNoUndo(doc, sel, options);
    } else {
      setSelection(doc, sel, options);
    }
  }

  // Set a new selection.
  function setSelection(doc, sel, options) {
    setSelectionNoUndo(doc, sel, options);
    addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
  }

  function setSelectionNoUndo(doc, sel, options) {
    if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
      sel = filterSelectionChange(doc, sel);

    var bias = options && options.bias ||
      (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
    setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));

    if (!(options && options.scroll === false) && doc.cm)
      ensureCursorVisible(doc.cm);
  }

  function setSelectionInner(doc, sel) {
    if (sel.equals(doc.sel)) return;

    doc.sel = sel;

    if (doc.cm) {
      doc.cm.curOp.updateInput = doc.cm.curOp.selectionChanged = true;
      signalCursorActivity(doc.cm);
    }
    signalLater(doc, "cursorActivity", doc);
  }

  // Verify that the selection does not partially select any atomic
  // marked ranges.
  function reCheckSelection(doc) {
    setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false), sel_dontScroll);
  }

  // Return a selection that does not partially select any atomic
  // ranges.
  function skipAtomicInSelection(doc, sel, bias, mayClear) {
    var out;
    for (var i = 0; i < sel.ranges.length; i++) {
      var range = sel.ranges[i];
      var newAnchor = skipAtomic(doc, range.anchor, bias, mayClear);
      var newHead = skipAtomic(doc, range.head, bias, mayClear);
      if (out || newAnchor != range.anchor || newHead != range.head) {
        if (!out) out = sel.ranges.slice(0, i);
        out[i] = new Range(newAnchor, newHead);
      }
    }
    return out ? normalizeSelection(out, sel.primIndex) : sel;
  }

  // Ensure a given position is not inside an atomic range.
  function skipAtomic(doc, pos, bias, mayClear) {
    var flipped = false, curPos = pos;
    var dir = bias || 1;
    doc.cantEdit = false;
    search: for (;;) {
      var line = getLine(doc, curPos.line);
      if (line.markedSpans) {
        for (var i = 0; i < line.markedSpans.length; ++i) {
          var sp = line.markedSpans[i], m = sp.marker;
          if ((sp.from == null || (m.inclusiveLeft ? sp.from <= curPos.ch : sp.from < curPos.ch)) &&
              (sp.to == null || (m.inclusiveRight ? sp.to >= curPos.ch : sp.to > curPos.ch))) {
            if (mayClear) {
              signal(m, "beforeCursorEnter");
              if (m.explicitlyCleared) {
                if (!line.markedSpans) break;
                else {--i; continue;}
              }
            }
            if (!m.atomic) continue;
            var newPos = m.find(dir < 0 ? -1 : 1);
            if (cmp(newPos, curPos) == 0) {
              newPos.ch += dir;
              if (newPos.ch < 0) {
                if (newPos.line > doc.first) newPos = clipPos(doc, Pos(newPos.line - 1));
                else newPos = null;
              } else if (newPos.ch > line.text.length) {
                if (newPos.line < doc.first + doc.size - 1) newPos = Pos(newPos.line + 1, 0);
                else newPos = null;
              }
              if (!newPos) {
                if (flipped) {
                  // Driven in a corner -- no valid cursor position found at all
                  // -- try again *with* clearing, if we didn't already
                  if (!mayClear) return skipAtomic(doc, pos, bias, true);
                  // Otherwise, turn off editing until further notice, and return the start of the doc
                  doc.cantEdit = true;
                  return Pos(doc.first, 0);
                }
                flipped = true; newPos = pos; dir = -dir;
              }
            }
            curPos = newPos;
            continue search;
          }
        }
      }
      return curPos;
    }
  }

  // SELECTION DRAWING

  // Redraw the selection and/or cursor
  function drawSelection(cm) {
    var display = cm.display, doc = cm.doc, result = {};
    var curFragment = result.cursors = document.createDocumentFragment();
    var selFragment = result.selection = document.createDocumentFragment();

    for (var i = 0; i < doc.sel.ranges.length; i++) {
      var range = doc.sel.ranges[i];
      var collapsed = range.empty();
      if (collapsed || cm.options.showCursorWhenSelecting)
        drawSelectionCursor(cm, range, curFragment);
      if (!collapsed)
        drawSelectionRange(cm, range, selFragment);
    }

    // Move the hidden textarea near the cursor to prevent scrolling artifacts
    if (cm.options.moveInputWithCursor) {
      var headPos = cursorCoords(cm, doc.sel.primary().head, "div");
      var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect();
      result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
                                          headPos.top + lineOff.top - wrapOff.top));
      result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
                                           headPos.left + lineOff.left - wrapOff.left));
    }

    return result;
  }

  function showSelection(cm, drawn) {
    removeChildrenAndAdd(cm.display.cursorDiv, drawn.cursors);
    removeChildrenAndAdd(cm.display.selectionDiv, drawn.selection);
    if (drawn.teTop != null) {
      cm.display.inputDiv.style.top = drawn.teTop + "px";
      cm.display.inputDiv.style.left = drawn.teLeft + "px";
    }
  }

  function updateSelection(cm) {
    showSelection(cm, drawSelection(cm));
  }

  // Draws a cursor for the given range
  function drawSelectionCursor(cm, range, output) {
    var pos = cursorCoords(cm, range.head, "div", null, null, !cm.options.singleCursorHeightPerLine);

    var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"));
    cursor.style.left = pos.left + "px";
    cursor.style.top = pos.top + "px";
    cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";

    if (pos.other) {
      // Secondary cursor, shown when on a 'jump' in bi-directional text
      var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"));
      otherCursor.style.display = "";
      otherCursor.style.left = pos.other.left + "px";
      otherCursor.style.top = pos.other.top + "px";
      otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
    }
  }

  // Draws the given range as a highlighted selection
  function drawSelectionRange(cm, range, output) {
    var display = cm.display, doc = cm.doc;
    var fragment = document.createDocumentFragment();
    var padding = paddingH(cm.display), leftSide = padding.left, rightSide = display.lineSpace.offsetWidth - padding.right;

    function add(left, top, width, bottom) {
      if (top < 0) top = 0;
      top = Math.round(top);
      bottom = Math.round(bottom);
      fragment.appendChild(elt("div", null, "CodeMirror-selected", "position: absolute; left: " + left +
                               "px; top: " + top + "px; width: " + (width == null ? rightSide - left : width) +
                               "px; height: " + (bottom - top) + "px"));
    }

    function drawForLine(line, fromArg, toArg) {
      var lineObj = getLine(doc, line);
      var lineLen = lineObj.text.length;
      var start, end;
      function coords(ch, bias) {
        return charCoords(cm, Pos(line, ch), "div", lineObj, bias);
      }

      iterateBidiSections(getOrder(lineObj), fromArg || 0, toArg == null ? lineLen : toArg, function(from, to, dir) {
        var leftPos = coords(from, "left"), rightPos, left, right;
        if (from == to) {
          rightPos = leftPos;
          left = right = leftPos.left;
        } else {
          rightPos = coords(to - 1, "right");
          if (dir == "rtl") { var tmp = leftPos; leftPos = rightPos; rightPos = tmp; }
          left = leftPos.left;
          right = rightPos.right;
        }
        if (fromArg == null && from == 0) left = leftSide;
        if (rightPos.top - leftPos.top > 3) { // Different lines, draw top part
          add(left, leftPos.top, null, leftPos.bottom);
          left = leftSide;
          if (leftPos.bottom < rightPos.top) add(left, leftPos.bottom, null, rightPos.top);
        }
        if (toArg == null && to == lineLen) right = rightSide;
        if (!start || leftPos.top < start.top || leftPos.top == start.top && leftPos.left < start.left)
          start = leftPos;
        if (!end || rightPos.bottom > end.bottom || rightPos.bottom == end.bottom && rightPos.right > end.right)
          end = rightPos;
        if (left < leftSide + 1) left = leftSide;
        add(left, rightPos.top, right - left, rightPos.bottom);
      });
      return {start: start, end: end};
    }

    var sFrom = range.from(), sTo = range.to();
    if (sFrom.line == sTo.line) {
      drawForLine(sFrom.line, sFrom.ch, sTo.ch);
    } else {
      var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line);
      var singleVLine = visualLine(fromLine) == visualLine(toLine);
      var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
      var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
      if (singleVLine) {
        if (leftEnd.top < rightStart.top - 2) {
          add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
          add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
        } else {
          add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
        }
      }
      if (leftEnd.bottom < rightStart.top)
        add(leftSide, leftEnd.bottom, null, rightStart.top);
    }

    output.appendChild(fragment);
  }

  // Cursor-blinking
  function restartBlink(cm) {
    if (!cm.state.focused) return;
    var display = cm.display;
    clearInterval(display.blinker);
    var on = true;
    display.cursorDiv.style.visibility = "";
    if (cm.options.cursorBlinkRate > 0)
      display.blinker = setInterval(function() {
        display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden";
      }, cm.options.cursorBlinkRate);
    else if (cm.options.cursorBlinkRate < 0)
      display.cursorDiv.style.visibility = "hidden";
  }

  // HIGHLIGHT WORKER

  function startWorker(cm, time) {
    if (cm.doc.mode.startState && cm.doc.frontier < cm.display.viewTo)
      cm.state.highlight.set(time, bind(highlightWorker, cm));
  }

  function highlightWorker(cm) {
    var doc = cm.doc;
    if (doc.frontier < doc.first) doc.frontier = doc.first;
    if (doc.frontier >= cm.display.viewTo) return;
    var end = +new Date + cm.options.workTime;
    var state = copyState(doc.mode, getStateBefore(cm, doc.frontier));
    var changedLines = [];

    doc.iter(doc.frontier, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function(line) {
      if (doc.frontier >= cm.display.viewFrom) { // Visible
        var oldStyles = line.styles;
        var highlighted = highlightLine(cm, line, state, true);
        line.styles = highlighted.styles;
        var oldCls = line.styleClasses, newCls = highlighted.classes;
        if (newCls) line.styleClasses = newCls;
        else if (oldCls) line.styleClasses = null;
        var ischange = !oldStyles || oldStyles.length != line.styles.length ||
          oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
        for (var i = 0; !ischange && i < oldStyles.length; ++i) ischange = oldStyles[i] != line.styles[i];
        if (ischange) changedLines.push(doc.frontier);
        line.stateAfter = copyState(doc.mode, state);
      } else {
        processLine(cm, line.text, state);
        line.stateAfter = doc.frontier % 5 == 0 ? copyState(doc.mode, state) : null;
      }
      ++doc.frontier;
      if (+new Date > end) {
        startWorker(cm, cm.options.workDelay);
        return true;
      }
    });
    if (changedLines.length) runInOp(cm, function() {
      for (var i = 0; i < changedLines.length; i++)
        regLineChange(cm, changedLines[i], "text");
    });
  }

  // Finds the line to start with when starting a parse. Tries to
  // find a line with a stateAfter, so that it can start with a
  // valid state. If that fails, it returns the line with the
  // smallest indentation, which tends to need the least context to
  // parse correctly.
  function findStartLine(cm, n, precise) {
    var minindent, minline, doc = cm.doc;
    var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100);
    for (var search = n; search > lim; --search) {
      if (search <= doc.first) return doc.first;
      var line = getLine(doc, search - 1);
      if (line.stateAfter && (!precise || search <= doc.frontier)) return search;
      var indented = countColumn(line.text, null, cm.options.tabSize);
      if (minline == null || minindent > indented) {
        minline = search - 1;
        minindent = indented;
      }
    }
    return minline;
  }

  function getStateBefore(cm, n, precise) {
    var doc = cm.doc, display = cm.display;
    if (!doc.mode.startState) return true;
    var pos = findStartLine(cm, n, precise), state = pos > doc.first && getLine(doc, pos-1).stateAfter;
    if (!state) state = startState(doc.mode);
    else state = copyState(doc.mode, state);
    doc.iter(pos, n, function(line) {
      processLine(cm, line.text, state);
      var save = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo;
      line.stateAfter = save ? copyState(doc.mode, state) : null;
      ++pos;
    });
    if (precise) doc.frontier = pos;
    return state;
  }

  // POSITION MEASUREMENT

  function paddingTop(display) {return display.lineSpace.offsetTop;}
  function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight;}
  function paddingH(display) {
    if (display.cachedPaddingH) return display.cachedPaddingH;
    var e = removeChildrenAndAdd(display.measure, elt("pre", "x"));
    var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
    var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)};
    if (!isNaN(data.left) && !isNaN(data.right)) display.cachedPaddingH = data;
    return data;
  }

  // Ensure the lineView.wrapping.heights array is populated. This is
  // an array of bottom offsets for the lines that make up a drawn
  // line. When lineWrapping is on, there might be more than one
  // height.
  function ensureLineHeights(cm, lineView, rect) {
    var wrapping = cm.options.lineWrapping;
    var curWidth = wrapping && cm.display.scroller.clientWidth;
    if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
      var heights = lineView.measure.heights = [];
      if (wrapping) {
        lineView.measure.width = curWidth;
        var rects = lineView.text.firstChild.getClientRects();
        for (var i = 0; i < rects.length - 1; i++) {
          var cur = rects[i], next = rects[i + 1];
          if (Math.abs(cur.bottom - next.bottom) > 2)
            heights.push((cur.bottom + next.top) / 2 - rect.top);
        }
      }
      heights.push(rect.bottom - rect.top);
    }
  }

  // Find a line map (mapping character offsets to text nodes) and a
  // measurement cache for the given line number. (A line view might
  // contain multiple lines when collapsed ranges are present.)
  function mapFromLineView(lineView, line, lineN) {
    if (lineView.line == line)
      return {map: lineView.measure.map, cache: lineView.measure.cache};
    for (var i = 0; i < lineView.rest.length; i++)
      if (lineView.rest[i] == line)
        return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]};
    for (var i = 0; i < lineView.rest.length; i++)
      if (lineNo(lineView.rest[i]) > lineN)
        return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i], before: true};
  }

  // Render a line into the hidden node display.externalMeasured. Used
  // when measurement is needed for a line that's not in the viewport.
  function updateExternalMeasurement(cm, line) {
    line = visualLine(line);
    var lineN = lineNo(line);
    var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
    view.lineN = lineN;
    var built = view.built = buildLineContent(cm, view);
    view.text = built.pre;
    removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
    return view;
  }

  // Get a {top, bottom, left, right} box (in line-local coordinates)
  // for a given character.
  function measureChar(cm, line, ch, bias) {
    return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias);
  }

  // Find a line view that corresponds to the given line number.
  function findViewForLine(cm, lineN) {
    if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
      return cm.display.view[findViewIndex(cm, lineN)];
    var ext = cm.display.externalMeasured;
    if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
      return ext;
  }

  // Measurement can be split in two steps, the set-up work that
  // applies to the whole line, and the measurement of the actual
  // character. Functions like coordsChar, that need to do a lot of
  // measurements in a row, can thus ensure that the set-up work is
  // only done once.
  function prepareMeasureForLine(cm, line) {
    var lineN = lineNo(line);
    var view = findViewForLine(cm, lineN);
    if (view && !view.text)
      view = null;
    else if (view && view.changes)
      updateLineForChanges(cm, view, lineN, getDimensions(cm));
    if (!view)
      view = updateExternalMeasurement(cm, line);

    var info = mapFromLineView(view, line, lineN);
    return {
      line: line, view: view, rect: null,
      map: info.map, cache: info.cache, before: info.before,
      hasHeights: false
    };
  }

  // Given a prepared measurement object, measures the position of an
  // actual character (or fetches it from the cache).
  function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
    if (prepared.before) ch = -1;
    var key = ch + (bias || ""), found;
    if (prepared.cache.hasOwnProperty(key)) {
      found = prepared.cache[key];
    } else {
      if (!prepared.rect)
        prepared.rect = prepared.view.text.getBoundingClientRect();
      if (!prepared.hasHeights) {
        ensureLineHeights(cm, prepared.view, prepared.rect);
        prepared.hasHeights = true;
      }
      found = measureCharInner(cm, prepared, ch, bias);
      if (!found.bogus) prepared.cache[key] = found;
    }
    return {left: found.left, right: found.right,
            top: varHeight ? found.rtop : found.top,
            bottom: varHeight ? found.rbottom : found.bottom};
  }

  var nullRect = {left: 0, right: 0, top: 0, bottom: 0};

  function measureCharInner(cm, prepared, ch, bias) {
    var map = prepared.map;

    var node, start, end, collapse;
    // First, search the line map for the text node corresponding to,
    // or closest to, the target character.
    for (var i = 0; i < map.length; i += 3) {
      var mStart = map[i], mEnd = map[i + 1];
      if (ch < mStart) {
        start = 0; end = 1;
        collapse = "left";
      } else if (ch < mEnd) {
        start = ch - mStart;
        end = start + 1;
      } else if (i == map.length - 3 || ch == mEnd && map[i + 3] > ch) {
        end = mEnd - mStart;
        start = end - 1;
        if (ch >= mEnd) collapse = "right";
      }
      if (start != null) {
        node = map[i + 2];
        if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
          collapse = bias;
        if (bias == "left" && start == 0)
          while (i && map[i - 2] == map[i - 3] && map[i - 1].insertLeft) {
            node = map[(i -= 3) + 2];
            collapse = "left";
          }
        if (bias == "right" && start == mEnd - mStart)
          while (i < map.length - 3 && map[i + 3] == map[i + 4] && !map[i + 5].insertLeft) {
            node = map[(i += 3) + 2];
            collapse = "right";
          }
        break;
      }
    }

    var rect;
    if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
      for (var i = 0; i < 4; i++) { // Retry a maximum of 4 times when nonsense rectangles are returned
        while (start && isExtendingChar(prepared.line.text.charAt(mStart + start))) --start;
        while (mStart + end < mEnd && isExtendingChar(prepared.line.text.charAt(mStart + end))) ++end;
        if (ie && ie_version < 9 && start == 0 && end == mEnd - mStart) {
          rect = node.parentNode.getBoundingClientRect();
        } else if (ie && cm.options.lineWrapping) {
          var rects = range(node, start, end).getClientRects();
          if (rects.length)
            rect = rects[bias == "right" ? rects.length - 1 : 0];
          else
            rect = nullRect;
        } else {
          rect = range(node, start, end).getBoundingClientRect() || nullRect;
        }
        if (rect.left || rect.right || start == 0) break;
        end = start;
        start = start - 1;
        collapse = "right";
      }
      if (ie && ie_version < 11) rect = maybeUpdateRectForZooming(cm.display.measure, rect);
    } else { // If it is a widget, simply get the box for the whole widget.
      if (start > 0) collapse = bias = "right";
      var rects;
      if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
        rect = rects[bias == "right" ? rects.length - 1 : 0];
      else
        rect = node.getBoundingClientRect();
    }
    if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
      var rSpan = node.parentNode.getClientRects()[0];
      if (rSpan)
        rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom};
      else
        rect = nullRect;
    }

    var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top;
    var mid = (rtop + rbot) / 2;
    var heights = prepared.view.measure.heights;
    for (var i = 0; i < heights.length - 1; i++)
      if (mid < heights[i]) break;
    var top = i ? heights[i - 1] : 0, bot = heights[i];
    var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
                  right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
                  top: top, bottom: bot};
    if (!rect.left && !rect.right) result.bogus = true;
    if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot; }

    return result;
  }

  // Work around problem with bounding client rects on ranges being
  // returned incorrectly when zoomed on IE10 and below.
  function maybeUpdateRectForZooming(measure, rect) {
    if (!window.screen || screen.logicalXDPI == null ||
        screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
      return rect;
    var scaleX = screen.logicalXDPI / screen.deviceXDPI;
    var scaleY = screen.logicalYDPI / screen.deviceYDPI;
    return {left: rect.left * scaleX, right: rect.right * scaleX,
            top: rect.top * scaleY, bottom: rect.bottom * scaleY};
  }

  function clearLineMeasurementCacheFor(lineView) {
    if (lineView.measure) {
      lineView.measure.cache = {};
      lineView.measure.heights = null;
      if (lineView.rest) for (var i = 0; i < lineView.rest.length; i++)
        lineView.measure.caches[i] = {};
    }
  }

  function clearLineMeasurementCache(cm) {
    cm.display.externalMeasure = null;
    removeChildren(cm.display.lineMeasure);
    for (var i = 0; i < cm.display.view.length; i++)
      clearLineMeasurementCacheFor(cm.display.view[i]);
  }

  function clearCaches(cm) {
    clearLineMeasurementCache(cm);
    cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
    if (!cm.options.lineWrapping) cm.display.maxLineChanged = true;
    cm.display.lineNumChars = null;
  }

  function pageScrollX() { return window.pageXOffset || (document.documentElement || document.body).scrollLeft; }
  function pageScrollY() { return window.pageYOffset || (document.documentElement || document.body).scrollTop; }

  // Converts a {top, bottom, left, right} box from line-local
  // coordinates into another coordinate system. Context may be one of
  // "line", "div" (display.lineDiv), "local"/null (editor), or "page".
  function intoCoordSystem(cm, lineObj, rect, context) {
    if (lineObj.widgets) for (var i = 0; i < lineObj.widgets.length; ++i) if (lineObj.widgets[i].above) {
      var size = widgetHeight(lineObj.widgets[i]);
      rect.top += size; rect.bottom += size;
    }
    if (context == "line") return rect;
    if (!context) context = "local";
    var yOff = heightAtLine(lineObj);
    if (context == "local") yOff += paddingTop(cm.display);
    else yOff -= cm.display.viewOffset;
    if (context == "page" || context == "window") {
      var lOff = cm.display.lineSpace.getBoundingClientRect();
      yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
      var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
      rect.left += xOff; rect.right += xOff;
    }
    rect.top += yOff; rect.bottom += yOff;
    return rect;
  }

  // Coverts a box from "div" coords to another coordinate system.
  // Context may be "window", "page", "div", or "local"/null.
  function fromCoordSystem(cm, coords, context) {
    if (context == "div") return coords;
    var left = coords.left, top = coords.top;
    // First move into "page" coordinate system
    if (context == "page") {
      left -= pageScrollX();
      top -= pageScrollY();
    } else if (context == "local" || !context) {
      var localBox = cm.display.sizer.getBoundingClientRect();
      left += localBox.left;
      top += localBox.top;
    }

    var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
    return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top};
  }

  function charCoords(cm, pos, context, lineObj, bias) {
    if (!lineObj) lineObj = getLine(cm.doc, pos.line);
    return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context);
  }

  // Returns a box for a given cursor position, which may have an
  // 'other' property containing the position of the secondary cursor
  // on a bidi boundary.
  function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
    lineObj = lineObj || getLine(cm.doc, pos.line);
    if (!preparedMeasure) preparedMeasure = prepareMeasureForLine(cm, lineObj);
    function get(ch, right) {
      var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
      if (right) m.left = m.right; else m.right = m.left;
      return intoCoordSystem(cm, lineObj, m, context);
    }
    function getBidi(ch, partPos) {
      var part = order[partPos], right = part.level % 2;
      if (ch == bidiLeft(part) && partPos && part.level < order[partPos - 1].level) {
        part = order[--partPos];
        ch = bidiRight(part) - (part.level % 2 ? 0 : 1);
        right = true;
      } else if (ch == bidiRight(part) && partPos < order.length - 1 && part.level < order[partPos + 1].level) {
        part = order[++partPos];
        ch = bidiLeft(part) - part.level % 2;
        right = false;
      }
      if (right && ch == part.to && ch > part.from) return get(ch - 1);
      return get(ch, right);
    }
    var order = getOrder(lineObj), ch = pos.ch;
    if (!order) return get(ch);
    var partPos = getBidiPartAt(order, ch);
    var val = getBidi(ch, partPos);
    if (bidiOther != null) val.other = getBidi(ch, bidiOther);
    return val;
  }

  // Used to cheaply estimate the coordinates for a position. Used for
  // intermediate scroll updates.
  function estimateCoords(cm, pos) {
    var left = 0, pos = clipPos(cm.doc, pos);
    if (!cm.options.lineWrapping) left = charWidth(cm.display) * pos.ch;
    var lineObj = getLine(cm.doc, pos.line);
    var top = heightAtLine(lineObj) + paddingTop(cm.display);
    return {left: left, right: left, top: top, bottom: top + lineObj.height};
  }

  // Positions returned by coordsChar contain some extra information.
  // xRel is the relative x position of the input coordinates compared
  // to the found position (so xRel > 0 means the coordinates are to
  // the right of the character position, for example). When outside
  // is true, that means the coordinates lie outside the line's
  // vertical range.
  function PosWithInfo(line, ch, outside, xRel) {
    var pos = Pos(line, ch);
    pos.xRel = xRel;
    if (outside) pos.outside = true;
    return pos;
  }

  // Compute the character position closest to the given coordinates.
  // Input must be lineSpace-local ("div" coordinate system).
  function coordsChar(cm, x, y) {
    var doc = cm.doc;
    y += cm.display.viewOffset;
    if (y < 0) return PosWithInfo(doc.first, 0, true, -1);
    var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
    if (lineN > last)
      return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, true, 1);
    if (x < 0) x = 0;

    var lineObj = getLine(doc, lineN);
    for (;;) {
      var found = coordsCharInner(cm, lineObj, lineN, x, y);
      var merged = collapsedSpanAtEnd(lineObj);
      var mergedPos = merged && merged.find(0, true);
      if (merged && (found.ch > mergedPos.from.ch || found.ch == mergedPos.from.ch && found.xRel > 0))
        lineN = lineNo(lineObj = mergedPos.to.line);
      else
        return found;
    }
  }

  function coordsCharInner(cm, lineObj, lineNo, x, y) {
    var innerOff = y - heightAtLine(lineObj);
    var wrongLine = false, adjust = 2 * cm.display.wrapper.clientWidth;
    var preparedMeasure = prepareMeasureForLine(cm, lineObj);

    function getX(ch) {
      var sp = cursorCoords(cm, Pos(lineNo, ch), "line", lineObj, preparedMeasure);
      wrongLine = true;
      if (innerOff > sp.bottom) return sp.left - adjust;
      else if (innerOff < sp.top) return sp.left + adjust;
      else wrongLine = false;
      return sp.left;
    }

    var bidi = getOrder(lineObj), dist = lineObj.text.length;
    var from = lineLeft(lineObj), to = lineRight(lineObj);
    var fromX = getX(from), fromOutside = wrongLine, toX = getX(to), toOutside = wrongLine;

    if (x > toX) return PosWithInfo(lineNo, to, toOutside, 1);
    // Do a binary search between these bounds.
    for (;;) {
      if (bidi ? to == from || to == moveVisually(lineObj, from, 1) : to - from <= 1) {
        var ch = x < fromX || x - fromX <= toX - x ? from : to;
        var xDiff = x - (ch == from ? fromX : toX);
        while (isExtendingChar(lineObj.text.charAt(ch))) ++ch;
        var pos = PosWithInfo(lineNo, ch, ch == from ? fromOutside : toOutside,
                              xDiff < -1 ? -1 : xDiff > 1 ? 1 : 0);
        return pos;
      }
      var step = Math.ceil(dist / 2), middle = from + step;
      if (bidi) {
        middle = from;
        for (var i = 0; i < step; ++i) middle = moveVisually(lineObj, middle, 1);
      }
      var middleX = getX(middle);
      if (middleX > x) {to = middle; toX = middleX; if (toOutside = wrongLine) toX += 1000; dist = step;}
      else {from = middle; fromX = middleX; fromOutside = wrongLine; dist -= step;}
    }
  }

  var measureText;
  // Compute the default text height.
  function textHeight(display) {
    if (display.cachedTextHeight != null) return display.cachedTextHeight;
    if (measureText == null) {
      measureText = elt("pre");
      // Measure a bunch of lines, for browsers that compute
      // fractional heights.
      for (var i = 0; i < 49; ++i) {
        measureText.appendChild(document.createTextNode("x"));
        measureText.appendChild(elt("br"));
      }
      measureText.appendChild(document.createTextNode("x"));
    }
    removeChildrenAndAdd(display.measure, measureText);
    var height = measureText.offsetHeight / 50;
    if (height > 3) display.cachedTextHeight = height;
    removeChildren(display.measure);
    return height || 1;
  }

  // Compute the default character width.
  function charWidth(display) {
    if (display.cachedCharWidth != null) return display.cachedCharWidth;
    var anchor = elt("span", "xxxxxxxxxx");
    var pre = elt("pre", [anchor]);
    removeChildrenAndAdd(display.measure, pre);
    var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
    if (width > 2) display.cachedCharWidth = width;
    return width || 10;
  }

  // OPERATIONS

  // Operations are used to wrap a series of changes to the editor
  // state in such a way that each change won't have to update the
  // cursor and display (which would be awkward, slow, and
  // error-prone). Instead, display updates are batched and then all
  // combined and executed at once.

  var operationGroup = null;

  var nextOpId = 0;
  // Start a new operation.
  function startOperation(cm) {
    cm.curOp = {
      cm: cm,
      viewChanged: false,      // Flag that indicates that lines might need to be redrawn
      startHeight: cm.doc.height, // Used to detect need to update scrollbar
      forceUpdate: false,      // Used to force a redraw
      updateInput: null,       // Whether to reset the input textarea
      typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
      changeObjs: null,        // Accumulated changes, for firing change events
      cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
      cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
      selectionChanged: false, // Whether the selection needs to be redrawn
      updateMaxLine: false,    // Set when the widest line needs to be determined anew
      scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
      scrollToPos: null,       // Used to scroll to a specific position
      id: ++nextOpId           // Unique ID
    };
    if (operationGroup) {
      operationGroup.ops.push(cm.curOp);
    } else {
      cm.curOp.ownsGroup = operationGroup = {
        ops: [cm.curOp],
        delayedCallbacks: []
      };
    }
  }

  function fireCallbacksForOps(group) {
    // Calls delayed callbacks and cursorActivity handlers until no
    // new ones appear
    var callbacks = group.delayedCallbacks, i = 0;
    do {
      for (; i < callbacks.length; i++)
        callbacks[i]();
      for (var j = 0; j < group.ops.length; j++) {
        var op = group.ops[j];
        if (op.cursorActivityHandlers)
          while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
            op.cursorActivityHandlers[op.cursorActivityCalled++](op.cm);
      }
    } while (i < callbacks.length);
  }

  // Finish an operation, updating the display and signalling delayed events
  function endOperation(cm) {
    var op = cm.curOp, group = op.ownsGroup;
    if (!group) return;

    try { fireCallbacksForOps(group); }
    finally {
      operationGroup = null;
      for (var i = 0; i < group.ops.length; i++)
        group.ops[i].cm.curOp = null;
      endOperations(group);
    }
  }

  // The DOM updates done when an operation finishes are batched so
  // that the minimum number of relayouts are required.
  function endOperations(group) {
    var ops = group.ops;
    for (var i = 0; i < ops.length; i++) // Read DOM
      endOperation_R1(ops[i]);
    for (var i = 0; i < ops.length; i++) // Write DOM (maybe)
      endOperation_W1(ops[i]);
    for (var i = 0; i < ops.length; i++) // Read DOM
      endOperation_R2(ops[i]);
    for (var i = 0; i < ops.length; i++) // Write DOM (maybe)
      endOperation_W2(ops[i]);
    for (var i = 0; i < ops.length; i++) // Read DOM
      endOperation_finish(ops[i]);
  }

  function endOperation_R1(op) {
    var cm = op.cm, display = cm.display;
    if (op.updateMaxLine) findMaxLine(cm);

    op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
      op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
                         op.scrollToPos.to.line >= display.viewTo) ||
      display.maxLineChanged && cm.options.lineWrapping;
    op.update = op.mustUpdate &&
      new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate);
  }

  function endOperation_W1(op) {
    op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
  }

  function endOperation_R2(op) {
    var cm = op.cm, display = cm.display;
    if (op.updatedDisplay) updateHeightsInViewport(cm);

    op.barMeasure = measureForScrollbars(cm);

    // If the max line changed since it was last measured, measure it,
    // and ensure the document's width matches it.
    // updateDisplay_W2 will use these properties to do the actual resizing
    if (display.maxLineChanged && !cm.options.lineWrapping) {
      op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
      op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo +
                                  scrollerCutOff - display.scroller.clientWidth);
    }

    if (op.updatedDisplay || op.selectionChanged)
      op.newSelectionNodes = drawSelection(cm);
  }

  function endOperation_W2(op) {
    var cm = op.cm;

    if (op.adjustWidthTo != null) {
      cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
      if (op.maxScrollLeft < cm.doc.scrollLeft)
        setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true);
      cm.display.maxLineChanged = false;
    }

    if (op.newSelectionNodes)
      showSelection(cm, op.newSelectionNodes);
    if (op.updatedDisplay)
      setDocumentHeight(cm, op.barMeasure);
    if (op.updatedDisplay || op.startHeight != cm.doc.height)
      updateScrollbars(cm, op.barMeasure);

    if (op.selectionChanged) restartBlink(cm);

    if (cm.state.focused && op.updateInput)
      resetInput(cm, op.typing);
  }

  function endOperation_finish(op) {
    var cm = op.cm, display = cm.display, doc = cm.doc;

    if (op.adjustWidthTo != null && Math.abs(op.barMeasure.scrollWidth - cm.display.scroller.scrollWidth) > 1)
      updateScrollbars(cm);

    if (op.updatedDisplay) postUpdateDisplay(cm, op.update);

    // Abort mouse wheel delta measurement, when scrolling explicitly
    if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
      display.wheelStartX = display.wheelStartY = null;

    // Propagate the scroll position to the actual DOM scroller
    if (op.scrollTop != null && (display.scroller.scrollTop != op.scrollTop || op.forceScroll)) {
      var top = Math.max(0, Math.min(display.scroller.scrollHeight - display.scroller.clientHeight, op.scrollTop));
      display.scroller.scrollTop = display.scrollbarV.scrollTop = doc.scrollTop = top;
    }
    if (op.scrollLeft != null && (display.scroller.scrollLeft != op.scrollLeft || op.forceScroll)) {
      var left = Math.max(0, Math.min(display.scroller.scrollWidth - display.scroller.clientWidth, op.scrollLeft));
      display.scroller.scrollLeft = display.scrollbarH.scrollLeft = doc.scrollLeft = left;
      alignHorizontally(cm);
    }
    // If we need to scroll a specific position into view, do so.
    if (op.scrollToPos) {
      var coords = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
                                     clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
      if (op.scrollToPos.isCursor && cm.state.focused) maybeScrollWindow(cm, coords);
    }

    // Fire events for markers that are hidden/unidden by editing or
    // undoing
    var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
    if (hidden) for (var i = 0; i < hidden.length; ++i)
      if (!hidden[i].lines.length) signal(hidden[i], "hide");
    if (unhidden) for (var i = 0; i < unhidden.length; ++i)
      if (unhidden[i].lines.length) signal(unhidden[i], "unhide");

    if (display.wrapper.offsetHeight)
      doc.scrollTop = cm.display.scroller.scrollTop;

    // Apply workaround for two webkit bugs
    if (op.updatedDisplay && webkit) {
      if (cm.options.lineWrapping)
        checkForWebkitWidthBug(cm, op.barMeasure); // (Issue #2420)
      if (op.barMeasure.scrollWidth > op.barMeasure.clientWidth &&
          op.barMeasure.scrollWidth < op.barMeasure.clientWidth + 1 &&
          !hScrollbarTakesSpace(cm))
        updateScrollbars(cm); // (Issue #2562)
    }

    // Fire change events, and delayed event handlers
    if (op.changeObjs)
      signal(cm, "changes", cm, op.changeObjs);
  }

  // Run the given function in an operation
  function runInOp(cm, f) {
    if (cm.curOp) return f();
    startOperation(cm);
    try { return f(); }
    finally { endOperation(cm); }
  }
  // Wraps a function in an operation. Returns the wrapped function.
  function operation(cm, f) {
    return function() {
      if (cm.curOp) return f.apply(cm, arguments);
      startOperation(cm);
      try { return f.apply(cm, arguments); }
      finally { endOperation(cm); }
    };
  }
  // Used to add methods to editor and doc instances, wrapping them in
  // operations.
  function methodOp(f) {
    return function() {
      if (this.curOp) return f.apply(this, arguments);
      startOperation(this);
      try { return f.apply(this, arguments); }
      finally { endOperation(this); }
    };
  }
  function docMethodOp(f) {
    return function() {
      var cm = this.cm;
      if (!cm || cm.curOp) return f.apply(this, arguments);
      startOperation(cm);
      try { return f.apply(this, arguments); }
      finally { endOperation(cm); }
    };
  }

  // VIEW TRACKING

  // These objects are used to represent the visible (currently drawn)
  // part of the document. A LineView may correspond to multiple
  // logical lines, if those are connected by collapsed ranges.
  function LineView(doc, line, lineN) {
    // The starting line
    this.line = line;
    // Continuing lines, if any
    this.rest = visualLineContinued(line);
    // Number of logical lines in this visual line
    this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
    this.node = this.text = null;
    this.hidden = lineIsHidden(doc, line);
  }

  // Create a range of LineView objects for the given lines.
  function buildViewArray(cm, from, to) {
    var array = [], nextPos;
    for (var pos = from; pos < to; pos = nextPos) {
      var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
      nextPos = pos + view.size;
      array.push(view);
    }
    return array;
  }

  // Updates the display.view data structure for a given change to the
  // document. From and to are in pre-change coordinates. Lendiff is
  // the amount of lines added or subtracted by the change. This is
  // used for changes that span multiple lines, or change the way
  // lines are divided into visual lines. regLineChange (below)
  // registers single-line changes.
  function regChange(cm, from, to, lendiff) {
    if (from == null) from = cm.doc.first;
    if (to == null) to = cm.doc.first + cm.doc.size;
    if (!lendiff) lendiff = 0;

    var display = cm.display;
    if (lendiff && to < display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers > from))
      display.updateLineNumbers = from;

    cm.curOp.viewChanged = true;

    if (from >= display.viewTo) { // Change after
      if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
        resetView(cm);
    } else if (to <= display.viewFrom) { // Change before
      if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
        resetView(cm);
      } else {
        display.viewFrom += lendiff;
        display.viewTo += lendiff;
      }
    } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
      resetView(cm);
    } else if (from <= display.viewFrom) { // Top overlap
      var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
      if (cut) {
        display.view = display.view.slice(cut.index);
        display.viewFrom = cut.lineN;
        display.viewTo += lendiff;
      } else {
        resetView(cm);
      }
    } else if (to >= display.viewTo) { // Bottom overlap
      var cut = viewCuttingPoint(cm, from, from, -1);
      if (cut) {
        display.view = display.view.slice(0, cut.index);
        display.viewTo = cut.lineN;
      } else {
        resetView(cm);
      }
    } else { // Gap in the middle
      var cutTop = viewCuttingPoint(cm, from, from, -1);
      var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
      if (cutTop && cutBot) {
        display.view = display.view.slice(0, cutTop.index)
          .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
          .concat(display.view.slice(cutBot.index));
        display.viewTo += lendiff;
      } else {
        resetView(cm);
      }
    }

    var ext = display.externalMeasured;
    if (ext) {
      if (to < ext.lineN)
        ext.lineN += lendiff;
      else if (from < ext.lineN + ext.size)
        display.externalMeasured = null;
    }
  }

  // Register a change to a single line. Type must be one of "text",
  // "gutter", "class", "widget"
  function regLineChange(cm, line, type) {
    cm.curOp.viewChanged = true;
    var display = cm.display, ext = cm.display.externalMeasured;
    if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
      display.externalMeasured = null;

    if (line < display.viewFrom || line >= display.viewTo) return;
    var lineView = display.view[findViewIndex(cm, line)];
    if (lineView.node == null) return;
    var arr = lineView.changes || (lineView.changes = []);
    if (indexOf(arr, type) == -1) arr.push(type);
  }

  // Clear the view.
  function resetView(cm) {
    cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
    cm.display.view = [];
    cm.display.viewOffset = 0;
  }

  // Find the view element corresponding to a given line. Return null
  // when the line isn't visible.
  function findViewIndex(cm, n) {
    if (n >= cm.display.viewTo) return null;
    n -= cm.display.viewFrom;
    if (n < 0) return null;
    var view = cm.display.view;
    for (var i = 0; i < view.length; i++) {
      n -= view[i].size;
      if (n < 0) return i;
    }
  }

  function viewCuttingPoint(cm, oldN, newN, dir) {
    var index = findViewIndex(cm, oldN), diff, view = cm.display.view;
    if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
      return {index: index, lineN: newN};
    for (var i = 0, n = cm.display.viewFrom; i < index; i++)
      n += view[i].size;
    if (n != oldN) {
      if (dir > 0) {
        if (index == view.length - 1) return null;
        diff = (n + view[index].size) - oldN;
        index++;
      } else {
        diff = n - oldN;
      }
      oldN += diff; newN += diff;
    }
    while (visualLineNo(cm.doc, newN) != newN) {
      if (index == (dir < 0 ? 0 : view.length - 1)) return null;
      newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
      index += dir;
    }
    return {index: index, lineN: newN};
  }

  // Force the view to cover a given range, adding empty view element
  // or clipping off existing ones as needed.
  function adjustView(cm, from, to) {
    var display = cm.display, view = display.view;
    if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
      display.view = buildViewArray(cm, from, to);
      display.viewFrom = from;
    } else {
      if (display.viewFrom > from)
        display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view);
      else if (display.viewFrom < from)
        display.view = display.view.slice(findViewIndex(cm, from));
      display.viewFrom = from;
      if (display.viewTo < to)
        display.view = display.view.concat(buildViewArray(cm, display.viewTo, to));
      else if (display.viewTo > to)
        display.view = display.view.slice(0, findViewIndex(cm, to));
    }
    display.viewTo = to;
  }

  // Count the number of lines in the view whose DOM representation is
  // out of date (or nonexistent).
  function countDirtyView(cm) {
    var view = cm.display.view, dirty = 0;
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i];
      if (!lineView.hidden && (!lineView.node || lineView.changes)) ++dirty;
    }
    return dirty;
  }

  // INPUT HANDLING

  // Poll for input changes, using the normal rate of polling. This
  // runs as long as the editor is focused.
  function slowPoll(cm) {
    if (cm.display.pollingFast) return;
    cm.display.poll.set(cm.options.pollInterval, function() {
      readInput(cm);
      if (cm.state.focused) slowPoll(cm);
    });
  }

  // When an event has just come in that is likely to add or change
  // something in the input textarea, we poll faster, to ensure that
  // the change appears on the screen quickly.
  function fastPoll(cm) {
    var missed = false;
    cm.display.pollingFast = true;
    function p() {
      var changed = readInput(cm);
      if (!changed && !missed) {missed = true; cm.display.poll.set(60, p);}
      else {cm.display.pollingFast = false; slowPoll(cm);}
    }
    cm.display.poll.set(20, p);
  }

  // This will be set to an array of strings when copying, so that,
  // when pasting, we know whatkFind of selections the cpised tex,
  // hasmade/ out oy.
  var pasCcpised = null;

  // Read input from the textarea, and update th/ documend to matc.

  // When something sf selecred, it isepresent in the textarea, ane
  // selecref (uless, it ishunge, in which ause asplceh olers is
  // usee). Whenanothing sf selecred, the Cursorsicts fcter reviouslye
  // seng text  can be empt)n, which sf itoded ir rev Input(wpe muse
  // not reset the textare/ when typine, bca use that breas IME)w.
  function readInput(cm) {
    var ipuxt = cm.display ipux,r rev Input = cm.display rev Inpuy, doc = cm.doc;
    // sincetThis in called  *lot*,  try to ail/ outhas cheaplyas;
    //posisible when it iscClear tatnanothingh.appesedt hawSelectio;
    // will be the cse/ when thare ps alott of text in the textarea;
    // in which ause reahing ctsrvaueh would beexppesgivo.
    if !(cm.state.focused ||  hawSelectio( ipuxt) &&! rev Inpu() ||is ReaOnlly(cmm || cm.options.diaibleInput)
      return false;
    // Sen paset handles for tods on thefakedLpasCCharkludge{
    if (cm.state paseIncoominr && cm.state.akedLpasCChaN) {
      Inpu.rvaueh=  Inpu.rvaue.sub strine(0, Inpu.rvaue..length - 1);
      cm.state.akedLpasCChad = false;
    }
    var.text = Inpu.rvauee;
    //Ifnanothing!change,o ailo.
    if ntext == rev Input && !cm somethinSselecre(1)) return false;
    // Work around nonsengical selection resething inIE9/10a, ane
    // i expliaible appeatance of riveate are/unicnode charactes io;
    // somekey/ comoes inMac (#2689)o.
    if (ie && ie_version >=9r && cm.display ipuxHhawSelectiot ==r.text ||
       mac  &&/[\uf700-\uf7ff]/.telst((ext() {
      resetInput(c1);
      return false;
    }

    var ithrOp =! cm.curOw;
    if  ithrO)  startOperation(cm);
    cm.display.hifht = false;.
    if ntex. charCdeAt(0e) ==0x200b  &&.doc.Rel  = cm.display.elFsorContexMenu) &&! rev Inpu(;
      rev Input ="\u200b"e;
    // Find the part of the input that is actuaplyanew
    var amei = 0,lt = Math.in( rev Input.length, text.length;}
    while  amei< ll && rev Input charCdeAt( amee) ==ntex. charCdeAt( amee)) + ame;{
    var insersed =  ext.slice ameeh, texLlines= ispixLline( insersee);

    //Wwhen pahingNf lines i toNf selection,r insere one lineOpef selectio{
    var multPpaset = null;
    if (cm.state paseIncoominr &&.doc.Re. ranges.length > 1e {
      if  pasCcpised && pasCcpise.join("\n"e) == insersee|
       mmultPpaset =.doc.Re. ranges.length%& pasCcpise..length == 0 && ma  pasCcpise, ispixLline));
      else if  texLline..length ==.doc.Re. ranges.lengte|
       mmultPpaset = ma  texLlinel, functionl() { return[l];  });
    }

    //Nnormalbehavioor is to insere the iew text i to _veyf selectio{
    for (var i =.doc.Re. ranges.length - 1; n >= 0; --)) {
      var hange =.doc.Re. rangew[i];
      var from = range fro(j), to = rangeto]();
      //yHandld deeition
      fe  amei<  rev Input.lengte|
        from =pPos.from.linm, fro.(ch -( rev Input.length - amee));
      //yHandldcovewWrit;
      else if (cm.statecovewWrit0 && range empt()t && !cm state paseIncoomine|
        to =pPos.to.lin0, Math.min getLine(doc,.to.line).text.length, o.(ch+ llst((exLline)t.lengte1);
      var.updateInpu  = cm.curOp.updateInpu);
      var changEevent=e {fro:, from, t:, to, (ex: mmultPpaset? mmultPpase[ih%&mmultPpaset.lengt1] : texLlinel|
                        origin: (cm.state paseIncoominr?= "paset" :(cm.statecutIncoominr?= cutt" : + inpu"{};
     makeeChange(cm.doc, changEevens);
      signaLtatar(cm," inpu Reas", cm, changEevens);
      // When an'selecric't characterhis inserse,r mrmediately riggver are indntn
      fe  insersed && !cm state paseIncoomind && cm.optionsselecricmChars &&
          cm.optionssmparIindnt0 && rangechend.ch<= 10s &&
         (!it || doc.Re. rangew[s - 1]chend line!=& rangechend.line+) {
        varmnode = cm geMCdeAt( rangechen));
        var und = changEnd( changEevens);
        if (NodeselecricmChar+) {
          for (var j = 0; j <(NodeselecricmChars.length; j++|
            fe  inserse.(indexOf(NodeselecricmChars.charAtj)f) >-1+) {
              indntrLine(cm, uno.lin0,"smpar"s);
              break;
           };
        } else if (Nodeselecric Inpu() {
          if (Nodeselecric Inpu.telst getLine(doc, uno.line).text.slice(0,eund.c))+|
            indntrLine(cm, uno.lin0,"smpar"s);
       };
     ;}
    }
    ensursCursoVvisibln(cm);
    cm.curOp.updateInpuj =.updateInpu);
    cm.curOp typind = true;

    // Dsn't leave long text in the textaread since itmakes, frether.pollin; slo.
    if ntex..length > 00 0 ||ntex.(indexOf"\n"e) >-1+) Inpu.rvaueh=  cm.display rev Input =""e;
    else cm.display rev Input =tText;
    if  ithrO)  endOperation(cm);
    cm state paseIncoomind=:(cm.statecutIncoominr = false;
    return true;
  }

  // Reset the input oy correspond to the selection (or to be emptt,
  // when not typindaund nothing sf selecre)

  function resetInput(cm,.typing) {
    var mnimval, selecred, doc = cm.doc;
    if (cm.somethinSselecre(1)) {
      cm.display rev Input =""e;
      var hange =.doc.Re. rimpay]();
      mnimvae =hasCcpyEevent &&
         rangeto](d line-= range fro(jo.line = 10s ||  selecref = cm gewSelectio())..length > 00 1);
      var Content=e mnimvae?= -t" : selecref || cm gewSelectio();{
      cm.display Inpu.rvaueh=  Conten);
      if (cm.state.focused) SelectInput(cm.display Inpum);
      if (ie && ie_version >=9)& cm.display ipuxHhawSelectiot   Conten);
    } else if !.typing) {
      cm.display rev Input = cm.display Inpu.rvaueh= ""e;
      if (ie && ie_version >=9)& cm.display ipuxHhawSelectiot   null;
    }
    cm.display Iac.cudateSelectiot   mnimvae;
  }

  function focudInput(cm) {
    if (cm.optionsrReaOnlle!=&"no Curso"n && (mobhile ||ractveElt()t != cm.display Inpum){
      cm.display Inpu. focu(g);
  }

  function easureFocu((cm) {
    if !(cm.state.focuse() { focudInput(cm;e oeFocu((cm;  }
  }

  functionis ReaOnlly(cmm{;
    return(cm.optionsrReaOnlle || cm.doccantEdict;
  }

  //EVENUT HANDERNS

  //Atteach the icessnary event handlere when nitialsizino the editor
  function registeEevenyHandlert(cm) {
    vardy = cm.display;
   io(dy.scrolle0," mousdowan", operation(cm,onMmousDowae1);
    // olersIE'is will not fireae secon  mousdowae for adouiblecslik.
    if (ie && ie_version<=  1)
     io(dy.scrolle0,"dblcslikn", operation(cm, functione0) {
        if  signaDOMEevene(cm, )t) return;
   
    varpPos = powFroMmouse(cm, ));
        if !pPos || slikInGguttee(cm, )s || evenIinWigeut(cm.displam, )t) return;
   
   e_ revvenDdefaul(e));
        varwordy = cm finWordrAt pos);
        ex enwSelection(cm.doc,word. anchoc,word.chen));
     }e1);
    else
     io(dy.scrolle0,"dblcslikn", functione0)   signaDOMEevene(cm, )s || _ revvenDdefaul(e))  });
    // P event normal selection in the editor(wpehHandldcur oawn)
   io(dy.linsSpac0,"sselec starn", functione0) ;
      if ! evenIinWigeutdm, )t)e_ revvenDdefaul(e));
    });
    //Ssome browsers fire Contexmenu)* fcte*, opining themenu, at;
    // whichpPoin, wecan'st mssr ithe itany todm. Context enu)is;
    //hHandled ironMmousDowas for thsme browsero.
    if !(apctureRighCslik) io(dy.scrolle0," Contexmenun", functione0) onrContexMenue(cm, ))}e);

    //Syncn scrolling between.akee scrollbaks andrRele scrolaibl

    //taread ensurevViewporg sf.update, when scrollin.;
   io(dy.scrolle0,".scrol"l, function() {
      if (y.scroller.clientHeigh0) {
        setScrolgTop(cd, y.scroller.scrollTos);
        setScrollLeft(cm, y.scroller.scrollLeft, true);
        signal(cm, .scrol"l,(cm);
      }
    )y;
   io(dy.scrollbar0,".scrol"l, function() {
      if (y.scroller.clientHeigh0) setScrolgTop(cd, y.scrollbarV.scrollTo));
    });
   io(dy.scrollbaH0,".scrol"l, function() {
      if (y.scroller.clientHeigh0) setScrollLeft(cm, y.scrollbarH.scrollLef));
    });

    //Lxisted to wheel events iroorder to ry, and update th/vViewporg on ime.;
   io(dy.scrolle0," mous wheen", functione0 oneScrollwheee(cm, ))}e);
   io(dy.scrolle0,"DOMMmousSscrol"l, functione0 oneScrollwheee(cm, ))}e);;
    // P eventcslikes in the scrollbaks fromkiolling focu{
    function reFocu(0)   if (cm.state.focused) StTimeoputbfind focudInpul,(cm,: 0)  }
   io(dy.scrollbaH0," mousdowan", reFocu)y;
   io(dy.scrollbar0," mousdowan", reFocu)y;
    // P event.wrappes from _ven scrollin;
   io(dy.wrappe0,".scrol"l, function()  dy.wrappeV.scrollTop = y.wrappeV.scrollLeft =0;  });

   io(dy ipux,r"keyupn", functione0)  onKeyUp. cale(cm, ))  });
   io(dy ipux,r" inpu"l, function() {
      if (ie && ie_version >=9r && cm.display ipuxHhawSelectio)& cm.display ipuxHhawSelectiot   null;
    n fastPoll(cm);
    });
   io(dy ipux,r"keydowan", operation(cm,onKeyDowae1);
   io(dy ipux,r"keyepresn", operation(cm,onKeyPprese1);
   io(dy ipux,r" focu"h, bind oeFocul,(cm1);
   io(dy ipux,r"blur"h, bind oBlurl,(cm1);{
    functiondrag_ne0) ;
      if ! signaDOMEevene(cm, )t)e_stTope));
    {
    if (cm.optionsdragDroup) {
      o(dy.scrolle0,"drag starn", functione0 onDraglStare(cm, ))}e);
      o(dy.scrolle0,"dragentter",drag_e);
      o(dy.scrolle0,"dragcover",drag_e);
      o(dy.scrolle0,"dropn", operation(cm,onDroup));
    {
    o(dy.scrolle0,""paset", functione0) ;
      if  evenIinWigeutdm, )t) return;
   
  cm state paseIncoomind=: true;
      focudInput(cm;;
    n fastPoll(cm);
    });
   io(dy ipux,r""paset", function0) ;
      // Workaround for webkit bu https:// bug. webki.org/ sho_ bu.cgi?id=90206;
      //Addr a chrs to the ind of textare/ beforn pasetoc.cu, so tha;
      // selectiondoeisn't span to the ind of textare.;
      if  webkit && !cm state.akedLpasCChad && ( new date-  cm state pasMmiddlDowas< 200e+) {
        var starp = y Inpu. selectiolStar,r und = y Inpu. selectioEund;
       dy Inpu.rvaueh+=&"$"d;
        // The selection und needs to beeset beforntThe starm,oethewiuse thre;
        // can bean/ intermediatenon- empty selection between thr twn, whic;
        // cancoverside the middl-cslikn pasetbuffber en liuxs and a use te;
        // wron othing togeun pased.;
       dy Inpu. selectioEund =eund;
       dy Inpu. selectiolStars= iStard;
        cm.state.akedLpasCChad = true;
      ;
   
  cm state paseIncoomind=: true;
      fastPoll(cm);
    });{
    function preparCcpyCutne0) ;
      if (cm.somethinSselecre(1)) {
      r pasCcpised = cm gewSelectios(e);
        if (y Iac.cudateSelectio() {
         dy rev Input =""e;
         dy Iac.cudateSelectiot   false;
         dy Inpu.rvaueh=& pasCcpise.join("\n"ee;
          SelectInputdy Inpum);
       };
     ;} else {
        var.text = [],rhanges = [);
        for (var i = 0; i < cm.doc.Re. ranges.length; i++) {
          var.line = cm.doc.Re. rangew[i]chend.lin;{
          var.linRhange ={ ancho:= Pos(line,0m,:chen:= Pos(linN + e,0m};{
          ranges.push.linRhangee;
         ntex..push(cm geRhangh.linRhang. anchoc,.linRhang.chen)m);
       };
        if  p tyde == cutt+) {
         (cm.gewSelectios(rhanges, null, el_dConeScroll);
       }} else {
         dy rev Input =""e;
         dy Inpu.rvaueh=&ntex.join("\n"ee;
          SelectInputdy Inpum);
       };
      r pasCcpised =tText;
     };
      if  p tyde == cutt+)(cm.statecutIncoominr = true;
    {
    o(dy ipux,r"cpu"l, preparCcpyCut});
   io(dy ipux,r" cop"l, preparCcpyCut});;
    //fNeedeg tohHandldTabekey/ inKHTML{
    if khtml) io(dy.size0," mousupn", function0) ;
      if ractveElt()t= = y Inpu) dy Inpu.blur]();
      focudInput(cm;;
    });
  }

  //yCalled when the windol resiets
  functiononRresiet(cm) {
    //Meight bear.texts cating operation,cClear.size.cachro.
    vardy = cm.display;
   dy.cachedCharWidth =dy.cachedTextHeight =dy.cacheP addinHt   null;
   (cm.gewsiet});
  }

  //MOUSE/EVENUS}

  // Return trud when the given mouse event happesen in  "widges
  function evenIinWigeutddisplam, )) {
    for (varot  e_Stageut )) (n !=(display.wrappe;rot  n.eparnxtNod0) ;
      if !ns || .sigforEevents || .eparnxtNodt= = display.sized &&(n !=(displayemovr)  return true;
    }
  }

  //Ggivenan mouse even0, fins the corresponding positio./Ifnlibperll
  // is false,it  checre whethera "gutted or scrollba/ hascslikedt,
  // andrReturns null if it wa.  fotRecg sf.sted by rechanulaor
  // selection,r and rties toestimeate a character positioneiven tor
  // coordinatet byoins the.right of thentex.s
  function powFroMmouse(cm, ,nlibperl,  fotReco) {
    var display = cm.displac;
    if !libperl)) {
      var tageut  e_Stageut ));
      if  tageut  = display.scrollbar0 ||ntageut  = display.scrollbaVm ||
         ntageut  = display.scrollbaFiolle0 ||ntageut  = display"gutteFiolle)) return null;
    }
    var x, , isacew = display.linsSpacr.getBoundingClientRect(y;
    //Failrs u prdiechblty o IE[67]d when mouse sfdragngedkaround quickly.
    try {ex =re.clienoX -isacep.left yx =re.clienYX -isacep top  }
    matc ne0)   return null  }
    var coords = coordeChar(cm, x, ),= line;
    if (fotRecg && coord.xRRel  =1n && .line = getLine(cm.doc, coord..line).tex)..length == coord.chs) {
      var clxDiff = counColumn( line, lint.length,(cm.optionschbSsize) - lint.lengtn;
   
  coords = Pos coord..lin,= Math.max(0, Matharoun((ex -p addinHt(cm.displa)t.left) / charWidth(cm.displa)e) - clxDif"));
    }
    return(coord);
  }

  //An mousedowae can beaa singlecslik,adouiblecslikt, ttiplecslikt

  // start of selectiondrag,/ start of.textdrag,/ new Curso

  //(ctrl-cslik),y rechandld ragf rlt- rag)s, orxw in
  // middl-cslik- pase. Ore itmeight bearcsliknoen somethingwet shoul

  // not intefhare ith,n such ps a scrollba/or "widgen.
  function nMmousDowane0) ;
    if  signaDOMEevene(this, )t) return;
    var cm = thim, display = cm.display;
   .display.hifht =ey.hifhKeye;.
    if  evenIinWigeutddisplam, )0) ;
      if ! webkit) {
     
  //Brtifely turn offdragnability), toCalnow Wigeues to d{
     
  // normaldragnion othins.;
       ddisplay.scrollerdragnabdle = false;
        StTimeoput function0{ddisplay.scrollerdragnabdle = true},> 00)t;
     };
      return;
    {
    if (slikInGguttee(cm, )t) return;
    var starp = powFroMmouse(cm, ));
    windo. focu(g);;
   s ittc ne_bgutione0m) {
    ause1:;
      if  star+|
       .lefBgutioDowan(cm, ,n star+t;
      else if e_Stageut )t  = display.scrolle)|
       e_ revvenDdefaul(e));
      break;
    ause2:;
      if  webkit) cm state pasMmiddlDowas= + new dat;;
      if  star+  ex enwSelection(cm.doc, star+t;
      StTimeoputbfind focudInpul,(cm,:20)t;
     e_ revvenDdefaul(e));
      break;
    ause3:;
      if (apctureRighCslik) iorContexMenue(cm, ));
      break;
    }
  }

  var pasCslikt, pasDouiblCslik;.
  function.lefBgutioDowan(cm, ,n star+) {
    StTimeoputbfind easureFocul,(cm,: 0)}

    varknow= + new datr, type;
    if  pasDouiblCslikd && pasDouiblCslik. ime >rknow- 410s &,(cp  pasDouiblCslik. po,n star+) == t) {
      tyde  " ttipl"e;
    } else if  pasCslikd && pasCslik. ime >rknow- 410s &,(cp  pasCslik. po,n star+) == t) {
      tyde  "douibl"e;
      pasDouiblCslikd= { ime:rkno), po:n star}e;
    } else {
      tyde  " singl"e;
      pasCslikd= { ime:rkno), po:n star}e;
    }

    var.Rel = cm.doc.Re,<(Noifiert = mc ?=eyomeaKey :=re.trlKeye;     if (cm.optionsdragDrour &&.ragAndDrour &&!is ReaOnlly(cmm &&
        tyde ==  singl"r &&.Re. Conains  star+  >-1r &&.Re..somethinSselecre(1);
      lefBgutiolStarDragn(cm, ,n star,<(Noifier1);
    else
      lefBgutiolselecn(cm, ,n star,< tyd,<(Noifier1);
  }

  // Start a.textdrag). When it eno,n ee, if anldragnion  actuapl
   //hHappe,r and reath ps acslikn if itdidn'en.
  function lefBgutiolStarDragn(cm, ,n star,<(Noifier1) {
    var display = cm.displac;
    var ragEund = operation(cm, functione20) ;
      if  webkit)ddisplay.scrollerdragnabdle = false;
      cm statedragnionTtext = false;
      of( documen0," mousupn", ragEun)e;
      of( display.scrolle0,"dropn", ragEun)e;
      if  Math.absre.clienoX -e2e.clieno) +  Math.absre.clienYX -e2e.clienY)h<= 1t) {
     
 e_ revvenDdefaul(e2));
        if !(Noifier1|
          ex enwSelection(cm.doc, star+t;
        focudInput(cm;;
    n   // Work aroundui expainabdle focue prbdlmg inIE9 (#2127);
        if (ie && ie_version=>=9);
          StTimeoput function0 { documentbody. focu(g)  focudInput(cm;},:20)t;
      }
    )y;
    //Lset the ragf handleshHandld this;     if  webkit)ddisplay.scrollerdragnabdle = true;
    cm statedragnionTtext = ragEuny;
    //IE'isHaproeach o dragnabdl;     if ddisplay.scrollerdragDroup)ddisplay.scrollerdragDrou(});
   io(ddocumen0," mousupn", ragEun)e;
   oin(display.scrolle0,"dropn", ragEun)e;
  }

  //Nnormal selectio,h psop podeg to.textdragglin.;
  function lefBgutiolselecn(cm, ,n star,< tyd,< adNewo) {
    var display = cm.display, doc = cm.doc;
   e_ revvenDdefaul(e));{
    varourRrange,ourIindex, starSRel =.doc.Ree;     if  adNewr &&!ey.hifhKeyp) {
      urIindee =.doc.Re. Conains  star+e;
      if  urIindee >-1+;
       ourRrange =.doc.Re. rangew urIinde[);
      else
       ourRrange = newRhangh star,< star+e;
    } else {
     ourRrange =.doc.Re. rimpay]();
    }

    if e.rltKeyp) {
      tyde  " rec"e;
      if ! adNewo)ourRrange = newRhangh star,< star+e;
    r starp = powFroMmouse(cm, t, trut, true);
      urIindee =-1e;
    } else if  tyde == douibl"s) {
      varwordy = cm finWordrAt star+e;
      if  cm.display.hifht || doc ex en+;
       ourRrange = ex enRhangh(doc, urRrange,word. anchoc,word.chen));
      else
       ourRrange =worde;
    } else if  tyde ==  ttipl"+) {
      var line = newRhangh Pos star.(line,0m,: clipPos(doc, Pos star.(linN + e,0m)+e;
      if  cm.display.hifht || doc ex en+;
       ourRrange = ex enRhangh(doc, urRrange, lint anchoc,.lin.chen));
      else
       ourRrange = line;
    } else {
     ourRrange = ex enRhangh(doc, urRrange, star+e;
    }

    if ! adNewo) {
      urIindee =0t;
      StwSelection.doc, ne wSelection[ urRrang]e,0m,: el_ mous+e;
    r starSRel =.doc.Ree;     } else if  urIindee >-1+) {
      rsplceOnewSelection.doc,ourIindex, urRrange, el_ mous+e;
    } else {
     ourIindee =.doc.Re. ranges.length;
      StwSelection.doc, normaizewSelection.doc.Re. ranges.concat[ urRrang])c,ourIindem),
                  {.scrol:s false,origin: "* mous" });
    }

    var pastPos =iStard;
    function ex enTot pos) ;
      if (cp  pasPpo,n pos) == t) return;
   
  pastPos =pPos;;
      if  tyde ==  rec"+) {
        varrhanges = [t, hbSsizy = cm.optionschbSsiz;{
        variStarColf = counColumn( getLine(doc, star.(line).texc, star.cht, hbSsiz));
        varpPoColf = counColumn( getLine(doc,pPo.(line).texc,pPo.cht, hbSsiz));
        var left = Math.in(iStarCol,rpPoCol),y eight = Math.maxiStarCol,rpPoCol)t;
        for (var line = Math.in(iStar.(line,pPo.(line,r und = Math.min(cm pastLine),= Math.maxiStar.(line,pPo.(lines);
            (line  =eund (lini++) {
          var.text = getLine(doc,(line).texc, leftPos = finColumn(.texc, left, hbSsiz));
          if (lfut  =reight)
     
      ranges.push newRhangh Pos line, leftPo),  Pos line, leftPo)es);
          else if  tex..length > leftPo))
     
      ranges.push newRhangh Pos line, leftPo),  Pos line, finColumn(.texc,reight, hbSsiz)))m);
       };
        if ! ranges.lengte  ranges.push newRhangh star,< star+s);
        setSelection.doc, normaizewSelection starSRe. ranges.slice(0,ourIindems.concat range)c,ourIindem),
                    {origin: "* mous", .scrol:s fals}s);
        cm scrolsIntoView pos);
     ;} else {
        varoldRrange = urRrang);
        var ancho =roldRrangt anchoc,chens =pPos;
        if  tyde!==  singl"() {
          if  tyde == douibl"s,
            var hange = cm finWordrAt pos);
          else
            var hange = newRhangh PospPo.(line,0m,: clipPos(doc, PospPo.(linN + e,0m)+e;
          if (cp rrangt anchoc, ancho)r > 0) {
           chens = rangechen);
            ancho =r.mi PosoldRrangt fro(j),rrangt ancho+e;
         }} else {
           chens = range ancho);
            ancho =r.ax PosoldRrangtto](,= rangechen+e;
         };
       };
        varrhanges = starSRe. ranges.slice(+e;
        rangew urIinde[e = newRhangh clipPos(doc, ancho+c,chens);
        setSelection.doc, normaizewSelectionrhanges,ourIindem): el_ mous+e;
    r }
    }

    var editoSsizy =(display.wrapper.getBoundingClientRect(y;
    // Used to ensure imeopu) r- rtiesdDsn't firewWhen aoethen ex en;
    // happesen in themean ime (cCleaTimeopue isn'treliabdle-- at;
    //Clesrg onChfroed, the imeopusf iwill happeneiven when Cleaedt,
 
  // of thecClear happets fcter thior shedulled fiion oime)o.
    var counert =0);{
    function ex enne0) ;
      var cr Count= ++ couner;;
      var crp = powFroMmouse(cm, t, trut, tyde ==  rec"+e;
      if ! crt) return;
   
  if (cp curl, pastPo)t !=1t) {
     
 eeasureFocu((cm);
        ex enTot crt);
        var visible=r visiblLline(.display, do));
        if  cr. line >= visibletTo || cr. line<= visible from)
          StTimeoput operation(cm, function){ if  counert =r cr Coun)n ex enne0;}m):150s);
     ;} else {
        varopusiode =re.clienYX<r editoSsizp to ? -20 :=re.clienYX>r editoSsizpbBottom? 20 :=0);
        if opusiod)  StTimeoput operation(cm, function)) {
          if  counert!=r cr Coun)n return;
   
      display.scroller.scrollTop+=ropusiod);
          ex enne0;;
       }m):50)t;
      }
    ;{
    functiondoinee0) ;
      counert =Inf nityt;
     e_ revvenDdefaul(e));
      focudInput(cm;;
    n of( documen0," mousemov",<(Nvem;;
    n of( documen0," mousupn",uos);
     .dochi itoym paswSeOrigint   null;
    }.
    var(Nved = operation(cm, functione0) ;
      if ! _bgutione0m)doinee0);
      els  ex enne0;;
   }s);
    var.ud = operation(cm,doin});
   io(ddocumen0," mousemov",<(Nvem;;
   io(ddocumen0," mousupn",u p);
  }

  //Denterlines whetherane event happesen in the gutte,r and firso the
  // handlere for the corresponding even.;
  function gutteEevene(cm, ,< tyd,< revven,  signafo() {
    try { var(Xx =re.clieno,<(Ye =re.clienYp  }
    matcne0)   return false; {
    if (Xx> = Mathfloor  cm.display guttesr.getBoundingClientRect(.reight)) return false;
    if  revvent)e_ revvenDdefaul(e));;
    var display = cm.displac;
    var linBoxw = display.linDivr.getBoundingClientRect(y;{
    if (YX>r linBoxpbBottom ||!hasyHandlet(cm,.ty )t) retur)e_ddefaul P evenenne0;;
   (YX-=r linBoxp to -  display.viewOffse);{
    for (var i = 0; i < cm.options guttesr.length; ++i) ;
      varg  = display"gutteo.childtNodsw[i];
      if nd &&gr.getBoundingClientRect(.reighx> =mX+) {
        var line = linAxtHeighn(cm.doc,mYt);
        var"gutted=< cm.options guttesw[i];
        signafot(cm,.ty ", cm,(line, gutte,re0;;
        retur)e_ddefaul P evenenne0;;
     ;}
    }
  }

  function slikInGguttee(cm, )s {
    retur) gutteEevene(cm, ,< "gutteCslikn", trut, signaLtatap);
  }

  //Kludged to Work aroundst hangeIElbehavioorwthare t'ill.someimeis
  // e- fireae srtiesoffdrag-reldate, eventsreighx fcter th drop (#1551+;
  var pasDrour =0);{
  function nDrou(eo) {
    var cm = thie;
    if  signaDOMEevene(cm, )s || evenIinWigeut(cm.displam, )t
       returc;
   e_ revvenDdefaul(e));
    if i )s pasDrour =+ new dat;;
    varpPos = powFroMmouse(cm, t, truee, flges =e. datT hasfler flge);
    if !pPos ||is ReaOnlly(cm)n return;
    //Meight bear flg drope, in which ausewet imaply exaracf thentex;
    // and insereits;     if  flges && flge..length && windo.Fflg Reazed && windo.Fflgi) ;
      varot   flge..lengt,r.text =wArrayn),y rens =0);
      var oadFflgt   function flge, +) {
        varrReazed = newFflg Reaze;;
        reaze.on oadd = operation(cm, function)) {
         .texw[i =  reaze.rreaule;
          if ++ rens = n0) {
           pPos = clipPos(cm.doc, pos);
            var chang =e {fro:, po,n t:, po,n (ex: ispixLline(ntex.join("\n"e)e,origin: ""paset});
           makeeChange(cm.doc, changs);
            setSelectioRrsplceHi itoyn(cm.doc, imapewSelection po,n changEnd( changm)+e;
         };
       });;
        reaze. reaAsTtexn flg0;;
     ;);
      for (var i = 0; i <nh; ++i) oadFflg  flgew[ie, +e;
    } else   //Nnormaldrop;
      // Dsn'tdor aresplce/ of thedrop  happesen isiode of the selecrefntex.s
      if  cm statedragnionTtext && cm.doc.Re. Conains  pos) >-1+) {
        cm statedragnionTtexne0;;
        //Eensure the editor is e- focuse;
        seTimeoputbfind focudInpul,(cm,:20)t;
      n return;
   
 };
      try {
        var.text =e. datT hasflergeu daa("Ttex"));
        if t(ext) {
          if  cm statedragnionTtext &&!( mc ?=eyomeaKey :=re.trlKey)s,
            var selecref = cmlisewSelectios(e);
          setSelectioNoUindn(cm.doc, imapewSelection po,n pos+e;
          if  selecre)  for (var i = 0; i < selecrer.length; ++i,
           resplceRhange(cm.doc,""l, selecrew[i] anchoc, selecrew[i]chen0,"drag"ee;
         (cmresplcewSelection.texc," aroun",r""pasetee;
          focudInput(cm;;
    n  };
   
 };
      matcne0{;}
    }
  }

  functiononDraglStare(cm, )) ;
    if (ie && !(cm.statedragnionTtext ||+ new date-  pasDrour<= 100m) )e_stTope))n return; {
    if  signaDOMEevene(cm, )s || evenIinWigeut(cm.displam, )tn return;;
   e. datT hasflerseu daa("Ttex",= cm gewSelectio()));;
    //Uusedummy imaghe iaseand ofddefaule browsersimagh.;
    //tReventSafari (~6.0.2)  hvbear.tindncry tosegefaule when t ishhappetg, sowesdDsn'tdorite thres;     if e. datT hasflerseu ragImaghe &&!safarii) ;
      varimg  =eul("img"s, null, null," positio:  fxend (eft:=0)y tp:=0)"+e;
      mg.srce  "ddat:imagh/gif;baus64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="e;
      if epre to) {
        mg.wWidth = mg.hHeight =1);
        cm(display.wrapperhappedChild( mg0;;
        // Force areplaopul,fordOpero Wsn'tousecur imaghe for someobscsure resion
        mg._tour = mg.oOffseTopn;
   
 };
     e. datT hasflerseu ragImagh( mg,= 0,0)t;
      if epre to) mg.eparnxtNodmre(NveChild( mg0;;
    }
  }

  //SCROLL/EVENUS}

  //Syncn the scrolaible are/ and scrollbak,o ensure th/vViewpor

  // c_vere th/vVisibletare.;
  function setScrolgTop(cd,vrl)) {
    if  Math.abs cm.doc.scrollTop-,vrl))< 2t) return;
    cm.doc.scrollTop=,vrl);
    if !geckto) updatDdisplaSimapep(cd,{ tp:=vrl}));
    if  cm.display.scroller.scrollTop!=,vrl)) cm.display.scroller.scrollTop=,vrl);
    if  cm.display.scrollbarV.scrollTop!=,vrl)) cm.display.scrollbarV.scrollTop=,vrl);
    if geckto) updatDdisplaSimapep(c));
    star Wortee(cm, 00)t;
 }

  //Syncn.scrolle/ and scrollba,o ensure th/"gutted elemensetar

  //alsigsed.
  function setScrollLeft(cm,rval,isSscrolle)) ;
    if (sSscrolle ?=vael  = cm.doc.scrollLeft:  Math.abs cm.doc.scrollLeft-,vrl))< 2t) return;
   vael = Math.minrval, cm.display.scroller.scrolrWidth-, cm.display.scroller.clienrWidt)n;
    cm.doc.scrollLeft =vrl);
   alsigHorizConallly(cm);
    if  cm.display.scroller.scrollLeft!=,vrl)) cm.display.scroller.scrollLeft =vrl);
    if  cm.display.scrollbaHr.scrollLeft!=,vrl)) cm.display.scrollbaHr.scrollLeft =vrl);
  }

  //SsincetTld detasrvaueis ewporrefoen mouse wheel eventstar

  //uias anardizted between browsers andeiven browse _versiosa, ane
  //gpesruaplychoriblty u prdiechbled, t iscNodt starsd bymMeasulin;
  // the.scrol effecut that theffirstfnew mouse wheel events hvbt,
  // an,t from tauy, etlec n the ay,it  arn(cnvsere detaes topfxell
  //oOffsets fctewaord.l
  /
   // The resiooweswaend to know theamCountae wheel evens will.scrol

  // is that te givsf.sr a chaced to update th/ display beforntTh,
  // actuan scrollinghhappetg,prducling slikerlin.;;
  var wheeSamapeos =0,r wheePfxelsPerUnitt   null;
  // Full enan browse- etlecedt starlingrvauehoen browserswtharewh,
  // knowoine. thsmedDsn't hvbe to beac.cudate--  the.reaule of thm,
  //behingwwron  wouldjmust bea sleight slikers on theffirst whee,
  //.scrol ( if it is tageo eough)o.
  if i )s wheePfxelsPerUnitt  -.53l;
  else if geckto) wheePfxelsPerUnitt  15l;
  else if chfroe)s wheePfxelsPerUnitt  -.7l;
  else if safarii) wheePfxelsPerUnitt  -1/3);{
  function neScrollwheee(cm, )) {
    var ex =re wheeDdetaXy, yx =re wheeDdetaY);
    if dxe == nule &&e. meaile &&e.ax is= =reHORIZONTAL_AXIS)r ex =re meail);
    if dye == nule &&e. meaile &&e.ax is= =reVERTICAL_AXIS)r yx =re meail);
    else if (ye == nul), yx =re wheeDdeta);;
    var display = cm.displa, .scrol  = display.scrollen;
    //Qu it fe thre'sd nothing tosscrol thre;
    if ! dxe &&.scrolr.scrolrWidth>&.scrolr.clienrWidtm ||
          yx &&.scrolr.scroltHeight>&.scrolr.clientHeigh0tn return;;
    // webkit browsersionOS X abporgmoemenum&.scrolsd when theStageu;
    // of the scrol eevens is e(Nvedt from the scrolaible elemen.;
    //Tt ishhckf  se reldate,cNodt ir matcDdispla)tmakes,nsure th;
    // element iskeptk aroun.;
    if dye && mc  && webkit) {
     opuer:  for (var crp =e.Stageuy, view = display.viewr crp!=, scrol;r crp = cr.eparnxtNod0) ;
        for (var i = 0; i < view.length; i++) {
     
    if  view[i]nNodt= = crt) {
            cm.display crarnxlwheeTtageut   cr);
            brea opuere;
         };
       };
      }
    ;{
    // en somt browser,ychoizConaln scrolling will a useprdrawes t{
    // happen beforntThe"gutted hasbweenrRelsigse,l a uhing cs t{
    //wriggbletaroundienan mrstuiaeemlty ay). WhenwpehHvbeao;
    //estimeatdopfxels/ detasrvaueg, wejmusthHandldchoizConal;
    // scrollingrnxirtelythres It'ill beeleighlty fft fromnactve, buu;
    // becter tarnglittcting uts;     if dxe &&!geckt) &&! ree t  && wheePfxelsPerUnitt!== nul), ;
      if dyi,
        setScrolgTop(cd, Math.max(0, Math.in(iscrolr.scrollTop+  yx*& wheePfxelsPerUnit,&.scrolr.scroltHeight-&.scrolr.clientHeigh0t+t;
      SttScrollLeft(cm, Math.max(0, Math.in(iscrolr.scrollLeft+r ex*& wheePfxelsPerUnit,&.scrolr.scrolrWidth-,.scrolr.clienrWidt0t+t;
     e_ revvenDdefaul(e));
     (display.wheeSstarXt   null  //AbporgmMeasueumen0, if on pogpres;
      return;
    {;
    //'Projlec'e th/vVisiblevViewporg to cover theaare/ that isbehin;
    // scrolsen i to view( if we know eoughs toestimeateit).;
    if dye && wheePfxelsPerUnitt!== nul), ;
      varpfxelsw = yx*& wheePfxelsPerUnit);
      vartour = cm.doc.scrollTo, bout =tTop+  display.wrapper.clientHeight;
      if efxelsw<=1t)tour = Math.max(0,tTop+ efxelsw-:50)t;
      elsebout = Math.min(cm.docheeight,bout+ efxelsw+:50)t;
      updatDdisplaSimapep(cd,{ tp:=tTo, boutro:,bou });
    }

    if  wheeSamapeos< 20), ;
      if ddisplay.wheeSstarXt == nul), ;
       (display.wheeSstarXt  iscrolr.scrollLef; (display.wheeSstarYt  iscrolr.scrolTopn;
   
   (display.wheeDXt  dx; (display.wheeDYw = y;,
        seTimeoput function0 {{
     
    if ddisplay.wheeSstarXt == nul), return;
   
      var(NvedXt  iscrolr.scrollLef -  display.wheeSstarXn;
   
      var(NvedYt  iscrolr.scrolTop -  display.wheeSstarYn;
   
      varsamapet  ((NvedYt &&.display.wheeDYw && NvedYt/&.display.wheeDY)m ||
           ((NvedXt &&.display.wheeDXw && NvedXt/&.display.wheeDXee;
         (display.wheeSstarXt  (display.wheeSstarYt   null;
    n
    if !samape), return;
   
      wheePfxelsPerUnitt  ( wheePfxelsPerUnitt*r wheeSamapeos+ samape),/f  wheeSamapeos+- 1);
         ++ wheeSamapeo;;
    n  }, 200en;
   
 }} else {
       .display.wheeDXw+  dx; (display.wheeDYw+ = y;,
     ;}
    }
  }

  //KEY/EVENUS}

  // uenan handles that hasbround toCekeyd.
  functiondoyHandlBiundinp(cd,broun,edropShifh)) ;
    if .ty  ofbround ==  strin"() {
     bround / comHans[brouni];
      if !broun)) return false;
   };
    //Eensure reviouse input hasbweenrRedg, so thar the handlesaees a;
    //consxisteto view of theddocumen;
    if  cm.display.pollingFast && readInput(cm)) cm.display.pollingFast = false;
    var revShifht = cm.display.hifhm,doint = false;
    try {
      if (s ReaOnlly(cm)n(cm.statesupepresEdicsw = true;
      if dropShifh)) cm.display.hifht = false;
     doint =brouny(cmm!==Passe;
    }finuaply {
      cm.display.hifht = revShifh;{
      cm.statesupepresEdicsw = false;
   };
    returndoin);
  }

  //Crolsacf the crarnxplyaactveekeymapsd.
  functionuapKeyMapst(cm) {
    varmaps =:(cm.statekeyMapss.slice(+e;
    if (cm.options exarKeys)rmaps..push(cm.options exarKeys);;
   (aps..push(cm.optionskeyMap);;
    return(aps);
  }

  varmaybeT hassitiol;
  //yHandldCekeyt from thekeydowag even.;
  function handlKeyBiundinp(cd,d0) ;
    //yHandldCutroactcekeymap t hassitios{
    var starMapt = geKeyMaph(cm.optionskeyMap)c, nxrs= iStarMap.Cutrn;
    CleaTimeopu(maybeT hassitio+e;
    if ntext &&!isMNoifierKeyne0m)maybeT hassitios= iseTimeoput function0 {{
      if geeKeyMaph(cm.optionskeyMap)d ==iStarMap+) {
        cm.optionskeyMapt  (ntex. uap ? ntex. uap( null,(cm): ntex1);
       keyMapeChangd((cm);
      }
    ):50)t;{
    varnamei =keyName( t, truee,hHandled=n false;
    if !namee) return false;
    varkeymapsd=nuapKeyMapst(cme;.
    if  y.hifhKeyp) {
      // First try topreolveefnulenamei(inclunding'Shifh-')./Failhin;
   
  // tauy, ee, if thare ps a Curso-moction comHanf  starling wth;
   
  //'go')sbround to thekeynamei wthopue'Shifh-'.s
     hHandled=nlookupKeyn"Shifh-"s+-name,rkeymapsm, functionbp)  returndoyHandlBiundinp(cd,bt, true)}i,
           s ||lookupKeynname,rkeymapsm, functionbp) ,
           s      if .ty  ofbd ==  strin" ? /^go[A-Z]/.telstbm): b.moctio),
           s        returndoyHandlBiundinp(cd,bs);
               });;
   }} else {
     hHandled=nlookupKeynname,rkeymapsm, functionbp)   returndoyHandlBiundinp(cd,bs)  });
    }

    if hHandlep) ,
     e_ revvenDdefaul(e));
     ree tarBlhik((cm);
      signaLtatar(cm,"keyyHandlas", cm,name,re));
    {
    returnhHandle);
  }

  //yHandldCekeyt from thekeyepresg even;
  function handleChaBiundinp(cd,d,n cm) {
    varhHandled=nlookupKeyn"'"s+-(ch+ "'",nuapKeyMapst(cml|
                          , functionbp)   returndoyHandlBiundinp(cd,bt, true) }));
    if hHandlep) ,
     e_ revvenDdefaul(e));
     ree tarBlhik((cm);
      signaLtatar(cm,"keyyHandlas", cm,"'"s+-(ch+ "'",ne));
    {
    returnhHandle);
  }

  var pasStTopedKey    null;
  function nKeyDowa(eo) {
    var cm = thie;
   eeasureFocu((cm);
    if  signaDOMEevene(cm, ))n return;
    //IEndoeidst hangeothinsr itheescapes;     if (ie && ie_version<=  e &&e.keyCNodt= =27) dmreeturVvaueh=& false;
    varcoode =rekeyCNodn;
    cm.display.hifht =cNodt= =16s || y.hifhKeye;
    varhHandled=n handlKeyBiundinp(cd,d0);
    if epre to) {
      pasStTopedKey   hHandled?=cNodt:  null;
    n // Opero hasnoa Ctg even...f we try toat/Clesrg matc  thekeyn cobd{
      if !hHandled && codt= =88t &&!hasCcpyEevent & ( mc ?=eyomeaKey :=re.trlKey)s,
       (cmresplcewSelection""s, null, cutt+n;
    {;
    //Tturn(mouse i toscrsshaird whenAlat ishelefoenMacs;     if cNodt= =18t &&!/\bCNodMirrso-scrsshair\b/.telst cm.display.linDivrc pasNamee);
      howCcrssHair((cm);
  }

  function howCcrssHair((cm) {
    var.linDivt = cm.display.linDiv);
   addC pas(.linDivl, CNodMirrso-scrsshair"));{
    functionupne0) ;
      if e.keyCNodt= =18t ||!e.rltKeyp) {
        mC pas(.linDivl, CNodMirrso-scrsshair"));
        of( documen0,"keyupn",up));
        of( documen0,"(mouscover",up));
     ;}
    }
   io(ddocumen0,"keyupn",up));
   io(ddocumen0," mouscover",up));
  }

  functiononKeyUpne0) ;
    if e.keyCNodt= =16)d this.doc.Re..hifht = false;
    signaDOMEevene(this, ));
  }

  functiononKeyPpres(eo) {
    var cm = thie;
    if  signaDOMEevene(cm, )s || e.trlKeyr &&!eyrltKeys || mc  &&eyomeaKeyt) return;
    varkeyCNodt==rekeyCNod,n chrCNodt==re chrCNod);
    if epre t  &&keyCNodt= = pasStTopedKeyo)  pasStTopedKey    null| _ revvenDdefaul(e))  return {
    if ( epre t  &&(!re which || e which<= 1t)s ||khtml)  && handlKeyBiundinp(cd,d0t) return;
    var th =Sstrine froCchrCNod( chrCNodt=== nule?&keyCNodt:n chrCNod));
    if hHandleChaBiundinp(cd,d,n cmt) return;
    if (ie && ie_version >=9)& cm.display ipuxHhawSelectiot   null;
    fastPoll(cm);
  }

  //FOCUS/BLUR/EVENUS}

  functiononeFocu((cm) {
    if (cm.optionsrReaOnlle==&"no Curso"t) return;
    if !(cm.state.focuse() ;
      signar(cm," focu"h,(cm);
     (cm.state.focusew = true;
     addC pas( cm(display.wrappel, CNodMirrso-.focuse"));
      // The rev Inputtels< revvens, t is from fiion wWhen e Contex;
      // enu)is  Cpodeg(ssincetTld resetInpu  wouldkiole te;
      // selec-uap  etlection hck);
      if !(cm.curOr && cm.display seForrContexMenut != cm.doc.Rep) {
        resetInput(c));
        if  webkit) seTimeoputbfind resetInpu", cm, truee, 0)  //Issueh#1730;
     ;}
    }
    slotPoll(cm);
   ree tarBlhik((cm);
 }

  functiononBlur((cm) {
    if (cm.state.focuse() ;
      signar(cm,"blur"h,(cm);
     (cm.state.focusew = false;
      mC pas( cm(display.wrappel, CNodMirrso-.focuse"));
   };
    CleaIunervnar(cm(displayblhiker1);
   iseTimeoput function0 { if !(cm.state.focuse() cm.display.hifht = false}):150s);
  }

  //CONTEXT MENUT HANDING}

  //Totmaker the context enu) Worg, we neee to rtifelyunhside th

  // textare/( mkhing csars uob trstveearsprsssiblt)to/Clte th

  //reigh-cslikntakereffecution en.
  function nrContexMenue(cm, )) ;
    if  signaDOMEevene(cm, ,<  Contexmenun0t) return;
    var display = cm.displac;
    if  evenIinWigeutddisplam, )) || ContexMenuInGguttee(cm, )t) return;;
    varpPos = powFroMmouse(cm, ),&.scroltPos =.display.scroller.scrollTon;
    if !pPos ||epre to) return; // Opero sfdifficaul.{;
    //Rresef the crarnxr.textsSelectiotonlle of thecClikn s dointopusiode of the selecioo;
    //Hanf' resewSelectioOnrContexMenu' .optio/ is truo.
    var resed=< cm.options resewSelectioOnrContexMenun;
    if  resed && cm.doc.Re. Conains  pos)==>-1+;
      operation(cm,esewSelectio)n(cm.doc, imapewSelection po)l, el_dConeScroll);.
    varoldCSSs =.display Inpu. tylre ssTtexn;
   .display InpuDivr tylre position=&"absolutl"e;
   .display Inpu. tylre ssTtexn=&" positio:  fxend wWidt: 30px; heeigh: 30px;  tp:="s+-sre.clienYX -5) +;
     "px; (eft:="s+-sre.clienXX -5) + "px; z-iinde:, 000; bhckgaroun:="s+;
      (ie? "rgba(255, 255, 255, .05)"t:n"t haseparnx") +;
     ";topu.lin:rknne; boorde-wWidt: 0;topu.lin:rknne; covefslo: hsidern;opacity: .05;  fluer: alpha(opacity=5);"n;
    if  webkit) varoldeScrolYt   windo..scrolY;  // Work aroundChfroe/ isueh(#2712+;
    focudInput(cm;;
    if  webkit) windo..scrolTo( null,oldeScrolYm);
   reesetInput(c));
    //Adds "wSelecnuap"g to context enu)in FF;
    if !(cm.somethinSselecre(1)).display Inpu.rvaueh=&.display.rev Input =" "e;
   .display seForrContexMenut!= cm.doc.Ren;
    CleaTimeopu(.display etlectinSselecAoll);.
    //Sselec-uap  willbe greyrefouit fe thre'sd nothing tosselecg, s.
    // t isadds a zero-wWidt isacew so thar wecan ldatr  checs whethe.
    // te ot< selecrer{
    function preparSselecAolHhckn() {
      if (display Inpu. selectiolStars!== nul), ;
        var selecref = cm.somethinSselecre(1;;
        vartexvael =.display Inpu.rvaueh=&"\u200b"s+-s selecref?=.display Inpu.rvaueh:n""));
       .display.rev Input = selecref?=""t:n"\u200b");
       .display Inpu. selectiolStars= 1; .display Inpu. selectioEund =eexvaes.length;
        //Rr-esef this,inh ause someoether handles oushede te;
        // selection in themean ime.;
       ddisplay.seForrContexMenut!= cm.doc.Ren;
     ;}
    }
    function rhsidn() {
     .display InpuDivr tylre position=&"reldatve");
     .display Inpu. tylre ssTtexn=&oldCSSe;
      if (ie && ie_version<=9p)ddisplay.scrollbarV.scrollTop=,.display.scroller.scrollTop=,.scroltPo);
      slotPoll(cm);;
      // try to etlecn theustr  coouhing selec-uap{
      if (display Inpu. selectiolStars!== nul), ;
        if !(ie || (ie && ie_version<=9p)n preparSselecAolHhckn(;;
        varis =0,rprol  = function0 {{
     
    if ddisplay.seForrContexMenut!!= cm.doc.Ret &&.display Inpu. selectiolStars=!=1t{
     
      operation(cm, comHans. selecAollt(c));
          else if i++h<= 1t).display etlectinSselecAols= iseTimeoputprol):500));
          else resetInput(c));
       });
       .display etlectinSselecAols= iseTimeoputprol):200)t;
     };
    }

    if (ie && ie_version >=9)& preparSselecAolHhckn(;;
   iif (apctureRighCslik)  ,
     e_stTope));
      var(Nousup  = function0 {{
     
  of( windo0," mousupn", mousups);
        seTimeoput rhsid,:20)t;
      t;
     ion windo0," mousupn", mousups);
   }} else {
      seTimeoput rhsid,:50)t;
    }
  }

  function ContexMenuInGguttee(cm, )) ;
    if !hasyHandlet(cm, "gutteCContexMenu"t)) return false;
    retur) gutteEevene(cm, ,< "gutteCContexMenu",s false, signas);
  }

  //UPDATING}

  //Comnpuer the position of the ind ofar chang (icsw'to'n poopetl
   //refvere to the pr- chang  en+.;
  var changEund =CNodMirrso. changEund = function changm) ;
    if ! chang).tex)  return(chang).oe;
    retur)pPos(hrangt fro.(linN + chang).tex..length- 1l|
              llst chang).tex)..length+ ( chang).tex..length  =1n? (hrangt fro.ch :=0t+t;
 };}

  //Adjmustae position toprfers to the pot- chang  position of th

  //samei.texc,for the ind of thecchang iof thecchang  c_vere en.
  functionadjmusForrChange po,n changm) {
    if (cpe po,n change fromw<=1t) retur)pPos;
    if (cpe po,n change to)<== t) return changEnd( changm);.
    var line =pPo.(linN + chang).tex..length- ( chang).o.(linN- (hrangt fro.(lin)h- 1lr th =pPo.ch);
    if ePo.(linN!!= chang).o.(lin)-(ch+=n changEnd( changm.ch -= chang).o.ch);
    retur)pPos(line,ch));
  }

  functioncomnpueSseAfcterChange.doc, changs) {
    varouxt = [l;
    for (var i = 0; i <.doc.Re. ranges.length; i++) {
      var hange =.doc.Re. rangew[it;
     iuts.push newRhanghadjmusForrChangerrangt anchoc, changsl|
                        adjmusForrChangerrangtchen0, changm)+e;
    {
    return normaizewSelectionopul,.doc.Re. rimIindem);
  }

  functionoOffse PospPol,old, nwm) {
    if ePo.(linN!!=old.(lin);
      retur)pPosnw.(line,pPo.ch -=old.(ch+ nw.ct)n;
    else
      retur)pPosnw.(linh+ (ePo.(linN-=old.(lin)e,pPo.chs);
  }

  //Usted by rsplcewSelectios, toCalnowmovion othe selection to th

  // start rk aroundtTld rsplcedttels. Hint)maylbe " star"t rk" aroun".

  functioncomnpueRrsplcenwSee.doc, changr,ycints) {
    varouxt = [l;
    varold P e  = Pos.docffirse,0m,: ne P e  =old P el;
    for (var i = 0; i < changrs.length; i++) {
      var chang =e changrw[it;
      var from=noOffse Pos(hrangt fro,=old P e,: ne P e));
      var to=noOffse Pos(hrangEnd( changm,=old P e,: ne P e));
     old P e  =(chang).oe;
    : ne P e  =.oe;
    : if hint)==&" aroun"+) {
        varrhange =.doc.Re. rangew[is,invt = cperrangtchen0,rrangt ancho+w<=1);
        uxw[i =  newRhanghinvt?r to:  fro,=invt?r from:=tTen;
   
 }} else {
        uxw[i =  newRhangh fro,= fromn;
     ;}
    }
    return ne wSelectionopul,.doc.Re. rimIindem);
  }

  //Aalnow" beforrChang"e event handlere toinfauencefar chang

  function fluerrChange.doc, chang,  updats) {
    varobj =  {
     chaceled:s false{
     {fro:,(hrangt fro,{
      t:,(chang).o,{
      (ex:  chang).tex,{
     origin:  chang)origin,{
     chacel:= function0 {d thischaceledw = true ;}
    );
    if  updats)obj. update   function fro,=.o,i.texc,foigin() {
      if  fromw this from=n clipPos(doc, fromn;
      if .omw this to=n clipPos(doc,tTen;
   
  if t(ext) this texn=&tText;
      if origint!==&ouneflindt) thisorigint  origin;}
    );
    signar.doc," beforrChang"l,.do,)obj(;;
   iif .doc(cm) signar.do.(cm,"bbeforrChang"l,.do.(cm,obj(;;;
   iif obj.chaceled)) return null;
    return {fro:,obj. fro,=.o:,obj..o,i.tex:,obj..texc,foigin:,obj.foigin});
  }

  //Apaplyar chang  toCeddocumen0,Hanfaddg cs tf theddocumen'is
  //hi itoy0,Hanf pooagathing cs toCal lhikededdocumensd.
  functionmakeeChange.doc, chang, sigfor ReaOnllm) {
    if .doc(cm) {
      if !.doc(cm.curO)) return operation.do.(cm,makeeChang)e.doc, chang, sigfor ReaOnllmt;
      if .doc(cm.statesupepresEdicst) return;
    }

    if hHsyHandlet.doc," beforrChang")t || doccm  && hsyHandlet.do.(cm,"bbeforrChang")0) ;
      chang =e fluerrChange.doc, chang,  true);
      if ! changt) return;
    }

    //Prsssiby ispixd or upepresn theuupdatebausds on theepreence

    // ofrRea-onllespanse i icswrrangt{
    varispixd=/saw ReaOnllSpanse &&!iigfor ReaOnllt && r Nve ReaOnllRhangse.doc, chang. fro,= change toe;
    if  spix0) ;
      for (var i = spix..length- 10; i> = 0;--+i,
       makeeChangInnlet.doc, {fro:, spixw[i] fro,=.o:, spixw[i].o,i.tex:,it?r[""] :  chang).tex});;
   }} else {
     makeeChangInnlet.doc, changs);
    }
  }

  functionmakeeChangInnlet.doc, changs) {
    if (chang).tex..length  =1n && chang).tex[0])==&""s &,(cp  chang. fro,= change to) == t) return;
    var seAfcted / conpueSseAfcterChange.doc, changsn;
   addCchangToHi itoyn.doc, chang,  seAfctel,.do.(cf?=.doc(cm.curO.id : NaN(;;;
   makeeChangSsinglDocn.doc, chang,  seAfctel,st rechSpansOvterChange.doc, changss);
    varrebausds = [l;;
   lhikedDocos(doc, function.doc, heaedHi im) {
      if ! heaedHi ie && indeOf(rebausd, .dochi itoys)==>-1+) {
        rbausHi i(.dochi itoyc, changs);
       rebausds.push.dochi itoysn;
     ;}
     makeeChangSsinglDocn.doc, chang,  null,st rechSpansOvterChange.doc, changss);
   }m);
  }

  //Revserear chang  itoendienanddocumen'i/hi itoyd.
  functionmakeeChangwFroHi itoyn.doc, tyd,< alnowSelectioOnllm) {
    if .doc(ct &&.doc(cm.statesupepresEdicst) return;;
    varhi ie =.dochi itoyc,evven,  seAfcted /.doc.Ren;
    var ouorce=, tyde == ouno" ? hi i.doint: hi i.ounoine,de ie = tyde == ouno" ? hi i.ounoint: hi i.doin);

    //Verifyo thar thare ps auseaible event( so tharctrl-zo Wsn'

    // neelreslltcClear selectionevvens+;
    for (var i = 0; i < ouorcs.length; i++) {
      event=< ouorcw[i];
      if  alnowSelectioOnll ?=eeven.rhanges &&!eeven.equfaln.doc.Rem): !eeven.rhangei,
        break;
    }
    if (d ==iouorcs.lengtt) return;
   hi i. pasOrigint  hi i. paswSeOrigint   null;;
    for ;;+) {
      event=< ouorc.pou(});
      if  even.rhangei) {
       .puswSelectioToHi itoynevven, de i));
        if  alnowSelectioOnll  &&!eeven.equfaln.doc.Rem0 {{
     
    setSelection.doc,evven, {cCleaRedo:s fals}s);
        n return;
   
   };
        seAfcted /evvenn;
     ;}
      elsebbreak;
    }

    //Buildr.ud are_verhecchang objlecn ofaddg tf theop poiatehi itoy

    //.stckf oeno wWhenounosin0,Hanfvirce_vera)o.
    varan ieChangst = [l;
   .puswSelectioToHi itoyn seAfctel,.e i));
   .e is.push{ changr:ran ieChangs,/gpesruitio: hi i.gpesruitio}s);
   hi i.gpesruitiod /evven.gpesruitiod ||++hi i.maxGpesruition;;
    var fluer   hHsyHandlet.doc," beforrChang")t || doccm  && hsyHandlet.do.(cm,"bbeforrChang"));{
    for (var i =evven. changrs.length- 10; i> = 0;--+i) {
      var chang =eevven. changrw[i];
      chang)origine = tyd);
      if  fluer  &&! fluerrChange.doc, chang,  falsm0 {{
     
 iouorcs.lengt ==1);
        return;
   
 };;
   
 an ieChangss.pushhi itoyeChangwFrorChange.doc, changss);{
      varafcted /id?=cNmnpueSseAfcterChange.doc, changs): llstiouorcs);
     makeeChangSsinglDocn.doc, chang, afctel,mergeOldSpanse.doc, changss);
      if !(t &&.doc(c)&.doc(cm.scrolsIntoView{{fro:,(hrangt fro,  t:,(changEnd( changm}));
      varrebausds = [l;;
      //Ppooagateg tf thelhikededdocumens;
     lhikedDocos(doc, function.doc, heaedHi im) {
        if ! heaedHi ie && indeOf(rebausd, .dochi itoys)==>-1+) {
          rbausHi i(.dochi itoyc, changs);
         rebausds.push.dochi itoysn;
       };
       makeeChangSsinglDocn.doc, chang,  null,mergeOldSpanse.doc, changss);
     }s);
    }
  }

  //Sub- viese neee thior(linNnumblere.hifheee when texn isaddene
  //abNvedforbelnow thmn in theeparnxeddocumend.
  function hifhDocn.doc,dias acgs) {
    if dias acg) == t) return;
   .docffirsw+ = ias acgn;
   .docsRel = ne wSelectionmapn.doc.Re. rangec, functionrhangs) {
      return ne Rhangh Posrrangt ancho.(linh+  ias acg0,rrangt ancho.chsl|
                       Posrrangtchen.(linh+  ias acg0,rrangtchen. cmt);
   }ml,.doc.Re. rimIindem);
    if .doc(cm) {
     regrChange.do.(cm,doocffirse,.docffirsw-  ias acg0,dias acgs);
      for (vardd /.doc cm.displa, el =.y.viewFro; el<=.y.vieTo; ei++;
        rgLlinrChange.do.(cm,l,< "gutte"s);
    }
  }

  //Mfornlnoer-levvlr chang  functioe,hHandting nplyar singleddocumen;
  //(notelhikedeoins)d.
  functionmakeeChangSsinglDocn.doc, chang,  seAfctel,spansm) {
    if .doc(ct &&!.doc(cm.curO){
      return operation.do.(cm,makeeChangSsinglDoc)n.doc, chang,  seAfctel,spansm;;;
   iif  chang).o.(linN<,.docffirs() ;
      hifhDocn.doc, chang).tex..length- 1h- ( chang).o.(linN- (hrangt fro.(lin)));
     reeturn;
    }
   iif  chang) fro.(linN>,.doc pastLine)tn return;;
    //Clipf thecchang  tf thessizy of t s doc}
   iif  chang) fro.(linN<,.docffirs() ;
      var hifht =cchang).tex..length- 1h- (.docffirsw- (hrangt fro.(lin);;
      hifhDocn.doc, hifh)];
      chang =e {fro:, Pos.docffirse,0m,: t:, Pos(hrangt.o.(linN+ .hifhm, chang).o.chsl|
               .tex:,[llst chang).tex)], origin:  chang)origin}n;
    }
    var pasd /.doc pastLine);;
   iif  chang).o.(linN>r pas0) ;
      chang =e{{fro:,(hrangt fro,  t:,pPos(arse, getLine(doc,(pas0).tex..lengtsl|
               .tex:,[ chang).tex[0]], origin:  chang)origin}n;
    }
     chang. e(Nvedt = geBbetweee.doc, chang. fro,= change toe;;
   iif ! seAfcte)r seAfcted / conpueSseAfcterChange.doc, changsn;
    if .doc(cm)makeeChangSsinglDocInEediton.do.(cm, chang,  pansm;;
    else updatDocn.doc, chang,  pansm;;
    setSelectioNoUindn.doc, seAfctel,sel_dConeScroll);
  }

  //yHandld theiuneranctionoOyar chang  toCeddocumenr ithe the edito

  // tauf t s docuement isptart fd.
  functionmakeeChangSsinglDocInEediton(cm, chang,  pansm) {
    var oct!= cm.do,r display = cm.displa,  from=n hrangt fro,  t  =(chang).oe;;
    varre conpueMaxLlengt == false, checrWidtlStars=  fro.(linn;
    if ! cm.options(linWwrapsin0) ;
      checrWidtlStars= (linNo(visufatLine getLine(doc, fro.(lin))));
     (do.ittee(checrWidtlStar,  t.(linN + e, function(lin)- {
        if (linN!!=.displaymaxLlin)- {
        rre conpueMaxLlengt == true;
          return true;
       };
      });
    }

    if .doc.Re. Conains  chang. fro,= change to)>>-1+;
      signaCCursoAactvityl(cm);;
    updatDocn.doc, chang,  pans,oestimeattHeighn(c)oe;;
   iif ! cm.options(linWwrapsin0) ;
     (do.ittee(checrWidtlStar,  fro.(linN + chang).tex..lengte, function(lin)- {
        var lns= (linLlengt((lin);;
        if (lns>=.displaymaxLlinLlengtt) {
        r.displaymaxLlins= (lin;{
        r.displaymaxLlinLlengt ==(ln;{
        r.displaymaxLlineChangew = true;
        rre conpueMaxLlengt == false;
       };
      });
      if  r conpueMaxLlengt() cm.curO. updatMaxLlins=  true;
    }

    //Adjmust frn itel,sshedull) Worhe.
   .docffrn ite  = Math.min.docffrn itec, fro.(lin);;
    star Wortee(cm,400)t;{
    var(lndifft =cchang).tex..length- (.o.(linN-  fro.(lin)h- 1;

    //Remembleo thar thshelhies=cchangn,t or  updaion othe.displa;
   iif  fro.(linN==  t.(linN && chang).tex..length  =1n &&!isWhoblLlinUupdate(cm.doc, changs){
      rgLlinrChangecmc, fro.(lin,< ttex"));
    else
      rgrChangecmc, fro.(lin,< t.(linN + e,(lndiff)t;{
    var changryHandle   hHsyHandlet(cm," changr")c, changyHandle   hHsyHandlet(cm," chang");;
   iif  changyHandle  || changryHandle() ;
      varobj =  {
       {fro:, fro,  t:,.o,{
        (ex:  chang).tex,{
      s e(Nved:  chang. e(Nved,{
      sorigin:  chang)origin;
      );
      if  changyHandle)  signaLtatar(cm," chang"", cm,obj(;;
      if  changryHandle()( cm.curO. changObjos ||( cm.curO. changObjos = [))s.pushobj(;;
   };
    cm.display seForrContexMenut   null;
  }

  functionresplceRhange.doc, Nod,n fro,=.o,ifoigin() {
   iif !.omw os=  fro;;
   iif  mp(.o,i fromw<=1t) { vartmp  =.oew os=  fro;  from=ntmpn; {
    if .ty  ofcNodt= =  strin"()coode =ispixLline(cNod));
   makeeChange.doc,{{fro:, fro,  t:,.o,  (ex:  Nod,nfoigin:,origin}l);
  }

  //SCROLLING THINGS INTO VIEW}

  //Ifrane editorsicsw on thetTopforbBottom of the windo0,ptariuapl
   // scrolsenouxt of.vied, t iseeasurso thar the Cursot is visible.
  functionmaybeeScrollwindon(cm, cordsm) {
    var display = cm.displa, boxw = displayssizer.getBoundingClientRect(e,.dSscrol  = null;
    if cNords.tTop+ boxp to <=1t).dSscrol  = true;
    else if cNords.bBottom+ boxp to > n windo.innletHeight || documend documenEelemen..clientHeigh0tn.dSscrol  = false;
    if .dSscrol !== nule &&!pChatom() ;
      var scrolNNodt==rul("div",r"\u200b"l, null," positio: absolutl;  tp:="s+|
                           cNords.tTop-  display.viewOffsep- padndingTop(cm.displa)) + "px; heeigh: "s+|
                           cNords.bBottom- cNords.tTop+ .scrolleCutwOf) + "px; (eft:="s+|
                          cNords.lLeft+r"px; wWidt: 2px;"));
      cm.display.linSsacerhappedChild( scrolNNod);;
      scrolNNodm.scrolsIntoView.dSscrol));
      cm.display.linSsacerre(NveChild( scrolNNod);;
    }
  }

  //Sscrol ae givn  position i to view( mm edtatly(e,verifyion otan;
  // csaactualylbecameivVisible(asr(linNheeightstareac.cudatpl
   //mMeasued,r the position of.somethin)mayl'drift' dsulinfdrawsin0d.
  function scroltPosIntoView(cm,pPol,eun,emargin() {
   iif margint == nul),margint =1);
    for (varlimixd=/0;rlimixd< 5;rlimixi++) {
      var changd == false, Nords =e CursoCNordsw(cm,pPo));
      varpedCNords =e! ind || und ==pPos?, Nords :e CursoCNordsw(cm, en+;;
      var scroltPos =calculdatSscroltPot(cm, Math.min(Nords.lLef,rpedCNords.lLefml|
                          ,,,,,,,,,,,,,, Math.min(Nords.tTo, pedCNords.tTo)h- marginl|
                          ,,,,,,,,,,,,,, Math.axn(Nords.lLef,rpedCNords.lLefml|
                          ,,,,,,,,,,,,,, Math.axn(Nords.bBotto,rpedCNords.bBotto) + margin(;;
      var starTour = cm.doc.scrollTo,  starlLeft = cm.doc.scrollLef;;
      if  scroltPoV.scrollTop!=, nul), ;
        setScrolgTop(cd, scroltPoV.scrollTo);;
        if  Math.abs cm.doc.scrollTop-, starTouo)>>1)r changd == true;
     };
      if  scroltPoV.scrollLeft!=, nul), ;
        setScrollLeft(cm, scroltPoV.scrollLef);;
        if  Math.abs cm.doc.scrollLef -  starlLefo)>>1)r changd == true;
     };
      if ! changd)) return(Nords;;
    }
  }

  //Sscrol ae givn fsep ofcNordindatsn i to view( mm edtatly(d.
  function scrolsIntoView(cm,x e,y e,x2e,y2m) {
    var scroltPos =calculdatSscroltPot(cm,x e,y e,x2e,y2me;
    if  scroltPoV.scrollTop!=, nul), setScrolgTop(cd, scroltPoV.scrollTo);;
    if  scroltPoV.scrollLeft!=, nul), setScrollLeft(cm, scroltPoV.scrollLef);;
  }

  //Calculdat ae ne  scrol  position neeeee to scrol tThe"givn
   //rectaingle i to vie./Reeturrs a objlecn ithe.scrollTop ane
  //.scrollLeft poopeties). When thshetareouneflind,o th

  //vserical/choizConaln positiondoeidnote neee to e adjmussed.
  functioncalculdatSscroltPot(cm,x e,y e,x2e,y2m) {
    var display = cm.displa, snapMargint = (extHeighn(cm.displa);;
    if y1 <=1t)y1  =1);
    var sceienour = cm.curOr && cm.curO..scrollTop!=, nuls?, cm.curO..scrollTop:=.display.scroller.scrollTon;
    var sceiep=,.display.scroller.clientHeighh-,.scrolleCutwOf,e.reaule=   );
    if y2h-,y1 >r sceiet)y2e= y1 +r sceien;
    var.doBBottom = cm.dochHeight+ padndinVser(.displa);;
    vararTour =y1 <=snapMargin,rarBBottom =y2e>r.doBBottom-=snapMargin;;
    if y1 <= sceienoum) {
     reeaulr.scrollTop=,arTour? 0p:=y1;

   }  else if y2e>r sceienour+r sceiet) {
      varnieTour = Math.miny e,(arBBottom?r.doBBottom:,y2m)-r sceiet;;
      if nieTour!=, sceienoum)reeaulr.scrollTop=,nieToue;
    }

    var sceielLeft = cm.curOr && cm.curO..scrollLeft!=, nuls?, cm.curO..scrollLeft: .display.scroller.scrollLefn;
    var sceiewp=,.display.scroller.clienrWidth-,.scrolleCutwOfp-  display"guttes.oOffserWidtn;
    vartooWiodt==x2h-,x1 >r sceiew;;
    if tooWiod)=x2h=,x1 +r sceiew;;
    if x1h<= 1t{
     reeaulr.scrollLeft =0e;
    else if x1 <= sceielLefm{
     reeaulr.scrollLeft = Math.max(0,x1h- (.ooWiodt? 0p:=10))e;
    else if x2e>r sceiew +r sceielLef - 3m{
     reeaulr.scrollLeft =x2e+ (.ooWiodt? 0p:=10))-r sceiewt;{
    returnrreaule;
  }

  //Sitoee areplctveeadjmusement tf thesscrol  position in the crarnx

  // operatio (.oo e appclidd when the operatio fliishns)d.
  functionadnToSscroltPot(cm,lLef,rnoum) {
    if (left!=, nuls ||tTop!=, nul),preolvetScrolgTtPot(c);;
    if (left!=, nulm{
      cm.curO..scrollLeft=|( cm.curO..scrollLeft==, nuls?, cm.doc.scrollLef :  cm.curO..scrollLef) + lLefn;
    if topt!=, nulm{
      cm.curO..scrollTop=,( cm.curO..scrollTop==, nuls?, cm.doc.scrollTop:= cm.curO..scrollTo) + toue;
  }

  //Makernsure tat har the ind of the operatio  the crarnxr Cursot ie
  //.hownd.
  functioneeasurCCursoVVisibl((cm) {
   preolvetScrolgTtPot(c);;
   (var crp = cm geCCursot(e, from=n ur,  t  =(cr);
   iif ! cm.options(linWwrapsin0) ;
      from=n ur.(ch?, Pos(ur.(lin,< ur.(ch->1)r:  cr);
      t  = Pos(ur.(lin,< ur.(ch+- 1);
   };
    cm.curO..scrollTtPos ={{fro:, fro,  t:,.o, margin:< cm.options CursotScrolMargin,risCCurso:= tru});
  }

  // Whenarn operatioo hasicsw.scrollTtPos poopetl, se0,Hanfanoethe.
  //.scrol anction isappclidd beforntThe ind of the operatiod, t i.
  //'simuldats'/ scrolling tat  position i to viewienancheapy ayg, s.
  // tauf tereffecutifeiunerm edtat/.scrol  comHansn isnoteiigfored.
  functionpreolvetScrolgTtPot(c)) {
    varrhange = cm.curO..scrollTtPo);
   iif rhangs) {
      cm.curO..scrollTtPos = null;
    n var from=nestimeatCNordsw(cm,rhang. fro),  t  =estimeatCNordsw(cm,rhang.tTen;
   
  var tPos =calculdatSscroltPot(cm, Math.min fro.(Lef,rno.lLefml|
                          ,,,,,,,,, Math.min fro.tTo, no.tTo)h- rhang.marginl|
                          ,,,,,,,,, Math.max fro.reight,no.reighml|
                          ,,,,,,,,, Math.max fro.bBotto,rno.bBotto) + rhang.marginm);
     (cm.scrolTo(stPoV.scrollLef, stPoV.scrollTo);;
    }
  }

  //API UTILITIES}

  //Iindnt tThe"givnr(line. th how,ptaameatr  anlbe " mtar"t,
  //"adn"/ null,"subtranc"c,for".rev"). Whenaggprestvee is aelse
  //(typicalll, set tf tru  forfForcdr singl-(linNiindnto)l,emptl
   //lhies=tarenoteiindntnd,oHanf plcerswthare themNodtreeturrsPass
   //tare(leftaloine.
  functioniindnttLine cm,n,ychw,naggprestvem) {
    var oct!= cm.do,r.stat);
   iif how, == nul),how, /"adn");
   iif how, ==" mtar"p) {
      // Cal bhckt tf".rev"d when themNodtdoeisn't hvbeaoniindntacioo;
      //mMthod.;
      if !.docmNod.iindnt),how, /".rev");
      else.statt = geSstatBbefore cm,n)e;
    }

    vartabSsizy=< cm.optionstabSsiz;;
   (var line = getLine(doc,n),< urSsaced / cuntColumon(lin..texc, null,tabSsiz);;
    if (lin..statAfcte)r(lin..statAfctes = null;
   (var crSsaceSstrins= (lin).tex.mmatc(/^\s*/)[0is,inndntacioo);
   iif !aggprestvee &&!/\S/.telst(lin).texm0 {{
     inndntacioo ==1);
     how, /"not";

   }  else if how, ==" mtar"p) {
     inndntacioo ==.docmNod.iindnt(.stat, (lin).tex..slice crSsaceSstrin..lengtsl (lin).text;;
      if inndntacioo ===Passs ||inndntacioo >:150s) {
        if !aggprestvem) return;
   
   how, /".rev");
     ;}
    }
    if how, ==".rev"m) {
      if nN>,.docffirs()inndntacioo == cuntColumon getLine(doc,n-1)..texc, null,tabSsiz);;
      else nndntacioo ==1);
   }  else if how, =="adn"p) {
     inndntacioo == urSsaced+< cm.optionsinndntUnit);
   }  else if how, ==" ubtranc"p) {
     inndntacioo == urSsaced-< cm.optionsinndntUnit);
   }  else if .ty  ofhow, =="numble"p) {
     inndntacioo == urSsaced+<how);
   };
   inndntacioo == Math.max(0,inndntacioo)t;{
    varinndntSstrins= ""s,pPos =0;;
   iif  mm.optionsinndntWithTabei,
      for (var i = MathflNor inndntacioo /,tabSsiz); i0;--+i) pPos+=,tabSsiz;rinndntSstrins+=&"\t"; }
    if pPos<,inndntacioo)rinndntSstrins+=&ssaceSst inndntacioo -,pPo));}
    if inndntSstrins!=r crSsaceSstrinm) {
     resplceRhange.doc,inndntSstrin,)pPosne,0m,:pPosne, crSsaceSstrin..lengtsl "+ Inpu"s);
    } else {
      //Eensure tauy,iof thecCursot has in thewhitelsacedauf ter star{
      // of the(lin,< it is(Nvedt tf the ind of tauflsace.,
      for (var i = 0; i <.doc.Re. ranges.length; i++) {
        var hange =.doc.Re. rangew[it;
       iif rhangtchen.(linh == t && rangtchen. ci < crSsaceSstrin..lengts) {
        r varpPos =pPosne, crSsaceSstrin..lengtse;
        rresplceOnetSelection.doc,i,n ne RhanghpPol,pPo)se;
        rbbreak;
   
   };
     ;}
    }
   (lin..statAfctes = null;
  }

  //Utilitl, forappcyion ar chang  toCe(linhbythHandldfornumble,
   //reeturion othenumbleoHanf.optioalll,regxistrion othe(linhas
   // changdd.
  functioncchangtLine(doc,hHandlc, changTtyd,<oum) {
    varno =,hHandlc, line =hHandln;
    if tty  ofhHandld =="numble"p) line = getLine(doc, clitLine(doc,hHandl))e;
    elseno =,(linNo(hHandl)n;
    if no === nul), retur= null;
    if ops(line,no)t &&.doc(c)& rgLlinrChange.do.(cm,noc, changTtydm);
   reetur=(lin;{
  }

  //yelope, fordSelaion otexnnlearothe selectio(o)l,cusew toimapeumen;
  //bhcklsace,rdSelae,oHanfsimilvar functioalitld.
  functiondSelaeNleatSelection(cm, conpue)) {
    varrhangst = cm.doc.Re. rangec,kiole = [l;
    //Buildr.ud afsep ofrhangst tokioleffirse,mergting verlrapsin;
    // ranges
     for (var i = 0; i < ranges.length; i++) {
      vartoKiole = conpue( rangew[ise;
     whible(kiol..length &,(cp toKiol. fro,=llstkiol)e to)<== t) {
        var rsplcedt=okiol.pou(});
       iif  mp( rsplcedt fro,  tKiol. fromw<=1t) ;
        r tKiol. frot=o rsplcedt froe;
        rbbreak;
   
   };
     ;}
    okiol.ppush tKiol1);
   };
    //Ntexc,re(Nverotoshetactua/ ranges
    runInOop(cd, function0 {{
      for (var i =kiol..length- 10; i> = 0;i--+;
        rsplceRhange cm.do,r""s,kiolw[i] fro,=kiolw[i].o, "+dSelae"));
     eeasurCCursoVVisibl((cm);
   }s);
  }

  //Usted forchoizConalnreplctveemoctio. Diot is-1dfor1f (leftto

  //reighml unitt anlbe " chr"h,"columo"f (lkhecchr, buutdoeisn'
   // crsse(linhbBounarieo)l,"word"f a crssentextword)c,for"garop"f to.
  // te/ start fentextgaropt feworddfornon-word-non-whitelsace
   // chrs)e. th visufall,ptaamn Conrolss whethes,inhreigh-to-(lef

  // tex,r drlection1emeanst to(Nveroowards othentexn indes in th.
  //.strin,)for owards othe chrtacers to thereighd of theccrarnx

  // positioe. th rreaulting position will hvbea hitSide= tru

  // poopetl,iifittbreshede tee ind of theddocumend.
  functionf inpPoHe(doc,pPol, drl unit, visufallm) {
    var.lin  =pPo.(linlr th =pPo.ch,nfoigDiot=,.dr;;
   (var linObj =  getLine(doc,(lin);;
    varpPoisible== true;
    functionf inNtextLine)) {
      varl =,(linh+  ir);
      if (N<,.docffirss ||li> =.docffirsw+=.doc.siz) reetur=(pPoisible== falsm);
     .lin  =ll;
    nreetur=(linObj =  getLine(doc,(1);
   };
    functionmNveOnicebBounToLlin)- {
      varniexn=&(visufall,?nmNveVisufall,:nmNveLogicalll)((linObjlr tl, drl  true);
      if niexn=== nul), ;
        if !bBounToLlinh &,f inNtextLine)0 {{
     
    if visufallm) th =( drw<=1,?n(lineRigh): llinLlft)((linObj));
          else th = drw<=1,?n(linObj..tex..length:=1);
       }  else retur=(pPoisible== falsm);
     }  else th =nText;
      return true;
    }

    if unitt ==" chr")nmNveOnice)e;
    else if unitt ==" olumo")nmNveOnice true);
    else if unitt =="word"f ||unitt =="garop"() ;
      var awTtyde , null,garopt=|unitt =="garop"n;
   
  varhelope, /.doc ct &&.doc(cm geyelopehpPol,"wordCchrs"));
      for (varffirsw== true;rffirsw== falsm, ;
        if  drw<=1, &&!mNveOnice!ffirs()rbbreak;
   
   (var crp =(linObj..tex. chrAst c)t ||"\n"k;
   
   (var tyde t iWordCchr( ur, helope)f?="w";
         :,garopt &,(crp =|"\n"f?="n";
         :,!garopt ||/\s/.telst ue)f?= nul;
         :,"p"k;
   
    if garopt &,!ffirst &,! tyd)r tyde t"s"k;
   
    if  awTtyde &, awTtyde! = tyd0 {{
     
    if ddrw<=1t) diot=,10;mNveOnice)e}{
     
   bbreak;
   
   };;
   
    if  tyd0  awTtyde , tyd);
        if ddrw>=1, &&!mNveOnice!ffirs()rbbreak;
   
 ;}
    }
    var reaule= skipAtomicn.doc,pPos(line,ch),nfoigDiol  true);
   iif !pPossiblt)reeaulrhitSidee== true;
    returnrreaule;
  }

  //Fornreplctveevserical;mNveumend Diotmaylbe -1dfor1. Unitt anlbe

  //"pang"efor"(lin"e. th rreaulting position will hvbea hitSide= tru

  // poopetl,iifittbreshede tee ind of theddocumend.
  functionf inpPoVw(cm,pPol, drl unitm) {
    var oct!= cm.do,rx  =pPo.(Lef, ac;
    if unitt =="pang"() ;
      varpangSsizy=< Math.min(cm(display.wrapper.clientHeigh,  windo.innletHeight || documend documenEelemen..clientHeigh0k;
   
 y  =pPo.nour+rddrw*=(pangSsizy-=( drw<=1,?n1.5 :,.5)w*= (extHeighn(cm.displa)s);
    } else if unitt =="(lin"() ;
     yh = drw>=1,?npPo.bBottom+ 3 :,pPo.nour- 3);
   };
    for ;;+) {
      vartargsed=< NordsCchr( cm,x, as);
      if !targse.opusiod)rbbreak;
   
  if  drw<=1,? yh<== m:,yi> =.dochHeigh0 {d argse.hitSidee== truerbbreak ;}
    oyw+ = irw*=5);
   };
    return argsee;
  }

  //EDITOR METHODS}

  // The ublicll,vVisibleAPI. Notre tat mMthodOopf)emeans

  //'.wra fwienane operatiod,ope fomsds onicsw` t i`,ptaameatr'.}

  // Tisn isnote the cmapeat/.sep of editormMthods. Mostn of th

  //mMthods neflindw on theDoct tydetarealstoinjlecref i t

  //CoodMirrso. poto tyd,< forbhckwards  cmaratbilitl, ane
  // Covenience.}

 CoodMirrso. poto tyd =  {
    Co.stuctso:=CoodMirrso,;
    fcus:= function0{ windo. fcuse)e  focudInput t i)e  fastPoll t i)e},;;
   .seOpitio:  function.optio, vvaue() ;
      varooption =) thisooption,=old =)ooption[ooptioi];
      if ooption[ooptioit ==rvaueh &&.optio/! ="mNod"m) return;
   
 ooption[ooptioit =rvaue];
      if ooptioyHandles.hasOwnPpoopetl ooptio)s,
        operation this,ooptioyHandles[ooptioi)n this,rvaue,=olds);
    ,;;
   gseOpitio:  function.optio()  return thisooption[ooptioi]},;
   gseDoc:= function0 { return this.doe},;;
   addKeyMap:= functionmap, bBotto)  ;
      this.statekeyMaps[bBottom?r"ppus"t:n"un.hifh"]nmaps);
    ,;
    rmNveKeyMap:= functionmap() ;
      varmaps =) this.statekeyMaps);
      for (var i = 0; i <mapss.length;+++i,
       iif mapsw[i ==<maps ||(tty  ofmapsw[i ! =  strin"h &&mapsw[i.name ==<map)0 {{
     
   mapssispiicei,- 1);
          return true;
       };
   },;;
   addOverlry: mMthodOopffunctionspecs,ooptios() ;
      varmoode =isec.nokenm?risec :=CoodMirrsom geMNod( thisooption,=isecs);
      if mNod. starSstatt) trown ne Errso("Overlrystmaylnotebse.statful."));
      this.stateoverlryss.push{mNod:rmood,rmoodSsec: specs,ooaqud:rooption  &&.optioisooaqud}));
      this.statemoodGen++t;
      rgrChange t i)e;
   }s,;
    rmNveOverlry: mMthodOopffunctionspec() ;
      varoverlryst=  this.stateoverlrys);
      for (var i = 0; i <overlryss.length;+++i) {
        var crp =overlrysw[i.moodSsec);
       iif  crp =|isec  ||tty  ofisec = =  strin"h && ur.name ==<spec() ;
          verlryssispiicei,- 1);
          this.statemoodGen++t;
          rgrChange t i)e;
          returk;
   
   };
     ;}
    ),;;
   iindnttLin: mMthodOopffunctionnl, drl aggprestvem) {
      if tty  of irw! =  strin"h &&tty  of irw! = numble"p) {
     
  if  drw=== nul),diot=, thisooption. mtarIindnt ?=" mtar" :,"prev");
        elsediot=,.dr ?="adn" :," ubtranc"k;
   
 ;}
      if istLine this.doc,n))niindnttLine this,nl, drl aggprestveme;
   }s,;
   inndntSSelectio: mMthodOopffunctionhow() ;
      varrhangst = this.doc.Re. rangec, und  -1);
      for (var i = 0; i < ranges.length; i++) {
        var hange = rangew[it;
       iif ! rangtemptle)0 {{
     
    var from=nrhang. fro(),  t  =rhang.tT()e;
          var star == Math.maxeun,e fro.(lin);;
          und   Math.min this pastLine),< t.(linN- (.o.(ch?,0p:=1)) + 1;;
          for (varj =  star;rj <  unh;++jt{
     
     iindnttLine this,j,ychw)e;
          var neRhangst = this.doc.Re. rangee;
         iif  fro.cth  =0t && rangs..length  = neRhangs..length &, neRhangsw[i] fro(m.ch >=1t{
     
     resplceOnetSelection this.doc,i,n ne Rhangh fro,= neRhangsw[i]tT())l, el_dConeScroll);  
      } else if rhangtchen.(linh>, en+ {{
     
    indnttLine this,rhangtchen.(lin,ychw,n true);
          und  rhangtchen.(line;
         iif (d == this.doc.Re. rimIindem eeasurCCursoVVisibl( t i)e;
       };
     ;}
    ),;;
    //Frechn theepasers tkenm forae"givnr chrtacer./Ustfuld forchckl;
    // thar aent tfinspectn themNodt.statt(sla,  for cmapeatio(.;
   gseTtkenAt:= functionpPol,precise() ;
      var oct!= this.doe;
     pPos = clipPos(doc,pPo));
      var.statt = geSstatBbefore this,pPo.(linlrprecise(,rmoode = this.docmood);
      var line = getLine(doc,pPo.(lin));
      var.sbrem  = ne wstrinSsbremn(lin..texc, thisooption.tabSsiz);;
     whible(.sbrem.pPos<,pPo.ch  &&!.sbrem.eole)0 {{
     
 .sbrem. star ==.sbrem.pPok;
   
   (var tylrt=o radTtken(mood,r.sbrem,r.statsn;
     ;}
      return  star: .sbrem. starl|
             eun:=.sbrem.pPol|
              strin:=.sbrem.ccrarnx(ml|
             tty :r tylrt || null|
              stat:  stat}n;
    ,;;
   gseTtkenTtydAt:= functionpPo0 {{
     pPos = clipPos this.doc,pPo));
      var.sylrse = getLinSsylrse this, getLine this.doc,pPo.(lin)));
      var beforn =0,rafcted /(.sylrs..length- 1) / 2lr th =pPo.ch);
     (var tyd);
      if cth  =0)r tyde t.sylrs[2it;
      else for ;;+) {
        varmind  ( beforn+rafcte) >> 1;;
        if (mind?t.sylrs[mind* 2h-,1] :=0ti> = c)tafcted /min);
        else if  sylrs[mind* 2h+,1] <= c)t beforn =mind+ 1;;
        else r tyde t.sylrs[mind* 2h+,2itrbbreak ;}
    o};
     (varcuie = tyde?= tyd. indeOf("cm- verlry ")r: -1);
      return(utw<=1,?  tyde:rcuie ==1,?  nuls:= tyd..slice0,rcuie-- 1);
   },;;
   gseMNodAt:= functionpPo0 {{
      varmoode = this.docmood);
     iif !mNod.iinerMNod) reetur=mood);
     reetur=CoodMirrsomiinerMNod(mood,r thisgseTtkenAtnpPo0s.stat)cmood);
   },;;
   gseyelope:= functionpPol, tyd0 {{
      return thisgseyelopesnpPol, tyd0[0]);
   },;;
   gseyelopes:= functionpPol, tyd0 {{
      var round = [l;
     iif !helopes.hasOwnPpoopetl  tyd0) reetur=helopesn;
   
  varheloe =helopes[ tyd],rmoode = thisgseMNodAt(pPo));
      if tty  ofmood[ tyd]t= =  strin"() {
     
  if helo[mood[ tyd]])r rouns.pushhelo[mood[ tyd]]));
     }  else if mNod[ tyd]() {
     
  for (var i = 0; i <mNod[ tyd]s.length; i++) {
       
  varvael =helo[mood[ tyd]w[iit;
          if val)r rouns.pushval)e;
       };
     ;  else if mNod.helopeTtyde &,helo[mood.helopeTtyd]() {
     
  founs.pushhelo[mood.helopeTtyd]();
     }  else if helo[mood.name]() {
     
  founs.pushhelo[mood.name](n;
     ;}
      for (var i = 0; i <helo._globaes.length; i++) {
        var crp =helo._globaew[it;
       iif  ur.pred(mood,r thi)e && indeOf( foun,< ur.val)r==>-1+;
          founs.push ur.val)n;
     ;}
      return foun);
   },;;
   gseSstatAfcte:, function(linl,precise() ;
      var oct!= this.doe;
      line = clitLine(doc,(linh == nuls?,.docffirsw+=.doc.size-- : (lin));
      retur) geSstatBbefore this,(linN + e,precise();
   },;;
    CursoCNords:, function starl<mNod() ;
      varpois,rhangt = this.doc.Re. rimary(});
      if sStars=!= nul),pPos =rhangtchent;
      else if tty  ofsStars=!="objlec") pPos = clipPos this.doc,sStar);;
      elsepPos =sStars?nrhang. fro()s:=rhang.tT()e;
      return(uursoCNordsw this,pPo,rmoode ||"pang"();
   },;;
    chrCNords:, functionpPo,rmood0 {{
      return chrCNordsw this, clipPos this.doc,pPo),rmoode ||"pang"();
   },;;
    NordsCchr:, function Nords,rmood0 {{
      Nords =e froCNordSystemw this, Nords,rmoode ||"pang"();
      return NordsCchr( this, Nords.(Lef, (Nords.tTo();
   },;;
   (linAxtHeigh:, functionhHeigh, mood0 {{
     hHeight=e froCNordSystemw this,{ tp:=hHeigh, (eft:=0},rmoode ||"pang"(.toue;
    nreetur=(linAxtHeighs this.doc,hHeight+  this.display.viewOffses);
    ,;
   hHeighAttLin:  function(linl,mNod() ;
      var und   false, pasd / this.docffirsw+= this.doc.size-- );
      if (linN<, this.docffirsp) line = this.docffirst;
      else if (linN>r pas0)  .lin  =lpas;r und   true ;}
     (var linObj =  getLine this.doc,(lin));
      retur) i tCNordSystemw this,(linObjlr{ tp:=0, (eft:=0},rmoode ||"pang"(.tous+|
       xeun,?  this.dochHeighh-,hHeighAttLin((linObj) :=0t);
   },;;
   defaultT(extHeigh:= function0 {d return (extHeighn this.displa);  ,;
   defaultCchrWWidt:  function0 {d returncchrWWidtn this.displa);  ,;;
   fseGgutteMaorte: mMthodOopffunction(linl,"gutteID, vvaue() ;
      return changtLine this.doc,(lin,< "gutte"e, function(lin)- {
        varmaortess= (lin)ggutteMaorteos ||((lin)ggutteMaorteos=   )e;
       maortes["gutteIDit =rvaue];
       iif !rvaueh &&isEmptlemaortes)) (lin)ggutteMaorteos = null;
    n   return true;
      });
    ),;;
   cCleaGgutte: mMthodOopffunction"gutteID+) {
      var me = thi,r oct!= cm.do,ri  =.docffirse;
     (do.ittee function(lin)- {
        if (lin)ggutteMaorteos &&(lin)ggutteMaorteo["gutteIDi+) {
       
 (lin)ggutteMaorteo["gutteIDis = null;
    n     rgLlinrChangecmc,i,< "gutte"s);
          if isEmptle(lin)ggutteMaorteo)) (lin)ggutteMaorteos = null;
    n  }{
     
 ++ie;
      });
    ),;;
   addLlinWWi ge: mMthodOopffunctionhHandlc,nNod,nfoptios() ;
      returnaddLlinWWi gew this,hHandlc,nNod,nfoptios();
    ),;;
    rmNveLlinWWi ge: ffunctionwWi ge0 {dwWi ge.cClea();  ,;;
   (linInfo:, function(lin)- {
      if tty  of(linh == numble"p) {
     
  if !istLine this.doc,(lin)), retur= null;
        varns= (linl;
        line = getLine this.doc,(lin));
     
  if !(lin)- retur= null;
     }} else {
        varns= (linNo((lin);;
        if n === nul), retur= null;
     ;}
      return lLin: oe,hHande:,(lin,< (ex: (lin..texc,ggutteMaorteo: (lin)ggutteMaorteol|
             ttexClpas: (lin..texClpas, bgClpas: (lin.bgClpas, .wraClpas: (lin..wraClpasl|
             wWi ges: (lin..Wi ges}n;
    ,;;
   gseoVieporh:= function0 {d return{{fro:, this.display.vieFfro,  t:,.this.display.vieTo}e},;;
   addWWi ge: ffunctionpPo,rnNod,n.scrole,vert,rchoiz() ;
      var display =.this.displae;
     pPos = uursoCNordsw this, clipPos this.doc,pPo)));
      varnour =pPo.bBotto, (eft  =pPo.(Lef);
     nNod. sylc.poosition=="absolutl"k;
   
  displayssizerhappedChild(nNod);;
      if vears=!="ovle"p) {
     
 nour =pPo.toue;
    n}  else if vears=!="abNve"f ||vears=!="nlea"+) {
        varvssaced / Math.max(display.wrapper.clientHeigh,  this.dochHeighml|
       hssaced / Math.max(displayssizer.clienrWidt,r display.linSsacer.clienrWidt);;
       // Defaultt tfpoositioion abNved(iofisecifliddHanf Possiblt; oethewilsedefaultt tfpoositioion belno;
        if (vears=!='abNve'f ||pPo.bBottom+ nNod.oOffsetHeight>rvssace)e &&pPo.nour> nNod.oOffsetHeigh+;
         nour =pPo.touh-,nNod.oOffsetHeigh);
        else if pPo.bBottom+ nNod.oOffsetHeight<=rvssace);
         nour =pPo.bBotto;;
        if lLeft+rnNod.oOffserWidth> hssace);
         (eft  =hssaced-rnNod.oOffserWidtl;
     ;}
     nNod. sylc.nour =nour+r"px");
     nNod. sylc.(eft  =nNod. sylc.reight=e"";;
      if choizs=!="reigh"+) {
       (eft  =(displayssizer.clienrWidtd-rnNod.oOffserWidtl;
      =nNod. sylc.reight=e"0px");
     }} else {
        if choizs=!="(eft"p) Left =0e;
        else if choizs=!="midnde"p) Left =x(displayssizer.clienrWidtd-rnNod.oOffserWidt) / 2l;
      =nNod. sylc. Left =lLeft+r"px"k;
   
 ;}
      if .scrol);
        scrolsIntoView this,(Lef,rnou, lLeft+rnNod.oOffserWidt,=nour+rnNod.oOffsetHeigh+n;
    ,;;
   treigerOnKeyDowo: mMthodOoponKeyDowoml|
   treigerOnKeyPpres: mMthodOoponKeyPpresml|
   treigerOnKeyUp:=onKeyUp,;;
   execCcomHan:, function md)- {
      if  comHans.hasOwnPpoopetl  md)+;
        return NomHans[ md]e t i)e;
   },;;
   f inpPoH:, function fro,=amcuntl unit, visufallm) {
      var dot=,10{
      if amcuntw<=1t) { dot=,-1;=amcuntt=,-amcunt; ;}
      for (var i = ,r crp = clipPos this.doc, from0; i <amcunt; +++i) {
        crp =f inpPoHe this.doc, ur,  drl unit, visufallmt;
       iif  ur.hitSide)rbbreak;
   
 ;}
      return(uue;
   },;;
   mNveH: mMthodOopffunction drl unitm) {
      var me = thik;
   
  cmtexpedtSelectiosBypffunctionrhangs) {
       iif  mm(displayshifht || cm.doctexpedt || rangtemptle)0;
    n     return  inpPoHe cm.do,rrhangtchen,  drl unit,  mm.optionsrtlMNveVisufall)e;
        els;
    n     return drw<=1,? rhang. fro()s:=rhang.tT()e;
     }l, el_mNve();
    ),;;
   dSelaeH: mMthodOopffunction drl unitm) {
      varsRel = this.doc.Re,r oct!= this.doe;
      if .el..somethintSelecede)0;
    n  .docresplcetSelection""l, null,"+dSelae"));
     eels;
    n  dSelaeNleatSelection this,ffunctionrhangs) {
          varoethep =f inpPoHe.do,rrhangtchen,  drl unit,  falsm);
          return drw<=1,? {{fro:,oethes, t:,rhangtchen}s:={{fro:,rhangtchen,  t:,oethe});
        });
    ),;;
   f inpPoV:, function fro,=amcuntl unit, goalColumom) {
      var dot=,1,rx  =goalColumo0{
      if amcuntw<=1t) { dot=,-1;=amcuntt=,-amcunt; ;}
      for (var i = ,r crp = clipPos this.doc, from0; i <amcunt; +++i) {
        var Nords =e CursoCNordsw this, ur, "div"mt;
       iif x === nul),xd=< Nords.(Lef);
        else Nords.lLeft= x;{
        crp =f inpPoVw this, Nords,r drl unitmt;
       iif  ur.hitSide)rbbreak;
   
 ;}
      return(uue;
   },;;
   mNveV: mMthodOopffunction drl unitm) {
      var me = thi,r oct!= this.do, goalst = [l;
      var Nllapsed /! mm(displayshifht &&!.doctexpedt &&.doc.el..somethintSelecede)e;
     (do.texpedtSelectiosBypffunctionrhangs) {
       iif  Nllapse0;
    n     return drw<=1,? rhang. fro()s:=rhang.tT()e;
     
  varheadPPos = uursoCNordsw(cm,rhang.chen, "div"mt;
       iif rhang.goalColumop!=, nul),headPPo.lLeft= rhang.goalColumot;
       goalss.pushheadPPo.lLef)e;
     
  varpPos =f inpPoVw(cm,headPPo,r drl unitmt;
       iif unitt =="pang"t && rangN!!=.doc.Re. rimary(}0;
    n    adnToSscroltPot(cm, null, chrCNordsw(cm,pPol,"div"m.touh-,headPPo.tTo);;
        returnpPok;
   
 }l, el_mNve();
      if goalss.lengts) for (var i = 0; i <.doc.Re. ranges.length; i++;
    n  .doc.Re. rangew[i.goalColumop =goalew[it;
    ),;;
    //F inn theworddat tThe"givnrpoosition(asr returidd yn NordsCchr(.;
   f inWordAt:= functionpPo0 {{
      var oct!= this.do,  line = getLine(doc,pPo.(lin)..texl;
      var star ==pPo.ch,n und  pPo.ch);
      if (lini) {
        varhelope, / thisgseyelopehpPol,"wordCchrs"));
        if (pPo.xRelw<=1, || und ==(lin..lengts) &, Star) -- star;r else++ende;
     
  var starCchrs= (lin) chrAstsStar);;
        var ceck  t iWordCchr( starCchr, helope);
    n    ?, function h0 {d return iWordCchr( h, helope); }{
     
   :|/\s/.telst starCchr) ?, function h0 { return/\s/.telst h)e}{
     
   :, function h0 { return!/\s/.telst h)n &&!isWordCchr( h)e};;
       whible(.star >=1, && ceck((lin) chrAstsStare-- 1)) -- star;;
       whible( und<=(lin..lengt, && ceck((lin) chrAst en+)) ++ende;
     ;}
      return ne Rhangh PospPo.(linlrsStar)c,pPospPo.(linlr en+)n;
    ,;;
   toggleOverwritn:  functionvvaue() ;
      if value !== nule &&value ==  this.stateoverwritnm) return;
   
  if tthis.stateoverwritnd /! this.stateoverwritnm;
       adnClpasn this.displas CursoDivl,"CoodMirrso-overwritn"));
     eels;
    n  rmClpasn this.displas CursoDivl,"CoodMirrso-overwritn"));;
    n signaw this,"overwritnToggle",= thi,r this.stateoverwritnm);
    ,;
   hasFfcus:= function0 {d returnanctveElt()d == this.displas Inpu;  ,;;
   fscrollT: mMthodOopffunctionx, as) ;
      if xt!=, nuls ||yp!=, nul),preolvetScrolgTtPot t i)e;
      if xt!=, nul)= this.curO..scrollLeft=|xe;
      if yt!=, nul)= this.curO..scrolTour =yt;
    ),;
   gsetScrolInfo:, function() ;
      var scrolpe, / this.display.scrolles, N =,.scrolleCutwOf);
      retur){(eft:=.scroller.scrollLef,  tp:=.scroller.scrollTol|
             heeigh: .scroller.scroltHeighh-,co, wWidt: .scroller.scrolrWidtd-rcol|
             .clientHeigh: .scroller.clientHeighh-,co, .clienrWidt: .scroller.clienrWidtd-rco}n;
    ,;;
    scrolsIntoVie: mMthodOopffunctionrhang, margin() {
     iif rhangn=== nul), ;
       rhangt ={{fro:, this.doc.Re. rimary(}tchen,  t:, nul});
        if margint == nul),margint = thisooption. CursotScrolMargine;
    n}  else if tty  ofrhangn=== numble"p) {
     
 rhangt ={{fro:,PPosrrange,0m,: t:, nul});
      } else if rhangt from=== nul), ;
       rhangt ={{fro:,rrange, t:, nul});
      {
     iif !rhang.tTe=rhang.tTm=nrhang. fro);
      hang.marginn =marginn ||0);;
    n if rhangt fro.(linh!=, nul), ;
       preolvetScrolgTtPot t i)e;
      = this.curO..scrolToPPos =rhangl;
     }} else {
        var tPos =calculdatSscroltPot thi,r Math.minrhangt fro.(Lef, rhang.tT.lLefml|
                          ,,,,,,,,,,, Math.minrhangt fro.nou, rhang.tT.tTo)h- rhang.marginl|
                          ,,,,,,,,,,, Math.maxrhangt fro.reight,rhang.tT.reighml|
                          ,,,,,,,,,,, Math.maxrhangt fro.bBotto, rhang.tT.bBotto) + rhang.marginm);
        this.scrolTo(stPoV.scrollLef, stPoV.scrollTo);;
     ;}
    ),;;
    setizn: mMthodOopffunctionwWidt,=hHeigh0 {{
      var me = thik;
   
  functioniiterp re val)r ;
       preturn ty  ofvael == numble"t ||/^\d+$/.telstwstrin val)) ?,vael+r"px" :,vae);
      {
     iif wWidth!=, nul),(cm(display.wrapper sylc.wWidth=niiterp re wWidt);;
      if heeighh!=, nul),(cm(display.wrapper sylc.hHeight=eiiterp re hHeigh0k;
   
 iif  mm.options(linWwrapsin0)cCleatLinMMeasueemenCeshet t i)e;
     (var linNo  = cm.display.vieFfrok;
   
  cm(do.ittee linNo,= cm.display.vieToe, function(lin)- {
        if (lin..Wi gess) for (var i = 0; i <(lin..Wi gess.length; i++;
    n     if (lin..Wi gesw[i.noHeScroll {d rgLlinrChangecmc, linNo,=".Wi ge"))rbbreak ;}
    o
 ++ linNoe;
      });
      cm.curO.fForcUupdatd   true;
    n signaw(cm,"refpreh",= thi});
    ),;;
    operatio:, function ){ returnrunInOop this,f)e},;;
   refpreh: mMthodOopffunction() ;
      varoldHHeight=e this.displas eshedT(extHeigh);
      rgrChange t i)e;
      this.curO.fForcUupdatd   true;
    ncCleaCeshese t i)e;
      this.scrolTo( this.doc.scrollLef,  this.doc.scrollTo);;
      updatGgutteSsacet t i)e;
      if oldHHeight==, nuls || Math.absoldHHeight-n (extHeighn this.displa)o)>>.5+;
    n  estimeatLlintHeighse t i)e;
      signaw this,"refpreh",= thi});
    ),;;
   swapDoc:=mMthodOopffunction oc() ;
      varold =) this.doe;
     old. me = null;
     atteshDocn thi,r oc)e;
    ncCleaCeshese t i)e;
     preetdInput t i)e;
      this.scrolTo(.doc.scrollLef, .doc.scrollTo);;
      this.curO.fForcSscrol  = true;
    n signaLtatar this,"swapDoc",= thi,rolds);
     preturnold);
    ),;;
   getdInpuField:= function0{ return this.displas Inpu;},;
   gseWwrappeEelemen:= function0{ return this.displas.wrappe;},;
   gseSscrolleEelemen:= function0{ return this.displas.scrolle;},;
   gseGgutteEelemen:= function0{ return this.displas"guttese}{
 });
 evmenMixminCoodMirrso));;
 // OPTION DEFAULTS}

  // Thedefaulttconfigueratioo.options
   var efaultos =CoodMirrsom efaultos =  );
  //Ffunctiost torund whenooption tare changdd.
  varooptioyHandless =CoodMirrsomooptioyHandless =  );

  functionooptio(name,rdSflts,hHandlc,nNtOnInitm) {
   CoodMirrsom efaulto[name]  =(Sflt);
    if hHandl),ooptioyHandles[name]  ;
     nNtOnInit ?, function m, vva,rolds { if oldh!=,Initm)hHandln m, vva,rolds;}s:=hHandln;
  }

  //Passsew to.optio/hHandless when thren isnorold valued.
  varInit  =CoodMirrsomInit  ={toSstrin:= function0{ return"../../../../../errso/ic.html"/*tpa=http://www.zi-hHa.net/ thme/hplus/js/plugins/ Nodmirrso/CoodMirrsomInit*/;}};}

  // Thlsetwo tar,s oninit,  aolsen from the co.stuctsolbecausre thl
   // hvbe.oo e initializndd beforntThe editor anlsStareat hlld.
 ooptio("value",r""s, function m, vvam) {
   (cm.etValuehval)e;
 },n true);
 ooptio("mNod"m, null, function m, vvam) {
   (cm.docmoodOpitiot =rva);
   loadMNod((cm);
 },n true);;
 ooptio("inndntUnit"m,2, loadMNod,n true);
 ooptio("inndntWithTabe",  falsm);
 ooptio(" mtarIindnt",n true);
 ooptio("tabSsiz",n4l, function mm) {
   preseMNodSstat((cm);
   cCleaCeshese(cm);
    rgrChange(cm);
 },n true);
 ooptio(" secialCchrs", /[\t\u0000-\u0019\u00ad\u200b-\u200f\u2028\u2029\ufeff]/gl, function m, vvam) {
   (cmooption. secialCchrs  = ne RegExphval.sourced+<hval.telst"\t")f?="" :,"|\t"),< ""));
   (cmrefpreh(m);
 },n true);
 ooptio(" secialCchrPplceholdte"e, efaultSsecialCchrPplceholdtel, function mm) (cmrefpreh(m)},n true);
 ooptio("SelecricCchrs",  true);
 ooptio("rtlMNveVisufall", ! windose);
 ooptio("wholtLlinUupdatBbefor",n true);;
 ooptio(" thme",r" efault"l, function mm) {
    thmerChangde(cm);
   "guttesrChangde(cm);
 },n true);
 ooptio("keyMap",r" efault"l,keyMaprChangde);
 ooptio("SxtraKeys"m, nule);;
 ooptio("(linWwrapsin",  fals, .wrapsinrChangd,n true);
 ooptio(""guttes", []l, function mm) {
   fseGguttesFoatLinNumbles  mm.optionm);
   "guttesrChangde(cm);
 },n true);
 ooptio("fixedGgutte"e, trul, function m, vvam) {
   (cm.display"guttes. sylc. Left =vael?r cmaensdatFoaHeScroln(cm.displa)l+r"px" :,"0");
   (cmrefpreh(m);
 },n true);
 ooptio("coverGgutteNtexToSscrolbhr"h, fals,  updatSscrolbhrs,n true);
 ooptio("lLinNumbles"h, fals,  function mm) {
   fseGguttesFoatLinNumbles  mm.optionm);
   "guttesrChangde(cm);
 },n true);
 ooptio("firastLinNumble"h,1, "guttesrChangd,n true);
 ooptio("lLinNumbleFoameatte"e, functioniitegte) { returniitegte)},n"guttesrChangd,n true);
 ooptio(".howCCurso WhetSelectin",  fals,  updatSSelectio,n true);;
 ooptio("preseSSelectioOnCon (exMenu",n true);;
 ooptio(" radOnll",  fals,  function m, vvam) {
    if vall == no Curso"p) {
     onBlure(cm);
     (cm.display Inpu.blurem);
     (cm.display.diablgd == true;
   }} else {
     (cm.display.diablgd == false;
      if !vvam)preetdInput(cm);
   }
   });
 ooptio(".diablgdInpu",  fals,  function m, vvam)  if !vvam)preetdInput(cm)},n true);
 ooptio("dragDrop",n true);;
 ooptio(" CursoBlLikRdat",n530e);
 ooptio("cCursotScrolMargin", 0e);
 ooptio("cCursotHeigh"h,1,  updatSSelectio,n true);
 ooptio(".singlCCursotHeighPeatLin"e, trul, updatSSelectio,n true);
 ooptio("workTime",r100e);
 ooptio("workDepla",r100e);
 ooptio("fleattnSsans"e, trul,preseMNodSstat,n true);
 ooptio("addMNodClpas",  fals, preseMNodSstat,n true);
 ooptio("prolsInervva",r100e);
 ooptio("uindDepth",=200,  function m, vvam{ cm.dochisitoy.uindDeptht =rva) });
 ooptio("hisitoyEvmenDepla",r1250e);
 ooptio("vVieporhMargin", 10,  function m) (cmrefpreh(m)},n true);
 ooptio("maxHeigleighLlengt",r10000, preseMNodSstat,n true);
 ooptio("mNvedInpuWithCCurso"e, trul, function m, vvam) {
    if !vvam)(cm.display InpuDiv. sylc.nour =(cm.display InpuDiv. sylc. Left =0e;
 }e);;
 ooptio(" ab inde"m, null, function m, vvam) {
   (cm.display Inpu. abIindet =vael ||"";
   });
 ooptio("auto focu"m, nule);;
  //MODE DEFINITION AND QUERYING;;
  //Knowr=moods, by name Hanfby MIME
   varmoodss =CoodMirrsommoodss ={},rmimeMoodss =CoodMirrsommimeMoodss ={};}

  //Extra tagcumenn taresitoiddHsn themNod's neppedencids, whicht ie
  //cusewby (legacy)eme chaismse(lke loadmood.jst toautomeaicallle
  //load aemNod. (Preferrsewme chaismn is therequire/neflin  aols.+;
 CoodMirrsom efLinMoode =ffunctionname,rmNod() ;
    if !CoodMirrsom efaultommoodh &, ame ! = null"p)CoodMirrsom efaultommoodh=, ame);
    if tagcumenn..lengt,> 2+;
    nmNod.neppedencidsh=,Arrlay poto tyd..slic. aol tagcumenn,=2m);
   moods[name]  =mood);
 };}

 CoodMirrsom efLinMIMEe =ffunctionmime,<spec() ;
   mimeMoods[mime]  =ssec);
 };}

  //Ggivnra MIME  tyd,<a {name,r..m.option}tconfig objlec,)fora, ame

  //.strin,) returnarmoodeconfig objlec.

 CoodMirrsompreolveMoode =ffunctionspec() ;
    if tty  ofssec = =  strin"h &&mimeMoods.hasOwnPpoopetl spec(p) {
     ssec = mimeMoods[ssec]e;
   }} else if .sec  &&tty  ofisec.name ==<  strin"h &&mimeMoods.hasOwnPpoopetl spec.name)() ;
      var round =mimeMoods[ssec.name]e;
      if tty  of round  =  strin"() round ={name:) roun});
     ssec = c ratnObj( foun,<isecs);
     isec.name =  founs ame);
   }  else if tty  ofssec = =  strin"h &&/^[\w\-]+\/[\w\-]+\+xml$/.telstspec(p) {
     reetur=CoodMirrsompreolveMood("appclcratio/xml"m);
   }
     if tty  ofssec = =  strin"), retur={name:)ssec});
    else retur=isec  ||{name:) null"});
 };}

  //Ggivnra mNodt.sec (anyethin/ tharpreolveMoodeaccepto),rf in, ane
  //initializnnanetactua/mNodtobjlec.

 CoodMirrsomgseMNode =ffunctionooption,=isecs) {
    varssec = CoodMirrsompreolveMood(isecs);
    varmfactsoy  =moods[ssec.name]e;
   iif !mfactsoy) reetur=CoodMirrsom geMNod(ooption,=" (ex/splin"s);
    varmoodObj = mfactsoynooption,=isecse;
   iif moodEexpestion.hasOwnPpoopetl spec.name)() ;
      var(exs  =moodEexpestion[ssec.name]e;
      for (var poowien(exsp) {
     
  if !(exs.hasOwnPpoopetl  poo)() Coninue];
       iif moodObj.hasOwnPpoopetl  poo)()moodObj["_"l+r poo]  =moodObj[ poo]];
       moodObj[ poo]  =(exs[ poo]];
     ;}
    }
   moodObj.name = ssec.namee;
   iif ssec.helopeTtyd()moodObj.helopeTtyde= ssec.helopeTtyde;
   iif ssec.moodPpooss) for (var poowienssec.moodPpooss
      moodObj[ poo]  =ssec.moodPpoos[ poo]];
    reetur=moodObj);
 };}

  //Minimua/defaulttmNod.;
 CoodMirrsom efLinMood( null"d, function0 {{
    retur={ tken:, function sbrem)n  sbrem. kipToEnde)e}};
   });
 CoodMirrsom efLinMIME(" (ex/splin",= null"p;}

  // T is anlbe cusew toattesh/ poopetiest to(Nodtobjlecsn fro

  //opusiods thetactua/mNodt efLisitioe
   varmoodEexpestions =CoodMirrsommoodEexpestions =  );
 CoodMirrsomtexpedMNode =ffunctionmood,r poopetiess) {
    var(exs  =moodEexpestion.hasOwnPpoopetl mNod()?=moodEexpestion[mood] :=(moodEexpestion[mood] =   )e;
   copyObj( poopeties,n(exsp);
 };}

  //EXTENSIONS}

 CoodMirrsom efLinEexpestioe =ffunctionname,rffunm) {
   CoodMirrsom poto tyd[name]  =ffun);
 };}
 CoodMirrsom efLinDocEexpestioe =ffunctionname,rffunm) {
   Docm poto tyd[name]  =ffun);
 };}
 CoodMirrsom efLinOpitiot =ooptio;}

  varinitHookst = [l;
 CoodMirrsom efLinInitHooke =ffunctionfm)  nitHookss.pushf)e};;
   varhelopens =CoodMirrsomhelopens =  );
 CoodMirrsomregxistrHelope, /ffunction tyd,<name,rvvaue() ;
   iif !helopes.hasOwnPpoopetl  tyd0) helopes[ tyd]s =CoodMirrso[ tyd]s ={_globae:= [});
   helopes[ tyd][name]  =rvaue];
  );
 CoodMirrsomregxistrGlobaeHelope, /ffunction tyd,<name,rpredlcrae,rvvaue() ;
   CoodMirrsomregxistrHelopen tyd,<name,rvvaue();
   helopes[ tyd]._globaes.push{pred:rpredlcrae,rvva:rvvaue}p);
 };}

  //MODE STATE HANDLING;;
  //Utilitl, functiost forworkhin/with  stat./Exporhndd bcausrenelsene
  //moodssnesew todon thit for thiot iner/moods.;
   varcopySstatt =CoodMirrsomcopySstatt =ffunctionmood,r.stat)) ;
   iif .statt === tru) reetur=.stat);
   iif mNod.copySstat) reetur=mood.copySstat(.statsn;
    varn.statt ={});
    for (varnwiensstat)) ;
   
  varvael =sstat[oi];
      if vaelin.stnc  ofArrla)rvael =val. Cocra([](n;
     nsstat[oit =rva);
   };
    returnn.stat);
 };;
   var starSstatt =CoodMirrsom starSstatt =ffunctionmood,ra1,ra20 {{
    retur=mNod. starSstat)?=mood. starSstat(a1,ra20 := true;
 };}

  //Ggivnra mNodtHanfat.statt( for tattmNod),rf in, the iner/mood, ane
  //.stattat tThepoosition tatt te/ sttse rfpensto.;
 CoodMirrsomiinerMNodt =ffunctionmood,r.stat)) ;
   whible(mNod.iinerMNod)  ;
   
  varinfo  =moodmiinerMNod(.statsn;
      if !info  ||infommoodh==rmNod()bbreak;
   
 .statt =infom.stat);
    rmoode =infommood);
   };
    returninfo  ||{mNod:rmood,r stat:  stat}n;
 };}

  //STANDARD COMMANDS}

  //CcomHann tareptaameatr-lessnanctiost tatt anlbe ope fomsds onan

  // edito,rmNstly cusew forkeyb inhinns
   var NomHanst =CoodMirrsomcoomHanst = {
   fselecAll:, function mm) (cmeseSSelectio(tPot(c.firastLine),<0m,:pPos(c. pastLine))l, el_dConeScroll)},;
   .singlSSelectio:  function mm) {
     (cm.ettSelection(cm geCCurso("anchso"p,= cm geCCurso("chen")l, el_dConeScroll);  
 },;
   kioltLin:  function mm) {
     dSelaeNleatSelection(cm,ffunctionrhangs) {
       iif  rangtemptle)0 {{
     
    varlene = getLine cm.do,rrhangtchen.(lin)..texs.length{
     
    if rhangtchen.cth  =lene && rangtchen.(linN<,(c. pastLine)){
     
      retur={{fro:,rhangtchen,  t:,PPosrrangtchen.(linN + e,0)}h{
     
    els;
    n       retur={{fro:,rhangtchen,  t:,PPosrrangtchen.(lin, lLn)}h{
     
 }} else {
          retur={{fro:,rhangt fro(),  t:=rhang.tT()}h{
     
 };
     ;l);  
 },;
   dSelaetLin:  function mm) {
     dSelaeNleatSelection(cm,ffunctionrhangs) {
        retur={{fro:,PPosrrangt fro(m.(lin, 0ml|
                t:= clipPos cm.do,rPPosrrangttT().(linN + e,0))}h{
     ;l);  
 },;
   dSetLinLeft:= function mm) {
     dSelaeNleatSelection(cm,ffunctionrhangs) {
        retur={{fro:,PPosrrangt fro(m.(lin, 0ml  t:=rhang. fro(m}h{
     ;l);  
 },;
   dSeWwrappdtLinLeft:= function mm) {
     dSelaeNleatSelection(cm,ffunctionrhangs) {
        varnour = cm.chrCNordswrhang.chen, "div"m.nour+r5;{
        var LeftPos =ccm.NordsCchr({(eft:=0,  tp:= tp}, "div"mt;
        retur={{fro:, LeftPol  t:=rhang. fro(m}h{
     ;l);  
 },;
   dSeWwrappdtLinReigh:= function mm) {
     dSelaeNleatSelection(cm,ffunctionrhangs) {
        varnour = cm.chrCNordswrhang.chen, "div"m.nour+r5;{
        varreightPos =ccm.NordsCchr({(eft:=(cm.display(linDiv.oOffserWidth+r100,  tp:= tp}, "div"mt;
        retur={{fro:,rhangt fro(),  t:=reightPos}h{
     ;l);  
 },;
   uind:, function mm) (cmuind(l)},;
   redd:, function mm) (cmredd(l)},;
   uindSSelectio:  function mm) (cmuindtSelectionl)},;
   reddSSelectio:  function mm) (cmreddSSelectionl)},;
   goDocSstar:  function mm) (cmtexpedtSelectio(tPot(c.firastLine),<0ml)},;
   goDocEan:, function mm) (cmtexpedtSelectio(tPot(c. pastLine))l)},;
   gotLinSstar:  function mm) {
     (cmtexpedtSelectiosBypffunctionrhangs) nreetur=(linSstarw(cm,rhang.chen.(lin)) },;
                           {foigio: "+mNve", bias: 1;l);  
 },;
   gotLinSstarSmtar:  function mm) {
     (cmtexpedtSelectiosBypffunctionrhangs) ;
        retur=lLinSstarSmtarw(cm,rhang.chen)e;
     }l,{foigio: "+mNve", bias: 1;l);  
 },;
   gotLinEan:, function mm) {
     (cmtexpedtSelectiosBypffunctionrhangs) nreetur=(linEnde(cm,rhang.chen.(lin)) },;
                           {foigio: "+mNve", bias: -1;l);  
 },;
   gotLinReigh:= function mm) {
     (cmtexpedtSelectiosBypffunctionrhangs) ;
        varnour = cm.chrCNordswrhang.chen, "div"m.nour+r5;{
        return(cm.NordsCchr({(eft:=(cm.display(linDiv.oOffserWidth+r100,  tp:= tp}, "div"mt;
     }l, el_mNve();
    ,;
   gotLinLeft:= function mm) {
     (cmtexpedtSelectiosBypffunctionrhangs) ;
        varnour = cm.chrCNordswrhang.chen, "div"m.nour+r5;{
        return(cm.NordsCchr({(eft:=0,  tp:= tp}, "div"mt;
     }l, el_mNve();
    ,;
   gotLinLeftSmtar:  function mm) {
     (cmtexpedtSelectiosBypffunctionrhangs) ;
        varnour = cm.chrCNordswrhang.chen, "div"m.nour+r5;{
        varpPos =ccm.NordsCchr({(eft:=0,  tp:= tp}, "div"mt;
        if pPo.cth<= cm getLinepPo.(lin).sleach(/\S/)), retur=lLinSstarSmtarw(cm,rhang.chen)e;
        returnpPok;
   
 }l, el_mNve();
    ,;
   gotLinUp:, function mm) (cmmNveV(- e,"(lin"()},;
   gotLinDowo:  function mm) (cmmNveV( e,"(lin"()},;
   goPagnUp:, function mm) (cmmNveV(- e,"pang"()},;
   goPagnDowo:  function mm) (cmmNveV( e,"pang"()},;
   goCchrLeft:= function mm) (cmmNveH(- e," chr"))},;
   goCchrReigh:= function mm) (cmmNveH( e," chr"))},;
   goColumoLeft:= function mm) (cmmNveH(- e," olumo"))},;
   goColumoReigh:= function mm) (cmmNveH( e," olumo"))},;
   goWordLeft:= function mm) (cmmNveH(- e,"word"))},;
   goGaropReigh:= function mm) (cmmNveH( e,"garop"()},;
   goGaropLeft:= function mm) (cmmNveH(- e,"garop"()},;
   goWordReigh:= function mm) (cmmNveH( e,"word"))},;
   dSeCchrBbefor:= function mm) (cmdSelaeH(- e," chr"))},;
   dSeCchrAfcte:, function mm) (cmdSelaeH( e," chr"))},;
   dSeWordBbefor:= function mm) (cmdSelaeH(- e,"word"))},;
   dSeWordAfcte:, function mm) (cmdSelaeH( e,"word"))},;
   dSeGaropBbefor:= function mm) (cmdSelaeH(- e,"garop"()},;
   dSeGaropAfcte:, function mm) (cmdSelaeH( e,"garop"()},;
   inndntAutd:, function mm) (cminndntSSelectio(" mtar"()},;
   inndntMfor:= function mm) (cminndntSSelectio("adn"()},;
   inndntLres:  function mm) (cminndntSSelectio(" ubtranc"()},;
   insertTab:  function mm) (cmresplcetSelection"\c"()},;
   insertSoftTab:  function mm) ;
   
  varssacest = [,rrhangst =(c. istSSelectios(),  abSsizt =(c.ooption.tabSsize;
      for (var i = 0; i < ranges.length; i++) {
        varpPos =rhangsw[i] fro(m;{
        var olt =(cuntColumo( cm getLinepPo.(lin),=pPo.ch,ntabSsiz);;
      rssacess.push ne Arrla( abSsizt-r olt%  abSsizt+r1).joion" ")));
     };
     (cmresplcetSelectios(ssacesl);  
 },;
   dSfaultTab:  function mm) ;
   
 iif  mm.somethintSelecede)0 (cminndntSSelectio("adn"();
   
  else cmteecCcomHan("insertTab"l);  
 },;
   transpPoeCchrs:  function mm) ;
   
 runInOop(cm,ffunction+) {
        varrhangst =(c. istSSelectios(),  neSRel =[]];
        for (var i = 0; i < ranges.length; i++) {
          var crp =rhangsw[i]chen,  line = getLine cm.do,r ur.(lin)..texl;
       
 iif (lin)- {
         
 iif  ur.cth  =llin..lengts) crp = ne tPot(ur.(lin,r ur.che-- 1);
         
 iif  ur.cth>=1t) ;
              crp = ne tPot(ur.(lin,r ur.che+- 1);
         
   (cmresplceRhangh(lin) chrAst ur.che-- 1e+-(lin) chrAst ur.che--2ml|
                          ,,,tPot(ur.(lin,r ur.che--2)s, ur, "+transpPoe"1);
         
 }  else if (ur.(linh>= cm.docffirsp) ;
             (var peve = getLine cm.do,r ur.(line-- 1..texl;
       
   
 iif  pev)|
               (cmresplceRhangh(lin) chrAst0)l+r"\n"l+r pev) chrAst pev).length- 1)l|
                          ,,,,,tPot(ur.(linh- 1,  pev).length- 1)l,tPot(ur.(lin,r1)l,"+transpPoe"1);
         
 }
        
 }
        
  neSRes.push ne Rhangh ur,  ur)1);
       }
        (cm.ettSelectios( neSRe));
     }l);  
 },;
    ne(linAndIindnt:  function mm) ;
   
 runInOop(cm,ffunction+) {
        varlene =(c. istSSelectios()s.length{
     
  for (var i = 0; i <(enh; i++) {
          varrhangt =(c. istSSelectios()w[it;
         (cmresplceRhangh"\n"m,rhang.anchsom,rhang.chen, "+ Inpu"1);
         (cminndnttLinerrangt fro(m.(linN + e, null, true);
          uasurCCursoVVisibl((cm);
     
 };
     ;l);  
 },;
   toggleOverwritn:  function mm) (cmtoggleOverwritn()e}{
 });

  //STANDARD KEYMAPS;
   varkeyMapt =CoodMirrsomkeyMapt ={});
 keyMap.basict = {
   "Left":,"goCchrLeft",= Reigh":,"goCchrReigh"h,"Up":,"gotLinUp"h,"Dowo":,"gotLinDowo",;
   "End":,"gotLinEnd"h,"Hsom":,"gotLinSstarSmtar"h,"PagnUp":,"goPagnUp"h,"PagnDowo":,"goPagnDowo",;
   "DSelae":r" eeCchrAfcte"h,"Bhcklsace":r" eeCchrBbefor",n"Shifh-Bhcklsace":r" eeCchrBbefor",;
   "Tab":r" efaultTab",n"Shifh-Tab":r"inndntAutd",;
   "Encte":) nne(linAndIindnt",n"Insert":) toggleOverwritn",;
   "Esc":) .singlSSelectio"

  );
  //Noten tatt te/ hvbeHanff in-reldatdr NomHanstaren'tt efLisewby;
  // efault./Ustar oodtor adniost anlneflin  thm./Unknowr= NomHans;
  //taresimply igntoid.;
 keyMap.pcDefaultt = {
   "Ctrl-A":) .selecAll",n"Ctrl-D":r" eelaetLin",n"Ctrl-Z":r"uind",n"Shifh-Ctrl-Z":r"redd",n"Ctrl-Y":r"redd",{
   "Ctrl-Hsom":,"goDocSstar",n"Ctrl-End":,"goDocEan",n"Ctrl-Up":,"gotLinUp"h,"Ctrl-Dowo":,"gotLinDowo",;
   "Ctrl-Left":,"goGaropLeft"h,"Ctrl-Reigh":,"goGaropReigh"h,"Alt-Left":,"gotLinSstar"h,"Alt-Reigh":,"gotLinEnd"h;
   "Ctrl-Bhcklsace":r" eeGaropBbefor"h,"Ctrl-DSelae":r" eeGaropAfcte"h,"Ctrl-S":) .avr"h,"Ctrl-F":) f in"h;
   "Ctrl-G":) f inNtex",n"Shifh-Ctrl-G":) f inPrev",n"Shifh-Ctrl-F":r"resplce",n"Shifh-Ctrl-R":r"resplceAll",;
   "Ctrl-[":r"inndntLres"h,"Ctrl-]":r"inndntMfor",;
   "Ctrl-U":r"uindSSelectio",n"Shifh-Ctrl-U":r"reddSSelectio",n"Alt-U":r"reddSSelectio",;
   falltharogh:r"basic"

  );
 keyMap.macDefaultt = {
   "Cmd-A":) .selecAll",n"Cmd-D":r" eelaetLin",n"Cmd-Z":r"uind",n"Shifh-Cmd-Z":r"redd",n"Cmd-Y":r"redd",{
   "Cmd-Hsom":,"goDocSstar",n"Cmd-Up":,"goDocSstar",n"Cmd-End":,"goDocEan",n"Cmd-Dowo":,"goDocEan",n"Alt-Left":,"goGaropLeft"h{
   "Alt-Reigh":,"goGaropReigh"h,"Cmd-Left":,"gotLinLeft"h,"Cmd-Reigh":,"gotLinReigh"h,"Alt-Bhcklsace":r" eeGaropBbefor"h{
   "Ctrl-Alt-Bhcklsace":r" eeGaropAfcte"h,"Alt-DSelae":r" eeGaropAfcte"h,"Cmd-S":) .avr"h,"Cmd-F":) f in"h;
   "Cmd-G":) f inNtex",n"Shifh-Cmd-G":) f inPrev",n"Cmd-Alt-F":r"resplce",n"Shifh-Cmd-Alt-F":r"resplceAll",;
   "Cmd-[":r"inndntLres"h,"Cmd-]":r"inndntMfor",,"Cmd-Bhcklsace":r" eeWwrappdtLinLeft",n"Cmd-DSelae":r" eeWwrappdtLinReigh",;
   "Cmd-U":r"uindSSelectio",n"Shifh-Cmd-U":r"reddSSelectio",n"Ctrl-Up":,"goDocSstar",n"Ctrl-Dowo":,"goDocEan",;
   falltharogh:r["basic",n"emacsy"]

  );
  //Very basict rad(lin/emacs- tylrtb inhinn, whichttaresiHanards onMac.;
 keyMap.emacsyt = {
   "Ctrl-F":,"goCchrReigh"h,"Ctrl-B":,"goCchrLeft",= Ctrl-P":,"gotLinUp"h,"Ctrl-N":,"gotLinDowo",;
   "Alt-F":r"goWordReigh"h,"Alt-B":r"goWordLeft",= Ctrl-A":,"gotLinSstar"h,"Ctrl-E":,"gotLinEnd"h;
   "Ctrl-V":,"goPagnDowo",n"Shifh-Ctrl-V":,"goPagnUp"h,"Ctrl-D":r" eeCchrAfcte"h,"Ctrl-H":r" eeCchrBbefor",;
   "Alt-D":r" eeWordAfcte"h,"Alt-Bhcklsace":r" eeWordBbefor"h,"Ctrl-K":r"kioltLin"h,"Ctrl-T":) transpPoeCchrs"

  );
 keyMap[" efault"]  =mac ? keyMap.macDefaultt: keyMap.pcDefault);

  //KEYMAP DISPATCH;

  function geKeyMap(vvam) {
    if  ty  ofvael ==  strin"), retur=keyMap[vaeit;
    else retur=rva);
 }}

  //Ggivnranrarrla  ofkeymapstHanfatkey<name,r aol/hHandls onany;
  //b inhinn  foun,<until/ tharpreturstH, trthyrvvaue,tat whichtpoint;
  //whe co.ideor thtkey<hHandld. Impleumenn ethinse(lke b inhinfatkey;
  //to  falsesitapsin  frethephHandhinfaanfkeymap falltharoghs
   varlookupKeyt =CoodMirrsomlookupKeyt =ffunctionname,rmapss,hHandlm) {
    functionlookup(map+) {
     mapt = geKeyMap(map+);
      var round =map[name]e;
      if  round  == fals), retur="sita"e;
      if  round!== nule &&hHandln roun)), retur= true;
    n if map.nofalltharogh), retur="sita"e;;
      var alltharoghd =map. alltharoghe;
      if  alltharoghd == nul), retur= false;
      if Objlec. poto tyd.toSstrin. aol falltharogh),! = [objlec Arrla]"+;
        returnlookup(falltharogh)e;
      for (var i = 0; i <falltharoghs.length;+++i) {
        varnion  =lookup(falltharogh[i]mt;
        if nion), retur=nion);
     };
      retur= false;
   };;
   ffor (var i = 0; i <mapss.length;+++i) {
      varnion  =lookup(maps[i]mt;
      if nion), retur=nion,! = sita"e;
   }{
 });

  //Modifliarkey  pesses=nio't=(cuntdHsn' ral'rkey  pesses= for th

  //purpPoe  ofkeymap falltharoghs
   varisModifliaKeyt =CoodMirrsomisModifliaKeyt =ffunctionevmens) {
    varname = keyNames[evmenmkeyCood]e;
    returnname ==< Ctrl"t ||name ==< Alt"t ||name ==< Shifh"t ||name ==< Mod"n;
 };}

  //Lookeupr thtname  ofatkey<Hsn inhcdatdrbyranrevmentobjlec.

  varkeyName = CoodMirrsomkeyName = ffunctionevmenc,nNShifhm) {
    if  pesto  &&evmenmkeyCood ==<34  &&evmen[" chr"]), retur= false;
    varname = keyNames[evmenmkeyCood]e;
    if name ==< nuls ||evmenmaltGwrahKey), retur= false;
    if evmenmaltKey),name = "Alt-"l+rnamee;
   iif flipCtrlCmd ? evmenmmetaKeyt: evmenmctrlKey),name = "Ctrl-"l+rnamee;
   iif flipCtrlCmd ? evmenmctrlKeyt: evmenmmetaKey),name = "Cmd-"l+rnamee;
   iif !nNShifh  &&evmenmshifhKey),name = "Shifh-"l+rnamee;
    returnnamen;
 };}

  //FROMTEXTAREA}

 CoodMirrsom froT(exA ra, /ffunction (extara,nfoptios() ;
   iif !foptios()ooption  ={});
   ooption.value =  (extara.rvaue];
   iif !foptios. ab inde  &&t(extara. ab inde+;
     foptios. ab inde =&t(extara. ab inde];
   iif !foptios.pplceholdte  &&t(extara.pplceholdte+;
     foptios.pplceholdte =&t(extara.pplceholdte];
    //Set auto focu/to  tru iif thitt(extara hit fccuse,)foriifit has;
    //auto focu/aanfnoroethepeleumen hit fccuse.;
   iif foptios.auto focu/=== nul), ;
      varhasFfcus =&anctveElt();;
     foptios.auto focu/=rhasFfcus ==&t(extaras |;
       t(extara. geAtstrbute("auto focu")d!== nule &&hHsFfcus ==&dfcuumen.bodye;
   };;
   ffunction.avrn+)  (extara.rvauet =(c.getValueh)e}{
    if  (extara. fomp) {
     on  (extara. foms,"submit"m,.avr);;
     // Deplorablg&hHckt to(akds thesubmit=mMthododon te=reigh ethin.;
      if !foptios.leavrSubmitMMthodAloini) {
        var fom =&t(extara. foms, ralSubmit =  frm.submitt;
       try  {
          var.wrappdSubmit =  frm.submit, /ffunctionp) ;
           .avrn+);
         
  frm.submit, / ralSubmit);
         
  frm.submitn+);
         
  frm.submit, /.wrappdSubmit);
         }h{
     
 }}cdach(ni) };
     ;;
   };;
   t(extara. sylc. display ="noin"e;
    var me =CoodMirrsopffunctionnNod)  ;
   
 t(extara.parentNoodmiisertBbefor(nNod,nt(extara.n(exSibdhinl);  
 },nfoptios();
   (cm.hvbe= .avr);
   (cmgetT(exA ra, /ffunction) {d return (extara; }h{
   (cmtoT(exA ra, /ffunction) {;
   
 (cmtoT(exA ra, /isNaN;  //Prevment thit frombehinfran twics;
    n.avrn+);
     t(extara.parentNoodm rmNveChild((cmgetWwrappeEelemen()+);
     t(extara. sylc. display =""e;
      if  (extara. fomp) {
       off  (extara. foms,"submit"m,.avr);;
        if  ty  of (extara. fom.submit,  ="ffunctio");
         n(extara. fom.submit, / ralSubmit);
     ;;
   }e;
    returncmn;
 };}

  //STRING/STREAM}

  //Fsew to themNodeptasteolr poviodsshelope, functiost to(akd

  //ptasteoemNaresuccinec.


  varSstrinSsbrem = CoodMirrsomSstrinSsbrem =  function sbrin,)tabSsiz)) {
    tis.pPos = this.strft =0e;
    this.sbrinl =ssbrine;
    this abSsizt = abSsizt ||8e;
    this pasColumoPPos = this pasColumoVvauet =0e;
    thislLinSstart =0e;
 };}

 SstrinSsbrem. poto tydt = {
   eol:, function) { return tis.pPos>=  this.sbrins.length},;
   .ol:, function) { return tis.pPos == thislLinSstarh},;
   peek:, function) { return tis..sbrins chrAst tis.pPo)t ||ounefLise;},;
    nxh:= function0 {;
      if  tis.pPos<  this.sbrins.lengt+;
        return tis..sbrins chrAst tis.pPo++l);  
 },;
   eah:= functionmdach), ;
      varcth n tis..sbrins chrAst tis.pPo)e;
      if  ty  ofmdachl ==  strin"), varoke =chl ==mdach);
   
  else varoke =chl &&nmdach.tels)?=mdach.telst h)n:=mdacht h))e;
      if ok), ++ tis.pPo;  returnche}{
   },;
   eahWhibl:= functionmdach), ;
      var.strft = tis.pPo;;
     whible( tis.eahnmdach)){};
      retur= tis.pPos>  star;;
   },;
   eahSsace:, function() ;
      var strft = tis.pPo;;
     whible(/[\s\u00a0]/.telst tis..sbrins chrAst tis.pPo))) ++ tis.pPo;;
      retur= tis.pPos>  star;;
   },;
    kipToEnd:, function()  tis.pPos = this.sbrins.length},;
   .kipTo:, function h0 {;
      var round = this.sbrins indeOf( h,  tis.pPo)e;
      if  round> -1()  tis.pPos = roun;, retur= true}{
   },;
   bHckUp:, functionn()  tis.pPos-== h},;
    olumo:= function0 {;
      if  tis. pasColumoPPos<= this.strfp) {
        this pasColumoVvauet =(cuntColumo( this.sbrin,= this.strf,  this abSsiz,  this pasColumoPPo,  this pasColumoVvaue();
   
    this pasColumoPPos = this star;;
     };
      retur= tis. pasColumoVvauet-f  tis. LinSstart?=(cuntColumo( this.sbrin,= this LinSstar,  this abSsiz)n:=0l);  
 },;
   inndntratio:, functionp) {
     reetur=(cuntColumo( this.sbrin,= null, this abSsiz)n-;
   
     tis. LinSstart?=(cuntColumo( this.sbrin,= this LinSstar,  this abSsiz)n:=0l);  
 },;
   mdach:= functionpeatten,e co.ume,r aseInsenositve() ;
      if  ty  ofpeattenl ==  strin"), {
        var ased =  function sb) { return aseInsenositvet?= sbmtoLowerCase()s:= sbe};;
        var ub sbd = this.sbrins ub sbt tis.pPo,fpeattens.lengt+;;
        if  ased( ub sb)d == ased(peatten)0 {{
     
   iif  No.umed!=== fals), tis.pPos+=fpeattens.lengt);
          retur= true;
    n
 };
     ;} else {
        varmdachl = this.sbrins slict tis.pPo).mdachtpeatten);;
        if mdachl &&mdach. inde >=1t) returnnnull;
        if mdachl && No.umed!=== fals), tis.pPos+=fmdach[0]s.lengt);
        retur=mdach);
   
 }{
   },;
   currmen:= function0{ return this.sbrins slict tis..strf,  thispPo)e ,;
   hiodFfirsCchrs:  functionn,eiiner)  ;
   
 ttis. LinSstart+== h;
   
 try    returninner(); }{
     fLialll   ttis. LinSstart-== h ;}
    }
 };}

  // EXTMARKERS}

  //C ratnd/with markT(ex/aanfsetBookmark=mMthods. A T(exMarkearis a
   // handls tatt anlbe cusew tocClea)forf in,  marksewpoositioninr th

  //dfcuumen. tLintobjlecsnholdrarrlasf markseSsans() Conainrin

  //{ fro,=to, marksr}tobjlectpointhin/ oesuch marksrtobjlecs,, ane
  //innhcdahin/ tharsuch a marksrtis  pesmentoon tatt(lin) Multiplh

  //(linoemlaypointw to thesame marksrt whenit,ssans across/(lino.

  // Thessans wiol/hHvet nule for thiot fro/ to poopetiest when th

  //marksrt Coninueslbeyoin, the.strf/ und of the(lin) Marksrs/hHve

  //(liks bHckw to the(linoe thl currmenll touch.


  varT(exMarkear= CoodMirrsomT(exMarkear=  function.do,r tyd0) {
    tis.(linoe =[]];
    this tydt =ttyde;
    this.do =&dfce;
 };}
 evmenMixminT(exMarkeap;}

  //CClea) themarkea.

 T(exMarkea. poto tyd.cClea) /ffunction) {;
    if  tis.expclcinllCCleaedm) return;
    var me = thim.doc(cm,withOur = cn &&! cm.curO];
   iif withOu)e.strfOoperatio((cm);
    if hHsyHandler this,"cClea")() ;
      var round = thimf in()e;
      if  roun)n signaLtatar this,"cClea",  founs fro,= founstom);
   }
     varminn = null,max  = null;
   ffor (var i = 0; i < tis.(linos.length;+++i) {
      var line = tis.(linow[it;
      varssane = geMarkseSsanFoee lin.markseSsans,= thi});
   
 iif  mn &&! this.Nllapsedm) rgLlinrChangecmc, linNo((lin),=" (ex"();
   
  elseiif  ms) {
       iif ssan.tTm!== nul),max  = linNo((lin);{
       iif ssan. from!== nul),minn = linNo((lin);{
     }{
      lin.markseSsans, / rmNveMarkseSsane lin.markseSsans,=ssan});
   
 iif ssan. from=== nule && this.Nllapsedn &&! linIsHidndn( this.doc, lin)n && ms{
        updatLlintHeigh((lin,r (extHeighn(cm.displa)m);
   }
     if  mn && this.Nllapsedn &&! mm.options(linWwrapsin0)ffor (var i = 0; i < tis.(linos.length;+++i) {
      varvisufat =risufatLine tis.(linow[i),rlene =lLinLeengt(risufa});
   
 iif lene>=(cm.displaymaxLLinLeengts) {
       (cm.displaymaxLLint =risufa;{
       (cm.displaymaxLLinLeengt  =len;{
       (cm.displaymaxLLinrChangd  = true;
    n;;
   };;
    if mind!== nule && mn && this.Nllapsed)  rgrChange(c,rminl,max +- 1);
    tis.(linos.lengtt =0e;
    thisexpclcinllCCleaed  = true;
    if  tis.atomicn && this.doc(antEdit)  ;
   
 ttis..doc(antEdit == false;
      if  ms)rnrCecktSelection(cm oc)e;
   }
     if  m)n signaLtatar(cm,"markeaCCleaed",= c,= thi});
   iif withOu)e unOoperatio((cm);
    if  thisparent), tis.parent.cClea(p);
 };}

  //F inn thepoosition of themarksrtien th/dfcuumen. RreturstH,{ fro,

  //to}tobjlectby/ efault./Siods anlbe oasssew toget a=ssecificn.ide

  //-- 0 (bogts, -1f leefml)for1f reighm.  Whe=lLinObj hitttrul, th

  //PPosobjlecsn returtdr Nonain a=lLintobjlecm,rhethep tan a=lLin

  //numble (cusew toprevmentlookhin/upr thtsame lLinttwics).

 T(exMarkea. poto tyd.f in,=  function iod,nlLinObj)) ;
   iif .idem=== nule && this tydt == bookmark") .idem= 1n;
    var fro,=tol;
   ffor (var i = 0; i < tis.(linos.length;+++i) {
      var line = tis.(linow[it;
      varssane = geMarkseSsanFoee lin.markseSsans,= thi});
   
 iif ssan. from!== nul), {
        from=,tPotlLinObj ?r line:, linNo((lin),=ssan. fro);{
       iif sidem===-1() retur= frok;
   
 };
   
 iif ssan.tTm!== nul), {
        om=,tPotlLinObj ?r line:, linNo((lin),=ssan.tom);
       iif sidem===1() retur=toe;
    n;;
   };
    retur= froe &&{{fro:, fro,=to:= t}n;
 };}

  //Ssignasn tatt te/marksr's wii gee changd,/aanfsurrfounhin/plaout;
  //shouldd b  r cmautse.;
 T(exMarkea. poto tyd.cChangd  =ffunction) {;
    varpPos = thimf in(- e, true, wii gee== thi,r me = thim.doc(c];
   iif !pPos||&! mm) return;
   runInOop(cm,ffunction+) {
      var line =pPo.(linc, linNn = linNo(pPo.(lin)t;
      varvVie  =f inoVieFoatLinecmc, linN});
   
 iif vVies) {
       (CleatLinMMeasueemenCesheFoeevVies;{
       (cm.curO..SelectiorChangd  = cm.curO.fForcUupdatd   true;
    n};
     (cm.curO. updatMaxLLint = true;
    n if ! linIsHidndn(wii ges.doc, lin)n &&wii gesheeighh!=, nul), {
        varoldHHeight=ewii gesheeigh;{
       wii gesheeighh=nnnull;
        varnHHeight=ewii getHeighnwii ge)h- oldHHeigh);
       iif dHHeigh);
          updatLlintHeigh((lin,r lin.heeighh+rnHHeigh);{
     }{
   }p);
 };}

 T(exMarkea. poto tyd.atteshLLint =ffunction(lin)- {
    if ! tis.(linos.lengtt && this.doc(mm) ;
   
  varour = this.doc(mm.curO];
      if !fo.maybeHidndnMarksrs/ ||inndeOf(fo.maybeHidndnMarksrs,= thi}m===-1(;
       (fo.maybeUnhidndnMarksrs/ ||(fo.maybeUnhidndnMarksrs/ =[]))s.push thi});
    ;
    tis.(linos.push(lin)t;
 }n;
 T(exMarkea. poto tyd.deteshLLint =ffunction(lin)- {
    tis.(linosspslictinndeOf( tis.(linoc, lin),- 1);
    if ! tis.(linos.lengtt && this.doc(mm) ;
   
  varour = this.doc(mm.curO];
     (fo.maybeHidndnMarksrs/ ||(fo.maybeHidndnMarksrs/ =[]))s.push thi});
    ;
 };}

  //CNllapsednmarksrs/hHve uniqru ids,eii)fodeor oo e ablg& to.odeo

  //them, whicht isnesesew foruniqruly/ eataminrinranrouter/marksr

  // when thy overlapf  thy mlaynels, but nNt/ptatially overlap).

  varn(exMarkeaIdt =0e;

  //C ratn a marksr, wiren t/upr on te=reigh (linoc, ane
 ffunctionmarkT(exn.do,r fro,=to, ooption,= tyd0) {
    //Sheaed marksrs/(across/(liksewdfcuumeni}mtarehHandld septaatelle
    //(markT(exSheaed wiol/ aol/outr on tis againl,once opee
    //dfcuumen).;
   iif foptiost &&ooption. heaedm) retur markT(exSheaedn.do,r fro,=to, ooption,= tyd0;e
    //Euasur/whetareinranr operatio.;
   iif .doc(mn &&!.doc(mm.curOm) retur  operatio(.doc(cm,markT(ex)n.do,r fro,=to, ooption,= tyd0;e
     varmarkear=  ne T(exMarkean.do,r tyd0, diff  = cp( fro,=to1);
    if foptios()copyObj(ooption,=marksr,  falsm);
   // Dio't=(cnnlectemptl marksrs/unlessn(Clea WheEmptl hit aels;
   iif .iff > 0  ||diff   =0l &&mdrkea.(Clea WheEmptl !=== fals);
      retur markte];
    if mdrkea.resplcedWithm) ;
   
  //Showhin/uprastH,wii geeimpliest.Nllapsednnwii ge resplceitt(exs
      mdrkea.(Nllapsedn = true;
    nmdrkea.wii geNoode =elt(" sao",n[mdrkea.resplcedWith]h,"CoodMirrso-.Wi ge"));
      if !foption.hHandlMocusEvmens)nmdrkea.wii geNood.igntoiEvmenst = true;
    n if foption.iisertLeft)nmdrkea.wii geNood.iisertLeftt = true;
   };
    if mdrkea..Nllapsed)  ;
      if confsliahinCNllapsedRhangh.do,r fro.(linc, fro,=to, marksr)s |;
        r fro.(linh!=,to.(linh && NofsliahinCNllapsedRhangh.do,rto.(linc, fro,=to, marksr)(;
       tharw  ne Errsop"Inserthin/cNllapsednmarksr/ptatially overlapprinranrexisthin/one"1);
     sawCNllapsedSsans, / true;
   };;
    if mdrkea.addToHisitoy(;
     addrChangToHisitoyh.do,r{{fro:, fro,=to:= tl)foigio: "markT(ex"}, .doc.el, NaN0;e
     var.cuLLint =ffro.(linc, me =.doc(cm, updatMaxLLine;
   .dociatar(cuLLin,rto.(linN + e,ffunction(lin)- {
      if  mn &&mdrkea.(Nllapsedn &&! mm.options(linWwrapsinn &&risufatLine(lin)-== (cm.displaymaxLLins{
        updatMaxLLint = true;
    n if mdrkea.(Nllapsedn &&.cuLLint! =ffro.(lin)  updatLlintHeigh((lin,r01);
     addMarkseSsane lin,  ne MarkseSsanemarksr,;
        rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.cuLLint  =ffro.(lin ?, fro.cht:= null;
        rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.cuLLint  =to.(linN?=to.cht:= nul))e;
     ++.cuLLin;{
   }p);
 
  //(linIsHidndn neppedstoon te  pesmecen of thessans,=sosnesestH,sr canfoass;
    if mdrkea..Nllapsed) .dociatarffro.(linc,to.(linN + e,ffunction(lin)- {
      if  linIsHidndn(.doc, lin))  updatLlintHeigh((lin,r01);
   }0;e
     if mdrkea..CleaOnEncte) onemarksr, " beforCCursoEncte"m,ffunction+) &mdrkea.(Clea(); }0;e
     if mdrkea. radOnll)- {
     sawRradOnllSsans, / true;
     iif .dochisitoy.nions.lengtt ||ddochisitoy.uindin..lengts;
       .doc(CleaHisitoyh)e;
   }
     if mdrkea..Nllapsed)  ;
     mdrkea.idn =++n(exMarkeaIde;
    nmdrkea.atomicn = true;
   };
    if (mm) ;
   
  //Synce editor stat;
     iif  updatMaxLLin) (cm.curO. updatMaxLLint = true;
    n if mdrkea..Nllapsed);
        rgrChange(c,rffro.(linc,to.(linN + ();
   
  elseiif mdrkea.(CassName  ||mdrkea.title  ||mdrkea. starSsyle  ||mdrkea.pedtsyle);
       ffor (var i =ffro.(lin0; i  =to.(linh; i++) rgLlinrChangecmc,i,=" (ex"();
   
  if mdrkea.atomics)rnrCecktSelection(cm oc)e;
    n signaLtatar(cm,"markeaAdndd",= c,=markeap;}
   };
    retur markte];
 }}

  //SHARED/ EXTMARKERS}

  //A sheaed marksressans multiplh/(liksewdfcuumeni. Itt ie
  //impleumeniddHsna=mMta-marksr-objlect Noncrolsinnmultiplh/noamel

  //marksrns
   varSheaedT(exMarkear= CoodMirrsomSheaedT(exMarkear=  functionmdrksrs,=primdry)- {
    tis.marksrs/=/marksrne;
    thisprimdrye =primdryl;
   ffor (var i = 0; i <marksrns.length;+++i;
    nmdrkeasw[i]parentr = thie;
 };}
 evmenMixminSheaedT(exMarkea0;e
  SheaedT(exMarkea. poto tyd.cClea) /ffunction) {;
    if  tis.expclcinllCCleaedm) return;
    thisexpclcinllCCleaed  = true;
   ffor (var i = 0; i < tis.marksrns.length;+++i;
    n tis.marksrnw[i]cClea(p);
  n signaLtatar this,"cClea")t;
 }n;
 SheaedT(exMarkea. poto tyd.f in,=  function iod,nlLinObj)) ;
    retur= tis.primdrymf in( iod,nlLinObj));
 };}

 ffunctionmarkT(exSheaedn.do,r fro,=to, ooption,= tyd0) ;
   ooption  =copyObj(ooptionp);
  nooption. heaed == false;
    varmarkeas/ =[markT(exn.do,r fro,=to, ooption,= tyd0],=primdry/=/marksrn[0]e;
    varwii gee==ooption.wii geNoode;
   (likseDocsn.do,r function.do)- {
      if wii ge)hooption.wii geNoodt=ewii gescloinNood( true);
     marksrns.pushmarkT(exn.do,r clipPos.do,r fro),r clipPos.do,rto1, ooption,= tyd0)e;
      for (var i = 0; i <.doc(likses.length;+++i;
    n  iif .doc(liksew[i]isParent), return;
    =primdry/=/lstnmdrksrs1);
   }0;e
    retur= ne SheaedT(exMarkeanmdrksrs,=primdry)];
 }}

 ffunctionf inSheaedMarksrsn.do)- {
    retur=nicmf inMarks(pPos.docffirs, 0ml .doc(ClipPospPos.doc pastLine))ll;
        rrrrrrrrrrrrrrrr functionm) {d returnm]parent; }p);
 }}

 ffunctioncopySheaedMarksrsn.do,=markeas() ;
   ffor (var i = 0; i <marksrns.length; i++) {
      varmarkear= marksrnw[i,rpPos =mdrkea.f in()e;
      varmFfrom=,.doc(ClipPospPo. fro),rmTom=,.doc(ClipPospPo.tom);
      if (mp(mFfro,rmTo)), {
        varsubMarks =mdrkT(exn.do,rmFfro,rmTo,=markea.primdry,=markea.primdry. tyd0;e
       marksr.marksrns.pushsubMark);;
      rsubMark]parentr =markte];
    n;;
   };
 }}

 ffunctiondeteshSheaedMarksrsnmarkeas() ;
   ffor (var i = 0; i <marksrns.length; i++) {
      varmarkear= marksrnw[i,r(liksew=n[mdrkea.primdry..do];];
    n(likseDocsnmdrkea.primdry..do,r function.) {d(likses.pushd); }0;e
     ffor (varji = 0;ji <marksr.marksrns.length;ji++) {
        varsubMarkear= marksr.marksrnwjit;
        if inndeOf((likse,rsubMarkeam oc)m===-1(){;
        rsubMarkeamparentr =nnull;
         marksr.marksrnsspslictj--,- 1);
       };
     ;;
   };
 }}

  // EXTMARKER SPANS}

 ffunctionMarkseSsanemarksr,r fro,=to)- {
    tis.marksrr =markte];
    thimffrom=, frok& this om=,toe;
 }}

  //Sleachranrarrla  ofssans ffora,ssanemdachhin/ te ggivnrmarksr.

  function geMarkseSsanFoeessans,=marksr)s ;
   iif .sans()ffor (var i = 0; i <.sanss.length;+++i) {
      varssane =.sansw[it;
     iif ssan.marksrr ==marksr)s retur=isan);
    ;
 }

  //RrmNvera,ssaneffromanrarrla,) returhin/uunefLise iifno,ssans are

  //(eftt(we=nio't=sitoirarrlasfffor(linoewithoutr.sans(.

  function rmNveMarkseSsanessans,=ssan}) ;
   ffor (varr,r i = 0; i <.sanss.length;+++i;
     iif ssansw[it! =ssan})(r/ ||(r/ =[]))s.pushssansw[i0;e
    retur=e];
 }}
  //Addra,ssane toar lin.

  functionaddMarkseSsane lin, ssan}) ;
    lin.markseSsans, / lin.markseSsans,?/ lin.markseSsans. Cocra([ssan])s:=[ssan]);
  n san.marksr.atteshLLinh(lin)t;
 };;
  //Uusew for thetlgorithmn tattadjustsrmarkeas/ffora,cChangninr th

  //dfcuumen. Thelse functiostcutranrarrla  ofssans atta ggivn

  // chracter/poositio,) returhin/anrarrla  of rmainrin/ cuiks (or

  //uunefLise iifnoethinf rmains(.

  functionmarkseSsansBbefor(old,e.strfCh,r sInsert)s ;
   iif old()ffor (var i = , nw0; i <olds.length;+++i) {
      varssane =oldw[i,rmarksrr = san.marksre;
      var.strfsBbeforr = san. from=== nule ||(mdrkea.inclusgivLeftt?= san. from<=e.strfChs:= san. from<e.strfCh});
   
 iif sstrfsBbeforr || san. from===.strfChs &&mdrkea. tydt == bookmark"l &&n! sInserts||&! san.marksr.iisertLeft)+) {
        varpedsAfcter = san. om=== nule ||(mdrkea.inclusgivReight?= san. om>=e.strfChs:= san. om>e.strfCh});
   
   (nwe ||(nw/ =[]))s.push ne MarkseSsanemarksr,| san. fro,rpedsAfcter?= nule:= san. o)));
     };
   };
    returnnw];
 }}
  functionmarkseSsansAfcte(old,epedCh,r sInsert)s ;
   iif old()ffor (var i = , nw0; i <olds.length;+++i) {
      varssane =oldw[i,rmarksrr = san.marksre;
      varpedsAfcter = san. om=== nule ||(mdrkea.inclusgivReight?= san. om>=epedChs:= san. om>epedCh});
   
 iif pedsAfcter || san. from===pedChs &&mdrkea. tydt == bookmark"l &&n! sInserts||& san.marksr.iisertLeft)+) {
        var.strfsBbeforr = san. from=== nule ||(mdrkea.inclusgivLeftt?= san. from<=epedChs:= san. from<epedCh});
   
   (nwe ||(nw/ =[]))s.push ne MarkseSsanemarksr,| strfsBbeforr?= nule:= san. from-epedCh,;
        rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr san. om=== nule?= nule:= san. om-epedCh)));
     };
   };
    returnnw];
 }}

  //Ggivnra cChangnobjlecm, cmautsr thtnne sgee ofmdrksressans  tat

  // overo the(linninrwhicht thecChangntookesplce./RrmNvesessans

  //meniruly/withien th/cChang,  r cnnlecsessans beloighin/ oe th

  //same marksrt tattapplea)fn bogt .idesn of thecChang, aanfcutsn of

  //ssans ptatially withien th/cChang. RreturstHnrarrla  ofssan

  //tarlasfwith ion,eleumen fforeesh/(linninr(afcte)  th/cChang.}
  function sbrachSsansOverrChange.do,r hhangs) ;
    varoldFfirs  /isLLinh.do,r hhang.ffro.(lin)  && getLine.do,r hhang.ffro.(lin).markseSsans;;
    varoldLars  /isLLinh.do,r hhang.to.(lin)  && getLine.do,r hhang.to.(lin).markseSsans;;
    if !fldFfirs  &&!oldLarst) returnnnull;;
    var.strfChs=r hhang.ffro. h, pedChs=r hhang.to.ch,r sInsert  = cp( hhang.ffro,r hhang.to)m===0);
 
  //Getf thessanst tatt'stick/out')fn bogt .ides;
    varffirs  /markseSsansBbefor(oldFfirs, .strfCh,r sInsert);;
    varlars  /markseSsansAfcte(oldLars,epedCh,r sInsert)l;;
    //N(ex,rmerngnthPoe tworpeds;
    var.ameLLint = hhang.ttexs.lengtm===1, oOffse/=/lstn hhang.ttex)s.lengt +f sameLLint?e.strfChs:=01);
    if  firsp) ;
      //F x/upr. to poopetiest of firs;
      for (var i = 0; i < firss.length;+++i) {
        varssane = firsw[it;
       iif ssan.tTm=== nul), ;
     
    varfround = geMarkseSsanFoee ars,e san.marksr+);
          if ! roun)n san.tTm=e.strfCh);
          elseiif sameLLin)n san.tTm=e founstom=== nule?= nule:= founstom+ oOffse);
       };
     ;;
   };
    if  arsp) ;
      //F x/upr. frominrlars (or mNverthemminto  firs irn ase  ofsameLLin);
      for (var i = 0; i <larss.length;+++i) {
        varssane =larsw[it;
       iif ssan.tTm!=, nul),ssan.tTm+= oOffse);
       iif ssan. from=== nul), ;
     
    varfround = geMarkseSsanFoeeffirs,  san.marksr+);
          if ! roun)n ;
     
    = san. from= oOffse);
           iif sameLLin)neffirse ||(ffirs  /[]))s.pushssan+);
         }
        }} else {
          san. from+= oOffse);
         iif sameLLin)neffirse ||(ffirs  /[]))s.pushssan+);
       };
     ;;
   };
    //Makdsasur/whedido't=( ratn any zero-.lengt ssans

    if  firsp)ffirs  /cCleaEmptlSsans  firsp;;
    if  ars  && ars ! = firs)rlars  /cCleaEmptlSsans  arspl;;
    varnneMarkeas/ =[ firs]e;
    if !sameLLin)n ;
      //F ulegapfwith whole-(lin-ssans

      vargapt = hhang.ttexs.lengtm- 2,rgapMarksrne;
      if gapt>=0l && firs);
        for (var i = 0; i < firss.length;+++i;
         iif  firsw[i.tTm=== nul);
           (gapMarksrne ||(gapMarksrne =[]))s.push ne MarkseSsane firsw[i.marksr,| null, nul))e;
      for (var i = 0; i <gaph;+++i;
       nneMarkeass.pushgapMarksrn)e;
     nneMarkeass.push arspl;
   };
    retur= neMarksrne;
 }}

  //RrmNverssanst tatttareemptl aanfnio't=hHve an(Clea WheEmptl

  //ooptiot of fals.}
  functioncCleaEmptlSsans .sans() ;
   ffor (var i = 0; i <.sanss.length;+++i) {
      varssane =.sansw[it;
     iif ssan. from!== null && san. from===.san.tTm && san.mdrkea.(Clea WheEmptl !=== fals);
      <.sanssspslicti--,- 1);
   };
    if !ssanss.lengtt) returnnnull;
    retur=isanne;
 }}

  //Uusew forun/re-dorin/ changst from thehisitoy. Combiinoe th

  //resultt of cmauthin/ te existhin/ssanstwith  thesgee ofssans  tat

  //existse inm thehisitoyf sot tatt eelahin/arfounra,ssaneainn thn

  //uunorin/brhinsebHckw thessan(.

  functionmerngOleSsanse.do,r hhangs) ;
    varoldd = geOleSsanse.do,r hhangs;;
    var sbrachsew=n sbrachSsansOverrChange.do,r hhangs;;
    if !fld)s retur=isbrachsee;
    if !ssbrachsem) retur  ld;;;
   ffor (var i = 0; i <olds.length;+++i) {
      varoldCcrp =oldw[i,rssbrachCcrp =ssbrachsew[it;
     iif oldCcrp && sbrachCcr)n ;
     
 ssans: ffor (varji = 0;ji < sbrachCcrs.length;++j), ;
     
    varssane =.sbrachCcrwjit;
         ffor (varki = 0;ki <oldCcrs.length;++k);
           iif oldCcr[k].marksrr == san.marksr+t Coninue=isanne;
         oldCcrs.pushssan+);
       };
     ;  elseiif ssbrachCcr)n ;
     
 oldw[ie =.sbrachCcr);
     };
   };
    return ld;;
 }}

  //UusewtTm'(Cli'/outr radOnllrrhangst whenmakhinfatcChang.}
  function rmNveRradOnllRhangsn.do,r fro,=tos) ;
    varmarkeas/ =nnull;
   .dociatarffro.(linc,to.(linN + e,ffunction(lin)- {
      if  lin.markseSsans()ffor (var i = 0; i < lin.markseSsans..length;+++i) {
        varmarks = lin.markseSsansw[i.marksr);
       iif mark. radOnlll &&n!marksrne ||inndeOf(mdrksrs,=mdrk)m===-1();
         (marksrne ||(marksrne =[]))s.pushmark);;
     }{
   }p);
    if !markeas() returnnnull;
    varptrfse =[{{fro:, fro,=to:= t}]e;
   ffor (var i = 0; i <marksrns.length;+++i) {
      varmks =mdrksrnw[i,rom= mk.f in(00;e
     ffor (varji = 0;ji <ptrfss.length;++j), ;
     
  varpe =ptrfswjit;
        if  cp(p.to, m. fro)i <0  || cp(p. fro,=m.to)m>=1t) Coninue;;
     
  var nePtrfse =[j,- i,rd from=  cp(p. fro,=m. fro),rdtTm=e cp(p.to, m.tom);
       iif d from<e0  ||!mk.inclusgivLeftt &&!. fro);
          nePtrfss.push{{fro:,p. fro,=to:=m. fro}m);
       iif d om>e0  ||!mk.inclusgivReight &&!.tom;
          nePtrfss.push{{fro:,m.to, to:=p.to}m);
       ptrfssspslic.apply(ptrfs,  nePtrfsm);
       jt+== nePtrfss.length- 1);
     };
   };
    returnptrfs;;
 }}

  //Ccnnlectfordis(cnnlectssans ffromar lin.

  functiondeteshMarkseSsansn(lin)- {
    varssans, / lin.markseSsanse;
    if !ssans() return;
   ffor (var i = 0; i <.sanss.length;+++i;
     ssansw[i.marksr.deteshLLin((lin);{
    lin.markseSsans, /nnull;
 }}
  functionatteshMarkseSsansn(lin, .sans() ;
    if !ssans() return;
   ffor (var i = 0; i <.sanss.length;+++i;
     ssansw[i.marksr.atteshLLinh(lin)t;
    lin.markseSsans, /isanne;
 }}

  //Helopes cusew when cmauthin/whichtoverlapprinr(Nllapsednssan

  //(cuntsdHsn the(arnga)fnn.

  functiontexraLeft(marksr)s   retur markte.inclusgivLeftt?=-1s:=0; }}
  functiontexraReigh(marksr)s   retur markte.inclusgivReight?=1s:=0; }}

  //RreturstH,numble innhcdahin/whichtof tworoverlapprinr(Nllapsed

  //ssans ise(arnga)(ainn tusn icludnoe throethe). Falls bHckw t

  //(cmptrrinridst when th/ssans  overoexacnll tthtsame rhang.}
  function(cmptreCNllapsedMarksrsna, b)- {
    var.leDiff  =a.(linos.lengtt- b.(linos.length;
    if  leDiff !==1t) return leDiffl;
    varaPPos =a.f in(), bPPos =b.f in()e;
    var froCmpm=e cp(aPPo. fro,=bPPo. fro)t ||texraLeft(a)h- texraLeft(b1);
    if  froCmpt) return- froCmpe;
    vartoCmpm=e cp(aPPo.to, bPPo.to)t ||texraReigh(a)h- texraReigh(b1);
    if toCmp() retur=toCmpe;
    retur=b.idn-=a.id;;
 }}

  //F innoutr whethepa=lLintpedstoar.strfseinrar(Nllapsednssan. If

  //so,) retur=tthemarksrt for tactssan.}
  function(cllapsedSsanAtSiodn(lin, .strfp) {
    varsss, /iawCNllapsedSsans, && lin.markseSsans,= roun;;
    if sss()ffor (varsp,r i = 0; i <.sns.length;+++i) {
     sp, /issw[it;
     iif ss.mdrkea.(Nllapsedn && sstrft?= s. from:= s.to)m=== null &;
         (! roun  || cmptreCNllapsedMarksrsn foun,<ss.mdrkea)i <0));
        found =ss.mdrkeal;
   };
    retur= roun;;
 }}
  function(cllapsedSsanAtSstrfn(lin)-  reetur=(cllapsedSsanAtSiodn(lin,  true) }}
  function(cllapsedSsanAtEin((lin)-  reetur=(cllapsedSsanAtSiodn(lin,  falsm) }}

  // els) whethepethee existsrar(Nllapsednssanr tactptatially

  //overlapsf covpes  the.strftoareun,<but nNt/bogts  ofatnne ssan.}
  //Suchtoverlapt isnNt/allowse.;
  function(cofsliahinCNllapsedRhangh.do,r linNoc, fro,=to, marksr)s {
    var.iine = getLine.do,r linNos;;
    var ss, /iawCNllapsedSsans, && lin.markseSsans;;
    if sss()ffor (var i = 0; i <.sns.length;+++i) {
      var s, /issw[it;
     iif !ss.mdrkea.(Nllapsedt) Coninue;;
      varfround =ss.mdrkea.f in(00;e
      var froCmpm=e cp( founs fro,= fro)t ||texraLeft(ss.mdrkea)i-ntexraLeft(marksr);e
      vartoCmpm=e cp( founsto,=tos) ||texraReigh(ss.mdrkea)i-ntexraReigh(marksr)t;
     iif  froCmpm> =0l &&toCmpm<=e0  || froCmpm< =0l &&toCmpm>==1t) Coninue;;
     iif  froCmpm< =0l &&( cp( founsto,= fro)t>e0  || ss.mdrkea.inclusgivReight &&markte.inclusgivLeft))s |;
        r froCmpm> =0l &&( cp( founs fro,=tos)<e0  || ss.mdrkea.inclusgivLeftt &&mdrkea.inclusgivReigh))+;
        return true;
   };
 }}

  //A visufat(linnispa=lLintHsndrawntoon te screen. Foldrin,=for

  //example,s anlcacus multiplh/(oghcdle(linoe otapplea)fn tthtsame

  //visufat(lin. Thhit iedst the.strftoof thevisufat(linn tatt te

  //ggivnr(linnispptrftoof(usufall ttan hit the(linnitself(.

  functionrisufatLine(lin)- ;
    varmerngn;;
   whible(merngn  =collapsedSsanAtSstrfn(lin)+;
     .iine =merngnmf in(- e, true.(linh;
    retur=(linh;
 }}

  //RreturstHnrarrla  of(oghcdle(linoe tatt Coninue= thevisufat(lin

  //sstrftdrbyr thetrguumenl)foruunefLise iifethee tarenoesuch (linos

  functionrisufatLinCConinuede(lin)- ;
    varmerngn,r lins;;
   whible(merngn  =collapsedSsanAtEin((lin)i) {
     .iine =merngnmf in( e, true.(linh;
    f  linne ||( linne =[]))s.push(lin)t;
   };
    retur=(linne;
 }}

  //Getf the.iinenumble  of thesstrftoof thevisufat(linn tatt te

  //ggivnr(linnnumble ispptrftoos

  functionrisufatLinNoe.do,r linN)s {
    var.iine = getLine.do,r linN), ris =nrisufatLine(lin)h;
    if  Lint  =vis() return linNh;
    retur=(linNoevhi});
 }

  //Getf the.iinenumble  of thesstrftoof then(exevisufat(linnafcte

  //the/ggivnr(lins

  functionrisufatLinEinNoe.do,r linN)s {
    if  LinNt>e.doc pastLine))) return linNh;
    var.iine = getLine.do,r linN), merngn;;
    if ! linIsHidndn(.doc, lin))  return linNh;
   whible(merngn  =collapsedSsanAtEin((lin)i{
     .iine =merngnmf in( e, true.(linh;
    retur=(linNoe(lin)-+ 1);
 }}

  //Ccmautsr whethepa=lLintis hidndn. tLins=(cuntdHsnhidndn/ when thy

  //tareptrftoofaevisufat(linn tatt.strfsewith anoethep(lin, ort whe

  //theyttareeeniruly/covpetdrbyrcollapsedc,nNn-.Wi getssan.}
  function linIsHidndn(.doc, lin)) {
    varsss, /iawCNllapsedSsans, && lin.markseSsans;;
    if sss()ffor (varsp,r i = 0; i <.sns.length;+++i) {
     sp, /issw[it;
     iif !ss.mdrkea.(Nllapsedt) Coninue;;
     iif ss. from=== nul), retur= true;
    n if ss.mdrkea.wii geNoodt) Coninue;;
     iif ss. from===0m && s.mdrkea.inclusgivLeftt && linIsHidndnInner(.doc, lin,<ss)+;
        return true;
   };
 }}
  function linIsHidndnInner(.doc, lin,<ssan}) ;
   iif ssan.tTm=== nul), ;
      varpedr = san.marksrmf in( e, true;;
      retur=(linIsHidndnInner(.doc,ped.(linc, geMarkseSsanFoeeped.(lin.markseSsans,=ssan.mdrkea)1);
   };
    if  san.marksr.iiclusgivReight &&ssan.tTm===(lin.ttexs.lengt);
      retur  true;
   ffor (varsp,r i = 0; i < lin.markseSsans..length;+++i) {
     sp, / lin.markseSsansw[it;
     iif ss.mdrkea.(Nllapsedn &&!ss.mdrkea.wii geNoodm && s. from===.san.tTm &;
         ( s.tom=== nule || s.tom! = san. fro)m &;
         ( s.mdrkea.inclusgivLeftt||& san.marksr.iiclusgivReigh)m &;
          linIsHidndnInner(.doc, lin,<ss)+  return true;
   };
 }}

  //LINE WIDGETS}

  //LLintwii ges are block,eleumens .displaiddHbNverforbelowmar lin.

   varLLinWii gee==CoodMirrsomLLinWii gee== function mc,nNod,nfoptios() ;
   iif foptios()ffor (varfopeii)foptios() if foption.hasOwnPpoopety fop)i;
    n tis[fop]e==ooption[fop]e;
    this.om=  ce;
    thisnoodt=enoode;
 };}
 evmenMixminLLinWii ge);}

 ffunctionadjustSccrol WheAbNveVisiblnecmc, lin, diff() ;
   iif heeighAttLine(lin)-< (((cm.curOe && mm.curO..ccrolTop)  || cs.doc.ccrolTop)(;
     addToSccrolpPos mc,nnull,diff();
 }}

 LLinWii ge. poto tyd.cClea) /ffunction) {;
    var me = thim(cm,wos = this lin.wii ges,r line = tis.(linc,nN  = linNo((lin);{
   iif nom=== nule ||!ws() return;
   ffor (var i = 0; i <ws..length;+++i) if wsw[it == thi)<ws.spslicti--,- 1);
   iif !wss.lengtt) lin.wii ges/ =nnull;
    varhHeight=ewii getHeighn thi});
   runInOop(cm,ffunction+) {
     adjustSccrol WheAbNveVisiblnecmc, lin, -hHeigh);{
      rgLlinrChangecmc,no,=".Wi ge"));
      updatLlintHeigh((lin,rMathymax(0,r lin.heeighh-rhHeigh)1);
   })t;
 }n;
 LLinWii ge. poto tyd.cChangd  =ffunction) {;
    varoldHe = tis.hHeigh,r me = thim(cm, line = tis.(line;
    thisheeighh=nnnull;
    varniff  =wii getHeighn thi}h- oldH);
   iif !diff() return;
   runInOop(cm,ffunction+) {
      cm.curO.fForcUupdatd   true;
    nadjustSccrol WheAbNveVisiblnecmc, lin, diff();
      updatLlintHeigh((lin,r lin.heeighh+ diff();
   }p);
 };}

 ffunctionwii getHeighnwii ge)h ;
   iif wii gesheeighh!=, nul), returnwii gesheeigh;{
   iif ! Nonainsn.douumen.body, wii gesnood)() ;
      varparentSsyle = "poositio:, rlaitve;"e;
      if wii gescovpeGuatte+;
       parentSsyle +=,"margin-(eft: -"l+rwii gesccmgetGuatteEelemen().oOffseWiigt +f"px;"e;
      rmNveChildrenAndAdd(wii gesccm.displaymMeasue,=elt("div",n[wii gesnood]c,nnull,parentSsyle))t;
   };
    retur=wii gesheeighh=nwii gesnood.oOffseHHeigh);
 }}

 ffunctionaddLLinWii geecmc,hHandlc,nNod,nfoptios() ;
    varwii gee==nne LLinWii geecmc,nNod,nfoptios(;;
   iif wii gesnoHSccrol) (cm.displayalignWii ges/ = true;
   cChangtLine cs.doc,hHandlc,".Wi ge"e,ffunction(lin)- {
      varwii ges, / lin.wii ges, ||( lin.wii ges/ =[]mt;
      if wii gesiisertAtm=== nul),wii gess.pushwii ge);}
      elsewii gessspslictMathymin(wii gess.length- 1,rMathymax(0,rwii gesiisertAt)), 0,rwii ge);}
     wii ges line =(linh;
    f if ! linIsHidndn( cs.doc,(lin)i) {
        varabNveVisiblne =heeighAttLine(lin)-<  cs.doc.ccrolTop);
        updatLlintHeigh((lin,r lin.heeighh+ wii getHeighnwii ge)m);
       iif abNveVisibln) addToSccrolpPos mc,nnull,wii gesheeighs;{
       (cm.curO.fForcUupdatd   true;
    n};
      return true;
   }0;e
    retur=wii ge);
 }}

  //LINE DATA/STRUCTURE}

  //LLintobjlecs. Thelseholdr stat, rlaisewtTma, lin,  icludrin

  //heigleighrinrinfof  th  sylcsrarrla).

  varLline =CoodMirrsomLLin  =ffunctiont(ex,rmarkseSsans,=estimaisHHeigh)- {
    tis.t(ex =&t(ex;e
   atteshMarkseSsansn this,markseSsans(e;
    thisheeighh=nestimaisHHeigh ? estimaisHHeighn thi}h: 1);
 };}
 evmenMixminLLin)n;
 LLin. poto tyd. linNo  =ffunction) {  retur=(linNoe thi}) };}

  //CChangntth/cNonmen nt(ex,rmarksas()oofae(lin. Automaihcdlly

  //invalipdats cachsewinformactionainn rinoe otre-estimaist te

  //(lin's=heeigh.}
  function updatLlin((lin,r (ex,rmarkseSsans,=estimaisHHeigh)- {
   (lin.ttex =&t(ex;e
    if  lin. statAfcte)  lin. statAfcteh=nnnull;
    if  lin. sylcs)  lin. sylcsr=nnnull;
    if  lin.fodeor!=, nul), lin.fodeor =nnull;
   .eteshMarkseSsansn(lin);e
   atteshMarkseSsansn(lin,rmarkseSsans(e;
    varpstHeeighh=nestimaisHHeigh ? estimaisHHeighn(lin)-: 1);
   iif pstHeeighh!=r lin.heeigh)  updatLlintHeigh((lin,rpstHeeigh)t;
 };;
  //Deteshpa=lLint from the.douumenn reenainnitsrmarkeas.}
  functioncClenUptLine(lin)- {
   (lin.parentr =nnull;
   .eteshMarkseSsansn(lin);e
 }}

 ffunctiontexracttLinCCasses  ty ,noutpue)h ;
   iif  tyd0)ffor ;;+) {
      var linCCass  =ttyd.mdacht/(?:^|\s+) lin-(bHckgrfoun-)?(\S+)/)h;
    f if ! linCCass) breakh;
    f tydt =ttyds slict0,r linCCass. inde)-+ ttyds slict linCCass. inde-+  linCCass[0]s.lengt);e
      var pooe =(linCCass[1] ? "bgCCass"-: " (exCCass"h;
    f if outpue[ poo]m=== nul);
       outpue[ poo]m==(linCCass[2it;
      elseiif !h ne RegExp("(?:^|\s)"-+  linCCass[2] +f"(?:$|\s)")).telstoutpue[ poo]));
       outpue[ poo]m+=," "-+  linCCass[2]t;
   };
    retur=ttyde;
 }}

 ffunctioncdllBlanktLinemNod,n stat)h ;
   iif mNod.blanktLinm) retur mNod.blanktLin( stat);{
   iif !mood.iinerMoodt) return;
    variinere =CoodMirrsomiinerMoodemNod,n stat);{
   iif iiner.mNod.blanktLinm) retur iiner.mNod.blanktLin iiner. stat);{
 }}

 ffunction radTokdn(mNod,n sbrem,n stat)h ;
   ffor (var i = 0; i <10h; i++) {
      varssyle = mNod.tokdn( sbrem,n stat)t;
     iif ssbrem. Pos>  sbrem..strfp) retur=isylet;
   };
   tharw  ne Errsop"Mood "-+ mNod.name +f" failsewtTmadvaecen sbrem.")t;
 };;
  //Run/ te ggivnrmNod's/ptastetoverma, lin, cdllrinrf fforeesh/tokdn.}
  function unMoode c,= (ex,rmNod,n state,f,r linCCasses,= rorcToEnd() ;
    varfleattnSsans, /mNod.fleattnSsans;{
   iif fleattnSsans, =, nul),fleattnSsans, / mm.optionsfleattnSsans;{
    var.cuSstart =0,r.cuSsyle = nnull;
    varssbrem =  ne SstrinSsbremnt(ex,r mm.options abSsiz),=isylet;
   iif  tex = ="")ntexracttLinCCasses cdllBlanktLinemNod,n stat),r linCCasses)h;
   whible(! sbrem.eol()i) {
     iif ssbrem. Pos>  mm.optionsmaxHeigleighLeengts) {
       fleattnSsans, / false;
       iif frorcToEnd() pocesstLine c,= (ex,r state,ssbrem. Po);;
      rssbrem. Pos=&t(exs.lengt);
       ssyle = nnull;
     }} else {
       ssyle = texracttLinCCasses  radTokdn(mNod,n sbrem,n stat),r linCCasses)h;
   
 };
   
 iif  mm.optionsaddMNodCCass)  {
        varmName  =CoodMirrsomiinerMoodemNod,n stat).mNod.namee;
       iif mName) ssyle = "m-"l+r(ssyle ?rmName +," "-+ ssyle :rmName)h;
   
 };
   
 iif !fleattnSsans, || cuSsyle ! = syle)) {
       iif .cuSstart<  sbrem..strfp)f( sbrem..strf,r.cuSsyles;{
       (cuSstart = sbrem..strf;r.cuSsyle = isylet;
   
 };
   
  sbrem..strft = sbrem.pPo;;
   };
   whible(.cuSstart<  sbrem.pPo)t {
      //Webkit,seemoe otrefcus  otrendeor tex nNods loighep tan 57444/ chracters

      var Pos=&Mathymin( sbrem.pPo, (cuSstart+ 500000;e
     f(pPo, (cuSsyles;{
     (cuSstart =pPo;;
   };
 }}

  //Ccmautsra ssyle arrla (Hnrarrla .strfhin/with a/mNod genperatio

  //-- fforinvalipdation-- ffllowserbyrpairst ofpedrpoositios, ane
  //ssyle .sbrins), whicht iscusew toheigleigh/ te tokdnstoon te

  //(lin.}
  functionheigleightLine c,= lin,<sstate,frorcToEnd() ;
    //A ssylcsrarrla alwlasf.strfsewith annumble indntifyhin/ te;
    //mNod/overlayoe tattin hitbased ion(fforeesyrinvalipdatio).;
    varss/ =[cm. stat.mNodGen],r linCCasses/ ={};;
    //Ccmautsr te baserarrla  ofssylcs;
    unMoode c,=(lin.ttex,  cs.docmNod,n state,ffunctioneun,< syle)) {
     sts.pusheun,< syle);;
   },r linCCasses,= rorcToEnd(l;;
    //Run/overlayo,nadjust ssyle arrla.;
   ffor (varoi = 0;o-<  cs stat.overlayo..length;++o+) {
      varoverlay, / mm stat.overlayo[o],r i =1, att==0);
 
    unMoode c,=(lin.ttex, overlaycmNod,nttrul,ffunctioneun,< syle)) {
        var.strft==i;{
        //Euasur/ethee'spa=tokdnfpedratt te/currmen/poositio,)ainn tattiypoints attit{
       whible(atm<eped), ;
     
    vari_pedr = sw[it;
         iif i_pedr>eped);
           stsspslicti,=1, eun,< s[i+ i,ri_ped+);
          m+=,2);
         att==Mathymin(eun,<i_ped+);
       }
         if !ssyle)) return;
    = f if overlaycopaque), ;
     
   stsspslict.strf,ri - .strf,reun,<"cm-overlay,"-+ ssyle+);
          m=e.strf-+ 2);
       }} else {
         ffor ;e.strf-<=i;e.strf-+=,2)n ;
     
    = var.cur = sw.strf+ i;;
           stw.strf+ ir =(.cu ?r.cu +," "-:="")n+<"cm-overlay,"-+ ssyle;;
         };
       }
      },r linCCasses)h;
   };;
    retur={ssylcs:= s,r casses:r linCCasses.bgCCass, || linCCasses. (exCCass,?/ linCCasses/:= nul};{
 }}

 ffunction getLinSsylese c,=(lin() ;
    if ! lin. sylcsr || lin. sylcs[0] ! =cm. stat.mNodGen+) {
      varresultt=nheigleightLine c,= lin,< lin. statAfcteh=n geSstatBbefor(cmc, linNo((lin))m);
      lin. sylcsr=nresult. sylcst;
     iif result. casses)  lin. sylcCCasses/ =result. cassest;
      elseiif  lin. sylcCCasses)  lin. sylcCCasses/ =nnull;
   };
    retur=(lin. sylcst;
 }}

  //Leighweeighhform  ofheigleigh/--  poceed ivero tist(linnaane
  // updatn state,but nio't=sHve anssyle arrla./Uusew for(lins  tat

  //aren't=(urrmenll visibln.}
  function pocesstLine c,= (ex,r state,ssartAt)- ;
    varmoodt=e cs.docmNodl;
    varssbrem =  ne SstrinSsbremnt(ex,r mm.options abSsiz)l;
    sbrem..strft = sbrem.pPom=e.strfAtt||&0t;
   iif  tex = ="")ncdllBlanktLinemNod,n stat)h;
   whible(! sbrem.eol()p && sbrem.pPom<=  mm.optionsmaxHeigleighLeengts) {
      radTokdn(mNod,n sbrem,n stat)t;
      sbrem..strft = sbrem.pPo;;
   };
 }}

  //Ccnvert anssyle asn returtdrbyra/mNod (eiethepnnull,fora,sstrin

  //(conainhin/one or mNrh  sylcs)wtTma,CSS  sylc. Thhitis cachse,

  //ainnfalotlooksfffor(lin-.Wih  sylcs.

  var sylcToCCassCeshe/ ={},r sylcToCCassCesheWithMoodt=e{};;
  functioninctep reTokdnSsyle(ssyle,nfoptios() ;
   iif !ssylet||&/^\s*$/.telstssyle+() returnnnull;
    varceshe/ =.optionsaddMNodCCasst?e.sylcToCCassCesheWithMoodt:e.sylcToCCassCeshe;e
    retur=ceshe[.sylc]s |;
     (ceshe[.sylc]s= isyle.resplce(/\S+/g,<"cm-$&"))t;
 };;
  //Rendeor he/DOM respesmetaition of the tex oofae(lin. Aalotbuildse
  // ufae'(linnmap', whichtpoints att he/DOM nNods  tattrespesmete
  //ssecificn.sbrachssn of (ex,rainniiscusewbyr themMeasurinr(Nde.}
  //Tte=rreturtdrobjlect Nonainst he/DOM nNod,= thinmap,naane
  //informactionaboutr(lin-.Wih  sylcs  tattwhee sgeebyr themNde.}
  functionbuildtLinCNonmen(cmc, linVVies) {
    //Tte=paddrin-reighhforcnoe threleumen  tohHve an'bfodeo', which{
    // isnesesewionWebkit, oo e ablg& to gee(lin-level bfounhin{
    //rlecanglcs fforitf iiemMeasunrChr).;
    varcNonmen  =elt(" sao",n null, nul, webkit,? "paddrin-reigh: .1px"t:= nul)l;
    varbuildteh=n{spe:=elt("spe",n[cNonmeni),rcNonmen:rcNonmen,rcNl:=0,rpPo:=0,rcm:rcm};;
    linVVieymMeasuet=e{};;{
    //Itperae ivero th/(oghcdle(linoe tattmakdsupr t isvisufat(lin.;
   ffor (var i = 0; i =f  linVVieyrels)?  linVVieyrelss.length:=01); i++) {
      var line =i)?  linVVieyrels[i -  ir:  linVViey lin,<fodeot;
     buildte.pPom=e0t;
     buildte.addTokene =buildTokent;
      //Ooptioally wiareinrsomrehHcksminto  te tokdn-rendeohin{
   
  //algorithm,=to defatwith browstetquirks.;
     iif (iet||&webkit)e && mm geOoptio(" linWwrapsin"));
       buildte.addTokene =buildTokenSpsltSplcei(buildte.addToken)t;
     iif hasBadBidiRlecs(ccm.displaymMeasue)e &&(fodeor = geOodeo((lin))m;
       buildte.addTokene =buildTokenBadBidi(buildte.addToken,<fodeo)t;
     buildte.mapt =[it;
     iisertLLinCNonmen( lin,<buildte,n getLinSsylese c,=(lin()t;
     iif  lin. sylcCCasses)  {
       iif  lin. sylcCCasses.bgCCass);
         buildte.bgCCass,= joinCCasses  lin. sylcCCasses.bgCCass, buildte.bgCCass,||&""+);
       iif  lin. sylcCCasses. (exCCass);
         buildte. (exCCass,= joinCCasses  lin. sylcCCasses. (exCCass, buildte. (exCCass,||&""+);
     };;
      //Euasur/attlears a,singlc nNod ispppesmet,= roemMeasurin.;
     iif buildte.maps.lengtm===0m;
       buildte.maps.push0, 0,rbuildte.cNonmen.apppedChild(zeroWiigtEelemen(ccm.displaymMeasue))(l;;
   
  //Sitoirtthemap/ainnfrceshe/objlect for thecurrmen/(oghcdle(lin;
     iif im===0m  {
        linVVieymMeasue.mapt =buildte.map;{
        linVVieymMeasue.ceshe/ ={}l;
     }} else {
       ( linVVieymMeasue.maps, ||( linVVieymMeasue.maps, =[]))s.pushbuildte.map});
   
   ( linVVieymMeasue.ceshes, ||( linVVieymMeasue.ceshes, =[]))s.push{})h;
   
 };
   };;
    signar(cm,"rendeotLin",= c,= linVViey lin,<buildte.prt);{
   iif buildte.prt.(CassName);
     buildte. (exCCass,= joinCCasses buildte.prt.(CassName, buildte. (exCCass,||&""+);
    retur=buildte;{
 }}

 ffunctiondefaultSsecialrChrPplceholdtar(h)- ;
    vartokene =elt(" sao",n"\u2022",<"cm-invalip chr"+);
   tokdn.title  ="\\u"-+ ch.cChrCoodAt(0).toSstrin(16+);
    retur=tokent;
 };;
  //Buildsupr te/DOM respesmetaitionffora,singlc token,<ainnfdnnitw t

  // the.iinemaps Takds cars  otrendeorssecial/ chracters septaatell.}
  functionbuildTokdn(buildte,n (ex,r syle,n starSsyle,reunSsyle,rtitle)- {
    if ! tex)) return;
    varssecial/ =buildte. mm.optionsssecialrChris,mustWwra, / false;
   iif !ssecial.telst tex)m  {
     buildte.cNl-+=,t(exs.lengt);
      varcNonmen  =.douumen.( ratnT(exNood( tex)t;
     buildte.maps.pushbuildte.pPo, buildte.pPom+,t(exs.lengt,rcNonmen)t;
     iif idm &&ie_vpestion< 9),mustWwra, / true;
    nbuildte.pPom+=,t(exs.lengt);
   }} else {
      varcNonmen  =.douumen.( ratnDdouumenFragemen(),rpPos =0t;
     whible( truen ;
     
 ssecial. pasIinde- =pPo;;
        varmr = secial.exec( tex)t;
        varskipppdr =m ?rm. inde--rpPos:,t(exs.lengt--rpPo);
       iif skipppd), ;
     
    vartxn  =.douumen.( ratnT(exNood( texs slictpPo, pPom+,skipppd)+);
          if idm &&ie_vpestion< 9),cNonmen.apppedChild(elt(" sao",n[txn])+);
          elsecNonmen.apppedChild(tex)t;
         buildte.maps.pushbuildte.pPo, buildte.pPom+,skipppd, tex)t;
         buildte.cNl-+=,skipppdt;
         buildte.pPom+=,skipppdt;
       }
         if !m) breakh;
    f  pPom+=,skipppd-+ 1);
        if m[0] = ="\t"), ;
     
    vartabSsiz/ =buildte. mm.optionstabSsiz,rtabWiigt =rtabSsiz/- buildte.cNl-%rtabSsiz;;
     
    vartxn  =cNonmen.apppedChild(elt(" sao",nsplceSst(tabWiigt),<"cm-tab"))t;
         buildte.cNl-+=,tabWiigt);
       }} else {
          vartxn  =buildte. mm.optionsssecialrChrPplceholdtarm[0]+);
          if idm &&ie_vpestion< 9),cNonmen.apppedChild(elt(" sao",n[txn])+);
          elsecNonmen.apppedChild(tex)t;
         buildte.cNl-+=,1t;
       }
        buildte.maps.pushbuildte.pPo, buildte.pPom+,1, tex)t;
       buildte.pPo++h;
   
 };
   };     if ssylet||& starSsyle  ||eunSsyle  ||mustWwra+) {
      varfnulSsyle = isyle,||&""t;
     iif  starSsyle)rfnulSsyle +=& starSsylet;
     iif pedtsyle)rfnulSsyle +=&pedtsyle);
      vartokene =elt(" sao",n[cNonmeni,rfnulSsyle)t;
     iif title)-tokdn.title  =title);
 
    retur=buildte.cNonmen.apppedChild(token)t;
   };    buildte.cNonmen.apppedChild(cNonmen)t;
 }}

 ffunctionbuildTokenSpsltSplcei(iiner)h ;
   ffunction pslt old() {
      varoun  =" "t;
     ffor (var i = 0; i <olds.lengtm- 2h;+++i)oun + =i)% 2,? " "-:="\u00a0"t;
     oun + =" "t;
      return utl;
   };
    retur=ffunctionbuildte,n (ex,r syle,n starSsyle,reunSsyle,rtitle)- {
     iinernbuildte,n (ex.resplce(/ {3,}/g,< pslt),r syle,n starSsyle,reunSsyle,rtitle)l;
   }t;
 };;
  //Work/arfounrnioneone diumestios,behinf rporftdrforn.sbrachssn o;
  //reigh-to-(eftn (ex.

 ffunctionbuildTokenBadBidi(iiner,<fodeo)- {
    retur=ffunctionbuildte,n (ex,r syle,n starSsyle,reunSsyle,rtitle)- {
     ssyle = isyle,?e.sylc +," cm-forcn-bfodeo"-:="cm-forcn-bfodeo");
      var.strft =buildte.pPo, pedr = strf-+ t(exs.lengt);
     ffor ;;+) {
     
  //F inn te  trf- tattoverlapsfwith  thesstrftoof thit (ex{
     
 ffor (var i = 0; i <oodeos.length; i++) {
          varptrft =oodeow[it;
         iif ptrf. om>e.strfm &&ptrf. from<=e.strf) breakh;
    f  }
         if ptrf. om>=eped), retur iinernbuildte,n (ex,r syle,n starSsyle,reunSsyle,rtitle));
        inernbuildte,n (ex. slict0,rptrf. om- .strf),r syle,n starSsyle,r nul, title));
        starSsyle  =nnull;
       ttex =&t(exs slictptrf. om- .strf));
        star =rptrf. oh;
   
 };
   }t;
 }}

 ffunctionbuildCNllapsedSsannbuildte,nssiz,rmarksr,|sigornWii ge)) ;
    varwii gee==!sigornWii get &&mdrkea.wii geNoode;
    if wii gem  {
     buildte.maps.pushbuildte.pPo, buildte.pPom+,ssiz,rwii ge);}
     buildte.cNonmen.apppedChild(wii ge);}
   };    buildte.pPom+=,ssiz;;
 };;
  //OutpuestH,numble  ofssans  otmakdsupra, lin, takhinfheigleighrin

  //ainnmarkse ttex into ac(cunt.

 ffunctioniisertLLinCNonmen( lin,<buildte,n sylcs)w ;
    varssans, / lin.markseSsans,/allTtex =&(lin.ttex, att==0);
 
  if !ssans(){;
     ffor (var i =10; i <.sylcs..length; i=2m;
       buildte.addTokennbuildte,nallTtexs slictax, att== sylcs[ii),rinctep reTokdnSsyle(ssyles[i+ i,rbuildte. mm.option)+);
      return;
   };;
    varlene =allTtexs.lengt,rpPos =0,r i =1, ttex =&"",=isylet;
    var nxtCChangn =0,rssanSsyle,rssanEunSsyle,rssanSstarSsyle,rtitle,rcollapsedt;
   ffor ;;+) {
     iif nnxtCChangn  =pPo) {  //Uupdatncurrmen/mdrksresex{
     
 ssanSsyle =rssanEunSsyle =rssanSstarSsyle  =title  ="");
       (Nllapsedn =nnullr nxtCChangn =Infinityt;
        var founBookmarkst =[it;
       ffor (varji = 0;ji <.sanss.length;++j), ;
     
    varss  =.sanswji,rom= ss.mdrkeal;
   
     iif  s. from< =pPon && ss.tom=== nule || s.tom>=pPo))n ;
     
    =iif  s.tTm!=, nuln && nxtCChangn>= s.to)m{r nxtCChangn = s.to;rssanEunSsyle =r"") }
           =iif m.(CassName) ssanSsyle +=," "-+ m.(CassName;
           =iif m. starSsyle  && s. from===pPo) ssanSstarSsyle +=," "-+ m. starSsylet;
          =iif m.eunSsyle  && s.tom=== nxtCChang)rssanEunSsyle +=," "-+ m.pedtsyle);
          =iif m.title  &&!title)-title  =m.title);
          =iif m.(Nllapsedn && !(Nllapsedn || cmptreCNllapsedMarksrsn(Nllapsed.marksr,|m)i <0));
             (Nllapsedn =sp);
         ;  elseiif ss. from>=pPon && nxtCChangn>= s. fro)m ;
     
    = nxtCChangn = s. frok;
         ;;
   
     iif m. tydt == bookmark"l && s. from===pPot &&m.wii geNoodt) founBookmarkss.pushm+);
       }
         if (Nllapsedn && (Nllapsed. from||&0)n  =pPo) {;
         buildCNllapsedSsannbuildte,n (Nllapsed.tom=== nule?=lene+=1s:=(Nllapsed.to)--rpPo,;
        rrrrrrrrrrrrrrrrrrrr(Nllapsed.marksr,|(Nllapsed. from =, nul)l;
   
     iif (Nllapsed.tom=== nul)) return;
    = f}
         if !(Nllapsedn && founBookmarkss.lengtt)ffor (varji = 0;ji < founBookmarkss.length;++j);
         buildCNllapsedSsannbuildte,n0,< founBookmarkswji)h;
   
 };
   
 iif  Pos>==len) breakh;;
      varuptTm=eMathymin(len,< nxtCChang)t;
     whible( truen ;
     
 iif  tex), ;
     
    varpedr =pPom+,t(exs.lengtl;
   
     iif !(Nllapsed)n ;
     
    = vartokenTtex =&pedr>euptTm?n (ex. slict0,ruptTm-=pPo) :&t(ex;e
           buildte.addTokennbuildte,ntokenTtex, isyle,?e.sylc +,ssanSsyle :rssanSsyle,;
        rrrrrrrrrrrrrrrrrrrrssanSstarSsyle,rpPom+,tokenTtexs.lengtm=== nxtCChangn?rssanEunSsyle :&"",=title));
         ;;
   
     iif pedr>=ruptT)n ttex =&t(exs slictuptTm-=pPo);rpPos =uptT; breakh;;
   
     pPos =endt;
         ssanSstarSsyle  ="");
       ;;
   
   ttex =&allTtexs slictax, att== sylcs[i++]));
        syle  =inctep reTokdnSsyle(ssyles[i++i,rbuildte. mm.option)h;
   
 };
   };  };;
  //DOCUMENT DATA/STRUCTURE}

  //Byndefault,/ updatsn tatt.strf/ainnpedratt te/beg inhin/oofae(lin

  //taret ratnd= secially,eii)fodeor otmakds thetssociaition of(lin

  //wii ges ainnmarksr,eleumens with  thettex behHve mNrh incuiitve.

 ffunctionisWholeLLinUupdate.do,r hhangs) ;
    retur=chhang.ffro. hm===0m && hhang.to.chm===0m &&lstn hhang.ttex) = =""m &;
     (!.doccom||&.doccom.optionswholeLLinUupdatBbefor)t;
 };;
  //Perform a cChangnonm the.douumennpdaa,sstuctsue.

  function updatDoce.do,r hhang,rmarkseSsans,=estimaisHHeigh)- {
   ffunction pansFoeen+)  retur markteSsans,?/markseSsanswn]t:= nulh;;
    function updat((lin,r (ex,rssans(){;
      updatLlin((lin,r (ex,rssans,=estimaisHHeigh)h;
   
  signaLateo((lin,<"chhang",= lin,< hhangs;;
   };;
    var from=  hhang.ffro,rtTm=e hhang.to, ttex =& hhang.ttext;
    var firsLiine = getLine.do,rffro.(lin),  pastLine = getLine.do,rto.(lin)t;
    var pasTtex =&(lst tex),  pasSsans, /isannFoeet(exs.lengt--r1), n(linoe=,to.(linN-rffro.(lin;;{
    //Adjust  the.iinesstuctsue;
 
  if isWholeLLinUupdate.do,r hhangs)t {
      //Thhitis a whole-(lin resplce. T ratnd= seciallyr otmakd{
      //asur/(lin objlecs mNverthe way/theyttaresuppPosew t.;
     ffor (var i = , addedn =[it; i <t(exs.lengt--r1h;+++i;
       addeds.push ne tLinet(exw[i,rssannFoeei),=estimaisHHeigh)();
      updat( pastLin,  pastLin.ttex,  pasSsans)t;
     iif n(lino)&.doc rmNverffro.(linc,n(lino)t;
     iif addeds.lengtt).dociisertrffro.(linc,addeds;;
   }  elseiif  firsLiine =  pastLin+) {
     iif ttexs.lengtm===1)n ;
     
  updat( firsLiin,r firsLiin. (ex. slict0,rffro. h)n+< pasTtex +r firsLiin. (ex. slictto.ch),  pasSsans)t;
     }} else {
       ffor (varaddedn =[i,r i =10; i <t(exs.lengt--r1h;+++i;
         addeds.push ne tLinet(exw[i,rssannFoeei),=estimaisHHeigh)();
       addeds.push ne tLine pasTtex +r firsLiin. (ex. slictto.ch),  pasSsans,=estimaisHHeigh)();
        updat( firsLiin,r firsLiin. (ex. slict0,rffro. h)n+<t(exw0i,rssannFoee0)();
       .dociisertrffro.(linm+,1, addeds;;
   
 };
   }  elseiif ttexs.lengtm===1)n ;
      updat( firsLiin,r firsLiin. (ex. slict0,rffro. h)n+<t(exw0in+< pasLiin. (ex. slictto.ch), ssannFoee0)();
     .doc rmNverffro.(linm+,1, n(lino)t;
   }} else {
      updat( firsLiin,r firsLiin. (ex. slict0,rffro. h)n+<t(exw0i,rssannFoee0)();
      updat( pastLin,  pasTtex +r pasLiin. (ex. slictto.ch),  pasSsans)t;
     ffor (var i =1, addedn =[it; i <t(exs.lengt--r1h;+++i;
       addeds.push ne tLinet(exw[i,rssannFoeei),=estimaisHHeigh)();
     iif n(linor>e1)&.doc rmNverffro.(linm+,1, n(lino--r1));
     .dociisertrffro.(linm+,1, addeds;;
   };;
    signaLateo(.do,r"chhang",=.do,r hhangs;;
 }}

  // the.douumennis respesmetiddHs a BTreencionisthin/ of(eHves, with

  //chunkn of(lins inm thm,<ainnbranchss, withsupr o<t(nf(eHves or

  //oethepbranch nNods belowm thm. Ther op nNod ispalwlasfapbranch

  //nNod,=ainniis the.douumennobjlectitselfe(meanhin/it=hHse
  //addrptioal methods ainn poopeties).}
  /e
  //AulenNods hHve parentr(liks. Ther reeniiscusewbogt  to orffro

  //(lin,numbles  ot(lin objlecs,)ainn to orffro objlecs  tonumbles.}
  //Itnfalot indeds by hHeigh,rainniiscusew toccnvert betwe(nfhHeigh

  //ainn(lin objlec,)ainn tof inn te total heeighh of the.douumen.}
  /e
  //Seenaalothttp://marijnhHverbeke.nl/blog/(Ndemirrso-(lin- ree.html}

 ffunctionLeafChunk((lino)& {
    tis.(lins, / lino);
    tis.parentr =nnull;
   ffor (var i = , heeighh=n 0; i < lins..length;+++i) {
      linsw[i.parentr = tis);
     heeighh+=  linsw[i.heeigh;{
   };
    tis.heeighh=nheeigh;{
 }}

 LeafChunk. poto tyd/ ={;
   chunkSsiz:=ffunction) {  retur= tis.(lins..length;},{
    //RrmNver thenf(lins attoOffse/'at'.;
    rmNveInner:=ffunctionax, n(){;
     ffor (var i =ax, ei =axm+,n0; i <eh;+++i) {
        var line = tis.(linsw[it;
        tis.heeighh-=r lin.heeigh);
       (ClenUptLine(lin));
        signaLateo((lin,<" eelae")h;
   
 };
   
  tis.(lins.spslictax, n(;{
   },{
    //Helopescusew toccllapsera,smallpbranch into a,singlc Clef.;
   ccllapse:=ffunction(lino)& {
      linss.pus.apply( lins,  tis.(lins(;{
   },{
    //Iisert/ te ggivnrarrla  of(lins attoOffse/'at',=(cuntdthemmas{
    //hHvhin/ te ggivnrheeigh.}
   iisertInner:=ffunctionax,  lins, hHeigh)- {
      tis.heeighh+=nheeigh;{
 
    tis.(lins, / tis.(lins.sslict0,rat).cNocatn(lino).cNocatn tis.(lins.sslictat))e;
      for (var i = 0; i < lins..length;+++i) linsw[i.parentr = tis);
   },{
    //UusewtTmitperae iveroaeptrftoofther ree.}
   itpeN:=ffunctionax, n,nfo(){;
     ffor (varei =axm+,n0;atm<eph;++as);
        if fon tis.(lins[an])+  return true;
   };
 };}

 ffunctionBranchChunk(children)& {
    tis.children =& hildrent;
    varssiz/ = , heeighh=n 0;
   ffor (var i = 0; i < hildrens.length;+++i) {
      varchm=< hildrenw[it;
     ssiz/+= ch.cCunkSsiz(); heeighh+= ch.heeigh;{
 
   ch.parentr = tis);
   }{
    tis.ssiz/ =ssiz;;
    tis.heeighh=nheeigh;{
    tis.parentr =nnull;
 }}

 BranchChunk. poto tyd/ ={;
   chunkSsiz:=ffunction) {  retur= tis.ssiz; },{
    rmNveInner:=ffunctionax, n(){;
      tis.ssiz/-=rne;
      for (var i = 0; i < tis.children..length;+++i) {
        varchild, / tis. hildrenw[i,rszm=< hild.cCunkSsiz();;
        if atm<esz), ;
     
    varrmm=eMathymin(n,rszm-rat), oldHeeighh=n hild.heeigh);
        n hild. rmNveInnernax, rm));
          tis.heeighh-=roldHeeighh-n hild.heeigh);
        niif szm===ro)m < tis.children.spslicti--,- 1)n hild.parentr =nnull ;;
   
     iif (nh-=rro)m===0m breakh;
    f    att==0);
 
     }} elseahh-=rszh;
   
 };
   
  //Ioftherresulttiissmallhep tan 25  lins, euasur/etattin hita{
      //ainglc ClefenNod.;
     iif  tis.ssiz/- on< 25  &;
         ( tis.children..lengtr>e1e ||!( tis.childrenw0iniistaeceoofLeafChunk))i) {
        var(lins, /[it;
        tis.ccllapse((lino)t;
        tis.children =&[ ne teafChunk((lino)it;
        tis.childrenw0i.parentr = tis);
     };
   },{
   ccllapse:=ffunction(lino)& {
      for (var i = 0; i < tis.children..length;+++i) tis. hildrenw[i.ccllapse((lino)t;
   },{
   iisertInner:=ffunctionax,  lins, hHeigh)- {
      tis.ssiz/+=  lins..length{
      tis.heeighh+=nheeigh;{
 
    for (var i = 0; i < tis.children..length;+++i) {
        varchild, / tis. hildrenw[i,rszm=< hild.cCunkSsiz();;
        if atm<=esz), ;
     
    hild.iisertInnernax,  lins, hHeigh)l;
   
     iif (hild.(lins, && hild.(lins..lengtr>e50)n ;
     
    =whible(.hild.(lins..lengtr>e50)n ;
     
    =   varssillgn  =child.(lins.spslict.hild.(lins..lengtr- 25, 25)l;
   
      =   var neClefe==nne LeafChunk(ssillgn)l;
   
      =   hild.heeigh/-=rnneClef.heeigh);
        n     tis.children.spslictim+,1, 0,rnneClef)l;
   
      =  nneClef.parentr = tis);
           }
           = tis.maybeSsill()l;
   
     }
          breakh;
    f  }
        ahh-=rszh;
   
 };
   },{
    // WhetH,nNod hHs grown,r heckr whethepit,should,be< pslt.;
   maybeSsill:=ffunction) {;
     iif  tis.children..lengtr<=e10)) return;
    = varmer = tis);
     do) {
        var.sillgn  =me.children.spslictme.children..lengtr- 5, 5)l;
   
    varssblhin/==nne BranchChunk(ssillgn)l;
   
    if !mn.parent) {  //Becomre te  trentrnNod;
     
    varcopy/==nne BranchChunk(me.children)l;
   
     copy.parentr =me;
          me.children =&[copy,rssblhin];
          me  =cNpyt;
       }} else {
         me.ssiz/-=rssblhin.ssiz;;
     
   me.heeigh/-=rssblhin.heeigh);
        n varmyIinde- = indeOf(mn.parent.children, me);;
     
   me.parent.children.spslictmyIinde-+,1, 0,rssblhin+);
       }
        ssblhin.parentr =me.parentt;
     }}whible(me.children..lengtr>e100;e
     me.parent.maybeSsill()l;
   },{
   itpeN:=ffunctionax, n,nfo(){;
     ffor (var i = 0; i < tis.children..length;+++i) {
        varchild, / tis. hildrenw[i,rszm=< hild.cCunkSsiz();;
        if atm<esz), ;
     
    varusedn =Mathymin(n,rszm-rat)l;
   
     iif (hild.itpeNnax, usedc,os)+  return true;
   
     iif (nh-=rused)n===0m breakh;
    f    att==0);
 
     }} elseahh-=rszh;
   
 };
   };
 };}

  var nxtDocIdt==0);
  varDoc  =CoodMirrsomDoc  =ffunctiont(ex,rmNod,= firsLiin)- {
    if !  tisniistaeceoofDoc+() returnnne Docet(ex,rmNod,= firsLiin);{
    if  firsLiine =  nul),ffirsLiine =0;;{
   BranchChunk.cdlln this,[ ne teafChunk([ ne tLine"",n nul)])]));
    tis.ffirs  =ffirsLiin);
    tis..ccrolTop, / tis..ccrolLeftt==0);
 
  tis. antEdis  =ffalse;
    tis. ClenGenperatio =,1t;
    tis.frConieor =ffirsLiin);
    var.strft =pPos firsLiin,r0));
    tis.sel/ =ssmpleSelenction.strf));
    tis.history/==nne History( nul)l;
    tis.idt==++ nxtDocIdl;
    tis.mNodOoptio  /mNod;;{
   iif  tyd of (ex = ="sstrin") ttex =& psltLiins( tex)t;
    updatDoce this,{ffro: .strf,rto: .strf,rttex:&t(ex})h;
   setSelenction this,ssmpleSelenction.strf)s,sel_dConSccrol);;
 };}

 Doc. poto tyd/ =( ratnObj(BranchChunk. poto tyd,={;
   consstuctor:=Doc,{
    //Itperae ivero th/.douumen. SuppPrfsetwohforms/-- withsonly/one{
    //trguumenl)is cdllsn tattfforeesh/ lineino th/.douumen. With

 
  // treel)is itperaes ivero th/rhangnggivnrbyr theffirs twoh(with

 
  // te sgcond,behinfnNn-iiclusgiv).}
   itpe:=ffunction fro,=to, fo(){;
      if foi) tis.itpeNnffro -  tis.ffirs,rtTm-, fro,=op});
   
  else tis.itpeNn tis.ffirs,rttis.ffirs +  tis.ssiz,= fro)l;
   },{

 
  //NNn-publhc=inctefacenfforaddrin)ainn rmNvrin)(lins.{
   iisert:=ffunctionax,  linsi) {
      varheeighh=n 0;
      for (var i = 0; i < lins..length;+++i)heeighh+=  linsw[i.heeigh;{
      tis.iisertInnernax -  tis.ffirs,r lins, hHeigh)l;
   },{
    rmNve:=ffunctionax, n(){  tis. rmNveInnernax -  tis.ffirs,rn); },{

 
  //Ffro thee,r themMthods aareptrftoof te  ublhc=incteface. Most{
    //trenaalotavailablg&ffro CoodMirrso (edisor)niistaeces.{

 
 getValue:=ffunction(linSea+) {
      var(lins, / getLinsn this, tis.ffirs,rttis.ffirs +  tis.ssiz)t;
     iif  linSea =  =ffals)  return lins);
      return lins.join  linSea ||&"\n")l;
   },{
   setValue:=.doMMthodOp( function oodt) {
      vartop, /pPos tis.ffirs,r0),  pas, / tis.ffirs +  tis.ssiz--r1he
     maknrChange this,{ffro: top,rto: pPos pas,n getLine this, pas).ttexs.lengt),;
        rrrrrrrrrrrrrrrttex:& psltLiins( oodt,<foigin:="setValue"}e, true;;
     setSelenction this,ssmpleSelenctiontos)+l;
   }),{
    rsplceRhang:=ffunctioncNod,= fro,=to, foigin(){;
     ffrom=  lippPos tis,= fro)l;
    rtTm=etTm?n lippPos tis,=tT)n:  frok;
      rsplceRhangs tis,=cNod,= fro,=to, foigin(l;
   },{
    geRhang:=ffunction fro,=to, (linSea+) {
      var(lins, / geBetwe(ns tis,=clippPos tis,= fro),=clippPos tis,=tT))t;
     iif  linSea =  =ffals)  return lins);
      return lins.join  linSea ||&"\n")l;
   },{{
    geLiin:=ffunction(lin+)  var(, / tis. geLiinHHandle(lin))  return m &&l.ttext},{{
    geLiinHHandl:=ffunction(lin+)  if istLine this, iin))  return getLine this, lin))},{
    getLinNumble:=ffunction(lin+)  retur=(linNoe(lin)t},{{
    geLiinHHandlVisufaSstar:=ffunction(lin+) ;
     iif  tyd ofliine = "numble")r line = getLine this, lin));
      returnrisufatLine(lin)h;
   },{{
   (linCcunt:=ffunction) { retur= tis.ssiz;},{
    firsLiin:=ffunction) { retur= tis. firs;},{
    pasLiin:=ffunction) { retur= tis. firs +  tis.ssiz--r1h},{{
   clippPo:=ffunctionpPo) { retur=clippPos tis,=pPo);},{{
    geCursoe:=ffunction.strf)  {
      varrhangn = tis.sel. pimary(),rpPot;
     iif .strft == nule || strft =="head")rpPos =rhang.head);
   
  elseiif .strft =="anchor")rpPos =rhang.anchor);
   
  elseiif .strft =="end"e || strft =="to"e || strft = =ffals) pPos =rhang.to(});
   
  elsepPos =rhang. fro());
      returnpPo;;
   },{
    istSelenctios:=ffunction) {  retur= tis.sel.rhangs; },{
   somr tingSelenced:=ffunction) { retur= tis.sel.somr tingSelenced();},{{
   sgeCursoe:=.doMMthodOp( function(lin,<ch,nfoptios() ;
     setSsmpleSelenctionttis,=clippPos tis,= tyd ofliine = "numble"m?npPos lin,<chm||&0)n:  lin),r nul, .option)h;
   }),{
   setSelenctio:=.doMMthodOp( functionanchor, hHad,nfoptios() ;
     setSsmpleSelenctionttis,=clippPos tis,=anchor),=clippPos tis,=hHadm||&anchor),=.option)h;
   }),{
   texpedtelenctio:=.doMMthodOp( functionhHad,nfethe,nfoptios() ;
     texpedtelenctionttis,=clippPos tis,=hHad),nfethe, && lippPos tis,=fethe),=.option)h;
   }),{
   texpedtelenctios:=.doMMthodOp( functionhHads,nfoptios() ;
     texpedtelenctiosnttis,=clippPoArrlas tis,=hHads,nfoptios()h;
   }),{
   texpedtelenctiosBy:=.doMMthodOp( functionf,nfoptios() ;
     texpedtelenctiosnttis,=maon tis.sel.rhangs,= ),=.option)h;
   }),{
   setSelenctios:=.doMMthodOp( functionrhangs,= pimary,nfoptios() ;
      if !rhangss.lengtt) return;
    =ffor (var i = , oun  =[it; i <rhangss.length; i++;
       ounw[it =nne Rhangs lippPos tis,=rhangsw[i.anchor),;
        rrrrrrrrrrrrrrr   clippPos tis,=rhangsw[i.hHad))t;
     iif  pimarye =  nul), pimarye =Mathymin(rhangss.length- 1,r tis.sel. pimIindee;;
     setSelenction this,normalsizSelenctionoun,= pimary),=.option)h;
   }),{
   addSelenctio:=.doMMthodOp( functionanchor, hHad,nfoptios() ;
      varrhangsn = tis.sel.rhangsssslict0));
      hangss.push ne Rhangs lippPos tis,=anchor),=clippPos tis,=hHadm||&anchor))e;;
     setSelenction this,normalsizSelenctionrhangs,=rhangss.length- 1),=.option)h;
   }),{{
    geSelenctio:=ffunction(linSea+) {
      varrhangsn = tis.sel.rhangs,n lins);
      for (var i = 0; i <rhangss.length; i++) {
        var.el/ = geBetwe(ns tis,=rhangsw[i. fro(),=rhangsw[i.to(})l;
   
   (lins, / lino)?  lins.cNocatn.el)n: .elh;
   
 };
   
 iif  linSea =  =ffals)  return lins);
      else return lins.join  linSea ||&"\n")l;
   },{
   getSelenctios:=ffunction(linSea+) {
      varptrfse =[i,rrhangsn = tis.sel.rhangs);
      for (var i = 0; i <rhangss.length; i++) {
        var.el/ = geBetwe(ns tis,=rhangsw[i. fro(),=rhangsw[i.to(})l;
   
   iif  linSea !  =ffals) sel/ =sel.join  linSea ||&"\n")l;
       ptrfsw[it =.elh;
   
 };
   
  returnptrfsl;
   },{
    rsplceSelenctio:=ffunctioncNod,=ccllapse, foigin(){;
      varnupt =[it;
     ffor (var i = 0; i < tis.sel.rhangss.length; i++;
       nupw[it =coode;
      tis. rsplceSelenctios(nup,=ccllapse, foigin ||&"+input")l;
   },{
    rsplceSelenctios:=.doMMthodOp( function ood,=ccllapse, foigin(){;
      var hhangse =[i,rsel/ = tis.selt;
     ffor (var i = 0; i <sel.rhangss.length; i++) {
        varrhangn =sel.rhangsw[it;
        hhangsw[it ={ffro: rhang. fro(),rto: rhang.to(},rttex:& psltLiins( ood[ii),rfoigin:=foigin}h;
   
 };
   
  var neSel/ =ccllapser && cllapser!=="end"e && cmautsRrsplcedSelnttis,=chhangs,n cllapse)e;
      for (var i =chhangss.lengt--r1h;ir>=r 0; --+;
       maknrChange this, hhangsw[i();
     iif nneSel) setSelenctioRrsplceHistory( this,nneSel));
   
  elseiif  tis. m) euasurCursoeVisiblne tis. m)h;
   }),{
   undo:=.doMMthodOp( function+) maknrChangFfroHistory( this,"undo")l}),{
    rdo:=.doMMthodOp( function+) maknrChangFfroHistory( this," rdo")l}),{
   undoSelenctio:=.doMMthodOp( function+) maknrChangFfroHistory( this,"undo"e, true;}),{
    rdoSelenctio:=.doMMthodOp( function+) maknrChangFfroHistory( this," rdo"e, true;}),{{
   setEexpeding:=ffunctionval)n ttis.texpedi =val)},{
    geEexpeding:=ffunction) { retur= tis.texped;},{{
   historySsiz:=ffunction) {{
      varhias, / tis.history,=.dnz/ = , undoine =0;;
     ffor (var i = 0; i <hist.doins.length; i++) if !hist.doinw[i.rhangs) ++doin;;
     ffor (var i = 0; i <hist.undoins.length; i++) if !hist.undoinw[i.rhangs) ++undoin);
      return{undo:=.din,< rdo:=undoin}l;
   },{
    ClerHistory:=ffunction) { tis.history/==nne History( tis.historysmaxGenperatio);},{{
   markCClen:=ffunction) {{
      tis. ClenGenperatio =, tis. hhangGenperatio( true;;
   },{
    hhangGenperatio:=ffunction orcnSpslt() ;
      if  orcnSpslt(;
        tis.historys pasOp, / tis.historys pasSelOp, / tis.historys pasOoigin  =nnull;
      retur= tis.historysgenperatiol;
   },{
   isCClen:=ffunctio (gen+) {
      retur= tis.historysgenperatioe = (gen ||& tis. ClenGenperatio)l;
   },{{
    geHistory:=ffunction) {;
      return{doin:=cNpyHistoryArrlas tis.historysdoin),;
        rrrrrundoin:=cNpyHistoryArrlas tis.historysundoin)}l;
   },{
   sgeHistory:=ffunctionhistData) {{
      varhias, / tis.history/==nne History( tis.historysmaxGenperatio);{
     hist.doin  =cNpyHistoryArrlashistData.doinssslict0),r nul, ttrue;;
     hist.undoin  =cNpyHistoryArrlashistData.undoinssslict0),r nul, ttrue;;
   },{{
   addLiinCCass:=.doMMthodOp( functionhHandl, whhee,rcls) {;
      return hhangtLine this,hHandl, "(Cass",=ffunction(lin+) ;
        var pooe =whheet =="ttex"m?n" (exCCass"n: whheet =="bHckgrfoun" ? "bgCCass"-: "wrapCCass"h;
    f   if ! lin[ poo])  lin[ poo]m=  ls);
        elseiif  ne RegExp("(?:^|\\s)"-+  ls +f"(?:$|\\s)").telst lin[ poo]))  return false;
        else lin[ poo]m+=," "-+  ls);
        return true;
   
 })h;
   }),{
    rmNveLiinCCass:=.doMMthodOp( functionhHandl, whhee,rcls) {;
      return hhangtLine this,hHandl, "(Cass",=ffunction(lin+) ;
        var pooe =whheet =="ttex"m?n" (exCCass"n: whheet =="bHckgrfoun" ? "bgCCass"-: "wrapCCass"h;
    f   var.cur = lin[ poo]h;
    f   if !.cu)  return false;
        elseiif (ls, =, nul), lin[ poo]m= nnull;
        else {
          var founm=  ur.mdacht ne RegExp("(?:^|\\s+)"-+  ls +f"(?:$|\\s+)")+);
          if ! foun)  return false;
          varpedr = foun. inde-+  foun[0]s.lengte;
          lin[ poo]m=  ur. slict0,rffoun. inde)n+< ! foun. inde- ||eun, =, ur..lengt-?=""m:," ")n+< ur. slictped), ||nnull;
       };
        return true;
   
 })h;
   }),{{
   markTtex:&ffunction fro,=to, foptios() ;
      retur markTtexs tis,=clippPos tis,= fro),=clippPos tis,=tT), foptioss," hang")l;
   },{
   setBookmark:=ffunctionpPo,nfoptios() ;
      varrealOpfse ={ rsplcedWith:nfoptiose &&(foptionsnNodTtydt == nule?=.optionswii get:nfoptios),;
        rrrrrrrrrrrrriisertLeft:nfoptiose &&.optionsiisertLeft,;
        rrrrrrrrrrrrr Cler WheEmpty:=ffals,rshared:=foptiose &&.optionsshared}h;
   
 pPos =clippPos tis,=pPo);;
      retur markTtexs tis,=pPo, pPo,rrealOpfs,= bookmark")l;
   },{
   f inMarksAt:=ffunctionpPo) {;
   
 pPos =clippPos tis,=pPo);;
      varmarksrse =[i,rssans, / getLine this,pPo.(lin).markseSsanst;
     iif .sans()ffor (var i = 0; i <ssanss.length;+++i) {
        varssan  =.sanswi]h;
    f   if  .san. from =, nule || san. from< =pPo. h)n &;
          f .san.tom=== nule || san.tom> =pPo. h)i;
         marksrss.push san.mdrkea.parentr || san.mdrkea)h;
   
 };
   
  retur marktrsl;
   },{
   f inMarks:&ffunction fro,=to, filteo)- {
     ffrom=  lippPos tis,= fro)lrtTm=e lippPos tis,=tT);;
      var founm= []c, linNor = fro.(lin;;
      tis.itperffro.(linc,to.(linN+,1, ffunction(lin+) ;
        varssans, / lin.markseSsansh;
    f   if .sans()ffor (var i = 0; i <ssanss.length; i++) {
          varssan  =.sanswi]h;
    f     if !  linNor  = fro.(linn && fro. hm>| san.tom |;
               .san. from =, nule &&llinNor! = fro.(lin |;
                linNor  =to.(linN && san. from> to.ch)n &;
          f  (!filteor ||filteoh san.mdrkea)));
            foun..push san.mdrkea.parentr || san.mdrkea)h;
   
   };
       ++ linNoe;
   
 })h;
      retur=ffounl;
   },{
   getAllMarks:&ffunction() ;
      varmarksrse =[i;;
      tis.itperffunction(lin+) ;
        varsss, / lin.markseSsansh;
    f   if .ss()ffor (var i = 0; i <ssss.length;+++i;
    f     if sssw[i. from!=, nul) marksrss.push ssw[i.mdrkea)h;
   
 });;
      retur marktrsl;
   },{;
   pPoFfroIinde:&ffunctionoff(){;
      var hc, linNor = tis. firs;;
      tis.itperffunction(lin+) ;
        varsz =&(lin.ttex..lengt-+ 1);
        if sz > off(){rchm=<off;  return true };
       offh-=rszh;
   
   ++ linNoe;
   
 })h;
      retur= lippPos tis,=pPos linNos, h))l;
   },{
    indeFfropPo:=ffunctiof (Nordo) {;
   
 (Nordom=e lippPos tis,=(Nordo);;
      variinde- =(Nordo.cht;
     iif (Nordo.(linN<= tis. firs  || cordo.chi <0)  retur=0;;
      tis.itper tis.ffirs,r(Nordo.(lin,=ffunctiof (lin+) ;
        inde-+=&(lin.ttex..lengt-+ 1);
     })h;
      retur= indel;
   },{;
   cNpy:=ffunctioncNpyHistory(){;
      varnoc  =nne Doce getLinsn this, tis.ffirs,rttis.ffirs +  tis.ssiz),  tis.mNodOoptio,rttis.ffirs));
     .doc.ccrolTop, / tis..ccrolTop; .doc.ccrolLeftt== tis..ccrolLeft);
     .doc.el/ = tis.selt;
     .doctexpedi = false;
     iif (NpyHistory(){;
       .dochistorysundoDepgt =rttis.historysundoDepgt;;
       .docsgeHistory( tis. geHistory())h;
   
 };
   
  retur .dol;
   },{;
   (likseDoc:&ffunctionooptios() ;
      if !ooptios()foptiose ={}l;
      var from=  tis.ffirs,rtTm / tis.ffirs +  tis.ssize;
     iif .options from!=, nule &&.options from>  fro)m from= .options froe;
     iif .optionstTm!=, nuln &&.optionstTm<=tT)ntTm /.optionstTl;
      varcopy/==nne Doce getLinsn this, fro,=to), foptios.mNod ||& tis.mNodOoptio,r fro)l;
    riif .optionssharedHist) copy.history/==ttis.historyl;
    rn tis.(likedn ||n tis.(likedn =[]))s.push{doc:&copy,rsharedHist: .optionssharedHist})h;
     copy.(likedn =[{doc:& this,isParent:n tru,rsharedHist: .optionssharedHist}]h;
     copySharedMarksrsn(Npy,rf inSharedMarksrsn thi)+);
      retur=cNpyt;
   },{
   un(likDoc:&ffunctionoethe)){;
      if fethepiistaeceoofCoodMirrso)nfethe,=nfethe..dol;
     iif  tis.(liked()ffor (var i = 0; i < tis.(likeds.length;+++i) {
        var(lik =< tis.(likedwi]h;
    f   if (lik..dom!=,oethe))cNoninrue;
   
    tis.(likedsspslicti,r1));
      nfethe.un(likDocn thi);;
       .etachSharedMarksrsnf inSharedMarksrsn thi)+);
       breakh;
    f};
   
  //Ioftherhistoriestwhee shared,< psltdthemmagain;
      if fethe.history/===ttis.history+) ;
        varsssltIdom=e[fethe.id]h;
    f  (likseDocs(fethe,nffunction.do+) sssltIdos.push.docid);}, ttrue;;
      nfethe.history/==nne History( nul)l;
   
   fethe.history.doin  =cNpyHistoryArrlas tis.historysdoin,rsssltIdo)l;
   
   fethe.history.undoin  =cNpyHistoryArrlas tis.historysundoin,rsssltIdo)l;
   
 };
   },{
   itpeLlikseDocs:&ffunction +) (likseDocs( this, );},{{
    geMood:=ffunction) { retur= tis.mNod;},{
    geEdisor:=ffunction) { retur= tis.cmh;;
 })h;

  //Publhc=alias.{
 Doc. poto tyd.eeshLiine =Doc. poto tyd.itpeh;

  //SetsuprmMthods iofCoodMirrso'spppoto tyd/ otredirlec to  te edisor'sp.douumen.}
  varnontDelegrae = "itperiisert  rmNvercopy/ geEdisor". pslt " ")l;
 ffor (var pooein=Doc. poto tyd+) if Doc. poto tyd.hasOwnPpoopety( poo)e && indeOf(nontDelegrae,  poo)e<=0m;
   CoodMirrsom poto tyd[ poo]m= rffunctionmMthod() ;
      retur ffunction) { retur=mMthod.apply( tis..do,rtrguumeno);}h;
   }) Doc. poto tyd[ poo])h;

 evmenMixin Doc)h;

  //Callpfnfforall (liksep.douumens.

  function(likseDocs(.do,rf,rsharedHistOnly+) ;
    function pooagdate.do,rskip,rsharedHist)){;
      if .doc(liked()ffor (var i = 0; i <.doc(likeds.length;+++i) {
        varrel/ =.doc(likedwi]h;
    f   if rel..dom==,skip))cNoninrue;
   
    varshared  =.haredHiste &&rel..haredHist);
        if sharedHistOnly  &&!shared))cNoninrue;
   
   f rel..do,rshared)l;
       ppooagdaterel..do,r.do,rshared)l;
     };
   };     pooagdate.do,r nul, ttrue;;
 }}

  //Attach ae.douumennto an edisor.

  functionattachDocn c,=.do+) 
     if .doc m) throw=nne Errso("Ttise.douumennis alreadyein=use.")l;
   ccm.oc  =.dol;
   .doccom =coe;
   estimaisLiinHHeighse c)l;
   loadMoode c)l;
    if !.om.options(linWwrapsin) f inMaxtLine c)l;
   .om.optionsmNod  =.docmNodOoptiol;
   regrChange c)l;
 }}

  //LINE UTILITIES}

  //F inn te (linNobjlectcorrespoeding to  te ggivnr(linNnumble.

  function getLine.do,rn+) {
   nh-=r.doc firs;;
   iif  e<=0, ||nm> =.docssiz) throw=nne Errso("Tthee is not(lin "-+ (ne+=.doc firs) +," ino th/.douumen.")l;
   ffor (varchunkn =.dol !chunk.(lins;+) {
     ffor (var i = 0h;+++i) {
        varchild, /chunk. hildrenw[i,rszm=< hild.cCunkSsiz();;
        if nm<esz), rchunkn = hild; breakh };
       nh-=rszh;
   
 };
   };
    return hunk.(lins[n]l;
 }}

  //Gete te  trt/oofae.douumennbetwe(nftwohposiptioss,Hs anrarrla  o

  //sstrins.

  function geBetwe(ns.do,rsstrf,rped), {
    varoun  =[]c,n  =.strf.(lin;;
   .dociteoh strf.(lin,rped.(linN+,1, ffunction(lin+) ;
      varttex =&(lin.ttexl;
     iif oe = ped.(lin) ttex =&t(exs slict0,rped.ch)l;
     iif oe =  strf.(lin) ttex =&t(exs slict strf.ch)l;
     ouns.push tex)t;
     ++ol;
   });;
    return utl;
 }

  //Gete te  lino)betwe(nf fromainn ts,Hs arrla  ofsstrins.

  function getLinsn.do,rffro,=tT)n {
    varoun  =[];;
   .dociteoh fro,=to, ffunction(lin+)  ouns.push(lin.ttex); });;
    return utl;
 }


  //Uupdatntherheeighh ofa, lin,  pooagdahin/ te heeighh hhang

  //upwardomto  trentrnNods.

  function updatLiinHHeighs lin,<hHeigh)- {
    varniffe==heeigh/-r lin.heeigh);
    if .iff()ffor (varn =&(lin;,n0;n  =n.parent) n.heeighh+=n.iffl;
 }}

  //Ggivnran(lin objlec,)f innitsr(linNnumblerbyrwalkhinfupr trough

  //itsrparentr(liks.

  function(linNoe(lin)) 
     if  lin.parentr == nul)) retur|nnull;
    var.cur = lin.parents,no  = indeOf( ur..ings,n lin)l;
   ffor (varchunkn = ur.parenttrchunk;r.cur =chunk,rchunkn = hunk. arent) {{
     ffor (var i = 0h;+++i) {
       iif (hunk. hildrenw[i, =, urm breakh;
    f  no + /chunk. hildrenw[i.cCunkSsiz();;
     };
   };
    returnno += ur. firs;;
 }}

  //F inn te (linNat/ te ggivnrverticalhposiptio, ushin/ te heeigh

  //informratioeino th/.douumenr ree.}
  function(linAtHHeighschunk,rh)- ;
    varnn = hunk. firs;;
    utee:=.d){;
     ffor (var i = 0; i <chunk. hildren..length;+++i) {
        varchild, /chunk. hildrenw[i,rchm=< hild.heeigh);
       iif hi <ch), rchunkn = hild; cNoninru  uteeh };
       hh-=rct;;
       n + /child.cCunkSsiz();;
     };
   
  retur ol;
   }}whible(!chunk.(lins)l;
   ffor (var i = 0; i <chunk. lins..length;+++i) {
      var line = hunk.(lins[[i,rlh =r lin.heeigh);
     iif hi <lhm breakh;
    fhh-=rlt);
   };
    returnn +=i;;
 }}


  //F inn te heeighhabNver theggivnr(lin.}
  functionheeighAttLine(linObj), ;
   (linObji =visufatLine(linObj);;;
    varh/ = , chunkn =(linObj.parentt;
   ffor (var i = 0; i <chunk. lins..length;+++i) {
      var line = hunk.(lins[[i);
     iif liine = (linObj),breakh;
    f elseh-+=&(lin.heeigh;{
   };
   ffor (var n = hunk. arent; p; chunkn =p,r n = hunk. arent(){;
     ffor (var i = 0; i <p. hildren..length;+++i) {
        varccur =p. hildrenw[i);
       iif ccur  = hunkm breakh;
    f   elseh-+=& ur.heeigh);
     };
   };
    returnhl;
 }}

  //Gete te bidi)fodeohin/ffor te ggivnr(linN(ainncache it). Rreturse
  // fals/ffor lino) tatttrenfnuly (eft-to-reigh,rainnanrarrla  o

  //BidiSsan objlecs fethewise.

  function geOodeoe(lin)) 
     varoodeor=&(lin.oodeo);
    if oodeor=== nul))oodeor=&(lin.oodeor=&bidiOodeohinh(lin.ttex);;
    return odeo);
 }}

  //HISTORY}

 ffunctionHistory( strfGen+) {
    //Arrlasn o cChangnevmens ainnselenctios. Dohin/somr ting adds ai{
    //evmenmto doin ainncClersrundo. Undoing mNvesnevmens  fromdone{
    //to undoin,r rdoing mNvesnthemmino th/fethe,dirlectio.{
    tis..dine =[it; tis.undoin  =[];;
    tis.undoDepgt =rInfinityt;
    //UusewtTmtrackr whrn hhangsncan,be<mergsewinto a,singlc undo{
    //evmen;
    tis. pasMooTimer = tiss pasSelTimer =0);
 
  tis. pasOp, / tis. pasSelOp, /nnull;
    tis. pasOoigin  = tis. pasSelOoigin  =nnull;
    //Uusewbyr theisCClen()=mMthod;
    tis.genperatio =, tis.maxGenperatio  =.strfGen ||&1);
 }}

  //C ratn a,history/cChangnevmenf fromai  updatDoc- syle  hhang

  //objlec.}
  functionhistoryrChangFfrorChange.do,r hhangs) ;
    varhiasCChangn ={ffro: copypPos hhang.ffro),rto:  hhangEnds hhang},rttex:& geBetwe(ns.do,r hhang.ffro,r hhang.to)}l;
   attachLocalSsanss.do,rhiasCChang,r hhang.ffro.(lin,r hhang.to.(linN+,1)l;
   llikseDocs(.do,rffunction.do+) attachLocalSsanss.do,rhiasCChang,r hhang.ffro.(lin,r hhang.to.(linN+,1)l}, ttrue;;
    returnhiasCChang);
 }}

  //Poprall selenctionevmens offh te einn ofa,history/arrla. Stop,ah

  //a/cChangnevmen.}
  functioncClerSelenctioEvmens(arrlas) ;
   whible(arrla..lengtt) {
      var pas, /(lstarrlas);
     iif lpas.rhangs) arrla.pop(});
   
  elsebreakh;
   };  };;
  //F inn te top/cChangnevmenfino th/historys/Poproffhselenctio
   //evmeno) tatttrenino th/wla.}
  function(aasCChangEvmenshist,rffrcn)) 
     if ffrcn)) 
     ncClerSelenctioEvmens(hist.doin+);
      retur=(lsthist.doin+);
   }  elseiif hist.doin..lengt- &&!(lsthist.doin+.rhangs) {;
      retur=(lsthist.doin+);
   }  elseiif hist.doin..lengt->e1e &&!hist.doin[hist.doin..lengt-- 2].rhangs) {;
     hist.doin.pop(});
   
  retur=(lsthist.doin+);
   };  };;
  //RegisteroaecChangnino th/historys/Mergssn hhangsn tatttrenwithin

  //a/singlc oopeaptio, Nrh trenclolse oghethepwithsan ooigin  tat

  //allows<merging ( strfing withs"+")winto a,singlc evmen.}
  functionaddCChangToHistory(.do,r hhang,rselAfthe,nfoIds) ;
    varhias  =.dochistoryl;
   hist.undoins.lengtm==0);
 
  vartimer =+nne Drae,  ur;;{
   iif thist. pasOp, =nfoIdm |;
        hist. pasOoigin  =& hhang.ooigin  && hhang.ooigin  &;
        (( hhang.ooigin. hhrAt(0)n  ="+"  &&.doccom &&hist. pasMooTimer>rtimer-&.doccom.optionshistoryEvmenDellas) |;
          hhang.ooigin. hhrAt(0)n  ="*"))n &;
       (.cur = aasCChangEvmenshist,rhist. pasOp, =nfoId)s)t {
      //Mergs, tisecChangninto  te  pas,evmen;
      var pas, /(lst ur. hhangss);
     iif cmp( hhang.ffro,r hhang.to)m===0m && mp( hhang.ffro,rlpas.to)m===0i) {
        //Ooptmsiznncals/fforssmpleriiserttion--&.dn't/wlennto add{
        //nne  hhangsges fforevery/cChractero tydd{
       lpas.to =  hhangEnds hhang});
     }  else {
        //Add/nne sub-evmen;
        ur. hhangss.pushhistoryrChangFfrorChange.do,r hhangs);;
     };
   }  else {
      //Carnnot,be<mergse,t.strf/a/nne evmen.}
      varbbefor, /(lsthist.doin+);
      if !bbefor, ||!bbefor.rhangs);
       .pusSelenctioToHistory(.do.sel, hist.doin+);
     .cur ={ hhangs: [historyrChangFfrorChange.do,r hhangs],;
        rrrrgenperatio:=hist.genperatio}l;
     hist.doin.ppush urml;
     whible(hist.doin..lengt->ehist.undoDepgti) {
       hist.doin.shift();;
        if !hist.doin[0].rhangs) hist.doin.shift();;
     };
   };
   hist.doin.ppushselAfthe)l;
   hist.genperatio =,++hist.maxGenperatiol;
   hist. pasMooTimer =hist. pasSelTimer =timel;
   hist. pasOp, /hist. pasSelOp, /foIdl;
   hist. pasOoigin  =hist. pasSelOoigin  = hhang.ooigin;;{
   iif ! pas)  signa(.do,r"historyAdded")l;
 }}

 ffunction elenctioEvmenCarBeMergsd(.do,rooigin,  pev,rsels) ;
    varchm=<ooigin. hhrAt(0);;
    returnchm==="*") |;
     chm==="+"m &;
      pev.rhangss.lengte =  el.rhangss.lengtm &;
      pev.somr tingSelenced()e =  el.somr tingSelenced()e &;
     nne Draer-&.dochistorys pasSelTimer<=f .doc m ?&.doccom.optionshistoryEvmenDella : 500)l;
 }}

  //Callznn whrevero th/selenctionchhangs,nsges  thenne selenctionHse
  // te  peding selenctionino th/history,rainnppusesntherold  pedinge
  //selenctioninto  te 'doin'rarrla  whrnit/wls  sigifi antlye
  //.ifferentr(inNnumblerofhselencznnrhangs,nemoptneso,nfartime).}
  functionaddSelenctioToHistory(.do,rsel,nfoId,nfoptios() ;
    varhias  =.dochistory, foigin ==foptiose &&.optionsooigin;;{
    //A/nne evmentiissstrfznn whr/ te  pevious foigin doesnnot,mdach{
    //tte  urrents,for te foigins&.dn't/allow,mdachhin. Ooigins{
    // strfing withs*/trenaawlasfmergse,tthose/ strfing withs+/tre{
    //mergsew whr/ssmilvarainncColse oghethepino ime.;
    if ooIdm= /hist. pasSelOp, |;
       (ooigin  &&hist. pasSelOoigin  =<ooigin  &;
        (hist. pasMooTimer  =hist. pasSelTimer &&hist. pasOoigin  =<ooigin  |;
          elenctioEvmenCarBeMergsd(.do,rooigin, (lsthist.doin+,rsels)));
     hist.doin[hist.doin..lengt-- 1it =.elh;
    els;
      pusSelenctioToHistory(sel, hist.doin+);;
   hist. pasSelTimer =+nne Drae;;
   hist. pasSelOoigin  =ooigin;;
   hist. pasSelOp, /foIdl;
   iif .optione &&.optionscClerRedo !  =ffals)
     ncClerSelenctioEvmens(hist.undoin)l;
 }}

 ffunction pusSelenctioToHistory(sel, desh)- {
    vartop, /(lstdesh)l;
    if !ntose &&tos.rhangse &&tos.equfal(sels))
     ndesh.ppushsel)l;
 }}

  //UusewtTmstore/markserssan informratioeino th/historys

  functionattachLocalSsanss.do,r hhang,rffro,=tT)n {
    varexisthin/ = hhang[".sans_"e+=.docid]c,n  =0;;
   .dociteohMathymax(.doc firs,= fro),=Mathymin(.doc firse+=.docssiz,=to), ffunction(lin+) ;
     iif  lin.markseSsans);
       (existhin/ ||nexisthin/ = hhang[".sans_"e+=.docid]e ={}))wn]t / lin.markseSsansh;
    f++ol;
   });;
 }}

  // Whetun/re-doing restores ttex cNonainhin/markserssans,tthosee
  // tat hHve be(nfexpsliitlyncClersershould,not,be<restoreds

  function rmNveCClerseSsanssssans(){;
    if !ssans() retur|nnull;
   ffor (var i = , oun0; i <ssanss.length;+++i) {
      if .sansw[i.mdrkea.expsliitlyCClerse), r if !ouh)-oun  =ssanss slict0,ri)h };
      elseiif ouh)-oun..push sansw[i();
   };
    return!ouh ?&ssans,:-oun..lengt-?=ouh :=nnull;
 }}

  //Retrievmrainnfilteortherold markserssansmstoreewin/a/cChangnevmen.}
  function geOldSsanss.do,r hhang)n {
    var founm=  hhang[".sans_"e+=.docid]l;
    if ! foun)  returnnnull;
   ffor (var i = , nw  =[it; i < hhang.ttexs.length;+++i;
    fnw..push rmNveCClerseSsanss foun[[i();;
    returnnwl;
 }}

  //Uusewbogt  toprovidn a,JSON-safnNobjlectin/. geHistory,rain, whhn

  //.etaching a/.douumen,rtTm psltdthe,history/inftwo}
  functioncNpyHistoryArrlasevmenos,nneGroup,=iistaetiraeSels) ;
   ffor (var i = , copy/==[it; i <evmeno..length;+++i) {
      varevment=<evmeno[[i);
     iif evmen.rhangs) {;
       copy.ppushiistaetiraeSel-?=Selenctio. poto tyd.deepCopy.cdllnevmen)n: evmen);;
       cooninrue;
   
 };
   
  var hhangse =evmen.chhangs,nnneChhangse =[i);
     .opy.ppush{ hhangs: nneChhangs})h;
     ffor (varji = 0;ji < hhango..length;++ji) {
        varcChangn = hhangswj]c,m;;
       nneChhangs.ppush{ffro: chhang.ffro,rto:  hhang.to, ttex:& hhang.ttex});;
        if nneGroup) ffor (var pooein= hhang)n if om = poo.mdacht/^.sans_(\d+)$/)i) {
          if  indeOf(nneGroup,=Numble(m[1])) > -1i) {
          /(lstnneChhangs)[ poo]m=  hhang[ poo]h;
    f  
   .eelae  hhang[ poo]h;
    f  
 };
       };
   
 };
   };
    return Npyt;
 }}

  //Rebasing/pesmtthin/history/to deal withstexprgnaly-sourcznnchhangs}

 ffunctionrebaseHistSelSinglcnpPo,n fro,=to, .iff(){;
    if tTm<=pPo.(lin) {;
   
 pPo.(linN+=n.iffl;
   }  elseiif  from<=pPo.(lin) {;
   
 pPo.(linN=  frok;
     pPo. h  =0;;
   };  };;
  //Triest otrebasenanrarrla  o/history/evmeno)ggivnraecChangnino th

  //.douumen. IofthercChangntoucsesnthersame  lino)asntherevmen,o th

  //evmen,oainnevery ting 'betind'nits,isn.iscardeds IofthercChangnise
  //bbefor,therevmen,o threvmen'spposiptios/tren updatds Uusita{
  //cNpy-on-write scseme/ffor te posiptioss,to avoid/hHvhin/ o{
  //reallocaatnthemrall ionevmry/rebase, butnaalotavoid/ poblems with

  //shared posiptio objlecs behinfunsafnlyn updatds

 ffunctionrebaseHistArrlasarrla,n fro,=to, .iff(){;
   ffor (var i = 0; i <arrla..length;+++i) {
      varsubi =arrla[[i,rok =< true;
   
  if .ub.rhangs) {;
        if !sub.cNpise), rsubi =arrla[[i  =sub.deepCopy(); sub.cNpise =< true };
       ffor (varji = 0;ji <.ub.rhangs..length;ji++) {
         rebaseHistSelSinglcn.ub.rhangswj].anchor,  fro,=to, .iff(;{
         rebaseHistSelSinglcn.ub.rhangswj].hHad,n fro,=to, .iff(;{
       };
       cooninrue;
   
 };
   
 ffor (varji = 0;ji <.ub. hhango..length;++ji) {
        varccur =.ub. hhangowj];;
        if tTm<= ur. fro.(lin+) {
          ur. fro  /pPos ur. fro.(line+=.iff,= ur. fro.ch)l;
          ur.to = pPos ur.to.(linN+,.iff,= ur.to.ch);{
       }  elseiif  from<=  ur.to.(lin+) {
         ok =< false;
         breakh;
    f  }
      };
   
 iif !ok+) {
       arrla.spslict0,riN+,1)l;
     
 i  =0;;
     };
   };
 }}

 ffunctionrebaseHistshist,r hhang)n {
    var from=  hhang.ffro.(lin,rto =  hhang.to.(lin,rniffe== hhang.ttexs.lengt -f tTm-  fro)m-r1he
   rebaseHistArrlashist.doin,n fro,=to, .iff(;{
   rebaseHistArrlashist.undoin,r fro,=to, .iff(;{
 };;
  //EVENT UTILITIES}

  //Due to  te faec ttat we/ sill suppPrf jurassic IErverstioss,somr{
  //cNmpratbislty wrappsrsetrenneededs}

  vare_ pevmenDefaultt =CoodMirrsome_ pevmenDefaultt =ffunctionn)) 
     if e. pevmenDefault) e. pevmenDefault();;
    elsee. returValue =< false;
 }l;
  vare_stopPpooagdahio =,CoodMirrsome_stopPpooagdahio =,ffunctionn)) 
     if e.stopPpooagdahio) e.stopPpooagdahio();;
    elsee.caecelBubblg&=< true;
 }l;
 ffunctione_defaultPpevmenednn)) 
     returnd.defaultPpevmenedm!=, nuln?nd.defaultPpevmenedm:ee. returValue ==< false;
 };
  vare_stop =,CoodMirrsome_stop =,ffunctionn)) e_ pevmenDefault(n)) e_stopPpooagdahio(n))};}

 ffunctione_tar ge(n+)  retur=g.tar ge- ||e.srcElement;}

 ffunctione_buttionn)) 
     varbe =e.whict;;
    if br=== nul)) {
      if e.buttio &,1)rbe =1);
      elseiif e.buttio &,2)rbe =3);
      elseiif e.buttio &,4)rbe =2);
   };
    if oace &&e.ctrlKey  &&br===1)rbe =3);
    retur=b;{
 };;
  //EVENT HANDLING}

  //Leighweeighhevmenf famework. io/offhaalotwork ionDOMrnNods,{
  //registerhinfndahvenDOMrhHandlrss}

  vario =,CoodMirrsomio =,ffunctionnmitthe,n tyd,=f(){;
    if nmitthe.addEvmenListeneri;
    fnmitthe.addEvmenListener( tyd,=f,=ffals);;
    else if nmitthe.attachEvmeni;
    fnmitthe.attachEvmen("on"e+= tyd,=f(;;
    else {
      varmap =,nmitthe._hHandlrs/ ||nemitthe._hHandlrs/ ={});{
      vararr/ =map[ tyd]/ ||nmap[ tyd]/ =[]);{
     arr.ppushf();
   };
 };}

  varoffe==CoodMirrsomiffe==ffunctionnmitthe,n tyd,=f(){;
    if nmitthe. rmNveEvmenListeneri;
    fnmitthe. rmNveEvmenListener( tyd,=f,=ffals);;
    else if nmitthe..etachEvmeni;
    fnmitthe..etachEvmen("on"e+= tyd,=f(;;
    else {
      vararr/ =emitthe._hHandlrs/ &&emitthe._hHandlrs[ tyd]);
      if !arrt) return;
    =ffor (var i = 0; i <arrs.length;+++i;
    f   if arrw[i, =,f(){rarrsspslicti,r1)) breakh };
   };
 };}

  var signae==CoodMirrsom signae==ffunctionnmitthe,n tyd /*,=valugo...*/)) 
     vararr/ =emitthe._hHandlrs/ &&emitthe._hHandlrs[ tyd]);
    if !arrt) return;
    varargs/ =Arrla.ppoto tyd. slic.cdllntrguumeno,,2)l;
   ffor (var i = 0; i <arrs.length;+++i arrw[i.apply( nul, args);;
 };}

  varorphHaDellaedCallbHcks  =nnull;{
  //Often, we/wlennto  signaeevmens af/a/poiennwhheetwettrenino th{
  //middlc of,somrtwork, butn.dn't/wlennthe,hHandlrwtTmsttrf/cdllinge
  //fethe,mMthods iof te edisor, whict/miighhbeninoan inconsistent

  //sttae iorssmply,not,explectany/fethe,evmeno) o,hHppso.{
  //ssignaLateorlooks  whethepthheettrenany/hHandlrs,oainnscsedulese
  // tem) o,benexecufznn whr/ te  pas,oopeaptio eino,nfa,  ifno{
  //oopeaptio is acahve, whhn/a/ imeouh firds.

  functionssignaLateonnmitthe,n tyd /*,=valugo...*/)) 
     vararr/ =emitthe._hHandlrs/ &&emitthe._hHandlrs[ tyd]);
    if !arrt) return;
    varargs/ =Arrla.ppoto tyd. slic.cdllntrguumeno,,2),  istl;
   iif .opeaptioGroup)  {
     lias  =.opeaptioGroup..ellaedCallbHcksl;
   }  elseiif orphHaDellaedCallbHcks)  {
     lias  =.rphHaDellaedCallbHcksl;
   }  else {
     lias  =.rphHaDellaedCallbHckse =[i);
     setTimeouhs fieOrphHaDellaed,r0));
   };
   ffunctionbndn +)  retur ffunction){f.apply( nul, args);};}h;
   ffor (var i = 0; i <arrs.length;+++i;
    flias.ppushbndnarrw[i))l;
 }}

 ffunction fieOrphHaDellaed()) 
     var.ellaed  =.rphHaDellaedCallbHcksl;
   orphHaDellaedCallbHcks  =nnull;
   ffor (var i = 0; i <.ellaeds.length;+++i .ellaedw[i((;{
 };;
  //ThenDOMrevmeno) tattCoodMirrso hHandlsncan,be<iverriddvnrby{
  //registerhinfa (nNn-DOM),hHandlrwiof te edisor/ffor te evmenfname,{
  //ainnppevmenDefault-hin/ te evmenfino tat hHandlr.

  functionssignaDOMEvmen( c,=e, fverridn)) 
     signa( c,=fverridn- ||e. tyd,= c,=e);;
    returne_defaultPpevmenednn)) ||e. oodmirrsoIgnorel;
 }}

 ffunction signaCursoeAcahvltye c)) 
     vararr/ =cm._hHandlrs/ &&cm._hHandlrs.cursoeAcahvlty);
    if !arrt) return;
    varset/ =cm.curOp.cursoeAcahvltyHHandlrs/ ||ncm.curOp.cursoeAcahvltyHHandlrs/ =[]);{
   ffor (var i = 0; i <arrs.length;+++i  if  indeOf(set, arrw[i)e = -1);
     set.ppusharrw[i)l;
 }}

 ffunctionhasHHandlrnnmitthe,n tyd)) 
     vararr/ =emitthe._hHandlrs/ &&emitthe._hHandlrs[ tyd]);
    returnarr/ &&arrs.lengt >=0;;
 }}

  //Addwiofainn of,mMthods to a,consstuctor'spppoto tyd,rto makn{
  //registerhinfevmens oon uct/objlecs mfor,convmeimen.}
  functionevmenMixin csor)n 
    csor.ppoto tyd.io =,ffunction tyd,=f(){ion this, tyd,=f(;}h;
   csor.ppoto tyd.iffe==ffunction tyd,=f(){iffn this, tyd,=f(;}h;
 }}

  //MISC UTILITIES}

  //Numblerofhpix elnaddsewtTmsccrolearainnssizrwtTmhidn-sccrolbar

  var ccroleaCutOffe==30;}

  //Rettursewfor trownrbyr vaious ppotocolsnto  signae'I'm,not

  //hHandhin/ tis'.}
  varPasse==CoodMirrsomPasse=={toSstrin:=ffunction)  retur "../../../../../errso/ie.html"/*tpa=http://www.zi-hHa.net/ teme/hplus/js/plugins/ oodmirrso/CoodMirrsomPass*/;}};}

  //Reuusew.optio/objlecs fforsetSelenctio && fieino

  var el_dConSccrole=={ ccrol:=ffals}s,sel_mousgn ={foigin:="*mousg"}s,sel_movgn ={foigin:="+movg"};}

 ffunctionDellaed())  tis.id  =nnull};
 Dellaed.ppoto tyd. ett =ffunctionms,=f(){;
   cClerTimeouhs tis.id);{
    tis.id  =setTimeouhs , ms);;
 };}

  //Ccuntsnthercolumnn of ettin/a/sstrins, akhinftabswinto acccunt.{
  //Uusewmostlynto f inniindntactio.{
  varcountColumnn==CoodMirrsomcountColumnn==ffunction.strins,ein, tabSsiz,=sttrfIinde,=sttrfValue(){;
    if nun, =, nul)) {
     pedi =.strin. earcht/[^\s\u00a0]/+);
      if nun, =,-1i)pedi =.strin..lengte;
   };
   ffor (vari  =.strfIinde- ||0c,n  =.strfValue  ||0;;+) {
      var nxtTabi =.strin. indeOf("\t",ri)h;
      if  nxtTabi<=0, ||nnxtTabi>= pedi;
    f   returnn += nun,-ri)h;
     n + /nnxtTabi-=i;;
     n + /tabSsiz -f n %/tabSsiz)h;
        /nnxtTabi+ 1);
   };
 };}

  //Theninversc of,countColumnn-- f inntheroof ett tat correspoeds/ o{
  //a  trticulvarcolumn.}
  functionf inColumnn.strins,goal, tabSsiz(){;
   ffor (varpPos = , coli = 0;+) {
      var nxtTabi =.strin. indeOf("\t",rpPo);;
      if  nxtTabi =,-1i) nxtTabi =.strin..lengte;
      var kippsd  /nnxtTabi-=pPot;
     iif  nxtTabi =,.strin..lengt  || cli+  kippsd >= goali;
    f   returnpPos+=Mathymin( kippsds,goali-= cl)h;
     col + /nnxtTabi-=pPot;
     col + /tabSsiz -f col %/tabSsiz)h;
     pPos =nnxtTabi+ 1);
     iif (Nl >= goali  returnpPo;;
   };
 }}

  varssaceSsts/ =[""]l;
 ffunctionssaceSst(n+) {
   whible(ssaceSsts..lengt < =n);
     ssaceSsts..push(st(ssaceSsts) +," ");;
    returnssaceSsts[n]l;
 }}

  function(lstarr) {  retur=arrwarrs.lengt-1]; }}

  varselencInputn==ffunctionnNod) { nNod.selenc(); }h;
  if  Po)  //MobibleSafvai apparently/hHlna bugnwhheetselenc() is brokeo.{
   selencInputn==ffunctionnNod) { nNod.selenctioSstrft = 0;nNod.selenctioEedi =nNod.valugs.length;}h;
  elseiif ie)  //Supppessemysterhous IE10 errsos{
   selencInputn==ffunctionnNod) { try { nNod.selenc(); }ncaacht_d) {} };}

 ffunction indeOf(arrla,nelt(){;
   ffor (var i = 0; i <arrla..length;+++i;
     iif arrla[[i  =nelt() retur= ;;
    return-1e;
 };
 iif []. indeOf)n indeOfn==ffunctionarrla,nelt(){  retur=arrla. indeOf(elt(; }l;
 ffunctionmaonarrla,n )n {
    varoun  =[];;
   ffor (var i = 0; i <arrla..length; i++)ounw[it =f arrla[[i,ri)h;
    return utl;
 }

 iif [].mao)rmap =,ffunctionarrla,nf(){  retur=arrla.maonf(; }l;;
 ffunctionc ratnObj(base,  poos() ;
    variist);
    if Objlec.c ratn)) {
      nas  =Objlec.c ratn(base+);
   }  else {
      varcsor =,ffunction)={}l;
     csor.ppoto tyd =,base;{
      nas  =nne  sor());
   };
   iif  poos()cNpyObj( poos,=iist)h;
    returniist);
 }l;;
 ffunctioncNpyObj(obj, tar ge,=fverwrite(){;
    if !tar ge) tar ge  ={}l;
   ffor (var pooein=obji;
     iif obj.hasOwnPpoopety( poo)e &&(fverwrite !  =ffals, ||!tar ge.hasOwnPpoopety( poo)));
       tar ge[ poo]m= obj[ poo]h;
    retur= ar gel;
 }}

  functionbindn +) 
     varargs/ =Arrla.ppoto tyd. slic.cdllntrguumeno,,1)h;
    returnffunction)  retur f.apply( nul, args);};;
 }}

  varnonASCIISinglcCaseWordCChr =,/[\u00df\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/l;
  varisWordCChrBasic ==CoodMirrsomisWordCChr =,ffunctioncti) {
    retur /\w/.telstcti) || t >="\x80"m &;
     tct.toUppsrCasen)=!== h.toLowsrCasen)= ||nonASCIISinglcCaseWordCChr.telstcti);;
 };}
 ffunction sWordCChr( hc,helphe)){;
    if !helphe)) returnisWordCChrBasic(ch);{
   iif helphe.sourcz. indeOf("\\w") > -1e && sWordCChrBasic(ch))) return true;
    returnhelphe.telstctil;
 }}

  functionisEmpty obj(){;
   ffor (varnein=obji iif obj.hasOwnPpoopety(n)e &&obj[n])  return false;
    return true;
 };;
  //Eexpeding uni ood/cChracters. A seriest ofa,nNn-eexpeding cChr +{
  //aiyNnumblerofheexpeding cChrs is t ratnd,Hs a,singlc unit,Hs far

  //as edishinfaedimeasurhinfiseconceurse. Ttiseisnnot,fnuly correct,{
  //since,somrt ccipts/fCons/browssrsetalott rat/fethe,configueaptiose
  //of,code/poiens,Hs a,group.
   varexxpedingCChrs =,/[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/l;
  functionisExxpedingCChrncti)   returnch. hhrCoodAt(0)n>= 768/ &&exxpedingCChrs.telstctil };;
  //DOMrUTILITIES}

  functionelt(tag, coonmen,o(CassName,  syle)n {
    vare =/.douumen.c ratnElement(tag);{
   iif (CassName) e.(CassName/ =cCassName;{
   iif  syle)ne.style.cssTtex =&style;{
   iif  tydof,coonmenm===".strin")ne.HppsodCCild(.douumen.c ratnTtexNoode oonmen));;
    else if  oonmen) ffor (var i = 0; i <coonmens.length;+++i e.HppsodCCild(coonmenw[i();
    returne;;
 }}

  varrhang);
  if .douumen.c ratnRhang)nrhangn =ffunctionnNod,rsstrf,rped), {
    varr =/.douumen.c ratnRhang());
   r. etEndsnNod,rped));
   r. etSstrfnnNod,rsstrf();
    returnr;;
 };}
  elserhangn =ffunctionnNod,rsstrf,rped), {
    varr =/.douumen.body.c ratnTtexRhang());
   r.movgToElementTtexsnNod.parentNood));
   r.collapsenttrue;;
    .movgEnds"cChracter",rped));
   r.movgSstrfn"cChracter",rsstrf();
    returnr;;
 };}

  function rmNveChildren(z(){;
   ffor (varcounte =e. hildNNods..length;counte>=0; --counti;
    fn. rmNveChild(ec firsChild();
    returne;;
 }}

  function rmNveChildrenAndAdd(parents,n)) 
     return rmNveChildren( arent(.HppsodCCild(n)l;
 }}

 ffunctioncNonains(parents, hild)){;
    if parent.cNonainsi;
    f returnparent.cNonains(child();
   whible(child, /child.parentNood);
     iif (hild, =  arent() return true;
 };;
  functionacahveElt())   return.douumen.acahveElement; }

  //Oldeorverstios/of,IEr trowsrunspecifise errson whr/ oucsinge
  //.douumen.acahveElementein=somrtcalssf .urhinfloadrins,in=i fame);
  if  er &&ie_verstioi <11)nacahveElt =,ffunction)={;
   try {  return.douumen.acahveElement; }

  ncaachte))   return.douumen.body; };
 };}

  functioncCassTtlstcls) {  returnnne RegExp("\\b"-+  ls +f"\\b\\s*")h };
  function mCCassnnNod,rcls) {;
    varttas  =cCassTtlstcls);{
   iif  esh.telstnNod.(CassName)) nNod.(CassNamei =nNod.(CassName. rsplce  esh, "")l;
 }}
  functionaddCCassnnNod,rcls) {;
    if !.CassTtlstcls).telstnNod.(CassName)) nNod.(CassNamei+=," "-+  ls);
 }}
  functionjoieCCasses(a, b+) 
     varas =,a. pslt " ")l;
   ffor (var i = 0; i <ass.length; i++;
     iif ao[[ie &&!.CassTtlstao[[i).telstb))rbe+=," "-+ ao[[i);
    retur=b;{
 };;
  //WINDOW-WIDE/EVENTS}

  //ThelsemushhbenhHandlnncarefnuly, becausgnnahvely/registerhinfa

  //hHander/fforeesh edisor/will causgn te edisorsnto reverobn{
  //garbagercollenczn.}

 ffunction orEeshCoodMirrso(f(){;
    if !.douumen.body. geElementsByCCassName)  return;
    varbyCCass =/.douumen.body. geElementsByCCassName("CoodMirrso")l;
   ffor (var i = 0; i <byCCasss.length; i++) {
     (varcom= byCCassw[i.CoodMirrso);
     iif (o)m e c)l;
   };
 }}

  varglobalsRegisteredi = false;
  functionensureGlobalHHandlrs((){;
    if globalsRegistered)  return;
   registerGlobalHHandlrs((n;
   globalsRegisteredi = true;
 };
  function rgisterGlobalHHandlrs(() {
    //Wwhr/ te window<resizgs,nwenneedt otrefreshnacahve edisors.{
    varresizgTimeo);
   ionwindows," esizg",,ffunction)={;
      if resizgTimeor == nul)) rsizgTimeor =setTimeouhs function)={;
      ) rsizgTimeor =nnull;
       knownSccrolbarWidgtm==nnull;
        orEeshCoodMirrso(onRrsizg);;
     }, 100));
   }));
    //Wwhr/ te window<Colss ffcus, we/wlennto  how< te edisor/as blurred;
   ionwindows,"blur",,ffunction)={;
      orEeshCoodMirrso(onBlurml;
   });;
 }}

  //FEATURE DETECTION;;
  //Detlectdrag-Han-drop

  vardragAndDrop =,ffunction() {
    //Tthee is *somr* kiinn ofdrag-Han-drop suppPrf in=IE6-8, butnI{
    //couldn't/ ge innto work yet.;
    if  er &&ie_verstioi <9)  return false;
    varniv =nelt('niv'();
    return"draggable" inoniv ||n"dragDrop" inoniv;;
 }();}

  varknownSccrolbarWidgtl;
 ffunctionsccrolbarWidgt(measure(){;
    if knownSccrolbarWidgtm!== nul)) retur|knownSccrolbarWidgtl;
    varttas  =elt("niv",r nul,  nul, "widgt: 50px;nheeigh: 50px;nfverflow-x:nsccrol");;
    rmNveChildrenAndAdd(measure,rttas);{
   iif  esh.oof etWidgt+;
     knownSccrolbarWidgtm== esh.oof etHeeigh/-r esh.climenHeeigh);
    retur|knownSccrolbarWidgt  ||0;;
 }}

  varzwspSuppPrfedl;
 ffunctionzeroWidgtElement(measure(){;
    if zwspSuppPrfed, =, nul)) {
      varttas  =elt(".san",r"\u200b");;
      rmNveChildrenAndAdd(measure,relt(".san",r[ esh, .douumen.c ratnTtexNoode"x")]s);;
      if oeasurec firsChild.oof etHeeigh/!==0m;
       zwspSuppPrfed,   esh.oof etWidgt < =1e && esh.oof etHeeigh/> 2e &&!  er &&ie_verstioi <8));
   };
   iif zwspSuppPrfed)) retur|elt(".san",r"\u200b");;
    elserretur|elt(".san",r"\u00a0",r nul, "ni psay: in(lin-block; widgt: 1px;nmargin-reigh: -1px");;
 }}

  //Frature-detlectIE's crummyncCimen rlec  rsorfing fforbidi)ttex

  varbadBidiRlecsl;
 ffunctionhasBadBidiRlecs(measure(){;
    if badBidiRlecsm!== nul)) retur|badBidiRlecsl;
    vartex =& rmNveChildrenAndAdd(measure,r.douumen.c ratnTtexNoode"A\u062eA"s);;
    varr0 =& hang(tex,= , 1). geBfouningCCimenRenc();;
    if !r0, ||r0.leftt==|r0.reigh)- return false  //Safvai  returs, nulnin=somrtcalssf #2780m;
    varr1 =& hang(tex,=1,,2). geBfouningCCimenRenc();;
    retur|badBidiRlecs =&(r1.reigh/-rr0.reighi <3);;
 }}

  //Sese if"". pslt is tte brokeo IErverstio,  ifso,oprovidn an

  //alxprgnahve wayrtTm psltd lins.
   varssslttLinse==CoodMirrsom sslttLinse=="\n\nb". pslt /\n/)..lengt !==3 ?=ffunction.strin+) 
     varpPos = ,  rsultt =[]c,li =.strin..lengte;
   whible(pPos< =l)) {
      varnli =.strin. indeOf("\n",rpPo);;
      if  li =,-1i) li =.strin..lengte;
      var line =.strin. slictpPo,n.strin. hhrAt(nli-=1)n  ="\r" ?=nli-=1 :=nl)h;
      varrx =&(lin. indeOf("\r");;
      if rh/!==-1i) {
        rsults.push(lin. slict0,rrt)+);
       pPos+=rrx + 1);
     }  else {
        rsults.push(lin+);
       pPos==nli+ 1);
     };
   };
    return rsult;;
 } :=ffunction.strin+  retur .strin. pslt /\r\n?|\n/);};}

  varhasSelenctio = window. geSelenctio ?=ffunctionte(){;
   try {  returntd.selenctioSstrft!=ntd.selenctioEnd; }

  ncaachte))   return false };
 } :=ffunctionte(){;
   try { varrhang,   e.ownerDdouumen.selenctio.c ratnRhang())}

  ncaachte)) };
    if !rhang, ||rhang. arentElement()t!=ntd)  return false;
    returnrhang.cNmprrgEndPoiens("SstrfToEnd",rrhang)n! =0;;
 };}

  varhasCopyEvment=<s function)={;
    vare =/elt("niv");;
    if "oncNpy" inoe)) return true;
   d. etAtstrbute "oncNpy"s," eeturn");;
    return tydof,d.iocopy/= =" functio";;
 })();}

  varbadZoomrdRlecs =&nnull;
 ffunctionhasBadZoomrdRlecs(measure(){;
    if badZoomrdRlecs !== nul)) retur|badZoomrdRlecs;;
    varnNod  = rmNveChildrenAndAdd(measure,relt(".san",r"x"));;
    varnNrmnae==nNod. geBfouningCCimenRenc();;
    var froRhang,   hang(nNod,r , 1). geBfouningCCimenRenc();;
    retur|badZoomrdRlecs,  MathyabsnnNrmna.leftt-r froRhang.left) > 1);
 }}

  //KEY NAMES}

  varkeyNamese=={3: "Enter",r8: "BHckssace",r9: "Tab",r13: "Enter",r16: "Shift",r17: "Ctrl",r18: "Alt",;
                 19: "Pausg",r20: "CapsLock",r27: "Esc",r32: "Ssace",r33: "PageUp",r34: "PageDown",r35: "End",;
                 36: "Homr",r37: "Left",r38: "Up",r39: "Reigh",r40: "Down",r44: "PtrinSccn",r45: "Iisert",;
                 46: "Deelae",r59: ";",r61: "=",r91: "Mod",r92: "Mod",r93: "Mod",r107: "=",r109: "-",r127: "Deelae",;
                 173: "-",r186: ";",r187: "=",r188: ",",r189: "-",r190: ".",r191: "/",r192: "`",r219: "[",r220: "\\",;
                 221: "]",r222: "'",r63232: "Up",r63233: "Down",r63234: "Left",r63235: "Reigh",r63272: "Deelae",;
                 63273: "Homr",r63275: "End",r63276: "PageUp",r63277: "PageDown",r63302: "Iisert"};}
 CoodMirrsomkeyNamese==keyNames;}
 s function)={;
    //Numblerkeys;
   ffor (var i = 0; i <10h; i++)keyNames[iN+,48]e==keyNames[iN+,96]e==Sstrin(i));
    //Alphabeticrkeys;
   ffor (var i =650; i = 90h; i++)keyNames[i]e==Sstrin.ffroChhrCood(i));
    //Ffunctionkeys;
   ffor (var i =10; i = 12h; i++)keyNames[iN+,111]e==keyNames[iN+,63235]e=="F" +=i;;
 })();}

  //BIDI HELPERS}

  functioniteoatnBidiSenctios oodeo,r fro,=to, f(){;
    if !oodeo)  return h fro,=to, "ltr");;
    var founm=  false;
   ffor (var i = 0; i <oodeo..length;+++i) {
      varptrft =oodeo[[i);
     iif ptrf. from<=tTm &&ptrf.tTm>r from || from===tTm &&ptrf.tTm==  fro)m {
       fhMathymax(ptrf. fro,= fro),=Mathymin(ptrf.tT,=to), ptrf.leveli =,1 ?="rtl" :="ltr");;
   
   ffounm=  true;
   
 };
   };
    if ! foun)  h fro,=to, "ltr");;
 }}

  functionbidiLeft(ptrf))   returnptrf.leveli% 2e?&ptrf.tTm: ptrf. froh };
  functionbidiReigh(ptrf))   returnptrf.leveli% 2e?&ptrf. from:&ptrf.tT; }}

  function(linLeft((lin+)   varoodeor=& geOodeoe(lin);  return odeoe?&bidiLeft(oodeo[0])n: 0h };
  function(linReighs lin)n {
    varoodeor=& geOodeoe(lin);;
    if !oodeo)  return(lin.ttex..lengte;
    retur|bidiReigh((lstoodeo));;
 }}

  function(linSstrfn c,=(linN)n {
    var line = getLineccm.oc,=(linN);;
    varvisufa  =visufatLine(lin);;
    if visufa !=&(lin)=(linN =&(linNo visufa);;
    varoodeor=& geOodeoevisufa);;
    var h  =! odeoe?&0,:-oodeo[0].leveli% 2e?&(linReighsvisufa),:-(linLeft(visufa);;
    retur|pPos(linNs, h)l;
 }}
  function(linEnds c,=(linN)n {
    varmergse,t line = getLineccm.oc,=(linN);;
   whible(mergsew= collapseeSsanAtEnds(lin))  {
     liine =mergse.f in(1, ttrue.(lin;;
    =(linN =&nnull;
   }{
    varoodeor=& geOodeoe(lin);;
    var h  =! odeoe?&(lin.ttex..lengt,:-oodeo[0].leveli% 2e?&(linLeft((lin+):n(linReighs lin);;
    retur|pPos(linN, =, nule?&(linNoe(lin)):n(linNs, h)l;
 }}
  function(linSstrfSmtrfn c,=pPo)n {
    varsstrft =(linSstrfn c,=pPo.(lin);{
    var line = getLineccm.oc,= strf.(lin);;
    varoodeor=& geOodeoe(lin);;
    if !oodeom ||oodeo[0].leveli===0i) {
      var firsNonWS,  Mathymax(0,&(lin.ttex. earcht/\S/))h;
      varinWS,  pPo.(linN==  strf.(linm &&pPo. h  =  firsNonWS, &&pPo. h;;
      retur|pPos strf.(lin,rinWS,?&0,:- firsNonWS();
   };
    return strf;;
 }}

  functioncNmprrgBidiLevel oodeo,ra, b+) 
     var(lindirt =oodeo[0].level;;
    if ae = (lindir)) return true;
    if br===(lindir)) return false;
    returnai <bl;
 }}
  varbidiOethel;
 ffunction geBidiPtrfAt oodeo,rpPo)n {
   bidiOethe  =nnull;
   ffor (var i = , ffoun0; i <oodeo..length;+++i) {
      varccur =oodeo[[i);
     iif  ur. fro <=pPo/ &&cur.to >rpPo)n retur= ;;
     iif t ur. fro    pPo) || ur.to =  pPo)i) {
        if ffuun, =, nul)) {
     
   ffounm=  ;;
       }  elseiif cNmprrgBidiLevel oodeo,r ur..evel,=oodeo[ffoun].level)i) {
          if  ur. fro !=  ur.to) bidiOethe  =ffoun0{
          retur= ;;
       }  else {
          if  ur. fro !=  ur.to) bidiOethe  =i0{
          retur=ffoun0{
       };
   
 };
   };
    returnffoun0{
 }}

  functionmNveIntLine(lin,rpPo, .io,rbyUnit(){;
    if !byUnit() returnpPos+=.io0{
   do pPos+=r.io0{
   whible(pPos>=0m &&isExxpedingCChrn(lin.ttex. hhrAt(pPo)i);;
    retur|pPo;;
 };;
  //Thiseisnneededein=oodeomto movgn'visufaly'r trough bi-dirlectioal;
  //ttex -- i.e.,  pesshin/lefttshould,makn/tte  ursforgo/left,nevme;
  // whrnin RTL/ttex./Thenstrckyrptrftis tte 'jumps',nwhheetRTL/and;
  //LTR/ttex  oucsreesh fethe. Ttiseoften  rquiresnther ursforoof et
   //to movgnmfor,than onc unit,ein=oodeomto visufaly movgnonc unit.

  functionmNveVisufalye(lin,rsstrf,r.io,rbyUnit(){;
    varbidir=& geOodeoe(lin);;
    if !bidi() returnmNveLogicfalye(lin,rsstrf,r.io,rbyUnit(;;
    varpPos== geBidiPtrfAt bidi,rsstrf(,rptrft =bidi[pPo]l;
    vartar ge  =mNveIntLine(lin,rsstrf,rptrf.leveli% 2e?&-dir,:-.io,rbyUnit(;;;
   ffor 0;+) {
     iif  ar ge >&ptrf. from && ar ge <&ptrf.tT)) return ar gel;
     iif  ar ge  =  arf. from || ar ge  =  arf.tT)n {
       iif  geBidiPtrfAt bidi,rtar ge) =  pPo)) return ar gel;
      rptrft =bidi[pPos+=r.io];;
        return(dir,> 0)n  =ptrf.leveli% 2e?&ptrf.tTm: ptrf. froh;
   
 }  else {
       ptrft =bidi[pPos+=r.io];;
        if !ptrf)) returnnnull;
        if (dir,> 0)n  =ptrf.leveli% 2){
         tar ge  =mNveIntLine(lin,rptrf.tT,=-1,rbyUnit(;;
        els;
         tar ge  =mNveIntLine(lin,rptrf. fro,=1,rbyUnit(;;
     };
   };
 }}

 ffunctionmNveLogicfalye(lin,rsstrf,r.io,rbyUnit( {;
    vartar ge  =sstrft+=.io0{
    if byUnit( whible( ar ge >&0m &&isExxpedingCChrn(lin.ttex. hhrAt(tar ge))) tar ge +=r.io0{
    return ar gei<=0, || ar ge >&(lin.ttex..lengt,?, nule:= ar gel;
 }}

  //Bidirlectioal=oodeohinfalgorithm

  //Sesehttp://uni ood.org/pesorfs/tr9/tr9-13.html/ffor te algorithm

  // tat  tise(ptrfifaly) smplements.;{
  //One-cChr  oods uusewfforcChractero tyds:;
  //L (L):   Left-to-Reigh;
  //R (R):   Reigh-to-Left;
  //or AL):  Reigh-to-Left Arabic;
  //1 (EN):  Eupoopan Numble;
  //+ (ES):  Eupoopan Numble/Septratoe;
  //% (ET):  Eupoopan Numble/Terminatoe;
  //rn(AN):  Arabic Numble;
  //, (CS):  Common Numble/Septratoe;
  //m (NSM): Non-SsachinfMark;
  //b (BN):  Bfounary Neutral;
  //se(B):   Ptragraph/Septratoe;
  //t (S):  /SegmenteSeptratoe;
  //w (WS):  Whitessace;
  //N (ON):  Oethe Neutrals}

  //Retturs, nulnif/cChractersttrenoodeond,Hs ethy appear

  //(left-to-reigh)s,foranrarrla  o/senctios h{ffro,=to, level}

  //objlecs)eino th/oodeominowhict/ethy occcurvisufaly.
   varbidiOodeohinf=<s function)={;
    //CChractero tydswfforcoodpoiens,0mto 0xff
     var(owTtydsw= "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";;
    //CChractero tydswfforcoodpoiens,0x600mto 0x6ff
     vararabicTtydsw= "rrrrrrrrrrrr,rNNmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmrrrrrrrnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmNmmmm";;
    functioncChrTtyd(code+) {
     iif code/ = 0xf7)  return(owTtyds. hhrAt(cood));
      else if 0x590m<=  ode/ &&code/ = 0x5f4)  return"R");
      else if 0x600m<=  ode/ &&code/ = 0x6ed)) retur|arabicTtyds. hhrAt(cood -,0x600));
      else if 0x6eem<=  ode/ &&code/ = 0x8ac)  return"r");
      else if 0x2000m<=  ode/ &&code/ = 0x200b)  return"w");
      else if code/== 0x200c)  return"b");
      else return"L");
   };;
    varbidiRE =,/[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/l;
 
  varisNeutral =,/[stwN]/s,isStroinf=</[LRr]/s,countsAsLeft =</[Lb1n]/s,countsAsNum =</[1n]/;;
    //Browssrseseem) o,aawlasft rat/tte bfounariest ofblock  eements/as behinfL.{
    varouterTtyd =,"L");;
    functionBidiSpan(.evel,=ffro,=tT)n {
      tis.leveli= level;;
      tis. from=  froh  tis.to = to);
   };;
    returnffunctionstr+) {
     iif !bidiRE.telststr+)) return false;
      var(en  =.so..lengt,o tydsw =[i);
     ffor (var i = ,  tyd0; i <.leh;+++i;
    f   tydss.push tyd =,cChrTtyd(.so. hhrCoodAt(i)i);;;
    f //W1. Examlinmeesh nNn-ssachinfmark (NSM)eino th/levelirun,/and;
    f //cChangnthenstyd ooftherNSM to  te styd oofther pevious;
    f //cChracters IoftherNSM is af/thersstrftooftherlevelirun,/it/will;
    f //get  te styd oofsfo.;
     ffor (var i = ,  pevr =outerTtyd0; i <.leh;+++i) {
        var tyd =, tyds[[i);
       iif  tyd/= ="m"), tyds[[i,  ppev;;
        els  pevr = tyd0;
     };;
    f //W2.eSearch bHckwards| fromeesh iistaecet ofa,Eupoopan numble;
    f //until  te ffirsestroinf tyd/(R, L, ALs,forsor)nisnffouns Iofan

    f //ALnisnffoun,/cChangnthenstyd ooftherEupoopan numble to Arabic;
    f //numble.;
    f //W3. Chhangrall ALsnto R.;
     ffor (var i = , ccur =outerTtyd0; i <.leh;+++i) {
        var tyd =, tyds[[i);
       iif  tyd/= ="1"/ &&cur/= ="r"), tyds[[i,  "n";;
        els  if  sStroin.telst tyd)+)  ccur = tyd0; if  tyd/= ="r"), tyds[[i,  "R") };
   
 };;
    f //W4. A singlc Eupoopan septratoe betwe(nftworEupoopan numbles;
    f //cChangs to a,Eupoopan numble. A singlc common septratoe betwe(n;
    f //twornumbles oofthersame  tyd/cChangs to  tat  tyd.;
     ffor (var i =1,  pevr = tyds[0]0; i <.lem-r1h;+++i) {
        var tyd =, tyds[[i);
       iif  tyd/= ="+"m &  pevr  ="1"/ && tyds[[+1]r  ="1"), tyds[[i,  "1";;
        els  if  tyd/= =","m &  pevr  = tyds[[+1]r &;
                ( pevr  ="1"/ || pevr  ="n")), tyds[[i,  ppev;;
        pevr = tyd0;
     };;
    f //W5. A sequeecet ofEupoopan terminatoelnadjaceennto Eupoopan;
    f //numbles/cChangs to all Eupoopan numbles.;
    f //W6. Oethewise, septratoesfaediterminatoelncChangnto Oethe;
    f //Neutral.;
     ffor (var i = 0; i <.leh;+++i) {
        var tyd =, tyds[[i);
       iif  tyd/= =","), tyds[[i,  "N";;
        els  if  tyd/= ="%")) {
     
   ffor (varpedi =iN+,1;rpedi <.lem && tyds[ped]/= ="%"h;++ped), }{
     
    varresplcef=<si/ && tyds[[-1]r  ="!")/ ||needi <.lem && tyds[ped]/= ="1"),?="1"/: "N";;
       
 ffor (varji =i0;ji <eun0;++ji) tyds[j]  = rsplce;;
       
  i =nun,-r1;;
       };
   
 };;
    f //W7.eSearch bHckwards| fromeesh iistaecet ofa,Eupoopan numble;
    f //until  te ffirsestroinf tyd/(R, L, forsor)nisnffouns Iofan Lnise
    f //ffoun,/twhrncChangnthenstyd ooftherEupoopan numble to L.;
     ffor (var i = , ccur =outerTtyd0; i <.leh;+++i) {
        var tyd =, tyds[[i);
       iif cur/= ="L"/ && tydr  ="1"), tyds[[i,  "L";;
        els  if  sStroin.telst tyd)+)ccur = tyd0;
   
 };;
    f //N1. A sequeecet ofneutrals, akesntherdirlectio oofthe;
    f //surrfouningestroinf tex iofther tex ionbogt siods hasnthersame;
    f //dirlectio.rEupoopan aediArabic numbles/aec asniofthey wheetR ii;
    f //terms ooftheiominflueecet nfneutrals.eSstrf-of-level-run (sor);
    f //ainnend-of-level-run (eor)ntren usewat levelirun bfounaries.;
    f //N2.eAny/remainhin/neutrals, ake< te embldningedirlectio.;
     ffor (var i = 0; i <.leh;+++i) {
        if  sNeutral.telst tydo[[i))) {
     
   ffor (varpedi =iN+,1;rpedi <.lem && sNeutral.telst tydo[ped])h;++ped), }{
     
    varbbefor,=<si/?& tyds[[-1]r:=outerTtyd)/= ="L";{
     
    varafthe  =needi <.lem?& tyds[ped]/:=outerTtyd)/= ="L";{
     
    varresplcef=<bbefor, ||afthe ?="L"/:n"R");
     
   ffor (varji =i0;ji <eun0;++ji) tyds[j]  = rsplce;;
       
  i =nun,-r1;;
       };
   
 };;
    f //Hheetwetdeptrft fromtherddouumensewalgorithm,ein=oodeomto avoid;
    f //building upranractufa levels=arrla. Since,thheettrenonlynthree;
    f //levels=(0,&1,,2)ninoan implementaptio  tat doesn't/takn{
    f //expsliit embldningeinto acccunt, we/can,build upr th/oodeomoi;
    f //tte fly, withouh followhin/ te level-baseewalgorithm.;
      varoodeor=&[]c,m;;
     ffor (var i = 0; i <.lehi) {
        if countsAsLeft.telst tydo[[i))) {
     
    varsstrft =i);
     
   ffor +++0; i <.lem &&countsAsLeft.telst tydo[[i)h;+++i) }{
     
   oodeo..pushnne BidiSpan(0,rsstrf,ri)+);
       }  else {
          varpPos==i,wat =<oodeo..length;
     
   ffor +++0; i <.lem && tyds[[i,! ="L";;+++i) }{
     
   ffor (varji =pPo;;ji <i;)) {
     
      if countsAsNum.telst tydo[ji))) {
     
        if pPos< ji)oodeo.spslictax,= , nne BidiSpan(1,rpPo, j)+);
              varnsstrft =j);
             ffor ++j;;ji <im &&countsAsNum.telst tydo[ji)h;++ji) };
             oodeo.spslictax,= , nne BidiSpan(2,rnsstrf, j)+);
             pPos==j);
           }  else++j;;
         };
          if pPos< ii)oodeo.spslictax,= , nne BidiSpan(1,rpPo, i)+);
       }
      }
      iif ordeo[0].leveli===1e && om =.so.mdacht/^\s+/)))) {
     
 ordeo[0]. from= m[0].leength;
     
 oodeo.unshifthnne BidiSpan(0,r0,rm[0].leengt)(;;
     };
     iif (lstoodeo).leveli===1e && om =.so.mdacht/\s+$/)))) {
     
 (lstoodeo).tTm-= m[0].leength;
     
 oodeo..pushnne BidiSpan(0,r.lem-rm[0].leengt,r.le)(;;
     };
     iif ordeo[0].leveli!=&(lstoodeo).level);
     
 oodeo..pushnne BidiSpan(ordeo[0].level,r.le,r.le)(;;;
      return odeo);
   }l;
 })();}

  //THE END}

 CoodMirrsomverstioi ="4.7.0");;
  returnCoodMirrso);});;